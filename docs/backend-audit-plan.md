# sessions.guide — Backend Audit Plan

Charter for the audit phase. Goal: **every backend behavior either verified working with evidence, fixed and re-verified, or explicitly parked with an ID in `known-issues.md`.** Scope is code AND infra/config (Supabase, Stripe, GCP, Resend, Vercel). Frontend look/copy/UX is out of scope except where a page IS the verification surface (e.g. booking a slot to prove the engine).

## Method

- **Evidence rule:** an area passes only on observed behavior — a live request, a DB row, a Stripe dashboard event, a delivered email. "The code looks right" is a note, not a pass.
- **Findings ledger:** every discrepancy → `audit-findings.md` as `F-<n>` with severity (Critical / High / Medium / Low), evidence, and proposed fix. Fixes land in small single-concern passes, then the finding is re-verified live and closed.
- **Docs-vs-reality:** each ⚠︎ claim and each item in `platform-state.md` → "Known doc/code discrepancies" gets an explicit VERIFIED or REFUTED verdict.
- **Safety:** test-mode Stripe only; no destructive ops on live data without confirming the data is disposable; secrets never pasted into docs or commits.

---

## Phase 0 — Ground Truth (do first, one session)

1. `git status` / `git log origin/main..main` — are the 21 remediation commits pushed? Working tree clean? (GAP-5 items each get commit-or-discard.)
2. Deployed state: does Vercel prod match local main? Which commit?
3. Migrations: list applied migrations against the live DB vs files 0001–0013 (0010, 0011 flagged unknown). Confirm 0008's file location.
4. Live RLS state on every table — especially `bookings` (`seeker_token` exposure) — and confirm anon client returns nothing everywhere.
5. Env inventory: local vs Vercel Production, against the CLAUDE.md list. Note Stripe mode, `RESEND_FROM_EMAIL`, presence of `GOOGLE_SERVER_API_KEY`, `ADMIN_USER_ID`, `CRON_SECRET`.
6. Schema diff: live DB columns vs `schema.md` — correct the doc where it drifts.
7. Rewrite repo `current-phase.md` to point at this audit phase.
8. Output: `audit-findings.md` seeded, `platform-state.md` claims re-labeled VERIFIED/REFUTED.

## Audit Areas (roughly in dependency order)

Each area: read the code path end-to-end → list invariants → verify each live → file findings.

**A1. Identity & auth.** Practitioner Google OAuth (`?source=join` row-creation marker, open-redirect validation M5, invite gate H4 constant-time), seeker magic link (`/auth/confirm`, both token shapes, first-verify creates `seekers` row), session handling, `seekerIdentity.ts` resolution, admin env gate fail-closed. Cross-role: practitioner-as-seeker.

**A2. Availability & slot generation.** Block CRUD validation, recurrence/date-bounded/one-off logic, timezone derivation (`/api/timezone` — currently browser-key, TD6; warning fallback), slot generation vs booked windows, lazy hold expiry (30-min unpaid), GAP-2 (`calendar_busy` merge), reserved-slug guard behavior.

**A3. Booking engine.** All three confirmation modes end-to-end; exclusion constraint under concurrency (attempt a double-book); hold lifecycle incl. C1 PI cancellation on expiry; stale `pending_approval` expiry (M2, 7-day); offsite durability (OD-2); booked location/format copied durably; seeker auth required server-side; slot params surviving the auth round-trip.

**A4. Payments (Stripe Connect).** Direct charges on connected account, zero fee; `resolveChargingNow` fallback matrix (no Connect / not charges_enabled / offsite / pending_approval never charges upfront); C2 `payment_intent.succeeded` finalization + atomic finalize + retry; webhook idempotency via `stripe_webhook_events`; H6/OD-1 reproduction (redirect method attempt) to inform the decision; M4 publishable-key guard.

**A5. Cancellation & refunds.** Tier math against `cancelled_at` (all four tiers, boundary times); refund on connected account; partial (moderate 50%); clamp + already-refunded handling (C3/H7); `none` tier shape (cancelled row, no Stripe call); offsite obligation email; seeker self-cancel via token link AND `/account`; practitioner cancel; session-started guard.

**A6. Subscriptions & tiers.** 0012 state; sage code redemption (single-redemption under concurrency — two parallel redeems), 365-day trial sub shape, `missing_payment_method = 'cancel'`; T-14/T-1 reminders idempotent (and TD10-correct); webhook tier transitions; never-downgrade-without-subscription-row (grandfathered comped practitioners); D26 free-tier limit enforced in CRUD and public profile (discrepancy #4); Alchemist featured-first actually orders discovery.

**A7. Calendar sync.** OAuth connect/callback/disconnect (C4 state nonce + session binding), token refresh (M9 CAS), revoked-grant degradation (`sync_enabled=false`, booking never blocked), inbound busy sync in cron, live freebusy at commit (H1 fails closed — verify the failure mode is acceptable), outbound event create/delete incl. delete-on-cancel and M1 pointer rule, discrepancy #1 (what actually fires), TD2 rider for the future approval flow.

**A8. Email (Resend).** Inventory EVERY send site; verify TD10 pattern (inspect `error`, stamp only on success, natural retry bound) at each; confirm sends currently fail with 403 (sandbox) and nothing false-stamps as sent; after TD9 domain fix, re-observe one real delivery per flow (booking, cancel/refund, review request, inquiry, report notice, trial reminders).

**A9. Cron.** `/api/cron/complete-bookings`: `CRON_SECRET` auth, hourly schedule live in Vercel; the independent failure-guarded blocks actually isolate (force one to fail); completion promotion correctness; review-request timing (~24h, `review_request_sent_at` idempotency).

**A10. Reviews, reports, inquiries.** Token link reuses `seeker_token`; one-per-booking enforced; auto-publish flip; aggregation consistency across the three surfaces (TD8) with published-only filtering; report action: unpublished/unknown → silent `{ok:true}` no-leak, append-only, first-report-only notice; inquiry submission re-resolves practitioner by slug (published only) and validates session ownership.

**A11. Public read security (TD3 posture).** Grep every service-role public read; confirm `is_published` / `is_active` / `status='published'` filters present (profiles, discovery, reviews, pages, sitemap, JSON-LD, metadata — H2). Draft the Option B anon-policy set as the fix proposal.

**A12. Data integrity.** TD5 incoherence probes (insert fixed-with-null-price via raw SQL — document that the DB accepts it), orphan states (bookings referencing inactive blocks/session types, cancelled-block bookings), `clients` rollup correctness under D20, constraint inventory vs invariants.

**A13. Infra/config gates.** Execute or verify: TD9 (Resend domain), TD6 sequence (server key → env → code switch → deploy → restrict browser key), Supabase items (GAP-6: migrations, SMTP, redirect allowlist), Stripe live-mode checklist prepared (not executed), Cloudinary config sanity, `vercel.json`/cron config.

## Exit Criteria ("backend works perfectly")

1. Phase 0 complete; docs match reality.
2. Every A-area passed with evidence, or its exceptions parked with IDs.
3. All Critical/High findings fixed and re-verified live.
4. 🔴 gates: TD9 done; TD6 done; GAP-6 done; TD1 done or explicitly accepted-with-date; TD3 Option B done or explicitly re-accepted for invite-only; OD-1/OD-2/OD-3 decided and implemented; TD11 unchanged but re-confirmed single-admin.
5. GAP-1 (approval flow) built or explicitly deferred with the TD2 rider re-logged.
6. A clean end-to-end demo: seeker signs up → books (each confirmation mode) → pays (test) → cancels one (refund verified) → completes one → review requested → review posted → appears on profile — with every email delivered and every calendar event correct.

Then, and only then: `roadmap.md` Phase D (frontend, storytelling, UX).
