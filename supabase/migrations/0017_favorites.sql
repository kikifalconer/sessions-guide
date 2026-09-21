-- 0017_favorites.sql
--
-- D29: seekers saving a practitioner as a favorite. Supports a heart toggle
-- on the public practitioner profile page (signed-out clicks resume through
-- the standard magic-link flow) and the /account/favorites list.
--
-- Identity pattern matches bookings.seeker_id / clients.seeker_id: FK
-- straight to auth.users(id), not seekers(id) -- consistent with every
-- other seeker-side reference in this schema.
--
-- Composite primary key (seeker_id, practitioner_id) makes save idempotent
-- (upsert, ignore duplicates) and unsave a plain delete -- no separate
-- uniqueness constraint needed.
--
-- Row is never deleted when a practitioner unpublishes -- /account/favorites
-- filters on practitioners.is_published at read time, so an unpublished
-- guide drops out of the list and reappears automatically if they republish.
--
-- Index backs the /account/favorites list query (seeker's own rows,
-- newest first).
--
-- RLS: enabled with NO policies, per 0010 -- anon/authenticated get
-- nothing; all access via the service-role client pattern.
--
-- Apply manually in Supabase (not auto-run). Verified against the live DB
-- 2026-08-29: table does not exist yet, so this file is still unapplied.

create table favorites (
  seeker_id       uuid not null references auth.users(id) on delete cascade,
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (seeker_id, practitioner_id)
);

create index favorites_seeker_id_created_at_idx
  on favorites (seeker_id, created_at desc);

alter table favorites enable row level security;
