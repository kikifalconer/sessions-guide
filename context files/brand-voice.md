# sessions.guide — Brand Voice

Read this before writing any copy, UI text, email, or page content.

---

## The Voice

A nonjudgmental but discerning friend who always knows exactly who you need to see.

Picture a woman based in Topanga Canyon. She has a personal bodyworker, goes on multiple retreats a year, and has quietly assembled the most extraordinary network of healers, astrologers, and guides you have ever encountered. She does not over-explain. She has impeccable taste. She knows what works and she is sharing it with you.

Every word on sessions.guide carries this energy.

---

## Voice Qualities

- **Warm** — trusted friend, not a brand. Inviting, never transactional.
- **Composed** — eloquent without being stiff. Unhurried. No need to oversell.
- **Grounded** — holds space for the mystical without losing credibility. Believable woo.
- **Discerning** — every path is valid; not every practitioner makes the cut.
- **Aspirational** — high-end and spiritual. Sacred space that is also beautiful.
- **Reassuring** — the dark night of the soul can become dawn. We hold this gently.

---

## Hard Rules

**No em dashes (—). Ever.**
Use a comma, a period, or rewrite the sentence.

**No AI-sounding language. These words and phrases are banned:**
- delve, tapestry, it is worth noting, certainly, absolutely
- "A space for healing, transformation, and growth"
- Any sentence with three parallel clauses ending the same way
- Anything that sounds like it was generated

**No explaining, defending, or over-romanticizing modalities.**
We believe. We do not preach.

**No corporate constructions:**
- "carefully vetted for quality and integrity" → "real reviews from real people who have done the work"
- "practitioners who meet you where you are" → "find a practitioner who actually gets it"
- "discover" as a verb on its own (overused) → use specific verbs instead

---

## Vocabulary

**Use:** guide, practitioner, healing, transformation, modality, sacred, intentional, trusted, journey, discerning, seeker

**Avoid:** starseed, love & light, woo-woo, vibe, manifest, guru, energy worker

**Insider terms to use naturally:** seekers (for the audience), session (not appointment or booking), modality (not service or treatment), availability block (internal/dashboard only, not seeker-facing)

---
## Roles & Terminology (updated July 2026)

| Term | Meaning | Rules |
|---|---|---|
| Practitioner | Provider listed on the platform | Never call a practitioner a "guide" |
| Seeker | A person browsing or booking | Internal + copy term. In navigation and headers, prefer role-neutral task language over the label (see below) |
| Guide | Invite-only community curator (formerly "Sage") | "Guide" capitalized, noun only, reserved for this role. "Guides" replaces "Sages" in all display copy |
| Client | A practitioner's client | Practitioner-dashboard contexts only ("your clients"). Never platform-wide |

**"Guide" usage:** As a noun, only ever the curator role. As a verb, sparingly, and never
in a way that implies practitioners are Guides ("she guides breathwork" — avoid;
"let reviews guide you" — acceptable, rare).

**Role-neutral surface labels:** In nav, help, and section headers, describe the task,
not the audience. "Help finding & booking sessions" not "For seekers."
"List your practice" not "For practitioners." The role words are for prose, not chrome.

**Code freeze:** `sages` table, `seeker_id`, `seeker_token`, and all code identifiers
keep their existing names. This is a display-language change only.

---

## Tone by Context

**For seekers:** Lead with empathy and possibility. Trust is earned here through community experience.

**For practitioners:** Speak to their expertise and integrity. Peer-to-peer, not patron-to-service. They are investing in a platform that holds the same standards they do.

**For Guides:** Recognize them as trusted voices, not influencers or ambassadors. They endorse because they genuinely believe — the platform never makes this feel transactional.

**In error states / empty states:** Calm and directional. Not apologetic. Not vague. Tell people what to do next.

**In booking flows:** Low-anxiety. Sensitive context. No pressure language, no urgency triggers, no countdown timers.

---

## Copy Examples

| Avoid | Instead |
|---|---|
| A space for healing, transformation, and growth. | Where people find the support they have been looking for. |
| Discover practitioners who meet you where you are. | Find a practitioner who actually gets it. |
| Our practitioners are carefully vetted for quality and integrity. | Real reviews from real people who have done the work. |
| Book your session today! | Book a session. |
| We believe in the power of transformational healing. | (Don't write this sentence at all.) |

---

## Credible Woo

sessions.guide genuinely believes in astrology, plant medicine, energy healing, and the full spectrum of transformational modalities. We do not hide this. We do not sanitize it for a skeptical audience.

But we also do not explain or defend it. We speak about these modalities with the same quiet authority that the well-traveled Topanga woman brings to a dinner party recommendation. She does not need you to believe. She just knows it changed her life.

We believe. We do not preach.

---

## Trust Is the Product

Trust runs both directions and speaks in the same calm register for both.

**Community-reviewed is the spine.** Quality on sessions.guide is governed by
reviews from people who did the work, amplified by Guides. Never use
vetting-adjacent language ("verified," "screened," "approved practitioners").
The community reviews; the platform does not certify.

**For seekers, trust is transparency.** City-only locations before booking.
Cancellation terms in plain language before commit. No urgency, no countdowns,
no pressure. Real reviews, tied to real bookings. What to expect, written by
the practitioner, before you book.

**For practitioners, trust is control.** Approval mode is their door. Private
client notes are theirs alone. Their exact location stays private until a
booking is confirmed. Speak to this as respect for their practice, never as
"protection from" seekers.

**Voice rules for trust copy:**
- State the safeguard plainly, once. Never sell it.
- No security theater ("bank-level," "100% safe," shield iconography energy)
- Never frame either side as a risk to the other
- Zero-reviews states are "early," never "unproven": lean on Guide
  recommendations, external links, and the practitioner's own words

---


## UI Copy Conventions

- Buttons: DM Mono uppercase, active voice, specific ("BOOK SESSION" not "SUBMIT")
- Labels and section headers: DM Mono uppercase, plain nouns ("ABOUT" "SESSIONS" "LOCATIONS")
- Confirmation messages: calm and specific ("Your session is confirmed.")
- Error messages: honest and directional ("Something went wrong. Try again or contact support.")
- Empty states: invitation to act, warm ("No sessions yet. Add your first session type to get started.")
- No exclamation points in UI chrome. One is acceptable in a success confirmation if the context warrants it.
