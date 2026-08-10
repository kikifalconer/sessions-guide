/**
 * Fixture detection and indexability.
 *
 * Seed and test practitioner rows stay reachable — the audit needs them as live
 * fixtures for the booking, cancellation, and review paths — but they must not
 * be indexed, must not emit JSON-LD, and must not appear in the sitemap.
 *
 * The explicit slug set is load-bearing, not redundancy. `kiki-falconer-2` is
 * the profile serving "Dev Fixed Virtual Session" and "Seeded for booking flow
 * testing" inside its JSON-LD, and its slug carries no prefix. Prefix matching
 * alone would miss the exact row that gates the homepage relink.
 */

const FIXTURE_PREFIX = 'verify-'

const FIXTURE_SLUGS = new Set<string>([
  'kiki-falconer-2',
  'test-name',
])

export function isFixture(slug: string): boolean {
  return slug.startsWith(FIXTURE_PREFIX) || FIXTURE_SLUGS.has(slug)
}

export function isIndexableProfile(p: {
  slug: string
  is_published: boolean
}): boolean {
  return p.is_published && !isFixture(p.slug)
}

/**
 * Reserved slug segment. Add FIXTURE_PREFIX to the existing reserved-slug guard
 * so no real practitioner can ever claim a slug that silently de-indexes them.
 */
export const RESERVED_SLUG_PREFIX = FIXTURE_PREFIX
