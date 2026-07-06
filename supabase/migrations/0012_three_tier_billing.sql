-- 0012_three_tier_billing.sql
--
-- D24/D25/D26: replace the basic/premium subscription model with the three
-- tiers free / elevated / alchemist, and add the sage_codes table backing the
-- single-redemption free-year-of-elevated program.
--
-- MIGRATION OF EXISTING DATA (D24): every existing practitioner is invite-only
-- and currently subscription_tier = 'basic'. They are grandfathered to
-- 'elevated' (comped, no Stripe subscription object). The basic -> elevated
-- update runs AFTER the old check constraint is dropped and BEFORE the new one
-- is added, so no row ever violates a live constraint. No rows exist in
-- subscriptions yet, so its tier column needs only the constraint swap.
--
-- The inline check constraints created in 0001 carry Postgres' default names
-- (<table>_<column>_check); dropped by that name with `if exists` so a re-run
-- or a dashboard-renamed constraint does not wedge the migration.
--
-- RLS on sage_codes: enabled with NO policies, per 0010 — service-role access
-- only (createAdminClient). Redemption and generation both go through the
-- service-role client.
--
-- IMPORTANT: apply manually in Supabase (SQL editor or CLI). Not auto-run.

-- 1. practitioners.subscription_tier: basic/premium -> free/elevated/alchemist.
alter table practitioners
  drop constraint if exists practitioners_subscription_tier_check;

update practitioners
  set subscription_tier = 'elevated'
  where subscription_tier = 'basic';

alter table practitioners
  alter column subscription_tier set default 'free';

alter table practitioners
  add constraint practitioners_subscription_tier_check
  check (subscription_tier in ('free', 'elevated', 'alchemist'));

-- 2. subscriptions.tier: same constraint swap. No rows exist yet (assumption
--    verified at build time), so no data update is required here.
alter table subscriptions
  drop constraint if exists subscriptions_tier_check;

alter table subscriptions
  add constraint subscriptions_tier_check
  check (tier in ('free', 'elevated', 'alchemist'));

-- 3. subscriptions: trial tracking + reminder idempotency stamps (D25).
alter table subscriptions add column if not exists trial_end            timestamptz;
alter table subscriptions add column if not exists reminder_14_sent_at  timestamptz;
alter table subscriptions add column if not exists reminder_1_sent_at   timestamptz;

-- 4. sage_codes: one row per Sage code, single-redemption (D25). redeemed_by
--    null-check at redemption enforces one-and-only-one winner (see
--    scripts/generate-sage-codes.ts and the redemption route).
create table sage_codes (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  label        text,                -- who this code is for, human-readable
  redeemed_by  uuid null references practitioners(id),
  redeemed_at  timestamptz,
  expires_at   timestamptz,         -- code validity, not subscription end
  created_at   timestamptz not null default now()
);
alter table sage_codes enable row level security;
