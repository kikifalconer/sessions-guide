import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/slug'

// Shared discovery query — the single spine behind category (now) and city +
// search (later). Uses the service-role client (RLS is service-role-only here),
// which means THIS MODULE IS THE PUBLIC GATE: the published/active filters below
// are SECURITY properties, not display niceties. A missing filter would leak
// unpublished practitioners / unpublished reviews / inactive blocks. Only
// public-safe columns are selected; full location_display never reaches a card
// (city-only per A6).

export type PractitionerCardData = {
  id: string
  slug: string
  fullName: string
  photoUrl: string | null
  primaryModalityName: string | null
  primaryModalitySlug: string | null
  cityLabel: string | null // city-only, or 'Virtual', or null when no active blocks
  avgRating: number | null
  reviewCount: number
  hasPsychedelic: boolean // any modality slug === 'psychedelic-facilitation'
}

export type DiscoveryFilter = {
  categorySlug?: string
  // Reserved for city/search reuse (search will set these). The city route uses
  // discoverInCity below, which resolves a center from the city slug itself.
  center?: { lat: number; lng: number }
  radiusMeters?: number
  inPersonOnly?: boolean
}

// City radius for derive-on-the-fly discovery (TD4: revisit with a cities table
// + PostGIS at scale). Named so it stays tunable, not a magic number.
const CITY_RADIUS_KM = 50

// City-only label: the segment before the first comma is the most specific
// public-safe label (matches the profile page rule). Never returns the full
// location_display.
function cityLabel(display: string | null): string | null {
  if (!display) return null
  return display.split(',')[0]?.trim() || null
}

type Admin = ReturnType<typeof createAdminClient>

// Resolve the candidate practitioner-id set for a filter. Category: any modality
// in that category (primary or secondary). City/search will add their own
// resolvers here and share hydrateCards below.
async function resolvePractitionerIds(admin: Admin, filter: DiscoveryFilter): Promise<string[]> {
  if (filter.categorySlug) {
    const { data: category } = await admin
      .from('categories')
      .select('id')
      .eq('slug', filter.categorySlug)
      .maybeSingle()
    if (!category) return []

    const { data: mods } = await admin
      .from('modalities')
      .select('id')
      .eq('category_id', category.id)
    const modalityIds = (mods ?? []).map((m) => m.id as string)
    if (modalityIds.length === 0) return []

    const { data: pm } = await admin
      .from('practitioner_modalities')
      .select('practitioner_id')
      .in('modality_id', modalityIds)
    return [...new Set((pm ?? []).map((r) => r.practitioner_id as string))]
  }

  // No filter: all published practitioners (the security filter is applied in
  // hydrateCards too, but keep this read published-only as well).
  const { data } = await admin.from('practitioners').select('id').eq('is_published', true)
  return (data ?? []).map((p) => p.id as string)
}

// Builds card data for a set of practitioner ids. SECURITY: published-only,
// active-only, public columns only. Batched (no N+1).
async function hydrateCards(admin: Admin, ids: string[]): Promise<PractitionerCardData[]> {
  // Published practitioners only — public-safe columns.
  const { data: rows } = await admin
    .from('practitioners')
    .select('id, slug, full_name, photo_url')
    .in('id', ids)
    .eq('is_published', true)
  const practitioners = rows ?? []
  if (practitioners.length === 0) return []
  const pubIds = practitioners.map((p) => p.id as string)

  // Modalities per practitioner: primary (for the card label) + every slug (for
  // the psychedelic check).
  const { data: pmRows } = await admin
    .from('practitioner_modalities')
    .select('practitioner_id, is_primary, modalities ( name, slug )')
    .in('practitioner_id', pubIds)

  // Ratings: published reviews only, one batched query, aggregated in JS (D14).
  const { data: reviewRows } = await admin
    .from('reviews')
    .select('practitioner_id, rating')
    .eq('is_published', true)
    .in('practitioner_id', pubIds)

  // Locations: active blocks only; city-only label derived below.
  const { data: blockRows } = await admin
    .from('availability_blocks')
    .select('practitioner_id, format, location_display')
    .in('practitioner_id', pubIds)
    .eq('is_active', true)

  // --- aggregate ---
  const modByP = new Map<string, { name: string; slug: string; isPrimary: boolean }[]>()
  for (const r of pmRows ?? []) {
    const m = r.modalities as unknown as { name: string; slug: string } | null
    if (!m) continue
    const list = modByP.get(r.practitioner_id as string) ?? []
    list.push({ name: m.name, slug: m.slug, isPrimary: Boolean(r.is_primary) })
    modByP.set(r.practitioner_id as string, list)
  }

  const ratingByP = new Map<string, { sum: number; count: number }>()
  for (const r of reviewRows ?? []) {
    const e = ratingByP.get(r.practitioner_id as string) ?? { sum: 0, count: 0 }
    e.sum += r.rating as number
    e.count += 1
    ratingByP.set(r.practitioner_id as string, e)
  }

  const blocksByP = new Map<string, { format: string; location_display: string | null }[]>()
  for (const b of blockRows ?? []) {
    const list = blocksByP.get(b.practitioner_id as string) ?? []
    list.push({ format: b.format as string, location_display: b.location_display as string | null })
    blocksByP.set(b.practitioner_id as string, list)
  }

  const deriveCity = (pid: string): string | null => {
    const blocks = blocksByP.get(pid) ?? []
    const inPersonCities = blocks
      .filter((b) => b.format !== 'virtual')
      .map((b) => cityLabel(b.location_display))
      .filter((c): c is string => Boolean(c))
    if (inPersonCities.length > 0) return inPersonCities[0]
    return blocks.some((b) => b.format === 'virtual') ? 'Virtual' : null
  }

  return practitioners.map((p) => {
    const pid = p.id as string
    const mods = modByP.get(pid) ?? []
    const primary = mods.find((m) => m.isPrimary) ?? mods[0] ?? null
    const rating = ratingByP.get(pid)
    return {
      id: pid,
      slug: p.slug as string,
      fullName: p.full_name as string,
      photoUrl: (p.photo_url as string | null) ?? null,
      primaryModalityName: primary?.name ?? null,
      primaryModalitySlug: primary?.slug ?? null,
      cityLabel: deriveCity(pid),
      avgRating: rating ? Math.round((rating.sum / rating.count) * 10) / 10 : null,
      reviewCount: rating?.count ?? 0,
      hasPsychedelic: mods.some((m) => m.slug === 'psychedelic-facilitation'),
    }
  })
}

function rankCards(cards: PractitionerCardData[]): PractitionerCardData[] {
  // Stable, calm ordering: rated practitioners first (by rating), then by name.
  return [...cards].sort((a, b) => {
    if ((b.avgRating ?? -1) !== (a.avgRating ?? -1)) return (b.avgRating ?? -1) - (a.avgRating ?? -1)
    return a.fullName.localeCompare(b.fullName)
  })
}

export async function discoverPractitioners(
  filter: DiscoveryFilter
): Promise<PractitionerCardData[]> {
  const admin = createAdminClient()
  const ids = await resolvePractitionerIds(admin, filter)
  if (ids.length === 0) return []
  return rankCards(await hydrateCards(admin, ids))
}

// --- Geo helpers (derive-on-the-fly, haversine; TD4) ---------------------
// Extracted from the old resolveCity so BOTH the city route and search call ONE
// radius/union impl (deriveCityCenter + resolveByCenter). Behavior-preserving.

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

async function publishedPractitionerIds(admin: Admin): Promise<string[]> {
  const { data } = await admin.from('practitioners').select('id').eq('is_published', true)
  return (data ?? []).map((p) => p.id as string)
}

type GeoBlock = { practitionerId: string; lat: number; lng: number; city: string }

// PUBLISHED active in-person/both blocks with usable coords + city label (TD3).
async function loadInPersonBlocks(admin: Admin, pubIds: string[]): Promise<GeoBlock[]> {
  if (pubIds.length === 0) return []
  const { data } = await admin
    .from('availability_blocks')
    .select('practitioner_id, location_display, location_lat, location_lng')
    .in('practitioner_id', pubIds)
    .eq('is_active', true)
    .in('format', ['in_person', 'both'])
  return (data ?? [])
    .map((b) => ({
      practitionerId: b.practitioner_id as string,
      lat: b.location_lat as number | null,
      lng: b.location_lng as number | null,
      city: cityLabel(b.location_display as string | null),
    }))
    .filter((b): b is GeoBlock => b.lat !== null && b.lng !== null && b.city !== null)
}

// Published practitioners offering virtual (format 'virtual' or 'both') — they
// surface everywhere (D15), regardless of distance.
async function virtualPractitionerIds(admin: Admin, pubIds: string[]): Promise<string[]> {
  if (pubIds.length === 0) return []
  const { data } = await admin
    .from('availability_blocks')
    .select('practitioner_id')
    .in('practitioner_id', pubIds)
    .eq('is_active', true)
    .in('format', ['virtual', 'both'])
  return [...new Set((data ?? []).map((r) => r.practitioner_id as string))]
}

// Published practitioners with an active block that can host a given format.
async function inPersonAnywhereIds(admin: Admin, pubIds: string[]): Promise<string[]> {
  const blocks = await loadInPersonBlocks(admin, pubIds)
  return [...new Set(blocks.map((b) => b.practitionerId))]
}

// City slug -> center (centroid of the blocks whose city slugifies to it) +
// display label. null when no block defines the city.
async function deriveCityCenter(
  admin: Admin,
  citySlug: string,
  pubIds: string[]
): Promise<{ center: { lat: number; lng: number }; displayCity: string } | null> {
  const blocks = await loadInPersonBlocks(admin, pubIds)
  const cityBlocks = blocks.filter((b) => slugify(b.city) === citySlug)
  if (cityBlocks.length === 0) return null
  return {
    center: {
      lat: cityBlocks.reduce((s, b) => s + b.lat, 0) / cityBlocks.length,
      lng: cityBlocks.reduce((s, b) => s + b.lng, 0) / cityBlocks.length,
    },
    displayCity: cityBlocks[0].city,
  }
}

// Radius (bbox prefilter + haversine) over published in-person blocks, UNION
// virtual unless inPersonOnly (D15). Shared by city + search. Returns ids and a
// per-practitioner nearest matched city.
async function resolveByCenter(
  admin: Admin,
  center: { lat: number; lng: number },
  inPersonOnly: boolean,
  pubIds: string[]
): Promise<{ ids: string[]; matchedCity: Map<string, string> }> {
  const blocks = await loadInPersonBlocks(admin, pubIds)
  const degLat = CITY_RADIUS_KM / 111
  const degLng = CITY_RADIUS_KM / (111 * Math.cos((center.lat * Math.PI) / 180) || 1)

  const matchedCity = new Map<string, string>()
  const nearest = new Map<string, number>()
  for (const b of blocks) {
    if (Math.abs(b.lat - center.lat) > degLat || Math.abs(b.lng - center.lng) > degLng) continue
    const d = haversineKm(center, { lat: b.lat, lng: b.lng })
    if (d > CITY_RADIUS_KM) continue
    if (!nearest.has(b.practitionerId) || d < (nearest.get(b.practitionerId) as number)) {
      nearest.set(b.practitionerId, d)
      matchedCity.set(b.practitionerId, b.city)
    }
  }

  const virtualIds = inPersonOnly ? [] : await virtualPractitionerIds(admin, pubIds)
  const ids = [...new Set([...matchedCity.keys(), ...virtualIds])]
  return { ids, matchedCity }
}

// --- City route entry ----------------------------------------------------

// Reuses hydrateCards UNCHANGED, then overrides cityLabel: an in-person match
// shows its matched city; everyone else (virtual surfacing) is 'Virtual'.
// Returns null when the city is unknown (the page 404s).
export async function discoverInCity(
  citySlug: string,
  opts: { inPersonOnly?: boolean } = {}
): Promise<{ cards: PractitionerCardData[]; displayCity: string } | null> {
  const admin = createAdminClient()
  const pubIds = await publishedPractitionerIds(admin)
  const derived = await deriveCityCenter(admin, citySlug, pubIds)
  if (!derived) return null // unknown city -> 404

  const { ids, matchedCity } = await resolveByCenter(
    admin,
    derived.center,
    Boolean(opts.inPersonOnly),
    pubIds
  )
  if (ids.length === 0) return { cards: [], displayCity: derived.displayCity }

  const cards = await hydrateCards(admin, ids)
  const withCity = cards.map((c) => ({
    ...c,
    cityLabel: matchedCity.get(c.id) ?? 'Virtual',
  }))
  return { cards: rankCards(withCity), displayCity: derived.displayCity }
}

// --- Search route entry (structured: modality + format + location) -------

export type SearchFormat = 'any' | 'in_person' | 'virtual'

export type SearchFilters = {
  modalitySlug?: string
  format?: SearchFormat // 'in_person' IS the in-person-only control; no separate toggle
  citySlug?: string
}

async function idsByModality(admin: Admin, modalitySlug: string): Promise<string[]> {
  const { data: mod } = await admin
    .from('modalities')
    .select('id')
    .eq('slug', modalitySlug)
    .maybeSingle()
  if (!mod) return []
  const { data: pm } = await admin
    .from('practitioner_modalities')
    .select('practitioner_id')
    .eq('modality_id', mod.id)
  return [...new Set((pm ?? []).map((r) => r.practitioner_id as string))]
}

function intersect(sets: string[][]): string[] {
  if (sets.length === 0) return []
  return sets.reduce((acc, s) => {
    const set = new Set(s)
    return acc.filter((id) => set.has(id))
  })
}

// COMPOSITION RULE (format x city x location) — built deliberately, not left to
// intersection order:
//   - format 'in_person' IS inPersonOnly (one control, can't contradict a toggle).
//   - format 'virtual'  => virtual practitioners everywhere; a city filter is a
//     NO-OP for the set (never intersect virtual against the in-person radius —
//     that's the backwards failure). Cards label 'Virtual'.
//   - format 'any'/unset + city => in-person-within-radius UNION virtual.
//   - format 'any'/unset, no city => no location constraint.
export async function discoverSearch(
  filters: SearchFilters
): Promise<PractitionerCardData[]> {
  const admin = createAdminClient()
  const pubIds = await publishedPractitionerIds(admin)
  if (pubIds.length === 0) return []

  const format: SearchFormat = filters.format ?? 'any'
  const sets: string[][] = []
  let matchedCity: Map<string, string> | null = null
  let forceVirtualLabel = false

  // Modality axis.
  if (filters.modalitySlug) {
    sets.push(await idsByModality(admin, filters.modalitySlug))
  }

  // Location/format axis.
  if (format === 'virtual') {
    // City is a no-op here. Virtual surfaces everywhere; label 'Virtual'.
    sets.push(await virtualPractitionerIds(admin, pubIds))
    forceVirtualLabel = true
  } else if (filters.citySlug) {
    const derived = await deriveCityCenter(admin, filters.citySlug, pubIds)
    if (!derived) {
      // Unknown city in search is not a 404 — it just yields no in-person
      // matches. With format 'in_person' that's empty; we still apply the set.
      sets.push([])
    } else {
      const { ids, matchedCity: mc } = await resolveByCenter(
        admin,
        derived.center,
        format === 'in_person',
        pubIds
      )
      sets.push(ids)
      matchedCity = mc
    }
  } else if (format === 'in_person') {
    // In-person anywhere (no city). Card city comes from hydrate's default.
    sets.push(await inPersonAnywhereIds(admin, pubIds))
  }
  // else format 'any' + no city => no location constraint added.

  // No filters at all => show all published (A5).
  const ids = sets.length === 0 ? pubIds : intersect(sets)
  if (ids.length === 0) return []

  const cards = await hydrateCards(admin, ids)
  const labelled = cards.map((c) => {
    if (forceVirtualLabel) return { ...c, cityLabel: 'Virtual' }
    if (matchedCity) return { ...c, cityLabel: matchedCity.get(c.id) ?? 'Virtual' }
    return c // hydrate's deriveCity default
  })
  return rankCards(labelled)
}

// Distinct cities derivable from published active in-person blocks, for the
// search location picker. { slug, label }.
export async function derivableCities(): Promise<{ slug: string; label: string }[]> {
  const admin = createAdminClient()
  const pubIds = await publishedPractitionerIds(admin)
  const blocks = await loadInPersonBlocks(admin, pubIds)
  const bySlug = new Map<string, string>()
  for (const b of blocks) bySlug.set(slugify(b.city), b.city)
  return [...bySlug.entries()]
    .map(([slug, label]) => ({ slug, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

// Approved modalities grouped by category, for the search modality picker.
export async function approvedModalities(): Promise<
  { category: string; modalities: { name: string; slug: string }[] }[]
> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('modalities')
    .select('name, slug, categories ( name, sort_order )')
    .eq('is_approved', true)
    .order('name')

  const byCat = new Map<string, { sort: number; mods: { name: string; slug: string }[] }>()
  for (const m of data ?? []) {
    const cat = m.categories as unknown as { name: string; sort_order: number } | null
    const key = cat?.name ?? 'Other'
    const entry = byCat.get(key) ?? { sort: cat?.sort_order ?? 999, mods: [] }
    entry.mods.push({ name: m.name as string, slug: m.slug as string })
    byCat.set(key, entry)
  }
  return [...byCat.entries()]
    .sort((a, b) => a[1].sort - b[1].sort)
    .map(([category, v]) => ({ category, modalities: v.mods }))
}
