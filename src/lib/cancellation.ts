import Stripe from 'stripe'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveCancellationPolicy } from '@/lib/booking'
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

// Pure tier math. hoursBeforeStart = hours between cancellation and session start.
export function computeRefund(
  policy: Policy,
  amountPaid: number,
  hoursBeforeStart: number
): RefundComputation {
  const full = Math.round(amountPaid * 100) / 100
  const half = Math.round(amountPaid * 50) / 100 // amountPaid * 0.5, cent-rounded
  switch (policy) {
    case 'flexible':
      return hoursBeforeStart >= 24
        ? { amount: full, isFull: true }
        : { amount: 0, isFull: false }
    case 'moderate':
      return hoursBeforeStart >= 72
        ? { amount: full, isFull: true }
        : { amount: half, isFull: false }
    case 'strict':
      return hoursBeforeStart >= 24 * 7
        ? { amount: full, isFull: true }
        : { amount: 0, isFull: false }
    case 'none':
    default:
      return { amount: 0, isFull: false }
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
  start_datetime: string
  booked_format: 'virtual' | 'in_person'
  booked_location_display: string | null
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
       start_datetime, booked_format, booked_location_display, guest_name, guest_email,
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
    start_datetime: data.start_datetime,
    booked_format: data.booked_format,
    booked_location_display: data.booked_location_display,
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
      offsiteObligation: booking.payment_status === 'offsite' && (booking.amount_refunded ?? 0) > 0,
      whenLabel: whenLabel(booking.start_datetime, booking.timezone),
      locationDisplay: booking.booked_location_display,
      sessionName: booking.session_name,
      practitionerName: booking.practitioner_name,
    }
  }

  // Stamp cancellation time ONCE; tier math reads exactly this instant.
  const cancelledAt = DateTime.utc().toISO() as string
  const hoursBeforeStart = DateTime.fromISO(booking.start_datetime)
    .diff(DateTime.fromISO(cancelledAt), 'hours').hours

  const amountPaid = booking.amount_paid ?? 0
  const refund = computeRefund(policy, amountPaid, hoursBeforeStart)

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
  } else if (isOffsite && refund.amount > 0) {
    // Stripe never processed this money; the practitioner owes it manually.
    offsiteObligation = true
    // payment_status stays 'offsite'.
  }

  const { error: updateError } = await admin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: cancelledAt,
      cancelled_by: cancelledBy,
      cancellation_reason: reason,
      amount_refunded: refund.amount,
      stripe_refund_id: stripeRefundId,
      payment_status: newPaymentStatus,
      updated_at: cancelledAt,
    })
    .eq('id', bookingId)
    .neq('status', 'cancelled') // guard against a concurrent cancel
  if (updateError) {
    return { ok: false, error: 'Something went wrong. Try again or contact support.' }
  }

  // Remove the practitioner's calendar event, if one was created. Non-fatal and
  // placed after the refund + cancel commit, so a calendar failure can never
  // interfere with the refund engine.
  await deleteCalendarEventForBooking(bookingId)

  const when = whenLabel(booking.start_datetime, booking.timezone)
  await sendCancellationEmails({
    seekerName: booking.guest_name ?? '',
    seekerEmail: booking.guest_email ?? '',
    practitionerName: booking.practitioner_name,
    practitionerEmail: await practitionerEmail(booking.practitioner_id),
    sessionName: booking.session_name,
    whenLabel: when,
    cancelledBy,
    refundAmount: refund.amount,
    isFullRefund: refund.isFull,
    offsiteObligation,
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

  if (event.type.startsWith('refund.') || event.type === 'charge.refund.updated') {
    refundId = (obj.id as string) ?? null
    if (typeof obj.amount === 'number') refundedDollars = obj.amount / 100
  } else if (event.type === 'charge.refunded') {
    if (typeof obj.amount_refunded === 'number') refundedDollars = obj.amount_refunded / 100
  }

  if (!bookingId || refundedDollars === null) return

  const { data: booking } = await admin
    .from('bookings')
    .select('id, payment_status, amount_refunded, stripe_refund_id')
    .eq('id', bookingId)
    .maybeSingle()
  if (!booking) return

  // Already recorded with the same refund -> nothing to do (idempotent).
  if (booking.stripe_refund_id && booking.stripe_refund_id === refundId) return

  await admin
    .from('bookings')
    .update({
      payment_status: 'refunded',
      amount_refunded: refundedDollars,
      stripe_refund_id: refundId ?? booking.stripe_refund_id,
      updated_at: DateTime.utc().toISO(),
    })
    .eq('id', bookingId)
}
