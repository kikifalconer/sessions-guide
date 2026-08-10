# `/explore` Rebuild — Plan

Against **Page 2** of `~/Downloads/sessions-guide-three-page-copy-deck.md`, reconciled
with `~/Downloads/seeker-journey.md`, `brand-voice.md`, and
[`design-system.md`](./design-system.md).

**Status: awaiting approval. No code written.**

---

## 0. The blocker: the system this page is meant to inherit does not exist

Your brief says to reuse "the header, footer, buttons, and tokens established in the `/`
redesign." **The `/` redesign was never built.** I planned it, raised six blocking
questions, and stopped. Nothing was answered and nothing shipped. Verified just now:

| Expected from the `/` plan | State |
|---|---|
| `src/lib/flags.ts` | missing |
| `src/components/ui/Pill.tsx`, `Field.tsx` | missing |
| `src/components/landing/` | missing |
| `faqPageJsonLd()` in `structuredData.tsx` | missing |
| Scrim / container / section-rhythm tokens in `globals.css` | missing |
| `site-header.tsx` nav (labels, hrefs, HELP slot) | unchanged, still has the three wrong hrefs |
| `site-footer.tsx` rebuilt by intent | unchanged |
| `src/app/page.tsx` as a server component | unchanged, still `'use client'` |

Last commit is still `0f25f19`, the tier fix from before any of this started.

So there is no system to inherit, and your instruction not to invent a second one is
exactly right — which means I cannot start on `/explore` alone without either
duplicating that layer or building it first.

### Three ways forward

**(a) Answer the six `/` blockers, build `/`, then build `/explore`.** Correct order,
but it serialises everything behind decisions about a founder photograph and a
`wing.jpg` scrim that have nothing to do with this page.

**(b) Build the shared foundation first as its own pass, then `/explore` on top of it,
and let `/` land later reusing the same layer. My recommendation.** Most of the shared
layer is not blocked by the `/` questions, because those questions are all
Page-1-specific:

| `/` blocker | Blocks the shared layer? |
|---|---|
| 1. Hero/close wash failing AA | No. `/explore` puts no text over photography (cards are image-above-text; the three-questions band is a solid colour) |
| 2. Em dash in the page title | **Yes, and it recurs here** — the Page 2 title has the same em dash |
| 3. Founder `Person` schema | No |
| 4. Founder portrait | No |
| 5. Frequency alias | **Yes** — it is one of the two decisions you asked me to surface |
| 6. Waitlist migration | Partly — it recurs in this page's §6 empty state |

And building `/explore` §2 actually *resolves* `/` open question 8: once free-text
`?q=` search exists, the `WebSite` `SearchAction` the Page 1 deck wants becomes honest
instead of false.

**(c) Build `/explore` standalone.** Ruled out by your own brief.

Everything below assumes **(b)**. Pass 0 is the shared layer; Pass 1 is this page.

---

## 1. Pass 0 — the shared layer (prerequisite, not `/explore` scope)

Small, and it unblocks both pages.

| Item | File | Notes |
|---|---|---|
| Feature flags | `src/lib/flags.ts` | `MARKETPLACE_LINKS_ENABLED` (from the `/` plan) and `FEATURED_LABEL_ENABLED` (this page, §6). Both default `false` |
| Nav | `src/components/site-header.tsx` | Six slots, correct hrefs, `FIND A SESSION` label, HELP added, inline-nav breakpoint `md`→`lg`. **22 routes** |
| Footer | `src/components/site-footer.tsx` | By intent, plus the live city block. **30 routes** |
| Tokens | `src/app/globals.css` | Container widths, section rhythm, focus-visible ring, `h1`-on-dark. **30 routes.** No `tailwind.config.js` exists; these go in `:root` + `@theme inline` |
| Field | `src/components/ui/Field.tsx` | Ends the six duplicated `const FIELD` strings for new code |
| FAQ schema | `src/lib/seo/structuredData.tsx` | `faqPageJsonLd()`, additive |

`Pill.tsx` is **not** shared after all. Page 1 §3 renders the twelve categories as
compact pills; Page 2 §3 renders them as full cards with imagery and a one-liner. That is
a deliberate hierarchy difference, not an inconsistency, so `CategoryCard` is new to this
page and the pill stays Page 1's.

---

## 2. What this page needs that does not exist yet

Four items are real engineering, not layout. Flagging them up front because they change
the size of this job.

### 2.1 Free-text search does not exist

§2's placeholder is `Try "reiki", "astrology", or a city`, and §9's empty state says
"The search bar matches practice names and places." `seeker-journey.md` line 48 lists the
search as "modality, location, keyword."

`/search` today accepts `modality`, `in_person`, `city` — three `<select>` dropdowns.
**There is no `q` param and no free-text matching anywhere in `discovery.ts`.**

Needs: a `?q=` param, and a resolver that matches a query string against approved
modality names and derivable city labels, then hands the result to the existing
`discoverSearch` spine. Plain string matching, not AI — D16 defers the AI version and
explicitly describes this shape as the future upgrade path ("free text → structured
filters → the same resolver"). Ambiguous or unmatched queries fall through to §9.

### 2.2 The quiz has no answer-to-category mapping

The deck gives three questions and their options, then says the result screen shows
`[TWO OR THREE CATEGORY CARDS]`. **It never says which categories come from which
answers.** That is 4 × 4 × 3 = 48 combinations of "where do you feel it / what would help
/ how do you want to do this" with no mapping.

I cannot invent this. Telling someone who says *in my body · relief · in person* to start
at Embodied rather than Ancient Healing Arts is an editorial judgment about what this
platform recommends, and getting it wrong in a vulnerable context is worse than not
shipping the section. **Blocking, question 1 below.**

Q3 is the exception and is unambiguous: it maps to the `in_person` filter and decides
whether results need a location at all, exactly as your brief says.

### 2.3 Session cards do not exist

§6 says SESSION CARDS. The only card component is `PractitionerCard`. Session types hang
off practitioners and there is no query that returns bookable session types across
practitioners, no session card, and no distance sort — `rankCards` in `discovery.ts` is
tier-first (alchemist) then `baseSort`, with no geography.

"Featured first, then by distance" therefore needs: a new cross-practitioner session-type
query, a `SessionCard`, and a distance sort that only activates once the seeker has given
a location. Until then the deck's own fallback applies, "most recently available," which
needs defining against `availability_blocks` (I propose: earliest upcoming bookable slot,
ascending).

### 2.4 Zero-result query logging has no home

§9 requires logging every zero-result query. There is no table and no write path.

This also carries a privacy question I am not going to decide quietly: the whole point of
the empty state is that people type feelings into it. "burnt out" is the deck's own
example. A log of free-text seeker queries is closer to sensitive data than a normal
analytics event, and it is being written by people who may be in a hard moment. Needs a
retention rule and a decision on whether anything identifying is stored alongside.
**Question 6.**

---

## 3. Section-by-section

### §1 H1 and intro

`<h1>Find a practitioner</h1>`, first heading in the DOM. Intro paragraph verbatim. The
page currently opens at H2 with no H1 at all; this fixes the audit finding structurally.

### §2 Search

Placeholder exactly `Try "reiki", "astrology", or a city`. Filter labels `PRACTICE`,
`WHERE`, `IN PERSON ONLY` in the mono face.

Location note renders **inline beside the WHERE field**, never a modal, verbatim:
"Practitioners working virtually appear in every location. Turn on `IN PERSON ONLY` to
see just the ones you can sit in a room with."

Geolocation fires **only on user intent** — tapping the WHERE field or a "near me"
control. Never on page load, never on mount, no effect that touches
`navigator.geolocation` outside a handler. Denial is recoverable: the field stays usable
as a text/select input.

Native GET form so results are shareable and it works without JS, matching the existing
`/search` pattern.

Responsive: 375 stacked full-width · 768 two-up with the button full-width · 1440 single row.

### §3 Twelve category cards — the spine

Solved first, at all three breakpoints, before anything else is styled.

Each card: hero image, category name, the deck's one-liner **verbatim**, whole card is
one link to `/explore/[category]`.

- Grid: 1 column at 375, 2 at 768, 3 at 1440. Four across at 1440 makes the images too
  small to read as photographs and pushes the twelfth card below the fold on a laptop.
- Semantics: `<ul>` of `<li>`, one `<a>` wrapping each card. Single tab stop per card,
  natural DOM order, no roving tabindex needed.
- States: hover (border to olive, image scale held at 1 to avoid layout cost), focus-visible
  (a real ring from the new token, which `.btn-primary` does not currently provide),
  loading (per-link pending via `useLinkStatus` — confirmed present in Next 16.2.9 at
  `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-link-status.md`;
  I will read it before use per `AGENTS.md`).
- Alt text: `[Category name]: [what the photograph shows].` I will open each of the twelve
  images and describe what is actually in it. Not generated from the category name.

**Image weight is a problem.** `AncientHealingArts.jpg` is 4.2MB, `tarot.jpg` 2.7MB,
`reikiHero2.jpg` (the copy inside `categories/`) 1.1MB. `sm` variants exist for only five
of the twelve. `next/image` will serve resized output, but twelve unoptimised sources on
the page that is now the marketplace front door is worth fixing at source. I will set
correct `sizes` and flag the files that should be re-exported.

**The one-liners feed three surfaces**, per the deck and your brief: this card, the
`/explore/[category]` page header, and its `generateMetadata`. The latter two are outside
`/explore` proper — see question 8.

### §4 Three questions

Full-bleed band, visually distinct from the grid above. Treatment: solid olive field,
light type, no photography. That gives maximum separation from the sand-and-image grid
without introducing another text-over-photo contrast problem, and it echoes the footer so
the page reads as one system.

- Three questions as native `<fieldset>` + `<legend>` + `<input type="radio">`, styled to
  look like the option buttons. Native radios give keyboard support, arrow-key navigation
  within a group, and screen-reader grouping for free. No custom `role="radiogroup"`.
- Progressive: works without JS as a three-part GET form; enhanced to step through one
  question at a time with JS on.
- Q3 maps to `in_person` and decides whether the result needs a location at all.
- Result screen: `Here is where I would start` + two or three `CategoryCard`s reusing §3,
  plus the closing line verbatim.

Blocked on the mapping (§2.2).

### §5 Guides and their picks

Built, and **gated on real data**: renders only when at least one `pages` row with
`type = guide` and `status = 'published'` exists. Zero published guides means the section
does not render at all and the page flows from §4 to §6.

`pagesData.ts` has `getPublishedPage(slug)` only — there is no "list published guides"
query. New, small. `decisions.md` forbids wiring a link to a route that does not resolve,
and there is still no `/guides` index, so individual guide links point at
`/guides/[slug]` and nothing links to a bare `/guides`.

`seeker-journey.md` J-3 records that nobody has written the Guide notes yet, so realistically
this ships dark. That is the correct behaviour, not a gap.

### §6 Sessions

Featured first, then distance, falling back to most-recently-available with no location
(§2.3). `FEATURED` label suppressed behind `FEATURED_LABEL_ENABLED`, default off, per
`seeker-journey.md` J-2 — with a handful of cards, labelling one reads as arbitrary
rather than premium.

Empty state verbatim from the deck. Its second clause ("leave your email and we will
write when a practitioner opens near you") depends on the same waitlist work as the `/`
page's seeker capture; if that is out of scope I will render the first sentence and the
category link only, and say so.

### §7 Where practitioners are

`derivableCities()`, already built, returns `{slug,label}[]` for cities holding a
published practitioner with an active in-person block. Links to `/in/[city]`. Section
hidden entirely when empty. Trailing line verbatim.

### §8 Before your first session

Nine Q&As verbatim, `FAQPage` JSON-LD built from the same source array as the visible
copy so the two cannot drift.

**The cancellation table, and why I am not doing the stacked version.**

You said horizontal scroll is acceptable and a stacked card list is better. I want to
push back, because the two goals in your own brief conflict here. You require "a real
`<table>`, not styled prose" — and the standard responsive stacking technique works by
setting `display: block` on the table elements, which **removes table semantics in most
screen readers** and takes the structure away from exactly the machines the table exists
to feed. Google's table snippet and a screen reader's table navigation both depend on the
element keeping its table display.

So my recommendation: **keep a real `<table>` at every breakpoint**, and at narrow widths
put it in a horizontally scrollable region that is properly exposed — `overflow-x: auto`,
`tabindex="0"`, `role="region"`, and an `aria-label`, which makes it keyboard reachable
and announced rather than a silent scroll trap. Paired with tightened cell copy ("More
than 24 hours before" rather than "Cancel more than 24 hours before"), a four-row,
three-column table is close to fitting 375px unaided, so the scroll is a fallback rather
than the primary experience.

If you still want stacked, I will build it as a stacked layout that keeps `<th
scope="row">` and accept the semantic loss knowingly. Question 7.

### §9 Empty search state for `/search`

Not a section of this page; the state `/search` renders on zero results.

- H1 echoes the query verbatim: `No results for "burnt out"`. Escaped, length-capped, and
  rendered as text so a query cannot inject markup.
- Never an error. No apology, no crossed-out magnifier, no red, no empty-box illustration.
- Recognition line verbatim, then the three questions inline (same component as §4), then
  the twelve categories link.
- Every zero-result query logged (§2.4).

`/search` and every parameterised result view get `robots: { index: false, follow: true }`.
`/search` has no `robots` in its metadata today. I propose the rule: **noindex when any
filter param is present, index the bare route** — so `/in/topanga` stays indexed and
`/in/topanga?in_person=1` does not. That needs applying to `/in/[city]` too, which is
outside this page. Question 8.

### Footer line

`LAST UPDATED [DATE]`, wired to real data. There is no obvious source. Options: the most
recent `updated_at` across the content this page renders; the deploy timestamp; a
hand-maintained constant. I lean toward content-derived with a build-time fallback, since
a deploy stamp claims freshness the content may not have. Question 5.

---

## 4. The two decisions you asked me to surface

### 4.1 `ENERGY HEALING` or `FREQUENCY` — not resolved, as instructed

State of the evidence: `product-spec.md` says "'Frequency' is the display name for the
`energy-healing` slug in some UI contexts." The hero asset is already `frequency.jpg`.
`/explore` renders `categories.name` straight from the database, which is "Energy
Healing" today. The SEO audit's keyword finding argues for the searched term.

What makes it urgent here rather than theoretical: this page turns the twelve categories
into the marketplace's front door with a card, an image, an `ItemList` schema entry, and a
crawlable link each. Whichever word ships becomes the public name and the URL people link
to, and changing it afterwards costs redirects and crawl equity.

My only recommendation, unchanged: if you want "Frequency," change `categories.name` and
leave `categories.slug` alone, so `/explore/energy-healing` keeps working and the keyword
stays in the URL. Not shipping either way without your word.

### 4.2 The four brand-voice violations in `CATEGORY_HERO`

I checked all twelve paragraphs against `brand-voice.md` independently rather than taking
the audit's word. **Exactly four** violate a stated rule. Two others are borderline and I
would leave alone.

| # | Category | Line | Current | Rule broken | Proposed |
|---|---|---|---|---|---|
| 1 | Energy Healing | `explore/[category]/page.tsx:13` | "shift what you cannot see but can **absolutely** feel" | "absolutely" is on the banned-word list | "shift what you cannot see but can feel" |
| 2 | Journeys | `:17` | "The practitioners in this category are experienced **guides** who understand the terrain" | Practitioners are never called guides. "Guide" is the curator role only | "The practitioners in this category have travelled the terrain many times and know how to move through it safely." |
| 3 | Consciousness | `:29` | "Find a practitioner who can **guide you into** the deeper states" | "Guide" as a verb in a way that implies the practitioner is a Guide, the exact form brand-voice names as avoid | "Find a practitioner who can take you into the deeper states and bring you back with care." |
| 4 | Creativity | `:45` | "helping you express, release, and **discover** through the act of making" | "discover" as a standalone verb, plus three parallel verbs | "so the act of making becomes the way through." |

Correction 4 also lines up with the deck's new Creativity one-liner ("Making something as
the way through"), so the card and the page header agree.

**Borderline, not proposing changes:** Readings `:21` ("It reflects something back, names
a pattern you half-sensed, and gives you language...") and Embodied `:33` ("release held
tension, restore safety, and reconnect you...") are both three parallel verbs, but they do
not end the same way, which is what the rule actually prohibits. Flagging so you know I
looked, not asking to change them.

Not shipping any of these without sign-off. Note they live in `explore/[category]/page.tsx`,
which is outside `/explore` proper.

### 4.3 One thing I noticed while reading the one-liner table

The deck's "Modalities to name for search" column includes several names that are **not in
the approved modality taxonomy**: mediumship, sweat lodge, seasonal ceremony, family
constellation, lymphatic drainage, voice work, regression, dreamwork, movement. Some are
near-misses for real entries (`Dream Work`, `Past Life Regression`), others do not exist at
all.

That is fine if they stay prose keywords, which is what the deck intends. It breaks if
anyone later turns that column into links, which would 404. I will render them as text
only and not link them. Raising it so the mismatch is on the record.

All twelve of the deck's one-liners themselves are clean against brand voice. I checked
each; none needs a change, and I will use them verbatim.

---

## 5. Head, schema, accessibility

**Head** per the deck, pending the em-dash decision: title `Find a Practitioner — Reiki,
Astrology, Sound Healing | sessions.guide`, the 140-char description, canonical
`https://www.sessions.guide/explore`. `NEXT_PUBLIC_SITE_URL` is already
`https://www.sessions.guide`, so canonical and `metadataBase` agree.

**Schema.** `CollectionPage` + `BreadcrumbList` + `ItemList` of the twelve categories +
`FAQPage` on §8. `categoryPageJsonLd` already builds a `CollectionPage` with an inner
`ItemList` for the category *pages*; this page needs its own with the twelve categories as
items, so a new builder rather than a reuse. The cancellation table inside FAQ answer 6
cannot go into the schema `text` field as markup, so the schema carries a prose summary of
the four tiers and the visible page carries the table.

**Accessibility, beyond what is noted per section.** One H1. Skip link to main. The grid is
a list. The quiz is native radios in fieldsets. The scroll region is focusable and labelled.
Focus-visible on every interactive element, from a new token, because `.btn-primary` has no
focus style today. Verified at 375 / 768 / 1440 in a real browser, keyboard-only pass
through the grid, the quiz, and the FAQ.

---

## 6. Out of scope

`/`, `/join-sessions`, `/pricing`, `/mission`, `/help`, the Page 1 sections, `llms.txt`,
and the practitioner profile. `/explore/[category]` is touched only for the one-liners and
the four corrections, both of which you asked for and neither of which I will ship without
sign-off.

---

## 7. Open questions

**Blocking.**

1. **The quiz mapping (§2.2).** Which two or three categories does each answer
   combination produce? Without this §4 cannot be built. If you want, I can propose a
   mapping for you to edit rather than starting from blank, but I will not ship one I
   invented.
2. **Sequencing (§0).** Confirm plan (b): shared foundation first, then `/explore`, with
   `/` landing later on the same layer. If you would rather answer the six `/` questions
   and do that page first, say so and I will re-order.
3. **The em dash in the page title.** Same conflict as Page 1, unanswered. Colon, pipe, or
   ship the em dash?
4. **`ENERGY HEALING` or `FREQUENCY`** (§4.1). Surfaced per your instruction, not resolved.

**Needed before I finish, not before I start.**

5. **`LAST UPDATED` source.** Content-derived, deploy timestamp, or manual constant?
6. **Zero-result query logging (§2.4).** New table plus a retention rule. What is stored
   besides the query string, and for how long?
7. **Cancellation table at 375** (§8). I recommend a real table in an accessible scroll
   region over stacked cards, because stacking destroys the table semantics your own
   non-negotiable asks for. Confirm, or tell me to stack it anyway.
8. **Scope creep I need permission for.** Three things sit just outside `/explore` but are
   required by your brief: the twelve one-liners feeding `/explore/[category]`'s header and
   `generateMetadata`; the four `CATEGORY_HERO` corrections; and the noindex rule applying
   to `/in/[city]` parameterised views as well as `/search`. In or out?
9. **§6 empty state and the waitlist.** Same dependency as `/`. If the waitlist migration
   is out of scope, I render the first sentence without the email offer.
10. **Deck and journey docs.** Both still live in `~/Downloads`. May I copy them into
    `docs/copy/` so this work is versioned against something in the repo?
