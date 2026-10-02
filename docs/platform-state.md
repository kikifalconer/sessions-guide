# sessions.guide — Platform State Snapshot (2026-07-26)

What exists, per the archive project's docs as of late July 2026. **Phase 0 (Ground Truth) ran 2026-07-26** — ⚠︎ claims below now carry VERIFIED/REFUTED/PARTIAL verdicts with evidence in `audit-findings.md` (F-numbers). Evidence basis: live DB inspection via PostgREST (same Supabase project as Vercel Production, confirmed by matching `NEXT_PUBLIC_SUPABASE_URL`), Vercel CLI/API, git, and code reads.

---

## Build History (what shipped, by phase)

| Phase | Scope | Status claim |
|---|---|---|
| 1–2 | Practitioner onboarding (invite-gated `/join`), profile page, publish gate | Built |
| 3 | Booking flow + Stripe Connect Direct charges (zero platform fee), no-Connect offsite fallback | Built |
| 4 | Cancellation + refunds (0004), review loop (0006), inquiries (0007), Google Calendar sync (0008) | Built |
| 5 | Discovery: `/explore/[category]`, `/in/[city]`, `/search`; rating aggregation; review reports (0009); RLS-all-tables migration (0010) | Built; **"roster since torn down" REFUTED (F-2)** — 5 `verify-*` seed practitioners (4 published) plus seeded bookings/reviews are still live in prod |
| 6 | Dashboard CRUD: session types (pass 1) + availability blocks (pass 2, first Google Places usage) | Built, confirmed by Phase 7 audit |
| 7 | Seeker accounts (D20): `/login`, `/auth/confirm`, `/account`, MY SESSIONS tab, `0011_seekers.sql` | Built; **0011 applied VERIFIED** (`seekers` table live, 0 rows). Runtime still unverified — zero seekers have ever signed up. SMTP/redirect-allowlist manual items still unconfirmed (Supabase dashboard, BLOCKED) |
| — | Three-tier billing (0012): free/elevated/alchemist, sage codes, trial reminders | Built; **0012 applied VERIFIED** (`sage_codes` + `trial_end`/reminder columns live; all 8 practitioners `elevated` = grandfather update ran). `subscriptions` and `stripe_webhook_events` both 0 rows — billing never exercised in prod (F-10) |
| — | Pages system (0013): admin-authored `/guides/[slug]` + `/sages/[slug]`, typed jsonb blocks, interim `ADMIN_USER_ID` gate | Built; **0013 applied VERIFIED** (`pages`/`page_blocks`/`sages`/`sage_recommendations` live, all 0 rows — unused in prod) |
| — | Remediation pass (2026-07-02): 21 local commits fixing C1–C5, H1–H5, H7, M1–M10, L1–L8 | **VERIFIED pushed** — `main` == `origin/main`; 23 commits dated 2026-07-02 (21 fixes + 2 dashboard-restyle). M10 landed later in `ead5ab8`; hero.jpg resolved in `1291bd8`; seed manifest committed as `scripts/verify-seed-manifest.json` in `6479c5e`. Vercel prod runs `700354d` = local main tip (redeployed 2026-07-07) |

## Dashboard tab state (claimed)

PROFILE, SESSIONS, AVAILABILITY, SETTINGS (calendar connect/disconnect panel), MY SESSIONS — functional. CLIENTS, REVIEWS — placeholder only. BOOKINGS tab — deferred (no approval/decline UI; ties to GAP-1). OAuth connect callback lands on PROFILE, not SETTINGS (cosmetic, logged).

---

## Migration Ledger

Phase 0 verdict (2026-07-26): all 13 files live in `supabase/migrations/` — **0008 location VERIFIED** (`0008_calendar_sync.sql`, no stray root copy). Applied-status checked structurally against the live DB via PostgREST OpenAPI + probes:

| # | Name | Adds |
|---|---|---|
| 0001 | initial | base tables |
| 0002 | add_link_columns | `link_1..3`, legacy socials migrated |
| 0003 | (confirmation modes) | `confirmation_mode` columns; `no_overlapping_bookings` exclusion constraint |
| 0004 | cancellation_refunds | cancellation/refund columns, `seeker_token`, `stripe_webhook_events` |
| 0005 | create_waitlist | `waitlist` — **REFUTED: table ABSENT from live DB** (404 PGRST205); live homepage waitlist POST returns 500 (F-1) |
| 0006 | review_loop | one-review-per-booking index, `review_request_sent_at` |
| 0007 | inquiries | `inquiries` |
| 0008 | calendar_sync | `calendar_integrations`, `calendar_busy` |
| 0009 | review_reports | `review_reports` (confirmed applied June 2026) |
| 0010 | enable_rls_all_tables | **VERIFIED behaviorally on all 13 populated tables** (anon SELECT returns empty set everywhere incl. `bookings` — svc sees 4 rows, anon sees 0, so `seeker_token` is not anon-exposed). PARTIAL: 8 empty tables (`subscriptions`, `sage_codes`, `sages`, `sage_recommendations`, `seekers`, `pages`, `page_blocks`, `stripe_webhook_events`) are behaviorally indeterminate at 0 rows — needs one `pg_tables` query (BLOCKED, see F-ledger) |
| 0011 | seekers | **VERIFIED applied** — `seekers` table live with expected columns (0 rows) |
| 0012 | three_tier_billing | tier rename, `sage_codes`, `trial_end` + reminder stamps |
| 0013 | pages_system | `pages`, `page_blocks` |

---

## Decision Index (binding; full text in archive project `decisions.md`)

Do not reverse without explicit instruction. D-numbers kept for reference:
Location on blocks (Path A) · Cloudinary-only media · subscription-only revenue · billing not enforced during invite phase · two-layer taxonomy · preset cancellation tiers (D2 none-tier shape, D3 refund math) · availability deferred to dashboard · no-Connect graceful fallback · `practitioners.id = auth.users.id` · D1 cancel paths · D4 cached busy + live freebusy at commit · D5 graceful calendar degradation · D6 token security (plaintext accepted interim → TD1) · D7 dual completion trigger · D8 auto-publish + booking-gating · D9 time-driven review request · D10/D11 minimal inquiries, both entry points · D12 explicit route prefixes + reserved-slug guard · D13 derive-on-the-fly cities · D14 batched in-app rating aggregation · D15 virtual-everywhere + in-person-only toggle · D16 AI search deferred · D17 minimal report hook · D18 calendar OAuth under `/api/google/` · D19 `?in_person=1` standardized · D20 seeker accounts required (supersedes guest booking) · D21 express newsletter opt-in · D22 discussion boards (deferred; needs rate limiting first) · D23 no saved cards at launch · D24 three tiers · D25 sage codes · D26 downgrade semantics · D27 pages system · Sage→"Guide" display copy only · no seeker-facing reviews/flags.

---

## Known Doc/Code Discrepancies (audit these explicitly)

These are places the archive docs contradict each other or were known stale — proof that Phase 0's "verify everything" rule earns its keep:

1. **Outbound calendar events** — **RESOLVED: decisions.md/TD2 is correct; schema.md is stale (F-9).** `createCalendarEventForBooking` fires on instant bookings (`src/app/[slug]/book/[sessionTypeId]/actions.ts:408`) and on paid finalization (`actions.ts:593`); helper guards on status so offsite/pending paths no-op.
2. **`calendar_busy` merge** — **RESOLVED: merge IS wired; schema.md is stale (F-9).** Cached windows merge into slot generation (`page.tsx:105,114` via `fetchCalendarBusyWindows`, fails open) and re-validate in the booking action (`actions.ts:207-213`), backed by the H1 live freebusy check (fails closed). Caveat: the only live integration has `sync_enabled=false`, so the whole path is currently inert for that practitioner (F-5).
3. **TD10 (email send-result inspection)** — **VERIFIED repo-wide by inspection (behavioral pass is A8).** Central choke point `deliver()` in `src/lib/email.ts:27-39` inspects `error` and catches throws; all `lib/email.ts` templates route through it; the four out-of-helper send sites (`api/waitlist/route.ts:47`, `api/contact/route.ts:46`, `lib/agents/anomalyChecks.ts:254`, `lib/agents/reportTriage.ts:380`) each destructure and inspect `error`. Both crons stamp `review_request_sent_at`/`reminder_*_sent_at` only on `true` sends. Live corroboration: 4 completed June bookings remain unstamped (no false stamps) — see F-4.
4. **Tier limit enforcement (D26)** — **SPLIT VERDICT (F-3): create-path REFUTED, display-cap VERIFIED.** `tierLimits.ts` has zero importers and `createSessionType` has no tier check; the public profile does cap free tier to 1 session type (`src/app/[slug]/page.tsx:172-175`).
5. **Old CLAUDE.md column list** — **CONFIRMED stale (F-7).** Live `practitioners` has no `modality_tags`; has `banner_url`/`link_1..3`/payment columns. schema.md matches the live DB on every table except the missing `waitlist` (F-1).
6. **`current-phase.md`** — **CONFIRMED stale (F-8).** Now headed "Phase 7" and claims 0011 unapplied, which Phase 0 refuted. Rewrite proposed, awaiting go-ahead.
7. **Remediation aftermath** — **RESOLVED.** All 2026-07-02 commits pushed; M10 committed in `ead5ab8`; hero.jpg replaced by reikiHero2 in `1291bd8` (`public/images/reikiHero2.jpg` exists); seed manifest committed in `6479c5e`. Today's working tree holds only new, unrelated items: doc edits (`brand-voice.md`, `decisions.md` — two new decision entries), untracked `content-copy-tasks.md`, untracked stock photos + `sgreiiki.jpg`, and a staged favicon.ico→icon.png swap. All need commit-or-discard decisions.
8. **D17 report notice** — **STILL NOT end-to-end verified (unchanged).** Code path confirmed by inspection (`reportActions.ts`: silent-ok no-leak, append-only, first-report-only notice via `deliver()`); delivery unobservable until TD9 clears; prod `RESEND_FROM_EMAIL` value BLOCKED (Sensitive-type env var).

---

## Live Data State (observed 2026-07-26, Phase 0)

Live row counts (service role): practitioners 8 (`kiki-falconer-2` + `test-name` + 5 `verify-*` seeds + `test`; 6 published — **the verify roster was NOT torn down, F-2**), bookings 4 (seeded, completed/offsite, unstamped review requests — F-4), reviews 4 (one featured), session_types 5, availability_blocks 9, clients 1, review_reports 1, inquiries 1, calendar_integrations 1 (`sync_enabled=false` — F-5), calendar_busy 16 (stale 2026-06-29), categories 12, modalities 65. Empty: seekers, subscriptions, sage_codes, sages, sage_recommendations, pages, page_blocks, stripe_webhook_events. Absent: waitlist (F-1). Seed data presumed disposable — CONFIRM with Kiki before any deletion.
