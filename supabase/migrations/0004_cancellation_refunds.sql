-- Phase 4, Feature 1 (Pass 1): cancellation + refunds.
-- OWNERSHIP: this migration owns `bookings.seeker_token`. The later reviews
-- migration (0006) ASSUMES this column exists and must NOT re-add it.

create extension if not exists pgcrypto;  -- for gen_random_bytes()

alter table bookings
  add column cancelled_at      timestamptz,
  add column amount_refunded   numeric(10,2),
  add column stripe_refund_id  text,
  -- Opaque URL-safe bearer token (256-bit hex), shared by the cancel link
  -- (this pass) and the review link (0006). Volatile default backfills every
  -- existing row with a distinct token and mints one for every future insert,
  -- so application code never generates it (only reads it back for the email).
  add column seeker_token      text not null unique default encode(gen_random_bytes(32), 'hex');

-- Idempotency ledger shared by every Stripe webhook handler in Phase 4.
create table stripe_webhook_events (
  id          text primary key,   -- Stripe event id (evt_...)
  type        text not null,
  received_at timestamptz not null default now()
);
