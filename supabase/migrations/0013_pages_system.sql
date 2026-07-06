-- 0013_pages_system.sql
--
-- Pages system: admin-authored editorial guides (/guides/[slug]) and Sage pages
-- (/sages/[slug]), both built from an ordered list of typed content blocks.
--
-- pages.sage_id is REQUIRED when page_type = 'sage' and MUST be null otherwise,
-- enforced by a check constraint so a sage page always resolves to a sages row
-- and an editorial page never carries a stray reference.
--
-- RLS: enabled with NO policies, per 0010 — anon/authenticated get nothing; all
-- access is via the service-role client (createAdminClient). The public routes
-- read published rows through the service role and gate on status themselves.
--
-- IMPORTANT: apply manually in Supabase (SQL editor or CLI). Not auto-run.

create table pages (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  hero_image_url  text,                 -- Cloudinary URL
  page_type       text not null check (page_type in ('sage', 'editorial')),
  sage_id         uuid references sages(id),
  seo_title       text,
  seo_description text,
  status          text not null check (status in ('draft', 'published')) default 'draft',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- sage_id required for sage pages, forbidden for editorial pages.
  constraint pages_sage_id_matches_type check (
    (page_type = 'sage' and sage_id is not null) or
    (page_type = 'editorial' and sage_id is null)
  )
);

create table page_blocks (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references pages(id) on delete cascade,
  sort_order  int not null default 0,
  block_type  text not null check (block_type in ('heading', 'paragraph', 'image', 'image_text')),
  content     jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Blocks are always read for a single page in sort order.
create index page_blocks_page_id_sort on page_blocks (page_id, sort_order);

alter table pages enable row level security;
alter table page_blocks enable row level security;
