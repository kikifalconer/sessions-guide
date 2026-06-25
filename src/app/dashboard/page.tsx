import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadIntegration } from '@/lib/calendar'
import DashboardShell from './DashboardShell'

export const metadata = {
  title: 'Dashboard | sessions.guide',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/join')

  const admin = createAdminClient()
  const { data: practitioner } = await admin
    .from('practitioners')
    .select(
      'full_name, slug, subscription_tier, is_published, payment_method, cancellation_policy, confirmation_mode'
    )
    .eq('id', user.id)
    .maybeSingle()

  if (!practitioner) redirect('/join')

  // Google Calendar connection state for the SETTINGS panel (service-role read).
  const integration = await loadIntegration(user.id)

  // SESSIONS + AVAILABILITY tab data (service-role reads, scoped to this practitioner).
  const [{ data: stRows }, { data: tagRows }, { data: modalityRows }, { data: blockRows }] =
    await Promise.all([
      admin
        .from('session_types')
        .select(
          'id, name, description, duration_minutes, format, modality_id, pricing_model, price, price_min, price_max, payment_method, cancellation_policy, confirmation_mode, photo_url, is_active'
        )
        .eq('practitioner_id', user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      admin
        .from('practitioner_modalities')
        .select('modality_id')
        .eq('practitioner_id', user.id),
      admin
        .from('modalities')
        .select('id, name, slug, categories(name)')
        .eq('is_approved', true)
        .order('name'),
      admin
        .from('availability_blocks')
        .select(
          'id, format, location_place_id, location_display, location_lat, location_lng, recurrence_rule, start_date, end_date, start_time, end_time, timezone, is_active'
        )
        .eq('practitioner_id', user.id)
        .order('created_at', { ascending: true }),
    ])

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
  }))

  const modalities = (modalityRows ?? []).map((m) => {
    const category = m.categories as { name?: string } | { name?: string }[] | null
    const categoryName = Array.isArray(category)
      ? (category[0]?.name ?? '')
      : (category?.name ?? '')
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

  const availabilityBlocks = (blockRows ?? []).map((b) => ({
    id: b.id as string,
    format: b.format as string,
    locationPlaceId: (b.location_place_id as string | null) ?? null,
    locationDisplay: (b.location_display as string | null) ?? null,
    locationLat: (b.location_lat as number | null) ?? null,
    locationLng: (b.location_lng as number | null) ?? null,
    recurrenceRule: (b.recurrence_rule as string | null) ?? null,
    startDate: (b.start_date as string | null) ?? null,
    endDate: (b.end_date as string | null) ?? null,
    startTime: b.start_time as string,
    endTime: b.end_time as string,
    timezone: b.timezone as string,
    isActive: b.is_active as boolean,
  }))

  const practitionerDefaults = {
    paymentMethod: (practitioner.payment_method as string | null) ?? 'stripe',
    cancellationPolicy: (practitioner.cancellation_policy as string | null) ?? 'none',
    confirmationMode: (practitioner.confirmation_mode as string | null) ?? 'instant',
  }

  return (
    <DashboardShell
      fullName={practitioner.full_name}
      slug={practitioner.slug}
      tier={(practitioner.subscription_tier ?? 'basic').toUpperCase()}
      isPublished={practitioner.is_published}
      calendarConnected={Boolean(integration)}
      calendarId={integration?.calendar_id ?? null}
      calendarSyncEnabled={integration?.sync_enabled ?? false}
      sessionTypes={sessionTypes}
      modalities={modalities}
      taggedModalityIds={taggedModalityIds}
      practitionerDefaults={practitionerDefaults}
      modalityNameById={modalityNameById}
      availabilityBlocks={availabilityBlocks}
    />
  )
}
