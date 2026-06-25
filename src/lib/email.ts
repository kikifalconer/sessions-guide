import { Resend } from 'resend'

// Booking emails. Wording must match the actual booking state and follow
// brand-voice.md: calm, specific, no urgency, no exclamation points in
// chrome, no em dashes. Email failures never fail the booking; callers
// fire-and-forget through sendBookingEmails.

export type BookingEmailInput = {
  seekerName: string
  seekerEmail: string
  practitionerName: string
  practitionerEmail: string | null
  sessionName: string
  whenLabel: string // pre-formatted, timezone-labeled
  format: 'virtual' | 'in_person'
  locationDisplay: string | null // full location; in_person confirmations only
  status: 'confirmed' | 'pending_payment' | 'pending_approval'
  amountLabel: string | null // e.g. '$120.00 paid' or 'Payment arranged with your practitioner'
  notes: string | null
  cancelUrl: string | null // seeker-only; bearer link, never logged
}

function seekerSubject(input: BookingEmailInput): string {
  if (input.status === 'confirmed') return 'Your session is confirmed'
  if (input.status === 'pending_approval') return 'Your request has been sent'
  return 'Your session is reserved'
}

function seekerBody(input: BookingEmailInput): string {
  const lines: string[] = []
  if (input.status === 'confirmed') {
    lines.push(`Your session is confirmed.`)
  } else if (input.status === 'pending_approval') {
    lines.push(
      `Your request has been sent to ${input.practitionerName}. You will hear back once they confirm.`
    )
  } else {
    lines.push(
      `Your session is reserved. It will be confirmed once payment is complete.`
    )
  }
  lines.push('')
  lines.push(`Session: ${input.sessionName}`)
  lines.push(`With: ${input.practitionerName}`)
  lines.push(`When: ${input.whenLabel}`)
  lines.push(`Format: ${input.format === 'virtual' ? 'Virtual' : 'In person'}`)
  if (input.format === 'in_person' && input.locationDisplay) {
    lines.push(`Where: ${input.locationDisplay}`)
  }
  if (input.amountLabel) lines.push(`Payment: ${input.amountLabel}`)
  lines.push('')
  lines.push('Questions about your session go directly to your practitioner.')
  if (input.cancelUrl) {
    lines.push('')
    lines.push(`Need to cancel? ${input.cancelUrl}`)
  }
  return lines.join('\n')
}

function practitionerSubject(input: BookingEmailInput): string {
  if (input.status === 'pending_approval') return 'New booking request'
  return 'New booking'
}

function practitionerBody(input: BookingEmailInput): string {
  const lines: string[] = []
  if (input.status === 'pending_approval') {
    lines.push('You have a new booking request waiting for your approval.')
  } else if (input.status === 'pending_payment') {
    lines.push('You have a new booking awaiting payment.')
  } else {
    lines.push('You have a new confirmed booking.')
  }
  lines.push('')
  lines.push(`Session: ${input.sessionName}`)
  lines.push(`Seeker: ${input.seekerName} (${input.seekerEmail})`)
  lines.push(`When: ${input.whenLabel}`)
  lines.push(`Format: ${input.format === 'virtual' ? 'Virtual' : 'In person'}`)
  if (input.format === 'in_person' && input.locationDisplay) {
    lines.push(`Where: ${input.locationDisplay}`)
  }
  if (input.amountLabel) lines.push(`Payment: ${input.amountLabel}`)
  if (input.notes) {
    lines.push('')
    lines.push(`Note from the seeker: ${input.notes}`)
  }
  return lines.join('\n')
}

export async function sendBookingEmails(input: BookingEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) return

  const resend = new Resend(apiKey)

  try {
    await resend.emails.send({
      from,
      to: input.seekerEmail,
      subject: seekerSubject(input),
      text: seekerBody(input),
    })
  } catch {
    // Email failure never fails the booking.
  }

  if (input.practitionerEmail) {
    try {
      await resend.emails.send({
        from,
        to: input.practitionerEmail,
        subject: practitionerSubject(input),
        text: practitionerBody(input),
      })
    } catch {
      // Same.
    }
  }
}

// --- Cancellation emails -------------------------------------------------

export type CancellationEmailInput = {
  seekerName: string
  seekerEmail: string
  practitionerName: string
  practitionerEmail: string | null
  sessionName: string
  whenLabel: string
  cancelledBy: 'seeker' | 'practitioner'
  refundAmount: number // dollars
  isFullRefund: boolean
  offsiteObligation: boolean // practitioner owes a manual refund
  paymentStatus: 'paid' | 'unpaid' | 'refunded' | 'offsite'
}

// Seeker-facing refund line. Calm and specific: states what was refunded and
// when to expect it, or that no refund applies, without apology or alarm.
function seekerRefundLine(input: CancellationEmailInput): string | null {
  if (input.paymentStatus === 'refunded' && input.refundAmount > 0) {
    const kind = input.isFullRefund ? 'A full refund' : 'A partial refund'
    return `${kind} of $${input.refundAmount.toFixed(2)} is on its way. Refunds usually take 5 to 10 business days to appear.`
  }
  if (input.offsiteObligation && input.refundAmount > 0) {
    return `A refund of $${input.refundAmount.toFixed(2)} is due from your practitioner, who arranges payment directly with you.`
  }
  if (input.paymentStatus === 'paid' && input.refundAmount === 0) {
    return 'No refund applies under the cancellation policy for this session.'
  }
  return null
}

function cancellationSeekerBody(input: CancellationEmailInput): string {
  const lines: string[] = []
  lines.push('Your session has been cancelled.')
  lines.push('')
  lines.push(`Session: ${input.sessionName}`)
  lines.push(`With: ${input.practitionerName}`)
  lines.push(`When: ${input.whenLabel}`)
  const refund = seekerRefundLine(input)
  if (refund) {
    lines.push('')
    lines.push(refund)
  }
  return lines.join('\n')
}

function cancellationPractitionerBody(input: CancellationEmailInput): string {
  const lines: string[] = []
  const who = input.cancelledBy === 'seeker' ? `${input.seekerName} cancelled` : 'You cancelled'
  lines.push(`${who} this session.`)
  lines.push('')
  lines.push(`Session: ${input.sessionName}`)
  lines.push(`Seeker: ${input.seekerName} (${input.seekerEmail})`)
  lines.push(`When: ${input.whenLabel}`)
  if (input.offsiteObligation && input.refundAmount > 0) {
    lines.push('')
    lines.push(
      `A refund of $${input.refundAmount.toFixed(2)} is owed to the seeker. This payment was handled offsite, so the refund is yours to issue directly.`
    )
  } else if (input.paymentStatus === 'refunded' && input.refundAmount > 0) {
    lines.push('')
    lines.push(`A refund of $${input.refundAmount.toFixed(2)} has been issued to the seeker.`)
  }
  return lines.join('\n')
}

export async function sendCancellationEmails(input: CancellationEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) return

  const resend = new Resend(apiKey)

  if (input.seekerEmail) {
    try {
      await resend.emails.send({
        from,
        to: input.seekerEmail,
        subject: 'Your session has been cancelled',
        text: cancellationSeekerBody(input),
      })
    } catch {
      // Email failure never fails the cancellation.
    }
  }

  if (input.practitionerEmail) {
    try {
      await resend.emails.send({
        from,
        to: input.practitionerEmail,
        subject: input.cancelledBy === 'seeker' ? 'A session was cancelled' : 'Session cancelled',
        text: cancellationPractitionerBody(input),
      })
    } catch {
      // Same.
    }
  }
}

// --- Review request email -----------------------------------------------

export type ReviewRequestEmailInput = {
  seekerName: string
  seekerEmail: string
  practitionerName: string
  sessionName: string
  whenLabel: string
  reviewUrl: string // bearer link, never logged
}

// Warm, peer-to-peer, no pressure. Returns true only if the send did not
// throw, so the caller can stamp idempotency only on a real send.
function reviewRequestBody(input: ReviewRequestEmailInput): string {
  const lines: string[] = []
  lines.push(`We hope your session with ${input.practitionerName} was what you needed.`)
  lines.push('')
  lines.push(`Session: ${input.sessionName}`)
  lines.push(`When: ${input.whenLabel}`)
  lines.push('')
  lines.push(
    'If you have a moment, share how it went. Your words help other seekers find the right practitioner.'
  )
  lines.push('')
  lines.push(`Leave a review: ${input.reviewUrl}`)
  return lines.join('\n')
}

export async function sendReviewRequestEmail(
  input: ReviewRequestEmailInput
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from || !input.seekerEmail) return false

  const resend = new Resend(apiKey)
  try {
    await resend.emails.send({
      from,
      to: input.seekerEmail,
      subject: `How was your session with ${input.practitionerName}`,
      text: reviewRequestBody(input),
    })
    return true
  } catch {
    // Leave unstamped so the next cron pass retries.
    return false
  }
}

// --- Inquiry notification (to the practitioner) -------------------------

export type InquiryEmailInput = {
  practitionerEmail: string | null
  seekerName: string
  seekerEmail: string
  message: string
  sessionName: string | null // null = profile-level inquiry
}

function inquiryBody(input: InquiryEmailInput): string {
  const lines: string[] = []
  lines.push('You have a new inquiry.')
  lines.push('')
  lines.push(`From: ${input.seekerName} (${input.seekerEmail})`)
  if (input.sessionName) lines.push(`About: ${input.sessionName}`)
  lines.push('')
  lines.push(input.message)
  lines.push('')
  lines.push('Reply directly to this seeker to continue the conversation.')
  return lines.join('\n')
}

// --- Review report notice (to the team) ---------------------------------

export type ReportNoticeInput = {
  reviewId: string
  practitionerId: string
  reason: string | null
}

function reportNoticeBody(input: ReportNoticeInput): string {
  const lines: string[] = []
  lines.push('A review has been reported and is waiting for triage.')
  lines.push('')
  lines.push(`Review: ${input.reviewId}`)
  lines.push(`Practitioner: ${input.practitionerId}`)
  if (input.reason) {
    lines.push('')
    lines.push(`Reason given: ${input.reason}`)
  }
  return lines.join('\n')
}

export async function sendReportNotice(input: ReportNoticeInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) return
  // Env-izable, with the current team address as the default (no second
  // hardcoded address accretes).
  const to = process.env.REPORT_NOTICE_EMAIL ?? 'hello@sessions.guide'

  const resend = new Resend(apiKey)
  try {
    await resend.emails.send({
      from,
      to,
      subject: 'A review was reported',
      text: reportNoticeBody(input),
    })
  } catch {
    // Notification failure never fails the report write.
  }
}

export async function sendInquiryNotification(input: InquiryEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from || !input.practitionerEmail) return

  const resend = new Resend(apiKey)
  try {
    await resend.emails.send({
      from,
      to: input.practitionerEmail,
      replyTo: input.seekerEmail,
      subject: 'New inquiry',
      text: inquiryBody(input),
    })
  } catch {
    // Notification failure never fails the inquiry the seeker submitted.
  }
}
