import { redirect } from 'next/navigation'

// D30 pass 1: PROFILE consolidated into ACCOUNT. Redirect kept (not deleted)
// so every existing inbound link keeps resolving -- see dashboard-ia-audit.md
// for the full old-route inventory this pass is closing over.
export default function DashboardProfileRedirect() {
  redirect('/dashboard/account')
}
