import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import SiteHeader from '@/components/site-header'

export const metadata = { title: `favorites | ${BRAND_NAME}` }

type SavedGuide = { slug: string; name: string }

// D29 favorites. Standalone route -- AccountShell's BOOKINGS/REVIEWS/SETTINGS
// are client-side tabs on one page, not real routes, and this pass doesn't
// retrofit that. TD3: no RLS backstop on favorites, so is_published is
// filtered here in application code, not left to the query alone -- an
// embedded to-one filter in PostgREST nulls the child rather than excluding
// the row, so the is_published check happens after the fetch, in JS.
// Unpublish never deletes the favorites row (Q3): a guide who republishes
// reappears here automatically.
export default async function AccountFavoritesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=${encodeURIComponent('/account/favorites')}`)

  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('favorites')
    .select('created_at, practitioners ( full_name, slug, is_published )')
    .eq('seeker_id', user.id)
    .order('created_at', { ascending: false })

  const guides: SavedGuide[] = (rows ?? [])
    .map((row) => row.practitioners as unknown as { full_name: string; slug: string; is_published: boolean } | null)
    .filter((p): p is { full_name: string; slug: string; is_published: boolean } => p?.is_published === true)
    .map((p) => ({ slug: p.slug, name: p.full_name }))

  return (
    <>
      <SiteHeader />
      <main className="px-8 py-12">
        <div className="mx-auto w-full max-w-[1200px]">
          <h1>Favorites</h1>
          <p className="mt-4 max-w-[60ch] text-dark">
            The guides you have saved. Save one any time from their profile.
          </p>

          {guides.length === 0 ? (
            <p className="mt-10 max-w-[60ch] text-dark">
              Nothing saved yet. Look for the heart on a guide&apos;s profile.
            </p>
          ) : (
            <ul className="mt-10 flex flex-col gap-2">
              {guides.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/${g.slug}`}
                    className="flex items-center justify-between border border-border bg-surface px-4 py-3 transition-colors hover:border-olive"
                  >
                    <span className="text-dark">{g.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  )
}
