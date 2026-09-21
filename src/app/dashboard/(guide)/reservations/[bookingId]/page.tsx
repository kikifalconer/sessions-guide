import { redirect } from 'next/navigation'

// D30 pass 1: moved to /dashboard/bookings/[bookingId]. Redirect kept (not
// deleted) so every existing inbound link keeps resolving.
export default async function DashboardReservationDetailRedirect({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const { bookingId } = await params
  redirect(`/dashboard/bookings/${bookingId}`)
}
