import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSeekerProfile } from '@/lib/seekers'
import { accountIdentity } from '@/lib/seekerIdentity'
import { loadSeekerData } from '@/lib/seekerData'
import SiteHeader from '@/components/site-header'
import AccountShell from './AccountShell'

export const metadata = {
  title: 'Your account | sessions.guide',
}

// Seeker dashboard (D20). Server-side auth guard, same shape as /dashboard.
// A practitioner landing here sees their own seeker-side data — they are a
// valid seeker — though the header routes them to /dashboard by default.
export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=${encodeURIComponent('/account')}`)

  const [profile, identity, data] = await Promise.all([
    getSeekerProfile(user.id),
    accountIdentity(user.id),
    loadSeekerData(user.id),
  ])

  return (
    <>
      <SiteHeader />
      <AccountShell
        fullName={profile?.full_name ?? identity.name}
        currentEmail={user.email ?? null}
        newsletterOptIn={profile?.newsletter_opt_in ?? false}
        data={data}
      />
    </>
  )
}
