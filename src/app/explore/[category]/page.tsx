import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { discoverPractitioners } from '@/lib/discovery'
import PractitionerCard from '@/components/PractitionerCard'
import SiteHeader from '@/components/site-header'
import { getSiteUrl } from '@/lib/siteUrl'
import { JsonLd, categoryPageJsonLd, breadcrumbJsonLd } from '@/lib/seo/structuredData'

// `wordmark` is the cream lettering rendered over the hero photograph in place
// of a visible H1 (the H1 survives as sr-only text). Files live in
// /public/categories and are named for the category with spaces rather than
// hyphens ('ancient healing arts.png'), so the paths below are percent-encoded.
// Intrinsic dimensions are carried explicitly so next/image can reserve the
// right box and the lettering never causes layout shift; they differ per file
// because each is the word set at a fixed cap height.
const CATEGORY_HERO: Record<
  string,
  { image: string; text: string; wordmark: { src: string; width: number; height: number } }
> = {
  'energy-healing': {
    image: '/images/categories/frequency.jpg',
    wordmark: { src: '/categories/energy%20healing.png', width: 7597, height: 888 },
    text: 'Work with the subtle body and the energy that moves through it. Reiki, sound healing, pranic healing, and the practices that shift what you cannot see but can absolutely feel. These modalities work with the body’s energetic field to release what is stuck and restore flow. Practitioners here come from many lineages and traditions, each bringing their own approach to the same essential work.',
  },
  'journeys': {
    image: '/images/categories/Journeys.jpg',
    wordmark: { src: '/categories/journeys.png', width: 4503, height: 888 },
    text: 'For those ready to go inward and meet whatever is waiting there. Plant medicine, breathwork, psychedelic facilitation, and guided passage into the deeper layers of the self. These are not casual experiences. They ask for preparation, intention, and the right person holding space alongside you. The practitioners in this category are experienced guides who understand the terrain and how to move through it safely.',
  },
  'readings': {
    image: '/images/categories/readings.jpg',
    wordmark: { src: '/categories/readings.png', width: 4201, height: 888 },
    text: 'The map was always there, and these are the people who know how to read it. Astrology, tarot, human design, numerology, akashic records, and more. A good reading does not tell you what to do. It reflects something back, names a pattern you half-sensed, and gives you language for the moment you are in. Find someone whose practice resonates and whose insight you can actually use.',
  },
  'ancient-healing-arts': {
    image: '/images/categories/AncientHealingArts.jpg',
    wordmark: { src: '/categories/ancient%20healing%20arts.png', width: 10073, height: 888 },
    text: 'Medicine that has been trusted and refined across centuries and cultures. Acupuncture, ayurveda, traditional Chinese medicine, cupping, and herbalism. These traditions understand the body as a whole system rather than a collection of symptoms. The practitioners here have trained deeply in their craft, often over many years, and bring both technical skill and a way of seeing that modern medicine often misses.',
  },
  'consciousness': {
    image: '/images/categories/consciousness.jpg',
    wordmark: { src: '/categories/consciousness.png', width: 7472, height: 889 },
    text: 'Meet your own mind differently and learn what lives beneath the surface of it. Meditation, hypnotherapy, past life regression, dream work, and shamanic healing. These practices work with awareness itself, with the states we pass through and rarely stop to examine. The work can be subtle or profound. Find a practitioner who can guide you into the deeper states and back again with care.',
  },
  'embodied': {
    image: '/images/categories/embodied.jpg',
    wordmark: { src: '/categories/embodied.png', width: 4952, height: 889 },
    text: 'The body keeps the score, and it also holds the way through. Somatic therapy, massage, bodywork, dance movement therapy, and yoga therapy. So much of what we carry lives in tissue and breath rather than thought. These practitioners work directly with the body to release held tension, restore safety, and reconnect you to a fuller sense of being present in your own skin.',
  },
  'natural-beauty': {
    image: '/images/categories/natural-beauty.jpg',
    wordmark: { src: '/categories/natural%20beauty.png', width: 7365, height: 872 },
    text: 'Care that begins beneath the surface and works its way out. Holistic facials, gua sha, facial acupuncture, scalp care, and natural aesthetics. This is beauty understood as health rather than performance, ritual rather than routine. The practitioners here treat the skin and the face as part of the whole, using techniques that nourish and restore rather than simply cover or correct.',
  },
  'family': {
    image: '/images/categories/family.jpg',
    wordmark: { src: '/categories/family.png', width: 3141, height: 856 },
    text: 'Held through the thresholds that change everything. Doulas, birth preparation, postpartum support, fertility support, and infant massage. These are some of the most tender and demanding passages a person moves through. The practitioners in this category specialize in holding families through them, offering steady presence and real expertise at exactly the moments when both matter most.',
  },
  'creativity': {
    image: '/images/categories/creativity.jpg',
    wordmark: { src: '/categories/creativity.png', width: 4830, height: 888 },
    text: 'Make something true, and let the making change you. Art therapy, expressive arts, writing, music therapy, and creative practice as a path. Creativity here is not about producing or performing. It is a way into parts of yourself that words alone cannot reach. These practitioners use creative process as a form of healing, helping you express, release, and discover through the act of making.',
  },
  'intimate': {
    image: '/images/categories/intimate.jpg',
    wordmark: { src: '/categories/intimate.png', width: 4061, height: 856 },
    text: 'Tender, honest work in the places most people avoid. Sexuality coaching, tantra, relationship coaching, and somatic sex therapy. These practitioners hold space for the conversations and the growth that intimacy asks of us. The work is done with care, consent, and deep respect for where you are. Find someone whose approach feels safe and whose presence you can trust with this.',
  },
  'coaching': {
    image: '/images/categories/coaching.jpg',
    wordmark: { src: '/categories/coaching.png', width: 5451, height: 889 },
    text: 'A steady hand for whatever the next chapter asks of you. Life coaching, spiritual coaching, business coaching, nutrition coaching, and therapy. Sometimes you do not need a whole modality. You need a person who can see clearly, ask the right questions, and walk alongside you while you figure out the way forward. The practitioners here bring focus, accountability, and genuine care to that work.',
  },
  'ceremony': {
    image: '/images/categories/ceremony.jpg',
    wordmark: { src: '/categories/ceremony.png', width: 5699, height: 889 },
    text: 'Mark what matters with intention and the right people present. Cacao ceremony, grief rituals, rites of passage, wedding ceremony, and death doula work. Ceremony gives shape to the moments that deserve more than to simply pass unmarked. These practitioners hold sacred space for transition and gathering, bringing structure and reverence to the thresholds that ask to be honored.',
  },
}

const PSYCHEDELIC_DISCLAIMER =
  'Psychedelic journey facilitation may be subject to local laws and regulations. Practitioners and clients are solely responsible for ensuring compliance with the laws of their jurisdiction.'

// Title: "{Category} Practitioners - {as many modalities as fit ~60 chars} |
// sessions.guide". No em dashes; the modality list is comma-separated and the
// full list lives in the description. Falls back cleanly when no modalities fit.
function categoryTitle(categoryName: string, modalityNames: string[]): string {
  const suffix = ' | sessions.guide'
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
  if (!cat) return { title: 'sessions.guide' }

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
    ? `Find and book ${cat.name} practitioners on sessions.guide, including ${modalityNames.join(', ')}. Virtual and in-person sessions available.`
    : `Find and book ${cat.name} practitioners on sessions.guide. Virtual and in-person sessions available.`

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
    <main className="min-h-screen bg-bg">
      <JsonLd data={[categorySeo, breadcrumbSeo]} />
      <SiteHeader />

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
        <Image
          src={hero.wordmark.src}
          alt={cat.name}
          width={hero.wordmark.width}
          height={hero.wordmark.height}
          priority
          sizes="100vw"
          className="absolute inset-x-0 top-0 z-[1] block h-auto w-full"
        />
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
  )
}
