import { createAdminClient } from '@/lib/supabase/admin'
import { cardsByIds, type PractitionerCardData } from '@/lib/discovery'
import type { PageBlock, PageRecord, PageType } from '@/lib/pages'

// Server-only page fetches (service role). PUBLIC GATE: only status='published'
// pages are ever returned here, mirroring the practitioner is_published rule.

export type PublishedPage = { page: PageRecord; blocks: PageBlock[] }

export async function getPublishedPage(
  slug: string,
  type: PageType
): Promise<PublishedPage | null> {
  const admin = createAdminClient()
  const { data: page } = await admin
    .from('pages')
    .select(
      'id, slug, title, hero_image_url, page_type, sage_id, seo_title, seo_description, status, updated_at'
    )
    .eq('slug', slug)
    .eq('page_type', type)
    .eq('status', 'published')
    .maybeSingle()
  if (!page) return null

  const { data: blocks } = await admin
    .from('page_blocks')
    .select('id, block_type, sort_order, content')
    .eq('page_id', page.id)
    .order('sort_order', { ascending: true })

  return { page: page as PageRecord, blocks: (blocks ?? []) as PageBlock[] }
}

export type SageRecommendation = { card: PractitionerCardData; note: string | null }

// Recommended practitioners for a Sage, in sage_recommendations.sort_order.
// Published-only (cardsByIds drops unpublished); the recommendation order is
// preserved, not re-ranked.
export async function getSageRecommendations(sageId: string): Promise<SageRecommendation[]> {
  const admin = createAdminClient()
  const { data: recs } = await admin
    .from('sage_recommendations')
    .select('practitioner_id, note, sort_order')
    .eq('sage_id', sageId)
    .order('sort_order', { ascending: true })

  const rows = recs ?? []
  if (rows.length === 0) return []

  const cards = await cardsByIds(rows.map((r) => r.practitioner_id as string))
  const byId = new Map(cards.map((c) => [c.id, c]))

  const out: SageRecommendation[] = []
  for (const r of rows) {
    const card = byId.get(r.practitioner_id as string)
    if (!card) continue // unpublished practitioner — dropped
    out.push({ card, note: (r.note as string | null) ?? null })
  }
  return out
}

export type SageProfile = { id: string; display_name: string; slug: string; bio: string | null; photo_url: string | null }

export async function getSage(sageId: string): Promise<SageProfile | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('sages')
    .select('id, display_name, slug, bio, photo_url')
    .eq('id', sageId)
    .maybeSingle()
  return (data as SageProfile | null) ?? null
}
