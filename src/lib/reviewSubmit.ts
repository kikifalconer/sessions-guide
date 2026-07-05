import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveSeekerIdentity } from '@/lib/seekerIdentity'

// Shared review submission core (D20). One implementation serves both entry
// points: the seeker_token email link (/review/[token]) and the authenticated
// dashboards (/account REVIEWS, practitioner MY SESSIONS). Callers own
// AUTHORIZATION (token match or seeker_id ownership); this owns validation,
// identity, and the insert. Auto-publish per D8; one review per booking via
// pre-check plus the unique-index backstop.

export type ReviewSubmitResult =
  | { ok: true }
  | { ok: false; error: string; alreadyReviewed?: boolean }

const GENERIC_ERROR = 'Something went wrong. Try again or contact support.'

export async function submitReviewForBooking(args: {
  bookingId: string
  rating: number
  body: string
}): Promise<ReviewSubmitResult> {
  const rating = Math.trunc(Number(args.rating))
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'Choose a rating from one to five stars.' }
  }
  const body = (args.body ?? '').trim().slice(0, 2000) || null

  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select('id, practitioner_id, seeker_id, guest_name, guest_email, status')
    .eq('id', args.bookingId)
    .maybeSingle()

  if (!booking) return { ok: false, error: GENERIC_ERROR }
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

  // Account-backed rows resolve to the seeker's account name; historical
  // guest rows keep the guest_name fallback (Amendment 3).
  const identity = await resolveSeekerIdentity({
    seeker_id: (booking.seeker_id as string | null) ?? null,
    guest_name: (booking.guest_name as string | null) ?? null,
    guest_email: (booking.guest_email as string | null) ?? null,
  })

  const { error } = await admin.from('reviews').insert({
    booking_id: booking.id,
    practitioner_id: booking.practitioner_id,
    reviewer_id: booking.seeker_id, // null only on historical guest rows
    reviewer_name: identity.name,
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
