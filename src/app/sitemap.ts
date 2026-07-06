// src/app/sitemap.ts
// Dynamic sitemap. Next.js serves this at /sitemap.xml automatically.
// Service-role client: read-only, published-only. Mirrors the app-layer
// publish gate (TD3: the app filter is the gate, not RLS).

import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { derivableCities } from '@/lib/discovery'
import { getSiteUrl } from '@/lib/siteUrl'

export const revalidate = 3600 // rebuild at most hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const SITE_URL = getSiteUrl()
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Cities come from derivableCities() so the slugs are byte-identical to what
  // /in/[city] resolves (same slugify(cityLabel(...)) path). Categories and
  // published practitioners keep their direct queries.
  const [{ data: categories }, { data: practitioners }, cities, { data: pages }] =
    await Promise.all([
      supabase.from('categories').select('slug').order('sort_order'),
      supabase.from('practitioners').select('slug, updated_at').eq('is_published', true),
      derivableCities(),
      // Published pages only (same gate as practitioner is_published).
      supabase
        .from('pages')
        .select('slug, page_type, updated_at')
        .eq('status', 'published'),
    ])

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/explore`, changeFrequency: 'daily', priority: 0.9 },
  ]

  for (const c of categories ?? []) {
    entries.push({
      url: `${SITE_URL}/explore/${c.slug}`,
      changeFrequency: 'daily',
      priority: 0.8,
    })
  }

  // City pages: distinct city slugs derived from active in-person blocks of
  // published practitioners (D13/TD4 derive-on-the-fly, via derivableCities()).
  for (const city of cities) {
    entries.push({
      url: `${SITE_URL}/in/${city.slug}`,
      changeFrequency: 'daily',
      priority: 0.7,
    })
  }

  for (const p of practitioners ?? []) {
    entries.push({
      url: `${SITE_URL}/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.8,
    })
    entries.push({
      url: `${SITE_URL}/${p.slug}/reviews`,
      changeFrequency: 'weekly',
      priority: 0.5,
    })
  }

  // Published editorial guides and sage pages.
  for (const pg of pages ?? []) {
    const prefix = pg.page_type === 'sage' ? 'sages' : 'guides'
    entries.push({
      url: `${SITE_URL}/${prefix}/${pg.slug}`,
      lastModified: pg.updated_at ? new Date(pg.updated_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  return entries
}
