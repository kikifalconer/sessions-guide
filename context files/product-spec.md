# sessions.guide — Product Spec

Condensed product rules for Claude Code. Read before building any feature.

---

## What It Is

Two-sided marketplace connecting independent transformational wellness practitioners with seekers.
Model: subscription-only (no transaction fees). Practitioners pay to list; platform earns nothing per booking.
Incorporated in Canada. Launch markets: United States, Australia, Indonesia.

---

## Three User Types

| Type | Description |
|---|---|
| **Practitioner** | Pays subscription. Gets profile, booking calendar, client management, payment tools. |
| **Seeker** | Discovers and books sessions. No account required — guest booking fully supported. |
| **Sage** | Invite-only. Elevated from active reviewers. Curates a public recommendation page. Not practitioners themselves (though some practitioners are also Sages). |

---

## Subscription Tiers

**Basic — Listed** (~$22/month or discounted annual)
Profile, booking calendar, payment setup, client history, review collection, Sage-eligible.

**Premium — Featured** (~$55/month or discounted annual)
Everything in Basic + priority search placement, email marketing tools, rebooking automation, analytics dashboard, extended portfolio slots, promoted across platform channels.

Inactive/lapsed subscriptions: soft-hide the profile. Preserve all data.

---

## Key Product Decisions

| Decision | Rule |
|---|---|
| Seeker account required | No. Guest booking supported — name + email only |
| Practitioner vetting | Open marketplace. Community reviews govern quality |
| Location architecture | Location is a property of `availability_blocks`, never `practitioners` |
| Payment options | Stripe (in-platform) OR offsite (practitioner's own method) |
| Booking confirmation modes | Instant / Pending payment / Pending practitioner approval |
| Psychedelic listings | Allowed. Mandatory jurisdiction disclaimer auto-triggered by modality |
| Media storage | Cloudinary only. No Supabase Storage |
| Calendar sync | Google Calendar, two-way, OAuth 2.0 |
| Transaction fees | None. Subscription revenue only |

---

## Booking Confirmation Modes

Practitioners set one of three modes per session type or globally:

1. **Instant** — booking confirmed immediately on submission
2. **Pending payment** — slot held; confirmed only after Stripe payment or proof of offsite payment received
3. **Pending approval** — practitioner manually confirms or declines

Booking `status` values: `pending_payment` → `pending_approval` → `confirmed` → `completed` → `cancelled`

---

## Cancellation Policies

Four preset tiers. Stripe handles automated refunds per policy:
- **None** — no cancellation policy; practitioner manages manually
- **Flexible** — full refund if cancelled 24h+ before session
- **Moderate** — full refund if cancelled 72h+ before; 50% refund within 72h
- **Strict** — full refund if cancelled 7 days+; no refund within 7 days

Set at session type level. Overrides practitioner-level default if set.

---

## Modalities + Categories

12 fixed categories. Always inferred from modality — never manually set.

| Category | Example modalities |
|---|---|
| Energy Healing | Reiki, Sound Healing, Pranic Healing, Crystal Healing, Quantum Healing |
| Journeys | Plant Medicine, Breathwork, Psychedelic Facilitation, Retreat, Vision Quest |
| Readings | Astrology, Tarot, Human Design, Numerology, Akashic Records, Psychic Reading, Channeling |
| Ancient Healing Arts | Acupuncture, Ayurveda, Traditional Chinese Medicine, Cupping, Herbalism |
| Consciousness | Meditation, Hypnotherapy, Past Life Regression, Dream Work, Shamanic Healing |
| Embodied | Somatic Therapy, Massage, Bodywork, Dance Movement Therapy, Yoga Therapy |
| Natural Beauty | Holistic Facial, Gua Sha, Facial Acupuncture, Scalp Care |
| Family | Doula, Birth Preparation, Postpartum Support, Fertility Support |
| Creativity | Art Therapy, Expressive Arts, Writing, Music Therapy |
| Intimate | Sexuality Coaching, Tantra, Relationship Coaching, Somatic Sex Therapy |
| Coaching | Life Coaching, Spiritual Coaching, Business Coaching, Nutrition Coaching, Therapy & Counseling |
| Ceremony | Cacao Ceremony, Grief Rituals, Rites of Passage, Wedding Ceremony, Death Doula |

**"Frequency"** is the display name for the `energy-healing` slug in some UI contexts.

Per practitioner: exactly 1 primary modality, up to 2 secondary, max 3 total.
Per session type: exactly 1 modality.
New modalities require admin approval before appearing in dropdowns.

---

## Psychedelic Facilitation Rule

Any session type or practitioner profile where `modality.slug = 'psychedelic-facilitation'` MUST display:

> *"Psychedelic journey facilitation may be subject to local laws and regulations. Practitioners and clients are solely responsible for ensuring compliance with the laws of their jurisdiction."*

This is auto-triggered by the modality — never a manual toggle.

---

## Availability Block Rules

- Location attached to the block, not the practitioner
- `format` drives all conditional logic: `virtual` | `in_person` | `both`
- `location_place_id` (Google Places ID) required for `in_person` and `both`; null for `virtual`
- Virtual sessions surface in all geographic searches
- Block types: recurring (indefinite), date-bounded (e.g. "in Bali March 1-31"), one-off
- Booking location copied from block to booking record at booking time (durable)

---

## Practitioner Profile Page

Layout (desktop, from design mockup):
- Full-width hero banner with Cloudinary auto-crop
- Circular practitioner logo/photo centered on banner
- Practitioner name + tagline below banner on background
- Three-column info strip: Modalities | Locations | Links — with star rating and review count
- About section (left, ~60%) + Book / Inquire CTAs (right)
- "[Practitioner Name] SESSIONS" heading (display font for "SESSIONS")
- Session type cards in 2-column grid: photo, session name (DM Mono caps), duration (DM Mono caps), description, BOOK SESSION button

---

## The Sages Program

- Invite-only. No public application pathway.
- Eligibility: seekers who accumulate high-quality verified reviews across multiple practitioners.
- Sage page: bio + curated practitioner list with personal recommendation notes per entry.
- **Sages are curators, not practitioners** (though some may also be practitioners).
- Incentives: (1) subscription discount/comp if also a practitioner with active referrals, (2) verified Sage badge, (3) private event invitations.

---

## Review System

- Review request email auto-sent after session status → `completed`
- Reviews require a booking reference — no anonymous submissions
- Practitioners can mark one review as featured (shown at top of profile)
- Review quality + volume determines Sage invitation eligibility
- Reviews go through is_published gate before appearing on profile

---

## Seeker Discovery Logic

- Searches hit `availability_blocks`, not `practitioners`
- Location search: PostGIS radius query on `location_lat`/`location_lng` in blocks
- Virtual sessions surface in all location searches (unless seeker explicitly filters in-person only)
- Category pages: `/[category-slug]` — all practitioners with a modality in that category
- City pages: `/[city-slug]` — all practitioners with an active in-person block in that city area
- AI natural language search: API route calling Claude with practitioner data as context

---

## Terminology (always use these exact terms)

| Term | Meaning |
|---|---|
| Practitioner | A wellness/transformational provider listed on the platform |
| Seeker | A person browsing or booking |
| Sage | An elevated community curator — NOT a practitioner role |
| Session type | A specific service offering (e.g. "90-min natal chart reading") |
| Availability block | A time window with associated location and format |
| Modality | The type of practice (e.g. reiki, astrology) |
| Guest booker | A seeker who books without an account |
| Confirmation mode | Practitioner's chosen booking logic (instant / pending payment / pending approval) |
