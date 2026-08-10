# Sessions Guide: Landing Page Copy Deck

Ready to paste. Eleven sections, in order, top to bottom, counting the header and footer.

**Rules applied throughout:** no em dashes. No exclamation points in chrome. No "verified," "vetted," "screened," or "approved." No "discover" as a standalone verb. No three-parallel-clause sentences. Buttons in DM Mono uppercase. Labels in DM Mono uppercase. Prices per `product-spec.md` D24. "Guide" used only as the curator role.

**Notation:** `[SQUARE BRACKETS]` marks something only you can fill in. `→` marks a link destination.

This deck also closes out A1 (hero candidates) and A2 (brand one-liner) from `content-copy-tasks.md`.

---

## Foundations

### A1. Hero candidates

Pick one. It cascades into meta tags, emails, ads, and the practitioner page, so decide this before anything else gets written.

**One deliberate deviation from A1, flagged.** Your worklist specifies hero candidates "leading with the calm/sacred feeling, with breadth as the supporting line." Candidates A and B lead with practitioner economics instead. That is because the brief was written when `/` was scoped as the seeker in-product front door, and `/` is now a practitioner acquisition page with no seeker path at all. Candidate C honors the original brief and is the right hero the week you have practitioners to show. If you disagree with the reordering, take C.

---

**Candidate A: The reciprocity line. My recommendation.**

> # Who holds space for you?
>
> Sessions Guide runs the business of a healing practice so you can stay inside the work. Booking, payments, and a calendar that travels with you. We take nothing from your sessions.

Why this one. It is the thesis of the company, already written on your own mission page, and nobody else in this market is saying it. It opens with a question the audience has never been asked, which is the whole proposition in four words. It is warm without being soft, and it carries the reciprocity that makes the platform feel like a peer rather than a vendor. It also survives the lightworker decision either way, because it names nobody and excludes nobody, which means acupuncturists and channelers can both read it as theirs.

---

**Candidate B: Keep the owned line.**

> # Making lightworkers' work lighter.
>
> The booking platform for practitioners of the healing arts. A flat subscription, nothing taken from your sessions, and clients who stay yours.

Why this one. It is the line with music in it and the one people will repeat. Use it if you have decided the first cohort is energy healing, journeys, readings, and ceremony, and the clinical modalities come later. See section 2.4 of the audit before you commit, because this headline chooses your audience for you.

---

**Candidate C: Seeker first.**

> # Find the one you would be sent to.
>
> Practitioners of the healing arts, recommended by the people who booked them. Opening by invitation.

Why this one. Strongest line for the seeker side and the truest expression of the brand voice, the friend with impeccable taste who knows exactly who you need to see. Only use it if you flip the page's priority to seekers, which I would not do before you have practitioners to show them.

---

### A2. Brand one-liner

Three jobs, three lengths. Lock these and reuse them everywhere.

| Use | Copy |
|---|---|
| Meta description, nav subtitle, email footer | The booking platform for the healing arts. |
| Instagram bio, one-line intro | Where practitioners run their practice, and seekers find them. |
| Brand line, closing sections, merch | Making lightworkers' work lighter. |

Note: the current root layout meta description is "Find a practitioner who actually gets it," which is seeker-facing while the page it describes is practitioner-facing. Swap it for the first line above until the seeker product opens publicly.

---

## Section 1. Wordmark and navigation

Keep the full-bleed wordmark. Add the header.

```
NAV:   EXPLORE    LIST YOUR PRACTICE    ABOUT    ⌕    LOG IN
```

→ EXPLORE: `/explore`
→ LIST YOUR PRACTICE: `/join-sessions`
→ ABOUT: `/mission`
→ ⌕: `/search`
→ LOG IN: `/login`

`LIST YOUR PRACTICE` is not a preference, it is the rule. `brand-voice.md` names the alternative as the banned form: "'List your practice' not 'For practitioners.' The role words are for prose, not chrome." The `FOR PRACTITIONERS` entry currently sitting in `site-header.tsx` at `live: false` should be relabeled when it is flipped on, not flipped on as written.

`EXPLORE` is already task-shaped, so it stays. If you prefer symmetry, `FIND A SESSION` pairs better with `LIST YOUR PRACTICE` and reads more clearly to a first-time seeker.

**Before flipping `EXPLORE` live:** the twelve category descriptors behind it carry four brand-voice violations (see audit 2.9). Fix those first or the front door leads to banned copy.

---

## Section 2. Hero

Over the existing reiki photograph, with the current legibility wash.

> # Who holds space for you?
>
> Sessions Guide runs the business of a healing practice so you can stay inside the work. Booking, payments, and a calendar that travels with you. We take nothing from your sessions.
>
> `[ APPLY TO LIST YOUR PRACTICE ]`   `HAVE AN INVITATION CODE`
>
> Looking for a practitioner? **See who is here.** →

**CTA hierarchy, deliberately three tiers:**

1. `APPLY TO LIST YOUR PRACTICE`, primary olive button. Opens the email field inline, or scrolls to section 10.
2. `HAVE AN INVITATION CODE`, text link in DM Mono. Reveals the code field on click. This is the fix for giving half the hero to a tiny audience: the code path stays one tap away without competing.
3. `See who is here`, a quiet inline link → `/explore`. The seeker door. Small on purpose, and present, which it is not today.

**Note on the primary label.** "APPLY TO LIST YOUR PRACTICE" is longer than "APPLY" and worth the characters, because it tells the visitor what they are applying for. If you want it tighter, `APPLY TO JOIN` works. Do not shorten to `APPLY` alone.

**If you choose hero Candidate B or C,** swap the headline and subhead only. The CTA stack stays identical.

---

## Section 3. Proof strip

Immediately below the hero. One horizontal band, three facts, no photograph. Hairline border above and below, `var(--color-border)`. DM Mono labels, numbers in the heading font.

```
[NUMBER]                      A DECADE                    [NUMBER] FOUNDING
PRACTITIONERS WORKED WITH     IN THE HEALING ARTS          PRACTITIONERS, BY INVITATION
```

Below the strip, one line in body text, centered:

> From a cofounder of Conscious City Guide.

Not "built by the team behind." An earlier draft said that, and nothing in your own copy supports a team: both the landing page and the mission page say "I." Claim the singular until there is a plural to claim.

**Fill these honestly.** If the founding cohort is eleven people, write eleven. A small specific number reads as curation and matches the invite-only posture. A vague plural reads as hedging. And if you cannot defend the Conscious City Guide practitioner figure, replace that column with the three launch markets instead:

```
UNITED STATES     AUSTRALIA     INDONESIA
```

That version is fully true today and does real work, because geography is one of your differentiators and the site currently mentions none of it.

---

## Section 4. The problem

Existing two-column layout, image left, text right. This is a new beat and the single biggest change to the page's register: recognition before pitch.

> ## You did not train for this part.
>
> The scheduling back and forth. The invoice you keep meaning to send. The client list you rebuilt from nothing after the last move. The cancellation policy explained for the hundredth time.
>
> None of it is the work. All of it takes the same attention the work needs.
>
> Sessions Guide takes that part.

Notes. Four sentence fragments in the second paragraph, each a specific irritation lifted from your mission page. This is the section that makes a practitioner feel met, and it earns every benefit claim that follows. It also does not sell anything, which is why it works.

---

## Section 5. The three hooks

Three columns, or three stacked rows on mobile. DM Mono numeral labels, h3 headings, body text beneath. Ranked, not equal, and cut down from the six currently on `/join-sessions`.

**ONE**

> ### Keep what you earn.
>
> A flat subscription, and nothing taken from your sessions. No percentage and no booking fee. Collect through the platform or arrange payment directly, session type by session type. What a seeker pays you is yours.

**TWO**

> ### Your clients are yours.
>
> Their history, your private notes, and the relationship itself. You hold all of it. If you ever leave, you leave with your practice intact.

**THREE**

> ### Built for how you actually work.
>
> Bali in March, Los Angeles in June, and virtual from anywhere. Set where you are and for how long, and your availability follows you. Your reviews and your clients come along.

Below the three, one line, centered, in body text:

> Booking, reminders, calendar sync, and cancellations run in the background.

**Where the six existing cards went.** Two survive as hooks, four are relocated, none is lost.

| Existing card on `/join-sessions` | Becomes |
|---|---|
| Keep what you earn | Hook ONE, largely intact |
| Carry your practice with you | Hook THREE, rewritten with specific cities |
| Get paid your way | Folded into hook one, third sentence. Payment sovereignty is a locked differentiator per `product-spec.md`; losing it would be a real cost |
| Spend your energy on the work | The single line above |
| A calendar that tells the truth | The single line above. It was a subset of the card above it |
| Reviews earned honestly | Promoted to its own section, section 6, because it is the trust spine |

Hook TWO, "Your clients are yours," is new. It has no source card, and it is the second of the three hooks your own brief names, so its absence from the live page is a gap rather than an omission on my part.

---

## Section 6. Trust

Its own section, quiet, centered, narrow measure. Sand background, no image. This is the trust spine and `brand-voice.md` says state it plainly, once, and never sell it.

> ## Reviews from people who did the work.
>
> Only someone who booked with you can review you. We do not certify practitioners. Featured placement is a subscription tier and we say so on the pricing page, but ratings are not for sale at any price. The community says who is good, and the people whose recommendations carry weight become Guides.
>
> Your exact location stays private until a session is confirmed. Your door is yours: turn on approval and no booking happens without your yes.

Notes. Two paragraphs, two directions of trust, exactly as `brand-voice.md` frames it. Nothing here says verified, screened, safe, or protected, and neither side is framed as a risk to the other. It also plants the Guides concept without needing the program page to exist yet.

**On the third sentence.** An earlier draft of this section said "we do not rank them by anything you can buy your way into," which is false: the Alchemist tier buys featured-first placement across all search and discovery surfaces, per `product-spec.md`. Naming that out loud and then drawing the line at ratings is both true and more persuasive, because it shows you know where the line is. Do not soften it back.

---

## Section 7. Founder, named

Existing two-column layout. Photograph left, portrait crop, not a stock image. This is the "About" slot from your reference infographic and it wants a real face.

> ## Built from the inside.
>
> I cofounded Conscious City Guide and spent a decade in close company with practitioners, healers, teachers, and readers. I watched extraordinary people do extraordinary work, and I watched them lose their evenings to the parts of the job nobody trained them for.
>
> Their gifts were singular. Their frustrations were identical.
>
> Sessions Guide is what I wished I could hand each of them. A home for the business of a practice that respects the practice itself.
>
> **[YOUR NAME]**
> `FOUNDER, SESSIONS GUIDE`

**Required, not optional:** the name and the photograph. An unattributed "I" is doing none of the work an attributed one does. If you want to go further, a hand-signed SVG signature above the typeset name suits the editorial system and costs an afternoon.

Note the small edit: "teachers, and guides" became "teachers, and readers," because "guides" as a practitioner descriptor breaks your locked terminology.

---

## Section 8. Breadth

Twelve category pills on the sand background, exactly as `/explore` renders them, so this is mostly a component you already have.

> ## Twelve ways in.
>
> `ENERGY HEALING`  `JOURNEYS`  `READINGS`  `ANCIENT HEALING ARTS`
> `CONSCIOUSNESS`  `EMBODIED`  `NATURAL BEAUTY`  `FAMILY`
> `CREATIVITY`  `INTIMATE`  `COACHING`  `CEREMONY`
>
> Reiki and acupuncture. Astrology, somatic therapy, cacao ceremony, Human Design. One primary practice per practitioner and up to three in total, so a profile says what someone actually does.

Each pill → `/explore/[category]`.

Why this section earns its space. It is your second seeker lead and it is also the strongest practitioner credibility signal on the page, because it shows the platform understands the actual shape of these practices rather than lumping everything under "wellness." The final sentence is a product detail doing positioning work.

**Two open items before this ships.**

First, the `ENERGY HEALING` pill may need to read `FREQUENCY`. That alias is specified in `product-spec.md` and `categories-modalities.md`, the hero asset is already named `frequency.jpg`, and the interface renders "Energy Healing" from the database. Nobody has decided. Whichever word goes on this pill becomes the public name, so decide before the landing page ships. See audit 2.10.

Second, do not draft descriptions for the twelve from scratch. Paragraph-length descriptors already exist, live, in `explore/[category]/page.tsx` as `CATEGORY_HERO`. B3 is partly shipped rather than outstanding: the header text exists, the hover line and the SEO line do not, and four of the paragraphs break brand-voice rules today, one of which calls practitioners guides and one of which uses the banned verb form (audit 2.9). Treat it as a correction pass plus two short new fields.

---

## Section 9. Pricing preview

Three inline columns, sand background, no card borders. Real numbers.

> ## What it costs.
>
> | | | |
> |---|---|---|
> | `FREE` | `ELEVATED` | `ALCHEMIST` |
> | $0 | $33.33 / month | $77.77 / month |
> | One session type, your profile, your calendar, payments, client history, and reviews. | Everything in Free, plus unlimited session types and Google Calendar sync. | Everything in Elevated, plus featured first everywhere people are looking. |
>
> Annual is $333.33 and $777.77. Nothing is taken from your sessions at any tier.
>
> `SEE FULL PRICING` →

→ `/pricing`

Notes. Free being genuinely free is a strong signal for a market where money is often a sore subject, and the current page hides it behind "Trial." Say $0 out loud. The repeating 3s and 7s are a deliberate part of your brand and they should not be rounded or hidden behind "founding rate."

Two accuracy notes against `product-spec.md`, both of which an earlier draft got wrong. Free also includes client history and review collection, and leaving review collection out is self-defeating given that section 6 above is built entirely on reviews. And the Elevated column has to open with "Everything in Free, plus," or it reads as though Elevated has no profile, no payments, and no bookings.

**On comps, be careful what you promise here.** An earlier draft of this deck offered "Founding practitioners are comped through launch," and that line should not ship in any form. D24 comps *existing* invite-only practitioners at Elevated, with no Stripe subscription object and no end date. It says nothing about anyone who applies through the new hero, which is the entire audience of this page. Putting a comp line here makes a promise to people it was never decided for, and "through launch" invents an expiry that does not exist in either D24 or D26.

If you want to say something about founding pricing, decide the actual offer for new applicants first, then write it. Until then the honest version is silence, or a line in the invitation email where you can be specific to the person receiving it.

---

## Section 10. The two closes

Full-bleed image, the existing `wing.jpg`, with the current wash. Two stacked closes at different weights.

**Primary, practitioner:**

> # Making lightworkers' work lighter.
>
> Sessions Guide is opening by invitation while we bring our first practitioners on with care. Tell us where to find you.
>
> `[ your@email.com ]`  `[ APPLY ]`
>
> `HAVE AN INVITATION CODE`

**Secondary, seeker.** Below a hairline divider, smaller type, no image of its own:

> `LOOKING FOR A PRACTITIONER`
>
> We are opening city by city. Leave your email and we will write when there are practitioners near you.
>
> `[ your@email.com ]`  `[ NOTIFY ME ]`

Notes. This is where the lightworker line lives if you chose hero Candidate A, which is the placement I recommend regardless: brand line at the close, positioning line at the open.

The seeker capture is the thing the site is missing most. Every seeker email collected now is a person to write to the week a practitioner opens in their city, and right now you are letting all of them leave without a trace.

It is not quite free, though. `/api/waitlist` inserts `{ email }` into a `waitlist` table with a unique constraint on email, and the handler special-cases the `23505` collision. Adding a `type` column alone still collides for anyone who signs up on both sides, which is exactly the person you least want to turn away. This needs a migration and a composite key, so budget it as a small build task rather than a copy change.

"Tell us where to find you" instead of "Apply and we will be in touch," because it reverses who is doing the seeking. Small, and it matters in a peer-to-peer register.

---

## Section 11. Footer, reorganized by intent

Same olive field, same three columns, regrouped. Current column two mixes acquisition with a logged-in dashboard link, which sends most visitors to a dead end.

```
FIND A SESSION          LIST YOUR PRACTICE        SESSIONS GUIDE
Explore                 Why Sessions Guide        The Mission
Search                  Pricing                   Instagram
Booking a session       Running your practice     Contact
                        Log in
```

Bottom bar, unchanged: copyright, Privacy, Terms.

Every link above resolves today: `/explore`, `/search`, `/help/seekers`, `/join-sessions`, `/pricing`, `/help/practitioners`, `/login`, `/mission`, Instagram, `/contact`.

Changes made. "Manage Your Sessions" → "Log in", which serves both practitioners and seekers and does not promise a dashboard to people without one. "Join Sessions" → "Why Sessions Guide", because the old label named the action rather than the reason. "Help" split into the two things people actually look for, relabeled by task rather than audience per the role-neutral chrome rule, which also closes part of your A7.

**Deliberately not added: a "Guides" link.** An earlier draft included one as a placeholder. `decisions.md` is explicit: "Never wire a nav link to a route that does not resolve." There is a `/guides/[slug]` route but no `/guides` index, so this link waits until that page exists. Same reasoning for anything else on the roadmap: hold it as a `live: false` one-liner, not a footer link.

---

## Copy you should delete

| Where | Copy | Why |
|---|---|---|
| `/` section 2 | "Those seeking guidance will find their guides. And those seeking transformation can find their alchemist." | Breaks the locked meaning of Guide, and collides with the Alchemist tier name. Section 7 above replaces this passage. |
| `/pricing` | "Verified reviews and client records" | `brand-voice.md` bans vetting-adjacent language outright. Section 6 replaces it. |
| `/pricing` | "A richer, more expressive profile" | Deferred entitlement per `product-spec.md`. Do not sell it until it is designed. |
| `/pricing` | Trial / Basic / Elevated | Contradicts D24. Section 9 replaces it. |
| `/join-sessions` | "A calendar that tells the truth" and "Spend your energy on the work" | Absorbed into the single line under section 5. Both are mechanics, not top-three hooks. |
| `/` section 3 | `LEARN MORE` | Weakest label on the site. Replaced by a real close. |
| `/help` | "For practitioners" / "For seekers" | Role-neutral chrome rule. Use "Booking a session" and "Running your practice." |
| `mission/page.tsx:58` | "If you are looking for a guide, I hope it helps you find the right one." | Practitioner called a guide. Rewrite as "looking for a practitioner." |
| `page.tsx:166`, `mission/page.tsx:45` | "practitioners, healers, teachers, and guides" | Same rule. Section 7 above uses "readers" instead. |
| `help/page.tsx:18` | "Practitioners and seekers each have their own guide." | Same rule, plus audience labels. Rewrite around the two tasks. |
| `explore/[category]/page.tsx:13,17,29,45` | "absolutely feel", "experienced guides", "can guide you into", "express, release, and discover" | Four brand-voice violations in live category copy. Fix before `EXPLORE` goes live. |

**On "guide":** five instances across three files, plus two more on the category pages. Grep `src/app` for the word before calling this done. `Sessions Guide` and `Conscious City Guide` are company names and stay.

---

## Sequence for writing the rest

1. Pick the hero (A1). Nothing else can be finalized until this lands.
2. Settle the lightworker question. It changes the hero, the mission page, and every ad you will ever write.
3. Settle the Frequency question. It changes a pill on the front door and a URL people will link to.
4. Get the founder photograph and name. Blocking for section 7.
5. Get the two proof numbers. Blocking for section 3.
6. Fix `/pricing` against D24. Do this before the landing rebuild, because it is live and wrong today.
7. Correction pass on the twelve live category descriptors. Half a day, and it unblocks flipping `EXPLORE` live, which is the cheapest win available.
8. Build the landing page.

Note on your worklist: B3 is partly shipped, not outstanding. The header paragraphs exist for all twelve; the hover line, the SEO line, and the Frequency decision do not. Re-mark it as a correction pass plus two short fields, and the highest-leverage genuinely unwritten copy you have left becomes the Guides program page, which has no draft and is your best available proof asset before launch.
