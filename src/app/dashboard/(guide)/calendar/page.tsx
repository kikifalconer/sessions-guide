import { redirect } from 'next/navigation'

// D30 pass 1: CALENDAR consolidated into MY BOOKINGS (the calendar widget
// now lives inline on that page). Redirect kept (not deleted) so every
// existing inbound link keeps resolving.
export default function DashboardCalendarRedirect() {
  redirect('/dashboard/bookings')
}
