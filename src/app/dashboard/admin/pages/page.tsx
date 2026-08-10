import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import SiteHeader from '@/components/site-header'
import { pagePublicPath, type PageType, type PageStatus } from '@/lib/pages'

export const metadata = { title: 'pages | sessions.guide' }

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default async function AdminPagesList() {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: pages } = await admin
    .from('pages')
    .select('id, title, slug, page_type, status, updated_at')
    .order('updated_at', { ascending: false })

  return (
    <main className="min-h-screen bg-bg">
      <SiteHeader />
      <div className="mx-auto w-full max-w-[1000px] px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            {/* PLACEHOLDER COPY */}
            <p className="label mb-2 text-olive">Admin</p>
            <h2>Pages</h2>
          </div>
          <Link href="/dashboard/admin/pages/new" className="btn-primary">
            New page
          </Link>
        </div>

        {(pages ?? []).length === 0 ? (
          <p className="text-dark">{/* PLACEHOLDER COPY */}No pages yet.</p>
        ) : (
          <div className="border border-border">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-border bg-surface px-4 py-3">
              <span className="label text-dark">Title</span>
              <span className="label text-dark">Type</span>
              <span className="label text-dark">Status</span>
              <span className="label text-dark">Updated</span>
            </div>
            {(pages ?? []).map((p) => (
              <div
                key={p.id as string}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/admin/pages/${p.id}`}
                    className="font-ui text-olive"
                    style={{ letterSpacing: '0.04em' }}
                  >
                    {p.title as string}
                  </Link>
                  {p.status === 'published' && (
                    <Link
                      href={pagePublicPath(p.page_type as PageType, p.slug as string)}
                      className="caption text-dark underline"
                    >
                      View
                    </Link>
                  )}
                </span>
                <span className="caption text-dark">{p.page_type as string}</span>
                <span className="caption text-dark">{p.status as PageStatus}</span>
                <span className="caption text-dark">{formatDate(p.updated_at as string)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
