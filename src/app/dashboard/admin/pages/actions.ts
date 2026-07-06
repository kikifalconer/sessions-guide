'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUserId } from '@/lib/admin'
import {
  SLUG_RE,
  sanitizeBlockContent,
  pagePublicPath,
  type PageBlock,
  type PageType,
} from '@/lib/pages'

// All writes here go through the service-role client (CLAUDE.md), and every
// action re-checks admin (defense in depth beyond the route gate).

export type SavePageInput = {
  id?: string
  title: string
  slug: string
  page_type: PageType
  sage_id: string | null
  hero_image_url: string | null
  seo_title: string | null
  seo_description: string | null
  blocks: PageBlock[]
}

export type ActionResult = { ok: boolean; id?: string; error?: string }

function revalidateFor(type: PageType, slug: string, id: string) {
  revalidatePath('/dashboard/admin/pages')
  revalidatePath(`/dashboard/admin/pages/${id}`)
  revalidatePath(pagePublicPath(type, slug))
  revalidatePath('/sitemap.xml')
}

export async function savePage(input: SavePageInput): Promise<ActionResult> {
  const adminId = await getAdminUserId()
  if (!adminId) return { ok: false, error: 'unauthorized' }

  const title = (input.title ?? '').trim()
  const slug = (input.slug ?? '').trim().toLowerCase()
  if (!title) return { ok: false, error: 'Title is required.' }
  if (!slug || !SLUG_RE.test(slug)) {
    return { ok: false, error: 'Slug must be lowercase letters, numbers, and single hyphens.' }
  }
  if (input.page_type === 'sage' && !input.sage_id) {
    return { ok: false, error: 'A sage page requires a linked sage.' }
  }
  const sageId = input.page_type === 'sage' ? input.sage_id : null

  const admin = createAdminClient()

  // Slug uniqueness (case-normalized), excluding the page being edited.
  const { data: existing } = await admin
    .from('pages')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing && existing.id !== input.id) {
    return { ok: false, error: 'That slug is already in use.' }
  }

  const now = new Date().toISOString()
  const fields = {
    title,
    slug,
    page_type: input.page_type,
    sage_id: sageId,
    hero_image_url: input.hero_image_url,
    seo_title: input.seo_title,
    seo_description: input.seo_description,
    updated_at: now,
  }

  let pageId = input.id
  if (pageId) {
    const { error } = await admin.from('pages').update(fields).eq('id', pageId)
    if (error) return { ok: false, error: error.message }
  } else {
    const { data, error } = await admin
      .from('pages')
      .insert({ ...fields, status: 'draft' })
      .select('id')
      .single()
    if (error || !data) return { ok: false, error: error?.message ?? 'Could not create the page.' }
    pageId = data.id as string
  }

  // Replace the block set: delete all, insert the current order (sanitized).
  const del = await admin.from('page_blocks').delete().eq('page_id', pageId)
  if (del.error) return { ok: false, error: del.error.message }

  const rows = input.blocks.map((b, i) => ({
    page_id: pageId,
    sort_order: i,
    block_type: b.block_type,
    content: sanitizeBlockContent(b.block_type, b.content),
    updated_at: now,
  }))
  if (rows.length > 0) {
    const { error } = await admin.from('page_blocks').insert(rows)
    if (error) return { ok: false, error: error.message }
  }

  revalidateFor(input.page_type, slug, pageId)
  return { ok: true, id: pageId }
}

export async function setPageStatus(
  id: string,
  status: 'draft' | 'published'
): Promise<ActionResult> {
  const adminId = await getAdminUserId()
  if (!adminId) return { ok: false, error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: page } = await admin
    .from('pages')
    .select('slug, page_type')
    .eq('id', id)
    .maybeSingle()
  if (!page) return { ok: false, error: 'Page not found.' }

  const { error } = await admin
    .from('pages')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidateFor(page.page_type as PageType, page.slug as string, id)
  return { ok: true, id }
}
