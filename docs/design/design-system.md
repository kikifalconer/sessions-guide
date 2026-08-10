# Design System — What Actually Exists Today

An inventory of the shipped code, not the intended system. Written 2026-08-06 against
`main` @ `0f25f19`. Every claim here was read out of `src/`, not out of
`context files/design-system.md`.

**Read this first:** `context files/design-system.md` is the spec. It has drifted from
the code in several load-bearing ways, listed under [Spec drift](#spec-drift-context-filesdesign-systemmd-vs-code)
below. Where the two disagree, this document describes the code.

There is **no `tailwind.config.js`**. This is Tailwind v4, configured CSS-first: the
entire token layer is the `:root` block plus the `@theme inline` block in
`src/app/globals.css` (164 lines). That file is the whole design system.

---

## 1. Fonts

Four font families are referenced across the project. Three are actually loaded. One
is not loaded at all.

### Loaded and in use

| Family | How it loads | Variable | Applied to |
|---|---|---|---|
| `SessionsGuide` | Self-hosted `@font-face`, `globals.css:3-12`, files at `/public/fonts/SessionsGuide.woff2\|.woff\|.otf` | `--font-display` | The global `h1` rule only |
| `itc-avant-garde-gothic-pro` | Adobe Typekit, kit `zlm6tfg`, `<link>` in `src/app/layout.tsx:21` | `--font-heading` | `body` default, `h2`, `h3`, `h4`, `p` |
| `degular-mono` | Same Typekit kit | `--font-ui` | `h5`, `h6`, `.caption`, `.label`, `.btn-primary`, `.btn-secondary`, `.modality-list` |

I fetched `https://use.typekit.net/zlm6tfg.css` to confirm its contents. The kit
serves exactly two families: `degular-mono` and `itc-avant-garde-gothic-pro`. Nothing
else.

### On "DM Mono" — settled, not an open issue

**The UI mono face is `degular-mono`. "DM Mono" is stale naming from a superseded
design and should be ignored wherever it appears.** Confirmed by Kiki, June 2026 and
again 2026-08-06.

Recorded here because several current documents still say "DM Mono" and it reads like a
discrepancy on first encounter:

- `brand-voice.md:147-148` — "Buttons: DM Mono uppercase", "Labels and section headers:
  DM Mono uppercase"
- `context files/design-system.md:22,37` — `--font-ui: "dm-mono", "DM Mono", monospace`
- the landing copy deck, ~11 times, as a layout instruction ("DM Mono labels", "text
  link in DM Mono")

**Read all of those as `degular-mono`.** They describe the right intent — a mono face
for UI chrome, in editorial contrast against the soft heading font — under an old name.
The shipped code is correct and nothing is falling back to a system monospace:
`--font-ui` resolves to `"degular-mono", monospace` (`globals.css:26`), and the Typekit
kit serves it. No build change is needed and no decision is pending. The copy deck's
mono-face instructions can be followed as written.

### Referenced but not loaded

| Family | Where claimed | Reality |
|---|---|---|
| `minerva-modern` | `context files/design-system.md:37` says it is loaded via Typekit and "mapped as SessionsGuide display" | Not in the kit. `SessionsGuide` is a self-hosted webfont, unrelated to Typekit |
| `barlow-condensed` | `context files/design-system.md:37` lists it as a kit font | Not in the kit. Zero references in `src/` |
| `DM Mono` | `design-system.md:22`, `brand-voice.md:147-148`, copy deck throughout | Stale name for `degular-mono`. Settled, not an issue — see above |

### Orphaned font assets

`public/fonts/` contains a second self-hosted trio — `SessionsFont.otf`,
`SessionsFont.woff`, `SessionsFont.woff2` — with **no `@font-face` declaration
anywhere**. Dead weight, or an older cut of the display face. Worth confirming before
anyone deletes it.

### Font usage in practice

| Utility | Files | Total uses |
|---|---|---|
| `font-heading` | 18 | 32 |
| `font-ui` | 7 | 10 |
| `font-display` | 0 | 0 |

`font-display` is never written as a utility class. The display face reaches the page
solely through the element-level `h1` rule in `globals.css`. That means **every `h1`
on the site is the display font in olive**, and the only way to get display type on a
non-`h1` element today is to write an `h1`. Three pages already fight this by
overriding the olive with an inline style (see §7).

---

## 2. Type scale

There is no Tailwind font-size scale. `globals.css` styles bare HTML elements, and
the two utility classes `.caption` / `.label`. Everything else is arbitrary values.

| Selector | Family | Weight | Size | Line height | Tracking | Other |
|---|---|---|---|---|---|---|
| `h1` | display | — | `clamp(2.25rem, 5vw, 4rem)` | 1.05 | `-0.02em` | `color: var(--color-olive)` |
| `h2` | heading | **100** | `clamp(1.5rem, 3vw, 2.5rem)` | 1.1 | `0.01em` | |
| `h3` | heading | 300 | `clamp(1.1rem, 2vw, 1.75rem)` | 1.15 | | |
| `h4` | heading | 300 | `1.1rem` | 1.2 | | |
| `h5`, `h6` | ui | — | `0.8rem` | 1.4 | `0.08em` | uppercase |
| `p` | heading | 300 | `0.95rem` | 1.65 | `0.02em` | |
| `.caption`, `.label` | ui | — | `0.75rem` | 1.4 | `0.06em` | uppercase |
| `.btn-primary`, `.btn-secondary` | ui | — | `0.75rem` | — | `0.08em` | uppercase |
| `.modality-list` | ui | — | `0.68rem` | 1.9 | `0.09em` | uppercase, `text-light`, `opacity: .6` |

`.caption` and `.label` are byte-identical rules under two names. 154 uses of
`caption`, 267 of `label`, across 43-44 files each. Nothing distinguishes them; they
are used interchangeably in the same files.

`.modality-list` is **unused** — zero references in `src/`. Leftover from an earlier
holding page.

### Hardcoded font sizes

Twenty-four `text-[…]` arbitrary values across thirteen files. Every one of these is a
type-scale decision made outside the type scale:

| File:line | Value |
|---|---|
| `src/app/[slug]/InfoStrip.tsx` | `text-[0.8rem]` ×3 (26, 33, 40), `text-[0.95rem]` ×4 (28, 35, 42, 59), `text-[0.8rem]` (56), `text-[0.75rem]` ×2 (64, 71) |
| `src/app/[slug]/ProfileHero.tsx:35` | `text-[1.3em]` |
| `src/app/[slug]/reviews/ReportReview.tsx:42` | `text-[0.85rem]` |
| `src/app/dashboard/admin/pages/PageEditor.tsx:27` | `text-[0.85rem]` |
| `src/app/help/FaqPage.tsx:49` | `text-[0.85rem]` |
| `src/app/page.tsx:13` | `text-[0.8rem]` |
| `src/app/page.tsx:85` | `text-[1.05rem]` |
| `src/app/pricing/page.tsx:80` | `text-[2rem]` |
| `src/app/review/[token]/ReviewForm.tsx:78` | `text-[1.75rem]` |
| `src/app/search/page.tsx:18` | `text-[0.8rem]` |
| `src/components/account/SeekerReviews.tsx:85` | `text-[1.75rem]` |
| `src/components/site-footer.tsx:8` | `text-[0.72rem]` |
| `src/components/site-footer.tsx:64` | `text-[0.68rem]` |
| `src/components/site-header.tsx:62` | `text-[16px]` / `sm:text-[24px]` / `md:text-[34px]` |

Note the near-duplicates that should be one token: `0.68 / 0.72 / 0.75 / 0.8 / 0.85 /
0.95 / 1.05rem` is seven sizes inside a half-rem span, and `0.75rem` already exists as
`.caption`. The footer defines its own `0.72rem` link size rather than using `.label`.

Hardcoded tracking and leading appear in seven files: `page.tsx:13,85,131`,
`search/page.tsx:18`, `site-footer.tsx:8,64`, `help/FaqPage.tsx:49`.

---

## 3. Color tokens

Defined in `:root` (`globals.css:14-27`), then re-exported to Tailwind through
`@theme inline` (`globals.css:35-47`).

| Token | Value | Tailwind utility | Uses in `src/` |
|---|---|---|---|
| `--color-bg` | `#eae5df` | `bg-bg` | 34 |
| `--color-olive` | `#444732` | `bg-olive` 3, `text-olive` 96, `border-olive` 35, `accent-olive` 1 | 135 |
| `--color-dark` | `#111111` | `text-dark` | 296 |
| `--color-light` | `#ffffff` | `bg-light`/`text-light` | 17 |
| `--color-border` | `#D9D5CF` | `border-border` | 84 |
| `--color-surface` | `#EDEAE5` | `bg-surface` | 65 |
| `--color-hero-overlay` | `rgba(30, 18, 1, 0.10)` | `bg-hero-overlay` | **1** |
| `--color-hero-scrim` | `rgba(17, 17, 17, 0.55)` | **not exported** | via `.page-hero-scrim` only |

Six semantic tokens plus two overlay tokens. No accent, no error/success/warning
color, no disabled state, no hover token — hover is expressed as a token swap
(`hover:border-olive`, `hover:text-olive`) or an opacity modifier.

`--color-hero-scrim` is deliberately not in `@theme inline`; it exists only to feed the
`.page-hero-scrim` gradient class (`globals.css:31-33`), used once in
`src/components/pages/PageHero.tsx:27`.

### Hardcoded colors

**Good news first: there are zero hex literals in any `.tsx` or `.ts` file.** The
"never hardcode hex inline" rule in `CLAUDE.md` is being followed.

The leaks are elsewhere:

**Three hardcoded hero washes**, each a different opacity, all bypassing the
`--color-hero-overlay` token that exists for exactly this purpose:

| File:line | Value | Context |
|---|---|---|
| `src/app/page.tsx:74` | `bg-black/25` | Landing hero over `reikiHero2.jpg` |
| `src/app/page.tsx:197` | `bg-black/35` | Landing section 3 over `wing.jpg` |
| `src/app/explore/[category]/page.tsx:168` | `bg-black/20` | Category hero |

Meanwhile `src/app/[slug]/ProfileHero.tsx:28` uses `bg-hero-overlay` correctly. Four
hero images, four different wash treatments, one token used once. The copy deck
repeatedly says "with the current wash" as though there is one; there are three.

**Ad-hoc opacity modifiers on tokens** — not wrong, but unsystematized. `text-light/80`
and `text-light/60` and `border-light/15` in `site-footer.tsx`; `opacity-70` on
`text-dark` in at least six files (`explore/page.tsx:42`, `pricing/page.tsx:100`,
`PractitionerCard.tsx:38`, and others); `opacity-50` in two breadcrumbs. There is no
"muted text" token, so every surface invents one.

---

## 4. Spacing scale

**There is no custom spacing scale.** Tailwind's default 4px-based scale is used
as-is. No `--spacing-*` entries in `@theme`.

What exists instead is an informal, undocumented section rhythm:

| Value | Uses | Where |
|---|---|---|
| `py-3` | 46 | Form fields, pills, table-ish rows |
| `py-4` | 11 | Header, small rows |
| `py-12` | 11 | Discovery page body (`explore`, `search`, `in/[city]`, category) |
| `py-16` | 8 | `/explore` body |
| `py-24` | 6 | Marketing section (`join-sessions`, `pricing`, `help`) |
| `py-28` | 4 | Landing sections, `mission` |
| `py-14`, `py-10`, `py-20`, `py-8` | 3/3/2/1 | Scattered |

`px-6` (50 uses) is the de facto page gutter, with `sm:px-10` (7 uses) on wide
marketing sections only — applied inconsistently: `join-sessions` and `pricing` and
`mission` and `site-footer` have it, `explore` and `search` and `in/[city]` and
`help` do not.

### Container widths

Ten distinct arbitrary max-widths, none tokenized:

| Value | Uses | Pages |
|---|---|---|
| `max-w-[1200px]` | 16 | Discovery, help, mission, footer, category, city, search |
| `max-w-[760px]` | 6 | Landing hero, join-sessions copy, mission body |
| `max-w-[1100px]` | 5 | join-sessions grid, pricing grid |
| `max-w-[1000px]` | 3 | |
| `max-w-[900px]` | 4 | |
| `max-w-[820px]` | 2 | |
| `max-w-[640px]`, `max-w-[720px]`, `max-w-[560px]`, `max-w-[320px]` | 1-2 each | |

`context files/design-system.md` says "Max content width: ~1200px, centered." Sixteen
of thirty-nine container declarations honor that. The rest are one-off editorial
measures. Separately, measure is controlled by `ch` units: `48ch`, `52ch`, `54ch`,
`60ch`, `70ch`, `80ch`, `46ch`, `28ch`, `20ch`, `16ch` all appear.

---

## 5. Breakpoints

**Tailwind defaults, unmodified.** No breakpoint overrides in `@theme`.

| Prefix | Width | Uses in `src/` |
|---|---|---|
| `sm:` | 640px | 78 |
| `md:` | 768px | 23 |
| `lg:` | 1024px | 4 |
| `xl:` | 1280px | 0 |
| `2xl:` | 1536px | 0 |

Only two are structurally load-bearing:

- **`md:` (768px)** switches the header between inline nav and hamburger. This value is
  **duplicated in JavaScript** as `const DESKTOP_MQ = '(min-width: 768px)'` in
  `src/components/header-nav.tsx:10`, with a comment acknowledging the coupling. If the
  header breakpoint ever changes, two places must change together.
- **`lg:` (1024px)** is used in exactly four places, all the same thing: the
  `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` result grid on category, city, search,
  and sage pages.

Everything else is `sm:`, which does most of the mobile→desktop work at 640px. The
practical consequence is that the site has essentially **one breakpoint** for layout
and a second for the header. Tablet (640-1024px) gets the desktop treatment.

---

## 6. Shared components

### Actually shared (live in `src/components/`)

| Component | File | Type | Consumers |
|---|---|---|---|
| **SiteHeader** | `site-header.tsx` | async server | **23 files** — see below |
| **HeaderNav** | `header-nav.tsx` | client | 1 (SiteHeader only) |
| **SiteFooter** | `site-footer.tsx` | server | 1 (`app/layout.tsx`) → **every route** |
| **PractitionerCard** | `PractitionerCard.tsx` | server | 4 pages |
| **ContactForm** | `contact-form.tsx` | client | `/contact`, `/help` |
| **MagicLinkForm** | `magic-link-form.tsx` | client | `/login`, booking flow |
| **PageBlocks / PageHero** | `pages/` | server | `/guides/[slug]`, `/sages/[slug]` |
| **SeekerBookings / SeekerReviews / SeekerSettings** | `account/` | client | `/account`, dashboard MY SESSIONS tab |

**SiteHeader consumers (23):** `contact`, `privacy`, `join-sessions`, `in/[city]`,
`terms`, `mission`, `explore`, `explore/[category]`, `search`, `dashboard` (+ `DashboardShell`,
`admin/pages` ×3, `billing`), `guides/[slug]`, `account`, `pricing`, `[slug]`,
`[slug]/reviews`, `sages/[slug]`, `help`, `help/FaqPage`.

Two modes via one prop (D-decision "Shared Site Header"): `<SiteHeader />` for regular
pages, `<SiteHeader centerLabel={name} />` for profile pages (centered name, hamburger
at all widths).

**Nav config** is a `NavLink[]` array at `site-header.tsx:16-22` with a `live: boolean`
gate. Current state — **only `SEARCH` renders**:

```
{ label: 'EXPLORE',           href: '/',      live: false }   // href is wrong: /explore exists
{ label: 'SEARCH',            href: '/search', live: true }
{ label: 'FOR PRACTITIONERS', href: '/join',   live: false }   // href is wrong: /join is the onboarding wizard;
                                                              // the marketing page is /join-sessions
{ label: 'SAGES',             href: '/sages',  live: false }   // no /sages index route exists
{ label: 'ABOUT',             href: '/about',  live: false }   // no /about route; the page is /mission
```

Three of the four held-out links point at hrefs that are wrong or nonexistent. They are
inert today because `live: false`, but flipping any of them on as written sends users
to a 404 or the wrong page. The copy deck's Section 1 nav depends on fixing all of them.

### Not components — global CSS classes

These do the work components would normally do, applied as `className` strings:

| Class | Defined | Uses | Applied to |
|---|---|---|---|
| `.label` | `globals.css:103` | 267 | Any element |
| `.caption` | `globals.css:103` | 154 | Any element |
| `.btn-secondary` | `globals.css:124` | 48 | `<button>` **and** `<Link>` |
| `.btn-primary` | `globals.css:112` | 37 | `<button>` **and** `<Link>` |
| `.hamburger-icon` / `.menu-close-icon` | `globals.css:139` | 2 | `<span>` |
| `.page-hero-scrim` | `globals.css:31` | 1 | `<div>` |
| `.modality-list` | `globals.css:155` | **0** | — dead |

**There is no Button component.** `.btn-primary` is applied to both real buttons and
`next/link` anchors, which means the two share visual treatment but not focus, disabled,
or loading behavior. `page.tsx` handles pending state by swapping the label text
(`'SENDING'` / `'CHECKING'`) with no visual affordance and a raw `disabled` attribute
that the CSS class does not style. A disabled `.btn-primary` looks identical to an
enabled one.

### Form fields — six duplicated definitions, three variants

There is no form field component. Six files each declare a local `const FIELD`:

| File:line | Definition |
|---|---|
| `src/app/dashboard/AvailabilityBlockForm.tsx:29` | `w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive` |
| `src/app/dashboard/SessionTypeForm.tsx:44` | identical to above |
| `src/components/contact-form.tsx:8` | identical to above |
| `src/app/page.tsx:12` | `… px-4 py-3 font-ui text-[0.8rem] tracking-[0.04em] …` |
| `src/app/search/page.tsx:17` | `… px-3 py-2 font-ui text-[0.8rem] uppercase tracking-[0.04em] … sm:w-auto` |
| `src/app/dashboard/admin/pages/PageEditor.tsx:26` | `… px-3 py-2 font-ui text-[0.85rem] …` |

Three form-field designs coexist: a heading-font one for long-form dashboard input, a
mono one at `px-4 py-3` for the landing page, and a smaller mono one at `px-3 py-2` for
search and the admin editor. Same for links: `site-footer.tsx:7` and `help/page.tsx:7`
each define an unrelated local `const LINK`.

Field markup is otherwise raw `<input>` / `<select>` / `<textarea>`, 20 files. No label
component, no error-message component, no fieldset pattern.

### Cards

`PractitionerCard` is the only extracted card. Everything else is an inline `<div>` with
the same repeated recipe — `border border-border bg-surface` plus padding:

- `pricing/page.tsx:75` — tier card, adds `border-olive` when highlighted
- `explore/[category]/page.tsx:178`, `search/page.tsx:109`, `in/[city]/page.tsx:88` —
  psychedelic disclaimer box, **three verbatim copies** of the same markup *and* the
  same `PSYCHEDELIC_DISCLAIMER` constant declared three times
- `help/page.tsx:7` — the two topic link cards

### Pills

No pill component. Two ad-hoc implementations:

- `/explore` category pills (`explore/page.tsx:35`):
  `caption border border-border bg-surface px-4 py-3 text-dark hover:border-olive`
- `/in/[city]` format toggle (`in/[city]/page.tsx:71,79`):
  `caption border px-4 py-2` with conditional `border-olive text-olive`

Different padding, different active-state model. The copy deck's Section 8 says the
twelve pills render "exactly as `/explore` renders them, so this is mostly a component
you already have." It is not a component; it is nine inline utility classes on a `Link`
inside a `.map()`. Reusing it on `/` means extracting it first.

### Tables

**Zero `<table>` elements exist anywhere in `src/`.** Tabular-looking layouts are CSS
grid: `grid-cols-[1fr_auto_auto_auto]` (2 uses), `grid-cols-[3fr_7fr]`,
`grid-cols-[1fr_320px]`.

---

## 7. Token vs. hardcoded — the summary flag list

**Tokenized (Tailwind `@theme inline`), safe to change centrally:**
all six semantic colors + `hero-overlay`; the three font families.

**Not tokenized — every one of these is a hardcoded value:**

| # | What | Count | Where |
|---|---|---|---|
| 1 | Font sizes outside the element scale | 24 | 13 files, §2 |
| 2 | Container max-widths | 39 declarations, 10 distinct | §4 |
| 3 | Section vertical rhythm (`py-*`) | no scale, 9 distinct values | §4 |
| 4 | Hero image washes | 3 hardcoded `bg-black/NN`, 1 tokenized | §3 |
| 5 | Muted-text opacity | ~10 ad-hoc `opacity-70` / `/80` / `/60` / `/15` | §3 |
| 6 | Letter-spacing and line-height overrides | 7 files | §2 |
| 7 | The `md:` header breakpoint, duplicated in JS | 2 places | `header-nav.tsx:10` |
| 8 | Form field styling | 6 copies, 3 variants | §6 |
| 9 | `PSYCHEDELIC_DISCLAIMER` string | 3 copies | category, search, city |
| 10 | Inline `style={{}}` escapes | 10 | below |

**The ten inline `style` attributes** (`CLAUDE.md` permits inline styles only for
"dynamic calculated values"; none of these are dynamic):

| File:line | Style | Why it exists |
|---|---|---|
| `app/page.tsx:200` | `color: var(--color-light)` | Override the global olive `h1` |
| `explore/[category]/page.tsx:170` | `color: var(--color-light)` | Same |
| `[slug]/ProfileHero.tsx:32` | `color: var(--color-light)` | Same |
| `components/pages/PageHero.tsx:29` | `color: var(--color-light)` | Same |
| `dashboard/DashboardShell.tsx:110` | `textTransform: uppercase` | Beat a competing rule |
| `account/AccountShell.tsx:61` | `textTransform: uppercase` | Same |
| `dashboard/admin/pages/page.tsx:58` | `letterSpacing: 0.04em` | No tracking token |
| `dashboard/billing/BillingClient.tsx:153,231,268` | `letterSpacing: 0.04-0.06em` | Same |

Four of the ten exist for one reason: `h1` hardcodes `color: var(--color-olive)` in
`globals.css:60`, so **every hero with a photographic background has to fight it**. That
is a missing variant (`h1` on dark), not four independent bugs — and the copy deck puts
display type over imagery in Sections 2 and 10, so it will become a fifth and sixth.

---

## 8. Spec drift: `context files/design-system.md` vs. code

The spec is stale in ways that matter. Anyone building from it will build the wrong thing.

| Spec says | Code does | Severity |
|---|---|---|
| `--color-bg: #F4F1ED` "Warm Sand" | `#eae5df` | **Two different page backgrounds.** Which is canonical? |
| `--font-ui: "dm-mono", "DM Mono", monospace` | `"degular-mono", monospace` | Stale name only. The code is correct; the spec line is from a superseded design (§1) |
| Fonts loaded: `minerva-modern`, `itc-avant-garde-gothic-pro`, `barlow-condensed`; DM Mono via Google Fonts | Kit `zlm6tfg` serves only `degular-mono` + `itc-avant-garde-gothic-pro`; `SessionsGuide` is self-hosted; no Google Fonts link exists | Three of four claims false |
| `h2 { font-weight: 300; letter-spacing: -0.01em }` | `font-weight: 100; letter-spacing: 0.01em` | Visibly different: 100 vs 300, and the tracking sign is flipped |
| `p { font-size: 0.95rem }` | same, plus undocumented `letter-spacing: 0.02em` | Minor |
| "Max content width: ~1200px" | 10 distinct widths, 1200px in 16 of 39 | Aspirational |
| Buttons "no border-radius, no shadow" | Honored | ✅ |
| "Never hardcode hex values" | Honored — zero hex in `.tsx` | ✅ |
| Cards `bg-surface`, 1px `border-border`, no radius | Honored | ✅ |
| Nav: "logo (left) × PRACTITIONER NAME (center) + `+` icon (right)" | Honored, `centerLabel` mode | ✅ |

Not in the spec at all: `--color-hero-overlay`, `--color-hero-scrim`,
`.page-hero-scrim`, `.hamburger-icon`, `.menu-close-icon`, `.modality-list`, and the
`live: false` nav-gate pattern.

---

## 9. Components the copy deck needs that do not exist

Every item you listed, plus what I found alongside them. "Nearest existing thing" is
what a build would start from.

| Component | Deck section | Exists? | Nearest existing thing | Build notes |
|---|---|---|---|---|
| **Comparison table** | §9 Pricing preview | **No** | `pricing/page.tsx:71` — a 3-column grid of bordered cards | Zero `<table>` elements exist site-wide. The deck describes "three inline columns, sand background, **no card borders**", which is not what `/pricing` renders (bordered `bg-surface` cards). Either a real `<table>` with a hairline-rule visual, or a borderless 3-column grid. These are different components; see open question 6 in the redesign plan |
| **FAQ accordion** | not in landing deck; `/help` | **No** | `help/FaqPage.tsx` | No `<details>`, no `<summary>`, no accordion, no disclosure pattern anywhere in `src/`. `FaqPage` is deliberately zero-JS: an anchor-nav over topic groups, then every Q&A permanently expanded. Making it an accordion means either `<details>` (keeps it server-only) or the first client-side disclosure component on the site |
| **Category card** | §8 Breadth | **Pills yes, cards no** | `explore/page.tsx:31-39` | The twelve render today as text-only pills — no image, no description, no hover line. The deck's §8 needs the pill extracted as a component; a *card* (image + descriptor) needs `CATEGORY_HERO` images (already at `/images/categories/*`, 12 of them) plus the two new short fields the deck names (hover line, SEO line), neither of which exists on the data |
| **Quiz / three questions** | **not in the copy deck** | **No** | nothing comparable | No multi-step interactive form exists outside `/join` (`JoinFlow.tsx` + 6 step components), which is a practitioner onboarding wizard with server actions and DB writes — wrong shape to borrow. This is a from-scratch client component with no copy written. See open question 7 |
| **City row** | **not in the copy deck** | **No** | `in/[city]/page.tsx` renders cards, not rows; `derivableCities()` in `lib/discovery.ts` returns `{slug, label}[]` | The data exists and is already used to populate the `/search` city `<select>`. The deck's §3 offers "UNITED STATES · AUSTRALIA · INDONESIA" as a proof-strip fallback, which is markets, not cities. See open question 7 |
| **Founder block** | §7 Founder, named | **No** | `page.tsx:150-184` and `mission/page.tsx:41-54` | A two-column image+text section exists on `/` but is a generic layout, not extracted, and its photo is a stock image (`hands-magic.jpg`). §7 requires a real portrait, a name, and a `FOUNDER, SESSIONS GUIDE` rule — **all three are blocking content you have to supply**, per the deck's own sequence item 4 |

### Also missing, and the deck assumes them

| Component | Deck section | Note |
|---|---|---|
| **Proof strip / stat band** | §3 | Three facts on a hairline-ruled band, numbers in the heading font. No stat/metric display exists anywhere. Also blocked on two real numbers (deck sequence item 5) |
| **Email capture** | §2, §10 | `page.tsx` inlines two bespoke forms (waitlist + invite code) with local `useState`. §10 needs the same form **twice on one page** with different labels and different destinations. Extract before duplicating. Per the deck, the seeker variant additionally needs a `waitlist` table migration — the unique constraint on `email` collides for anyone who signs up on both sides |
| **Progressive-disclosure link** | §2 | `HAVE AN INVITATION CODE` reveals the code field on click. Today both fields are always visible side by side. New interaction, no precedent |
| **Button** | throughout | `.btn-primary` is a CSS class with no disabled, loading, or focus-visible state, applied to both `<button>` and `<Link>` |
| **Section / container wrapper** | throughout | Every page re-declares `mx-auto max-w-[…] px-6 py-…`. Ten widths, nine paddings |
| **`h1` on dark** | §2, §10 | Display type over photography currently requires an inline style override, four times already |

---

## 10. What is in good shape

Worth saying, because the flag list above is long:

- Zero hex literals in application code. The color discipline is real.
- `.btn-primary` / `.btn-secondary` / `.caption` / `.label` are used consistently and
  broadly (600+ combined applications). Changing those four rules restyles the site.
- `PractitionerCard` is a clean shared component with a typed data contract
  (`PractitionerCardData` from `lib/discovery.ts`) and no per-card queries (D14).
- `SiteHeader`'s two-mode `centerLabel` contract, `live: false` nav gate, focus trap,
  Esc, click-away, route-change close, and scroll lock are all properly built.
- `FaqPage` is a genuinely reusable content component serving two routes with zero JS.
- The Tailwind v4 CSS-first setup means the token layer is one 164-line file. There is
  no config drift because there is no config.
