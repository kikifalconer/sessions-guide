import Link from 'next/link'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { loadSeekerData } from '@/lib/seekerData'
import { reviewsForOwnPractitioner } from '@/lib/reviews'
import { requirePractitioner } from '../requirePractitioner'

export const metadata = { title: `community | ${BRAND_NAME}` }

type VisitedGuide = {
  slug: string
  name: string
  visitCount: number
  lastVisitedUtc: string
}

type SavedGuide = { slug: string; name: string }

// D29 Community (renamed from the CLIENTS stub). List sorted by
// session_count -- clients.session_count is already maintained on this
// denormalized tracking table, not computed here. Names: guest_name for
// historical guest bookers, else the same seeker two-step lookup used
// throughout the dashboard (bookings/clients reference auth.users, not
// seekers, directly -- no FK for PostgREST to embed across).
//
// A practitioner is also a seeker of their own -- "guides you have visited"
// reuses the same seeker-side data as MY BOOKINGS, deduped by practitioner.
// "Guides you have saved" reads the favorites table (0017_favorites.sql),
// written from the save/unsave button on the public practitioner profile.
export default async function DashboardCommunityPage() {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()

  const [{ data: clientRows }, seekerData, { data: favoriteRows }, reviewsData] = await Promise.all([
    admin
      .from('clients')
      .select('id, seeker_id, guest_name, session_count, last_booked_at')
      .eq('practitioner_id', practitioner.id)
      .order('session_count', { ascending: false }),
    loadSeekerData(practitioner.id),
    admin
      .from('favorites')
      .select('created_at, practitioners ( full_name, slug )')
      .eq('seeker_id', practitioner.id)
      .order('created_at', { ascending: false }),
    reviewsForOwnPractitioner(practitioner.id),
  ])

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

  const visitedBySlug = new Map<string, VisitedGuide>()
  for (const booking of [...seekerData.upcoming, ...seekerData.past]) {
    if (!booking.practitionerSlug) continue
    const existing = visitedBySlug.get(booking.practitionerSlug)
    if (existing) {
      existing.visitCount += 1
      if (booking.startUtc > existing.lastVisitedUtc) existing.lastVisitedUtc = booking.startUtc
    } else {
      visitedBySlug.set(booking.practitionerSlug, {
        slug: booking.practitionerSlug,
        name: booking.practitionerName,
        visitCount: 1,
        lastVisitedUtc: booking.startUtc,
      })
    }
  }
  const visited = Array.from(visitedBySlug.values()).sort((a, b) =>
    b.lastVisitedUtc.localeCompare(a.lastVisitedUtc)
  )

  const saved: SavedGuide[] = (favoriteRows ?? [])
    .map((row) => {
      const p = row.practitioners as unknown as { full_name: string; slug: string } | null
      if (!p) return null
      return { slug: p.slug, name: p.full_name }
    })
    .filter((g): g is SavedGuide => g !== null)

  return (
    <main className="px-8 py-12">
      <div className="mx-auto w-full max-w-[1200px]">
        <h1>Community</h1>
        <p className="mt-4 max-w-[60ch] text-dark">
          The people who have booked with you, sorted by how many sessions you have shared.
        </p>

        {clients.length === 0 ? (
          <p className="mt-10 max-w-[60ch] text-dark">
            Nothing here yet. Once someone books with you, they will show up here.
          </p>
        ) : (
          <ul className="mt-10 flex flex-col gap-2">
            {clients.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/community/${c.id}`}
                  className="flex items-center justify-between border border-border bg-surface px-4 py-3 transition-colors hover:border-olive"
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

        <div className="mt-16">
          <h2>Guides you have visited</h2>
          <p className="mt-4 max-w-[60ch] text-dark">
            The guides you have booked with as a client of your own practice.
          </p>
          {visited.length === 0 ? (
            <p className="mt-6 max-w-[60ch] text-dark">
              You have not booked a session with another guide yet.
            </p>
          ) : (
            <ul className="mt-6 flex flex-col gap-2">
              {visited.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/${g.slug}`}
                    className="flex items-center justify-between border border-border bg-surface px-4 py-3 transition-colors hover:border-olive"
                  >
                    <span className="text-dark">{g.name}</span>
                    <span className="caption text-dark opacity-70">
                      {g.visitCount} visit{g.visitCount === 1 ? '' : 's'} · last{' '}
                      {DateTime.fromISO(g.lastVisitedUtc).toFormat('LLL d, yyyy')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-16">
          <h2>Guides you have saved</h2>
          <p className="mt-4 max-w-[60ch] text-dark">
            Saved from a guide&apos;s profile page. Unsave from that same page any time.
          </p>
          {saved.length === 0 ? (
            <p className="mt-6 max-w-[60ch] text-dark">
              Nothing saved yet. Look for SAVE on a guide&apos;s profile.
            </p>
          ) : (
            <ul className="mt-6 flex flex-col gap-2">
              {saved.map((g) => (
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

        <div className="mt-16">
          <div className="flex items-baseline justify-between">
            <h2>Reviews</h2>
            {reviewsData.reviewCount > 0 && (
              <span className="caption text-dark opacity-70">
                {reviewsData.avgRating?.toFixed(1)} average · {reviewsData.reviewCount} review
                {reviewsData.reviewCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <p className="mt-4 max-w-[60ch] text-dark">
            Published reviews from the people who have booked with you.
          </p>
          {reviewsData.reviews.length === 0 ? (
            <p className="mt-6 max-w-[60ch] text-dark">No published reviews yet.</p>
          ) : (
            <ul className="mt-6 flex flex-col gap-3">
              {reviewsData.reviews.map((r) => (
                <li key={r.id} className="border border-border bg-surface px-4 py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-dark">{r.reviewerName}</span>
                    <span className="caption text-olive" aria-label={`${r.rating} out of 5`}>
                      {'★'.repeat(r.rating)}
                      {'☆'.repeat(5 - r.rating)}
                    </span>
                  </div>
                  {r.body && <p className="mt-2 text-dark">{r.body}</p>}
                  <p className="caption mt-2 text-dark opacity-70">
                    {DateTime.fromISO(r.createdAt).toFormat('LLL d, yyyy')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
