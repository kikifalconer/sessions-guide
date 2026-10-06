import Link from 'next/link'
import {
  discoverPractitioners,
  activeSessionsForGuides,
} from '@/lib/discovery'
import { buildMetadata } from '@/lib/metadata'
import AppOrPublicShell from '@/components/dashboard/AppOrPublicShell'
import SessionCard from '@/components/SessionCard'
import EmptyState from '@/components/dashboard/EmptyState'

export const metadata = buildMetadata({
  concept: 'browse sessions',
  description: 'Browse active sessions from published guides. Book virtual or in-person healing and transformational sessions.',
  path: '/explore/sessions',
})

const PSYCHEDELIC_DISCLAIMER =
  'Psychedelic journey facilitation may be subject to local laws and regulations. Practitioners and clients are solely responsible for ensuring compliance with the laws of their jurisdiction.'

const PAGE_SIZE = 24

export default async function ExploreSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)

  const guides = await discoverPractitioners({})
  const sessions = await activeSessionsForGuides(guides)
  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const visible = sessions.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const hasPsychedelic = visible.some((s) => s.hasPsychedelic)

  return (
    <AppOrPublicShell>
      <main className="min-h-screen bg-bg">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-12 sm:py-16">
          <h1>Sessions</h1>
          <p className="mt-4 max-w-[60ch] text-dark">
            Active sessions from published guides.
          </p>

          {hasPsychedelic && (
            <p className="caption mt-6 max-w-[70ch] text-dark">{PSYCHEDELIC_DISCLAIMER}</p>
          )}

          {visible.length === 0 ? (
            <EmptyState>No sessions to show yet.</EmptyState>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
              {visible.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-12 flex items-center gap-4">
              {current > 1 && (
                <Link
                  href={current === 2 ? '/explore/sessions' : `/explore/sessions?page=${current - 1}`}
                  className="btn-secondary"
                >
                  Previous
                </Link>
              )}
              <p className="caption text-dark">
                Page {current} of {totalPages}
              </p>
              {current < totalPages && (
                <Link href={`/explore/sessions?page=${current + 1}`} className="btn-secondary">
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </AppOrPublicShell>
  )
}
