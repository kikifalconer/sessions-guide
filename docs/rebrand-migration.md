# guides'space — Rebrand Migration Register

Everything that changes because the name and domain changed. IDs are stable (`BRAND-n`); reference them in commits and findings. Mark **RESOLVED (date, evidence)** — never delete a row.

Created 2026-08-21. Companion to `brand.md` (what the brand *is*) — this file is what it *costs*.

---

## The one thing to read first

**The domain change invalidates in-flight infrastructure work.** The audit's highest-leverage item, TD9, was "verify `sessions.guide` in Resend." That DNS work now points at a domain the product is leaving. The same applies to the Supabase redirect allowlist, the Google OAuth redirect URI, the Stripe webhook endpoint, and `NEXT_PUBLIC_SITE_URL`.

**Stop any `sessions.guide` DNS or config work before doing it twice.** Every Track A item in `backend-audit-plan.md` needs its host re-checked before execution.

**`docs/design/*.md` predate this file and are stale on brand/domain.** `design-system.md`, `landing-rebuild-plan.md`, `join-sessions-rebuild-plan.md`, `redesign-plan.md`, and `explore-rebuild-plan.md` are all dated 2026-08-06 to 2026-08-14 — before the 2026-08-19 rebrand this register exists to track. Anything domain- or brand-name-specific in them (canonical URLs at `sessions.guide`, page titles ending `| sessions.guide`, "Sessions Guide Inc." as the working name) is stale by definition. Their architectural and content analysis may still be relevant — that's a separate, per-document question, not resolved by this note.

---

## 🔴 Blocking — host-bound config

| ID | Item | Detail |
|---|---|---|
| BRAND-1 | Trademark clearance on `guides'space` | The old mark died of an uncleared conflict. Pull USPTO + CIPO on "guides space" / "guidesspace" and engage the Canadian trademark agent **before** the domain is announced or invite codes go out. Do not contact any conflicting registrant proactively. |
| BRAND-2 | TD9 retarget | Resend domain verification must target `guidesspace.com`. `RESEND_FROM_EMAIL` → `hello@guidesspace.com`. Re-observe one delivery per flow after. **Highest-leverage item on the register** (F-17). |
| BRAND-3 | Canonical host decision | www vs apex on `guidesspace.com`. Must be settled before BRAND-4/5/6/7. The previous project used www; carrying that forward is the low-risk default. |
| BRAND-4 | Supabase redirect allowlist | Auth → URL Configuration. Site URL + redirect list move to the new host. Old-host entries removed only after cutover. Host must match `NEXT_PUBLIC_SITE_URL` exactly. |
| BRAND-5 | Google OAuth redirect URI | `GOOGLE_REDIRECT_URI` → `<new host>/api/google/callback`, updated in GCP console **and** Vercel. |
| BRAND-6 | Stripe webhook endpoint URL | Endpoint URL moves to the new host. Endpoints are **mode-scoped**. Live-mode registration is a separate go-live step (STRIPE-LIVE). |
| BRAND-7 | `NEXT_PUBLIC_SITE_URL` | Production value in Vercel. Feeds canonical tags, sitemap, JSON-LD `url`, email links, and `seeker_token` cancel/review links. |

## 🟠 Open decisions

| ID | Decision | Notes |
|---|---|---|
| BRAND-8 | Center of the shared homepage message | The guides themselves · sovereignty · curation · the act of being guided. Blocks homepage copy. |
| BRAND-9 | Founder attribution on the homepage | Named with the 12-year story · unnamed "we" · no founder presence. |
| BRAND-10 | Hero register | Elevated · Warm · Plain · Elevated hero + Warm body. |
| BRAND-11 | Old-domain disposition | Redirect `sessions.guide` → new host, or let it lapse. Decide before renewal. |
| BRAND-12 | Curator concept scope | Does the Curator layer ship at launch, or park until there are guides to curate? Affects `/sages/[slug]` copy and the sage-code invite mechanism. |

Carried forward, still open: tier prices · invite mechanism · the "Trial" tier name · whether to sell Alchemist now · whether "we reply to everyone" can be promised.

## 🟡 Copy & surface sweep

| ID | Item | Detail |
|---|---|---|
| BRAND-13 | `BRAND_NAME` constant | Create `src/lib/brand.ts` per `brand.md`. Grep gate: the literal mark appears only in that file. |
| BRAND-14 | Sage → Curator display sweep | All user-facing "Guide" copy that meant *Sage* becomes "Curator". Code identifiers untouched. Highest collision risk in `/sages/[slug]`, sage-code redemption copy, recommendation UI. |
| BRAND-15 | Practitioner → Guide display sweep | Public surfaces. **Amended 2026-08-27:** "practitioner" is permitted when enumerating kinds of guides; never as the standalone term. See `brand.md` lexicon. |
| BRAND-16 | Seeker → split register sweep | Guide-facing → "clients"; client-facing → second person. Code identifiers untouched. |
| BRAND-17 | Metadata rewrite | Convention: lowercase titles, pipe separator, new brand suffix. Keep "wellness" in metadata. |
| BRAND-18 | Email templates | 23 templates across six categories. Brand name, from-address, links. Four blocked on GAP-1; one needs the unbuilt reminder cron. |
| BRAND-19 | robots.txt | **Checked 2026-08-27, still open.** `DISALLOWED` has `/join$` + `/join/`; neither matches `/join-guidesspace` (no hyphen after `join` for `/join$`, no trailing slash for `/join/`) — verified statically and live via `curl localhost:3000/robots.txt`, all 10 user-agent blocks. The invite page is correctly crawlable, same as under the old `/join-sessions` name; no new `DISALLOW` rule is needed. Checked other invite-adjacent routes for the same "unanchored prefix" hole `/join` used to have against `/join-sessions`: `/api/verify-invite` (covered by `/api/`) and `/join/steps/*` (covered by `/join/`) are both correctly blocked; no other top-level route shares a hyphen-prefix relationship with a bare entry (`/dashboard`, `/login`, `/api`). Unrelated: `Disallow: /onboarding` blocks a route that doesn't exist anywhere in `src/app` — dead entry, not part of this item. Open only because it hasn't been given a final "closed, no action needed" disposition, not because anything is broken. |
| BRAND-20 | Reserved-slug guard | Must track top-level segments. Confirm no brand-derived route collides with an existing practitioner slug. |
| BRAND-21 | Fixture gating | `isFixture` / `isIndexableProfile` allowlist carries forward unchanged. |
| BRAND-22 | SEO baseline reset | Prior audit scored 4/10 SEO, 4/10 GEO, 5/10 AEO. A new domain resets authority to zero. |

---

## What does *not* change

- **The schema.** Display-copy rebrand only. No migration, no column rename, no data change.
- **The decision index.** D1–D27 stand.
- **The audit.** Every finding in `audit-track-b-findings.md` is still live.
- **The phase order.** Backend still gets proven before storytelling.
- **The Phase 0 thesis.** The code is in good shape; the configuration is not.

---

## Tracked debt

| ID | Item | Detail |
|---|---|---|
| DEBT-4 | Curve dividers baked into image pixels | `public/images/landing/landing1.jpg` and `landing2.jpg` have the landing page's S-curve section divider baked directly into the JPEG pixels — the cutout region is filled with a flat color matching `--color-bg` (`#eae5df`) so it blends seamlessly, verified by pixel-sampling and visually in the running browser. No CSS-level fix exists if that color ever drifts, since the divider isn't CSS in this implementation. **Trigger to act: any change to `--color-bg` in `src/app/globals.css`.** When that happens, these two images need re-exporting from source with the curve re-composited at the new color, or the divider needs rebuilding as a `clip-path`/mask utility so it tracks the token instead of a fixed pixel value. |

---

## Resolved

| ID | Resolution |
|---|---|
| BRAND-20 | **RESOLVED (2026-08-27).** Live query returned no rows for `'join-sessions'`/`'join-guidesspace'` in `practitioners.slug`. No existing practitioner profile is shadowed by the static `/join-guidesspace` route. `RESERVED_SLUGS` in `src/lib/slug.ts` keeps both slugs reserved going forward. |
| F-1 | **RESOLVED (2026-08-27).** Waitlist table exists; `createAdminClient` (service-role, bypasses RLS) is in use in `src/app/api/waitlist/route.ts`; a live submission was written and confirmed — count 4. The earlier RLS-with-no-policies hypothesis didn't hold: the route has always used the service-role client. |
