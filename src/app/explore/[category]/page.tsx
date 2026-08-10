import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { discoverPractitioners } from '@/lib/discovery'
import PractitionerCard from '@/components/PractitionerCard'
import SiteHeader from '@/components/site-header'
import { getSiteUrl } from '@/lib/siteUrl'
import { JsonLd, categoryPageJsonLd, breadcrumbJsonLd } from '@/lib/seo/structuredData'

const CATEGORY_HERO: Record<string, { image: string; text: string }> = {
  'energy-healing': {
    image: '/images/categories/frequency.jpg',
    text: 'Work with the subtle body and the energy that moves through it. Reiki, sound healing, pranic healing, and the practices that shift what you cannot see but can absolutely feel. These modalities work with the body’s energetic field to release what is stuck and restore flow. Practitioners here come from many lineages and traditions, each bringing their own approach to the same essential work.',
  },
  'journeys': {
    image: '/images/categories/Journeys.jpg',
    text: 'For those ready to go inward and meet whatever is waiting there. Plant medicine, breathwork, psychedelic facilitation, and guided passage into the deeper layers of the self. These are not casual experiences. They ask for preparation, intention, and the right person holding space alongside you. The practitioners in this category are experienced guides who understand the terrain and how to move through it safely.',
  },
  'readings': {
    image: '/images/categories/readings.jpg',
    text: 'The map was always there, and these are the people who know how to read it. Astrology, tarot, human design, numerology, akashic records, and more. A good reading does not tell you what to do. It reflects something back, names a pattern you half-sensed, and gives you language for the moment you are in. Find someone whose practice resonates and whose insight you can actually use.',
  },
  'ancient-healing-arts': {
    image: '/images/categories/AncientHealingArts.jpg',
    text: 'Medicine that has been trusted and refined across centuries and cultures. Acupuncture, ayurveda, traditional Chinese medicine, cupping, and herbalism. These traditions understand the body as a whole system rather than a collection of symptoms. The practitioners here have trained deeply in their craft, often over many years, and bring both technical skill and a way of seeing that modern medicine often misses.',
  },
  'consciousness': {
    image: '/images/categories/consciousness.jpg',
    text: 'Meet your own mind differently and learn what lives beneath the surface of it. Meditation, hypnotherapy, past life regression, dream work, and shamanic healing. These practices work with awareness itself, with the states we pass through and rarely stop to examine. The work can be subtle or profound. Find a practitioner who can guide you into the deeper states and back again with care.',
  },
  'embodied': {
    image: '/images/categories/embodied.jpg',
    text: 'The body keeps the score, and it also holds the way through. Somatic therapy, massage, bodywork, dance movement therapy, and yoga therapy. So much of what we carry lives in tissue and breath rather than thought. These practitioners work directly with the body to release held tension, restore safety, and reconnect you to a fuller sense of being present in your own skin.',
  },
  'natural-beauty': {
    image: '/images/categories/natural-beauty.jpg',
    text: 'Care that begins beneath the surface and works its way out. Holistic facials, gua sha, facial acupuncture, scalp care, and natural aesthetics. This is beauty understood as health rather than performance, ritual rather than routine. The practitioners here treat the skin and the face as part of the whole, using techniques that nourish and restore rather than simply cover or correct.',
  },
  'family': {
    image: '/images/categories/family.jpg',
    text: 'Held through the thresholds that change everything. Doulas, birth preparation, postpartum support, fertility support, and infant massage. These are some of the most tender and demanding passages a person moves through. The practitioners in this category specialize in holding families through them, offering steady presence and real expertise at exactly the moments when both matter most.',
  },
  'creativity': {
    image: '/images/categories/creativity.jpg',
    text: 'Make something true, and let the making change you. Art therapy, expressive arts, writing, music therapy, and creative practice as a path. Creativity here is not about producing or performing. It is a way into parts of yourself that words alone cannot reach. These practitioners use creative process as a form of healing, helping you express, release, and discover through the act of making.',
  },
  'intimate': {
    image: '/images/categories/intimate.jpg',
    text: 'Tender, honest work in the places most people avoid. Sexuality coaching, tantra, relationship coaching, and somatic sex therapy. These practitioners hold space for the conversations and the growth that intimacy asks of us. The work is done with care, consent, and deep respect for where you are. Find someone whose approach feels safe and whose presence you can trust with this.',
  },
  'coaching': {
    image: '/images/categories/coaching.jpg',
    text: 'A steady hand for whatever the next chapter asks of you. Life coaching, spiritual coaching, business coaching, nutrition coaching, and therapy. Sometimes you do not need a whole modality. You need a person who can see clearly, ask the right questions, and walk alongside you while you figure out the way forward. The practitioners here bring focus, accountability, and genuine care to that work.',
  },
  'ceremony': {
    image: '/images/categories/ceremony.jpg',
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
        <Image src={hero.image} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-[1] flex h-full items-center justify-center px-6 text-center">
          <h1 style={{ color: 'var(--color-light)' }}>{cat.name}</h1>
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
  )
}
