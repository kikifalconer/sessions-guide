import { redirect } from 'next/navigation'

// D30 pass 1: BILLING consolidated into ABUNDANCE (target IA: "earnings,
// billing" in one bucket). Redirect kept (not deleted) so every existing
// inbound link keeps resolving -- including three external ones that
// hardcode this exact path: the Stripe checkout success/cancel URLs
// (src/app/api/stripe/checkout/route.ts), the Stripe billing-portal
// return_url (src/app/api/stripe/portal/route.ts), and the trial-reminder
// cron email's renewUrl (src/app/api/cron/subscription-reminders/route.ts).
// None of those were changed this pass -- they keep working via this
// redirect. See dashboard-ia-audit.md / this pass's report for the full list.
export default function DashboardBillingRedirect() {
  redirect('/dashboard/abundance')
}
