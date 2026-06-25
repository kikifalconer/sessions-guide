-- Phase 4 completion: review loop. Reuses bookings.seeker_token (owned by 0004)
-- for the review link; no new token column.

-- One review per booking (backstop; the submission route also pre-checks).
create unique index reviews_one_per_booking on reviews (booking_id);

-- Idempotency for the review-request email, set by the completion cron so the
-- request never double-sends.
alter table bookings add column review_request_sent_at timestamptz;

-- Note: reviews.is_published default stays false. The submission path sets it
-- true explicitly (D8 auto-publish), keeping a moderation lever for later.
