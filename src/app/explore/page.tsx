import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { categoryPath } from '@/lib/routes'
import { buildMetadata } from '@/lib/metadata'
import {
  approvedModalities,
  derivableCities,
  discoverPractitioners,
  activeSessionsForGuides,
} from '@/lib/discovery'
import { CATEGORY_HERO } from '@/lib/categoryHero'
import AppOrPublicShell from '@/components/dashboard/AppOrPublicShell'
import PractitionerCard from '@/components/PractitionerCard'
import SessionCard from '@/components/SessionCard'
import ExploreSearch from '@/components/ExploreSearch'
import EmptyState from '@/components/dashboard/EmptyState'

export const metadata = buildMetadata({
  concept: 'browse sessions',
  description: 'Browse healing and transformational practitioners by category. Book virtual or in-person sessions in reiki, astrology, breathwork and more.',
  path: '/explore',
})

const PSYCHEDELIC_DISCLAIMER =
  'Psychedelic journey facilitation may be subject to local laws and regulations. Practitioners and clients are solely responsible for ensuring compliance with the laws of their jurisdiction.'

function SnapRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
      {children}
    </div>
  )
}

function SnapItem({ children }: { children: React.ReactNode }) {
  return <div className="w-[80vw] shrink-0 snap-start md:w-auto">{children}</div>
}

export default async function ExplorePage() {
  const admin = createAdminClient()

  const [guides, modalityGroups, cities, { data: categoryRows }] = await Promise.all([
    discoverPractitioners({}),
    approvedModalities(),
    derivableCities(),
    admin.from('categories').select('id, name, slug').order('sort_order'),
  ])

  const sessions = await activeSessionsForGuides(guides)
  const featuredGuides = guides.slice(0, 3)
  const featuredSessions = sessions.slice(0, 6)

  const modsByCategory = new Map(modalityGroups.map((g) => [g.category, g.modalities]))
  const modalities = modalityGroups.flatMap((g) => g.modalities)

  const categories = (categoryRows ?? []).map((c) => {
    const hero = CATEGORY_HERO[c.slug as string]
    const tags = modsByCategory.get(c.name as string) ?? []
    return {
      id: c.id as string,
      name: c.name as string,
      slug: c.slug as string,
      image: hero?.image ?? null,
      tags,
    }
  })

  const hasPsychedelic =
    featuredGuides.some((g) => g.hasPsychedelic) || featuredSessions.some((s) => s.hasPsychedelic)

  return (
    <AppOrPublicShell>
      <main className="min-h-screen bg-bg">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-12 sm:py-16">
          <h1>Explore Guides</h1>
        

          <div className="mt-8">
            <ExploreSearch modalities={modalities} cities={cities} />
          </div>

          {hasPsychedelic && (
            <p className="caption mt-6 max-w-[70ch] text-dark">{PSYCHEDELIC_DISCLAIMER}</p>
          )}

          <section className="mt-14">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2>Find Your Guide</h2>
              {featuredGuides.length > 0 && (
                <Link href="/search" className="btn-secondary shrink-0">
                  See more
                </Link>
              )}
            </div>
            {featuredGuides.length === 0 ? (
              <EmptyState>No guides to show yet.</EmptyState>
            ) : (
              <SnapRow>
                {featuredGuides.map((p) => (
                  <SnapItem key={p.id}>
                    <PractitionerCard practitioner={p} />
                  </SnapItem>
                ))}
              </SnapRow>
            )}
          </section>

          <section className="mt-14">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2>Find Healing & Transformational Sessions</h2>
              {featuredSessions.length > 0 && (
                <Link href="/explore/sessions" className="btn-secondary shrink-0">
                  See more
                </Link>
              )}
            </div>
            {featuredSessions.length === 0 ? (
              <EmptyState>No sessions to show yet.</EmptyState>
            ) : (
              <SnapRow>
                {featuredSessions.map((s) => (
                  <SnapItem key={s.id}>
                    <SessionCard session={s} />
                  </SnapItem>
                ))}
              </SnapRow>
            )}
          </section>

          <section className="mt-14">
            <h2 className="mb-6">Explore Modalities</h2>
            {categories.length === 0 ? (
              <EmptyState>No modalities to show yet.</EmptyState>
            ) : (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                {categories.map((c) => {
                  const extra = Math.max(0, c.tags.length - 6)
                  const shown = c.tags.slice(0, 6)
                  return (
                    <div key={c.id} className="min-w-0">
                      <Link
                        href={categoryPath(c.slug)}
                        className="block outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-light">
                          {c.image && (
                            <Image
                              src={c.image}
                              alt={c.name}
                              fill
                              sizes="(max-width: 768px) 50vw, 280px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <p className="mt-3 line-clamp-2 font-display text-[1.25rem]! font-normal uppercase leading-[1.15] tracking-[0.04em] text-dark md:text-[1.4rem]!">
                          {c.name}
                        </p>
                      </Link>
                      {shown.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-x-1 gap-y-0.5">
                          {shown.map((m) => (
                            <Link
                              key={m.slug}
                              href={`/search?modality=${encodeURIComponent(m.slug)}`}
                              className="px-[6px] py-[2px] font-ui text-[0.65rem]! uppercase leading-tight tracking-[0.06em] text-olive outline-none hover:text-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
                            >
                              {m.name}
                            </Link>
                          ))}
                          {extra > 0 && (
                            <Link
                              href={categoryPath(c.slug)}
                              className="px-[6px] py-[2px] font-ui text-[0.65rem]! uppercase leading-tight tracking-[0.06em] text-dark/70 outline-none hover:text-olive focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
                            >
                              + {extra} more
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </AppOrPublicShell>
  )
}
