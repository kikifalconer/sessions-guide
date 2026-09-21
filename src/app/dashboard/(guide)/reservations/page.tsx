import { redirect } from 'next/navigation'

// D30 pass 1: RESERVATIONS consolidated into MY BOOKINGS (guide side + client
// side, one view). Redirect kept (not deleted) so every existing inbound
// link keeps resolving.
export default function DashboardReservationsRedirect() {
  redirect('/dashboard/bookings')
}
