# Redesign Plan — Page-by-Page File Map

Blast-radius map for `/`, `/explore`, and `/join-sessions`. Written 2026-08-06 against
`main` @ `0f25f19`. Companion to [`design-system.md`](./design-system.md), which
inventories the token layer and flags what is hardcoded.

No application code has been changed. This document describes what exists and what
changing it would touch.

---

## The three things every page inherits

Before the per-page maps, this is the shared floor. Nothing on `/`, `/explore`, or
`/join-sessions` opts out of these.

| File | Reaches | What it provides |
|---|---|---|
| `src/app/layout.tsx` | **All 30 routes** | `<html>`, Typekit `<link>` (kit `zlm6tfg`), `globals.css` import, org + website JSON-LD, `<SiteFooter />`, and the site-wide `metadata` (title + description) |
| `src/app/globals.css` | **All 30 routes** | The entire token layer. `@font-face` for `SessionsGuide`, 8 color vars, 3 font vars, `@theme inline` export, the `h1`-`h6`/`p` type scale, `.caption`, `.label`, `.btn-primary`, `.btn-secondary` |
| `src/components/site-footer.tsx` | **All 30 routes** (via layout) | Olive field, 3 link columns, bottom bar |

There is exactly **one `layout.tsx`** in the project. No route groups, no nested
layouts. So `layout.tsx` and `globals.css` are the two highest-blast-radius files in
the repo, and the footer is third.

---

## `/` — Landing

### Route file

`src/app/page.tsx` — 211 lines, `'use client'`, default export `LandingPage`.

### What it renders

| Element | Source | Shared? |
|---|---|---|
| `<SiteFooter />` | injected by `src/app/layout.tsx` | **Yes — all 30 routes** |
| `.btn-primary` ×3 | `globals.css:112` | **Yes — 37 uses / 30 files** |
| `.label` ×6 | `globals.css:103` | **Yes — 267 uses / 43 files** |
| `const FIELD` | **local**, `page.tsx:12` | No — but 5 near-duplicates elsewhere (see design-system §6) |
| `next/image` ×3 | framework | — |
| `next/link` ×1 | framework | — |
| raw `<img>` ×1 | `page.tsx:78`, wordmark, `eslint-disable`d | No |
| Two inline `<form>`s + 4 `useState` hooks | **local** | No |

**No `SiteHeader`.** This is deliberate and documented — the "Shared Site Header"
decision in `decisions.md` says the header is "rendered per-page… **Not** injected into
the root layout, so the holding page at `/` stays header-free." `/` is the only public
marketing route without a header.

### Structure today

| Section | Lines | Content |
|---|---|---|
| 1 | 63-147 | Full-bleed `reikiHero2.jpg`, `bg-black/25` wash, full-width wordmark SVG, one-paragraph positioning line, **two side-by-side forms** (waitlist / invite code) |
| 2 | 149-184 | Two-column, `hands-magic.jpg` left, "Built from the inside." right, three paragraphs |
| 3 | 186-208 | Full-bleed `wing.jpg`, `bg-black/35` wash, `h1` "Making Lightworkers' Work Lighter" with inline color override, `LEARN MORE` → `/join-sessions` |

### External surfaces

- `POST /api/waitlist` (`src/app/api/waitlist/route.ts`) — inserts `{email}`
- `POST /api/verify-invite` (`src/app/api/verify-invite/route.ts`) → on success
  `router.push('/join')`
- Assets: `/sessions-logo-light.svg`, `/images/reikiHero2.jpg`,
  `/images/stockPhotos/hands-magic.jpg`, `/images/stockPhotos/wing.jpg`

### Inbound links — who breaks if `/` changes shape

`/` is the site's apply destination. Four `.btn-primary` CTAs elsewhere point at it:

| From | Line | Label |
|---|---|---|
| `src/app/pricing/page.tsx:93` | ×3 (one per tier card) | `APPLY` |
| `src/app/join-sessions/page.tsx:83` | | `APPLY FOR AN INVITATION` |
| `src/components/site-header.tsx:49` | | logo → home (all 22 header pages) |

The copy deck moves the apply form from the hero (section 1) to a dedicated close
(§10). **All four of those links become wrong the moment that happens** — they land the
visitor at the top of a long page with the form now at the bottom. They need to become
anchor links (`/#apply`) or the form needs to stay in both places.

### Blast radius of the deck's changes to `/`

| Deck section | Touches | Also affects |
|---|---|---|
| §1 Nav | `site-header.tsx` **and** `page.tsx` | **22 other routes.** See structural note below |
| §3 Proof strip, §4 Problem, §5 Hooks, §7 Founder | `page.tsx` only | nothing |
| §8 Breadth (12 pills) | `page.tsx` + extract pill from `explore/page.tsx` | `/explore` |
| §9 Pricing preview | `page.tsx`; deck sequence says fix `/pricing` first | `/pricing` |
| §10 Two closes | `page.tsx` + `waitlist` table migration | `/api/waitlist`, `/pricing` ×3, `/join-sessions` (inbound links above) |
| §11 Footer | `site-footer.tsx` | **All 30 routes** |
| A2 meta description | `layout.tsx:10` | **All 30 routes** (it is the site-wide default) |

**Structural note on adding the header to `/`.** `SiteHeader` is an `async` **server**
component — it awaits `createClient()` and `resolveAuthDestination()`. `page.tsx` is
`'use client'` top-to-bottom. A client component cannot render an async server
component. Putting the header on `/` requires one of:

1. Convert `page.tsx` to a server component and push the two forms into a client child
   (they are the only stateful parts — 4 `useState` hooks, 2 submit handlers). This is
   the clean version and it also sets up the §10 form extraction.
2. Compose in `layout.tsx` — rejected by the header decision above and would put a
   header on every route including `/`.

This is a real refactor, not a one-line import. Worth knowing before it is estimated as
"add the header."

---

## `/explore` — Discovery landing

### Route file

`src/app/explore/page.tsx` — 51 lines, `async` server component, default export
`ExplorePage`.

### What it renders

| Element | Source | Shared? |
|---|---|---|
| `<SiteHeader />` | `src/components/site-header.tsx` | **Yes — 22 routes** |
| └ `<HeaderNav>` | `src/components/header-nav.tsx` (client) | Yes — via SiteHeader only |
| `<SiteFooter />` | via `layout.tsx` | **Yes — all 30 routes** |
| Category pills | **inline** `<Link>` in a `.map()`, `page.tsx:31-39` | No — not extracted |
| `.caption` ×2, `.label` ×1 | `globals.css` | **Yes** |
| `categoryPath()` | `src/lib/routes.ts:8` | Yes — 1 other consumer |

### Data

One query, service-role client (`createAdminClient`, per TD3):
`categories → select('name, slug').order('sort_order')`. Category **names come from the
database**, not from a constant — which is why the Frequency question (open question 5)
is a data decision, not a copy edit.

### Structure today

`h2` "Find a practitioner who actually gets it." → one paragraph → `CATEGORIES` label →
flex-wrap of pills → a `SEARCH` link. Header, `max-w-[1200px]`, `px-6 py-16`. No hero
image, no `h1`, no cards. It is the plainest page on the site.

### Mount portability

`src/lib/routes.ts` exports `DISCOVERY_HOME = '/explore'`, with a comment stating the
landing "becomes `/` when the holding page retires" and that swapping it is a one-line
change. Two files import it: `search/page.tsx:48` and `in/[city]/page.tsx:57`, both
breadcrumbs. `categoryPath()` is fixed by D12 and does **not** move.

That D12 note was written when `/` was a temporary holding page. The copy deck reframes
`/` as a permanent practitioner-acquisition page with `EXPLORE` as a quiet secondary
door — which means the swap the comment anticipates may never happen. See open
question 6.

### Blast radius

- **Restyling the pill** — currently nine utility classes inline. Extracting it as a
  component is prerequisite to the deck's §8 (which claims the pill is "mostly a
  component you already have" — it is not). Once extracted: `/explore` + `/` §8, and
  `in/[city]`'s format toggle is a near-identical shape that should probably converge.
- **Changing the page's copy** — `page.tsx` only.
- **Adding hero/imagery** — `page.tsx` only; 12 category images already exist at
  `/images/categories/*` but are owned by `explore/[category]/page.tsx`'s
  `CATEGORY_HERO` constant.
- **Category descriptor fixes** (deck's four brand-voice violations) — those strings
  live in `explore/[category]/page.tsx:10-59`, **not** here. Different file, different
  page, unblocks flipping `EXPLORE` live.

---

## `/join-sessions` — Practitioner marketing

### Route file

`src/app/join-sessions/page.tsx` — 91 lines, server component, default export
`JoinSessionsPage`.

### What it renders

| Element | Source | Shared? |
|---|---|---|
| `<SiteHeader />` | `src/components/site-header.tsx` | **Yes — 22 routes** |
| └ `<HeaderNav>` | `src/components/header-nav.tsx` | Yes |
| `<SiteFooter />` | via `layout.tsx` | **Yes — all 30 routes** |
| `BENEFITS` const, 6 items | **inline**, `page.tsx:9-34` | No |
| `.btn-primary` ×1 | `globals.css` | **Yes** |
| `next/image` ×1 | `/images/stockPhotos/hands-magic-2.jpg` | — |

No local constants, no client state, no data fetching. The simplest of the three.

### Structure today

`h1` "Join Sessions" centered → full-width hero image (**no wash** — the only
full-width hero on the site without one) → centered intro paragraph → 2-column grid of
6 `h3`+`p` benefit blocks → hairline-bordered close, `h2` "Come inside.", `APPLY FOR AN
INVITATION` → `/`.

### The deck's relationship to this page

The deck does not redesign `/join-sessions`. It **harvests** it. §5 cuts the six
benefit cards to three hooks and relocates them onto `/`:

| Existing `BENEFITS` entry | Deck destination |
|---|---|
| Keep what you earn | `/` §5 hook ONE |
| Carry your practice with you | `/` §5 hook THREE |
| Get paid your way | folded into hook ONE |
| Spend your energy on the work | one line under `/` §5 |
| A calendar that tells the truth | same line |
| Reviews earned honestly | promoted to `/` §6 |

Plus a seventh hook ("Your clients are yours") that has no source card here.

**The deck does not say what `/join-sessions` becomes afterward.** The footer's §11
reorg keeps a link to it under `LIST YOUR PRACTICE → Why Sessions Guide`, so the page
survives — but its six-card body has been lifted onto `/`. See open question 9.

### Blast radius

- Editing `BENEFITS` or the copy — `page.tsx` only. **Nothing else imports this page.**
- The `APPLY FOR AN INVITATION` link at `:83` → `/` — breaks when `/`'s form moves to
  §10 (see the `/` inbound-links table).
- The nav needs `LIST YOUR PRACTICE → /join-sessions` flipped live, which is a
  `site-header.tsx` change hitting 22 routes, not a change here.

---

## Shared-component blast radius, consolidated

Sorted by reach. This is the "what am I about to break" table.

| File | Routes affected | Consumed by |
|---|---|---|
| `src/app/globals.css` | **30 (all)** | Everything. Token layer + type scale + `.btn-*` + `.caption`/`.label` |
| `src/app/layout.tsx` | **30 (all)** | Typekit link, footer injection, default `metadata` |
| `src/components/site-footer.tsx` | **30 (all)** | `layout.tsx` |
| `src/components/site-header.tsx` | **22** | `contact`, `privacy`, `join-sessions`, `in/[city]`, `terms`, `mission`, `explore`, `explore/[category]`, `search`, `dashboard` (+`DashboardShell`, `admin/pages` ×3, `billing`), `guides/[slug]`, `account`, `pricing`, `[slug]`, `[slug]/reviews`, `sages/[slug]`, `help`, `help/FaqPage` (→ `/help/practitioners`, `/help/seekers`) |
| `src/components/header-nav.tsx` | 22 (transitively) | `site-header.tsx` only |
| `src/components/PractitionerCard.tsx` | 4 | `explore/[category]`, `in/[city]`, `search`, `sages/[slug]` |
| `src/lib/routes.ts` | 3 | `explore`, `search`, `in/[city]` |
| `src/app/help/FaqPage.tsx` | 2 | `/help/practitioners`, `/help/seekers` |
| `src/app/page.tsx` | 1 | — but 4 inbound CTAs point at it |
| `src/app/explore/page.tsx` | 1 | nothing imports it |
| `src/app/join-sessions/page.tsx` | 1 | nothing imports it |

**Reading of this:** the three pages themselves are cheap to change — none of them is
imported by anything. The expensive changes are the four shared files at the top, and
the copy deck touches **three of them** (`globals.css` for the `h1`-on-dark variant,
`layout.tsx` for the meta description, `site-footer.tsx` for §11, `site-header.tsx` for
§1). Every one of those is a 22-to-30-route change dressed up as a copy edit.

### Suggested build order (from blast radius, not from the deck)

1. **Token/component work first, while it is cheap** — extract `Field`, `Pill`, and the
   email-capture form; add the `h1`-on-dark variant to `globals.css`; tokenize the hero
   wash. Doing this after three pages are rebuilt means retrofitting three pages.
2. **Fix `/pricing` against D24** — deck sequence item 6, and it is live and wrong
   today (`Trial`/`Basic`/`Elevated`, "Founding rate", "Verified reviews"). `/`'s §9
   preview should not be written against a pricing page that contradicts it.
3. **Correct the 12 category descriptors** in `explore/[category]/page.tsx` — deck
   sequence item 7, unblocks flipping `EXPLORE` live.
4. **`site-header.tsx` nav** — relabel + fix the three wrong hrefs, flip `EXPLORE` and
   `LIST YOUR PRACTICE` live. 22 routes, one file, done once.
5. **`site-footer.tsx`** §11 reorg. 30 routes, one file.
6. **`/` rebuild** — convert to server component + client form child, then build the
   eleven sections. Largest single piece of work.
7. **`/explore` and `/join-sessions`** last — both are small and both depend on
   decisions made upstream.

---

## Open questions

These change what I would build. I have not assumed answers to any of them.

**1. The copy deck path you gave does not exist.**
You said `docs/copy/sessions-guide-three-page-copy-deck.md`. There is no `docs/`
directory in the repo (I created `docs/design/` for these two files). The only copy deck
present is **`sessions-guide-landing-copy-deck.md` at the repo root** — untracked,
modified 2026-08-04, titled "Sessions Guide: Landing Page Copy Deck," eleven sections.
I worked from that one. Is it the right document, and is there a separate three-page
deck I have not seen? This matters because the deck I read covers `/` in depth and
`/explore` and `/join-sessions` only glancingly — which is why the per-page maps above
are thinner for those two.

**2. Which page background is canonical: `#eae5df` or `#F4F1ED`?**
`globals.css` ships `#eae5df`. `context files/design-system.md` specifies `#F4F1ED`
("Warm Sand"). These are visibly different. Since `--color-bg` is the site's dominant
surface, I don't want to guess.

**3. Which hero candidate — A, B, or C?**
Deck sequence item 1: "Nothing else can be finalized until this lands." It determines
the `h1` on `/`, the site-wide meta description in `layout.tsx:10`, and whether the
lightworker line is the hero or the close. It also determines whether the display font
needs an on-dark variant at hero scale (candidates A and B are long; C is short).

**4. `ENERGY HEALING` or `FREQUENCY`?**
Flagged in the deck's §8. Worth adding: this is **not a copy edit**. `/explore` renders
`c.name` straight from the `categories` table, so changing the pill label means either a
DB update or a display-name mapping layer. And if the `slug` changes too, `/explore/energy-healing`
is a live URL with JSON-LD and a sitemap entry. My recommendation: if you want
"Frequency," change `name` only and leave `slug` alone.

**5. Does `/explore` stay at `/explore`, permanently?**
`src/lib/routes.ts` and D12 both anticipate `/explore` being promoted to `/` when the
holding page retires. The copy deck instead treats `/` as a permanent practitioner
acquisition page with `EXPLORE` as a small secondary door. If the deck's framing wins,
the mount-portability note in `routes.ts` is dead and should be retired so nobody acts
on it later.

**6. Is the comparison table a real table, or three columns?**
Deck §9 shows a markdown table but the prose says "three inline columns, sand
background, **no card borders**." Today `/pricing` renders bordered `bg-surface` cards.
There are zero `<table>` elements in the entire codebase. A real `<table>` with hairline
rules and a three-column borderless grid are different components with different
responsive behavior (a table needs horizontal scroll on mobile; a grid stacks). Which
do you want, and is `/pricing` getting the same treatment or staying as cards?

**7. Where do the quiz/three-questions and city row come from?**
You listed both as components to build. **Neither appears anywhere in the copy deck**,
and I found no design reference for either in `brand-voice.md`, `product-spec.md`, or
`decisions.md`. I have flagged them in `design-system.md` §9 as missing, but I can't
scope them without knowing: what are the three questions, what do they do with the
answer (filter to `/search`? a recommendation? just email capture?), and is the city row
a list of launch markets (the deck's §3 fallback offers "UNITED STATES · AUSTRALIA ·
INDONESIA") or the derived city list from `derivableCities()`? Are these from the
`sessions-guide-ux-story-audit.md` at the repo root, which the deck references but which
you did not ask me to read?

**8. What happens to `/join-sessions` after §5 harvests it?**
The deck moves three of its six benefit cards to `/` and rewrites the other three into
one line, but never says what the page becomes. The footer reorg keeps a link to it
(`Why Sessions Guide`), so it survives. Does it become the long-form practitioner case
(the full six benefits, plus what does not fit on `/`), or does it get cut down to
avoid repeating `/`?

**9. Where does the apply form live, and do the four inbound CTAs follow it?**
`/pricing` ×3 and `/join-sessions` ×1 all link to `/` expecting the form at the top. The
deck's §2 has a primary CTA that "opens the email field inline, **or** scrolls to
section 10" — those are different builds. Which, and should the four inbound links
become `/#apply` anchors?

**10. Should the three held-out nav links be fixed now or left alone?**
`EXPLORE → '/'`, `FOR PRACTITIONERS → '/join'`, and `ABOUT → '/about'` all have wrong or
nonexistent hrefs (correct: `/explore`, `/join-sessions`, `/mission`). They are inert
under `live: false`, so this is not a live bug. But the deck's §1 flips two of them on,
and `decisions.md` is explicit that a nav link must never point at a route that does not
resolve. Fix all four hrefs in the same pass, or only the two being flipped live?
(`SAGES → /sages` still has no index route and must stay `live: false` either way.)

**11. Do `.caption` and `.label` stay as two names for one rule?**
They are byte-identical in `globals.css` and used interchangeably across 400+
applications. Collapsing them to one is a mechanical find-and-replace now and gets
harder with every page built. Or do you want them to diverge — `.label` for form and
section labels, `.caption` for smaller supporting text?

**12. Should `.btn-primary` become a real Button component?**
It is a CSS class applied to both `<button>` and `<Link>`, with no disabled, loading, or
`focus-visible` state. `/`'s forms already need a pending state and currently fake it by
swapping the label to `SENDING`. §10 adds two more forms. This is the moment it is
cheapest to fix, but it is a scope call, not a copy-deck requirement.

**13. Confirm out of scope: `/pricing` and the `waitlist` migration.**
You scoped me to `/`, `/explore`, `/join-sessions`. Two hard dependencies sit outside
that: `/pricing` contradicts D24 today (deck sequence item 6, must land before `/`'s §9
preview), and `/`'s §10 seeker capture needs a `waitlist` schema change — the table has
a unique constraint on `email` and `/api/waitlist` special-cases the `23505` collision,
so a single person signing up on both sides gets rejected. Both are real blockers for
`/`. Are they mine, or someone else's?
