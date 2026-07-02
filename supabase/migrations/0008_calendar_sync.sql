-- 0008_calendar_sync.sql  (Phase 4 completion: Google Calendar two-way sync)
-- NOTE: placed at repo root per explicit instruction. All other migrations live
-- in supabase/migrations/; `supabase db push` reads only that dir, so this file
-- is applied manually via the Supabase SQL editor.

create table calendar_integrations (
  practitioner_id uuid primary key references practitioners(id) on delete cascade,
  provider        text not null default 'google' check (provider in ('google')),
  access_token    text not null,
  refresh_token   text not null,          -- PLAINTEXT (D6 debt; pre-launch encryption gate 2026-09-01)
  token_expiry    timestamptz not null,
  scope           text,
  calendar_id     text not null default 'primary',
  sync_enabled    boolean not null default true,
  last_synced_at  timestamptz,
  connected_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- Service-role only: RLS enabled, NO anon/authenticated policies (D6).
alter table calendar_integrations enable row level security;

alter table bookings add column google_event_id text;

create table calendar_busy (
  id              uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  start_datetime  timestamptz not null,
  end_datetime    timestamptz not null,
  source_event_id text,
  synced_at       timestamptz not null default now()
);
create index calendar_busy_practitioner_time
  on calendar_busy (practitioner_id, start_datetime, end_datetime);
