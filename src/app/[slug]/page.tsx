import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SiteHeader from '@/components/site-header'
import ProfileHero from './ProfileHero'
import InfoStrip, { type ProfileLink } from './InfoStrip'
import AboutSection from './AboutSection'
import SessionsSection, { type SessionCard } from './SessionsSection'
import { detectPlatform } from '@/lib/links'
import { JsonLd, practitionerJsonLd, type SessionTypeSeo } from '@/lib/seo/structuredData'

const PSYCHEDELIC_DISCLAIMER =
  'Psychedelic journey facilitation may be subject to local laws and regulations. Practitioners and clients are solely responsible for ensuring compliance with the laws of their jurisdiction.'

type ProfileRow = {
  id: string
  full_name: string
  slug: string
  bio: string | null
  tagline: string | null
  photo_url: string | null
  banner_url: string | null
  link_1: string | null
  link_2: string | null
  link_3: string | null
  is_published: boolean
  subscription_tier: string | null
  practitioner_modalities: {
    is_primary: boolean
    modalities: {
      name: string
      slug: string
      categories: { name: string } | null
    } | null
  }[]
  availability_blocks: {
    format: string
    location_display: string | null
  }[]
  session_types: {
    id: string
    name: string
    description: string | null
    duration_minutes: number
    photo_url: string | null
    sort_order: number
    pricing_model: string
    price: number | null
    price_min: number | null
    price_max: number | null
    format: string
    modalities: { slug: string } | null
  }[]
  reviews: { rating: number }[]
}

// One server-side pass: practitioner row plus every embedded relation,
// with filters applied on the embedded resources.
async function fetchProfile(slug: string): Promise<ProfileRow | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('practitioners')
    .select(
      `id, full_name, slug, bio, tagline, photo_url, banner_url,
       link_1, link_2, link_3, is_published, subscription_tier,
       practitioner_modalities ( is_primary, modalities ( name, slug, categories ( name ) ) ),
       availability_blocks ( format, location_display ),
       session_types ( id, name, description, duration_minutes, photo_url, sort_order, pricing_model, price, price_min, price_max, format, modalities ( slug ) ),
       reviews ( rating )`
    )
    .eq('slug', slug)
    .eq('availability_blocks.is_active', true)
    .eq('session_types.is_active', true)
    .eq('reviews.is_published', true)
    .maybeSingle()

  return (data as ProfileRow | null) ?? null
}

// City names only before booking. location_display granularity is chosen
// by the practitioner; the segment before the first comma is the most
// specific public-safe label we show.
function cityLabel(display: string | null): string | null {
  if (!display) return null
  const city = display.split(',')[0]?.trim()
  return city || null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const profile = await fetchProfile(slug)
  // Never leak an unpublished practitioner's name/tagline via metadata: the page
  // body 404s for non-owners, so the <head> must not identify them either (H2).
  if (!profile || !profile.is_published) return { title: 'sessions.guide' }
  const primaryModality = [...profile.practitioner_modalities]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))[0]?.modalities?.name
  // Description: tagline, falling back to a truncated bio (no em dashes here).
  const description =
    profile.tagline ?? (profile.bio ? `${profile.bio.slice(0, 155).trimEnd()}` : undefined)
  return {
    title: primaryModality
      ? `${profile.full_name} - ${primaryModality} | sessions.guide`
      : `${profile.full_name} | sessions.guide`,
    description,
  }
}

export default async function PractitionerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const profile = await fetchProfile(slug)
  if (!profile) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isOwner = user?.id === profile.id
  if (!profile.is_published && !isOwner) notFound()

  const sortedModalities = [...profile.practitioner_modalities].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary)
  )
  const modalityNames = sortedModalities
    .map((pm) => pm.modalities?.name)
    .filter((name): name is string => Boolean(name))
  // Disclaimer is required when the slug appears on the profile's modalities
  // OR on any active session type (categories-modalities.md: "session type or
  // profile"). session_types is already filtered to is_active = true.
  const hasPsychedelicFacilitation =
    sortedModalities.some(
      (pm) => pm.modalities?.slug === 'psychedelic-facilitation'
    ) ||
    profile.session_types.some(
      (st) => st.modalities?.slug === 'psychedelic-facilitation'
    )

  const locations: string[] = []
  for (const block of profile.availability_blocks) {
    const label =
      block.format === 'virtual' ? 'Virtual' : cityLabel(block.location_display)
    if (label && !locations.includes(label)) locations.push(label)
  }

  const links: ProfileLink[] = [profile.link_1, profile.link_2, profile.link_3]
    .filter((url): url is string => Boolean(url))
    .map((url) => ({ label: detectPlatform(url), href: url }))

  const ratings = profile.reviews.map((r) => r.rating)
  const ratingCount = ratings.length
  const ratingAverage =
    ratingCount > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratingCount
      : null

  // Free-tier public display cap (D26): a 'free' practitioner shows only their
  // first active session type by sort_order on the PUBLIC profile. Read-side
  // only — no session_type row is mutated or deleted; the dashboard still shows
  // every session type. Grandfathered practitioners are 'elevated', so their
  // profiles are unaffected.
  const sortedSessionTypes = [...profile.session_types].sort(
    (a, b) => a.sort_order - b.sort_order
  )
  const visibleSessionTypes =
    (profile.subscription_tier ?? 'free') === 'free'
      ? sortedSessionTypes.slice(0, 1)
      : sortedSessionTypes

  const sessions: SessionCard[] = visibleSessionTypes
    .map((st) => ({
      id: st.id,
      name: st.name,
      description: st.description,
      durationMinutes: st.duration_minutes,
      photoUrl: st.photo_url,
      isInquire: st.pricing_model === 'inquire',
    }))

  // JSON-LD reuses the data already loaded above. It reflects exactly what the
  // public page shows: the capped visible session types (D26) in makesOffer,
  // city-only locations (never full addresses), aggregateRating only when there
  // are published reviews. Rendered only for published profiles (owner preview
  // of an unpublished profile must not emit structured data).
  const seoModalities = sortedModalities
    .map((pm) => pm.modalities)
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map((m) => ({ name: m.name, slug: m.slug }))
  const practitionerSeo = practitionerJsonLd({
    practitioner: {
      slug: profile.slug,
      full_name: profile.full_name,
      bio: profile.bio,
      tagline: profile.tagline,
      photo_url: profile.photo_url,
      links: [profile.link_1, profile.link_2, profile.link_3].filter(
        (u): u is string => Boolean(u)
      ),
    },
    modalities: seoModalities,
    cities: locations.filter((c) => c !== 'Virtual'),
    sessionTypes: visibleSessionTypes.map((st) => ({
      name: st.name,
      description: st.description,
      duration_minutes: st.duration_minutes,
      pricing_model: st.pricing_model as SessionTypeSeo['pricing_model'],
      price: st.price,
      price_min: st.price_min,
      price_max: st.price_max,
      format: st.format as SessionTypeSeo['format'],
    })),
    rating:
      ratingCount > 0 && ratingAverage != null
        ? { average: ratingAverage, count: ratingCount }
        : null,
  })

  return (
    <main className="min-h-screen bg-bg">
      {profile.is_published && <JsonLd data={practitionerSeo} />}
      {!profile.is_published && isOwner && (
        <div className="bg-olive px-6 py-3 text-center">
          <p className="caption text-light">
            PREVIEW MODE. ONLY YOU CAN SEE THIS PAGE UNTIL YOU PUBLISH.
          </p>
        </div>
      )}

      <SiteHeader centerLabel={profile.full_name} />

      <ProfileHero
        name={profile.full_name}
        tagline={profile.tagline}
        bannerUrl={profile.banner_url}
      />

      <InfoStrip
        modalityNames={modalityNames}
        locations={locations}
        links={links}
        ratingAverage={ratingAverage}
        ratingCount={ratingCount}
        practitionerSlug={profile.slug}
      />

      <AboutSection bio={profile.bio} photoUrl={profile.photo_url} practitionerSlug={profile.slug} />

      <SessionsSection
        practitionerName={profile.full_name}
        practitionerSlug={profile.slug}
        sessions={sessions}
        disclaimer={hasPsychedelicFacilitation ? PSYCHEDELIC_DISCLAIMER : null}
      />
    </main>
  )
}
