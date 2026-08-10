import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import SiteHeader from '@/components/site-header'
import PageEditor from '../PageEditor'
import type { PageBlock, PageRecord, SageOption } from '@/lib/pages'

export const metadata = { title: 'edit page | sessions.guide' }

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const admin = createAdminClient()

  const { data: page } = await admin
    .from('pages')
    .select(
      'id, slug, title, hero_image_url, page_type, sage_id, seo_title, seo_description, status, updated_at'
    )
    .eq('id', id)
    .maybeSingle()
  if (!page) notFound()

  const [{ data: blocks }, { data: sages }] = await Promise.all([
    admin
      .from('page_blocks')
      .select('id, block_type, sort_order, content')
      .eq('page_id', id)
      .order('sort_order', { ascending: true }),
    admin.from('sages').select('id, display_name, slug').order('display_name'),
  ])

  return (
    <main className="min-h-screen bg-bg">
      <SiteHeader />
      <div className="mx-auto w-full max-w-[900px] px-6 py-12">
        <PageEditor
          sages={(sages ?? []) as SageOption[]}
          initial={{ page: page as PageRecord, blocks: (blocks ?? []) as PageBlock[] }}
        />
      </div>
    </main>
  )
}
