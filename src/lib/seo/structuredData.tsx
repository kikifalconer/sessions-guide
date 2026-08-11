// src/lib/seo/structuredData.tsx
// JSON-LD builders for sessions.guide. Server-side only (no client imports).
// Every builder returns a plain object; render via <JsonLd data={...} /> below.
//
// Schema references: schema.org Person, Service, Offer, AggregateRating,
// CollectionPage, ItemList, BreadcrumbList, WebSite, Organization.

import { getSiteUrl } from '@/lib/siteUrl'

const SITE_NAME = 'sessions.guide'

// ---------- shared types (mirror schema.md, minimal fields only) ----------

export type PractitionerSeo = {
  slug: string
  full_name: string
  bio: string | null
  tagline: string | null
  photo_url: string | null
  // External profile URLs (the practitioner link_1/2/3 slots), for sameAs. The
  // profile stores generic link slots, not named website/instagram/youtube
  // columns (schema.md, 0002 migration), so this is a flat list.
  links: string[]
}

export type ModalitySeo = { name: string; slug: string }

export type SessionTypeSeo = {
  name: string
  description: string | null
  duration_minutes: number
  pricing_model: 'fixed' | 'sliding_scale' | 'donation' | 'inquire'
  price: number | null
  price_min: number | null
  price_max: number | null
  format: 'virtual' | 'in_person' | 'both'
}

export type RatingSeo = { average: number; count: number } // published reviews only

// ---------- site-wide (inject once in root layout) ----------

export function organizationJsonLd() {
  const SITE_URL = getSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    legalName: 'Sessions Guide Inc.',
    url: SITE_URL,
    description:
      'A marketplace for booking sessions with transformational wellness practitioners across every modality, from reiki and astrology to breathwork, doula support, and psychedelic facilitation.',
    founder: {
      '@type': 'Person',
      name: 'Kiki Falconer',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Vancouver',
      addressRegion: 'BC',
      addressCountry: 'CA',
    },
    sameAs: ['https://www.instagram.com/sessionsguide'],
  }
}

export function webSiteJsonLd() {
  const SITE_URL = getSiteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
    // No SearchAction: /search is filter-only (modality/city/in_person), with no
    // free-text query param, so advertising a text search would be false.
  }
}

// ---------- practitioner profile page ----------

export function practitionerJsonLd(opts: {
  practitioner: PractitionerSeo
  modalities: ModalitySeo[] // primary first
  cities: string[] // derived from active blocks, city labels only (pre-booking privacy rule)
  sessionTypes: SessionTypeSeo[]
  rating: RatingSeo | null
}) {
  const SITE_URL = getSiteUrl()
  const { practitioner: p, modalities, cities, sessionTypes, rating } = opts
  const url = `${SITE_URL}/${p.slug}`
  const sameAs = p.links.filter(Boolean)

  const services = sessionTypes.map((st) => ({
    '@type': 'Service',
    name: st.name,
    ...(st.description ? { description: st.description } : {}),
    serviceType: modalities[0]?.name,
    provider: { '@id': `${url}/#practitioner` },
    ...(st.format !== 'in_person'
      ? { availableChannel: { '@type': 'ServiceChannel', serviceUrl: url } }
      : {}),
    ...offerForSessionType(st),
  }))

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${url}/#practitioner`,
    name: p.full_name,
    url,
    ...(p.tagline ? { jobTitle: p.tagline } : {}),
    ...(p.bio ? { description: p.bio } : {}),
    ...(p.photo_url ? { image: p.photo_url } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    knowsAbout: modalities.map((m) => m.name),
    // City-only, matching the pre-booking display rule. Never full addresses.
    ...(cities.length
      ? { workLocation: cities.map((c) => ({ '@type': 'Place', name: c })) }
      : {}),
    makesOffer: services.map((s) => ({ '@type': 'Offer', itemOffered: s })),
    ...(rating && rating.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(rating.average.toFixed(2)),
            reviewCount: rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  }
}

function offerForSessionType(st: SessionTypeSeo) {
  if (st.pricing_model === 'fixed' && st.price != null) {
    return { offers: { '@type': 'Offer', price: st.price, priceCurrency: 'USD' } }
  }
  if (st.pricing_model === 'sliding_scale' && st.price_min != null && st.price_max != null) {
    return {
      offers: {
        '@type': 'Offer',
        priceSpecification: {
          '@type': 'PriceSpecification',
          minPrice: st.price_min,
          maxPrice: st.price_max,
          priceCurrency: 'USD',
        },
      },
    }
  }
  return {} // donation / inquire: omit price entirely rather than fake a zero
}

// ---------- category page (/explore/[category]) ----------

export function categoryPageJsonLd(opts: {
  categoryName: string
  categorySlug: string
  intro: string // the B3 descriptor line
  modalities: ModalitySeo[] // all modalities in this category — this is the keyword payload
  practitioners: { slug: string; full_name: string }[]
}) {
  const SITE_URL = getSiteUrl()
  const url = `${SITE_URL}/explore/${opts.categorySlug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': url,
    name: `${opts.categoryName} practitioners`,
    url,
    description: opts.intro,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    // Modality names as keywords: this is how "reiki" attaches to the energy-healing page.
    keywords: opts.modalities.map((m) => m.name).join(', '),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: opts.practitioners.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/${p.slug}`,
        name: p.full_name,
      })),
    },
  }
}

// ---------- city page (/in/[city]) ----------

export function cityPageJsonLd(opts: {
  cityName: string
  citySlug: string
  practitioners: { slug: string; full_name: string }[]
}) {
  const SITE_URL = getSiteUrl()
  const url = `${SITE_URL}/in/${opts.citySlug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': url,
    name: `Wellness and healing practitioners in ${opts.cityName}`,
    url,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@type': 'Place', name: opts.cityName },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: opts.practitioners.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/${p.slug}`,
        name: p.full_name,
      })),
    },
  }
}

// ---------- editorial guide page (/guides/[slug]) ----------

export function articleJsonLd(opts: {
  title: string
  slug: string
  description: string | null
  image: string | null
}) {
  const SITE_URL = getSiteUrl()
  const url = `${SITE_URL}/guides/${opts.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': url,
    headline: opts.title,
    url,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.image ? { image: opts.image } : {}),
    isPartOf: { '@id': `${SITE_URL}/#website` },
    publisher: { '@id': `${SITE_URL}/#organization` },
  }
}

// ---------- sage page (/sages/[slug]) ----------

export function sagePageJsonLd(opts: {
  title: string
  slug: string
  description: string | null
  image: string | null
  sageName: string
}) {
  const SITE_URL = getSiteUrl()
  const url = `${SITE_URL}/sages/${opts.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': url,
    url,
    name: opts.title,
    ...(opts.description ? { description: opts.description } : {}),
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: {
      '@type': 'Person',
      name: opts.sageName,
      ...(opts.image ? { image: opts.image } : {}),
    },
  }
}

// ---------- breadcrumbs (e.g. Readings › Astrology) ----------

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  }
}

// ---------- renderer ----------

export function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data]
  return (
    <script
      type="application/ld+json"
      // JSON-LD must be raw JSON in a script tag; this is the standard Next.js pattern.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload).replace(/</g, '\\u003c') }}
    />
  )
}
