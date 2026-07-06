import { notFound } from 'next/navigation'
import Link from 'next/link'
import { discoverInCity } from '@/lib/discovery'
import PractitionerCard from '@/components/PractitionerCard'
import SiteHeader from '@/components/site-header'
import { DISCOVERY_HOME } from '@/lib/routes'
import { JsonLd, cityPageJsonLd } from '@/lib/seo/structuredData'

const PSYCHEDELIC_DISCLAIMER =
  'Psychedelic journey facilitation may be subject to local laws and regulations. Practitioners and clients are solely responsible for ensuring compliance with the laws of their jurisdiction.'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>
}) {
  const { city } = await params
  const result = await discoverInCity(city)
  if (!result) return { title: 'sessions.guide' }
  return {
    title: `Healing & Wellness Practitioners in ${result.displayCity} | sessions.guide`,
    description: `Find and book wellness practitioners in ${result.displayCity} on sessions.guide. Virtual sessions are available everywhere, wherever you are.`,
  }
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>
  searchParams: Promise<{ in_person?: string }>
}) {
  const { city } = await params
  const inPersonOnly = (await searchParams).in_person === '1'

  const result = await discoverInCity(city, { inPersonOnly })
  if (!result) notFound() // unknown city (no block defines it) — deliberately a 404, not an empty state

  const { cards, displayCity } = result
  const hasPsychedelic = cards.some((p) => p.hasPsychedelic)

  const base = `/in/${city}`

  const citySeo = cityPageJsonLd({
    cityName: displayCity,
    citySlug: city,
    practitioners: cards.map((c) => ({ slug: c.slug, full_name: c.fullName })),
  })

  return (
    <main className="min-h-screen bg-bg">
      <JsonLd data={citySeo} />
      <SiteHeader />

      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        <nav className="caption mb-6 text-dark" aria-label="Breadcrumb">
          <Link href={DISCOVERY_HOME} className="text-olive">
            EXPLORE
          </Link>
          <span className="px-2 opacity-50">›</span>
          <span>{displayCity}</span>
        </nav>

        <h2 className="mb-6">{displayCity}</h2>

        {/* In-person-only toggle (D15). All = in-person within this area plus
            virtual; In person only drops the virtual set. */}
        <div className="mb-8 flex gap-3" role="group" aria-label="Filter by format">
          <Link
            href={base}
            className={`caption border px-4 py-2 ${
              inPersonOnly ? 'border-border text-dark' : 'border-olive text-olive'
            }`}
          >
            ALL
          </Link>
          <Link
            href={`${base}?in_person=1`}
            className={`caption border px-4 py-2 ${
              inPersonOnly ? 'border-olive text-olive' : 'border-border text-dark'
            }`}
          >
            IN PERSON ONLY
          </Link>
        </div>

        {hasPsychedelic && (
          <div className="mb-8 border border-border bg-surface px-4 py-3">
            <p className="caption text-dark">{PSYCHEDELIC_DISCLAIMER}</p>
          </div>
        )}

        {cards.length === 0 ? (
          <p className="text-dark">
            No practitioners in this area yet. Virtual sessions are available everywhere.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((p) => (
              <PractitionerCard key={p.id} practitioner={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
