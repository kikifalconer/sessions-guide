import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { accountIdentity } from '@/lib/seekerIdentity'
import DashboardChrome from '@/components/dashboard/DashboardChrome'
import { BASIC_NAV } from '@/lib/dashboardNav'

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=${encodeURIComponent('/account')}`)

  const identity = await accountIdentity(user.id)

  return (
    <DashboardChrome items={BASIC_NAV} mobileTabs={BASIC_NAV} fullName={identity.name}>
      {children}
    </DashboardChrome>
  )
}
