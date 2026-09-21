import Link from 'next/link'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { loadSeekerData } from '@/lib/seekerData'
import { requirePractitioner } from '../requirePractitioner'
import SeekerBookings from '@/components/account/SeekerBookings'
import ReservationsCalendar, { type CalendarBookingMarker } from '../ReservationsCalendar'

export const metadata = { title: `my bookings | ${BRAND_NAME}` }

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'CONFIRMED',
  pending_payment: 'HELD',
  pending_approval: 'HELD',
}

// D30 pass 1: consolidates three old routes into the target IA's single
// MY BOOKINGS view (as guide and as client) -- reservations/page.tsx,
// calendar/page.tsx, and this route's own previous seeker-only content, all
// stacked on one page. Each section's query/JSX is carried over unchanged
// from its source file; only the DETAILS links were repointed from
// /dashboard/reservations/[id] to /dashboard/bookings/[id], since that
// detail route moves in this same pass. No approve/decline anywhere here --
// GAP-1: that transition does not exist in this codebase. Statuses shown are
// exactly what's true today (CONFIRMED / HELD), nothing implies a guide can
// act on a pending_approval row from this page.
export default async function DashboardBookingsPage() {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()
  const nowIso = DateTime.utc().toISO() as string

  const [{ data: reservationRows }, { data: calendarRows }, seekerData] = await Promise.all([
    admin
      .from('bookings')
      .select('id, start_datetime, booked_format, status, seeker_id, guest_name, session_types ( name )')
      .eq('practitioner_id', practitioner.id)
      .in('status', ['confirmed', 'pending_payment', 'pending_approval'])
      .gte('start_datetime', nowIso)
      .order('start_datetime', { ascending: true }),
    admin
      .from('bookings')
      .select('start_datetime, status')
      .eq('practitioner_id', practitioner.id)
      .in('status', ['confirmed', 'completed', 'pending_payment', 'pending_approval']),
    loadSeekerData(practitioner.id),
  ])

  const seekerIds = Array.from(
    new Set((reservationRows ?? []).map((r) => r.seeker_id as string | null).filter(Boolean))
  ) as string[]
  const seekerNameById: Record<string, string> = {}
  if (seekerIds.length > 0) {
    const { data: seekerRows } = await admin.from('seekers').select('id, full_name').in('id', seekerIds)
    for (const row of seekerRows ?? []) {
      seekerNameById[row.id as string] = row.full_name as string
    }
  }

  const reservations = (reservationRows ?? []).map((row) => {
    const st = row.session_types as unknown as { name: string } | null
    const seekerId = row.seeker_id as string | null
    const clientName = seekerId
      ? (seekerNameById[seekerId] ?? 'A client')
      : ((row.guest_name as string | null) ?? 'A client')
    return {
      id: row.id as string,
      startUtc: row.start_datetime as string,
      bookedFormat: row.booked_format as 'virtual' | 'in_person',
      status: row.status as string,
      sessionName: st?.name ?? 'Session',
      clientName,
    }
  })

  const calendarMarkers: CalendarBookingMarker[] = (calendarRows ?? []).map((row) => ({
    isoDate: DateTime.fromISO(row.start_datetime as string).toISODate() as string,
    kind: row.status === 'confirmed' || row.status === 'completed' ? 'confirmed' : 'held',
  }))

  return (
    <main className="px-8 py-12">
      <div className="mx-auto w-full max-w-[1200px]">
        <h1>My bookings</h1>
        <p className="mt-4 max-w-[60ch] text-dark">
          Sessions clients have booked with you, and sessions you have booked with other guides,
          in one place.
        </p>

        <div className="mt-12">
          <h2>As a guide</h2>
          <p className="mt-4 max-w-[60ch] text-dark">
            Sessions clients have booked with you, upcoming first.
          </p>
          {reservations.length === 0 ? (
            <p className="mt-6 max-w-[60ch] text-dark">
              Nothing booked yet. Reservations will show here once someone books you.
            </p>
          ) : (
            <ul className="mt-6 flex flex-col gap-3">
              {reservations.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between border border-border bg-surface px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block text-dark">{r.sessionName} · {r.clientName}</span>
                    <span className="caption mt-1 block text-dark opacity-70">
                      {DateTime.fromISO(r.startUtc).toFormat('ccc, LLL d, h:mm a')} ·{' '}
                      {r.bookedFormat === 'virtual' ? 'VIRTUAL' : 'IN PERSON'} · {STATUS_LABEL[r.status]}
                    </span>
                  </span>
                  <Link href={`/dashboard/bookings/${r.id}`} className="caption shrink-0 text-olive">
                    DETAILS
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-12">
          <h2>Calendar</h2>
          <p className="mt-4 max-w-[60ch] text-dark">
            Confirmed and held reservations across the month.
          </p>
          <div className="mt-6">
            <ReservationsCalendar markers={calendarMarkers} />
          </div>
        </div>

        <div className="mt-12">
          <h2>As a client</h2>
          <p className="mt-4 max-w-[60ch] text-dark">
            The sessions you have booked with other guides, as a client of your own practice.
          </p>
          <div className="mt-6">
            <SeekerBookings upcoming={seekerData.upcoming} past={seekerData.past} />
          </div>
        </div>

        {/* Reserved slot only -- no component, no query, no copy describing
            what trade does or promising it's coming. Trade has no schema
            (no trade_requests table, no practitioners.open_to_trade, no
            bookings.trade_request_id) and nothing is built for it. */}
        <div className="mt-12">
          <h2>Trade requests</h2>
          <div className="mt-6 border border-border bg-surface px-4 py-6">
            <p className="caption text-dark opacity-70">Not available yet.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
