import { createAdminClient } from '@/lib/supabase/admin'

// Full-reviews read. Its own service-role read (TD3) — independent of the
// discovery spine (hydrateCards), since the reviews page needs body/featured/
// reviewer fields the discovery cards never load. Published-only, featured
// first, one query; the rating header is computed from this same in-memory
// list (D14, no separate aggregate).

export type ReviewItem = {
  id: string
  reviewerName: string
  rating: number
  body: string | null
  isFeatured: boolean
  createdAt: string
}

export type PractitionerReviews = {
  practitioner: { id: string; slug: string; fullName: string; photoUrl: string | null }
  reviews: ReviewItem[]
  avgRating: number | null
  reviewCount: number
}

// TD8: rating math shared by every caller that aggregates reviews, so a
// fourth inline copy never has to happen again. Rounds to 1 decimal, same
// as this file's own prior inline version.
export function aggregateRatings(reviews: { rating: number }[]): {
  avgRating: number | null
  reviewCount: number
} {
  const reviewCount = reviews.length
  const avgRating =
    reviewCount > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
      : null
  return { avgRating, reviewCount }
}

export async function reviewsForPractitioner(slug: string): Promise<PractitionerReviews | null> {
  const admin = createAdminClient()

  // SECURITY (TD3): published practitioners only.
  const { data: p } = await admin
    .from('practitioners')
    .select('id, slug, full_name, photo_url, is_published')
    .eq('slug', slug)
    .maybeSingle()
  if (!p || !p.is_published) return null

  // SECURITY: published reviews only; featured first, then newest.
  const { data: rows } = await admin
    .from('reviews')
    .select('id, reviewer_name, rating, body, is_featured, created_at')
    .eq('practitioner_id', p.id)
    .eq('is_published', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  const reviews: ReviewItem[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    reviewerName: r.reviewer_name as string,
    rating: r.rating as number,
    body: (r.body as string | null) ?? null,
    isFeatured: Boolean(r.is_featured),
    createdAt: r.created_at as string,
  }))

  return {
    practitioner: {
      id: p.id as string,
      slug: p.slug as string,
      fullName: p.full_name as string,
      photoUrl: (p.photo_url as string | null) ?? null,
    },
    reviews,
    ...aggregateRatings(reviews),
  }
}

// Guide-facing equivalent for the dashboard (D30 2b): same published-reviews
// read and the same aggregateRatings() math as reviewsForPractitioner above,
// but keyed by id (the caller already resolved and owns the practitioner via
// requirePractitioner()) and with no practitioners.is_published gate -- a
// guide must be able to see their own reviews while still in draft. Review
// visibility itself is unchanged: is_published = true on the review row,
// same as the public page.
export async function reviewsForOwnPractitioner(
  practitionerId: string
): Promise<{ reviews: ReviewItem[]; avgRating: number | null; reviewCount: number }> {
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('reviews')
    .select('id, reviewer_name, rating, body, is_featured, created_at')
    .eq('practitioner_id', practitionerId)
    .eq('is_published', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  const reviews: ReviewItem[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    reviewerName: r.reviewer_name as string,
    rating: r.rating as number,
    body: (r.body as string | null) ?? null,
    isFeatured: Boolean(r.is_featured),
    createdAt: r.created_at as string,
  }))

  return { reviews, ...aggregateRatings(reviews) }
}
