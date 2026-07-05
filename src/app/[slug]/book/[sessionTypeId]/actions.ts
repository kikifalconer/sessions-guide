'use server'

import Stripe from 'stripe'
import { DateTime } from 'luxon'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  generateSlots,
  blockHostsSessionFormat,
  type AvailabilityBlockRow,
} from '@/lib/availability'
import {
  resolveConfirmationMode,
  resolvePaymentMethod,
  resolveChargingNow,
  resolveChargeAmount,
  initialStatusWithoutCharge,
  type PractitionerBookingFields,
  type SessionTypeBookingFields,
} from '@/lib/booking'
import { sendBookingEmails } from '@/lib/email'
import { accountIdentity, resolveSeekerIdentity, type SeekerIdentity } from '@/lib/seekerIdentity'
import { cancelUrl } from '@/lib/siteUrl'
import { createCalendarEventForBooking } from '@/lib/calendarSync'
import { fetchCalendarBusyWindows, liveFreeBusyForWindow } from '@/lib/calendar'
import { cancelHeldPaymentIntent } from '@/lib/paymentIntents'
import { Interval } from 'luxon'

const GENERIC_ERROR = 'Something went wrong. Try again or contact support.'
const SIGN_IN_ERROR = 'Sign in to book a session.'
const SLOT_TAKEN_ERROR = 'That time was just taken. Choose another time.'
const CALENDAR_UNVERIFIED_ERROR =
  "We couldn't confirm the practitioner's calendar just now. Please try again in a moment."
const HORIZON_DAYS = 56
const HOLD_EXPIRY_MINUTES = 30
// Unpaid pending-approval bookings await human approval, so they get a generous
// window before being reclaimed (much longer than the 30-min payment hold). M2.
const STALE_APPROVAL_DAYS = 7
const CURRENCY = 'usd' // single launch currency for now

// D20: identity is never client-supplied. The authenticated seeker account is
// the only identity source; the flow interposes sign-in before this point and
// the server actions below reject unauthenticated calls regardless.
export type BookingInput = {
  practitionerId: string
  sessionTypeId: string
  blockId: string
  startUtc: string
  bookedFormat: 'virtual' | 'in_person'
  notes: string
  requestedAmount: number | null // sliding_scale / donation, dollars
}

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

export type HoldResult =
  | { ok: true; bookingId: string; clientSecret: string; stripeAccountId: string }
  | { ok: false; error: string }

type PractitionerRow = PractitionerBookingFields & {
  id: string
  full_name: string
  is_published: boolean
}

type SessionTypeRow = SessionTypeBookingFields & {
  id: string
  practitioner_id: string
  name: string
  duration_minutes: number
  format: string
  is_active: boolean
}

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  return key ? new Stripe(key) : null
}

// Lazily release abandoned on-platform holds. Offsite pending_payment
// bookings (payment_status = 'offsite') are durable and never expired here.
export async function expireStaleHolds(practitionerId: string): Promise<void> {
  const admin = createAdminClient()

  // Reclaim stale UNPAID pending-approval holds so a guest cannot indefinitely
  // occupy a practitioner's calendar with never-approved bookings (M2). These
  // carry no PaymentIntent (never charged), so no Stripe cleanup is needed.
  // Offsite bookings are deliberately NOT expired here — decisions.md records
  // that offsite rows are durable.
  const approvalCutoff = DateTime.utc().minus({ days: STALE_APPROVAL_DAYS }).toISO()
  await admin
    .from('bookings')
    .update({ status: 'cancelled', cancellation_reason: 'approval_expired' })
    .eq('practitioner_id', practitionerId)
    .eq('status', 'pending_approval')
    .eq('payment_status', 'unpaid')
    .lt('created_at', approvalCutoff)

  const cutoff = DateTime.utc().minus({ minutes: HOLD_EXPIRY_MINUTES }).toISO()
  // Return the rows we actually flipped so we cancel PIs only for real releases.
  const { data: expired } = await admin
    .from('bookings')
    .update({ status: 'cancelled', cancellation_reason: 'payment_abandoned' })
    .eq('practitioner_id', practitionerId)
    .eq('status', 'pending_payment')
    .eq('payment_status', 'unpaid')
    .lt('created_at', cutoff)
    .select('id, stripe_payment_intent_id')

  const withPI = (expired ?? []).filter((b) => b.stripe_payment_intent_id)
  if (withPI.length === 0) return

  // All belong to this practitioner, so one Connect-account lookup covers them.
  const { data: pr } = await admin
    .from('practitioners')
    .select('stripe_account_id')
    .eq('id', practitionerId)
    .maybeSingle()
  const stripeAccountId = pr?.stripe_account_id ?? null
  for (const b of withPI) {
    await cancelHeldPaymentIntent({
      paymentIntentId: b.stripe_payment_intent_id,
      stripeAccountId,
    })
  }
}

async function loadContext(practitionerId: string, sessionTypeId: string) {
  const admin = createAdminClient()
  const [{ data: practitioner }, { data: sessionType }] = await Promise.all([
    admin
      .from('practitioners')
      .select(
        'id, full_name, is_published, payment_method, cancellation_policy, confirmation_mode, stripe_account_id, offsite_payment_instructions'
      )
      .eq('id', practitionerId)
      .maybeSingle(),
    admin
      .from('session_types')
      .select(
        'id, practitioner_id, name, duration_minutes, format, is_active, pricing_model, price, price_min, price_max, payment_method, cancellation_policy, confirmation_mode'
      )
      .eq('id', sessionTypeId)
      .maybeSingle(),
  ])

  const p = practitioner as PractitionerRow | null
  const st = sessionType as SessionTypeRow | null
  if (!p || !p.is_published) return null
  if (!st || !st.is_active || st.practitioner_id !== p.id) return null
  if (st.pricing_model === 'inquire') return null
  return { practitioner: p, sessionType: st }
}

// Re-validates a client-chosen slot server-side: the block must belong to the
// practitioner, be active and format-compatible, and the exact start instant
// must be generatable from the block today. Never trust a posted timestamp.
type SlotValidation =
  | { ok: true; block: AvailabilityBlockRow }
  | { ok: false; reason: 'taken' | 'calendar_unverified' }

async function validateSlot(
  practitionerId: string,
  sessionType: SessionTypeRow,
  blockId: string,
  startUtc: string,
  bookedFormat: 'virtual' | 'in_person'
): Promise<SlotValidation> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('availability_blocks')
    .select(
      'id, format, location_display, location_place_id, recurrence_rule, start_date, end_date, start_time, end_time, timezone, is_active, practitioner_id'
    )
    .eq('id', blockId)
    .eq('practitioner_id', practitionerId)
    .eq('is_active', true)
    .maybeSingle()

  const block = data as (AvailabilityBlockRow & { is_active: boolean; practitioner_id: string }) | null
  if (!block) return { ok: false, reason: 'taken' }
  if (!blockHostsSessionFormat(block.format, sessionType.format)) return { ok: false, reason: 'taken' }

  // The seeker's format must be one the block actually offers.
  if (bookedFormat === 'virtual' && block.format === 'in_person') return { ok: false, reason: 'taken' }
  if (bookedFormat === 'in_person' && block.format === 'virtual') return { ok: false, reason: 'taken' }

  const { data: existing } = await admin
    .from('bookings')
    .select('start_datetime, end_datetime')
    .eq('practitioner_id', practitionerId)
    .neq('status', 'cancelled')
    .gte('end_datetime', DateTime.utc().toISO())

  // First pass: the exact instant must be generatable from the block and not
  // overlap a platform booking. The cached calendar_busy windows are merged in
  // as a fast display-consistent filter.
  const busyCache = await fetchCalendarBusyWindows(practitionerId)
  const slots = generateSlots(
    [block],
    [...(existing ?? []), ...busyCache] as { start_datetime: string; end_datetime: string }[],
    sessionType.duration_minutes,
    { now: DateTime.utc(), horizonDays: HORIZON_DAYS }
  )
  if (!slots.some((s) => s.startUtc === startUtc)) return { ok: false, reason: 'taken' }

  // Commit-time correctness (H1): verify this exact window against the
  // practitioner's LIVE Google free/busy, not just the hourly cache. FAIL
  // CLOSED — if an active integration cannot be queried, refuse rather than
  // risk booking over a real external event.
  const slotStart = DateTime.fromISO(startUtc)
  const slotEnd = slotStart.plus({ minutes: sessionType.duration_minutes })
  const live = await liveFreeBusyForWindow(practitionerId, startUtc, slotEnd.toISO()!)
  if (!live.ok) return { ok: false, reason: 'calendar_unverified' }

  const slotInterval = Interval.fromDateTimes(slotStart, slotEnd)
  const conflict = live.busy.some((b) =>
    Interval.fromDateTimes(
      DateTime.fromISO(b.start_datetime),
      DateTime.fromISO(b.end_datetime)
    ).overlaps(slotInterval)
  )
  if (conflict) return { ok: false, reason: 'taken' }

  return { ok: true, block }
}

function whenLabel(startUtc: string, zone: string): string {
  return (
    DateTime.fromISO(startUtc).setZone(zone).toFormat("cccc, LLLL d, yyyy, h:mm a") +
    ` (${zone})`
  )
}

async function practitionerEmail(practitionerId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(practitionerId)
  return data.user?.email ?? null
}

async function upsertClientRow(
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

function isExclusionViolation(error: { code?: string } | null): boolean {
  return error?.code === '23P01'
}

async function insertBooking(
  input: BookingInput,
  seekerId: string,
  block: AvailabilityBlockRow,
  sessionType: SessionTypeRow,
  resolvedMode: string,
  status: string,
  paymentStatus: string | null
): Promise<{ id: string; seekerToken: string } | { error: string }> {
  const endUtc = DateTime.fromISO(input.startUtc)
    .plus({ minutes: sessionType.duration_minutes })
    .toUTC()
    .toISO()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('bookings')
    .insert({
      practitioner_id: input.practitionerId,
      availability_block_id: block.id,
      session_type_id: sessionType.id,
      // D20: new rows always carry the account; guest fields stay null and are
      // historical-only. Identity is resolved via resolveSeekerIdentity.
      seeker_id: seekerId,
      guest_name: null,
      guest_email: null,
      booked_format: input.bookedFormat,
      booked_location_display: input.bookedFormat === 'in_person' ? block.location_display : null,
      booked_location_place_id: input.bookedFormat === 'in_person' ? block.location_place_id : null,
      start_datetime: input.startUtc,
      end_datetime: endUtc,
      status,
      confirmation_mode: resolvedMode,
      payment_status: paymentStatus,
      notes: input.notes.trim() || null,
    })
    // seeker_token is minted by the DB default (migration 0004); read it back
    // for the cancel link in the confirmation email.
    .select('id, seeker_token')
    .single()

  if (error) {
    return { error: isExclusionViolation(error) ? SLOT_TAKEN_ERROR : GENERIC_ERROR }
  }
  return { id: data.id as string, seekerToken: data.seeker_token as string }
}

// Builds the seeker cancel link. Defensive: never let an email-link failure
// break a booking. In production the build-time site-URL gate guarantees a
// valid base, so this returns null only in genuinely broken states.
function safeCancelUrl(seekerToken: string): string | null {
  try {
    return cancelUrl(seekerToken)
  } catch {
    return null
  }
}

// Server-side auth gate (D20): booking creation requires an authenticated
// seeker. Never rely on the UI hiding the flow.
async function requireUser(): Promise<{ id: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ? { id: user.id } : null
}

// Path A: no on-platform charge at booking time (offsite payment, Connect
// not ready, pending approval, or nothing to charge). One write, final status.
export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: SIGN_IN_ERROR }

  const context = await loadContext(input.practitionerId, input.sessionTypeId)
  if (!context) return { ok: false, error: GENERIC_ERROR }
  const { practitioner, sessionType } = context

  await expireStaleHolds(practitioner.id)

  const validation = await validateSlot(
    practitioner.id,
    sessionType,
    input.blockId,
    input.startUtc,
    input.bookedFormat
  )
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.reason === 'calendar_unverified' ? CALENDAR_UNVERIFIED_ERROR : SLOT_TAKEN_ERROR,
    }
  }
  const block = validation.block

  const stripe = getStripe()
  const connectReady = await isConnectReady(stripe, practitioner.stripe_account_id)
  // Server-side recheck: if a charge should happen now, this path is wrong.
  if (resolveChargingNow(sessionType, practitioner, connectReady)) {
    return { ok: false, error: GENERIC_ERROR }
  }

  const resolvedMode = resolveConfirmationMode(sessionType, practitioner)
  const method = resolvePaymentMethod(sessionType, practitioner)
  const status = initialStatusWithoutCharge(resolvedMode)
  // Offsite method or the no-Connect fallback both arrange payment off the
  // platform; pending_approval with a ready Connect account stays 'unpaid'
  // (payment is collected after approval, Phase 4).
  const paymentStatus =
    method === 'offsite' || !connectReady ? 'offsite' : 'unpaid'

  const inserted = await insertBooking(input, user.id, block, sessionType, resolvedMode, status, paymentStatus)
  if ('error' in inserted) return { ok: false, error: inserted.error }

  await finishBooking(inserted.id, inserted.seekerToken, input, user.id, block, practitioner.id, practitioner.full_name, sessionType.name, status, null)
  // Outbound calendar event for instant-confirmed bookings (no-op for offsite /
  // pending_payment / pending_approval — the helper guards on status). A future
  // pending_approval approval-confirm flow must call this same helper (TD2).
  await createCalendarEventForBooking(inserted.id)
  return {
    ok: true,
    bookingId: inserted.id,
    status,
    locationDisplay: input.bookedFormat === 'in_person' ? block.location_display : null,
    whenLabel: whenLabel(input.startUtc, block.timezone),
  }
}

// Path B step 1: insert the hold row, then create the PaymentIntent on the
// practitioner's connected account. The non-cancelled row IS the slot hold;
// the exclusion constraint keeps it exclusive while the seeker pays.
export async function createBookingHold(input: BookingInput): Promise<HoldResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: SIGN_IN_ERROR }

  const context = await loadContext(input.practitionerId, input.sessionTypeId)
  if (!context) return { ok: false, error: GENERIC_ERROR }
  const { practitioner, sessionType } = context

  await expireStaleHolds(practitioner.id)

  const stripe = getStripe()
  const connectReady = await isConnectReady(stripe, practitioner.stripe_account_id)
  if (!stripe || !connectReady || !practitioner.stripe_account_id) {
    return { ok: false, error: GENERIC_ERROR }
  }
  if (!resolveChargingNow(sessionType, practitioner, connectReady)) {
    return { ok: false, error: GENERIC_ERROR }
  }

  const amount = resolveChargeAmount(sessionType, input.requestedAmount)
  if (amount === null) return { ok: false, error: 'Choose a valid amount.' }

  const validation = await validateSlot(
    practitioner.id,
    sessionType,
    input.blockId,
    input.startUtc,
    input.bookedFormat
  )
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.reason === 'calendar_unverified' ? CALENDAR_UNVERIFIED_ERROR : SLOT_TAKEN_ERROR,
    }
  }
  const block = validation.block

  const resolvedMode = resolveConfirmationMode(sessionType, practitioner)
  const inserted = await insertBooking(
    input, user.id, block, sessionType, resolvedMode, 'pending_payment', 'unpaid'
  )
  if ('error' in inserted) return { ok: false, error: inserted.error }

  const identity = await accountIdentity(user.id)

  try {
    // Direct charge on the connected account, zero platform fee: no
    // application_fee_amount, ever. The platform takes nothing from sessions.
    const intent = await stripe.paymentIntents.create(
      {
        amount: Math.round(amount * 100),
        currency: CURRENCY,
        automatic_payment_methods: { enabled: true },
        metadata: { booking_id: inserted.id },
        // Stripe receipt goes to the account email (Amendment 3), when known.
        ...(identity.email ? { receipt_email: identity.email } : {}),
      },
      { stripeAccount: practitioner.stripe_account_id }
    )
    if (!intent.client_secret) throw new Error('no client secret')

    const admin = createAdminClient()
    await admin
      .from('bookings')
      .update({ stripe_payment_intent_id: intent.id })
      .eq('id', inserted.id)

    return {
      ok: true,
      bookingId: inserted.id,
      clientSecret: intent.client_secret,
      stripeAccountId: practitioner.stripe_account_id,
    }
  } catch {
    await releaseHold(inserted.id)
    return { ok: false, error: GENERIC_ERROR }
  }
}

// Path B step 2: after Elements reports success, verify the charge with
// Stripe directly (never trust the client) and confirm the booking.
export async function finalizeBooking(bookingId: string): Promise<BookingResult> {
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
export async function releaseHold(bookingId: string): Promise<void> {
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

async function isConnectReady(
  stripe: Stripe | null,
  accountId: string | null
): Promise<boolean> {
  if (!stripe || !accountId) return false
  try {
    const account = await stripe.accounts.retrieve(accountId)
    return Boolean(account.charges_enabled)
  } catch {
    return false
  }
}

async function finishBooking(
  bookingId: string,
  seekerToken: string,
  input: BookingInput,
  seekerId: string,
  block: AvailabilityBlockRow,
  practitionerId: string,
  practitionerName: string,
  sessionName: string,
  status: string,
  amountLabel: string | null
): Promise<void> {
  const identity: SeekerIdentity = await accountIdentity(seekerId)

  await upsertClientRow(practitionerId, seekerId, identity.name, identity.email ?? '')
  await sendBookingEmails({
    seekerName: identity.name,
    seekerEmail: identity.email ?? '',
    practitionerName,
    practitionerEmail: await practitionerEmail(practitionerId),
    sessionName,
    whenLabel: whenLabel(input.startUtc, block.timezone),
    format: input.bookedFormat,
    locationDisplay: input.bookedFormat === 'in_person' ? block.location_display : null,
    status: status as 'confirmed' | 'pending_payment' | 'pending_approval',
    amountLabel,
    notes: input.notes.trim() || null,
    cancelUrl: safeCancelUrl(seekerToken),
  })
}
