import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSeekerProfile } from '@/lib/seekers'
import { accountIdentity } from '@/lib/seekerIdentity'
import { BRAND_NAME } from '@/lib/brand'
import SeekerSettings from '@/components/account/SeekerSettings'
import PageHeader from '@/components/dashboard/PageHeader'

export const metadata = {
  title: `your account | ${BRAND_NAME}`,
}

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=${encodeURIComponent('/account')}`)

  const [profile, identity] = await Promise.all([
    getSeekerProfile(user.id),
    accountIdentity(user.id),
  ])

  return (
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          title="Account"
          description="Your name, email, and how we write to you."
        />
        <section className="mt-10">
          <h2>Basic information</h2>
          <div className="mt-6">
            <SeekerSettings
              initialFullName={profile?.full_name ?? identity.name}
              initialNewsletterOptIn={profile?.newsletter_opt_in ?? false}
              currentEmail={user.email ?? null}
            />
          </div>
        </section>
      </div>
    </main>
  )
}
