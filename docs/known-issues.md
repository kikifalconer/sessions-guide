# sessions.guide — Known Issues Register (2026-07-26)

Single consolidated register. IDs are stable — reference them in commits and findings. When an item is resolved, mark it **RESOLVED (date, evidence)**; never delete the row. New audit findings get F-numbers in `audit-findings.md` and graduate here only if they become tracked debt.

Status legend: 🔴 hard launch gate · 🟠 open decision (Kiki's call, blocking a fix) · 🟡 functional gap · ⚪ tracked debt, not launch-blocking.

---

## 🔴 Hard Launch Gates (no public/seeker traffic until cleared)

| ID | Issue | Detail |
|---|---|---|
| TD9 | Resend sandbox sender blocks ALL transactional email | `RESEND_FROM_EMAIL = onboarding@resend.dev` delivers only to the account owner (observed 403). Booking, cancellation, refund, review-request, inquiry, report-notice mail all dead. Fix: verify domain, set `RESEND_FROM_EMAIL` (e.g. `hello@sessions.guide`), then re-observe one delivery per flow. Env-only, no code change. |
| TD1 | Plaintext Google refresh tokens | `calendar_integrations.access_token`/`refresh_token` plaintext; contained only by service-role-only RLS. Encrypt at rest before any real (non-invite) practitioner connects a calendar. Target 2026-09-01. |
| TD3 | Public reads bypass RLS (service-role, no anon policies) | App-layer filters are the only defense for published/active gating. Fix (Option B): anon-SELECT policies (practitioners published-only, reviews published-only, blocks active, categories/modalities open) + move public reads to the anon client. Until then every public query filter is security-critical. |
| TD6 | Google keys: coupled restriction sequence | Time Zone API now enabled (done). Remaining, IN ORDER: (1) create server key restricted by API (no IP restriction — Vercel has no fixed egress), (2) add `GOOGLE_SERVER_API_KEY` to Vercel, (3) code: switch `/api/timezone` to it, (4) deploy, (5) only THEN referrer-restrict the browser key. Restricting the browser key early silently breaks server-side timezone derivation in prod only. |
| TD11 | Single hard-coded admin (`ADMIN_USER_ID`) | Fail-closed env gate, fine for one admin. Replace with real admin role (flag or `admins` table + RLS) before ANY second admin. No `created_by`/`updated_by` on pages yet. |
| RL-1 | No rate limiting on public actions | `submitInquiry` / `reportReview` are open relays (unbounded rows + platform-domain email). Pre-boards gate (D22) and pre-launch hygiene. Needs mechanism decision (OD-3) first. |
| STRIPE-LIVE | Stripe in test mode | 7 Stripe env vars + 4 price IDs must be swapped to live values in Vercel at go-live. No real payments until then. |
| SEEKER-DASH | Seeker dashboard = launch-blocking scope | D20 makes `/account` (bookings/reviews/settings) launch scope. Built in Phase 7 ⚠︎ runtime-unverified. |

## 🟠 Open Decisions (Kiki decides; audit prepares the evidence)

| ID | Decision needed | Options |
|---|---|---|
| OD-1 (H6) | Redirect/delayed payment methods break checkout | PI uses `automatic_payment_methods` but no `return_url`; redirect methods error, delayed methods can charge after hold cancellation. (a) card-only for launch (small fix) vs (b) `return_url` + webhook settlement (C2 webhook infra now exists, cheaper than before). |
| OD-2 (M2) | Offsite `pending_payment` bookings never expire | Intentional per decisions.md (durable direct-payment bookings). Confirm durable-forever, or set an expiry policy. Log outcome either way. |
| OD-3 | Rate-limiting mechanism | Per-IP/session limiter and where it lives: middleware, Upstash, Vercel firewall. Then RL-1 becomes one implementation task. |
| OD-4 | Deferred tier entitlements | Profile banner gating by tier + co-branded page entitlements excluded from the D24 model until designed. Blocks nothing backend-side; park until Phase D. |

## 🟡 Functional Gaps (built-around holes in the current build)

| ID | Gap | Consequence / fix path |
|---|---|---|
| GAP-1 (was TD2 context) | No `pending_approval → confirmed` transition exists anywhere | Pending-approval bookings can never confirm. The future approval action MUST call `createCalendarEventForBooking` on approval (TD2) and handle payment (charging deferred on approval bookings by design). Dashboard BOOKINGS tab is the natural home. |
| GAP-2 | `calendar_busy` cache possibly not merged into public slot generation | Schema note says merge "not yet wired"; D4 designed it (extension point `src/lib/availability.ts:128`, merge into `bookedWindows`). Verify, then wire if missing. Live commit-time freebusy check exists (H1, fails closed). |
| GAP-3 | Dashboard CLIENTS + REVIEWS tabs placeholder-only | Client records accrue but aren't visible; featured-review action deferred. |
| GAP-4 | Calendar connect callback still hardcodes `/dashboard/profile` | The original cause is gone — the dashboard is real routes now, not `useState` tabs in `DashboardShell.tsx` (that file no longer exists). Remaining question: `src/app/api/google/callback/route.ts` still redirects to `/dashboard/profile`, and that path itself now redirects to `/dashboard/account` (the route PROFILE became), so the flow still resolves, just via one extra hop. Update the callback's hardcoded target to `/dashboard/account` directly. |
| GAP-5 | Working tree hygiene (as of 2026-07-02) | Unpushed commits (21), unstaged M10 fix in `explore/[category]/page.tsx`, deleted `hero.jpg` (decision: point at `/images/reikiHero2.jpg` after confirming it exists), untracked stock photos, `verify-seed-manifest.json`. Resolve intentionally, commit-or-discard per file. |
| GAP-6 | Supabase manual items from Phase 7 | Apply 0010/0011 if not applied; custom SMTP for auth mail; redirect-URL allowlist for magic links. Also: confirm live RLS actually enabled on `bookings` (the one possible `seeker_token` leak). |
| GAP-7 | Virtual-only search filter lost (TD7) | D19 param standardization dropped it; `discovery.ts` path still exists unused. Reintroduce only as a shared tri-state across search AND city surfaces. |

## ⚪ Tracked Debt (not launch-blocking; don't let it grow)

| ID | Debt | Trigger to act |
|---|---|---|
| TD4 | Cities derived on-the-fly; label fragmentation at scale ("Topanga" vs "Topanga, CA") | Revisit when organic multi-city data exists: cities table + `city_id` + optional PostGIS. |
| TD5 | No DB CHECK constraints on session_types pricing/confirmation coherence | Add checks mirroring `validateSessionTypeInput` before any second write path (imports, admin tools, seeds). |
| TD8 | Rating aggregation logic triplicated (profile / discovery cards / reviews page) | Consolidate to one helper BEFORE adding a fourth rating surface. Preserve batched no-N+1 reads. |
| TD10 | Email send-result inspection | Described as fixed repo-wide — VERIFY during the email audit; flag any send site without a natural retry bound for attempt-capping. |
| DEBT-1 | Cloudinary category hero images hardcoded (`CATEGORY_HERO` paths) | Swap after GAP-5 clears that file's unstaged state. Phase D adjacent. |
| DEBT-2 | Block-level session-type restriction not modeled (availability-blocks spec allows it) | Deferred deliberately; needs a join table + migration if ever wanted. Format-only compatibility today. |
| DEBT-3 | Newsletter opt-in captured (D21) but nothing sends | Fine. Counsel scope (CASL/Spam Act) tracked separately with D22 UGC items. |
