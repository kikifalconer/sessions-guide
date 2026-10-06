import Link from 'next/link'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { loadSeekerData } from '@/lib/seekerData'
import { requirePractitioner } from '../requirePractitioner'
import SeekerBookings from '@/components/account/SeekerBookings'
import ReservationsCalendar, { type CalendarBookingMarker } from '../ReservationsCalendar'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import BookingsNav from '@/components/dashboard/BookingsNav'

export const metadata = { title: `my bookings | ${BRAND_NAME}` }

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmed',
  pending_payment: 'Held',
  pending_approval: 'Held',
  cancelled: 'Cancelled',
  completed: 'Completed',
}

type BookingListRow = {
  id: string
  startUtc: string
  bookedFormat: 'virtual' | 'in_person'
  status: string
  sessionName: string
  clientName: string
}

export default async function DashboardBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; past?: string }>
}) {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()
  const nowIso = DateTime.utc().toISO() as string
  const params = await searchParams
  const role = params.role === 'client' ? 'client' : 'guide'
  const showAllPast = params.past === 'all'

  const [{ data: reservationRows }, { data: pastRows }, { data: calendarRows }, seekerData] =
    await Promise.all([
      admin
        .from('bookings')
        .select('id, start_datetime, booked_format, status, seeker_id, guest_name, session_types ( name )')
        .eq('practitioner_id', practitioner.id)
        .in('status', ['confirmed', 'pending_payment', 'pending_approval'])
        .gte('start_datetime', nowIso)
        .order('start_datetime', { ascending: true }),
      admin
        .from('bookings')
        .select('id, start_datetime, booked_format, status, seeker_id, guest_name, session_types ( name )')
        .eq('practitioner_id', practitioner.id)
        .in('status', ['completed', 'cancelled'])
        .order('start_datetime', { ascending: false }),
      admin
        .from('bookings')
        .select('start_datetime, status')
        .eq('practitioner_id', practitioner.id)
        .in('status', ['confirmed', 'completed', 'pending_payment', 'pending_approval']),
      loadSeekerData(practitioner.id),
    ])

  const mapRows = (
    rows: typeof reservationRows,
    names: Record<string, string>
  ): BookingListRow[] =>
    (rows ?? []).map((row) => {
      const st = row.session_types as unknown as { name: string } | null
      const seekerId = row.seeker_id as string | null
      const clientName = seekerId
        ? (names[seekerId] ?? 'A client')
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

  const allListRows = [...(reservationRows ?? []), ...(pastRows ?? [])]
  const seekerIds = Array.from(
    new Set(allListRows.map((r) => r.seeker_id as string | null).filter(Boolean))
  ) as string[]
  const seekerNameById: Record<string, string> = {}
  if (seekerIds.length > 0) {
    const { data: seekerRows } = await admin.from('seekers').select('id, full_name').in('id', seekerIds)
    for (const row of seekerRows ?? []) {
      seekerNameById[row.id as string] = row.full_name as string
    }
  }

  const reservations = mapRows(reservationRows, seekerNameById)
  const pastAll = mapRows(pastRows, seekerNameById)
  const pastVisible = showAllPast ? pastAll : pastAll.slice(0, 3)
  const hasMorePast = !showAllPast && pastAll.length > 3

  const calendarMarkers: CalendarBookingMarker[] = (calendarRows ?? []).map((row) => ({
    isoDate: DateTime.fromISO(row.start_datetime as string).toISODate() as string,
    kind: row.status === 'confirmed' || row.status === 'completed' ? 'confirmed' : 'held',
  }))

  function bookingRow(r: BookingListRow) {
    return (
      <li key={r.id} className="flex min-h-[44px] flex-wrap items-center justify-between gap-4 py-3">
        <span className="min-w-0">
          <span className="block text-dark">
            {r.sessionName} · {r.clientName}
          </span>
          <span className="caption mt-1 block text-dark opacity-70">
            {DateTime.fromISO(r.startUtc).toFormat('ccc, LLL d, h:mm a')} ·{' '}
            {r.bookedFormat === 'virtual' ? 'Virtual' : 'In person'} ·{' '}
            {STATUS_LABEL[r.status] ?? r.status}
          </span>
        </span>
        <Link
          href={`/dashboard/bookings/${r.id}`}
          className="caption shrink-0 text-olive outline-none hover:text-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
        >
          Manage booking
        </Link>
      </li>
    )
  }

  return (
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader title="Bookings" />
        <BookingsNav current={role === 'client' ? 'client' : 'guide'} />

        {role === 'guide' && (
          <>
            <section className="mt-10">
              <h2>Upcoming</h2>
              {reservations.length === 0 ? (
                <EmptyState>
                  Nothing booked yet. Reservations will show here once someone books you.
                </EmptyState>
              ) : (
                <ul className="mt-6 flex flex-col gap-3">{reservations.map(bookingRow)}</ul>
              )}
            </section>

            <section className="mt-12">
              <h2>Past reservations</h2>
              {pastAll.length === 0 ? (
                <EmptyState>No past reservations yet.</EmptyState>
              ) : (
                <>
                  <ul className="mt-6 flex flex-col gap-3">{pastVisible.map(bookingRow)}</ul>
                  {hasMorePast && (
                    <Link
                      href="/dashboard/bookings?role=guide&past=all"
                      className="caption mt-4 inline-block text-olive outline-none hover:text-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
                    >
                      See more
                    </Link>
                  )}
                </>
              )}
            </section>

            <section className="mt-12">
              <h2>Calendar</h2>
              <div className="mt-6">
                <ReservationsCalendar markers={calendarMarkers} />
              </div>
            </section>
          </>
        )}

        {role === 'client' && (
          <section className="mt-10">
            <div className="mt-6">
              <SeekerBookings upcoming={seekerData.upcoming} past={seekerData.past} />
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
