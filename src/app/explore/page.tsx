import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import SiteHeader from '@/components/site-header'
import { categoryPath } from '@/lib/routes'

export const metadata = { title: 'Explore | sessions.guide' }

// Discovery landing. Mount-portable: it lives at /explore now and is destined
// to become / when the holding page retires. Category links go through
// categoryPath() (the fixed D12 namespace), so the landing can move without
// touching them.
export default async function ExplorePage() {
  const admin = createAdminClient()
  const { data: categories } = await admin
    .from('categories')
    .select('name, slug')
    .order('sort_order')

  return (
    <main className="min-h-screen bg-bg">
      <SiteHeader />

      <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
        <h2 className="mb-2">Find a practitioner who actually gets it.</h2>
        <p className="mb-10 max-w-[60ch]">
          Browse the transformational and healing arts by category, or search by modality.
        </p>

        <p className="label mb-4 text-dark">CATEGORIES</p>
        <div className="flex flex-wrap gap-3">
          {(categories ?? []).map((c) => (
            <Link
              key={c.slug}
              href={categoryPath(c.slug)}
              className="caption border border-border bg-surface px-4 py-3 text-dark transition-colors hover:border-olive"
            >
              {c.name}
            </Link>
          ))}
        </div>

        <p className="caption mt-12 text-dark opacity-70">
          Looking for something specific?{' '}
          <Link href="/search" className="text-olive">
            SEARCH
          </Link>
        </p>
      </div>
    </main>
  )
}
