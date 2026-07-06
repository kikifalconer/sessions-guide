import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import SiteHeader from '@/components/site-header'
import PageEditor from '../PageEditor'
import type { SageOption } from '@/lib/pages'

export const metadata = { title: 'New page | sessions.guide' }

export default async function NewPage() {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: sages } = await admin
    .from('sages')
    .select('id, display_name, slug')
    .order('display_name')

  return (
    <main className="min-h-screen bg-bg">
      <SiteHeader />
      <div className="mx-auto w-full max-w-[900px] px-6 py-12">
        <PageEditor sages={(sages ?? []) as SageOption[]} initial={null} />
      </div>
    </main>
  )
}
