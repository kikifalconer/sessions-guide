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
import { accountIdentity, type SeekerIdentity } from '@/lib/seekerIdentity'
import { createCalendarEventForBooking } from '@/lib/calendarSync'
import { fetchCalendarBusyWindows, liveFreeBusyForWindow } from '@/lib/calendar'
import { cancelHeldPaymentIntent } from '@/lib/paymentIntents'
import {
  finalizeBookingCore,
  practitionerEmail,
  releaseHoldCore,
  safeCancelUrl,
  upsertClientRow,
  whenLabel,
  type BookingResult,
} from '@/lib/bookingFinalize'
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

export type { BookingResult }

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

  // Reclaim stale pending-approval holds so a guest cannot indefinitely occupy
  // a practitioner's calendar with never-approved bookings (M2). These carry no
  // PaymentIntent — resolveChargingNow always returns false for
  // pending_approval — so no Stripe cleanup is needed whatever payment_status
  // says.
  //
  // F-18: this deliberately does NOT filter on payment_status = 'unpaid'.
  // createBooking writes 'offsite' both when the practitioner CHOSE offsite and
  // when Connect merely isn't ready yet, so that filter silently made every
  // approval hold on a non-Connect practitioner immortal: unapprovable while
  // GAP-1 is open, and unexpirable here. OD-2's durability decision was written
  // about offsite pending_PAYMENT bookings; approval holds are a different
  // thing and expire on age alone. Re-log against OD-2 if that reading changes.
  const approvalCutoff = DateTime.utc().minus({ days: STALE_APPROVAL_DAYS }).toISO()
  await admin
    .from('bookings')
    .update({ status: 'cancelled', cancellation_reason: 'approval_expired' })
    .eq('practitioner_id', practitionerId)
    .eq('status', 'pending_approval')
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

// Server-side auth gate (D20): booking creation requires an authenticated
// seeker. Never rely on the UI hiding the flow.
async function requireUser(): Promise<{ id: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ? { id: user.id } : null
}

async function ownsBooking(bookingId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .eq('seeker_id', userId)
    .maybeSingle()
  return Boolean(data)
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
    await releaseHoldCore(inserted.id)
    return { ok: false, error: GENERIC_ERROR }
  }
}

// Path B step 2: after Elements reports success, verify the charge with
// Stripe directly (never trust the client) and confirm the booking.
// F-19: caller must own the row. The webhook uses finalizeBookingCore.
export async function finalizeBooking(bookingId: string): Promise<BookingResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: SIGN_IN_ERROR }
  if (!bookingId || !(await ownsBooking(bookingId, user.id))) {
    return { ok: false, error: GENERIC_ERROR }
  }
  return finalizeBookingCore(bookingId)
}

// Releases a hold after explicit payment failure or abandonment.
// F-28: caller must own the row. createBookingHold's catch uses releaseHoldCore.
export async function releaseHold(bookingId: string): Promise<void> {
  const user = await requireUser()
  if (!user) return
  if (!bookingId || !(await ownsBooking(bookingId, user.id))) return
  await releaseHoldCore(bookingId)
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
