import { redirect } from 'next/navigation'

// D30 pass 1: SESSIONS consolidated into MY OFFERINGS. Redirect kept (not
// deleted) so every existing inbound link keeps resolving.
export default function DashboardSessionsRedirect() {
  redirect('/dashboard/offerings')
}
