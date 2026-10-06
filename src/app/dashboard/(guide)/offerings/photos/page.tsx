import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { requirePractitioner } from '../../requirePractitioner'
import PortraitEditor from '../../PortraitEditor'
import BannerEditor from '../../BannerEditor'
import PageHeader from '@/components/dashboard/PageHeader'
import PracticeNav from '@/components/dashboard/PracticeNav'

export const metadata = { title: `practice | ${BRAND_NAME}` }

export default async function DashboardPracticePhotosPage() {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()

  const { data: profileRow } = await admin
    .from('practitioners')
    .select('photo_url, banner_url')
    .eq('id', practitioner.id)
    .maybeSingle()

  return (
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader title="Practice" />
        <PracticeNav current="photos" />
        <section className="mt-10">
          <h2>Photos</h2>
          <div className="mt-6 flex flex-col gap-8 sm:flex-row">
            <PortraitEditor initialPhotoUrl={profileRow?.photo_url ?? null} />
            <BannerEditor initialBannerUrl={(profileRow?.banner_url as string | null) ?? null} />
          </div>
        </section>
      </div>
    </main>
  )
}
