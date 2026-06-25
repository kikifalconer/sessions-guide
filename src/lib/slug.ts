import { createAdminClient } from '@/lib/supabase/admin'

// D12 reserved-segment guard: a practitioner slug must never equal a top-level
// route segment, or that practitioner's profile (/[slug]) would be shadowed by
// the static route. This list TRACKS THE TOP-LEVEL ROUTE TREE — update it
// whenever a new top-level segment is added under src/app.
const RESERVED_SLUGS = new Set([
  'explore',
  'in',
  'search',
  'dashboard',
  'join',
  'cancel',
  'auth',
  'api',
  'review',
  'c',
  'city',
  'about',
  'sages',
])

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Returns the slugified name, appending -2, -3, ... if already taken
// by a different practitioner.
export async function generateUniqueSlug(
  name: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(name) || 'practitioner'
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('practitioners')
    .select('id, slug')
    .like('slug', `${base}%`)

  if (error) throw new Error(error.message)

  const taken = new Set(
    (data ?? []).filter((row) => row.id !== excludeId).map((row) => row.slug)
  )

  // The bare slug is unavailable if another practitioner has it OR it is a
  // reserved top-level segment. Suffixed forms (e.g. 'search-2') are never
  // reserved, so only the base needs the reserved check.
  if (!taken.has(base) && !RESERVED_SLUGS.has(base)) return base

  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}
