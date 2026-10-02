import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { requirePractitioner } from '../requirePractitioner'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import CommunityNav from './CommunityNav'

export const metadata = { title: `community | ${BRAND_NAME}` }

export default async function DashboardCommunityPage() {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()

  const { data: clientRows } = await admin
    .from('clients')
    .select('id, seeker_id, guest_name, session_count, last_booked_at')
    .eq('practitioner_id', practitioner.id)
    .order('session_count', { ascending: false })

  const seekerIds = Array.from(
    new Set((clientRows ?? []).map((r) => r.seeker_id as string | null).filter(Boolean))
  ) as string[]
  const seekerNameById: Record<string, string> = {}
  if (seekerIds.length > 0) {
    const { data: seekerRows } = await admin.from('seekers').select('id, full_name').in('id', seekerIds)
    for (const row of seekerRows ?? []) {
      seekerNameById[row.id as string] = row.full_name as string
    }
  }

  const clients = (clientRows ?? []).map((row) => {
    const seekerId = row.seeker_id as string | null
    const name = seekerId
      ? (seekerNameById[seekerId] ?? 'A client')
      : ((row.guest_name as string | null) ?? 'A client')
    return {
      id: row.id as string,
      name,
      sessionCount: row.session_count as number,
    }
  })

  return (
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader title="Community" />
        <CommunityNav current="clients" />

        {clients.length === 0 ? (
          <EmptyState>Nothing here yet. Once someone books with you, they will show up here.</EmptyState>
        ) : (
          <ul className="mt-10 flex flex-col gap-2">
            {clients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/community/${c.id}`}
                  className="flex min-h-[44px] items-center justify-between py-3 outline-none transition-colors hover:text-olive focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
                >
                  <span className="text-dark">{c.name}</span>
                  <span className="caption text-dark opacity-70">
                    {c.sessionCount} session{c.sessionCount === 1 ? '' : 's'} completed
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
