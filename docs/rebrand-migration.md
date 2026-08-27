# guides'space — Rebrand Migration Register

Created 2026-08-27. IDs are stable (`BRAND-n`); reference them in commits.
Mark **RESOLVED** (date, evidence) — never delete a row.

> A fuller version of this register exists outside the repo and will be
> merged in later. This file is not the whole register — don't assume an ID
> is unused just because it doesn't appear here yet.

---

## BRAND-19 — robots.txt / invite-page crawlability

**Status: open** (not broken — logged as open because it hasn't been given
a final "closed, no action needed" disposition, not because anything is
wrong today).

**What I found (2026-08-27):** `src/app/robots.ts`'s `DISALLOWED` array has
`/join$` (exact) and `/join/` (prefix). Neither matches `/join-guidesspace`
— confirmed both statically (source read) and live (`curl localhost:3000/
robots.txt` against the running dev server, all 10 user-agent blocks share
the array). The invite page is correctly crawlable, same as it was under
the old `/join-sessions` name. No new `DISALLOW` rule is needed — the
existing `$`-anchored pair already does the right thing for the new route
name; this was already fixed in an earlier pass (see
`docs/design/join-sessions-rebuild-plan.md` §1) against the old route name,
and only the file's own comment needed updating for the rename (done in the
route-rename commit).

Checked other invite-adjacent routes for the same "unanchored bare prefix
over/under-matches a hyphenated sibling" hole that `/join` used to have
against `/join-sessions`: `/api/verify-invite` (covered by the blanket
`/api/` rule) and `/join/steps/*` (covered by `/join/`) are both correctly
blocked. No other top-level route shares a hyphen-prefix relationship with
a bare `DISALLOW` entry (`/dashboard`, `/login`, `/api`) the way `join`/
`join-guidesspace` did.

One unrelated thing found in the same array, not part of this ticket:
`Disallow: /onboarding` blocks a route that doesn't exist anywhere in
`src/app` — dead entry, harmless, not a hole.

---

## BRAND-20 — reserved-slug guard for `join-guidesspace`

**Status: RESOLVED (2026-08-27).** Live query returned no rows for
`'join-sessions'`/`'join-guidesspace'` in `practitioners.slug`. No existing
practitioner profile is shadowed by the static route. `RESERVED_SLUGS` in
`src/lib/slug.ts` keeps both slugs reserved going forward so no future
practitioner can claim either.

---

## F-1 — waitlist POST 500 / migration 0005

**Status: RESOLVED (2026-08-27).** Waitlist table exists, `createAdminClient`
(service-role, bypasses RLS) is in use in `src/app/api/waitlist/route.ts`,
and a live submission was written and confirmed — count 4. The earlier
concern that RLS-with-no-policies was blocking an anon-client write did not
hold: the route has always used the service-role client, which bypasses RLS
entirely (confirmed by direct code read of `src/lib/supabase/admin.ts`).

---

## DEBT-4 — curved dividers are baked into image pixels, locked to `--color-bg`

**Status: open, no trigger yet.** `public/images/landing/landing1.jpg` and
`landing2.jpg` have the landing page's S-curve section divider baked
directly into the JPEG pixels — the cutout region is filled with a flat
color matching `--color-bg` (`#eae5df`) so it blends seamlessly with the
page background, verified by pixel-sampling and by visual check in the
running browser (zero seam). This was a deliberate choice over building a
`clip-path`/SVG-mask utility, since the source images already carry the
divider and no other section needs one.

**The coupling this creates:** the divider only blends because the color
baked into the JPEGs matches `--color-bg` exactly. There is no CSS-level
fix if that ever drifts — the divider isn't CSS in this implementation.

**Trigger to act:** any change to `--color-bg` in `src/app/globals.css`.
When that happens, these two images need re-exporting from source with the
curve re-composited at the new color, or the divider needs rebuilding as an
actual `clip-path`/mask utility so it tracks the token instead of a fixed
pixel value.

---

## Note — `docs/design/*.md` predate the Aug 19 rebrand

`docs/design/design-system.md`, `landing-rebuild-plan.md`,
`join-sessions-rebuild-plan.md`, `redesign-plan.md`, and
`explore-rebuild-plan.md` are all dated 2026-08-06 to 2026-08-14. The
rebrand from `sessions.guide` to `guides'space` (commits `8bf74a8`,
`8d6276b`) landed 2026-08-19 — after every one of these docs was written.
Anything domain- or brand-name-specific in them (canonical URLs at
`sessions.guide`, page titles ending `| sessions.guide`, "Sessions Guide
Inc." as the working name) is stale by definition. Their architectural and
content analysis may still be relevant — that's a separate, per-document
question, not resolved by this note.
