import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { requirePractitioner } from '../requirePractitioner'
import SessionsManager from '../SessionsManager'
import type { GuideBlock, GuideEvent, OpenSeat } from '../groupEventTypes'
import PageHeader from '@/components/dashboard/PageHeader'
import PracticeNav from '@/components/dashboard/PracticeNav'

export const metadata = { title: `practice | ${BRAND_NAME}` }

// D30 pass 1: moved from sessions/page.tsx unchanged (IA consolidation --
// SESSIONS becomes MY OFFERINGS). No internal /dashboard links in this file
// to update. /dashboard/sessions now redirects here.
export default async function DashboardOfferingsPage() {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()

  const [{ data: stRows }, { data: tagRows }, { data: modalityRows }, { data: blockRows }, { data: occurrenceRows }] =
    await Promise.all([
    admin
      .from('session_types')
      .select(
        'id, name, description, duration_minutes, format, modality_id, pricing_model, price, price_min, price_max, payment_method, cancellation_policy, confirmation_mode, photo_url, is_active, max_capacity'
      )
      .eq('practitioner_id', practitioner.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    admin
      .from('practitioner_modalities')
      .select('modality_id')
      .eq('practitioner_id', practitioner.id),
    admin
      .from('modalities')
      .select('id, name, slug, categories(name)')
      .eq('is_approved', true)
      .order('name'),
    admin
      .from('availability_blocks')
      .select(
        'id, format, location_display, recurrence_rule, start_date, end_date, start_time, end_time, timezone, is_active'
      )
      .eq('practitioner_id', practitioner.id)
      .order('created_at', { ascending: true }),
    admin
      .from('session_occurrences')
      .select(
        'id, session_type_id, availability_block_id, format, start_datetime, end_datetime, capacity, status'
      )
      .eq('practitioner_id', practitioner.id),
  ])

  const occurrenceIds = (occurrenceRows ?? []).map((row) => row.id as string)
  const seatResult = occurrenceIds.length
    ? await admin
        .from('bookings')
        .select('id, occurrence_id, status, seeker_id, guest_name')
        .eq('practitioner_id', practitioner.id)
        .in('occurrence_id', occurrenceIds)
        .neq('status', 'cancelled')
    : { data: [], error: null }
  if (seatResult.error) throw new Error('Could not load event seats.')
  const seatRows = seatResult.data ?? []

  const seekerIds = [
    ...new Set(
      (seatRows ?? [])
        .map((seat) => seat.seeker_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const { data: seekerRows } = seekerIds.length
    ? await admin.from('seekers').select('id, full_name').in('id', seekerIds)
    : { data: [] }
  const seekerName = new Map(
    (seekerRows ?? []).map((seeker) => [seeker.id as string, ((seeker.full_name as string | null) ?? '').trim()])
  )

  const blocks: GuideBlock[] = (blockRows ?? []).map((block) => ({
    id: block.id as string,
    format: block.format as GuideBlock['format'],
    locationDisplay: (block.location_display as string | null) ?? null,
    recurrenceRule: (block.recurrence_rule as string | null) ?? null,
    startDate: (block.start_date as string | null) ?? null,
    endDate: (block.end_date as string | null) ?? null,
    startTime: block.start_time as string,
    endTime: block.end_time as string,
    timezone: block.timezone as string,
    isActive: block.is_active as boolean,
  }))
  const blockZone = new Map(blocks.map((block) => [block.id, block.timezone]))

  const seatsByOccurrence = new Map<string, OpenSeat[]>()
  for (const seat of seatRows ?? []) {
    const occurrenceId = seat.occurrence_id as string
    const seekerId = (seat.seeker_id as string | null) ?? null
    const named = seekerId ? seekerName.get(seekerId) : ''
    const guest = ((seat.guest_name as string | null) ?? '').trim()
    const list = seatsByOccurrence.get(occurrenceId) ?? []
    list.push({
      id: seat.id as string,
      clientName: named || guest || 'A client',
      status: seat.status as string,
    })
    seatsByOccurrence.set(occurrenceId, list)
  }

  const events: GuideEvent[] = (occurrenceRows ?? []).map((row) => {
    const id = row.id as string
    const status = row.status as GuideEvent['status']
    const openSeats = seatsByOccurrence.get(id) ?? []
    return {
      id,
      sessionTypeId: row.session_type_id as string,
      blockId: row.availability_block_id as string,
      format: row.format as GuideEvent['format'],
      startDatetime: row.start_datetime as string,
      endDatetime: row.end_datetime as string,
      capacity: Number(row.capacity),
      status,
      seatsTaken: openSeats.length,
      timezone: blockZone.get(row.availability_block_id as string) ?? 'UTC',
      openSeats: status === 'cancelling' ? openSeats : [],
    }
  })

  const sessionTypes = (stRows ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    description: (s.description as string | null) ?? null,
    durationMinutes: s.duration_minutes as number,
    format: s.format as string,
    modalityId: s.modality_id as string,
    pricingModel: s.pricing_model as string,
    price: (s.price as number | null) ?? null,
    priceMin: (s.price_min as number | null) ?? null,
    priceMax: (s.price_max as number | null) ?? null,
    paymentMethod: (s.payment_method as string | null) ?? null,
    cancellationPolicy: (s.cancellation_policy as string | null) ?? null,
    confirmationMode: (s.confirmation_mode as string | null) ?? null,
    photoUrl: (s.photo_url as string | null) ?? null,
    isActive: s.is_active as boolean,
    maxCapacity:
      typeof s.max_capacity === 'number' && Number.isInteger(s.max_capacity)
        ? s.max_capacity
        : typeof s.max_capacity === 'string' && /^-?\d+$/.test(s.max_capacity)
          ? Number(s.max_capacity)
          : null,
  }))

  const modalities = (modalityRows ?? []).map((m) => {
    const category = m.categories as { name?: string } | { name?: string }[] | null
    const categoryName = Array.isArray(category) ? (category[0]?.name ?? '') : (category?.name ?? '')
    return {
      id: m.id as string,
      name: m.name as string,
      slug: m.slug as string,
      category: categoryName,
    }
  })

  const modalityNameById: Record<string, string> = Object.fromEntries(
    modalities.map((m) => [m.id, m.name])
  )

  const taggedModalityIds = (tagRows ?? []).map((t) => t.modality_id as string)

  const practitionerDefaults = {
    paymentMethod: practitioner.payment_method ?? 'stripe',
    cancellationPolicy: practitioner.cancellation_policy ?? 'none',
    confirmationMode: practitioner.confirmation_mode ?? 'instant',
  }

  return (
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          title="Practice"
          description="These are the sessions people can book with you. Set the format, length, and price for each one."
        />
        <PracticeNav current="sessions" />
        <div className="mt-10">
          <SessionsManager
            sessionTypes={sessionTypes}
            modalities={modalities}
            taggedModalityIds={taggedModalityIds}
            defaults={practitionerDefaults}
            modalityNameById={modalityNameById}
            tier={practitioner.subscription_tier ?? 'free'}
            blocks={blocks}
            events={events}
          />
        </div>
      </div>
    </main>
  )
}
