import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { requirePractitioner } from '../requirePractitioner'
import DisplayNameEditor from '../DisplayNameEditor'
import PageHeader from '@/components/dashboard/PageHeader'
import AccountNav from '@/components/dashboard/AccountNav'

export const metadata = { title: `account | ${BRAND_NAME}` }

export default async function DashboardAccountPage() {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()

  const { data: profileRow } = await admin
    .from('practitioners')
    .select('tagline')
    .eq('id', practitioner.id)
    .maybeSingle()

  return (
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader title="Account" />
        <AccountNav current="info" />

        <section className="mt-10">
          <h2>Basic information</h2>
          <div className="mt-6">
            <DisplayNameEditor
              initialFullName={practitioner.full_name}
              initialTagline={profileRow?.tagline ?? null}
              fields="name"
            />
          </div>
        </section>
      </div>
    </main>
  )
}
