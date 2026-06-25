-- Phase 3 prerequisites: confirmation_mode source columns + double-booking prevention.

-- confirmation_mode: per-session-type override of a practitioner default.
-- Mirrors the cancellation_policy pattern (nullable override on session_types).
alter table practitioners
  add column confirmation_mode text not null default 'instant'
    check (confirmation_mode in ('instant', 'pending_payment', 'pending_approval'));

alter table session_types
  add column confirmation_mode text
    check (confirmation_mode in ('instant', 'pending_payment', 'pending_approval'));

-- Double-booking prevention: no two non-cancelled bookings for the same
-- practitioner may overlap in time. Concurrent inserts of the same window
-- race at commit; the loser gets a constraint violation the app catches.
create extension if not exists btree_gist;

alter table bookings
  add constraint no_overlapping_bookings
  exclude using gist (
    practitioner_id with =,
    tstzrange(start_datetime, end_datetime) with &&
  ) where (status <> 'cancelled');
