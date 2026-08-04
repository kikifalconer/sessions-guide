import { Resend } from 'resend'

// Collapse CR/LF and whitespace runs in a user-supplied value to a single line.
// An interior newline in an email SUBJECT is a malformed header that Resend
// rejects; for the review-request send that would wedge the cron (it leaves the
// booking unstamped and retries the same broken send forever). Names never
// legitimately contain newlines (L8).
function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

type SendParams = {
  from: string
  to: string
  subject: string
  text: string
  replyTo?: string
}

// Single choke point for every Resend send (TD10). The Resend SDK returns API
// errors in the response object ({ data, error }) rather than throwing, so a
// try/catch alone treats an API-rejected send (bad recipient, auth, rate limit)
// as success. This inspects `error` AND catches thrown network failures; BOTH
// resolve to false so a caller that stamps a sent-flag only stamps on a genuine
// send. `context` names the recipient class + template (never the address) so a
// failure is debuggable without logging PII or secrets.
async function deliver(resend: Resend, params: SendParams, context: string): Promise<boolean> {
  try {
    const { error } = await resend.emails.send(params)
    if (error) {
      console.error(`[email] send failed (${context}):`, error.message ?? String(error))
      return false
    }
    return true
  } catch (err) {
    console.error(`[email] send threw (${context}):`, err)
    return false
  }
}

// Practitioner-facing seeker identity line. Tolerates a missing email (an
// account row whose email could not be resolved) without rendering "Name ()".
function seekerLine(name: string, email: string): string {
  const cleanName = name.trim() || 'A seeker'
  return email.trim() ? `${cleanName} (${email.trim()})` : cleanName
}

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
  lines.push(`Seeker: ${seekerLine(input.seekerName, input.seekerEmail)}`)
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

  // Fire-and-forget: deliver() logs a failure but never throws, so a bad send
  // still cannot fail the booking. No sent-flag is stamped here.
  if (input.seekerEmail) {
    await deliver(
      resend,
      {
        from,
        to: input.seekerEmail,
        subject: seekerSubject(input),
        text: seekerBody(input),
      },
      'booking:seeker'
    )
  }

  if (input.practitionerEmail) {
    await deliver(
      resend,
      {
        from,
        to: input.practitionerEmail,
        subject: practitionerSubject(input),
        text: practitionerBody(input),
      },
      'booking:practitioner'
    )
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
  // Policy entitlement as a percentage. Used INSTEAD of a dollar figure for
  // offsite bookings: the platform never held that money and cannot state what
  // actually changed hands (F-21).
  offsiteRefundPercent: number
  paymentStatus: 'paid' | 'unpaid' | 'refunded' | 'offsite'
}

// Seeker-facing refund line. Calm and specific: states what was refunded and
// when to expect it, or that no refund applies, without apology or alarm.
function seekerRefundLine(input: CancellationEmailInput): string | null {
  if (input.paymentStatus === 'refunded' && input.refundAmount > 0) {
    const kind = input.isFullRefund ? 'A full refund' : 'A partial refund'
    return `${kind} of $${input.refundAmount.toFixed(2)} is on its way. Refunds usually take 5 to 10 business days to appear.`
  }
  if (input.offsiteObligation) {
    const share = input.offsiteRefundPercent >= 100 ? 'a full refund' : `a ${input.offsiteRefundPercent}% refund`
    return `You paid your practitioner directly, so this refund is theirs to issue. Their cancellation policy entitles you to ${share}. They have been notified.`
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
  lines.push(`Seeker: ${seekerLine(input.seekerName, input.seekerEmail)}`)
  lines.push(`When: ${input.whenLabel}`)
  if (input.offsiteObligation) {
    const share =
      input.offsiteRefundPercent >= 100
        ? 'a full refund'
        : `a ${input.offsiteRefundPercent}% refund`
    lines.push('')
    lines.push(
      `This payment was handled offsite, so any refund is yours to issue directly. Your cancellation policy entitles the seeker to ${share} of what they paid you.`
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

  // Fire-and-forget: deliver() logs a failure but never throws, so a bad send
  // still cannot fail the cancellation. No sent-flag is stamped here.
  if (input.seekerEmail) {
    await deliver(
      resend,
      {
        from,
        to: input.seekerEmail,
        subject: 'Your session has been cancelled',
        text: cancellationSeekerBody(input),
      },
      'cancellation:seeker'
    )
  }

  if (input.practitionerEmail) {
    await deliver(
      resend,
      {
        from,
        to: input.practitionerEmail,
        subject: input.cancelledBy === 'seeker' ? 'A session was cancelled' : 'Session cancelled',
        text: cancellationPractitionerBody(input),
      },
      'cancellation:practitioner'
    )
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
  // Returns false on an API-rejected or thrown send (TD10) so the caller leaves
  // the booking unstamped and the next cron pass retries.
  return deliver(
    resend,
    {
      from,
      to: input.seekerEmail,
      subject: `How was your session with ${oneLine(input.practitionerName)}`,
      text: reviewRequestBody(input),
    },
    'review-request'
  )
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
  // Fire-and-forget: deliver() logs a failure but never throws, so notification
  // failure never fails the report write.
  await deliver(
    resend,
    {
      from,
      to,
      subject: 'A review was reported',
      text: reportNoticeBody(input),
    },
    'report-notice'
  )
}

export async function sendInquiryNotification(input: InquiryEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from || !input.practitionerEmail) return

  const resend = new Resend(apiKey)
  // Fire-and-forget: deliver() logs a failure but never throws, so notification
  // failure never fails the inquiry the seeker submitted.
  await deliver(
    resend,
    {
      from,
      to: input.practitionerEmail,
      replyTo: input.seekerEmail,
      subject: 'New inquiry',
      text: inquiryBody(input),
    },
    'inquiry'
  )
}

// --- Trial-end reminder emails (D25) -------------------------------------
// Sent by the daily subscription-reminders cron at T-14 and T-1 before a
// sage-code trial ends. Brand voice: calm and directional, no urgency or
// countdown language, no em dashes, no exclamation points. All copy below is
// PLACEHOLDER — Kiki to rework. Returns true only on a real send, so the cron
// stamps its idempotency column only when mail actually went out.

export type TrialReminderInput = {
  to: string
  endDateLabel: string // pre-formatted, e.g. 'March 3, 2027'
  renewUrl: string
  daysBefore: 14 | 1
}

// T-14 template.
function trialReminder14Body(input: TrialReminderInput): string {
  const lines: string[] = []
  lines.push(`Your free year of Elevated ends on ${input.endDateLabel}.`)
  lines.push('')
  lines.push('Nothing will be charged. If you would like to stay on Elevated, add a payment method to renew.')
  lines.push('If you do nothing, your account moves to the free tier on that date, and your public profile shows a single session type.')
  lines.push('')
  lines.push(`Renew here: ${input.renewUrl}`)
  return lines.join('\n')
}

// T-1 template.
function trialReminder1Body(input: TrialReminderInput): string {
  const lines: string[] = []
  lines.push(`Your free year of Elevated ends on ${input.endDateLabel}.`)
  lines.push('')
  lines.push('You will not be charged. To continue on Elevated, add a payment method to renew.')
  lines.push('Without a payment method, your account moves to the free tier on that date, and your public profile shows a single session type.')
  lines.push('')
  lines.push(`Renew here: ${input.renewUrl}`)
  return lines.join('\n')
}

export async function sendTrialReminderEmail(input: TrialReminderInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from || !input.to) return false

  const resend = new Resend(apiKey)
  // Returns false on an API-rejected or thrown send (TD10) so the cron leaves
  // the reminder column unstamped and the next daily pass retries.
  return deliver(
    resend,
    {
      from,
      to: input.to,
      subject: 'About your free year of Elevated',
      text:
        input.daysBefore === 14
          ? trialReminder14Body(input)
          : trialReminder1Body(input),
    },
    `trial-reminder:${input.daysBefore}`
  )
}
