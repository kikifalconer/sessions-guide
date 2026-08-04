import Stripe from 'stripe'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveCancellationPolicy } from '@/lib/booking'
import { resolveSeekerIdentity } from '@/lib/seekerIdentity'
import { sendCancellationEmails } from '@/lib/email'
import { deleteCalendarEventForBooking } from '@/lib/calendarSync'

// Standalone, route-agnostic cancellation + refund engine. Callable unchanged
// from the seeker cancel route (this pass) and the future practitioner cancel
// UI. Money rules:
//   - amount_paid / amount_refunded are DOLLARS; Stripe is CENTS (x100 / /100).
//   - the PaymentIntent lives on the practitioner's CONNECTED account, so every
//     refund call passes { stripeAccount }.
//   - 'offsite' payment_status (true offsite AND the no-Connect fallback) is
//     never auto-refunded; the obligation is recorded and the practitioner is
//     notified.
// cancelled_at is stamped ONCE here and is load-bearing for tier math.

type Policy = 'none' | 'flexible' | 'moderate' | 'strict'

export type RefundComputation = {
  amount: number // dollars, rounded to cents
  isFull: boolean
}

// The share of the paid amount the policy entitles the seeker to, as a fraction
// of 1. Split out from computeRefund (F-21) because entitlement is knowable for
// EVERY booking, while a dollar figure is knowable only when the platform took
// the money. Offsite bookings have no amount_paid, so they need the fraction on
// its own.
export function refundFraction(policy: Policy, hoursBeforeStart: number): number {
  // A cancellation at or after the session start never earns an automatic
  // refund. This also stops a negative hoursBeforeStart from leaking into the
  // tier comparisons below (C3).
  if (hoursBeforeStart <= 0) return 0
  switch (policy) {
    case 'flexible':
      return hoursBeforeStart >= 24 ? 1 : 0
    case 'moderate':
      return hoursBeforeStart >= 72 ? 1 : 0.5
    case 'strict':
      return hoursBeforeStart >= 24 * 7 ? 1 : 0
    case 'none':
    default:
      return 0
  }
}

// Pure tier math. hoursBeforeStart = hours between cancellation and session start.
export function computeRefund(
  policy: Policy,
  amountPaid: number,
  hoursBeforeStart: number
): RefundComputation {
  const fraction = refundFraction(policy, hoursBeforeStart)
  return {
    amount: Math.round(amountPaid * fraction * 100) / 100,
    isFull: fraction === 1 && amountPaid > 0,
  }
}

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  return key ? new Stripe(key) : null
}

function whenLabel(startUtc: string, zone: string): string {
  return (
    DateTime.fromISO(startUtc).setZone(zone).toFormat('cccc, LLLL d, yyyy, h:mm a') +
    ` (${zone})`
  )
}

export type CancelResult =
  | {
      ok: true
      alreadyCancelled: boolean
      policy: Policy
      refundAmount: number // dollars
      isFull: boolean
      paymentStatus: 'paid' | 'unpaid' | 'refunded' | 'offsite'
      offsiteObligation: boolean // practitioner owes a manual refund
      // Policy entitlement as a percentage, for offsite bookings where the
      // platform never held the money and so cannot state a dollar figure.
      offsiteRefundPercent: number
      whenLabel: string
      locationDisplay: string | null
      sessionName: string
      practitionerName: string
    }
  | { ok: false; error: string }

type BookingContext = {
  id: string
  practitioner_id: string
  session_type_id: string
  availability_block_id: string
  status: string
  payment_status: 'paid' | 'unpaid' | 'refunded' | 'offsite' | null
  amount_paid: number | null
  amount_refunded: number | null
  stripe_payment_intent_id: string | null
  stripe_refund_id: string | null
  cancelled_at: string | null
  start_datetime: string
  booked_format: 'virtual' | 'in_person'
  booked_location_display: string | null
  seeker_id: string | null
  guest_name: string | null
  guest_email: string | null
  cancellation_policy: string | null // session type override
  session_name: string
  practitioner_name: string
  practitioner_policy: string | null
  practitioner_stripe_account_id: string | null
  timezone: string
}

async function loadBooking(bookingId: string): Promise<BookingContext | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('bookings')
    .select(
      `id, practitioner_id, session_type_id, availability_block_id, status,
       payment_status, amount_paid, amount_refunded, stripe_payment_intent_id, stripe_refund_id,
       cancelled_at, start_datetime, booked_format, booked_location_display, seeker_id, guest_name, guest_email,
       session_types ( name, cancellation_policy ),
       practitioners ( full_name, cancellation_policy, stripe_account_id ),
       availability_blocks ( timezone )`
    )
    .eq('id', bookingId)
    .maybeSingle()
  if (!data) return null

  const st = data.session_types as unknown as { name: string; cancellation_policy: string | null } | null
  const p = data.practitioners as unknown as {
    full_name: string
    cancellation_policy: string | null
    stripe_account_id: string | null
  } | null
  const block = data.availability_blocks as unknown as { timezone: string } | null

  return {
    id: data.id,
    practitioner_id: data.practitioner_id,
    session_type_id: data.session_type_id,
    availability_block_id: data.availability_block_id,
    status: data.status,
    payment_status: data.payment_status,
    amount_paid: data.amount_paid,
    amount_refunded: data.amount_refunded,
    stripe_payment_intent_id: data.stripe_payment_intent_id,
    stripe_refund_id: data.stripe_refund_id,
    cancelled_at: data.cancelled_at,
    start_datetime: data.start_datetime,
    booked_format: data.booked_format,
    booked_location_display: data.booked_location_display,
    seeker_id: data.seeker_id,
    guest_name: data.guest_name,
    guest_email: data.guest_email,
    cancellation_policy: st?.cancellation_policy ?? null,
    session_name: st?.name ?? 'Session',
    practitioner_name: p?.full_name ?? 'your practitioner',
    practitioner_policy: p?.cancellation_policy ?? null,
    practitioner_stripe_account_id: p?.stripe_account_id ?? null,
    timezone: block?.timezone ?? 'UTC',
  }
}

async function practitionerEmail(practitionerId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(practitionerId)
  return data.user?.email ?? null
}

// Recomputes the policy entitlement for an ALREADY-cancelled booking, reading
// the stamped cancelled_at rather than the current clock so idempotent re-entry
// reports the same percentage the original cancellation did.
function recordedPercent(b: BookingContext, policy: Policy): number {
  if (b.payment_status !== 'offsite' || !b.cancelled_at) return 0
  const hours = DateTime.fromISO(b.start_datetime)
    .diff(DateTime.fromISO(b.cancelled_at), 'hours').hours
  return refundFraction(policy, hours) * 100
}

// Cancels a booking and resolves any refund. Idempotent: a booking already
// 'cancelled' returns success without re-refunding.
export async function cancelBooking(args: {
  bookingId: string
  cancelledBy: 'seeker' | 'practitioner'
  reason?: string | null
}): Promise<CancelResult> {
  const { bookingId, cancelledBy, reason = null } = args
  const admin = createAdminClient()

  const booking = await loadBooking(bookingId)
  if (!booking) return { ok: false, error: 'This booking could not be found.' }

  if (booking.status === 'completed') {
    return { ok: false, error: 'This session has already taken place and cannot be cancelled.' }
  }

  const policy = resolveCancellationPolicy(
    { cancellation_policy: booking.cancellation_policy } as never,
    { cancellation_policy: booking.practitioner_policy } as never
  )

  // Idempotent re-entry: already cancelled, report the recorded outcome.
  if (booking.status === 'cancelled') {
    return {
      ok: true,
      alreadyCancelled: true,
      policy,
      refundAmount: booking.amount_refunded ?? 0,
      isFull: (booking.amount_refunded ?? 0) > 0 && booking.amount_refunded === booking.amount_paid,
      paymentStatus: (booking.payment_status ?? 'unpaid') as 'paid' | 'unpaid' | 'refunded' | 'offsite',
      offsiteObligation: recordedPercent(booking, policy) > 0,
      offsiteRefundPercent: recordedPercent(booking, policy),
      whenLabel: whenLabel(booking.start_datetime, booking.timezone),
      locationDisplay: booking.booked_location_display,
      sessionName: booking.session_name,
      practitionerName: booking.practitioner_name,
    }
  }

  // A session that has already started can no longer be self-cancelled by the
  // seeker. Status only flips to 'completed' on the hourly cron, so the
  // 'completed' check above is not enough — guard on the actual clock so a
  // seeker cannot cancel mid-session (or in the cron-lag window) and harvest a
  // refund for a delivered session (C3).
  if (
    cancelledBy === 'seeker' &&
    DateTime.fromISO(booking.start_datetime) <= DateTime.utc()
  ) {
    return {
      ok: false,
      error:
        'This session has already started, so it can no longer be cancelled online. Please contact your practitioner directly.',
    }
  }

  // Stamp cancellation time ONCE; tier math reads exactly this instant.
  const cancelledAt = DateTime.utc().toISO() as string
  const hoursBeforeStart = DateTime.fromISO(booking.start_datetime)
    .diff(DateTime.fromISO(cancelledAt), 'hours').hours

  const amountPaid = booking.amount_paid ?? 0
  const fraction = refundFraction(policy, hoursBeforeStart)
  const refund = computeRefund(policy, amountPaid, hoursBeforeStart)
  // Entitlement as a percentage. Offsite bookings never carry an amount_paid
  // (it is written only on the Stripe finalize path), so the dollar figure above
  // is always 0 for them and cannot drive the obligation — F-21.
  const offsiteRefundPercent = Math.round(fraction * 100)

  let stripeRefundId: string | null = booking.stripe_refund_id
  let newPaymentStatus = booking.payment_status ?? 'unpaid'
  let offsiteObligation = false

  const onPlatformPaid = booking.payment_status === 'paid'
  const isOffsite = booking.payment_status === 'offsite'

  if (onPlatformPaid && refund.amount > 0 && !booking.stripe_refund_id) {
    const stripe = getStripe()
    if (
      !stripe ||
      !booking.stripe_payment_intent_id ||
      !booking.practitioner_stripe_account_id
    ) {
      return { ok: false, error: 'Something went wrong. Try again or contact support.' }
    }
    try {
      const created = await stripe.refunds.create(
        {
          payment_intent: booking.stripe_payment_intent_id,
          amount: Math.round(refund.amount * 100), // dollars -> cents
          metadata: { booking_id: bookingId },
        },
        {
          stripeAccount: booking.practitioner_stripe_account_id,
          idempotencyKey: `cancel-refund:${bookingId}`, // no double-refund on retry
        }
      )
      stripeRefundId = created.id
      newPaymentStatus = 'refunded'
    } catch {
      return { ok: false, error: 'The refund could not be processed. Try again or contact support.' }
    }
  } else if (isOffsite && fraction > 0) {
    // Stripe never processed this money; the practitioner owes it manually.
    // Keyed off the POLICY, not a dollar amount: the platform never held these
    // funds and cannot assert what changed hands (F-21).
    offsiteObligation = true
    // payment_status stays 'offsite'.
  }

  const { data: cancelledRows, error: updateError } = await admin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: cancelledAt,
      cancelled_by: cancelledBy,
      cancellation_reason: reason,
      // Stripe money ONLY (F-22). An offsite obligation is not a refund the
      // platform processed, so recording it here would make every revenue query
      // overcount. The obligation lives on the emails and is derivable from
      // policy + cancelled_at.
      amount_refunded: onPlatformPaid ? refund.amount : 0,
      stripe_refund_id: stripeRefundId,
      payment_status: newPaymentStatus,
      updated_at: cancelledAt,
    })
    .eq('id', bookingId)
    .neq('status', 'cancelled') // guard against a concurrent cancel
    .select('id')
  if (updateError) {
    return { ok: false, error: 'Something went wrong. Try again or contact support.' }
  }

  // A concurrent cancel already flipped this booking. The shared Stripe
  // idempotency key means no double refund occurred; return the recorded
  // outcome WITHOUT sending a second set of cancellation emails (L6).
  if (!cancelledRows || cancelledRows.length === 0) {
    const fresh = await loadBooking(bookingId)
    return {
      ok: true,
      alreadyCancelled: true,
      policy,
      refundAmount: fresh?.amount_refunded ?? 0,
      isFull: (fresh?.amount_refunded ?? 0) > 0 && fresh?.amount_refunded === fresh?.amount_paid,
      paymentStatus: (fresh?.payment_status ?? 'unpaid') as 'paid' | 'unpaid' | 'refunded' | 'offsite',
      offsiteObligation: fresh ? recordedPercent(fresh, policy) > 0 : false,
      offsiteRefundPercent: fresh ? recordedPercent(fresh, policy) : 0,
      whenLabel: whenLabel(booking.start_datetime, booking.timezone),
      locationDisplay: booking.booked_location_display,
      sessionName: booking.session_name,
      practitionerName: booking.practitioner_name,
    }
  }

  // Remove the practitioner's calendar event, if one was created. Non-fatal and
  // placed after the refund + cancel commit, so a calendar failure can never
  // interfere with the refund engine.
  await deleteCalendarEventForBooking(bookingId)

  const when = whenLabel(booking.start_datetime, booking.timezone)
  // Account-backed rows resolve to the seeker's account name/email; historical
  // guest rows keep their guest fields (Amendment 3).
  const identity = await resolveSeekerIdentity(booking)
  await sendCancellationEmails({
    seekerName: identity.name,
    seekerEmail: identity.email ?? '',
    practitionerName: booking.practitioner_name,
    practitionerEmail: await practitionerEmail(booking.practitioner_id),
    sessionName: booking.session_name,
    whenLabel: when,
    cancelledBy,
    refundAmount: refund.amount,
    isFullRefund: refund.isFull,
    offsiteObligation,
    offsiteRefundPercent,
    paymentStatus: newPaymentStatus as 'paid' | 'unpaid' | 'refunded' | 'offsite',
  })

  return {
    ok: true,
    alreadyCancelled: false,
    policy,
    refundAmount: refund.amount,
    isFull: refund.isFull,
    paymentStatus: newPaymentStatus as 'paid' | 'unpaid' | 'refunded' | 'offsite',
    offsiteObligation,
    offsiteRefundPercent,
    whenLabel: when,
    locationDisplay: booking.booked_location_display,
    sessionName: booking.session_name,
    practitionerName: booking.practitioner_name,
  }
}

// Webhook reconciliation: sync refund state from a Stripe refund/charge event
// onto the booking. Never creates a refund (that is cancelBooking's job); only
// records what Stripe reports, idempotently. Catches the rare case where the
// refund succeeded at Stripe but our DB write failed.
export async function reconcileRefundFromEvent(event: Stripe.Event): Promise<void> {
  const admin = createAdminClient()
  const obj = event.data.object as unknown as Record<string, unknown>

  // Resolve booking via metadata.booking_id when present, else via refund id.
  const metadata = (obj.metadata ?? {}) as Record<string, string>
  const bookingId = metadata.booking_id

  let refundId: string | null = null
  let refundedDollars: number | null = null
  let refundStatus: string | null = null

  if (event.type.startsWith('refund.') || event.type === 'charge.refund.updated') {
    refundId = (obj.id as string) ?? null
    if (typeof obj.amount === 'number') refundedDollars = obj.amount / 100
    refundStatus = (obj.status as string) ?? null // succeeded | pending | failed | canceled
  } else if (event.type === 'charge.refunded') {
    if (typeof obj.amount_refunded === 'number') refundedDollars = obj.amount_refunded / 100
    refundStatus = 'succeeded' // the charge reports money that has actually been refunded
  }

  if (!bookingId) return

  const { data: booking } = await admin
    .from('bookings')
    .select('id, status, payment_status, amount_paid, amount_refunded, stripe_refund_id, cancelled_at')
    .eq('id', bookingId)
    .maybeSingle()
  if (!booking) return

  // A refund that FAILED (or was canceled) did NOT return money. Never record it
  // as 'refunded'. Undo any optimistic 'refunded' marker the synchronous cancel
  // path wrote, and log loudly so support can intervene — the seeker was already
  // told a refund was on its way (H7).
  if (refundStatus === 'failed' || refundStatus === 'canceled') {
    console.error(
      '[refund] LOUD: Stripe reported a FAILED/CANCELED refund — money was NOT returned',
      { bookingId, refundId, eventType: event.type }
    )
    if (booking.payment_status === 'refunded') {
      await admin
        .from('bookings')
        .update({
          // Money is still with the practitioner; reflect that truthfully.
          payment_status: (booking.amount_paid ?? 0) > 0 ? 'paid' : booking.payment_status,
          amount_refunded: 0,
          updated_at: DateTime.utc().toISO(),
        })
        .eq('id', bookingId)
    }
    return
  }

  // Only a SUCCEEDED refund is recorded. pending / requires_action are ignored;
  // a later terminal event (succeeded or failed) will reconcile.
  if (refundStatus !== 'succeeded' || refundedDollars === null) return

  await admin
    .from('bookings')
    .update({
      // Ensure the booking is cancelled so the completion/review cron never
      // fires reminders on a refunded session (paired MEDIUM). Idempotent for a
      // normally-cancelled booking; heals a booking whose synchronous cancel
      // write failed after the refund succeeded.
      status: 'cancelled',
      cancelled_at: booking.cancelled_at ?? DateTime.utc().toISO(),
      payment_status: 'refunded',
      amount_refunded: refundedDollars,
      stripe_refund_id: refundId ?? booking.stripe_refund_id,
      updated_at: DateTime.utc().toISO(),
    })
    .eq('id', bookingId)
}
