import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { requirePractitioner } from '../requirePractitioner'
import AvailabilityManager from '../AvailabilityManager'

export const metadata = { title: `availability | ${BRAND_NAME}` }

export default async function DashboardAvailabilityPage() {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()

  const { data: blockRows } = await admin
    .from('availability_blocks')
    .select(
      'id, format, location_place_id, location_display, location_lat, location_lng, recurrence_rule, start_date, end_date, start_time, end_time, timezone, is_active'
    )
    .eq('practitioner_id', practitioner.id)
    .order('created_at', { ascending: true })

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

  return (
    <main className="px-8 py-12">
      <div className="mx-auto w-full max-w-[1200px]">
        <h1>Availability</h1>
        <p className="mt-4 max-w-[60ch] text-dark">
          Set the days, times, and places you work. Recurring blocks repeat each week, and
          dated blocks cover a specific range. Seekers can only book inside these windows.
        </p>
        <div className="mt-10">
          <AvailabilityManager blocks={availabilityBlocks} />
        </div>
      </div>
    </main>
  )
}
