sessions.guide — Content & Copy Worklist
Working checklist for all copy and content. Scope this pass: seeker in-product, practitioner-facing, emails, legal/policy. Balanced across both audiences. No standalone marketing site yet (homepage treated as the in-product front door).
All copy follows brand-voice.md and design-system.md. Standing rules (do not repeat per task): no em dashes, no AI-sounding language, no "discover" as a standalone verb, no exclamation in chrome (one allowed in a success confirmation), DM Mono uppercase for labels and buttons, location shown city-only in all pre-booking contexts.

The Brief (from scoping)
Seeker homepage lead order: 1) the calm, sacred booking experience, 2) breadth across all 12 modalities, 3) real reviews from people who did the work, 4) the taste / curation.
Practitioner recruitment hooks (use these three): zero transaction fees, you own your client relationships, built for how you actually work (multi-location). Not using the "discerning profile" angle.

A. Foundations (resolve first, everything downstream reuses these)

 A1. Hero message decision + draft. Write 2 to 3 hero headline + subhead candidates leading with the calm/sacred feeling, with breadth as the supporting line. Pick one. This cascades into meta tags, emails, and any future landing.
 A2. Brand one-liner / tagline. Single line for nav, meta description, email footer. Reusable everywhere.
 A3. Pricing-model display labels (reused in B16, C10, emails). Seeker-facing labels for each pricing_model: fixed, sliding scale, by donation, inquire for pricing. Lock the exact wording once.
 A4. Cancellation-tier plain-language copy (reused in B24, C11, D4, E3). One short seeker-readable sentence per tier: None, Flexible, Moderate, Strict. Write once, reference everywhere.
 A5. Marketing-weight flag (open). Marketing home is undecided. Keep homepage hero and value lines modular so they can graduate into a separate landing later without a rewrite.


B. Seeker Discovery & Booking (in-product)
Homepage

 B1. Hero headline + subhead (per A1).
 B2. Search affordance. Search bar placeholder, and if AI search ships (D16), the natural-language prompt hint. Calm, exploratory, not transactional.
 B3. Twelve category descriptors. One short intro line per category for hover, category-page header, and SEO. Note the "Frequency" display alias for energy-healing. This is the meatiest single item; the 12 lines are reused on category pages.
 B4. Homepage supporting copy. Any section intros / connective tissue between categories and search.

Category Pages

 B5. Category page header + intro (reuse B3 line) and breadcrumb pattern (e.g. Readings › Astrology).
 B6. Category empty state. Finalize from the illustrative: "No practitioners here yet. Try another category, or search by modality."

City Pages

 B7. City page header pattern (dynamic city name) + the "virtual is available everywhere" framing.
 B8. City empty state. Finalize from: "No practitioners in this area yet. Virtual sessions are available everywhere."
 B9. Location display microcopy. City-only label pre-booking; the "Virtual or In-Person · [City]" label for both-format blocks.

Search + Filter

 B10. Filter labels. Modality, format, location, and the "in-person only" toggle (per D15). DM Mono uppercase.
 B11. Results header + states. Result count phrasing, sort label if any, no-results state (directional, points to broadening filters or going virtual).
 B12. AI search copy + fallback. The affordance text, and the graceful message when the query cannot be parsed into filters (falls back to plain modality/location filtering, no broken-AI feeling).

Result Card (shared component)

 B13. Card microcopy conventions. Name, primary-modality label, city label, rating display, and what shows when a practitioner has no reviews yet.

Practitioner Profile (seeker view, chrome only; bio/session copy is practitioner-authored)

 B14. Profile chrome labels. ABOUT, SESSIONS, MODALITIES, LOCATIONS, LINKS, SEE ALL REVIEWS. Confirm against the mockup, lock as DM Mono.
 B15. BOOK / INQUIRE. Button labels plus the INQUIRE intro / helper text (what an inquiry is, low pressure).
 B16. Session-type card conventions. Name, duration format ("90 MINUTES"), description guidance, and pricing display across all four pricing models (uses A3 labels).
 B17. Psychedelic-facilitation disclaimer (LOCKED). Wording is fixed in product-spec.md / categories-modalities.md and auto-triggers by modality slug. No writing; verify it surfaces wherever that modality appears in discovery.

Reviews Page

 B18. Reviews page chrome. Heading, featured-review treatment, "No reviews yet" empty state.
 B19. Report-review copy (D17). Report link label, reason prompt, and post-report confirmation. Calm, not accusatory.

Booking Flow (sensitive context, no urgency, no countdowns)

 B20. Step microcopy. Session selection, timezone-aware slot picker labels, format choice (when block is both), and seeker-details form labels (guest: name + email always; billing address / phone / card only when paying on-platform).
 B21. Payment step copy. Stripe vs offsite framing, deposit vs full payment, offsite-payment instructions presentation. No pressure language.
 B22. Confirmation success state. "Your session is confirmed." plus what happens next. Note: no shareable confirmation URL yet (in-flow client state per D1), so this success copy is the only confirmation surface.
 B23. Booking error states. Slot just taken, payment failed, validation. Honest and directional.
 B24. Cancellation policy at booking. Seeker-facing display of the relevant tier (uses A4), shown before they commit.


C. Practitioner-Facing
Recruitment

 C1. "Why list with us" copy. Built on the three hooks: zero fees, own your clients, built for how you work. Peer-to-peer tone, not patron-to-service.
 C2. Pricing / tiers copy. Basic (Listed, ~$22/mo) vs Premium (Featured, ~$55/mo), annual discount, feature lists. Flag: billing is stubbed today (all practitioners basic at no charge), so this copy is forward-looking until Stripe Billing is switched on.
 C3. Practitioner FAQ. Fees, getting paid (Stripe Connect vs offsite), calendar sync, reviews, cancellation tiers, publishing.

Onboarding (7 steps)

 C4. Onboarding step copy. Heading + helper text for each of the 7 steps. Confirm the actual step order from the build before writing.
 C5. Modality-selection helper. The max-3 / exactly-1-primary rule in plain language, the auto-derived category they cannot change, the "suggest a modality" path, and the "Add [modality] to your profile?" soft prompt.
 C6. Subscription gate copy (interim). What the practitioner sees at the gate while billing is free/stubbed.

Dashboard

 C7. Dashboard nav / tab labels. PROFILE, SESSIONS, AVAILABILITY, SETTINGS. DM Mono.
 C8. SESSIONS / AVAILABILITY empty states. From: "No sessions yet. Add your first session type to get started." Flag: tied to Phase 6 CRUD; tabs render empty until then, so finalize this copy alongside that build.
 C9. Availability block form copy. Format / location / recurrence / timezone labels, plus the privacy note: "Only your city is shown to seekers before booking." Uses the internal-only term "availability block."
 C10. Session-type form copy. Field labels and practitioner-side pricing-model labels (uses A3).
 C11. SETTINGS copy. Calendar connect/disconnect panel (connected-state line, disconnect confirm), payment method selector (Stripe vs offsite + offsite instructions field), default cancellation policy selector (uses A4).
 C12. Calendar connect flow copy. Make the connected state unmistakable. Note: OAuth callback currently lands on PROFILE not SETTINGS (cosmetic, deferred), so the connected-state copy must still read clearly wherever they land.
 C13. Client management copy (light). Client list, private-notes label, session history.


D. Emails (transactional, Resend, state-accurate)

 D1. Seeker booking confirmation, 3 variants by confirmation mode: instant, pending payment, pending approval. The self-cancel link (seeker_token) lives here.
 D2. Practitioner new-booking notification, including the pending-approval action prompt.
 D3. Payment emails. Pending-payment reminder and payment-received confirmation.
 D4. Cancellation + refund emails. Seeker-initiated and practitioner-initiated, plus refund confirmation tied to the tier (uses A4).
 D5. Review request email. Sent on status → completed; carries the seeker_token review link. Deliverability-critical.
 D6. Inquiry emails. Inquiry received (to practitioner) and acknowledgment (to seeker).
 D7. Email chrome. From-name, subject-line conventions, footer, signature. Brand voice, no urgency.
 D8. Deliverability flag (not a copy task, a constraint). Self-cancel and review both ride entirely on email reaching the seeker. Copy must make those action links unmissable; there is no on-screen fallback yet.


E. Legal & Policy
I can draft plain-language explainers, summaries, and structure for these, but binding legal text needs a lawyer. You are incorporated in Canada and launching across the US, Australia, and Indonesia, with payments and psychedelic listings in the mix, so counsel review is not optional on E1, E2, and E6.

 E1. Terms of Service. I can draft a plain-language outline and a seeker-friendly summary. Send the binding version to counsel.
 E2. Privacy Policy. Multi-jurisdiction (Canada, US state laws, Australia, Indonesia). Must cover guest-booking data, Stripe, Cloudinary, and Google Calendar OAuth scopes. Counsel review required.
 E3. Cancellation & refund policy page. Plain-language explanation of all four tiers (uses A4).
 E4. Psychedelic-facilitation disclaimer (LOCKED). Fixed wording. Route it past counsel for sign-off; no rewriting.
 E5. Guest-booking data notice. Short at-booking notice of what is collected (name/email always; billing/phone/card only when paying on-platform).
 E6. Practitioner agreement / payment terms. Including the disclaimer that the platform is not a party to offsite payments. Counsel review required.
 E7. Cookie / consent banner (light). Privacy-preserving default (decline non-essential).


Suggested Sequence

A1 to A4 first. Hero, tagline, pricing labels, and cancellation tiers are reused across nearly every surface and email. Writing them once prevents drift.
High-leverage reusable microcopy next: the 12 category descriptors (B3), session/pricing display (B16), and the cancellation display (B24), since these repeat.
Then surface by surface: seeker discovery, booking flow, practitioner onboarding/dashboard, emails.
Legal in parallel, since E1/E2/E6 have external dependency (counsel) and longer lead time.


Out of This Pass (noted so they are not lost)

Sages program copy (curator value prop, invitation, Sage page). Its own phase; you did not scope it here.
Full marketing landing / About / pricing-as-marketing. Blocked on the A5 marketing-weight decision.
AI search v2 copy (conversational UI). Tied to a future phase.

### Terminology sweep (do before any other copy task)
- [ ] **A6. Sage → Guide rename sweep.** All display copy, page routes'
  visible text, email templates. Code untouched. Includes Guide program copy
  when that phase opens.
- [ ] **A7. Role-neutral chrome audit.** Nav, /help, section headers: replace
  audience labels with task language per brand-voice.md.

### Trust copy (new items)
- [ ] **B25. Guide endorsement surfacing.** "Recommended by [Guide]" treatment
  on cards and profiles.
- [ ] **B26. "What to expect" session-type field.** Practitioner-authored,
  prompted; shown pre-booking. (Requires schema addition — flag as Phase 6+
  build dependency, copy can be drafted now.)
- [ ] **B27. Founding-practitioner marker.** Zero-reviews-as-early framing for
  the beta cohort.
- [ ] **D9. Pre-session reminder email (24h).** Prep note + self-cancel link.
  Calm, zero urgency. New send — requires cron/build task, copy drafted now.