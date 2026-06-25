# sessions.guide — Current Phase

Rewrite this file at the start of each new phase. Claude Code reads this to understand what is being built right now and what the finishing line looks like.

---

## Phase: 5 — Seeker Discovery & Search

**Objective:** Build the seeker front door. Through Phase 4 a seeker could only reach a practitioner by direct profile link; there is still no way to *find* one. Phase 5 builds the discovery layer the marketplace has been missing: a homepage that opens into the 12 categories, category and city pages that list practitioners, modality / format / location filtering over availability blocks, the shared practitioner result card, the full reviews view behind "SEE ALL REVIEWS", and (scope decision below) natural-language search. Same standards as every prior phase: editorial and low-anxiety, correct about location and timezone, honest, design tokens and brand voice exactly. Phase 5 is read-heavy by design; most of the work is query architecture and presentation, not new write paths.

**The pieces:**
1. Homepage / landing — 12 category pills, a warm entry into discovery, search affordance
2. Category pages — all practitioners with a modality in that category
3. City pages — practitioners with an active in-person block in that city area, plus virtual
4. Search + filter — modality, format, and location filtering over `availability_blocks` (PostGIS)
5. Practitioner result card — one shared component, per the card spec in design-system.md
6. Full reviews page (the "SEE ALL REVIEWS >" target) + a minimal review-report hook
7. AI natural-language search — scope decision flagged below

---

## What Is Already Done (Phases 0 + 1 + 2 + 3 + 4 complete)

- [x] Next.js App Router + TypeScript + Tailwind + Turbopack
- [x] Supabase connected, full schema migrated; CSS variables + fonts loaded
- [x] Auth (email/password + Google OAuth)
- [x] Practitioner onboarding (7 steps), subscription gate stubbed (`basic` at no charge)
- [x] Dashboard shell, session types CRUD, availability blocks CRUD
- [x] Public practitioner profile page at `src/app/[slug]/page.tsx`
- [x] Booking flow (Phase 3): session selection → slot picker against blocks → format choice → seeker details → Stripe/offsite payment → confirmation, with state-accurate Resend emails + `clients` upsert
- [x] Post-booking lifecycle (Phase 4) — **PARTIAL, cancellation + automated refunds ONLY**: seeker self-cancel via signed `bookings.seeker_token` link + practitioner cancel, standalone route-agnostic refund engine (connected-account refunds, partial/offsite obligation), idempotent refund webhook + `stripe_webhook_events` ledger; migration 0004 (`cancelled_at`, `amount_refunded`, `stripe_refund_id`, `seeker_token`). Verified against migrations + code June 2026.

### Phase 4 — NOT yet built (corrected June 2026; the prior version of this doc wrongly listed these as done)
- [ ] **Review loop** — `reviews` table exists (0001) but there is no review-request email, no signed-token submission route, no `review_token`/`review_requested_at`/`reviewed_at` columns, no one-review-per-booking unique index, and no `confirmed → completed` promotion. Auto-publish (D8) is a decision, not live code. Reuse the existing `bookings.seeker_token` for the review link.
- [ ] **Google Calendar two-way sync** — no `calendar_integrations` table, no `bookings.google_event_id`, no OAuth/token/sync code, no `googleapis` dependency. Only a `// TODO(Feature 2 — Calendar)` stub in `src/lib/cancellation.ts`.
- [ ] **INQUIRE path** — no `inquiries` table and no inquiry route/form/write. The per-card and About-section INQUIRE buttons are unwired text only.

**Sequencing:** finish these three Phase 4 features before resuming Phase 5 discovery. The full reviews page + report hook (Phase 5 item 6 / D17) depends on the review loop, so the review loop comes first.

---

## Verify Before Writing Code (resolve these first)

Diagnose and report before building. Per CLAUDE.md, surface the root cause before changing anything. Propose migrations; do not apply them silently. Discovery touches routing and query architecture the codebase does not yet have. Confirm file paths with `find` before creating anything.

1. **Root routing collision (the load-bearing decision).** `src/app/[slug]/page.tsx` is the practitioner profile, a bare single-segment dynamic route at the root. Category pages and city pages cannot *also* be bare `/[param]` at root — Next.js permits one dynamic segment per level, and even a single resolver route would force slug uniqueness across three namespaces (practitioner vs category vs city) with fragile resolution order. Decide the namespace before adding any sibling route. **Recommend explicit prefixes** so `/[slug]` stays practitioner-only and slugs never collide: e.g. `/explore/[category]` and `/in/[city]`, or `/c/[category]` and `/city/[city]`. Report what the current root route (`src/app/page.tsx`) renders today and confirm `[slug]` is practitioner-only before proceeding. → **D12**

2. **No canonical city entity.** City pages need `slug → { display label, center lat/lng }`, but location lives on blocks as Google Place IDs + `location_lat`/`location_lng` + `location_display`, with no city table. PostGIS radius needs a center point per city; report where it comes from under each option:
   - *Derive on the fly:* group active in-person blocks, normalize and slugify a city from `location_display`. No migration, but inconsistent (same city spelled/labelled differently across blocks) and no clean center point.
   - *`cities` table:* `slug`, `display_name`, `lat`, `lng`, `place_id`; blocks resolve into it at save time or via a backfill. Migration required; clean centers and stable slugs.
   **Recommend the `cities` table if city pages are a launch-day surface; recommend derive-on-the-fly only if city pages are a stretch goal this phase.** → **D13**

3. **Reusable discovery query (standalone-module principle).** Phase 3 built slot generation against blocks. Confirm whether a reusable geo/discovery query already exists or must be written: a PostGIS radius query over `location_lat`/`location_lng`, filtered to active `in_person`/`both` blocks, that also honors the "virtual surfaces everywhere" rule. Category, city, and search pages must all call **one** query module, not re-implement filtering three times. Report what Phase 3 left reusable; build the discovery query as a standalone module from the start (practitioner-search, city, and category callers all hit it).

4. **Rating aggregation source.** The profile page already renders a star average + review count, so aggregation exists somewhere. Confirm how it is computed (inline query, view, or cached column) and **reuse it** for result cards — do not re-derive a rating per card in a list (N+1 across a category of practitioners). If no aggregate exists, recommend a single grouped query or a `practitioner_rating_summary` view (avg rating + published-review count per practitioner, `is_published = true` only). → **D14**

5. **Virtual practitioners on location pages.** Spec: virtual sessions surface in all location searches unless the seeker filters in-person only. Confirm the intended behavior on a *city* page specifically — does Melbourne's page include virtual-only practitioners? **Recommend:** city and search pages default to "in-person in this area + virtual," with an explicit "in-person only" filter, kept consistent between the two surfaces. Confirm before building. → **D15**

6. **AI natural-language search (scope + model + retrieval).** Spec describes an API route calling Claude with practitioner data as context. Self-contained, but it introduces three coupled decisions: (a) include a minimal version this phase or defer; (b) which model; (c) the retrieval approach. **The whole practitioner table cannot be stuffed into a prompt at scale.** Recommend the **filter-extraction** approach: Claude parses the natural-language query into structured filters (modality, format, location, intent), and those filters run through the *same* discovery query module from item 3 — not raw practitioner rows as context. On the model: **confirm the current recommended API model string at build time rather than hardcoding one here** (model availability changes; do not assume a string). → **D16**

7. **Review report / takedown.** Phase 4 chose auto-publish (D8), so published reviews already appear on profiles and, this phase, on a full reviews page where bodies are shown at volume. Decide the Phase 5 abuse scope: a minimal per-review "report" action (a small `review_reports` table, or `reported_at` / `report_reason` on `reviews`, plus a Resend notice to admin) versus a full moderation console. **Recommend the minimal report hook now; the console stays Phase 6.** → **D17**

---

## Scope Decision — AI Natural-Language Search

product-spec.md lists AI search as a discovery surface; it has never been built. **Recommendation: include a minimal, contained version in Phase 5** because it is self-contained and reuses the discovery query module (item 3) rather than standing up new infrastructure. Minimal version = one API route that turns a free-text query into structured filters via the Anthropic API, runs those filters through the shared discovery query, and returns the same result cards as the rest of the phase. No conversational UI, no result re-ranking by the model, no per-practitioner LLM scoring (that can be Phase 6). Confirm this scope and the model selection (item 6) before building. If declined, the search bar should fall back to plain modality/location filtering and not present an AI affordance.

---

## What This Phase Builds

### 1. Homepage / Landing
- 12 category pills (read from `categories`, ordered by `sort_order`), each linking into its category page.
- A warm entry into discovery and a search affordance. Brand voice exactly: no "discover" as a standalone verb, no "a space for healing, transformation, and growth," no exclamation in chrome.
- Empty/loading states calm and directional.

### 2. Category Pages — `/<namespace>/[category]` (per D12)
- Resolve the category slug; 404 cleanly on unknown slugs.
- List practitioners with at least one modality in that category (join `practitioner_modalities → modalities → categories`), published practitioners only (`is_published = true`), shown as result cards.
- Breadcrumb per spec (e.g. Readings › Astrology context where relevant).
- Psychedelic-facilitation jurisdiction disclaimer still auto-triggers anywhere a `psychedelic-facilitation` modality surfaces.

### 3. City Pages — `/<namespace>/[city]` (per D12 + D13)
- Resolve city → center point (per D13). PostGIS radius over active in-person/`both` blocks, plus virtual per D15.
- Practitioner result cards. Empty state directional, e.g. names that virtual sessions are available everywhere.

### 4. Search + Filter
- Filters: modality (within or across category), format (`virtual` / `in_person` / `both`, with the "in-person only" toggle per D15), and location (PostGIS radius). All routed through the single discovery query module (item 3).
- Search hits `availability_blocks`, never `practitioners`, for any location filter.
- Optional AI search entry point per the scope decision.

### 5. Practitioner Result Card (shared component)
- Per design-system.md card spec: `--color-surface` background, 1px `--color-border`, no/minimal radius, photo on top, practitioner name (h4), primary modality (DM Mono label), location (DM Mono label, city only — pre-booking display rule), rating.
- One component reused by homepage, category, city, and search results. No per-card rating re-query (item 4).

### 6. Full Reviews Page + Report Hook
- The "SEE ALL REVIEWS >" target from the profile info strip. Lists published reviews for a practitioner (`is_published = true`), featured review first if set.
- Minimal per-review report action per D17.

### Copy + Design (all seeker-facing surfaces)
- brand-voice.md and design-system.md exactly. No em dashes in any seeker-facing string. No "discover" as a standalone verb. No exclamation in chrome. Buttons DM Mono uppercase, active and specific. CSS variables / Tailwind tokens only — no inline hex, no inline font families.
- Discovery should feel exploratory and editorial, not transactional. Location shown city-only in all pre-booking contexts (availability-blocks.md display rules).
- Illustrative brand-voice-compliant strings (final copy written at build time):
  - Category empty state: "No practitioners here yet. Try another category, or search by modality."
  - City empty state: "No practitioners in this area yet. Virtual sessions are available everywhere."

---

## Phase 5 — COMPLETE AND VERIFIED (June 2026)

Phase 5 is **complete and verified**: the four discovery surfaces (category, city, structured search, full reviews + report hook) are built and spine-correct on ONE shared query module, and every previously construction-only behaviour was **VERIFIED LIVE against a multi-practitioner seed roster** (6 practitioners across modalities/cities incl. an unpublished one, real published + unpublished reviews, a psychedelic-facilitation practitioner; seed run then torn down clean — Kiki's fixtures preserved). **Zero bugs found** under multi-practitioner data. Items remain marked **VERIFIED LIVE** / **CONSTRUCTION-ONLY** / **BELIEVED (not observed)** / **DEFERRED** below; the few still-unverified items are the ones no seed can settle (mobile visual review, observing the Resend notice deliver). **This is not a Phase 6 advance** — that decision is the user's.

### ⚠️ Standing Constraint — discovery sits ON TOP OF the CRUD gap
Phase 5 surfaces practitioners who **cannot build a bookable catalogue through the product**: session-types and availability-blocks CRUD was never built (dashboard SESSIONS/AVAILABILITY tabs render empty; creation is seeder/SQL-only — see decisions.md "Known Gap"). All Phase 5 testing used **one seeded practitioner (Kiki)**. **"Phase 5 complete" must not be read as launch-ready.** It is not, until CRUD ships and real practitioners exist.

### Marked checklist
- **VERIFIED LIVE — D12 routing:** `/[slug]` practitioner-only; `/explore/[category]`, `/in/[city]` don't collide; reserved-segment slug guard tested (reserved names → suffixed).
- **VERIFIED LIVE — category page:** unknown-slug **404**; and "lists only the right published-in-category set" **VERIFIED against the seed roster** — narrowing held; the unpublished practitioner and the cross-category practitioner were both correctly excluded.
- **DOC CORRECTED + VERIFIED LIVE — city page:** the old line said "PostGIS radius" — **wrong**; D13 shipped **derive-on-the-fly + haversine, no PostGIS**. Center-derivation + haversine + per-page matched-city (A4) **VERIFIED** (Kiki shows Topanga on `/in/topanga`, Ubud on `/in/ubud`); radius **include/exclude across practitioners** **VERIFIED against the seed roster** — in-radius practitioners listed, out-of-radius excluded.
- **VERIFIED LIVE — D15 virtual union + format/in-person-only composition:** toggle renders; the `format=virtual&city=X` backwards-failure guard returns non-empty; and the union adding an **out-of-radius virtual** practitioner **VERIFIED against the seed roster** (the TD4 reverify is satisfied for behaviour; the cities-table refactor remains open as debt).
- **VERIFIED LIVE — one shared spine:** category, city, search all call `hydrateCards(admin, ids)` **unchanged** (line 82); geo extracted to `deriveCityCenter`/`resolveByCenter` shared by city + search; city re-verified after the extraction.
- **VERIFIED LIVE — shared card + ratings (D14):** shared card reused on all three surfaces; the rating aggregate is **batched (no N+1)**; and a card **rendering a real star rating** **VERIFIED against the seed roster** — rated practitioners showed the correct average and count, and the rating did **not bleed** across practitioners (the partition held; an unpublished review was excluded from the aggregate).
- **VERIFIED LIVE — reviews page + report hook (D17):** empty state **VERIFIED**; **listing real published reviews featured-first** **VERIFIED against the seed roster** (featured row sorted ahead, real bodies rendered, unpublished review excluded); report-hook **write VERIFIED** (rows 1→2 append, dedupe-count, invalid review → no write/no leak). Report-hook **notify** remains **BELIEVED-FIRED, NOT observed** — count-gated and Resend is fire-and-forget with no local log; the one-email-on-first-report is verified by construction, not by watching an email land.
- **DEFERRED — AI search (D16):** deliberately not built; no AI route, no Anthropic call, no model string (verified absent). Structured search ships instead.
- **VERIFIED LIVE — location hits blocks:** search/city location filters query `availability_blocks`; `practitioners` is touched only for the published gate.
- **VERIFIED LIVE — psychedelic disclaimer:** the `modality.slug === 'psychedelic-facilitation'` check **fired** for the seed roster's psychedelic-facilitation practitioner (disclaimer rendered) and stayed absent for the others — **VERIFIED against the seed roster**.
- **DOC CORRECTED + VERIFIED — client pattern:** the old line said "public reads use the regular server client" — **overridden** by Option A / TD3: RLS denies anon, so **discovery reads use the SERVICE-ROLE client** (the module is the public gate; published/active filters are security properties). Reads leak-checked; report **write** uses service role. Corrected statement **VERIFIED LIVE**.
- **VERIFIED LIVE (by construction/review) — brand + tokens:** CSS-var/Tailwind only, no inline hex/fonts, no em dash, no standalone "discover," no exclamation in chrome — verified by review and leak/hex greps, not an automated lint.
- **CONSTRUCTION-ONLY — mobile:** responsive markup present (`grid-cols-1 sm:2 lg:3`, flex-wrap pills, collapsing filter row), but **never visually reviewed on a mobile viewport** (curl doesn't render).
- **DEFERRED — homepage (build item #1):** the 12-pill landing shipped at **`/explore`** (mount-portable via `DISCOVERY_HOME`), **not** at `/`. `/` is still the holding page. The real homepage at `/` is **deferred, pending holding-page retirement** — not shipped.

### Carried debts — all confirmed still in decisions.md
- Dashboard SESSIONS/AVAILABILITY **CRUD gap** (pre-launch blocker) ✓
- **TD1** token encryption ✓ · **TD2** pending_approval calendar ✓ · **TD3** RLS-bypass discovery reads ✓ · **TD4** cities table + D15 reverify ✓ (note: TD4 is **duplicated** in decisions.md — two near-identical entries, worth a dedupe)
- **OAuth-callback-lands-on-PROFILE** cosmetic item ✓

### Data-dependent proofs — now SATISFIED (multi-practitioner seed run, June 2026, since torn down)
The behaviours that "one seeded Kiki" could not prove were exercised against a 6-practitioner roster and **all passed**:
- ≥2 **published** practitioners across modalities and cities → category/city/search narrowing and exclusion **VERIFIED**.
- a **`psychedelic-facilitation`** practitioner → disclaimer **fired**.
- **published reviews** rendered on a card and on the reviews page → D14 display + featured-first **VERIFIED**.
- a **virtual practitioner outside the in-person radius** → D15 union **VERIFIED**.
- an **unpublished** practitioner (and an unpublished review) → published-only security filters **excluded them**.
The roster was then torn down clean (no orphaned auth users; Kiki's fixtures intact).

### Still NOT launch-trustworthy (no seed can settle these)
- **Dashboard SESSIONS/AVAILABILITY CRUD** — the Standing Constraint above. Discovery is verified, but it sits on top of a catalogue practitioners cannot self-build. This is the launch blocker.
- **Mobile visual review** — responsive markup present, never viewed on a real mobile viewport (curl doesn't render).
- **Observing the Resend report notice deliver** — the write is verified; the email firing is believed-by-construction, not observed landing.
- Pre-launch security gates: **TD1** token encryption · **TD3** RLS-bypass discovery reads.

---

## Out of Scope / Comes Next

- **The Sages program** — curator user type, curated recommendation pages, invitation flow. Large enough to be its own phase.
- **Premium-tier features** — priority search placement, email marketing tools, rebooking automation, analytics. **Blocked on subscription billing being switched on** (today every practitioner is `basic` at no charge). Activating Stripe Billing + tier enforcement is a prerequisite workstream, not a Phase 5 add-on.
- **Full admin moderation console** — beyond the minimal report hook from item 7 / D17.
- **Inquiry threading / in-app reply UI** — extends the Phase 4 INQUIRE path.
- **AI search v2** — conversational UI, model re-ranking, per-practitioner LLM scoring.
