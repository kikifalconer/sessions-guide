import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { discoverPractitioners } from '@/lib/discovery'
import PractitionerCard from '@/components/PractitionerCard'
import { getSiteUrl } from '@/lib/siteUrl'
import { JsonLd, categoryPageJsonLd, breadcrumbJsonLd } from '@/lib/seo/structuredData'
import AppOrPublicShell from '@/components/dashboard/AppOrPublicShell'
import { CATEGORY_HERO } from '@/lib/categoryHero'

const PSYCHEDELIC_DISCLAIMER =
  'Psychedelic journey facilitation may be subject to local laws and regulations. Practitioners and clients are solely responsible for ensuring compliance with the laws of their jurisdiction.'

// Title: "{Category} Practitioners - {as many modalities as fit ~60 chars} |
// guides’space". No em dashes; the modality list is comma-separated and the
// full list lives in the description. Falls back cleanly when no modalities fit.
function categoryTitle(categoryName: string, modalityNames: string[]): string {
  const suffix = ' | guides’space'
  const prefix = `${categoryName.toLowerCase()} practitioners`
  if (modalityNames.length === 0) return `${prefix}${suffix}`
  // Always include the first modality (the keyword whole point), then add more
  // while the title stays near ~60 chars. Full list lives in the description.
  const budget = 60 - prefix.length - 2 - suffix.length // 2 for ": "
  let list = modalityNames[0].toLowerCase()
  for (const name of modalityNames.slice(1)) {
    const next = `${list}, ${name.toLowerCase()}`
    if (next.length > budget) break
    list = next
  }
  return `${prefix}: ${list}${suffix}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const admin = createAdminClient()
  const { data: cat } = await admin
    .from('categories')
    .select('id, name')
    .eq('slug', category)
    .maybeSingle()
  if (!cat) return { title: 'guides’space' }

  // All approved modalities in this category (decision 6): keyword payload for
  // both the title and the description.
  const { data: mods } = await admin
    .from('modalities')
    .select('name')
    .eq('category_id', cat.id)
    .eq('is_approved', true)
    .order('name')
  const modalityNames = (mods ?? []).map((m) => m.name as string)

  const description = modalityNames.length
    ? `Find and book ${cat.name} practitioners on guides’space, including ${modalityNames.join(', ')}. Virtual and in-person sessions available.`
    : `Find and book ${cat.name} practitioners on guides’space. Virtual and in-person sessions available.`

  return { title: categoryTitle(cat.name, modalityNames), description }
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
    .select('id, name, slug')
    .eq('slug', category)
    .maybeSingle()
  if (!cat) notFound()

  const hero = CATEGORY_HERO[cat.slug]
  // A category row without hero copy/image (e.g. a newly added slug) would crash
  // the render on hero.image/hero.text. 404 instead of throwing a 500 (M10).
  if (!hero) notFound()

  // Decision 6: one targeted query for ALL approved modalities in the category
  // (the JSON-LD keyword payload), alongside the existing practitioner fetch.
  const [{ data: mods }, practitioners] = await Promise.all([
    admin
      .from('modalities')
      .select('name, slug')
      .eq('category_id', cat.id)
      .eq('is_approved', true)
      .order('name'),
    discoverPractitioners({ categorySlug: cat.slug }),
  ])
  const modalities = (mods ?? []).map((m) => ({ name: m.name as string, slug: m.slug as string }))
  const hasPsychedelic = practitioners.some((p) => p.hasPsychedelic)

  const categorySeo = categoryPageJsonLd({
    categoryName: cat.name,
    categorySlug: cat.slug,
    intro: hero.text,
    modalities,
    practitioners: practitioners.map((p) => ({ slug: p.slug, full_name: p.fullName })),
  })
  const breadcrumbSeo = breadcrumbJsonLd([
    { name: 'Explore', url: `${getSiteUrl()}/explore` },
    { name: cat.name, url: `${getSiteUrl()}/explore/${cat.slug}` },
  ])

  return (
    <AppOrPublicShell>
    <main className="min-h-screen bg-bg">
      <JsonLd data={[categorySeo, breadcrumbSeo]} />

      {/* Full-width hero */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] h-[360px] w-screen overflow-hidden">
        <Image
          src={hero.image}
          alt={`${cat.name} practitioners`}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />

        {/* The category lettering is the title now, so the H1 stays as
            screen-reader-only text: it still carries the heading structure and
            the keyword, and it is still the page's first and only H1. Dropping
            it outright would leave the category page with no H1 at all and
            "{Category} Sessions" (an H2) as its first heading. */}
        <h1 className="sr-only">{cat.name}</h1>
        {/* px-3 sm:px-6 matches SiteHeader's own horizontal padding (site-header.tsx),
            so the wordmark lines up with the logo's left edge instead of running
            flush to the hero's full-bleed edges. pt- carries the same value up
            top so the lettering isn't flush against the hero's top edge either. */}
        <div className="absolute inset-x-0 top-0 z-[1] px-3 pt-3 sm:px-6 sm:pt-6">
          <Image
            src={hero.wordmark.src}
            alt={cat.name}
            width={hero.wordmark.width}
            height={hero.wordmark.height}
            priority
            sizes="100vw"
            className="block h-auto w-full"
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1200px] px-6 py-12">
        <p className="mb-10 max-w-[80ch]">{hero.text}</p>

        {hasPsychedelic && (
          <div className="mb-8 border border-border bg-surface px-4 py-3">
            <p className="caption text-dark">{PSYCHEDELIC_DISCLAIMER}</p>
          </div>
        )}

        <h2 className="mb-8">{cat.name} Sessions</h2>

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
    </AppOrPublicShell>
  )
}
