# guides'space — Brand & Naming

Binding for all display copy. Code identifiers are unaffected — see "Frozen identifiers" below.

Established 2026-08-21, replacing `sessions.guide`. Driver: trademark conflict with Sessions Health (US, active since 2021).

**Amended 2026-08-27** — see "Lexicon" (enumeration exception) and "The mark" (logo asset rule).

---

## The mark

**`guides'space`** — all lowercase, straight apostrophe, no space around the apostrophe.

The possessive is intentional and load-bearing: *the space belongs to the guides*. The brand name states the sovereignty position before any copy does. Never gloss it as "Guides Space" or "a space for guides" in body copy — that inverts the meaning.

### BRAND_NAME marker

The mark is never hand-typed. It resolves from one constant so the apostrophe can never drift between straight, curly, and HTML-escaped forms across the codebase.

```ts
// src/lib/brand.ts — single source of truth for the mark
export const BRAND_NAME = "guides'space";           // plain text, straight apostrophe
export const BRAND_NAME_HTML = "guides&apos;space";  // JSX / HTML contexts
export const BRAND_DOMAIN = "guidesspace.com";
export const BRAND_EMAIL_DOMAIN = "guidesspace.com";
```

**Rules:**

- JSX must use `BRAND_NAME_HTML` or `{BRAND_NAME}` — a bare straight apostrophe in JSX text trips React's `react/no-unescaped-entities` lint.
- Never write the mark literally in `.tsx`, `.ts`, email templates, or metadata strings. Import the constant.
- Email templates (React Email) interpolate `{{brand_name}}`, resolved from `BRAND_NAME` at render.
- The curly apostrophe is **wrong in all text renderings**.
- **Amendment 2026-08-27 — the logo asset.** The wordmark graphic uses a horizontal graphic separator between GUIDES and SPACE, not a typographic apostrophe character. The straight-apostrophe rule governs text renderings only (body copy, metadata, JSON-LD name fields, email). It does not apply to the logo file, and the logo's stylization is not required to match the typed mark glyph-for-glyph.
- Grep gate before any copy ships: `grep -rn "guides['']space" src/ --include=*.tsx --include=*.ts` should return only `brand.ts`.

### Wordmark vs domain

The mark and the URL diverge by design — apostrophes cannot appear in a domain.

| Context | Form |
|---|---|
| Wordmark, body copy, logo | `guides'space` |
| Domain | `guidesspace.com` |
| Canonical host | `https://www.guidesspace.com` *(www/apex — confirm, BRAND-3)* |
| Email | `hello@guidesspace.com` |
| Social handles | `guidesspace` |

Accept that voice search and screen readers will render the mark as "guides space." That is fine. Do not add pronunciation copy.

---

## Lexicon (locked 2026-08-21, amended 2026-08-27)

| Concept | Display term | Code identifier (frozen) |
|---|---|---|
| Practitioner | **Guide** | `practitioners` |
| Curator / recommender | **Curator** | `sages`, `sage_recommendations`, `sage_codes` |
| Person who books — guide-facing | **client** | `seekers`, `seeker_id`, `seeker_token` |
| Person who books — client-facing | **you** (second person, no noun) | *(same)* |
| Unit of booking | **session** | `session_types`, `bookings` |
| The field | **healing & transformational arts** | — |

### Notes on each

**Guide** replaces "practitioner" as the standalone public term for a platform user.

**Amendment 2026-08-27 — enumeration exception.** "Practitioner" IS permitted in public copy when enumerating kinds of guides, e.g. "guides, healers, coaches, and practitioners of the mystical arts." It is never the standalone term for a platform user. This supersedes the earlier BRAND-15 reading that practitioner never appears in public copy. "Practitioner" also survives in investor, legal, and internal docs.

**Curator** replaces the previous "Guide" display copy for Sages — that word is now taken. Curator claims taste and judgment rather than wisdom. Code identifiers stay `sage*` per the frozen-identifier rule.

**Note on brand-voice.md.** `brand-voice.md` and `docs/design/explore-rebuild-plan.md` state that practitioners are never called guides and that "Guide" is the curator role only. That is the pre-rebrand reading and is superseded by this file. Where they conflict, this file governs.

**Split register for the person who books.** Guide-facing surfaces (dashboard, invitation page, CLIENTS tab, pricing) say *clients*. Client-facing surfaces (homepage, explore, profiles, booking flow, transactional email) use second person — *find your guide*, not *seekers find guides*. There is no invented noun. This matches the existing `clients` table and requires no schema change.

⚠︎ **Ambiguity to watch:** "client" as display copy collides with the deprecated `guest_name` / `guest_email` booking columns and with the `clients` rollup table. When instructing Claude Code, always disambiguate: "the CLIENTS dashboard tab" (feature) vs "the `clients` table" (schema) vs "clients" (display copy for seekers).

**Session** survives the rebrand deliberately. It is the honest word for what gets booked, it matches `session_types`, and keeping it means the vocabulary outlives the old brand name.

**"Healing & transformational arts"** appears in the homepage hero only. Elsewhere: name the modalities directly (reiki, astrology, breathwork, somatics) or say nothing. Metadata convention keeps "wellness" for search-volume reasons.

---

## Voice

Three registers carried forward from `brandvoice.md`: **Plain**, **Warm**, **Elevated**.

- FAQ headings stay **Plain** — literal questions, written for answer engines.
- Elevated vocabulary (abundance, sovereign, facilitate, alignment, grace, purpose, practice, container, intention, invitation, freedom) appears once or twice per section, never clustered — except deliberate emotional closes.

**Failure mode is "advertorial."** It breaks when copy uses punchy triads, Silicon Valley cadence with wellness vocabulary layered on, antithesis, triple hammers, emphasis fragments, or an implied adversary. The correct register slows the sentence rhythm, uses longer curving sentences and specific sensory detail, and a "we" that sounds like it has personally sat on the table.

**Payment sovereignty is the frame** — not a "we don't take a cut" platform claim. The name now carries this. Say it less in copy than you would have under the old brand.

---

## Positioning

**Category:** not a directory (directories don't book), not booking software (Mindbody and Acuity don't get you found). A home for independent healing & transformational arts guides where the people who need them can find them and book them, and where the guide keeps the money.

**Three pillars:**

1. **Sovereignty** — guides set prices, terms, and payment method. Revenue is subscriptions, not session fees.
2. **Curated, not crowdsourced** — invite-only, plus Curators who vouch for named guides. Twelve years and 2,790+ practitioners at Conscious City Guide is why this is credible.
3. **Two doors** — some arrive knowing the session they want, some wanting a person. Search supports both.

### Founder credibility

12 years co-running Conscious City Guide, working directly with 2,790+ practitioners (guides, healers, coaches, astrologers, channels, wisdom keepers, doulas, therapists, intuitives). This is real professional history and informs guide-first positioning. **It is not a claim about the guides'space roster** — the platform is pre-launch, invite-only, with no guides onboarded yet.

---

## Homepage

**Audience:** guides and clients, weighted evenly.

**Structure:** one message that works for both — not two doors side by side, not a toggle, not client-first-with-a-guide-section-below.

**Register:** open (BRAND-10).

**Center of the message:** open (BRAND-8). Candidates: the guides themselves · sovereignty · curation · the act of being guided.

---

## Frozen identifiers

Display copy changed; code did not. Never rename code to match copy:

`practitioners` · `seekers` · `seeker_id` · `seeker_token` · `sages` · `sage_recommendations` · `sage_codes` · `clients` · `session_types` · `bookings` · route `/sages/[slug]`

Renaming any of these is a migration, not a copy change, and is out of scope for the rebrand.

---

## Standing constraint: copy must be grounded in shipped code

- No "holding fee" or "honorarium" — not in the `pricing_model` schema
- No "onsite" — the `payment_method` enum is `stripe` and `offsite` only
- No approval/decline booking flow — GAP-1, the transition does not exist
- No client export promise until the feature ships
- No review-takedown promises — only an append-only report log exists
- No specific refund timing without confirming `bookings` snapshots the cancellation policy at booking time
- Pricing models are exactly: `fixed`, `sliding_scale`, `donation`, `inquire`
- "Pay in person" and "donation-based" both use `offsite`; they differ only in `offsite_payment_instructions` content, not code path
