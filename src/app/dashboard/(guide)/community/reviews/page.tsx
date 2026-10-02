import { DateTime } from 'luxon'
import { BRAND_NAME } from '@/lib/brand'
import { loadSeekerData } from '@/lib/seekerData'
import { reviewsForOwnPractitioner } from '@/lib/reviews'
import { requirePractitioner } from '../../requirePractitioner'
import SeekerReviews from '@/components/account/SeekerReviews'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import CommunityNav from '../CommunityNav'

export const metadata = { title: `reviews | ${BRAND_NAME}` }

export default async function DashboardCommunityReviewsPage() {
  const practitioner = await requirePractitioner()
  const [reviewsData, seekerData] = await Promise.all([
    reviewsForOwnPractitioner(practitioner.id),
    loadSeekerData(practitioner.id),
  ])

  return (
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader title="Community" />
        <CommunityNav current="reviews" />

        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2>About you</h2>
            {reviewsData.reviewCount > 0 && (
              <span className="caption text-dark opacity-70">
                {reviewsData.avgRating?.toFixed(1)} average · {reviewsData.reviewCount} review
                {reviewsData.reviewCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <p className="mt-4 max-w-[60ch] text-dark">
            Published reviews from people who have booked with you.
          </p>
          {reviewsData.reviews.length === 0 ? (
            <EmptyState>No published reviews yet.</EmptyState>
          ) : (
            <ul className="mt-6 flex flex-col gap-3">
              {reviewsData.reviews.map((r) => (
                <li key={r.id} className="py-3">
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
        </section>

        <section className="mt-16">
          <h2>Written by you</h2>
          <p className="mt-4 max-w-[60ch] text-dark">
            Reviews you leave after sessions you booked as a client.
          </p>
          <div className="mt-6">
            <SeekerReviews prompts={seekerData.prompts} reviews={seekerData.reviews} />
          </div>
        </section>
      </div>
    </main>
  )
}
