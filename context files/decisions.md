# sessions.guide — Architectural Decisions

Running log of decisions made. Consult before generating code that touches these areas. Do not reverse these decisions without explicit instruction.

---

## Tracked Debt (resolve before public launch)

`current-phase.md` is rewritten each phase, so durable debt is registered here. These are gates, not nice-to-haves.

**TD1 — Plaintext calendar refresh tokens (ref D6).** `calendar_integrations` stores Google refresh tokens in plaintext, contained only by RLS service-role-only access (no policies). Acceptable for the invite-only build. **HARD pre-launch gate:** encrypt at rest before the first real (non-invite) practitioner connects a calendar. Do not open public practitioner signup with this unresolved. Detail + target date (2026-09-01) in the D6 "Plaintext storage (explicit)" entry below.

**TD2 — Outbound calendar events skip pending-approval bookings.** `createCalendarEventForBooking` (the outbound helper) fires only on instant and paid (Stripe-confirmed) bookings; `pending_approval` bookings get no calendar event because no approval-confirm flow exists yet. **When that flow is built it must call `createCalendarEventForBooking` on approval.** See the "Known gap — `pending_approval` never reaches `confirmed`" entry below.

---

## Location Architecture — Path A (June 2026)

**Decision:** Location lives on `availability_blocks`, not on a separate practitioner-level service area field.

**Rationale:** Practitioners work nomadically across multiple cities and locations on different schedules. A practitioner-level location field would require duplication and fall out of sync. Path A — deriving all location data from availability blocks with geocoded lat/lng and PostGIS radius search — is the only model that correctly represents how these practitioners actually work.

**Implications:** Search queries hit `availability_blocks` for location filtering. Practitioner profiles show a derived list of cities from their active blocks. No `location` column on the `practitioners` table.

---

## Media Storage — Cloudinary (June 2026)

**Decision:** Cloudinary replaces Supabase Storage for all practitioner media.

**Rationale:** Smart face crop for profile photos, focal point auto-crop for hero banners. These transformations are not available in Supabase Storage.

**Implications:** All `photo_url`, `banner_url`, `video_url` fields store Cloudinary URLs. No Supabase Storage buckets for media. Upload routes use Cloudinary SDK.

---

## Subscription Revenue Model (June 2026)

**Decision:** Subscription-only. Zero transaction fees on sessions.

**Rationale:** Platform incentives should align with practitioner success, not session volume. Practitioners are skeptical of platforms that take a cut of their revenue.

**Implications:** Stripe Billing manages subscriptions. Stripe Connect handles session payments practitioner-to-seeker. Platform takes nothing from Connect transactions.

---

## Subscription Billing — Deferred for Invite-Only Launch (June 2026)

**Decision:** Stripe subscription billing is not enforced during the invite-only practitioner launch phase. Invited practitioners are granted `subscription_tier = 'basic'` on onboarding completion at no charge. The billing gate on `/dashboard` is not active in this phase.

**Rationale:** Early practitioners are being onboarded by invitation to seed the platform. Charging before the platform has sufficient seeker traffic is a trust and retention risk.

**Implications:** The `subscriptions` table exists but is not written to during onboarding in this phase. No Stripe Checkout session is created during onboarding. The dashboard billing redirect is disabled. This decision will be reversed when the platform opens to self-serve signups.

---


## Guest Booking (June 2026)

**Decision:** No account required to book a session.

**Rationale:** A signup wall between a seeker and their first session is unacceptable friction, especially given the sensitive nature of many modalities.

**Required fields at booking — always:**
- Name
- Email

**Required fields at booking — only when session takes payment on-platform (Stripe deposit or full payment):**
- Billing address
- Phone number
- Payment/card details (via Stripe Elements)

Offsite payment sessions (practitioner collects payment themselves) require name and email only.

**Implications:** `bookings` table supports `seeker_id = null`. Guest bookers are captured as client records for the practitioner. Seekers can optionally claim a guest booking to their account post-session. Booking UI conditionally renders the billing fields based on the session type's `payment_method` and `pricing_model`.

---

## Modality Taxonomy — Two-Layer (June 2026)

**Decision:** 12 fixed categories + practitioner-curated modalities. Categories always inferred from modality — never manually set.

**Rationale:** Prevents practitioners from miscategorizing themselves. Keeps top-level navigation consistent regardless of how many modalities are added over time.

**Implications:** `categories` table is seeded and rarely changes. `modalities` can grow via admin-approved suggestions. Category is always derived via join, never stored on session types or practitioner profiles.

---

## Booking Cancellation — Preset Tiers via Stripe (June 2026)

**Decision:** Four preset cancellation policy tiers (None, Flexible, Moderate, Strict). Stripe handles automated refunds.

**Rationale:** Custom cancellation policies create support burden and inconsistent seeker experience. Preset tiers cover the realistic range of practitioner preferences.

**Implications:** `cancellation_policy` column uses enum on both `practitioners` (default) and `session_types` (override). Refund logic triggered by Stripe webhook on cancellation event.

---

## Availability — Deferred to Dashboard (June 2026)

**Decision:** Availability block management is not part of the practitioner onboarding flow. It is a dashboard-only feature, accessible after onboarding completes.

**Rationale:** Adding availability setup to onboarding increases drop-off before the practitioner profile is published. Practitioners can publish with their session types visible and add availability immediately after.

---

## Booking Without Stripe Connect — Graceful Fallback (June 2026)

**Decision:** When a session's resolved payment method is `stripe` but the practitioner has no usable Connect account (`stripe_account_id` null, or account not `charges_enabled`), the booking proceeds WITHOUT an upfront charge: no card collected, `payment_status = 'offsite'`, the practitioner's `offsite_payment_instructions` shown if present, otherwise "Payment is arranged directly with your practitioner."

**Rationale:** Keeps every practitioner bookable during the invite-only phase, when no practitioner has completed Connect onboarding (no Connect onboarding UI exists yet). Low-anxiety for seekers. Trivially reversible: the gate is one resolved boolean (`resolveChargingNow` in `src/lib/booking.ts`).

**Status:** Provisional. Expected to be revisited when Connect onboarding ships.

**Related:** `pending_approval` bookings never charge upfront either, even with a ready Connect account — charging before approval risks refund churn on declines. Payment for approved bookings is Phase 4.

---

## `practitioners.id` = `auth.users.id` (June 2026)

**Decision:** The `practitioners` table uses the auth user's ID as its primary key — it is a foreign key to `auth.users.id`, not a separate auto-generated UUID.

**Rationale:** Simplifies all auth-gated queries. No join needed to go from session to practitioner to auth user.

**Implications:** Never use `randomUUID()` for practitioner creation. Always use the auth user's ID. The column name is `id` — not `user_id`. Filter with `.eq('id', user.id)`.

---

## Phase 4 — Post-Booking Lifecycle Decisions (June 2026)

Decided at the start of Phase 4, after the diagnostic pass. Covers cancellation/refunds, calendar sync, reviews, and inquiries.

**As-shipped migrations (corrected June 2026; supersedes the originally proposed names):** `0004_cancellation_refunds.sql` (cancellation + refunds, `seeker_token`), `0006_review_loop.sql` (review loop — note `0005` is `create_waitlist`, unrelated), `0007_inquiries.sql` (INQUIRE path), `0008_calendar_sync.sql` (Google Calendar; at repo root). All applied to the live DB. The earlier draft of this block listed proposed names `0005_calendar_sync.sql` / `0006_reviews_lifecycle.sql` that were never used.

### Cancellation + Refunds

**Who can cancel (D1):** Seeker self-cancel AND practitioner cancel. Seeker self-cancel requires a signed, single-use cancel link from the confirmation email (same opaque-token approach as reviews — a `cancel_token` column on `bookings`, folded into `0004`), plus a minimal logged-in seeker booking-history surface. Guests act via the email link; logged-in seekers also from booking history.

**`none` tier (D2):** A cancellation under the `none` policy still creates a `cancelled` booking with `amount_refunded = 0`, makes NO Stripe call, and leaves the refund (if any) for the practitioner to handle manually. Same shape as the offsite path.

**Refund amounts (D3):** Full refund = `amount_paid`. Partial (Moderate tier within 72h) = `amount_paid * 0.5`. There is no platform fee, so `amount_paid` is the whole charge and there is no proration to reconcile. Amounts are stored in dollars (matching `amount_paid`); Stripe API calls convert to cents at the boundary.

**Refund target:** Refunds are issued against the original PaymentIntent ON THE CONNECTED ACCOUNT — every Stripe refund call must pass `{ stripeAccount: practitioner.stripe_account_id }`. Phase 3 created Direct charges on the connected account with zero platform fee; a refund against the platform account would 404.

**Offsite + no-Connect fallback (D5 of Phase 3 lineage):** `payment_status = 'offsite'` (which includes both true-offsite and the no-Connect fallback) never triggers a Stripe refund. The resolved obligation (`amount_refunded` computed, `cancelled_at` stamped) is recorded and surfaced to the practitioner via Resend; `payment_status` stays `'offsite'`.

**Idempotency:** The refund webhook is new infrastructure (no webhook exists today; `STRIPE_WEBHOOK_SECRET` is currently unused). Replayed events are guarded by a `stripe_webhook_events` table keyed on the Stripe event id. `cancelled_at` is stamped once and is load-bearing — refund-tier math reads it, never a recomputed "now."

### Calendar Sync

**Connect/degradation (D5):** OAuth connect/disconnect per practitioner; tokens in a dedicated `calendar_integrations` table. A revoked or expired integration degrades gracefully — the booking still succeeds, sync is flagged failed, and the practitioner is notified. Calendar failure never blocks a booking.

**Busy-time strategy (D4 — refined, NOT pure cached):** Cached `calendar_busy` table is the baseline for the PUBLIC slot grid (fast, resilient to Google outages, no token-refresh on a public render), synced periodically and on booking events. BUT a live Google freebusy re-check runs at COMMIT time (immediately before the booking insert) to close the staleness gap that pure caching leaves. So: cached for display, live verification at write. The DB exclusion constraint still guarantees no double-booking against platform bookings; the live commit-time check extends that guarantee to external calendar events. Slot generator extension point is `src/lib/availability.ts:128` (the `booked.some(... overlaps ...)` check); external busy windows are merged into the existing `bookedWindows` array passed from the caller — no rewrite of the generator loop.

**Token security (D6 — tightened):** RLS-enabled with no anon/authenticated policy, service-role-only access, is acceptable to SHIP. App-level encryption of the refresh token is NOT an open-ended "later" — it is a tracked requirement that MUST land before public self-serve launch. Target date: 2026-09-01 (confirm against the launch plan; this is a hard pre-public-launch gate, not a nice-to-have).

**Plaintext storage (explicit, June 2026):** until the D6 encryption gate lands, `calendar_integrations.refresh_token` (and `access_token`) are stored as PLAINTEXT in the database, protected only by RLS-with-no-policies plus service-role-only access. This is a known, accepted interim state. App-level encryption of the refresh token is a HARD pre-public-launch requirement tracked with target date 2026-09-01; the platform must not open to public self-serve signups while these tokens are stored in plaintext.

**Library + refresh (confirmed June 2026):** `google-auth-library` + direct Calendar REST via `fetch` — NOT the full `googleapis` package (we need only OAuth token exchange/refresh plus `events.insert` / `events.delete` / `freebusy.query`). Refresh coverage confirmed: `OAuth2Client.getAccessToken()` auto-refreshes an expired access token from the stored `refresh_token` and emits a `tokens` event to persist the new token/expiry; `revokeCredentials()` handles disconnect. The connect URL sets `access_type=offline` + `prompt=consent` to guarantee a refresh_token on every grant. The Calendar grant is SEPARATE from the Supabase Google login (`auth/callback` uses `exchangeCodeForSession`) and needs its own redirect URI (e.g. `/api/calendar/callback`) registered in Google Cloud — confirm `GOOGLE_REDIRECT_URI` is not already consumed by the Supabase auth flow.

**Build order (confirmed June 2026):** plumbing-first. Migration 0008, the token helper (`getValidAccessToken`), OAuth connect/callback/disconnect routes, outbound event create/delete, and inbound busy sync are built FIRST. The dashboard SETTINGS connect/disconnect panel is DEFERRED to a follow-up pass (the SETTINGS tab is currently unimplemented, same gap as the deferred BOOKINGS tab).

**Cron refresh (confirmed June 2026):** the periodic `calendar_busy` refresh piggybacks on the existing hourly cron (`/api/cron/complete-bookings`), but the two responsibilities stay ISOLATED — the completion+review pass and the calendar-busy sync pass are independent, individually failure-guarded blocks, so one can never abort the other.

### Known gap — `pending_approval` never reaches `confirmed` (logged June 2026)

No `pending_approval → confirmed` transition exists in code. Phase 4 built only cancellation, not the practitioner approval action, so a `pending_approval` booking never becomes `confirmed` today. **Consequence for calendar sync:** outbound calendar events (created on `confirmed`) fire ONLY on the instant and paid booking paths; `pending_approval` bookings produce no calendar event until the approval flow is built. This is an explicitly accepted, logged gap for the calendar build — not an oversight. The future approval action (dashboard) must call the same outbound-event helper when it ships.

### Reviews

**Completion trigger (D7):** Both an hourly Vercel Cron (promotes `confirmed` → `completed` where `end_datetime` has passed, authenticated with `CRON_SECRET`) AND a practitioner manual "mark complete" action.

**Review request timing (D9 — changed):** DECOUPLED from the `completed` state transition. The review-request email is driven purely by time: sent ~24h after `end_datetime`, for non-cancelled bookings where `review_requested_at` is null. It does not depend on the completion cron having run. Guarded once via `review_requested_at`.

**Moderation (D8 — refined):** Auto-publish on submit (`is_published = true` immediately). The abuse control is BOOKING-GATING, not moderation: only verified clients (a real booking reference) can review, via a single-use token, one review per booking (unique index on `reviews.booking_id`). Crucially, practitioners CANNOT self-hide or suppress reviews — there is no practitioner takedown path. A platform report/takedown path is Phase 5.

### Inquiries

**Scope (D10):** Minimal build. `inquire`-priced cards route to an inquiry form (name, email, message, pre-filled session/practitioner context) → write to a new `inquiries` table → Resend notification to the practitioner → calm seeker confirmation. No threading or in-app reply UI (Phase 5).

**Both entry points wired (D11):** The per-card INQUIRE buttons carry session context (`session_type_id` set). The About-section INQUIRE button is a profile-level inquiry (`session_type_id = null`). Both currently render as dead buttons (no handler) and both get wired.

---

## Shared Site Header (June 2026)

**Decision:** One shared header serves the whole site, in two modes driven by a single prop.

- `src/components/site-header.tsx` — **server** component. Reads the session via the regular Supabase server client (`getUser()` only — no `practitioners` query; an account implies a practitioner since seekers book as guests) and derives the auth slot: signed in → `DASHBOARD` (`/dashboard`), signed out → `LOG IN` (`/join`). Renders the logo and, in profile mode, the `x.svg` separator + centered practitioner name. Delegates all interactivity to the client child.
- `src/components/header-nav.tsx` — **client** component. Holds open/close state and renders inline links (desktop, regular mode) or the hamburger toggle + menu. `alwaysHamburger = !!centerLabel`.

**Two modes via one contract:**
- `<SiteHeader />` — regular pages: inline links on desktop, hamburger below the `md` breakpoint.
- `<SiteHeader centerLabel={name} />` — profile pages: centered name, hamburger at all widths.

**Menu rendering:** full-screen overlay on mobile; at/above `md` (reachable only in always-hamburger / profile mode) a compact top-right panel anchored under the button (`w-max`, `min-w-[20ch]`, `max-w-[28ch]`), flat with a `--color-border` frame. Body-scroll lock applies in the full-screen variant only; the desktop panel uses click-away instead. Focus trap + restore, Esc, re-tap, route-change close, and `aria-expanded`/`role=dialog`/`aria-modal` apply in both.

**Placement:** rendered per-page (profile page with `centerLabel`; `/search` in regular mode). **Not** injected into the root layout, so the holding page at `/` stays header-free.

**Icons:** `public/hamburger.svg` (a `+`-style glyph — the design's menu icon, not a 3-line hamburger) and `x.svg` are colored via CSS `mask` against `var(--color-dark)` (`.hamburger-icon` / `.menu-close-icon` in globals.css), so they take a palette token regardless of any fill baked into the SVG. SEARCH renders as an inline magnifier on desktop and a labeled row in the menu. Reference public assets as `/hamburger.svg`, never `/public/...`.

**Superseded:** the old `src/components/SiteHeader.tsx` (orphaned) and `src/app/[slug]/ProfileNav.tsx` were deleted; the stray `+` text icon is gone.

### Held-out links rule

Nav links live in a config array typed `NavLink = { label: string; href: string; live: boolean }`; only `live === true` links render. Links whose destination pages do not exist yet are kept as `live: false` one-liners and flipped on in a single line when the page ships. **Never wire a nav link to a route that does not resolve.** Current state: `SEARCH` is live (`/search`); `EXPLORE`, `FOR PRACTITIONERS`, `SAGES`, and `ABOUT` are held out (no real destination yet — `/` is the pre-launch holding page, and there is no practitioner-marketing, sages, or about page). The same rule applies to any future audited destination that turns out not to exist.

---

## D12 — Discovery Routing: Explicit Prefixes, No Bare Resolver (June 2026)

**Decision:** Category and city discovery pages live under explicit static prefixes, never as bare root dynamic routes. Practitioner profiles stay at root `/[slug]`.

- Practitioners: `/[slug]` (unchanged, practitioner-only)
- Categories: `/explore/[category]` (discovery landing at `/explore`)
- Cities: `/in/[city]`
- Search: `/search` (unchanged, already exists)

**Rationale:** Practitioner, category, and city slug spaces are NOT guaranteed disjoint — a practitioner named "Readings" slugifies to `readings`, which equals the category slug. A bare single-segment resolver at root would have to disambiguate across three entity types and would break on slug overlap. Explicit prefixes make the three spaces disjoint by path shape: Next.js resolves the static `explore` / `in` segment before reaching `[slug]`, so `/readings` (practitioner) and `/explore/readings` (category) coexist with zero conflict.

**Required accompanying guard:** `generateUniqueSlug` (src/lib/slug.ts) currently checks only the practitioners table, so a practitioner slug can shadow a static route segment (e.g. someone named "Search" taking `/search`). A reserved-segment guard must reject or suffix any practitioner slug matching a top-level route segment. Current reserved list: `explore, in, search, dashboard, join, cancel, auth, api, review, c, city, about, sages`. This list tracks the top-level route tree and must be updated whenever a new top-level segment is added. The guard ships with the first discovery route, not before.

**Holding-page note:** `/` is currently the pre-launch HoldingPage (waitlist + invite). The Phase 5 category-pill homepage cannot occupy `/` yet. Discovery home is `/explore` for now. Promoting it to `/` (or making `/` redirect to `/explore`) is a deferred swap pending holding-page retirement. The homepage component should be built mount-portable so this swap is a one-line mount change, not a re-link of every breadcrumb.

**Implications:** No migration — pure routing. All Phase 5 category/city/search routes build against this namespace.

---

## D16 — AI Natural-Language Search: Deferred Past Phase 5 (June 2026)

**Decision:** Structured search ships in Phase 5 — modality / format / location, routed through the shared discovery spine (resolvePractitionerIds + hydrateCards). The /search bar does plain filtering with no AI affordance and no Anthropic API route. AI natural-language search is deferred.

**Rationale:** The filter-extraction approach (free text → structured filters → the same resolver) is thin and reuses the spine, but it carries a live model-string dependency that must be confirmed against current docs at build time, and it is an alternate input to a structured search resolver that has to exist either way. Shipping structured search first delivers the load-bearing feature; AI is a future input layer on top, not a prerequisite.

**Future upgrade:** filter-extraction — free text → structured filters → the same resolver (never raw practitioner rows as prompt context). When built, the model id must be confirmed current at build time, not pulled from memory/training. No model string is committed anywhere in this phase.

---

## D18 — Calendar OAuth Callback Path (June 2026)

(Next free number: D13–D17 are reserved for the Phase 5 discovery recommendations, so this is D18.)

**Decision:** The Google Calendar OAuth flow lives under `/api/google/`. The callback is built at `src/app/api/google/callback/route.ts`, matching the existing `GOOGLE_REDIRECT_URI=.../api/google/callback`, which stays **unchanged**. Connect is `src/app/api/google/connect/route.ts`; disconnect is a server action. **No second env var** (no `GOOGLE_CALENDAR_REDIRECT_URI`).

**Rationale:** `GOOGLE_REDIRECT_URI` was already set to `/api/google/callback` and is confirmed **unused** by the Supabase Google login — that flow is Supabase-brokered (`signInWithOAuth` → `/auth/callback` → `exchangeCodeForSession`) and reads none of the `GOOGLE_*` env vars. Building at the named path makes the env var, the Google Cloud registered redirect URI, and the route file all agree with zero new variables. `redirect_uri` is read from `process.env.GOOGLE_REDIRECT_URI` only (no hardcoding); dev and prod differ purely by env value.

**Implications:** The `GOOGLE_CLIENT_ID` OAuth client must register `http://localhost:3000/api/google/callback` (dev) and the production equivalent as Authorized redirect URIs, with the Google Calendar API enabled and `calendar.events` + `calendar.readonly` scopes available on the consent screen.

**Related (already logged above):** D6 plaintext-refresh-token debt + 2026-09-01 encryption gate; the `pending_approval` outbound-events gap. Not duplicated here.

---

## Known Gap — Dashboard SESSIONS / AVAILABILITY CRUD not built (pre-launch blocker)

Phase 2 docs claimed session-types and availability-blocks CRUD shipped. They did not. The dashboard shell (src/app/dashboard/DashboardShell.tsx) has SESSIONS and AVAILABILITY tabs, but they are client-side useState toggles that render empty headings; only PROFILE renders. No create / edit / delete UI exists for either, and there is no INSERT into session_types or availability_blocks anywhere under src/.

Consequence: session types and availability blocks can only be created via service-role script (scripts/seed-booking-dev.mjs) or raw SQL. No practitioner can build a bookable catalog through the product.

Gate: hard blocker for real practitioner onboarding. Must be built before practitioners (invite or public) are expected to self-serve. Sequencing relative to Phase 5 (Seeker Discovery) is open: discovery surfaces practitioners who currently cannot create what seekers would book.

## Deferred UI — OAuth connect callback lands on PROFILE, not SETTINGS (June 2026)

The Google Calendar connect flow (`/api/google/connect` → OAuth consent → callback) returns the practitioner to `/dashboard`, which renders the default PROFILE tab. The SETTINGS calendar panel (`src/app/dashboard/CalendarSettings.tsx`) only shows the freshly-connected state once the practitioner manually clicks SETTINGS. The panel is fully functional; the seam is purely that the connected state is not visible at the moment connection completes.

Consequence: minor UX gap, not a functional one. A practitioner who connects will not see confirmation until they navigate to SETTINGS. No data or sync impact.

Fix: requires making the dashboard tabs URL-driven (today they are client-side `useState` toggles in `DashboardShell.tsx`) so the callback can redirect to a SETTINGS URL. Deliberately out of scope when the SETTINGS connect/disconnect panel was built. Low priority, cosmetic. Lives in the deferred-UI pile alongside the no-shareable-confirmation-page and on-screen-self-cancel items (D1).

## TD3 — Public discovery reads bypass RLS (service-role, no anon policy) (June 2026)

**Situation:** RLS is enabled on all discovery tables (practitioners, categories, modalities, practitioner_modalities, reviews, availability_blocks) with NO anon-SELECT policy. The regular/anon client returns empty sets silently. All public-facing reads (profile page, and now the Phase 5 discovery surface) are served via the service-role client (createAdminClient), which bypasses RLS entirely.

**Consequence:** "Published only / active only / public-safe columns" is enforced ONLY in application-layer query filters. There is no database backstop. A forgotten `is_published = true` filter would serve unpublished/private data to the public with no second line of defense. The entire public discovery surface depends on the discovery module's filters being correct.

**Deferred fix (Option B):** Add anon-SELECT RLS policies — practitioners (published only), categories, modalities, practitioner_modalities, reviews (published only), availability_blocks (active) — then move public reads to the regular client so the database enforces the public-read boundary. This is a security-surface decision (defining exactly what anon may read) plus a migration.

**Gate:** Harden before public launch. Same tier as TD1 (pre-launch security gate). Until then, every public-serving query must be treated as security-critical.

## TD4 — City pages: derive-on-the-fly + haversine, no cities table (June 2026)

**Decision (D13):** /in/[city] resolves cities by slugifying cityLabel(location_display) from published active in-person/both blocks, centroids the matching blocks for a center point, and uses a haversine radius (bounding-box prefilter on numeric lat/lng + exact distance in JS, CITY_RADIUS_KM = 50) to include nearby practitioners. Virtual practitioners union in per D15 unless inPersonOnly. No cities table, no PostGIS, no migration.

**Why deferred:** Chosen pre-launch with 1 practitioner and seeded blocks. A cities table (canonical slugs, stable centers, geocoded place_id) plus block-level city_id resolution and a backfill is infrastructure for multi-city data that did not yet exist at decision time. Building it then meant guessing normalization rules against two seeded cities.

**The debt (scale-correctness, STILL OPEN):** Derived city slugs are only as clean as practitioners' location_display strings. At real multi-practitioner scale, the same city labelled differently ("Topanga" / "Topanga Canyon" / "Topanga, CA") fragments into separate pages with no canonical center. Derive-on-the-fly remains unproven against organic (non-seeded) multi-city data.

**D15 union + toggle — VERIFIED LIVE (resolved, was a gap):** Originally logged as construction-only (built with one practitioner, virtual-surfacing unproven). The Phase 5 verification seed (multi-practitioner roster: Dia virtual-only, Cal out-of-radius, Bea in-radius) proved both behaviors live: (1) a virtual-only practitioner surfaces on a city page where they have no in-person block, and (2) the in-person-only toggle drops them. No longer a live-verification gap. (Roster torn down after verification; the behaviors are proven, the proving data is gone.)

**Upgrade path (revisit when organic multi-city practitioner data exists):** a cities table (slug, display_name, lat, lng, place_id) + block.city_id resolved at save time via Google Places + backfill of existing blocks. Optionally, at that point, PostGIS proper: enable the extension, add a geography generated column + GIST index, and an RPC (e.g. practitioners_within(lat, lng, meters)) — replacing haversine when spatial-index performance matters. Not before.

**Gate:** Not a hard launch blocker. One tracked item still rides on it: scale-correctness (the cities table), revisited when organic multi-city data lands. The D15 live-verify item is CLOSED.

## TD5 — session_types pricing/confirmation coherence is app-layer only, no DB CHECK (June 2026)

**Situation:** session_types has NO CHECK constraints tying price/price_min/price_max or confirmation_mode to pricing_model. Confirmed live: a fixed-pricing row with null price inserts successfully. Coherence is enforced ONLY in validateSessionTypeInput (src/lib/sessionType.ts) and the form.

**Consequence:** Any write path that bypasses validateSessionTypeInput — seed scripts, raw SQL, future import/admin tools — can create incoherent pricing (fixed with no price, sliding with no min/max, pending_payment on inquire) that the booking flow can't sensibly handle. The DB is not a backstop. Same risk class as TD3.

**Deferred fix:** Add DB CHECK constraints mirroring validateSessionTypeInput (fixed→price not null; sliding→min+max not null; donation/inquire→price fields null; pending_payment→pricing_model != inquire). Migration. Until then, every session_types write must route through validateSessionTypeInput.

**Gate:** Not a launch blocker (the only write path today — this CRUD — is guarded). Harden before any second write path exists.

## TD6 — Google Places key restriction + server-side Time Zone call (June 2026)

**Situation:** Pass 2 (availability blocks) introduced the first Google Places usage. Autocomplete + Place Details run **client-side** (classic `AutocompleteService` + `PlacesService.getDetails`) with `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`, which ships in the browser bundle. Timezone derivation calls the classic Time Zone API **server-side** from `/api/timezone` (the web-service endpoint is not CORS-friendly), currently using the same `NEXT_PUBLIC` key.

**Consequence — TWO COUPLED CHANGES THAT BREAK EACH OTHER. Resolve them TOGETHER, never one alone:**
- **Change A (security):** the browser key is exposed in client JS, so it MUST be HTTP-referrer-restricted (and API-restricted to Maps JS + Places) in Google Cloud, or it can be lifted from the bundle and run up a surprise bill.
- **Change B (the coupling):** an HTTP-referrer restriction (Change A) **BREAKS** the server-side Time Zone call in `/api/timezone` — server requests carry **no referrer**, so a referrer-restricted key is rejected there. The same `NEXT_PUBLIC` key currently serves both surfaces.

**⚠️ Doing Change A alone ships a broken production:** timezone derivation silently fails for every new in_person/both block (the form falls back to the browser zone, mis-scheduling real bookings — the exact failure availability blocks exist to prevent), while **dev keeps working** because the dev key is unrestricted, so the breakage is invisible until prod. They are not a checklist; A without B is a regression.

**Resolution (do both, atomically):** restrict the browser key (A) AND in the same change provision a **separate, IP-restricted server key** in a new env var for the Time Zone route (B) — or move timezone derivation client-side so a single referrer-restricted key suffices.

**Prerequisite found in live testing (June 2026):** the **Time Zone API is NOT enabled** on the GCP project (`status: REQUEST_DENIED`, "API is not activated"). Maps JS + Places ARE enabled (autocomplete works), but Time Zone is a separate API. Consequence: `/api/timezone` fails, and the form silently falls back to the practitioner's **browser** zone — a Vancouver block created from California saved as `America/Los_Angeles` (benign, same offset) but a Bali block would silently save the wrong zone and mis-schedule bookings. **Enable the Time Zone API** so timezone auto-derivation actually works. Mitigated in code: the form now WARNS when derivation fails instead of silently using the browser zone (visible-fallback hedge), but the warning is a backstop, not a substitute for enabling the API.

**Gate:** Resolve before public launch / before the key sees real traffic. Same pre-launch-ops tier as TD1. Three GCP items, all on this project: (1) restrict the browser key, (2) provision a server key for the Time Zone route (coupled to #1), (3) enable the Time Zone API. Until then the cost/security exposure is contained to the invite-only phase (one unrestricted key works for both surfaces today), but timezone auto-derivation is inoperative — it falls back to the browser zone and the form warns.

**Scope boundary — session-types-in-block not modeled (Phase 6 pass 2, not TD-level):** `availability-blocks.md` allows a block to optionally restrict which session types it offers. This is **not modeled in the DB** (no join table, no column). Deferred, not invented this pass — block↔session compatibility is currently by format only (`blockHostsSessionFormat`), and "all active session types" is the default. Revisit with a migration if per-block session-type restriction is wanted.