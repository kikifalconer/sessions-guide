'use server'

import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'

// Guest review submission. The opaque seeker_token (owned by 0004, shared with
// the cancel flow) IS the authorization: it resolves to exactly one booking,
// so no login is required. Nothing client-supplied is trusted beyond the
// rating and body — booking_id, practitioner_id, and reviewer_name are all
// derived server-side from the token's booking.
export type ReviewResult =
  | { ok: true }
  | { ok: false; error: string; alreadyReviewed?: boolean }

const GENERIC_ERROR = 'Something went wrong. Try again or contact support.'

export async function submitReview(input: {
  token: string
  rating: number
  body: string
}): Promise<ReviewResult> {
  const { token } = input
  if (!token || token.length < 32) {
    return { ok: false, error: 'This review link is not valid.' }
  }

  const rating = Math.trunc(Number(input.rating))
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'Choose a rating from one to five stars.' }
  }
  const body = (input.body ?? '').trim().slice(0, 2000) || null

  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select('id, practitioner_id, seeker_id, guest_name, status')
    .eq('seeker_token', token)
    .maybeSingle()

  if (!booking) {
    return { ok: false, error: 'This review link is not valid.' }
  }
  if (booking.status !== 'completed') {
    return { ok: false, error: 'You can leave a review once your session is complete.' }
  }

  // Pre-check for an existing review (the unique index is the backstop).
  const { data: existing } = await admin
    .from('reviews')
    .select('id')
    .eq('booking_id', booking.id)
    .maybeSingle()
  if (existing) {
    return { ok: false, error: 'You have already reviewed this session.', alreadyReviewed: true }
  }

  const reviewerName = (booking.guest_name as string | null)?.trim() || 'A seeker'

  const { error } = await admin.from('reviews').insert({
    booking_id: booking.id,
    practitioner_id: booking.practitioner_id,
    reviewer_id: booking.seeker_id, // null for guests
    reviewer_name: reviewerName,
    rating,
    body,
    is_published: true, // D8 auto-publish
    is_featured: false,
    created_at: DateTime.utc().toISO(),
  })

  if (error) {
    // Unique-violation backstop: someone reviewed between the pre-check and now.
    if ((error as { code?: string }).code === '23505') {
      return { ok: false, error: 'You have already reviewed this session.', alreadyReviewed: true }
    }
    return { ok: false, error: GENERIC_ERROR }
  }

  return { ok: true }
}
