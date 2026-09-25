import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import BasicCommunityNav from '../BasicCommunityNav'

export const metadata = { title: `community | ${BRAND_NAME}` }

type SavedGuide = { slug: string; name: string }

export default async function AccountCommunityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=${encodeURIComponent('/account/community')}`)

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
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          title="Community"
          description="Guides you have saved. Save one any time from their profile."
        />
        <BasicCommunityNav current="favourites" />

        {guides.length === 0 ? (
          <EmptyState>Nothing saved yet. Look for the heart on a guide&apos;s profile.</EmptyState>
        ) : (
          <ul className="mt-10 flex flex-col gap-2">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/${g.slug}`}
                  className="flex min-h-[44px] items-center justify-between py-3 outline-none transition-colors hover:text-olive focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
                >
                  <span className="text-dark">{g.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
