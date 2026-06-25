import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DateTime } from 'luxon'
import { reviewsForPractitioner } from '@/lib/reviews'
import SiteHeader from '@/components/site-header'
import ReportReview from './ReportReview'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await reviewsForPractitioner(slug)
  return { title: data ? `Reviews of ${data.practitioner.fullName} | sessions.guide` : 'sessions.guide' }
}

export default async function ReviewsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await reviewsForPractitioner(slug)
  if (!data) notFound()

  const { practitioner, reviews, avgRating, reviewCount } = data
  const filled = avgRating !== null ? Math.round(avgRating) : 0

  return (
    <main className="min-h-screen bg-bg">
      <SiteHeader />

      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <nav className="caption mb-6 text-dark" aria-label="Breadcrumb">
          <Link href={`/${practitioner.slug}`} className="text-olive">
            {practitioner.fullName.toUpperCase()}
          </Link>
          <span className="px-2 opacity-50">›</span>
          <span>REVIEWS</span>
        </nav>

        <h2 className="mb-2">Reviews</h2>

        {reviewCount > 0 && avgRating !== null && (
          <p className="caption mb-10 text-olive" aria-label={`Rated ${avgRating.toFixed(1)} out of 5 from ${reviewCount} reviews`}>
            {'★'.repeat(filled)}
            {'☆'.repeat(5 - filled)}
            <span className="ml-2 text-dark">
              {avgRating.toFixed(1)} ({reviewCount})
            </span>
          </p>
        )}

        {reviews.length === 0 ? (
          <p className="text-dark">
            No reviews yet. Reviews appear here after a completed session.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {reviews.map((r) => {
              const stars = Math.round(r.rating)
              return (
                <article key={r.id} className="border-t border-border pt-6">
                  {r.isFeatured && <p className="caption mb-2 text-olive">FEATURED</p>}
                  <p className="caption text-olive" aria-label={`Rated ${r.rating} out of 5`}>
                    {'★'.repeat(stars)}
                    {'☆'.repeat(5 - stars)}
                  </p>
                  {r.body && <p className="mt-3 whitespace-pre-line">{r.body}</p>}
                  <p className="caption mt-3 text-dark opacity-70">
                    {r.reviewerName.toUpperCase()} ·{' '}
                    {DateTime.fromISO(r.createdAt).toFormat('LLLL yyyy')}
                  </p>
                  <ReportReview reviewId={r.id} />
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
