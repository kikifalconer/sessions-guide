import { redirect } from 'next/navigation'

export default function DashboardBillingRedirect() {
  redirect('/dashboard/account/membership')
}
