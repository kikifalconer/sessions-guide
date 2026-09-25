import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { loadIntegration } from '@/lib/calendar'
import { requirePractitioner } from '../requirePractitioner'
import AvailabilityManager from '../AvailabilityManager'
import CalendarSettings from '../CalendarSettings'
import PageHeader from '@/components/dashboard/PageHeader'
import BookingsNav from '@/components/dashboard/BookingsNav'

export const metadata = { title: `availability | ${BRAND_NAME}` }

export default async function DashboardAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string }>
}) {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()
  const params = await searchParams

  const [{ data: blockRows }, integration] = await Promise.all([
    admin
      .from('availability_blocks')
      .select(
        'id, format, location_place_id, location_display, location_lat, location_lng, recurrence_rule, start_date, end_date, start_time, end_time, timezone, is_active'
      )
      .eq('practitioner_id', practitioner.id)
      .order('created_at', { ascending: true }),
    loadIntegration(practitioner.id),
  ])

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
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          title="Bookings"
          description="Set the days, times, and places you work. Recurring blocks repeat each week, and dated blocks cover a specific range."
        />
        <BookingsNav current="availability" />
         <CalendarSettings
          connected={Boolean(integration)}
          calendarId={integration?.calendar_id ?? null}
          syncEnabled={integration?.sync_enabled ?? false}
        />
        {params.calendar === 'connected' && (
          <p className="caption mt-4 text-olive">Google Calendar is connected.</p>
        )}
        {params.calendar === 'error' && (
          <p className="caption mt-4 text-olive">
            Google Calendar could not be connected. Try again.
          </p>
        )}
       
        <div className="mt-10">
          <AvailabilityManager blocks={availabilityBlocks} />
        </div>
      </div>
    </main>
  )
}
