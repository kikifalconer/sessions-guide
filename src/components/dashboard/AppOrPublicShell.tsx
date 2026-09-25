import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { accountIdentity } from '@/lib/seekerIdentity'
import SiteHeader from '@/components/site-header'
import DashboardChrome from '@/components/dashboard/DashboardChrome'
import { BASIC_NAV, MEMBER_NAV } from '@/lib/dashboardNav'

export default async function AppOrPublicShell({
  children,
  signedOutHeader,
}: {
  children: React.ReactNode
  signedOutHeader?: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <>
        {signedOutHeader ?? <SiteHeader />}
        {children}
      </>
    )
  }

  const admin = createAdminClient()
  const { data: practitioner } = await admin
    .from('practitioners')
    .select('full_name, is_published')
    .eq('id', user.id)
    .maybeSingle()

  if (practitioner) {
    return (
      <DashboardChrome
        items={MEMBER_NAV}
        mobileTabs={MEMBER_NAV}
        fullName={practitioner.full_name as string}
        statusLabel={practitioner.is_published ? 'Live' : 'Draft'}
      >
        {children}
      </DashboardChrome>
    )
  }

  const identity = await accountIdentity(user.id)
  return (
    <DashboardChrome items={BASIC_NAV} mobileTabs={BASIC_NAV} fullName={identity.name}>
      {children}
    </DashboardChrome>
  )
}
