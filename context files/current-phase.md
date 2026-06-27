# sessions.guide — Current Phase

Rewrite this file at the start of each new phase. Claude Code reads this to understand what is being built right now and what the finishing line looks like.

---

## Phase: 5 — Seeker Discovery & Search — COMPLETE (verified, June 2026)

**Status: COMPLETE on the structured discovery layer (the six pieces below), confirmed by runtime tests against live seed data, not by assertion. AI / natural-language search was descoped and moves to Phase 6.**

This file **replaces** the prior contradictory version. A previous copy committed under the "Phase 4 complete" commit (`177df9e`) was a palimpsest: a "Phase 5 plan / Phase 4 not yet built" head stapled to a "Phase 5 COMPLETE AND VERIFIED" tail, neither reconciled against the code on disk. That version is retired. The completion claim below is the reconciled, verified one.

When Phase 6 begins, rewrite this file. Durable debt and decisions live in `decisions.md`, never here.

---

## How This Was Verified (basis, not assertion)

Phase 5 sat in a doc that overstated completion, so it was not promoted to "done" until exercised. Three read/runtime passes were run (this project's audit-first rule; phase docs are aspirational until a diagnostic confirms live build state):

1. **Static diagnostic** — read every Phase 5 route, the shared query module, components, migrations. Established the six structured pieces exist and route through one module.
2. **Runtime data + SSR pass (11/11 PASS)** — drove the real `discovery.ts` / `reviews.ts` functions against live Supabase through the service-role public gate, plus an SSR route pass on the dev server. The load-bearing adversarial case passed at both layers: a city search at Eli's coordinates returns Eli and excludes Fay (unpublished, identical coordinates), confirmed in the actual `/in/topanga` HTML.
3. **Report-hook runtime test (PASS)** — drove the real `reportReview` action: gate → insert → first-report notice → dedupe on second report (append-only: second row written, notice suppressed) → negative-case rejection (unpublished / nonexistent / empty id all rejected, no leak) → teardown to zero rows.

**One honest caveat carried out of pass 3:** the report-notice *write path and dedupe* are runtime-observed, but actual email *delivery* is blocked in this environment by the Resend sandbox sender config. See TD9 in `decisions.md`. The code path is correct; delivery is an env/config gate, not a Phase 5 defect.

---

## What Shipped (the structured six — verified)

1. **Homepage / discovery entry** — 12 category pills from `categories`, ordered by `sort_order`, mounted at `/explore` (`routes.ts: DISCOVERY_HOME`, marked mount-portable). Root `/` is the pre-launch holding page (waitlist + invite gate), by design. SSR 200, labels render.
2. **Category pages — `/explore/[category]`** — `discoverPractitioners({ categorySlug })`; published-only with a modality in that category; unknown slug → `notFound()`. Verified: `energy-healing` returns Bea + Cal, excludes the unpublished reiki practitioner.
3. **City pages — `/in/[city]`** — `discoverInCity`; radius over active in-person/`both` blocks plus virtual per D15; 404 on unknown city. Radius semantics: see deviation 2 below.
4. **Search + filter** — `discoverSearch` over modality / format / location; the in-person-only control is `?in_person=1`, identical on `/search` and `/in/[city]`, and returns the same in-person set at runtime (not just at the URL layer). Structured filtering only; no AI affordance (descoped).
5. **Practitioner result card** — one shared `PractitionerCard` used by every surface; name, primary-modality label, city-only location (no full address pre-booking), rating read from the discovery aggregate (no per-card re-query).
6. **Full reviews page + report hook — `/[slug]/reviews`** — published reviews, featured first; `reportReview` action (service-role, `is_published`-gated, append-only, first-report-deduped notice). Write path + dedupe runtime-observed.

Psychedelic-facilitation disclaimer: auto-triggers by modality slug wherever that modality surfaces. No seed row currently carries `psychedelic-facilitation`, so this is confirmed by code path, not by a live render. Re-confirm when such a practitioner exists.

---

## Deviations From the Original Plan (logged, not bugs)

The original plan made assumptions the build diverged from. None are defects; each is captured so nobody "fixes" intended behavior later.

1. **Radius is haversine, not PostGIS.** `discovery.ts` does a derive-on-the-fly haversine with a bbox prefilter and `CITY_RADIUS_KM`. It self-flags this as **TD4** (revisit with a `cities` table + PostGIS at scale). The plan's "PostGIS radius" finishing-line wording is met in behavior, not in implementation.
2. **No `cities` table; city pages mean "within `CITY_RADIUS_KM` of any block labeled that city," not exact-city match.** `discoverInCity('topanga')` correctly returns Bea (Santa Monica, ~13 km) because she is inside the 50 km radius. This is **D13 / TD4** working as designed, not a bug. Intended behavior.
3. **Rating metric computed in three places, not shared code.** Profile page, `discovery.ts` hydrateCards, and `reviews.ts` each derive it independently. The D14 *performance* goal holds (no N+1); the *logic* is triplicated and can drift → **TD8** in `decisions.md`.
4. **Discovery home is `/explore`, not `/`.** Root `/` is the holding page (waitlist + invite). `DISCOVERY_HOME` is mount-portable, so `/explore` can graduate to `/` at launch without a rewrite.

---

## Not Built — Deferred to Phase 6

- **AI / natural-language search.** Descoped from Phase 5 by decision. No NL route exists in `src/app/api`; search is a structured GET form. If revived, the plan stands: a filter-extraction route that turns free text into structured filters and runs them through the *same* `discovery.ts` module (confirm the current API model string at build time). Parks with AI search v2 in Phase 6.

---

## Carried Forward — Still Live, Do Not Drop

Durable records live in `decisions.md`; this list exists so the phase transition does not bury them.

- **CRUD gap (pre-launch blocker, outranks everything).** No create/edit/delete UI for session types or availability blocks; they exist only via seed/SQL. Discovery now cleanly surfaces practitioners who cannot self-build a bookable catalog through the product. This is the most important thing the product still cannot do.
- **Email deliverability is currently broken for seekers → TD9.** `RESEND_FROM_EMAIL` is Resend's sandbox sender, which delivers only to the account owner. All transactional mail shares this var, so in the current config no seeker-facing email delivers: booking confirmation, payment, cancellation/refund, review request, inquiry, report notice. This **compounds** the standing gap that self-cancel and review have no on-screen fallback (D1) — today a guest seeker cannot cancel or review at all. Pre-launch gate.
- **TD1 — plaintext refresh-token encryption.** Calendar refresh tokens stored plaintext. Hard pre-launch gate.
- **TD2 — outbound calendar skips `pending_approval` bookings** until the approval-confirm flow is built.
- **Deferred-UI pile:** shareable booking-confirmation page; on-screen self-cancel affordance / booking-history page; OAuth connect callback lands on dashboard PROFILE not SETTINGS.

Cross-check `decisions.md` as the source of truth for D12–D19 and TD3–TD9; do not restate their content from memory.

---

## Comes Next (separate decision — do not presume)

Phase 6 scope is not set here. The open question is sequencing, and two items compete:

- **Dashboard SESSIONS / AVAILABILITY CRUD** — the named pre-launch blocker. Until it ships, the marketplace is not launch-ready regardless of how polished discovery is.
- **TD9 email-sender fix** — small, env-only, but gates every seeker-facing transactional flow. Cheap to clear; high impact.

Both outrank reviving AI search. Pick the next phase deliberately, then rewrite this file.
