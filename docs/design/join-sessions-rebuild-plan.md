# `/join-sessions` Rebuild — Plan, plus cross-page check results

Against **Page 3** of `~/Downloads/sessions-guide-three-page-copy-deck.md`, with
`brand-voice.md` and [`design-system.md`](./design-system.md).

**Shipped this pass:** the robots.txt fix and `public/llms.txt`.
**Not started:** the page rebuild and the dashboard field. Still blocked.

---

## 1. Done: robots.txt

`src/app/robots.ts` — `'/join'` replaced with `'/join$'` and `'/join/'`, with a comment
explaining why the bare prefix was wrong.

Verified two ways rather than one. First, the rendered file (dev server,
`curl /robots.txt`) emits the new directives across all ten user-agent blocks. Second, a
matcher implementing Google's rules (`*` wildcard, `$` end-anchor, longest match wins,
Allow breaks ties) run against real paths:

| Path | Verdict | Winning rule |
|---|---|---|
| `/join` | **BLOCKED** | `disallow: /join$` |
| `/join/` | **BLOCKED** | `disallow: /join/` |
| `/join/step-2` | **BLOCKED** | `disallow: /join/` |
| **`/join-sessions`** | **CRAWLABLE** | `allow: /` |
| `/join-sessions/` | CRAWLABLE | `allow: /` |
| `/dashboard`, `/api/*`, `/login` | BLOCKED | unchanged |
| `/`, `/explore`, `/explore/readings`, `/in/topanga`, `/pricing` | CRAWLABLE | unchanged |

The invite gate stays closed and the marketing page is now reachable. Nothing else moved.

Caveat worth knowing: `$` is a Google/Bing extension, not part of the original robots
standard. Well-behaved crawlers that ignore `$` would read `Disallow: /join$` as a
literal path and simply not match `/join`, which fails open (the invite gate is a
low-value route with no secrets, and it is auth-gated anyway — it returns a 307). No
crawler is newly blocked from anything.

---

## 2. Done: `/llms.txt`

Created at `public/llms.txt`, content verbatim from the deck. Verified serving at
`/llms.txt`, `200`, `text/plain`.

**One thing to know:** the file points at `/pricing` as "current subscription tiers and
prices," and `/pricing` is wrong today — it still sells Trial / Basic / Elevated with
"Founding rate" placeholders, contradicting D24. This file now actively directs language
models at that page. It was already linked from the footer, so this is not new exposure,
but it is newly *recommended* exposure. Fixing `/pricing` is deck sequencing item 6 and
should land before this gets much crawl attention.

---

## 3. Cross-page check results

Run against the dev server at `main` + the robots fix. All findings are current state,
before any rebuild.

### 3.1 Every deck internal-linking destination resolves

Every row of the deck's table points at a route that returns 200: `/explore`, `/search`,
`/explore/[category]`, `/in/[city]`, `/help`, `/help/seekers`, `/help/practitioners`,
`/join-sessions`, `/pricing`, `/mission`. The rebuild can wire all of them safely.

Three routes referenced by the **held-out nav** do not exist: `/guides` (404), `/sages`
(404), `/about` (404). They must stay `live: false`. The `ABOUT` slot the deck specifies
points at `/mission`, which does resolve.

### 3.2 No page links a route that 404s

14 distinct static internal `href`s in `src/`. None 404. The only non-200s are three auth
redirects, all expected: `/dashboard` (307), `/dashboard/admin/pages/new` (307),
`/api/google/connect` (307).

Scope limit, stated honestly: this covers literal `href="/…"` strings. Links built from
template literals (`/${p.slug}`, `` `${base}?in_person=1` ``) and from the `routes.ts`
constants are dynamic and were not enumerated. Their destinations resolve by
construction, but a slug-level check needs live data.

### 3.3 One H1 per page — **four failures**

| Page | H1 | H2 | Verdict |
|---|---|---|---|
| `/` | 1 | 1 | **H2 renders before the H1** |
| `/explore` | 0 | 1 | **no H1** |
| `/search` | 0 | 1 | **no H1** |
| `/in/topanga` | 0 | 1 | **no H1** |
| `/join-sessions` | 1 | 1 | ok |
| `/pricing`, `/mission`, `/help`, `/help/seekers`, `/help/practitioners`, `/explore/readings` | 1 | — | ok |

`/` and `/explore` are known from the deck. **`/search` and `/in/[city]` are additional
and are not in the deck's list** — the deck names `/explore` and `/[slug]/reviews`. So
the H1 problem is broader than documented. `/join-sessions` is structurally fine today;
its problem is that the H1 says the wrong thing.

### 3.4 Alt text — **one missing, and a category error**

18 `<Image>` tags. One has **no `alt` attribute at all**:
`src/app/[slug]/SessionsSection.tsx:56`, a session photo. That is a genuine accessibility
bug independent of any redesign.

The more interesting finding: 11 images carry `alt=""`, which declares them decorative.
Several of those are **content** images that the deck says must describe themselves — the
homepage hero, `wing.jpg`, the category heroes, and the practitioner photo in
`PractitionerCard`. So the deck's "alt text absent on every content image" is slightly
off in a way that matters: the attribute is present, but set to a value that tells
assistive technology to skip a photograph that is carrying meaning. Fixing it is editing
values, not adding attributes.

Six raw `<img>` tags: the homepage wordmark (has a real alt), three admin-editor previews
(`alt=""`, correct — they sit beside their own filename), and two in `PageBlocks` that
correctly use author-supplied `alt={c.alt}`.

### 3.5 Schema validates

Every page emits syntactically valid JSON-LD. Types by page:

| Page | Nodes |
|---|---|
| `/`, `/explore`, `/join-sessions`, `/pricing`, `/mission`, `/help` | Organization, WebSite |
| `/explore/readings` | Organization, WebSite, CollectionPage, BreadcrumbList |
| `/in/topanga` | Organization, WebSite, CollectionPage |
| `/kiki-falconer-2` | Organization, WebSite, Person |

Valid, but thin against the deck's inventory: no FAQPage anywhere, no HowTo, no
BreadcrumbList outside category pages, no SearchAction, and Organization is missing
`legalName`, `founder`, `address`, and `sameAs`. All of that is rebuild scope.

### 3.6 The Critical blocker is still open, and it is worse than described

`/kiki-falconer-2` returns **200** and is still serving seed content. It is not only in
the visible page — it is **in the JSON-LD**, served to crawlers as structured data:

```
"@type":"Service","name":"Dev Fixed Virtual Session",
"description":"Seeded for booking flow testing. Fixed price, virtual.",
"serviceType":"Business Coaching"
```

The deck's sequencing is explicit that nothing ships before this is cleared, because the
whole plan links the marketplace from the homepage. Right now a crawler that finds this
profile gets machine-readable confirmation that the catalogue is test data.

---

## 4. Page 3 plan

### §1 H1 and definition

`<h1>Run your practice, keep what you earn</h1>`, replacing "Join Sessions". The
practitioner-side definition paragraph verbatim. `REQUEST AN INVITATION` and `HAVE AN
INVITATION CODE`.

The footer link text changes with it, per your brief. That is `site-footer.tsx`, **30
routes**.

### §2 The problem

Verbatim. Note this is the same beat as Page 1 §5, minus the closing "sessions.guide
takes that part" line. Deliberate in the deck; the two pages will share a component with
a prop for the trailing line rather than duplicating the copy.

### §3 The three hooks

Six cards down to three. The existing `BENEFITS` array loses "Get paid your way" (folded
into hook one), "Spend your energy on the work" and "A calendar that tells the truth"
(both absorbed), and "Reviews earned honestly" (moves to §5). Same ranked, asymmetric
treatment as Page 1 §6 so the two pages read as one system.

### §4 How it works — the conversion spine

Five numbered steps, verbatim.

Scannable in four seconds means the bold leads have to carry it alone: *Request an
invitation · Build your profile · Add your session types · Set your availability ·
Publish.* Treatment: large display-font numerals, the bold lead at h3 scale, the
explanatory sentence at body scale beneath, and enough vertical rhythm that the five
leads form a visible column when the eye skips the prose. Horizontal at 1440, stacked
with a connecting rule at 375.

**HowTo schema, with a caveat I want on the record.** It is valid schema.org and it is
worth having for answer engines and LLM extraction. But Google **retired HowTo rich
results in 2023**, so this will not produce a rich result in Google search. The deck
presents it as an AEO play, which is the right framing; I just do not want it sold
internally as a Google rich-snippet win.

### §5 What we ask of you

Verbatim, four paragraphs. Per the deck, `/help/practitioners` separately claims
practitioners can feature a review, which is not built — that is a correction on another
page, flagged not fixed.

### §6 What it costs — table one

Real tiers, `$0` said out loud, no comps line. A comparison table, not three cards.

### §7 Questions practitioners ask — table two

Nine Q&As verbatim, FAQPage schema built from the same source array as the visible copy.
Contains the cancellation table.

**Differentiating the two tables.** They sit on one page and must not read as the same
component twice.

| | §6 Pricing | §7 Cancellations |
|---|---|---|
| Job | Decision surface | Reference |
| Read direction | By column, comparing tiers | By row, looking one policy up |
| Weight | Filled olive header row, large prices in the heading font, generous cells | Hairline rules only, compact, mono labels, body-scale throughout |
| Position | Its own full-width section, breathing room | Nested inside an FAQ answer, indented with the answer text |
| Ends with | A `SEE FULL PRICING` link | Nothing. It is not a call to anything |

So: one is a piece of furniture, the other is a footnote. Same underlying `<table>`
semantics, deliberately different visual register.

Responsive: same reasoning as the `/explore` plan — real `<table>` at every breakpoint,
in a labelled, focusable scroll region at 375, rather than a `display:block` stack that
would strip table semantics from screen readers and from the answer engines the tables
exist to feed.

### §8 Founder

Short version, `[FOUNDER NAME]` placeholder constant, links to `/mission`. Same
placeholder and same portrait problem as Page 1 §8.

### §9 Close

Email capture that **submits in place**. Today this section links to `/`, which is the
exact behaviour the deck calls out: four of seven marketing CTAs bouncing to the holding
page hero and discarding the intent of someone who read to the bottom.

This is the practitioner side of the waitlist, which is what the existing `waitlist`
table and `/api/waitlist` already do — so unlike Page 1 §10, **this form needs no
migration**. The composite-key problem only appears when the seeker capture is added
alongside it.

### Forms, both of them

Per your brief: real inline validation (email shape, on blur, not on every keystroke), a
loading state that is visible rather than a swapped label, a success state that keeps the
person on this page, and a failure state that preserves what they typed. Keyboard-only
completion verified for both. This needs a real `Button` with a disabled and pending
state — `.btn-primary` is a CSS class with neither.

### Head and schema

Title, description, canonical per the deck, pending the em-dash decision — the Page 3
title has one too. `WebPage` + `BreadcrumbList` + `FAQPage` + `HowTo`. **No `Offer`
nodes**; those belong on `/pricing`.

---

## 5. Dashboard: the session description field

`src/app/dashboard/SessionTypeForm.tsx:261-272`. Currently a bare `<textarea rows={5}>`
under a `DESCRIPTION` label. No helper text, no placeholder, no examples, and
`validateSessionTypeInput` does not constrain it. Confirmed unguided.

`seeker-journey.md` Stage 4 is blunt about the stakes: this is the copy a hesitant seeker
reads at the moment of deciding, reviews cannot carry that job at launch, and the field
"will be filled out in ninety seconds unless the form stops them."

Plan:

1. **Helper text** — the deck's five prompts as a list beneath the label.
2. **Placeholder** — one line teaching the register, not a full example.
3. **A good and a bad example**, in a `<details>` disclosure so the form stays calm.
4. **A soft length hint**, not a hard minimum. A required character count produces padding,
   which is worse than a short honest description.

**The good and bad examples are not in the deck. I would be writing them.** They are the
highest-leverage strings in the whole job, because every practitioner will imitate them,
so I will draft them for sign-off rather than ship them. Question 5.

---

## 6. Status of everything else

Three plans now exist and none has been built. The blocking questions are unchanged and
unanswered:

| From | Blocking question | Status |
|---|---|---|
| `/` | Hero and close wash both fail WCAG AA (measured 3.56:1 and 3.03:1) | open |
| `/` | Em dash in the deck's page titles, banned by brand voice. **Applies to all three pages** | open |
| `/` | Founder `Person` schema with a placeholder name | open |
| `/` | No founder portrait exists in `public/` | open |
| `/`, `/explore` | `ENERGY HEALING` or `FREQUENCY` | open, and you asked me to surface not resolve |
| `/` | Waitlist composite key for the seeker capture | open |
| `/explore` | **The quiz has no answer-to-category mapping.** 48 combinations undefined | open |
| `/explore` | Sequencing: shared foundation first, then pages | open |
| all | The seed profile is still published and in the JSON-LD | open, and it gates the homepage relink |

Nothing on Page 3 is blocked by the first seven of those, other than the em dash and the
founder placeholder. **Page 3 is the most buildable of the three** — its copy is complete,
its forms need no migration, and its robots blocker is now cleared.

---

## 7. Open questions

1. **Sequencing.** Three plans, nothing built. Do you want me to build Page 3 now, since
   it is the least blocked, or hold until the shared foundation and Page 1 land? Building
   Page 3 first means the header, footer, tokens, and `Button` get created here and the
   other two pages inherit them.
2. **The em dash**, third time asked. It blocks the Head block on all three pages. Colon,
   pipe, or ship it.
3. **Footer link text.** Changing "Join Sessions" to "Why sessions.guide" touches
   `site-footer.tsx`, which is 30 routes. Confirm that lands with this page rather than
   waiting for the footer rebuild.
4. **`[FOUNDER NAME]` in schema.** Same as Page 1: omit the `Person` node while the name
   is a placeholder, or publish the placeholder?
5. **The good and bad session-description examples.** I draft, you sign off, before
   anything reaches the dashboard.
6. **`/pricing`.** `llms.txt` now points at it and it contradicts D24. In scope for me to
   fix, or someone else's?
7. **Migration `0005`.** The deck claims the `waitlist` table does not exist in
   production. `/` posts to it today, so either the deck is wrong or `/` is silently
   failing in prod. Worth confirming before §9 depends on it.
