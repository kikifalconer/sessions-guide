-- 0011_seekers.sql
--
-- D20/D21: seeker accounts. Seekers hold real auth accounts (magic link);
-- this table is their profile, created on first successful OTP verify.
--
-- Identity pattern matches practitioners (see decisions.md): id IS the
-- auth user's id — a FK to auth.users, never a separate user_id, never
-- randomUUID(). A practitioner may also hold a seekers row (same auth user);
-- neither table implies the other.
--
-- guest_name / guest_email on bookings and clients are NOT dropped or
-- altered — historical guest rows keep them (D20 retires guest booking for
-- NEW rows only). Nothing is added to bookings.
--
-- RLS: enabled with NO policies, per 0010 — anon/authenticated get nothing;
-- all access via the service-role client pattern (TD3 risk class applies:
-- application-layer filters are the only boundary).
--
-- Apply manually in Supabase (not auto-run).

create table seekers (
  id                 uuid primary key references auth.users(id),
  full_name          text not null,
  -- D21: express opt-in only (CASL / Spam Act). One unchecked checkbox at
  -- signup; never inferred from account creation. Transactional mail is
  -- unaffected by this flag.
  newsletter_opt_in  boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table seekers enable row level security;
