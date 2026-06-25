-- Phase 4 completion: INQUIRE path. Inquiries for `pricing_model = 'inquire'`
-- session types (per-card) and profile-level questions (About button).
create table inquiries (
  id              uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  session_type_id uuid references session_types(id),  -- null = profile-level (About button), per D11
  seeker_name     text not null,
  seeker_email    text not null,
  message         text not null,
  status          text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index inquiries_practitioner on inquiries (practitioner_id, created_at desc);
