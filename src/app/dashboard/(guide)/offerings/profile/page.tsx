import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { requirePractitioner } from '../../requirePractitioner'
import ProfileSection from '../../ProfileSection'
import DisplayNameEditor from '../../DisplayNameEditor'
import ModalitiesEditor from '../../ModalitiesEditor'
import BioEditor from '../../BioEditor'
import LinksEditor from '../../LinksEditor'
import PageHeader from '@/components/dashboard/PageHeader'
import PracticeNav from '@/components/dashboard/PracticeNav'

export const metadata = { title: `practice | ${BRAND_NAME}` }

export default async function DashboardPracticeProfilePage() {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()

  const [{ data: profileRow }, { data: tagRows }, { data: modalityRows }] = await Promise.all([
    admin
      .from('practitioners')
      .select('tagline, bio, link_1, link_2, link_3')
      .eq('id', practitioner.id)
      .maybeSingle(),
    admin.from('practitioner_modalities').select('modality_id, is_primary').eq('practitioner_id', practitioner.id),
    admin.from('modalities').select('id, name, slug, categories(name)').eq('is_approved', true).order('name'),
  ])

  const modalities = (modalityRows ?? []).map((m) => {
    const category = m.categories as { name?: string } | { name?: string }[] | null
    const categoryName = Array.isArray(category) ? (category[0]?.name ?? '') : (category?.name ?? '')
    return { id: m.id as string, name: m.name as string, slug: m.slug as string, category: categoryName }
  })
  const primaryTag = (tagRows ?? []).find((t) => t.is_primary)
  const secondaryTags = (tagRows ?? []).filter((t) => !t.is_primary)

  return (
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          title="Practice"
          action={
            <ProfileSection slug={practitioner.slug} isPublished={practitioner.is_published} />
          }
        />
        <PracticeNav current="profile" />

        <section className="mt-10">
          <p className="text-dark">
            Profile status:{' '}
            {practitioner.is_published ? 'Published' : 'Unpublished'}
          </p>
        </section>

        <section className="mt-12">
          <h2>Tagline</h2>
          <div className="mt-6">
            <DisplayNameEditor
              initialFullName={practitioner.full_name}
              initialTagline={profileRow?.tagline ?? null}
              fields="tagline"
            />
          </div>
        </section>

        <section className="mt-12">
          <h2>Modalities</h2>
          <div className="mt-6">
            <ModalitiesEditor
              modalities={modalities}
              initialPrimaryId={(primaryTag?.modality_id as string | undefined) ?? null}
              initialSecondaryIds={secondaryTags.map((t) => t.modality_id as string)}
            />
          </div>
        </section>

        <section className="mt-12">
          <h2>Bio</h2>
          <div className="mt-6">
            <BioEditor initialBio={(profileRow?.bio as string | null) ?? null} />
          </div>
        </section>

        <section className="mt-12">
          <h2>Links</h2>
          <p className="mt-3 max-w-[60ch] text-dark">
            Up to three links on your public profile. A website, Instagram, YouTube, or anywhere else your work lives.
          </p>
          <div className="mt-6 max-w-xl">
            <LinksEditor
              initialLinks={[
                (profileRow?.link_1 as string | null) ?? '',
                (profileRow?.link_2 as string | null) ?? '',
                (profileRow?.link_3 as string | null) ?? '',
              ]}
            />
          </div>
        </section>
      </div>
    </main>
  )
}
