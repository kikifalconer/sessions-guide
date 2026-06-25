import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { discoverPractitioners } from '@/lib/discovery'
import PractitionerCard from '@/components/PractitionerCard'
import SiteHeader from '@/components/site-header'
import { DISCOVERY_HOME } from '@/lib/routes'

const PSYCHEDELIC_DISCLAIMER =
  'Psychedelic journey facilitation may be subject to local laws and regulations. Practitioners and clients are solely responsible for ensuring compliance with the laws of their jurisdiction.'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const admin = createAdminClient()
  const { data } = await admin.from('categories').select('name').eq('slug', category).maybeSingle()
  return { title: data ? `${data.name} | sessions.guide` : 'sessions.guide' }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const admin = createAdminClient()

  const { data: cat } = await admin
    .from('categories')
    .select('name, slug')
    .eq('slug', category)
    .maybeSingle()
  if (!cat) notFound()

  const practitioners = await discoverPractitioners({ categorySlug: cat.slug })
  const hasPsychedelic = practitioners.some((p) => p.hasPsychedelic)

  return (
    <main className="min-h-screen bg-bg">
      <SiteHeader />

      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        <nav className="caption mb-6 text-dark" aria-label="Breadcrumb">
          <Link href={DISCOVERY_HOME} className="text-olive">
            EXPLORE
          </Link>
          <span className="px-2 opacity-50">›</span>
          <span>{cat.name}</span>
        </nav>

        <h2 className="mb-8">{cat.name}</h2>

        {hasPsychedelic && (
          <div className="mb-8 border border-border bg-surface px-4 py-3">
            <p className="caption text-dark">{PSYCHEDELIC_DISCLAIMER}</p>
          </div>
        )}

        {practitioners.length === 0 ? (
          <p className="text-dark">
            No practitioners here yet. Try another category, or search by modality.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {practitioners.map((p) => (
              <PractitionerCard key={p.id} practitioner={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
