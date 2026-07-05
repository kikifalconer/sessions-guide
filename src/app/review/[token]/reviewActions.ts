'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { submitReviewForBooking, type ReviewSubmitResult } from '@/lib/reviewSubmit'

// Guest review submission. The opaque seeker_token (owned by 0004, shared with
// the cancel flow) IS the authorization: it resolves to exactly one booking,
// so no login is required. Validation, identity, and the insert live in the
// shared core (lib/reviewSubmit), which the authenticated dashboards also use.
export type ReviewResult = ReviewSubmitResult

export async function submitReview(input: {
  token: string
  rating: number
  body: string
}): Promise<ReviewResult> {
  const { token } = input
  if (!token || token.length < 32) {
    return { ok: false, error: 'This review link is not valid.' }
  }

  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select('id')
    .eq('seeker_token', token)
    .maybeSingle()

  if (!booking) {
    return { ok: false, error: 'This review link is not valid.' }
  }

  return submitReviewForBooking({
    bookingId: booking.id as string,
    rating: input.rating,
    body: input.body,
  })
}
