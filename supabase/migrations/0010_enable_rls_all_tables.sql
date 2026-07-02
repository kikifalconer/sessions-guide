-- 0010_enable_rls_all_tables.sql
--
-- C5 / TD3 / D6: Enable Row Level Security on every table.
--
-- WHY THIS IS SAFE (verified against the code before writing):
-- The application touches tables ONLY through the Supabase service-role client
-- (createAdminClient). The regular/anon and cookie-authenticated clients are
-- used solely for auth (getUser / signInWithOAuth / exchangeCodeForSession) and
-- never call `.from(...)` on any table. The service role has BYPASSRLS, so
-- enabling RLS does NOT change any current code path.
--
-- WHAT THIS DOES:
-- Turns RLS ON with NO policies. That means anon and authenticated roles get
-- NOTHING from these tables (the secure default), closing the hole where a
-- table left without RLS was readable/writable via the public anon key. This
-- mirrors the existing calendar_integrations pattern (0008, D6): RLS on, no
-- policy, service-role only.
--
-- IMPORTANT: This migration must be REVIEWED and APPLIED MANUALLY. It has not
-- been run against any database. Before applying, confirm the live DB matches
-- this intent (per TD3, several discovery tables may already have RLS enabled
-- via the Supabase dashboard — re-enabling is a harmless no-op).
--
-- If/when public reads move OFF the service-role client (TD3 Option B), add
-- explicit anon-SELECT policies (published-only / active-only) at that time.
-- Do NOT add such policies here — they are a separate security-surface decision.
--
-- `if exists` is defensive only; all tables below exist in migrations 0001–0009.
-- calendar_integrations already has RLS (0008); re-enabling is a no-op and kept
-- here so the set is exhaustive and this file is a complete statement of intent.

alter table if exists public.practitioners            enable row level security;
alter table if exists public.categories               enable row level security;
alter table if exists public.modalities               enable row level security;
alter table if exists public.practitioner_modalities  enable row level security;
alter table if exists public.session_types            enable row level security;
alter table if exists public.availability_blocks      enable row level security;
alter table if exists public.bookings                 enable row level security;
alter table if exists public.clients                  enable row level security;
alter table if exists public.reviews                  enable row level security;
alter table if exists public.review_reports           enable row level security;
alter table if exists public.inquiries                enable row level security;
alter table if exists public.waitlist                 enable row level security;
alter table if exists public.stripe_webhook_events    enable row level security;
alter table if exists public.calendar_integrations    enable row level security;
alter table if exists public.calendar_busy            enable row level security;
alter table if exists public.subscriptions            enable row level security;
alter table if exists public.sages                    enable row level security;
alter table if exists public.sage_recommendations     enable row level security;
