import type { Metadata } from 'next'

/**
 * Single source of truth for page metadata.
 *
 * Every route builds its <head> through buildMetadata(). Callers pass the page
 * concept only — the brand suffix is appended here — so the title format cannot
 * drift route to route.
 *
 * Title rule: one pipe, brand as suffix, lowercase throughout.
 *   {concept} | sessions.guide
 * Never two pipes. Never a dash of any kind.
 */

export const SITE_URL = 'https://sessions.guide'
export const SITE_NAME = 'sessions.guide'
export const TITLE_SEPARATOR = ' | '

/** Titles longer than this get truncated in search results. */
const TITLE_MAX = 60

/** Descriptions outside this range get rewritten or truncated by search engines. */
const DESCRIPTION_MIN = 70
const DESCRIPTION_MAX = 160

export type PageMeta = {
  /** Lowercase, no brand suffix, no pipes, no dashes. e.g. 'browse sessions' */
  concept: string
  description: string
  /** Canonical path with leading slash, no trailing slash. e.g. '/explore' */
  path: string
  /** Absolute or root-relative image path. Omitted from output when absent. */
  ogImage?: string
  /** Emits noindex, nofollow. Use for fixtures, auth-gated routes, thin pages. */
  noindex?: boolean
}

/** Normalises a path to a leading slash and no trailing slash. */
function normalisePath(path: string): string {
  const withLeading = path.startsWith('/') ? path : `/${path}`
  if (withLeading === '/') return '/'
  return withLeading.replace(/\/+$/, '')
}

/**
 * Dev-only format checks. Warns rather than throws so a bad string never breaks
 * a build, but is loud enough to catch in local development.
 */
function validate(meta: PageMeta, title: string): void {
  if (process.env.NODE_ENV !== 'development') return

  const warn = (msg: string) => console.warn(`[metadata] ${meta.path}: ${msg}`)

  if (meta.concept.includes('|')) {
    warn('concept contains a pipe. The separator is added automatically.')
  }
  if (/[-–—]/.test(meta.concept)) {
    warn('concept contains a dash. Dashes are not used in titles.')
  }
  if (meta.concept !== meta.concept.toLowerCase()) {
    warn('concept is not lowercase.')
  }
  if (title.length > TITLE_MAX) {
    warn(`title is ${title.length} chars, over the ${TITLE_MAX} limit.`)
  }
  if (meta.description.length < DESCRIPTION_MIN) {
    warn(`description is ${meta.description.length} chars, under ${DESCRIPTION_MIN}.`)
  }
  if (meta.description.length > DESCRIPTION_MAX) {
    warn(`description is ${meta.description.length} chars, over ${DESCRIPTION_MAX}.`)
  }
}

export function buildMetadata(meta: PageMeta): Metadata {
  const path = normalisePath(meta.path)
  const title = `${meta.concept}${TITLE_SEPARATOR}${SITE_NAME}`
  const canonical = `${SITE_URL}${path === '/' ? '' : path}`

  validate(meta, title)

  const images = meta.ogImage ? [{ url: meta.ogImage }] : undefined

  return {
    title,
    description: meta.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description: meta.description,
      url: canonical,
      siteName: SITE_NAME,
      type: 'website',
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title,
      description: meta.description,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
    ...(meta.noindex
      ? {
          robots: {
            index: false,
            follow: false,
          },
        }
      : {}),
  }
}

/**
 * Organization + WebSite JSON-LD. Emitted once, from the root layout.
 *
 * TODO before this ships — fill the four placeholder values below.
 * They are the fields flagged as missing in the schema audit.
 */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        // TODO: the incorporated Canadian entity name
        legalName: 'TODO_LEGAL_NAME',
        founder: {
          '@type': 'Person',
          // TODO: founder's full name
          name: 'TODO_FOUNDER_NAME',
        },
        address: {
          '@type': 'PostalAddress',
          // TODO: registered address
          addressCountry: 'CA',
          addressLocality: 'TODO_CITY',
          addressRegion: 'TODO_REGION',
        },
        // TODO: live social profiles only. Delete this key entirely if there
        // are none — an empty or stale array is worse than an absent one.
        sameAs: [],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }
}
