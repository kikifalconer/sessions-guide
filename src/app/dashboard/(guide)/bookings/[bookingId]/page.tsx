import { notFound } from 'next/navigation'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { requirePractitioner } from '../../requirePractitioner'

export const metadata = { title: `booking | ${BRAND_NAME}` }

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'CONFIRMED',
  pending_payment: 'HELD — AWAITING PAYMENT',
  pending_approval: 'HELD — AWAITING CONFIRMATION',
  cancelled: 'CANCELLED',
  completed: 'COMPLETED',
}

// D30 pass 1: moved from reservations/[bookingId]/page.tsx unchanged.
// Read-only -- no approve/decline here (GAP-1: that transition doesn't
// exist in this codebase), just what's already true about the booking.
export default async function DashboardBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const { bookingId } = await params
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('bookings')
    .select(
      'id, practitioner_id, start_datetime, booked_format, booked_location_display, status, seeker_id, guest_name, session_types ( name )'
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (!booking || booking.practitioner_id !== practitioner.id) notFound()

  const st = booking.session_types as unknown as { name: string } | null
  const seekerId = booking.seeker_id as string | null
  let clientName = (booking.guest_name as string | null) ?? 'A client'
  if (seekerId) {
    const { data: seekerRow } = await admin.from('seekers').select('full_name').eq('id', seekerId).maybeSingle()
    clientName = (seekerRow?.full_name as string | undefined) ?? clientName
  }

  return (
    <main className="px-8 py-12">
      <div className="mx-auto w-full max-w-[1200px]">
        <h1>{st?.name ?? 'Session'}</h1>
        <dl className="mt-8 flex max-w-[480px] flex-col gap-4">
          <div>
            <dt className="label text-dark opacity-70">CLIENT</dt>
            <dd className="mt-1 text-dark">{clientName}</dd>
          </div>
          <div>
            <dt className="label text-dark opacity-70">WHEN</dt>
            <dd className="mt-1 text-dark">
              {DateTime.fromISO(booking.start_datetime as string).toFormat('cccc, LLLL d, yyyy, h:mm a')}
            </dd>
          </div>
          <div>
            <dt className="label text-dark opacity-70">FORMAT</dt>
            <dd className="mt-1 text-dark">
              {booking.booked_format === 'virtual' ? 'Virtual' : 'In person'}
              {booking.booked_location_display ? ` · ${booking.booked_location_display}` : ''}
            </dd>
          </div>
          <div>
            <dt className="label text-dark opacity-70">STATUS</dt>
            <dd className="mt-1 text-dark">{STATUS_LABEL[booking.status as string] ?? booking.status}</dd>
          </div>
        </dl>
      </div>
    </main>
  )
}
