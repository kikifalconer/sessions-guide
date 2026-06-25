# sessions.guide — Database Schema

Living source of truth. Update after every migration. Check this before writing any database query.

---

## auth.users (Supabase managed)
Supabase handles this table. `id` is a UUID used as FK in `practitioners`.

---

## practitioners
```sql
id                  uuid primary key references auth.users(id)  -- NOT a separate user_id
full_name           text not null
slug                text not null unique  -- URL-safe, e.g. 'maya-johnson'
bio                 text
tagline             text  -- short line shown on profile header
photo_url           text  -- Cloudinary URL, smart face crop applied
banner_url          text  -- Cloudinary URL, focal point auto-crop applied
video_url           text  -- Cloudinary or external video URL
link_1              text  -- generic URL slot; platform label derived at render time
link_2              text
link_3              text
website_url         text  -- legacy; migrated to link_1 in 0002_add_link_columns.sql
instagram_url       text  -- legacy; migrated to link_2
youtube_url         text  -- legacy; migrated to link_3
subscription_tier   text check (subscription_tier in ('basic', 'premium')) default 'basic'
is_published        boolean not null default false
stripe_customer_id  text
stripe_account_id   text  -- Stripe Connect account for receiving session payments
payment_method      text check (payment_method in ('stripe', 'offsite')) default 'stripe'
offsite_payment_instructions text  -- shown to seekers if payment_method = 'offsite'
cancellation_policy text check (cancellation_policy in ('none', 'flexible', 'moderate', 'strict'))
confirmation_mode   text not null default 'instant' check (confirmation_mode in ('instant', 'pending_payment', 'pending_approval'))  -- added in 0003; session_types override
created_at          timestamptz not null default now()
updated_at          timestamptz not null default now()
```

**Critical:** `practitioners.id` = `auth.users.id`. Never use `user_id`. Never `randomUUID()`.

---

## categories
```sql
id          uuid primary key default gen_random_uuid()
name        text not null unique
slug        text not null unique  -- e.g. 'energy-healing', 'journeys'
sort_order  int not null default 0
created_at  timestamptz not null default now()
```

**12 fixed categories (never change):**
Energy Healing, Journeys, Readings, Ancient Healing Arts, Consciousness, Embodied, Natural Beauty, Family, Creativity, Intimate, Coaching, Ceremony

Slugs: `energy-healing`, `journeys`, `readings`, `ancient-healing-arts`, `consciousness`, `embodied`, `natural-beauty`, `family`, `creativity`, `intimate`, `coaching`, `ceremony`

---

## modalities
```sql
id            uuid primary key default gen_random_uuid()
category_id   uuid not null references categories(id)
name          text not null unique
slug          text not null unique  -- e.g. 'reiki', 'astrology', 'plant-medicine'
is_approved   boolean not null default false  -- platform seeds as true; suggestions start false
suggested_by  uuid null references practitioners(id)
created_at    timestamptz not null default now()
```

---

## practitioner_modalities
```sql
practitioner_id   uuid not null references practitioners(id) on delete cascade
modality_id       uuid not null references modalities(id)
is_primary        boolean not null default false
primary key (practitioner_id, modality_id)
```

**Constraints:**
- Exactly 1 primary modality per practitioner (enforced by partial unique index)
- Max 3 modalities total per practitioner (enforced at application layer)
- Up to 2 secondary modalities

```sql
create unique index one_primary_modality_per_practitioner
  on practitioner_modalities (practitioner_id)
  where is_primary = true;
```

---

## session_types
```sql
id                  uuid primary key default gen_random_uuid()
practitioner_id     uuid not null references practitioners(id) on delete cascade
modality_id         uuid not null references modalities(id)
name                text not null  -- NOTE: 'name' not 'title'
description         text
duration_minutes    int not null
format              text not null check (format in ('virtual', 'in_person', 'both'))
pricing_model       text not null check (pricing_model in ('fixed', 'sliding_scale', 'donation', 'inquire'))
price               numeric(10,2)  -- null if donation or inquire
price_min           numeric(10,2)  -- for sliding_scale
price_max           numeric(10,2)  -- for sliding_scale
payment_method      text check (payment_method in ('stripe', 'offsite'))  -- overrides practitioner default if set
cancellation_policy text check (cancellation_policy in ('none', 'flexible', 'moderate', 'strict'))
confirmation_mode   text check (confirmation_mode in ('instant', 'pending_payment', 'pending_approval'))  -- added in 0003; nullable override of practitioners.confirmation_mode
photo_url           text  -- Cloudinary URL
is_active           boolean not null default true
sort_order          int not null default 0
created_at          timestamptz not null default now()
updated_at          timestamptz not null default now()
```

**Note:** Category is always inferred via `modalities.category_id` — never stored directly on session_types.

---

## availability_blocks
```sql
id                  uuid primary key default gen_random_uuid()
practitioner_id     uuid not null references practitioners(id) on delete cascade
format              text not null check (format in ('virtual', 'in_person', 'both'))
location_place_id   text null  -- Google Places ID; null only when format = 'virtual'
location_display    text null  -- human-readable label from Places API, stored at save time
location_lat        numeric(9,6) null  -- for PostGIS queries
location_lng        numeric(9,6) null  -- for PostGIS queries
recurrence_rule     text null  -- e.g. 'WEEKLY:MON,WED'; null for one-off blocks
start_date          date null  -- for date-bounded blocks
end_date            date null  -- for date-bounded blocks
start_time          time not null
end_time            time not null
timezone            text not null  -- IANA timezone string e.g. 'America/Los_Angeles'
is_active           boolean not null default true
created_at          timestamptz not null default now()
updated_at          timestamptz not null default now()

constraint location_required_for_in_person check (
  format = 'virtual'
  or (format in ('in_person', 'both') and location_place_id is not null)
)
```

---

## bookings
```sql
id                    uuid primary key default gen_random_uuid()
practitioner_id       uuid not null references practitioners(id)
availability_block_id uuid not null references availability_blocks(id)
session_type_id       uuid not null references session_types(id)
seeker_id             uuid null references auth.users(id)  -- null if guest booking
guest_name            text  -- required if seeker_id is null
guest_email           text  -- required if seeker_id is null
booked_format         text not null check (booked_format in ('virtual', 'in_person'))
booked_location_display text  -- copied from block at booking time (durable)
booked_location_place_id text  -- copied from block at booking time (durable)
start_datetime        timestamptz not null
end_datetime          timestamptz not null
status                text not null check (status in ('pending_payment', 'pending_approval', 'confirmed', 'cancelled', 'completed')) default 'pending_payment'
confirmation_mode     text not null check (confirmation_mode in ('instant', 'pending_payment', 'pending_approval'))
payment_status        text check (payment_status in ('unpaid', 'paid', 'refunded', 'offsite'))
stripe_payment_intent_id text
amount_paid           numeric(10,2)
notes                 text  -- seeker's note to practitioner at booking
cancellation_reason   text
cancelled_by          text check (cancelled_by in ('seeker', 'practitioner'))
cancelled_at          timestamptz  -- added in 0004; stamped once at cancellation, load-bearing for refund-tier math
amount_refunded       numeric(10,2)  -- added in 0004; refunded amount in dollars (partial allowed); offsite records the obligation
stripe_refund_id      text  -- added in 0004; refund issued on the connected account
seeker_token          text not null unique default encode(gen_random_bytes(32), 'hex')  -- added in 0004; opaque 256-bit per-booking bearer token. Powers the cancel link today; REUSE for the review link (do not mint a second token)
google_event_id       text  -- added in 0008; nullable; Google Calendar event id for outbound sync (delete on cancel). Outbound creation not yet wired (see decisions.md TD2)
review_request_sent_at timestamptz  -- added in 0006; stamped by the hourly cron when the review-request email is sent (idempotency, ~24h after end_datetime per D9)
created_at            timestamptz not null default now()
updated_at            timestamptz not null default now()
```

**Double-booking prevention (added in 0003):** btree_gist exclusion constraint — no two non-cancelled bookings for the same practitioner may overlap:
```sql
alter table bookings add constraint no_overlapping_bookings
  exclude using gist (practitioner_id with =, tstzrange(start_datetime, end_datetime) with &&)
  where (status <> 'cancelled');
```
A non-cancelled `pending_payment` row IS the slot hold during checkout. Abandoned on-platform holds (`payment_status = 'unpaid'`, older than 30 min) are lazily cancelled during slot generation. Offsite `pending_payment` rows (`payment_status = 'offsite'`) are durable and never auto-expired.

---

## stripe_webhook_events
```sql
-- added in 0004; shared idempotency ledger for all Stripe webhook handlers
id          text primary key  -- Stripe event id (evt_...)
type        text not null
received_at timestamptz not null default now()
```

---

## waitlist
```sql
-- added in 0005; holding-page email capture, written via service role only
id         uuid primary key default gen_random_uuid()
email      text not null unique
created_at timestamptz not null default now()
```

---

## calendar_integrations
```sql
-- added in 0008; Google Calendar OAuth per practitioner. SERVICE-ROLE ONLY:
-- RLS enabled with NO policies, so anon/authenticated get nothing (D6/D18).
practitioner_id uuid primary key references practitioners(id) on delete cascade
provider        text not null default 'google' check (provider in ('google'))
access_token    text not null
refresh_token   text not null  -- PLAINTEXT (D6/TD1 debt; encrypt-at-rest pre-launch gate, target 2026-09-01)
token_expiry    timestamptz not null
scope           text
calendar_id     text not null default 'primary'
sync_enabled    boolean not null default true  -- set false on revoked/expired grant (graceful degradation, D5)
last_synced_at  timestamptz
connected_at    timestamptz not null default now()
created_at      timestamptz not null default now()
updated_at      timestamptz not null default now()
```

---

## calendar_busy
```sql
-- added in 0008; cached Google free/busy windows refreshed by the hourly cron.
-- Shape matches the slot generator's BookedWindow so windows merge directly
-- into slot suppression (merge into the slot caller not yet wired).
id              uuid primary key default gen_random_uuid()
practitioner_id uuid not null references practitioners(id) on delete cascade
start_datetime  timestamptz not null
end_datetime    timestamptz not null
source_event_id text
synced_at       timestamptz not null default now()
```
Index: `calendar_busy_practitioner_time (practitioner_id, start_datetime, end_datetime)`.

---

## clients
```sql
id              uuid primary key default gen_random_uuid()
practitioner_id uuid not null references practitioners(id) on delete cascade
seeker_id       uuid null references auth.users(id)
guest_email     text  -- populated for guest bookers
guest_name      text
notes           text  -- practitioner private notes
first_booked_at timestamptz
last_booked_at  timestamptz
session_count   int not null default 0
created_at      timestamptz not null default now()
updated_at      timestamptz not null default now()
```

---

## reviews
```sql
id              uuid primary key default gen_random_uuid()
booking_id      uuid not null references bookings(id)
practitioner_id uuid not null references practitioners(id)
reviewer_id     uuid null references auth.users(id)  -- null if submitted as guest
reviewer_name   text not null
rating          int not null check (rating between 1 and 5)
body            text
is_published    boolean not null default false  -- published after moderation
is_featured     boolean not null default false  -- practitioner can feature one review
created_at      timestamptz not null default now()
```

**Unique index (added in 0006):** `reviews_one_per_booking` — unique on `booking_id`, enforcing one review per booking.

**Status (verified June 2026):** the review LOOP is BUILT (0006). Guest submission at `/review/[token]` reuses `bookings.seeker_token` (no second token), derives ids server-side, and sets `is_published = true` on submit (auto-publish, D8). The hourly cron promotes `confirmed → completed` and sends the review-request email ~24h after `end_datetime` (D9), idempotent via `bookings.review_request_sent_at`. `is_published` keeps its `false` default so a moderation lever remains; the submission path flips it explicitly. Consumers: the profile page rating aggregation (`is_published = true`) and the submission flow. Featured-review actions are deferred. The report hook IS built (Phase 5 / D17 — see `review_reports`).

---

## review_reports
```sql
-- added in 0009 (D17); minimal report hook. Append-only, never mutates the
-- review row; multiple reports per review allowed (count = triage signal). No
-- reporter PII for the minimal version (rate-limit/auth is Phase 6).
id         uuid primary key default gen_random_uuid()
review_id  uuid not null references reviews(id) on delete cascade
reason     text
created_at timestamptz not null default now()
```
Index: `review_reports_review_id (review_id)`. Write path: the public `reportReview` server action (service role, TD3) appends a row and sends a Resend notice to `REPORT_NOTICE_EMAIL` (default `hello@sessions.guide`) **only on the first report per review**. Reviews page: `/[slug]/reviews`.

---

## inquiries
```sql
-- added in 0007; INQUIRE path for inquire-priced session types (per-card) and
-- profile-level questions (About button). Written via service role.
id              uuid primary key default gen_random_uuid()
practitioner_id uuid not null references practitioners(id) on delete cascade
session_type_id uuid references session_types(id)  -- null = profile-level inquiry (D11)
seeker_name     text not null
seeker_email    text not null
message         text not null
status          text not null default 'new' check (status in ('new', 'read', 'archived'))
created_at      timestamptz not null default now()
updated_at      timestamptz not null default now()
```
Index: `inquiries_practitioner (practitioner_id, created_at desc)`. Submission at `/[slug]/inquire/[[...sessionTypeId]]` re-resolves the practitioner from the slug (published only) server-side and validates the session belongs to them; notifies the practitioner via Resend (`replyTo` = seeker).

---

## subscriptions
```sql
id                      uuid primary key default gen_random_uuid()
practitioner_id         uuid not null references practitioners(id)
stripe_subscription_id  text not null unique
stripe_customer_id      text not null
tier                    text not null check (tier in ('basic', 'premium'))
billing_cycle           text not null check (billing_cycle in ('monthly', 'annual'))
status                  text not null  -- mirrors Stripe: active, past_due, canceled, etc.
current_period_start    timestamptz
current_period_end      timestamptz
created_at              timestamptz not null default now()
updated_at              timestamptz not null default now()
```

---

## sages
```sql
id              uuid primary key references auth.users(id)
display_name    text not null
slug            text not null unique
bio             text
photo_url       text  -- Cloudinary URL
badge_active    boolean not null default true
is_practitioner boolean not null default false  -- eligible for reciprocity discount
created_at      timestamptz not null default now()
```

## sage_recommendations
```sql
sage_id         uuid not null references sages(id) on delete cascade
practitioner_id uuid not null references practitioners(id) on delete cascade
note            text  -- sage's personal endorsement note
sort_order      int not null default 0
created_at      timestamptz not null default now()
primary key (sage_id, practitioner_id)
```

---

## Category Inference Pattern

Always derive category via join — never store it directly:

```sql
-- Category for a session type
select c.name as category
from session_types st
join modalities m on m.id = st.modality_id
join categories c on c.id = m.category_id
where st.id = $1;

-- All categories a practitioner spans
select distinct c.name, c.slug
from practitioner_modalities pm
join modalities m on m.id = pm.modality_id
join categories c on c.id = m.category_id
where pm.practitioner_id = $1;
```
