import DashboardChrome from '@/components/dashboard/DashboardChrome'
import { MEMBER_NAV } from '@/lib/dashboardNav'
import { countUnreadInquiries } from '@/lib/inquiries'
import { requirePractitioner } from './requirePractitioner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const practitioner = await requirePractitioner()
  const unreadMessages = await countUnreadInquiries(practitioner.id)

  return (
    <DashboardChrome
      items={MEMBER_NAV}
      mobileTabs={MEMBER_NAV}
      fullName={practitioner.full_name}
      statusLabel={practitioner.is_published ? 'Live' : 'Draft'}
      badges={{ '/dashboard/bookings': unreadMessages }}
    >
      {children}
    </DashboardChrome>
  )
}
