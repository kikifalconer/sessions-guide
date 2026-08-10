# Landing Page (`/`) Rebuild — Plan

Against **Page 1** of `~/Downloads/sessions-guide-three-page-copy-deck.md` (drafted
2026-08-06). Companion to [`design-system.md`](./design-system.md) and
[`redesign-plan.md`](./redesign-plan.md).

**Status: awaiting approval. No code written.**

---

## 0. Deck location, and why this plan differs from the last one

The deck is at `~/Downloads/sessions-guide-three-page-copy-deck.md`, not in the repo.
It is **not** the same document as `sessions-guide-landing-copy-deck.md` at the repo
root, which is the older one my previous docs were written against. The differences are
structural, not cosmetic:

| | Root deck (old) | Three-page deck (this build) |
|---|---|---|
| §3 | Proof strip (two numbers you must supply) | **Twelve ways in** — categories, promoted from §8 |
| §4 | The problem | **Where** — city row, new |
| §9 | Pricing preview | **Common questions** — FAQ + FAQPage schema, new |
| Hero CTAs | Practitioner-primary, seeker link small | **Two equal doors**: FIND A SESSION + LIST YOUR PRACTICE |
| Head | not specified | Full title / description / canonical / og spec |
| Alt text | not specified | Per-image table |
| Nav | 5 slots, no HELP | 6 slots, **HELP added** |

My earlier open questions 7 (comparison table) and 8 (quiz / city row) are answered by
this deck: the comparison tables live on Pages 2 and 3, not Page 1; the quiz is Page 2
§4; the city row is Page 1 §4, generated from live data. Neither the quiz nor a
comparison table is in Page 1 scope.

Recommend copying the deck into `docs/copy/` so it is versioned with the code.

---

## 1. Five conflicts that need a decision before I build

These are places where the brief, the deck, and the shipped code cannot all be
satisfied. I have not resolved any of them myself.

### 1.1 Both hero washes fail WCAG AA. Measured, not assumed.

The deck says use "the current legibility wash" on both photographic sections. I
measured the actual images. Method: `sips` downsample to 64px, stdlib BMP parse,
sRGB→relative luminance per WCAG 2.1, sampled over the central band where text sits
(middle 60% width × 50% height), composited against a flat black wash at the current
opacity, contrast computed against `#ffffff`.

| Section | Image | Current wash | Mean | 95th pct | Verdict |
|---|---|---|---|---|---|
| §2 Hero | `reikiHero2.jpg` | `bg-black/25` | 7.25:1 | **3.56:1** | **FAIL** |
| §10 Close | `wing.jpg` | `bg-black/35` | **3.03:1** | **2.20:1** | **FAIL** |

Minimum *flat* wash to reach 4.5:1 at the 95th percentile: **44% for the hero, 73% for
`wing.jpg`**. A 73% wash does not leave a photograph, it leaves a grey rectangle.

Caveat on the method: a 64px downsample smooths local extremes, so the true worst case
is likely *worse* than these numbers, not better. Final verification happens against the
real text box at each breakpoint.

**My recommendation:** stop using flat washes and use a directional scrim, which the
codebase already has a precedent for (`.page-hero-scrim`, `globals.css:31`). Specifically:

- **Hero** — keep a light flat wash for overall mood, add a scrim anchored behind the
  text column. Text sits in the lower-left/centre; the scrim can be strong there and
  transparent over the rest of the frame.
- **§10 close** — `wing.jpg` is a bright sky and is the harder problem. Three options,
  in my order of preference: (a) a solid sand or olive panel holding the text, floated
  over the image, which suits the editorial system and guarantees AA; (b) a much
  stronger bottom-anchored scrim, accepting that the top third of the wing is what
  survives; (c) a different, darker close image. Option (a) keeps the photograph intact
  and is the only one that passes without argument.

Either way this is a **design change the deck does not authorise**, which is why it is
question 1 below rather than something I quietly do.

### 1.2 The deck's page title contains an em dash

Deck line 112: `<title>sessions.guide — Book Reiki, Readings, and Healing Sessions</title>`

Deck line 7, and `brand-voice.md`, and your brief: **no em dashes, ever.** The deck
violates its own stated rule in its own Head block. Pages 2 and 3 have the same problem.

Your brief says the Head block is used "exactly as specified" *and* that no string I
write may contain an em dash. Both cannot hold. I need you to pick the separator. My
recommendation is a colon (`sessions.guide: Book Reiki, Readings, and Healing
Sessions`) over a pipe, because the site's other titles already use ` | sessions.guide`
and a colon reads as a subtitle rather than a second competing brand token.

### 1.3 `WebSite` `SearchAction` would point at a parameter that does not exist

The deck requires `WebSite` with `SearchAction` targeting `/search?q=`.

`/search` accepts exactly three params: `modality`, `in_person`, `city`. All are
`<select>` dropdowns. **There is no `q` and no free-text matching anywhere in
`discovery.ts`.** A `SearchAction` at `/search?q={search_term_string}` would advertise
an endpoint that silently ignores the query.

There is also a deliberate prior decision against this, written into the code
(`structuredData.tsx:65-67`):

> `// No SearchAction: /search is filter-only (modality/city/in_person), with no`
> `// free-text query param, so advertising a text search would be false.`

The deck's Page 2 §2 does specify a free-text bar (placeholder `Try "reiki",
"astrology", or a city`), so this is coming — but it is Page 2 scope, not Page 1.

Three options: **(a)** omit `SearchAction` on this pass and add it with Page 2 (my
recommendation, keeps the schema honest); **(b)** build `?q=` free-text search in
`/search` now, which is real Page 2 work pulled forward; **(c)** ship the
`SearchAction` anyway, which publishes a false capability.

### 1.4 `/join-sessions` is blocked by robots.txt, and Page 1 links to it three times

`src/app/robots.ts:14` disallows `/join` as a bare prefix. In robots.txt semantics that
also blocks **`/join-sessions`**. The deck calls this a Critical blocker for Page 3.

It touches Page 1 because the hero CTA, the nav slot, and the footer column all point at
`/join-sessions`. Building three prominent links to a page crawlers are refused is the
orphan problem in reverse.

The fix is two lines in `robots.ts`: replace `'/join'` with `'/join$'` and `'/join/'`.
It is outside the scope you gave me, so I will not touch it unless you say so.

### 1.5 There is no Tailwind config to add tokens to

Your brief says "add it to the Tailwind config and say so." There is no
`tailwind.config.js` — this is Tailwind v4, configured CSS-first. New tokens go in
`src/app/globals.css`, in the `:root` block and the `@theme inline` block. That file is
inherited by **all 30 routes**, so every token I add is a site-wide change. Listed in §5
below; flagging the mechanism so "add a token" is not mistaken for a local edit.

---

## 2. Architecture

### 2.1 `page.tsx` becomes a server component

Today `src/app/page.tsx` is `'use client'` top to bottom. It must become a server
component, because it now needs `SiteHeader` (an async server component), two database
reads, and three JSON-LD blocks. Interactivity moves into client islands.

This also fixes the heading bug in your non-negotiables for free: with sections rendered
in deck order by a server component, the H1 is structurally first in the DOM and the
"Built from the inside" H2 can no longer precede it.

```
page.tsx                      server   metadata, JSON-LD, data fetch, section order
├── SiteHeader                server   shared, 22 routes  [MODIFIED]
├── HeroSection               server
│   └── InvitationCodeReveal  CLIENT   text link → reveals code field → /join
├── CategoriesSection         server   data: categories table          [FLAGGED]
├── WhereSection              server   data: derivableCities()         [FLAGGED]
├── ProblemSection            server
├── HooksSection              server
├── TrustSection              server
├── FounderSection            server
├── FaqSection                server   + FAQPage JSON-LD
├── ClosingSection            server
│   ├── EmailCaptureForm      CLIENT   practitioner variant
│   ├── EmailCaptureForm      CLIENT   seeker variant
│   └── InvitationCodeReveal  CLIENT   reused
└── SiteFooter                server   shared, 30 routes  [MODIFIED]
```

### 2.2 New files

| Path | Type | Notes |
|---|---|---|
| `src/lib/flags.ts` | new | The feature flag. See §4 |
| `src/components/ui/Pill.tsx` | new, shared | Extracted from `/explore`; used by §3 and later by `/explore` itself |
| `src/components/ui/Field.tsx` | new, shared | Ends the six duplicated `const FIELD` strings for new code |
| `src/components/landing/*.tsx` | new, 9 files | One per section. Under `src/components/`, not `src/app/`, so no accidental route is created |
| `src/components/landing/EmailCaptureForm.tsx` | new, client | Props: `label`, `buttonLabel`, `source`. Used twice in §10 |
| `src/components/landing/InvitationCodeReveal.tsx` | new, client | Progressive disclosure. Used in §2 and §10 |

### 2.3 Modified shared files, with blast radius

| File | Routes | Change |
|---|---|---|
| `src/app/globals.css` | **30** | New tokens (§5). Additive; existing rules untouched except the `h1`-on-dark variant |
| `src/app/layout.tsx` | **30** | `metadata` title + description; Organization/WebSite JSON-LD swap |
| `src/components/site-footer.tsx` | **30** | Rebuilt by intent (§3.11) |
| `src/components/site-header.tsx` | **22** | Nav labels, hrefs, HELP slot, flag gating |
| `src/lib/seo/structuredData.tsx` | 30 (via layout) | Extend `organizationJsonLd`, add `faqPageJsonLd` |

Four of the five highest-reach files in the repo. Nothing here is local to `/`.

---

## 3. Section-by-section

Copy is used verbatim from the deck throughout. Where I note "verbatim" it means I will
not touch a word, including the definition sentence.

### §1 Header

Does not exist on `/` today. Reuses the shared `SiteHeader` with nav changes.

| Slot | Href | Flagged? |
|---|---|---|
| `FIND A SESSION` | `/explore` | **yes** |
| `LIST YOUR PRACTICE` | `/join-sessions` | no |
| `ABOUT` | `/mission` | no |
| `HELP` | `/help` | no |
| `⌕` | `/search` | **yes** |
| `LOG IN` | `/login` | no (auth-aware: becomes DASHBOARD / ACCOUNT when signed in) |

Fixes three wrong hrefs in the existing `LINKS` array (`EXPLORE → '/'`,
`FOR PRACTITIONERS → '/join'`, `ABOUT → '/about'`) and removes the banned "FOR
PRACTITIONERS" string. `SAGES` stays `live: false` — no `/sages` index route exists and
`decisions.md` forbids wiring a nav link to a route that does not resolve.

Six slots is one more than the header carries today and the inline-nav row gets tight
between 768 and 1024px, where the layout currently has no breakpoint. Handling: keep
inline nav at `lg` and up, hamburger below, rather than the current `md` switch. This is
a change to the shared header's responsive behaviour and affects all 22 pages.

Responsive: 375 hamburger · 768 hamburger · 1440 inline.

### §2 Hero

H1 first in the DOM. Full-bleed `reikiHero2.jpg`, scrim per §1.1.

- H1: `Who holds space for you?` — display font, `--color-light`, needs the new
  on-dark variant rather than an inline style override.
- Definition sentence **verbatim**, as body copy directly beneath. Measure capped
  around 62ch so it stays readable at 1440.
- CTAs: `[ FIND A SESSION ]` (flagged) and `[ LIST YOUR PRACTICE ]`.
- `Practitioners join by invitation.` + `HAVE AN INVITATION CODE` text link revealing
  the code field on click, posting to the existing `/api/verify-invite` → `/join`.
- Alt: `A practitioner giving a reiki session, hands resting above a client lying on a treatment table.`

Flag off: one CTA, and the hero reads practitioner-primary. See §4.

Responsive: 375 stacked full-width CTAs · 768 side by side · 1440 side by side, text
column constrained left of centre.

### §3 Twelve ways in — the visual anchor

The most important thing after the hero, per your brief, and the deck's Critical fix.
Sand background, immediately after the hero so it is above the fold on a tall desktop
viewport and one scroll on mobile.

- H2 `Twelve ways in`
- Twelve pills from the `categories` table (`name`, `slug`, ordered by `sort_order`) —
  the same query `/explore` runs. Names come from the database, which is why the
  Frequency question (question 5) is a data decision.
- Each pill → `/explore/[category]` via `categoryPath()`.
- Keyword paragraph **verbatim** (seven modality nouns, doing deliberate SEO work).
- `BROWSE EVERYTHING` → `/explore`, `SEARCH BY CITY` → `/search`.

Giving it weight without shouting: full-bleed sand band against the photographic hero
above it, generous vertical rhythm, pills at a larger touch target and type size than
`/explore`'s current ones, and a 2/3/4-column pill grid rather than a ragged
`flex-wrap`, so twelve items read as a considered set.

Entire section is flagged.

Responsive: 375 two columns · 768 three · 1440 four.

### §4 Where

Small, one line, generated live. Hidden entirely when empty.

- `OPENING IN` label + `United States · Australia · Indonesia` (static, from
  `product-spec.md` launch markets).
- City line from `derivableCities()`, which returns `{slug,label}[]` for cities holding
  a **published** practitioner with an active in-person block. Rendered as a natural
  list with links to `/in/[slug]`. Zero cities → the whole section does not render.

The deck's example text names Topanga and Ubud; I will not hardcode those. Note that
what `derivableCities()` returns today depends on the seed-content situation, which is
exactly why this section is flagged.

Entire section is flagged.

### §5 The problem

Two columns, image left, text right. Existing `hands-magic.jpg`. H2 `You did not train
for this part`, four fragments, verbatim. No CTA — this beat works because it sells
nothing.

Responsive: 375 image above text · 768 two columns · 1440 two columns, wider gutter.

### §6 The three hooks — ranked, not three equal columns

Your brief is explicit that one must read as primary. Plan: **ONE** gets a wider column,
a larger H3, and the full paragraph; **TWO** and **THREE** sit narrower alongside at
body scale. An asymmetric `[3fr] [2fr] [2fr]` at desktop, collapsing to a single stack
on mobile where ONE keeps its larger heading so the ranking survives the collapse.

`ONE`/`TWO`/`THREE` numerals in the mono face as `.label`. Trailing centred line
verbatim: `Booking, reminders, calendar sync, and cancellations run in the background.`

### §7 Trust — quiet

Sand, centred, narrow measure (~58ch), no image, no border, no icon. Three paragraphs
verbatim, including the psychedelic-disclaimer paragraph the deck adds. Restrained type:
H2 at the low end of its clamp, body at default.

### §8 Founder, named

Two columns, portrait left. Name rendered from a `FOUNDER_NAME` constant holding the
literal `[FOUNDER NAME]` placeholder, per your instruction. Byline `FOUNDER, SESSIONS
GUIDE INC.` in the mono face.

Two problems: there is **no founder portrait in `public/`** (I checked all of
`public/images` and `public/images/stockPhotos`; there is no portrait of a person), and
publishing a `Person` schema node named `[FOUNDER NAME]` would put a placeholder into
structured data. See questions 3 and 4.

### §9 Common questions

Four Q&As verbatim, H2 + four H3s, plus `FAQPage` JSON-LD built from the same source
array so the visible copy and the markup cannot drift. Requires a new `faqPageJsonLd()`
builder in `structuredData.tsx` — additive, no blast radius.

Plain stacked Q&A, not an accordion: there is no disclosure component anywhere in the
codebase, four items do not need one, and content hidden behind a click is weaker
snippet bait. If you want an accordion, `<details>` keeps it zero-JS.

### §10 The two closes

Full-bleed `wing.jpg`, treatment per §1.1.

- **Primary, practitioner:** H1-scale display line `Making lightworkers' work lighter`
  — rendered as an **H2**, since the page already has its one H1 in the hero. Email +
  `REQUEST AN INVITATION`, then `HAVE AN INVITATION CODE`.
- Hairline `--color-border` divider.
- **Secondary, seeker:** `LOOKING FOR A PRACTITIONER` label, smaller type, email +
  `NOTIFY ME`.

Alt: `A bird's wing against an open sky.`

**This section has a hard backend dependency.** Both forms post to `/api/waitlist`,
which inserts `{email}` into a `waitlist` table with a **unique constraint on `email`
alone**. One person signing up on both sides collides on `23505`. The deck also states
the table does not exist in production yet (migration `0005_create_waitlist.sql` is on
disk; I cannot verify it is applied without database access). See question 6.

### §11 Footer, by intent

Rebuilt. Affects all 30 routes.

```
FIND A SESSION          LIST YOUR PRACTICE        SESSIONS GUIDE
Browse categories       Why sessions.guide        The mission
Search                  Pricing                   Contact
Booking a session       Running your practice     Instagram
[cities, live, ≤6]      Log in
```

Bottom bar: `© Sessions Guide Inc.` · Privacy · Terms.

Removes "Manage Your Sessions" (promises a dashboard to people without one) and "Join
Sessions" (names the action, not the reason). Help splits into `Booking a session` and
`Running your practice`, closing the banned-chrome violation on `/help`. City block
generated live, capped at six, dropped entirely if none qualify. Column one plus the
city block are flagged.

---

## 4. The feature flag — exactly where it lives

**File: `src/lib/flags.ts`. Single exported constant, defaulting to off.**

```
export const MARKETPLACE_LINKS_ENABLED = false
```

Why a module constant rather than an env var: it matches the existing `live: false`
`NavLink` convention in `site-header.tsx`, it is greppable, it is type-narrowed at build
so dead branches are visible, and it keeps the on/off state in version control where a
reviewer can see it. If you would rather flip it in Vercel without a deploy, say so and
I will back it with `process.env.MARKETPLACE_LINKS_ENABLED === '1'`, still defaulting to
false and still read through this one file. That is question 7.

**What it gates**

| Gated | Not gated |
|---|---|
| Nav `FIND A SESSION`, nav `⌕` | Nav `LIST YOUR PRACTICE`, `ABOUT`, `HELP`, `LOG IN` |
| Hero CTA `FIND A SESSION` | Hero `LIST YOUR PRACTICE`, invitation code, definition sentence |
| §3 entire section | §5, §6, §7, §8, §9, §10 |
| §4 entire section | Footer columns two and three |
| Footer column one + city block | |

**The consequence, stated plainly:** with the flag off, `/` has no path into the
marketplace, which is the exact Critical finding the deck exists to fix. The page ships
as a well-structured practitioner acquisition page and the seeker half stays dark until
seed content is cleared from `/kiki-falconer-2`.

That means **the flag-off state is the one that ships first, so it is the one that has
to look finished.** I will design and verify both states at all three breakpoints, not
treat flag-off as a degraded fallback. Flag-off is not "the page with holes in it" — the
hero drops to a single CTA and the rhythm closes up.

One judgment call I have not made: §9's answer to "Can anyone list a practice?" ends
`Seekers can browse and book today with no invitation.` That stays true with the flag
off (the marketplace works, it is just unlinked), but it sits oddly on a page offering
no way to do it. I propose leaving it verbatim. Flag it if you disagree.

---

## 5. Tokens to add

All in `src/app/globals.css` — `:root` plus `@theme inline`. **There is no Tailwind
config file.** Every one of these is inherited by all 30 routes.

| Token | Purpose |
|---|---|
| `--color-scrim-strong` + a gradient utility | AA-passing text-over-photo treatment (§1.1). Replaces three ad-hoc `bg-black/NN` values |
| `--container-page` (1200px), `--container-prose` (760px), `--container-measure` (~62ch) | Replaces ten one-off `max-w-[…]` values on this page |
| `--section-y` / `--section-y-lg` | Section rhythm. Nine ad-hoc `py-*` values today |
| `.h1-on-dark` (or an `h1` colour variant) | Removes the four inline `style={{color:...}}` overrides that exist only to beat the global olive `h1` |

I will not retro-fit existing pages onto these tokens in this pass; that is a separate
sweep and would balloon the diff. New tokens, used by new code, available to the rest
later.

---

## 6. Head, schema, and accessibility

**Head** (per deck, pending the em-dash decision in §1.2): title, the 152-char
description, canonical `https://www.sessions.guide/`, og:title/og:description matching,
og:image the reiki hero at 1200×630. `NEXT_PUBLIC_SITE_URL` is already
`https://www.sessions.guide`, so the canonical agrees with `metadataBase` — no conflict.
The og:image needs generating at 1200×630; the source is 602KB and not that ratio.

**Schema.** `organizationJsonLd()` gains `legalName: "Sessions Guide Inc."`, `address`
(`PostalAddress` with `addressCountry: "CA"` only, since there is no mailing address
yet), `sameAs` (Instagram only — it is the only profile that exists; the deck's LinkedIn
and Crunchbase suggestions are not mine to invent), `founder` (a `Person` node, **omitted
while the name is a placeholder** — see question 3), and `description` swapped to the
definition sentence verbatim. `webSiteJsonLd()` gains `SearchAction` only if §1.3 is
resolved in favour of it. New `faqPageJsonLd()` for §9.

**Accessibility.** WCAG 2.1 AA. Beyond the contrast work in §1.1: every content image
gets the deck's alt string and decorative images get `alt=""`; the invitation-code
reveal is a real `<button aria-expanded>` controlling a labelled region, not a div; both
email forms have visible labels, not placeholder-only; focus-visible rings on every
interactive element, which the current `.btn-primary` does not provide; the pill grid is
a list; heading order is H1 then H2s with no skips.

**Verification.** Dev server, real browser, screenshots at 375 / 768 / 1440 for every
section in **both flag states**, plus a re-measure of the final scrim against the actual
rendered text box rather than the sampled band.

---

## 7. Out of scope, and I will not touch it

`/explore`, `/join-sessions`, `/pricing`, `/help`, `/mission`, the category descriptor
corrections, `llms.txt`, the Page 2 quiz, the cancellation comparison tables, and the
`robots.ts` fix unless you say otherwise (§1.4). `PractitionerCard`, `header-nav.tsx`
internals beyond the breakpoint change, and the dashboard are untouched.

---

## 8. Open questions

**Blocking — I cannot start without these.**

1. **The two hero washes fail AA (§1.1).** Which treatment for `wing.jpg`: solid text
   panel (my recommendation), much stronger scrim, or a different image? And is a
   directional scrim on the hero acceptable in place of the flat wash?
2. **The em dash in the page title (§1.2).** Colon, pipe, or ship the em dash?
3. **Founder `Person` schema.** Omit the node until you supply a name (my
   recommendation), or publish it with the placeholder string?
4. **Founder portrait.** No portrait of a person exists in `public/`. Options: leave a
   sized empty frame, use one of the existing stock images knowing it is not you, or
   render §8 as a single text column until the photograph arrives.
5. **`ENERGY HEALING` or `FREQUENCY`?** The deck lists it as an open decision blocking
   this section. `/explore` renders `categories.name` from the database, so this is a DB
   change, not copy. Recommendation stands from my earlier doc: change `name` only,
   leave `slug` alone, so `/explore/energy-healing` keeps working.
6. **§10 waitlist.** Is `0005_create_waitlist.sql` applied in production, and do you
   want the composite-key migration in this pass? Without it the two closes cannot both
   collect email. If it is out of scope, I will build §10 with the seeker form disabled
   behind the same flag and say so on screen.

**Needed before I finish, not before I start.**

7. **Flag mechanism (§4).** Module constant, or env-backed so you can flip it in Vercel
   without a deploy?
8. **`SearchAction` (§1.3).** Omit until Page 2 ships free-text search (my
   recommendation), build `?q=` now, or publish it knowing `q` is ignored?
9. **`robots.ts` (§1.4).** Two-line fix in this pass, or leave it and accept that the
   three `/join-sessions` links point at a disallowed page?
10. **Header breakpoint (§3.1).** Moving the inline-nav switch from `md` to `lg` to fit
    six slots changes the header on all 22 pages. Confirm that is acceptable, or I keep
    `md` and let the nav run tight at tablet.
11. **"DM Mono."** Taking you at your word from last turn that it is a dead name, I will
    use the existing `.btn-primary` / `.label` classes, which render `degular-mono`. The
    deck also says "DM Mono"; same reading. Say if you meant something else.
12. **Deck location.** May I copy the deck into `docs/copy/` so it is versioned
    alongside the code rather than living in `~/Downloads`?
