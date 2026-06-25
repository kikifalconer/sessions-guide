-- Phase 5 / D17: minimal review report hook. Append-only, never mutates the
-- review row. Multiple reports per review allowed (count = triage signal). No
-- reporter columns (no PII) for the minimal version; rate-limit/auth is Phase 6.
create table review_reports (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references reviews(id) on delete cascade,
  reason     text,
  created_at timestamptz not null default now()
);
create index review_reports_review_id on review_reports (review_id);
