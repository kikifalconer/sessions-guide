# Sessions Guide: UX, Story, and Copy Audit

Scope: the marketing surface only. Holding page (`/`), `/join-sessions`, `/pricing`, `/mission`, `/help`, header, footer. In-product discovery and booking copy is out of scope except where it affects the journey.

Audited against `brand-voice.md`, `product-spec.md`, `design-system.md`, and the brief in `content-copy-tasks.md`.

The CSS and visual system are working. Nothing in here asks you to change a color, a font, or a spacing rule. Every recommendation is copy, sequence, and linking.

---

## 1. The one-sentence problem

**The site describes a product for seekers and offers actions only for practitioners.**

The first thing a visitor reads is "A booking platform for transformational and healing sessions: ceremonies, readings, treatments, healings, and journeys." That sentence is written for a seeker. The only two things a visitor can do are apply for a practitioner invitation or enter a practitioner invitation code.

So the page tells seekers what it is and gives them nowhere to go, and tells practitioners nothing about themselves before asking them to apply. Both audiences arrive at the wrong door. Everything else in this audit is downstream of that.

---

## 2. Copy audit

### 2.1 The hero is a meta description, not a headline

"A booking platform for transformational and healing sessions: ceremonies, readings, treatments, healings, and journeys."

This is a category definition. It tells a visitor what shelf the product sits on, not what changes for them. It also over-explains the modalities rather than assuming belief, which is the one thing `brand-voice.md` is most insistent about: "We believe. We do not preach." Five nouns after a colon is a list, not a promise.

There is no h1 in the first viewport. The wordmark image carries the top of the page and the first real `<h1>` on the site appears in section three, below two full scrolls. That is a hierarchy problem as much as a copy one.

### 2.2 Your best line is at the bottom of the page

"Making Lightworkers' Work Lighter" is the most ownable sentence in the codebase. It currently sits in section three, below the fold, set over a photograph, as an `<h1>` that competes with the wordmark for primacy and appears after the visitor has already decided whether to stay.

Your second-best line is on a page almost nobody will look for: "Sessions Guide exists so the people who hold space for others can be held too" (`/mission`). That is the thesis of the whole company and it is available only as a footer link, which means it is reachable in one click and read by almost no one, because nothing above it gives a visitor a reason to go there.

**Both belong in the first screen.** See the copy deck for how.

### 2.3 Terminology drift against your own brand voice doc

These are not style quibbles. Each one is a rule in `brand-voice.md` that the live site breaks.

| Where | Copy | Rule it breaks |
|---|---|---|
| `page.tsx:166` | "practitioners, healers, teachers, and **guides**" | "Guide" is reserved, capitalized, noun-only, for the curator role. "Never call a practitioner a 'guide'." |
| `mission/page.tsx:45` | "practitioners, healers, teachers, and **guides**" | Same rule. Same sentence, second location. |
| `page.tsx:179` | "Those seeking guidance will find their **guides**" | Same rule. |
| `mission/page.tsx:58` | "If you are looking for a **guide**, I hope it helps you find the right one." | Same rule, and the least ambiguous of the five: this is unmistakably a practitioner. |
| `help/page.tsx:18` | "Practitioners and seekers each have their own **guide**." | Same rule. Noun, not the curator role. |
| `page.tsx:180` | "those seeking transformation can find their **alchemist**" | Alchemist is now a subscription tier name ($77.77/mo). Using it as a poetic noun for a practitioner collides with the pricing vocabulary. |
| `pricing/page.tsx:36` | "**Verified** reviews and client records" | "Never use vetting-adjacent language ('verified,' 'screened,' 'approved practitioners'). The community reviews; the platform does not certify." |
| `page.tsx:170`, `mission/page.tsx:56` vs `page.tsx:201` | "light workers" (two words, lowercase) vs "Lightworkers'" (one word, capitalized) | Two renderings of the same term across two pages. Pick one. |
| `help/page.tsx`, `help/*` | "For practitioners" / "For seekers" | Role-neutral chrome rule: "describe the task, not the audience." This is your A7 task, unstarted. |
| `pricing/page.tsx` tier names | Trial / Basic / Elevated | `product-spec.md` locks Free / Elevated / Alchemist (D24). The public pricing page contradicts the product. |
| `pricing/page.tsx:49` | "A richer, more expressive profile" | Nothing in the product defines this. The nearest candidate is the profile-banner and co-branding entitlement that `product-spec.md` lists as "Deferred, design pending... excluded from this model," but that mapping is my inference, not a stated fact. Either way you are selling an undefined feature. |

**Note on the "guide" problem:** there are five live violations across three files, not one. Any fix that only touches `/` section 2 leaves four in place, including the clearest one on `/mission`. Grep the whole `src/app` tree for the word before you call this done, and see 2.9 below for a sixth cluster on the category pages. "Sessions Guide" and "Conscious City Guide" are company names and stay.

### 2.4 The "lightworker" decision you have not made

Worth pausing on, because it is strategic rather than cosmetic.

Your taxonomy carries modalities like Acupuncture and Traditional Chinese Medicine (Ancient Healing Arts), Massage and Somatic Therapy (Embodied), Therapy & Counseling (Coaching), and Doula and Postpartum Support (Family). A licensed acupuncturist or a somatic therapist may not describe themselves as a lightworker, and some will read the word as New Age coded and decide the platform is not for their kind of practice. Meanwhile a reiki practitioner or a channeler may love it.

"Making lightworkers' work lighter" is a great line with a narrower audience than your category list. Three ways to resolve it:

1. **Keep it as the brand line, not the positioning line.** Use it in the closing section, on merch, in the Instagram bio. Lead the page with something that covers the full spectrum.
2. **Keep it as the hero and accept the skew.** Legitimate if energy healing, journeys, readings, and ceremony are the practices you actually want first, and the clinical modalities come later.
3. **Retire it.** Costly. It is the only line on the site with any music in it.

My read: option 1. It is too good to lose and too narrow to lead with.

### 2.5 The founder story is anonymous

"As a cofounder of Conscious City Guide, I spent a decade working with thousands of practitioners..."

No name. No photograph. No signature. An unattributed "I" on a page with no author is the weakest possible form of the strongest asset you have. A decade and thousands of practitioners is real, checkable credibility, and right now a visitor cannot tell whose it is.

The reference infographic you shared puts "your best on-brand photo, team photo, etc" in exactly this slot. Take it literally.

### 2.6 There is no social proof of any kind

Not a review, not a name, not a number, not a logo, not a practitioner face. Zero.

This is the sharpest gap because your own brief ranks "real reviews from people who did the work" as the third seeker lead, and `brand-voice.md` states "Trust is the product" and "community-reviewed is the spine." The site currently asserts taste and provides no evidence of it.

Pre-launch you cannot show session reviews, but you have four honest substitutes available today:

- Conscious City Guide: the decade, and a real number of practitioners worked with
- The founding cohort: a count, and named practitioners with photographs, with permission
- The Guides program, described as what it is: people who did the work, recommending who they trust
- Launch geography: United States, Australia, Indonesia. Specificity reads as substance.

### 2.7 The benefit copy is good, and flattened

`/join-sessions` has six well-written benefit cards in an even 2x3 grid. The writing is on voice. The problem is that six equal things are no things.

Your brief names three hooks: zero transaction fees, you own your client relationships, built for how you actually work. Six cards dissolve that ranking. Two of the six are also mechanics rather than benefits: "A calendar that tells the truth" is a subset of "Spend your energy on the work," and both are really the same promise. Meanwhile "Reviews earned honestly," which is the trust spine of the entire platform, gets one sixth of a grid and no visual weight.

### 2.8 Smaller copy notes

- `/join-sessions` h1 is "Join Sessions," which reads like a form label rather than a proposition, and duplicates the footer link text.
- `/pricing` has no seeker context at all, so a seeker who lands there from search thinks the platform charges them.
- `/explore` opens with "Find a practitioner who actually gets it," which is the best seeker line on the site and is on an orphaned page (see 3.2).
- Root layout meta description is "Find a practitioner who actually gets it," which is seeker-facing, while the page it describes is practitioner-facing. Search snippets and the page disagree.
- `/help` FAQ copy is marked "COPY: placeholder, pending rework" and reads noticeably more mechanical than the rest of the site. Fine for now, but it is live and indexable.

### 2.9 The twelve category descriptors are partly written, and what exists breaks four rules

Worth correcting an assumption in your worklist. B3 asks for one short intro line per category serving three surfaces, hover, the category-page header, and SEO, plus a decision on the Frequency alias. One of the three surfaces is covered. All twelve categories have a four-to-five sentence `CATEGORY_HERO` paragraph live in `src/app/explore/[category]/page.tsx`, used in the page header only. There is no hover line, `generateMetadata` builds SEO descriptions from the category name and its approved modality names and never touches `CATEGORY_HERO`, and the Frequency question is still open (2.10).

So B3 is further along than it reads on the worklist and not done. More urgently, the paragraphs that did ship break four rules:

| Line | Copy | Rule |
|---|---|---|
| `explore/[category]/page.tsx:17` | "The practitioners in this category are experienced **guides**" | Practitioner called a guide. Banned outright. |
| `:29` | "Find a practitioner who can **guide** you into the deeper states" | The verb form `brand-voice.md` says to avoid, for exactly this reason. |
| `:13` | "what you cannot see but can **absolutely** feel" | "absolutely" is on the banned-words list. |
| `:45` | "express, release, and **discover** through the act of making" | "discover" as a standalone verb, banned. Also a three-verb tricolon. |

This matters because of sequencing. Flipping `EXPLORE` live is the cheapest win on the site and it promotes these four to the front door. Do the descriptor pass first. It is half a day.

### 2.10 The "Frequency" alias is an open decision nobody has made

`product-spec.md` and `categories-modalities.md` both note that "Frequency" is the display name for the `energy-healing` slug "in some UI contexts," and B3 flags it explicitly. In practice the category hero image is literally `/images/categories/frequency.jpg` while `/explore` renders `c.name` from the database, which is "Energy Healing."

So the alias exists in the asset pipeline and the spec, and nowhere in the interface. Decide it before the landing page ships, because the twelve category pills are going on the front door and whichever word you pick becomes the public name. "Frequency" is the more distinctive and more on-voice of the two. "Energy Healing" is what people search for. That is a real trade and it is yours to make.

---

## 3. Call to action audit

### 3.1 Every marketing CTA leads back to the same form

| Page | CTA | Destination |
|---|---|---|
| `/` hero | APPLY | `/api/waitlist`, in place |
| `/` hero | ENTER | `/join` if the code is valid |
| `/` section 3 | LEARN MORE | `/join-sessions` |
| `/join-sessions` close | APPLY FOR AN INVITATION | `/` |
| `/pricing` x3 | APPLY | `/` |

Of the seven CTA instances on the marketing surface, four point back at the holding page hero. A practitioner who reads the benefits page, is convinced, and clicks APPLY is returned to the top of the page they already scrolled past, with no memory of their intent. `/pricing` is worse: three buttons for three tiers all land on the same undifferentiated email field, so tier intent is captured and then discarded.

This is a loop, not a funnel.

### 3.2 The seeker product is built, live, and all but unreachable

`/explore`, `/search`, `/explore/[category]`, `/in/[city]`, and every practitioner profile are built and live.

The one door in is a magnifier icon. `SEARCH` is the single `live: true` nav link, and `SiteHeader` does render on `/pricing`, `/join-sessions`, `/mission`, and `/help`, so a visitor who reaches one of those pages can get to `/search`. But `EXPLORE` is held at `live: false`, so the browsable front of the product is linked from nowhere, and the holding page renders no header at all. Which means the visitor most likely to want the seeker product, the one who just landed on `/`, has no path to any of it.

Meanwhile the header still holds out `FOR PRACTITIONERS` and `ABOUT` as `live: false`, even though `/join-sessions` and `/mission` now exist and would serve those slots exactly. `decisions.md` notes from an earlier phase that "there is no practitioner-marketing, sages, or about page." Two of those three now exist and the nav config was never updated.

**Cheapest high-value fixes on this whole list:** flip `EXPLORE` to `/explore`, point the practitioner slot at `/join-sessions`, point `ABOUT` at `/mission`, and put a header on the landing page.

Two constraints on doing that, both from your own rules:

- **Do not use the label `FOR PRACTITIONERS`.** `brand-voice.md` names that exact string as the banned form: "'List your practice' not 'For practitioners.' The role words are for prose, not chrome." The held-out nav entry is itself a voice violation waiting to ship. Use `LIST YOUR PRACTICE`.
- **Read 2.9 before flipping `EXPLORE` live.** The category pages behind it carry four brand-voice violations today.

### 3.3 The hero gives half its action space to the smallest audience

Two forms sit side by side at equal visual weight: APPLY FOR AN INVITATION and ENTER INVITATION CODE. Only invited practitioners have a code, which is a small fraction of traffic. Equal weighting signals exclusivity, which is on brand, but the cost is that the primary action for the majority reads as one of two options rather than the thing to do.

Separately, "APPLY" is the highest-friction verb available. It asks the visitor to submit to judgment before they know what they are being judged for. It suits an invite-only posture, so I am not saying drop it, but it must be earned by the copy above it, and right now the copy above it is one sentence about somebody else.

### 3.4 No second-best action anywhere

Every page offers exactly one thing to do. A visitor who is interested but not ready to hand over an email has no lower-commitment option: nothing to read, nothing to browse, nothing to follow. The Instagram link exists only in the footer.

### 3.5 Footer is organized by internal structure, not intent

Column two mixes a recruitment page, a pricing page, and a logged-in dashboard link. "Manage Your Sessions" points at `/dashboard`, which is a dead end for the overwhelming majority of visitors, and it sits directly under two acquisition links.

---

## 4. User journey map

### Practitioner with an invitation code
Land, scroll past a sentence about seekers, find the code field, `/join`. Works. Short. Leave it alone.

### Practitioner without a code
Land. The hero does not address them. They either submit an email on the strength of one sentence, or scroll two full sections to find out what this is, click LEARN MORE, read six benefits on `/join-sessions`, click APPLY, and arrive back at the top of the page they started on.

The moment of highest intent, finishing the benefits page, is answered with the coldest form on the site.

### Seeker
Land. Read a sentence describing a product built for them. Find two forms, neither of which is for them. No header, so no search and no browse. No category, no practitioner, no email capture, no reason to return. Leave.

The seeker product exists and is live. From the page they landed on, there is not one link to any of it.

### Guide (curator)
No path at all. `SAGES` is held out in the nav, `/guides/[slug]` and `/sages/[slug]` routes exist, the program is invite-only with no public pathway by design. Fine for now, but the concept does no work for you if it is invisible, and it is one of your only available proof assets before launch. Describe the program even if there is no way in.

### Missing story beats, ranked by what they cost you

1. **Who this is for.** Absent from the first screen. Highest cost of anything in this document.
2. **Proof.** No external validation of any claim.
3. **What a session actually is.** Twelve categories, none visible on the front door. Your brief ranks breadth as the second seeker lead; the landing page offers five generic nouns.
4. **A named human.** The founder story is the strongest asset and it is unsigned.
5. **Where.** Multi-location practice is a core differentiator and three launch markets are locked. The landing page is geographically nowhere.
6. **What it costs.** A practitioner cannot find the pricing page without going to the footer.
7. **A second-best action.** Nothing to do short of applying.

---

## 5. The new narrative arc

One landing page at `/`, eleven sections counting the header and footer, mapped against the anatomy in the reference infographic you shared. Practitioner acquisition is primary because supply is the constraint and the only monetized side. Seekers get a real door rather than a description.

| # | Section | Job | Infographic slot |
|---|---|---|---|
| 1 | Wordmark and nav | Orient, and give both audiences a way out | Logo, simple navigation |
| 2 | Hero | The promise, and two doors | Hero + CTA |
| 3 | Proof strip | Make the claim checkable in one line | Social proof |
| 4 | The problem | Show you know the job before you sell the tool | (added beat) |
| 5 | The three hooks | Zero fees, own your clients, travels with you | Key features |
| 6 | Trust | Community reviews as the spine, stated once | (added beat) |
| 7 | Founder, named | Earn the taste claim with a person | About section |
| 8 | Breadth | Twelve categories, visible, clickable | Content section |
| 9 | Pricing preview | Answer the cost question before they ask | Key offers |
| 10 | The two closes | Practitioner apply, seeker notify | Lead magnet + CTA |
| 11 | Footer by intent | Catch everyone who scrolled past everything | Footer |

**The through-line, in one sentence:** the people who hold space for others deserve to be held too, and the people looking for them deserve a friend who knows.

Sections 4 through 7 are the story. Practitioners currently get benefits before they get recognition, which is why the page reads like a product and not like an invitation. Reversing it costs nothing and changes the whole register.

Full copy for every section is in `sessions-guide-landing-copy-deck.md`.

---

## 6. What to do, in order

### Ship this week, near zero effort
1. Render `SiteHeader` on `/`. The landing page is currently the only page with no escape route, and it is the page most visitors see first.
2. Fix the nav config in `site-header.tsx`: `EXPLORE` → `/explore`, `LIST YOUR PRACTICE` → `/join-sessions`, `ABOUT` → `/mission`. Note the relabel, per 3.2. Do the descriptor pass in 2.9 before or alongside flipping `EXPLORE`.
3. Fix `/pricing` tier names to Free / Elevated / Alchemist with the real numbers, and delete "Verified" and "A richer, more expressive profile."
4. Fix all five practitioner-as-guide instances across three files, not just the one on `/`. See the table in 2.3, and grep rather than working from the table alone. Also "their alchemist" on `page.tsx:180`.
5. Point `/join-sessions` and `/pricing` CTAs at an anchor on the new hero form, or a dedicated `/apply`, so intent survives the click.

### The main pass
6. Rebuild `/` on the eleven-section arc using the copy deck.
7. Decide the lightworker question (2.4) before writing anything final. It affects the hero, the mission page, and every future ad.
8. Get one founder photograph and a name onto the page.
9. Assemble the proof strip. It needs a real Conscious City Guide number and a founding cohort count.
10. Cut `/join-sessions` from six benefits to three, ranked, with the trust card promoted to its own section. Keep "Get paid your way" somewhere: it is a locked product differentiator and the copy deck folds it into hook one rather than dropping it.
11. Decide the "Frequency" question (2.10) before the category pills go on the front door.

### Next
12. Reorganize the footer by intent: Find a session / List your practice / About / Legal. Per `decisions.md`, do not wire any of these to a route that does not resolve yet.
13. Add a real second-best action. A short downloadable handbook for practitioners is the obvious candidate and you have the material already. Do not call it a "guide."
14. Rework the `/help` placeholder copy and apply the role-neutral chrome rule (your A7; A6 is the separate Sage to Guide rename sweep).
15. Write the Guides program page. It is your best available proof asset and it currently does not exist.

---

## 7. Two things I could not verify

- **The Conscious City Guide number.** The copy says "thousands of practitioners" over "a decade." The proof strip needs a specific figure and I do not have a source for one. Use a number you can defend.
- **Founding cohort size.** The copy deck leaves a placeholder for a practitioner count. Fill it only when it is real, and if it is small, say small. "Our first eleven practitioners" is more persuasive than a vague plural, and it fits the invite-only posture better than a big number would.
