import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { requirePractitioner } from '../../requirePractitioner'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import CommunityNav from '../CommunityNav'

export const metadata = { title: `favourite guides | ${BRAND_NAME}` }

type SavedGuide = { slug: string; name: string }

export default async function DashboardCommunityFavouritesPage() {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()

  const { data: favoriteRows } = await admin
    .from('favorites')
    .select('created_at, practitioners ( full_name, slug )')
    .eq('seeker_id', practitioner.id)
    .order('created_at', { ascending: false })

  const saved: SavedGuide[] = (favoriteRows ?? [])
    .map((row) => {
      const p = row.practitioners as unknown as { full_name: string; slug: string } | null
      if (!p) return null
      return { slug: p.slug, name: p.full_name }
    })
    .filter((g): g is SavedGuide => g !== null)

  return (
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader title="Community" />
        <CommunityNav current="favourites" />

        {saved.length === 0 ? (
          <EmptyState>Nothing saved yet. Look for Save on a guide&apos;s profile.</EmptyState>
        ) : (
          <ul className="mt-10 flex flex-col gap-2">
            {saved.map((g) => (
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
