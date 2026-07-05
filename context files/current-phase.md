# sessions.guide — Current Phase

Rewrite this file at the start of each new phase. Claude Code reads this to understand what is being built right now and what the finishing line looks like.

---

## Phase: 7 — Seeker Accounts (D20/D21) — BUILT, not yet runtime-verified (July 2026)

**Numbering note:** Phase 6 was the dashboard SESSIONS + AVAILABILITY CRUD passes (session types, then availability blocks); it shipped without this file being rewritten, so the numbering gap is closed here explicitly rather than papered over. This phase is 7.

**Status: BUILT and committed; production build passes. NOT yet runtime-verified — no live magic-link, booking, or cancel/review pass has been driven against this code, and delivery depends on manual Supabase/SMTP items below. Per this project's audit-first rule, treat completion claims as construction-only until a diagnostic pass confirms them.**

---

## What This Phase Is

D20 retires guest booking. Seekers hold accounts (magic link, Supabase OTP, no password); every new booking carries `seeker_id` with null guest fields; historical guest rows keep their guest fields and their `seeker_token` email links keep working.

## What Was Built

1. **Migration `0011_seekers.sql`** — `seekers` profile table (`id` = `auth.users.id`, `full_name`, D21 `newsletter_opt_in` default false). RLS on, no policies, per 0010. NOT yet applied to the live DB (manual item).
2. **Auth** — `/login` (single entry: magic-link form primary, Google for returning practitioners); `/auth/confirm` (seeker OTP verify, accepts both token_hash and PKCE code shapes; first verify creates the seekers row); `/auth/callback` now creates practitioners rows ONLY on the explicit `?source=join` marker from the /join wizard. Shared `resolveAuthDestination` helper (practitioners row → `/dashboard`, else `/account`) used by confirm, callback, `/login`, and the site header. Header: LOG IN → `/login`; signed in → DASHBOARD or ACCOUNT by account shape.
3. **Booking flow** — name/email fields removed; identity display-locked from the account; unauthenticated seekers get an in-flow magic-link step, selection persisted through the round-trip as `?slot=&format=` URL hints validated server-side. Server actions reject unauthenticated calls. `clients` upsert keys on `seeker_id` for new bookings.
4. **Identity resolution** — `resolveSeekerIdentity` / `accountIdentity` (`src/lib/seekerIdentity.ts`): guest fields when present (historical), else seekers.full_name → practitioners.full_name → signup metadata, plus the auth email. Used by confirmation + cancellation emails, the review-request cron (which also now stamps rows with no resolvable email instead of re-scanning hourly forever), calendar event naming, review submission `reviewer_name`, and Stripe `receipt_email`.
5. **Seeker dashboard `/account`** — BOOKINGS (upcoming first, detail, self-cancel through the SAME `cancelBooking` engine as the token link, ownership-checked; full location only on confirmed/completed rows), REVIEWS (prompts for completed-unreviewed + own reviews with published state; submission via the shared `lib/reviewSubmit` core the token route also uses), SETTINGS (full_name, Supabase email re-verify flow, newsletter toggle).
6. **Practitioner MY SESSIONS tab** — same shared components over bookings where `seeker_id = user.id` and reviews where `reviewer_id = user.id`.

All new copy is PLACEHOLDER, marked for Kiki, following the hard rules (no em dashes, no exclamation points in chrome, DM Mono labels, calm booking tone).

## Finishing Line (what "verified" would mean)

- A magic-link round trip: request at `/login`, land signed in, seekers row created with the typed name and unchecked newsletter default.
- An in-flow booking as a signed-out seeker: pick a slot, sign in via the emailed link, return with the slot preselected, book; the row carries `seeker_id`, null guest fields; confirmation email addresses the account.
- Self-cancel from `/account` on a paid booking refunds via Stripe on the connected account (same engine as the token link, observed once).
- A historical guest booking's `seeker_token` cancel and review links still work unchanged.
- Practitioner MY SESSIONS shows their own seeker-side bookings/reviews.

## Blocked On (manual items, in decisions/report)

- Apply `0011_seekers.sql` in Supabase.
- Supabase Auth custom SMTP (production Resend + hello@sessions.guide) or magic links ride the rate-limited default sender. TD9 (Resend sandbox sender) still gates all transactional mail.
- OTP redirect allowlist must include https://sessions.guide and localhost dev.
- Optional but recommended: switch the Supabase magic-link email template to the token_hash form so links work cross-device (the default PKCE code shape works same-browser only).

## Descoped / Out of Scope (deliberate)

- Saved payment methods (D23), discussion boards (D22, next), rate limiting (pre-boards gate), claim-historical-guest-bookings flow (pre-launch, no real guest rows), newsletter sending (consent capture only), practitioner password sign-in (none exists today; returning practitioners use Google on /login).

Cross-check `decisions.md` for D20–D23 and the TD list; durable debt lives there, never here.
