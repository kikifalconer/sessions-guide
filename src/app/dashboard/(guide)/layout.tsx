import { requirePractitioner } from './requirePractitioner'
import DashboardSidebar from './DashboardSidebar'
import MobileTabBar from './MobileTabBar'

// Shared shell for every /dashboard/* route (D29 visual rebuild). Replaces
// the marketing <SiteHeader /> previously rendered on each page -- the
// dashboard has its own chrome now, matching docs/mockups/dashboard-mockup.png.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const practitioner = await requirePractitioner()

  return (
    <div className="dashboard-shell flex min-h-screen flex-col md:flex-row">
      <DashboardSidebar fullName={practitioner.full_name} isPublished={practitioner.is_published} />
      {/* Bottom padding matches MobileTabBar's fixed h-16 plus the iOS safe
          area, so page content never hides behind it. Zeroed at md+, where
          the bar doesn't render -- an inline style here would out-specificity
          that override, so this has to be a class, not a style prop. */}
      <div className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>
      <MobileTabBar />
    </div>
  )
}
