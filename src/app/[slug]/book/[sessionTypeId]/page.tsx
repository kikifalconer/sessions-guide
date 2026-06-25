import { notFound } from 'next/navigation'
import Stripe from 'stripe'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  generateSlots,
  blockHostsSessionFormat,
  type AvailabilityBlockRow,
  type Slot,
} from '@/lib/availability'
import { fetchCalendarBusyWindows } from '@/lib/calendar'
import {
  resolveConfirmationMode,
  resolvePaymentMethod,
  resolveCancellationPolicy,
  resolveChargingNow,
  CANCELLATION_POLICY_COPY,
  type PractitionerBookingFields,
  type SessionTypeBookingFields,
} from '@/lib/booking'
import { expireStaleHolds } from './actions'
import BookingFlow from './BookingFlow'

const PSYCHEDELIC_DISCLAIMER =
  'Psychedelic journey facilitation may be subject to local laws and regulations. Practitioners and clients are solely responsible for ensuring compliance with the laws of their jurisdiction.'

const HORIZON_DAYS = 56

// City only before confirmation. Full location_display appears only on the
// confirmation screen and in the seeker email.
function cityLabel(display: string | null): string | null {
  if (!display) return null
  const city = display.split(',')[0]?.trim()
  return city || null
}

async function isConnectReady(accountId: string | null): Promise<boolean> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || !accountId) return false
  try {
    const stripe = new Stripe(key)
    const account = await stripe.accounts.retrieve(accountId)
    return Boolean(account.charges_enabled)
  } catch {
    return false
  }
}

export default async function BookSessionPage({
  params,
}: {
  params: Promise<{ slug: string; sessionTypeId: string }>
}) {
  const { slug, sessionTypeId } = await params
  const admin = createAdminClient()

  const { data: practitioner } = await admin
    .from('practitioners')
    .select(
      'id, full_name, slug, is_published, payment_method, cancellation_policy, confirmation_mode, stripe_account_id, offsite_payment_instructions'
    )
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()
  if (!practitioner) notFound()

  const { data: sessionType } = await admin
    .from('session_types')
    .select(
      `id, practitioner_id, name, description, duration_minutes, format, is_active,
       pricing_model, price, price_min, price_max, payment_method, cancellation_policy,
       confirmation_mode, modalities ( name, slug )`
    )
    .eq('id', sessionTypeId)
    .eq('practitioner_id', practitioner.id)
    .eq('is_active', true)
    .maybeSingle()
  if (!sessionType || sessionType.pricing_model === 'inquire') notFound()

  await expireStaleHolds(practitioner.id)

  const [{ data: blockRows }, { data: bookedRows }, busyRows] = await Promise.all([
    admin
      .from('availability_blocks')
      .select(
        'id, format, location_display, location_place_id, recurrence_rule, start_date, end_date, start_time, end_time, timezone'
      )
      .eq('practitioner_id', practitioner.id)
      .eq('is_active', true),
    admin
      .from('bookings')
      .select('start_datetime, end_datetime')
      .eq('practitioner_id', practitioner.id)
      .neq('status', 'cancelled')
      .gte('end_datetime', DateTime.utc().toISO()),
    // External Google Calendar busy times suppress overlapping slots too.
    // Fails open (returns []) so a calendar hiccup never hides the picker.
    fetchCalendarBusyWindows(practitioner.id),
  ])

  const blocks = ((blockRows ?? []) as AvailabilityBlockRow[]).filter((b) =>
    blockHostsSessionFormat(b.format, sessionType.format)
  )
  const slots: Slot[] = generateSlots(
    blocks,
    // Confirmed bookings + external busy windows share one overlap test.
    [...(bookedRows ?? []), ...busyRows] as { start_datetime: string; end_datetime: string }[],
    sessionType.duration_minutes,
    { now: DateTime.utc(), horizonDays: HORIZON_DAYS }
  )

  const p = practitioner as unknown as PractitionerBookingFields
  const st = sessionType as unknown as SessionTypeBookingFields
  const connectReady = await isConnectReady(practitioner.stripe_account_id)
  const chargingNow = resolveChargingNow(st, p, connectReady)
  const paymentMethod = resolvePaymentMethod(st, p)
  const confirmationMode = resolveConfirmationMode(st, p)
  const cancellationPolicy = resolveCancellationPolicy(st, p)

  // City-only labels per block, keyed by block id, for pre-confirmation UI.
  const blockCities: Record<string, string | null> = {}
  for (const block of blocks) blockCities[block.id] = cityLabel(block.location_display)

  const modality = sessionType.modalities as unknown as { name: string; slug: string } | null

  return (
    <main className="min-h-screen bg-bg">
      <BookingFlow
        practitioner={{ id: practitioner.id, name: practitioner.full_name, slug: practitioner.slug }}
        sessionType={{
          id: sessionType.id,
          name: sessionType.name,
          description: sessionType.description,
          durationMinutes: sessionType.duration_minutes,
          format: sessionType.format,
          pricingModel: sessionType.pricing_model,
          price: sessionType.price,
          priceMin: sessionType.price_min,
          priceMax: sessionType.price_max,
          modalityName: modality?.name ?? null,
        }}
        slots={slots}
        blockCities={blockCities}
        chargingNow={chargingNow}
        paymentMethod={paymentMethod}
        connectReady={connectReady}
        confirmationMode={confirmationMode}
        cancellationPolicyCopy={CANCELLATION_POLICY_COPY[cancellationPolicy]}
        offsiteInstructions={practitioner.offsite_payment_instructions}
        stripePublishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null}
        stripeAccountId={practitioner.stripe_account_id}
        disclaimer={modality?.slug === 'psychedelic-facilitation' ? PSYCHEDELIC_DISCLAIMER : null}
      />
    </main>
  )
}
