import DashboardChrome from '@/components/dashboard/DashboardChrome'
import { MEMBER_NAV } from '@/lib/dashboardNav'
import { requirePractitioner } from './requirePractitioner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const practitioner = await requirePractitioner()

  return (
    <DashboardChrome
      items={MEMBER_NAV}
      mobileTabs={MEMBER_NAV}
      fullName={practitioner.full_name}
      statusLabel={practitioner.is_published ? 'Live' : 'Draft'}
    >
      {children}
    </DashboardChrome>
  )
}
