import 'server-only'

import Stripe from 'stripe'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBookingEmails } from '@/lib/email'
import { resolveSeekerIdentity } from '@/lib/seekerIdentity'
import { cancelUrl } from '@/lib/siteUrl'
import { createCalendarEventForBooking } from '@/lib/calendarSync'
import { cancelHeldPaymentIntent } from '@/lib/paymentIntents'

// Unauthenticated cores for paid-hold finalization and hold release.
// Client-facing server actions in actions.ts gate on requireUser + seeker_id
// (F-19, F-28). The Stripe webhook calls finalizeBookingCore directly.

const GENERIC_ERROR = 'Something went wrong. Try again or contact support.'

export type BookingResult =
  | {
      ok: true
      bookingId: string
      status: string
      // Full location is revealed only at confirmation (and in the email).
      locationDisplay: string | null
      whenLabel: string
    }
  | { ok: false; error: string }

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  return key ? new Stripe(key) : null
}

export function whenLabel(startUtc: string, zone: string): string {
  return (
    DateTime.fromISO(startUtc).setZone(zone).toFormat("cccc, LLLL d, yyyy, h:mm a") +
    ` (${zone})`
  )
}

export async function practitionerEmail(practitionerId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(practitionerId)
  return data.user?.email ?? null
}

export async function upsertClientRow(
  practitionerId: string,
  seekerId: string | null,
  name: string,
  email: string
): Promise<void> {
  const admin = createAdminClient()
  const nowIso = DateTime.utc().toISO()

  let query = admin.from('clients').select('id, session_count, first_booked_at').eq('practitioner_id', practitionerId)
  query = seekerId ? query.eq('seeker_id', seekerId) : query.eq('guest_email', email)
  const { data: existing } = await query.maybeSingle()

  if (existing) {
    await admin
      .from('clients')
      .update({
        session_count: (existing.session_count ?? 0) + 1,
        first_booked_at: existing.first_booked_at ?? nowIso,
        last_booked_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', existing.id)
  } else {
    await admin.from('clients').insert({
      practitioner_id: practitionerId,
      seeker_id: seekerId,
      guest_email: seekerId ? null : email,
      guest_name: seekerId ? null : name,
      session_count: 1,
      first_booked_at: nowIso,
      last_booked_at: nowIso,
    })
  }
}

export function safeCancelUrl(seekerToken: string): string | null {
  try {
    return cancelUrl(seekerToken)
  } catch {
    return null
  }
}

export async function finalizeBookingCore(bookingId: string): Promise<BookingResult> {
  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select(
      'id, practitioner_id, session_type_id, availability_block_id, status, stripe_payment_intent_id, guest_name, guest_email, seeker_id, booked_format, booked_location_display, start_datetime, notes, seeker_token'
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (!booking || !booking.stripe_payment_intent_id) return { ok: false, error: GENERIC_ERROR }
  if (booking.status !== 'confirmed' && booking.status !== 'pending_payment') {
    return { ok: false, error: GENERIC_ERROR }
  }
  const alreadyConfirmed = booking.status === 'confirmed' // idempotent re-entry

  const { data: block } = await admin
    .from('availability_blocks')
    .select('timezone')
    .eq('id', booking.availability_block_id)
    .maybeSingle()
  const when = whenLabel(booking.start_datetime, block?.timezone ?? 'UTC')

  if (alreadyConfirmed) {
    return {
      ok: true,
      bookingId,
      status: 'confirmed',
      locationDisplay: booking.booked_location_display,
      whenLabel: when,
    }
  }

  const { data: practitioner } = await admin
    .from('practitioners')
    .select('id, full_name, stripe_account_id')
    .eq('id', booking.practitioner_id)
    .maybeSingle()
  const stripe = getStripe()
  if (!stripe || !practitioner?.stripe_account_id) return { ok: false, error: GENERIC_ERROR }

  let intent: Stripe.PaymentIntent
  try {
    intent = await stripe.paymentIntents.retrieve(
      booking.stripe_payment_intent_id,
      {},
      { stripeAccount: practitioner.stripe_account_id }
    )
  } catch {
    return { ok: false, error: GENERIC_ERROR }
  }
  if (intent.status !== 'succeeded' || intent.metadata.booking_id !== bookingId) {
    return { ok: false, error: 'Payment has not completed. Try again or contact support.' }
  }

  // NOTE: the calendar-busy re-check lives at hold-time (validateSlot, called
  // from createBookingHold) BEFORE the card is charged. It is deliberately NOT
  // repeated here: this runs after a successful charge, so refusing would mean
  // charging without confirming. Do not add a post-charge busy refuse — the
  // hold reserves the slot, and any later external conflict is handled out of
  // band, never by declining a paid booking.
  const amountPaid = intent.amount_received / 100
  const { data: confirmedRows, error } = await admin
    .from('bookings')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      amount_paid: amountPaid,
      updated_at: DateTime.utc().toISO(),
    })
    .eq('id', bookingId)
    .eq('status', 'pending_payment') // atomic transition: only one path wins
    .select('id')
  if (error) return { ok: false, error: GENERIC_ERROR }

  // A concurrent path (client finalize vs. the payment_intent.succeeded webhook)
  // already confirmed this booking. Return the idempotent success WITHOUT
  // re-sending emails or re-creating the calendar event.
  if (!confirmedRows || confirmedRows.length === 0) {
    return {
      ok: true,
      bookingId,
      status: 'confirmed',
      locationDisplay: booking.booked_location_display,
      whenLabel: when,
    }
  }

  // Outbound calendar event now that payment confirmed the booking. Idempotent
  // on google_event_id, so re-entry (alreadyConfirmed path) is safe. A future
  // pending_approval approval-confirm flow must call this same helper (TD2).
  await createCalendarEventForBooking(bookingId)

  const { data: sessionType } = await admin
    .from('session_types')
    .select('name')
    .eq('id', booking.session_type_id)
    .maybeSingle()

  // New rows carry seeker_id with null guest fields; historical rows resolve
  // to their guest fields (Amendment 3).
  const identity = await resolveSeekerIdentity({
    seeker_id: booking.seeker_id,
    guest_name: booking.guest_name,
    guest_email: booking.guest_email,
  })

  await upsertClientRow(
    booking.practitioner_id,
    booking.seeker_id,
    identity.name,
    identity.email ?? ''
  )
  await sendBookingEmails({
    seekerName: identity.name,
    seekerEmail: identity.email ?? '',
    practitionerName: practitioner.full_name,
    practitionerEmail: await practitionerEmail(booking.practitioner_id),
    sessionName: sessionType?.name ?? 'Session',
    whenLabel: when,
    format: booking.booked_format as 'virtual' | 'in_person',
    locationDisplay: booking.booked_location_display,
    status: 'confirmed',
    amountLabel: `$${amountPaid.toFixed(2)} paid`,
    notes: booking.notes,
    cancelUrl: safeCancelUrl(booking.seeker_token as string),
  })

  return {
    ok: true,
    bookingId,
    status: 'confirmed',
    locationDisplay: booking.booked_location_display,
    whenLabel: when,
  }
}

// Releases a hold after explicit payment failure or abandonment. Cancels the
// backing PaymentIntent on the connected account so a released hold can never
// be charged later (C1). An already-succeeded PI is left for webhook
// reconciliation (C2).
export async function releaseHoldCore(bookingId: string): Promise<void> {
  const admin = createAdminClient()
  const { data: released } = await admin
    .from('bookings')
    .update({ status: 'cancelled', cancellation_reason: 'payment_abandoned' })
    .eq('id', bookingId)
    .eq('status', 'pending_payment')
    .eq('payment_status', 'unpaid')
    .select('id, practitioner_id, stripe_payment_intent_id')

  const row = released?.[0]
  if (!row?.stripe_payment_intent_id) return

  const { data: pr } = await admin
    .from('practitioners')
    .select('stripe_account_id')
    .eq('id', row.practitioner_id)
    .maybeSingle()
  await cancelHeldPaymentIntent({
    paymentIntentId: row.stripe_payment_intent_id,
    stripeAccountId: pr?.stripe_account_id ?? null,
  })
}
