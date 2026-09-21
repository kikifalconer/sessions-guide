import { redirect } from 'next/navigation'

// D30 pass 1: ACCOUNT (formerly PROFILE) is the dashboard home. Points
// directly at the new route rather than bouncing through /dashboard/profile.
export default function DashboardIndexPage() {
  redirect('/dashboard/account')
}
