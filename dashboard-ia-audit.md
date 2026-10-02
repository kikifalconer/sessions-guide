# Guide Dashboard — Information Architecture Audit

Read-only inventory. No files modified, no components created. Produced 2026-09-17.

**Docs read first, per instructions:**
- `CLAUDE.md` (root) → points to `AGENTS.md`. No dashboard-specific content there.
- `ux-principles.md` — **does not exist anywhere in `docs/` or the repo root.** Could not read it. Flagging rather than silently skipping: if this file exists somewhere outside this checkout, none of its content informed this audit.
- `docs/known-issues.md` — read in full (dated 2026-07-26 at the top; no newer register found). Referenced throughout below by ID.

---

## 0. Lead finding — the file this audit was asked to start from no longer exists

Instruction 1 asks to read `src/app/**/DashboardShell.tsx` and its tab components. **`DashboardShell.tsx` does not exist anywhere in the current tree** (`find src -iname "DashboardShell.tsx"` returns nothing). It was deleted — uncommitted, still shows as a pending `D` in `git status` — and replaced with a real per-route dashboard under `src/app/dashboard/(guide)/`, plus a mobile bottom-tab-bar + hamburger layer on top of that. This happened before this audit task was written; the eight-tab, `useState`-driven shell this brief describes is not what's running.

To still answer instruction 1 faithfully, I pulled the last committed version of `DashboardShell.tsx` from git history (`git show 6b9bb0c:src/app/dashboard/DashboardShell.tsx` — commit `6b9bb0c`, "Swap sitewide typefaces...", the last commit that touched it) to document what each old tab actually rendered, then mapped each to its current equivalent. **The old shell had seven `SECTIONS` entries, not eight**: `PROFILE, SESSIONS, AVAILABILITY, CLIENTS, REVIEWS, SETTINGS, MY SESSIONS`. There was never a separate `BOOKINGS` tab — instruction 1's list of eight includes one that never existed as such; `MY SESSIONS` was the closest thing (seeker-side bookings + reviews the practitioner had written as a client).

---

## 1. Old tab inventory — then vs. now

| Tab (old `SECTIONS` name) | Old file / render | Now: file path | What it renders today | Tables/columns touched (current) | Status |
|---|---|---|---|---|---|
| **PROFILE** | `ProfileSection.tsx` — just a "preview profile" link + publish button | `src/app/dashboard/(guide)/profile/page.tsx` | Full dashboard home: top bar + greeting, editable "YOUR PROFILE" card (name/modalities/portrait), upcoming reservations list, practice-stat tiles, a compact reservations calendar, a "sessions you booked" rail, and the Google Calendar connect panel folded in | `practitioners` (full_name, tagline, slug, photo_url, is_published — read+write), `practitioner_modalities` (read+write), `bookings` (several queries), `clients` (count), `session_types` (count/price), `availability_blocks` (recurrence_rule), `calendar_integrations` (read) | **Functional** — substantially expanded, not a 1:1 port |
| **SESSIONS** | `SessionsManager.tsx` | `src/app/dashboard/(guide)/sessions/page.tsx` (nav label now "SESSION TYPES") | Same `SessionsManager`/`SessionTypeForm` components, full CRUD | `session_types` (id, name, description, duration_minutes, format, modality_id, pricing_model, price, price_min, price_max, payment_method, cancellation_policy, confirmation_mode, photo_url, is_active), `practitioner_modalities` (read), `modalities`/`categories` (read) | **Functional**, unchanged in substance |
| **AVAILABILITY** | `AvailabilityManager.tsx` | `src/app/dashboard/(guide)/availability/page.tsx` | Same component, full CRUD | `availability_blocks` (id, format, location_place_id, location_display, location_lat, location_lng, recurrence_rule, start_date, end_date, start_time, end_time, timezone, is_active) | **Functional**, unchanged |
| **SETTINGS** (Google Calendar was its only content) | `CalendarSettings.tsx` | Folded into `src/app/dashboard/(guide)/profile/page.tsx` — no standalone SETTINGS route exists | Same connect/disconnect panel | `calendar_integrations` (read + write via `/api/google/connect` → `/api/google/callback`) | **Functional**, relocated — see §3 |
| **CLIENTS** | Placeholder — in `SECTIONS`/`HELPER_COPY`, **no render block existed at all** | `src/app/dashboard/(guide)/community/page.tsx` + `community/[clientId]/page.tsx` (relabeled "Community") | List sorted by `session_count`; detail page with contact info + an editable private-notes field | `clients` (id, seeker_id, guest_name, guest_email, notes, session_count, first_booked_at, last_booked_at), `seekers` (full_name), `auth.users` (email, via admin API) | **Functional** — went from zero render to fully built |
| **REVIEWS** | Placeholder — same as CLIENTS, in `SECTIONS`/`HELPER_COPY`, **no render block** | **No route exists.** No file under `src/app/dashboard/(guide)/` references the `reviews` table or has "review" in its name | — | — | **Absent** — was a placeholder (GAP-3), is now not even that; zero presence |
| **MY SESSIONS** | `SeekerBookings` + `SeekerReviews`, both rendered together | Split: `src/app/dashboard/(guide)/bookings/page.tsx` renders `SeekerBookings` only | Upcoming/past bookings where the practitioner is the *seeker* | `bookings` (via `loadSeekerData`, scoped by `seeker_id`) | **Partially carried forward** — see finding below |
| *(instruction's 8th item, "BOOKINGS" — never existed as a distinct old tab)* | — | `src/app/dashboard/(guide)/reservations/page.tsx` + `reservations/[bookingId]/page.tsx` (nav label "RESERVATIONS") — new, has no old-tab ancestor | Bookings where the practitioner is the one *being booked* | `bookings` (scoped by `practitioner_id`), `seekers` (name resolution) | **Functional**, new surface with no old-tab lineage |

**Finding — review-writing dropped out of the practitioner dashboard.** `SeekerReviews.tsx` (the component that lets a seeker write/see reviews they've submitted) is used in exactly one place site-wide: `src/app/account/AccountShell.tsx`. It is not imported anywhere under `src/app/dashboard/`. The old MY SESSIONS tab rendered `SeekerBookings` *and* `SeekerReviews` together; the current `/dashboard/bookings` only carries `SeekerBookings`. A practitioner who wants to review a guide they booked as a client now has to leave the guide dashboard and go to `/account` — that path still works, it's just no longer reachable from inside `/dashboard/*`.

---

## 2. Practitioner-editable fields, dashboard-reachable today

Found by grepping every `.update(`/`.upsert(` against `practitioners`, `practitioner_modalities`, `session_types`, `availability_blocks`, `clients`, `calendar_integrations`, `favorites` across `src/`, then confirming each call site's actual caller chain.

| Field | Table.column | Editor component | Reachable from dashboard? |
|---|---|---|---|
| Display name | `practitioners.full_name` | `DisplayNameEditor.tsx` → `saveNameTagline()` in `src/app/join/actions.ts` | **Yes** — `/dashboard/profile` |
| Tagline | `practitioners.tagline` | Same action, but no input field exposed on the dashboard card — carried through unchanged by `DisplayNameEditor`, never itself editable there | **No dedicated editor** — value is preserved, not changeable, from the dashboard |
| Portrait photo | `practitioners.photo_url` | `PortraitEditor.tsx` → `savePhotoUrl('photo_url', …)` | **Yes** — `/dashboard/profile` |
| Banner photo | `practitioners.banner_url` | `StepPhotos.tsx`, `join/actions.ts` `savePhotoUrl('banner_url', …)` | **No** — zero dashboard callers; only set during onboarding |
| Bio | `practitioners.bio` | `StepBio.tsx`, `join/actions.ts` `saveBio()` | **No** — zero dashboard callers; only set during onboarding |
| Links (link_1/2/3) | `practitioners.link_1`, `link_2`, `link_3` | `join/actions.ts` `completeOnboarding()` (onboarding step 6 only) | **No** — only usages outside `join/` are read-only: `src/app/[slug]/page.tsx` (public display) and `src/lib/seo/structuredData.tsx` (JSON-LD). No dashboard write path exists |
| Modalities (primary/secondary) | `practitioner_modalities` | `ModalitiesEditor.tsx` → `saveModalities()` in `join/actions.ts` | **Yes** — `/dashboard/profile` |
| Publish status | `practitioners.is_published` | `ProfileSection.tsx` → `publishProfile()` in `src/app/dashboard/(guide)/actions.ts` | **Yes** — `/dashboard/profile` (gated: requires real name, real slug, one primary modality) |
| Session types (all fields) | `session_types.*` | `SessionsManager.tsx`/`SessionTypeForm.tsx` | **Yes** — `/dashboard/sessions` |
| Availability blocks (all fields) | `availability_blocks.*` | `AvailabilityManager.tsx`/`AvailabilityBlockForm.tsx` | **Yes** — `/dashboard/availability` |
| Client notes | `clients.notes` | `NotesEditor.tsx` → `updateClientNotes()` in `community/actions.ts` | **Yes** — `/dashboard/community/[clientId]` |
| Google Calendar connection | `calendar_integrations.*` | `CalendarSettings.tsx` | **Yes** — `/dashboard/profile` |

**Finding — three onboarding-only fields have no dashboard editor at all**: `bio`, `banner_url`, and `link_1`/`link_2`/`link_3`. Once set (or left blank) during onboarding, there is currently no in-product way for a practitioner to change them. `tagline` is a fourth partial case — its value survives edits to other fields but has no exposed input anywhere.

---

## 3. Google Calendar panel + GAP-4 / UX-2

- **Panel**: `src/app/dashboard/(guide)/CalendarSettings.tsx`, rendered from `src/app/dashboard/(guide)/profile/page.tsx` (no standalone route — folded into PROFILE).
- **Connect entry point**: `/api/google/connect` (linked directly from the panel).
- **Callback**: `src/app/api/google/callback/route.ts`. Every branch — success, user-declined, bad state, session mismatch, nonce mismatch, token-exchange failure, DB-write failure — redirects to `dashboard('/dashboard/profile', …)`. There is no remaining path that lands on bare `/dashboard`.

**GAP-4 — confirmed RESOLVED against the current code**, with the fix committed in-file: the callback route carries its own comment, `"D28 / GAP-4: the calendar panel now lives on /dashboard/profile (folded in from the retired SETTINGS tab), so that's the default landing spot"`. `known-issues.md`'s GAP-4 text ("Cosmetic; fix requires URL-driven dashboard tabs") is itself now satisfied as a side effect — every dashboard "tab" is a real URL today, not a `useState` toggle (see §4) — but the known-issues register hasn't been updated to say so.

**"UX-2" does not exist.** I read `known-issues.md` in full; there is no UX-2 entry, and no UX-prefixed ID scheme anywhere in the register (IDs are `GAP-`, `TD-`, `OD-`, `SEEKER-DASH`, `STRIPE-LIVE`, `RL-1`). If UX-2 exists it's in a document outside this checkout (possibly the missing `ux-principles.md` — see the caveat at the top). Not fabricating a match for it.

---

## 4. Tab-state mechanism + link inventory

**Mechanism: 100% URL-driven, not `useState`.** The old `DashboardShell.tsx`'s `const [active, setActive] = useState<Section>('PROFILE')` no longer exists anywhere — confirmed by `grep -rn "tab="` across `src/`, which returns zero matches (no stale query-param tab links, no leftover client-state toggle pattern).

**Every place that links into a specific dashboard destination:**
- `src/app/dashboard/(guide)/DashboardSidebar.tsx` — the `NAV` array, 9 entries, driving both the ≥768px sidebar/rail and (as of the most recent pass) the source list for the mobile header's hamburger overflow items.
- `src/app/dashboard/(guide)/MobileTabBar.tsx` — 6-item fixed bottom bar, <768px only.
- `src/app/dashboard/(guide)/MobileMenu.tsx` — hamburger overflow (Calendar, Reservations, My Bookings), <768px only.
- `src/app/dashboard/page.tsx` — bare `/dashboard` is a server-side `redirect('/dashboard/profile')`, not a link, but it's the one remaining generic entry point (`resolveAuthDestination()` in `src/lib/authDestination.ts` sends any signed-in practitioner to plain `/dashboard`, which then redirects).
- Internal same-page links inside individual dashboard pages (e.g., `/dashboard/profile` links to `/dashboard/reservations`, `/dashboard/sessions`, `/dashboard/abundance`, `/dashboard/bookings`; `/dashboard/bookings` links back to `/dashboard/reservations`).
- **No file outside `src/app/dashboard/` links into a specific dashboard sub-route** — confirmed by grep; the only external entry point is the generic `/dashboard` redirect.

---

## 5. `/public/icons` inventory

Filenames and dimensions only, as instructed:

| File | Dimensions |
|---|---|
| `ACCOUNT.png` | 386×270 |
| `SESSIONS.png` | 386×270 |
| `BOOKINGS.png` | 386×270 |
| `AVAILABILITY.png` | 386×270 |
| `COMMUNITY.png` | 386×270 |
| `ABUNDANCE.png` | 386×270 |

Six files, uniform size, all added the same day (filesystem mtime one day before this audit). Names line up with five of the six proposed IA buckets below, but not exactly: `SESSIONS.png` for the proposed "MY OFFERINGS," `BOOKINGS.png` for the proposed "MY BOOKINGS." No separate asset exists for "REVIEWS" as its own concept (consistent with the proposed IA folding it into COMMUNITY). No icon exists for "SUBSCRIPTION"/billing as distinct from ABUNDANCE.

---

## 6. Old tabs → proposed IA mapping

| Proposed bucket | Status | Evidence |
|---|---|---|
| **ACCOUNT** (basic info, subscription, photos, bio) | **MIXED — do not read as one verdict** | Basic info (name/tagline): EXISTS, `/dashboard/profile`, §2. Subscription: EXISTS, `/dashboard/billing` — real Stripe checkout/portal (`BillingClient.tsx`), labeled "SUBSCRIPTION" today, not "Account." Portrait photo: EXISTS, `/dashboard/profile`. Banner photo: **NOT BUILT** (dashboard-side) — §2. Bio: **NOT BUILT** (dashboard-side) — §2. |
| **MY OFFERINGS** (session types) | **EXISTS**, under a different name | `/dashboard/sessions`, current label "SESSION TYPES" — §1 |
| **MY BOOKINGS** (as guide and as client) | **EXISTS, but fragmented across three surfaces** | As client: `/dashboard/bookings` ("MY BOOKINGS"). As guide: `/dashboard/reservations` ("RESERVATIONS") *and* `/dashboard/calendar` ("CALENDAR") — two separate current destinations for what the proposed IA treats as one side of one bucket. Review-writing that used to live alongside "as client" bookings is gone from the dashboard entirely — §1 finding. |
| **AVAILABILITY** | **EXISTS**, unchanged | `/dashboard/availability` — §1 |
| **COMMUNITY** (clients, reviews) | **MIXED** | Clients: EXISTS, `/dashboard/community` (+ detail + notes) — went from GAP-3 placeholder to fully built. Reviews: **NOT BUILT** — no route, no stub; GAP-3's placeholder is gone, not resolved — §1 |
| **ABUNDANCE** (earnings, billing) | **EXISTS, but billing is a separate destination** | Earnings: EXISTS, `/dashboard/abundance` (Stripe-only, month + all-time + paid-sessions list). Billing: EXISTS at `/dashboard/billing`, labeled "SUBSCRIPTION," not merged with Abundance — no cross-link between the two pages in either direction (grepped both files for `href=`, found none pointing at each other). |

**Net read**: every proposed bucket has *something* real behind it today — nothing is a total ghost — but only AVAILABILITY maps cleanly 1:1. The other five all either split across multiple current routes with different names (MY BOOKINGS, ABUNDANCE), carry a real gap inside an otherwise-built bucket (ACCOUNT's bio/banner, COMMUNITY's reviews), or both.

---

## Caveats, corrections, and out-of-scope notes

- **`ux-principles.md` could not be read — it isn't in this repo.** Any of its content that was meant to inform this audit didn't.
- **"UX-2" isn't a real ID** in the known-issues register as it stands (§3). Didn't fabricate a matching entry.
- **The instruction not to include TRADE or FAVOURITES was followed** — neither appears in the §6 mapping table. But the stated reason ("neither has schema") is **no longer accurate for favorites**: `supabase/migrations/0017_favorites.sql` exists, is applied to the live database, and backs a working feature (heart toggle on public practitioner profiles, list at `/account/favorites`). It has no presence in the *guide* dashboard specifically, which is likely why it's out of scope here — but flagging the factual gap in the premise rather than silently letting it stand, in case it matters for whatever this audit feeds into next.

  **CORRECTED 2026-09-17:** This line is about favorites — it does not say, and never said, that trade is real or shipped. Not deleting it, per instruction, and not walking back the favorites claim either (it's still accurate: 0017_favorites.sql is real and applied). Separately, on trade specifically, now confirmed directly against the current `docs/schema.md`: no `trade_requests` table, no `practitioners.open_to_trade` column, no `bookings.trade_request_id` column — none exist. Trade has no schema and nothing built. Whatever raised this concern, it isn't this line; if a claim that trade was shipped exists somewhere, it isn't in this document.
- Per instructions, this document proposes no designs and includes no new components — it's an inventory only.
