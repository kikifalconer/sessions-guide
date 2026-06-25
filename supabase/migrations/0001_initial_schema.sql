-- sessions.guide — Initial Schema Migration
-- Run via Supabase dashboard or CLI. Do not run directly.

-- ============================================================
-- TABLES
-- ============================================================

-- categories
create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- modalities (forward reference: suggested_by added after practitioners)
create table modalities (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references categories(id),
  name          text not null unique,
  slug          text not null unique,
  is_approved   boolean not null default false,
  suggested_by  uuid null,  -- FK to practitioners added below
  created_at    timestamptz not null default now()
);

-- practitioners
create table practitioners (
  id                           uuid primary key references auth.users(id),
  full_name                    text not null,
  slug                         text not null unique,
  bio                          text,
  tagline                      text,
  photo_url                    text,
  banner_url                   text,
  video_url                    text,
  website_url                  text,
  instagram_url                text,
  youtube_url                  text,
  subscription_tier            text check (subscription_tier in ('basic', 'premium')) default 'basic',
  is_published                 boolean not null default false,
  stripe_customer_id           text,
  stripe_account_id            text,
  payment_method               text check (payment_method in ('stripe', 'offsite')) default 'stripe',
  offsite_payment_instructions text,
  cancellation_policy          text check (cancellation_policy in ('none', 'flexible', 'moderate', 'strict')),
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

-- Add FK from modalities.suggested_by → practitioners
alter table modalities
  add constraint modalities_suggested_by_fkey
  foreign key (suggested_by) references practitioners(id);

-- practitioner_modalities
create table practitioner_modalities (
  practitioner_id  uuid not null references practitioners(id) on delete cascade,
  modality_id      uuid not null references modalities(id),
  is_primary       boolean not null default false,
  primary key (practitioner_id, modality_id)
);

create unique index one_primary_modality_per_practitioner
  on practitioner_modalities (practitioner_id)
  where is_primary = true;

-- session_types
create table session_types (
  id                  uuid primary key default gen_random_uuid(),
  practitioner_id     uuid not null references practitioners(id) on delete cascade,
  modality_id         uuid not null references modalities(id),
  name                text not null,
  description         text,
  duration_minutes    int not null,
  format              text not null check (format in ('virtual', 'in_person', 'both')),
  pricing_model       text not null check (pricing_model in ('fixed', 'sliding_scale', 'donation', 'inquire')),
  price               numeric(10,2),
  price_min           numeric(10,2),
  price_max           numeric(10,2),
  payment_method      text check (payment_method in ('stripe', 'offsite')),
  cancellation_policy text check (cancellation_policy in ('none', 'flexible', 'moderate', 'strict')),
  photo_url           text,
  is_active           boolean not null default true,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- availability_blocks
create table availability_blocks (
  id                uuid primary key default gen_random_uuid(),
  practitioner_id   uuid not null references practitioners(id) on delete cascade,
  format            text not null check (format in ('virtual', 'in_person', 'both')),
  location_place_id text null,
  location_display  text null,
  location_lat      numeric(9,6) null,
  location_lng      numeric(9,6) null,
  recurrence_rule   text null,
  start_date        date null,
  end_date          date null,
  start_time        time not null,
  end_time          time not null,
  timezone          text not null,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint location_required_for_in_person check (
    format = 'virtual'
    or (format in ('in_person', 'both') and location_place_id is not null)
  )
);

-- bookings
create table bookings (
  id                        uuid primary key default gen_random_uuid(),
  practitioner_id           uuid not null references practitioners(id),
  availability_block_id     uuid not null references availability_blocks(id),
  session_type_id           uuid not null references session_types(id),
  seeker_id                 uuid null references auth.users(id),
  guest_name                text,
  guest_email               text,
  booked_format             text not null check (booked_format in ('virtual', 'in_person')),
  booked_location_display   text,
  booked_location_place_id  text,
  start_datetime            timestamptz not null,
  end_datetime              timestamptz not null,
  status                    text not null check (status in ('pending_payment', 'pending_approval', 'confirmed', 'cancelled', 'completed')) default 'pending_payment',
  confirmation_mode         text not null check (confirmation_mode in ('instant', 'pending_payment', 'pending_approval')),
  payment_status            text check (payment_status in ('unpaid', 'paid', 'refunded', 'offsite')),
  stripe_payment_intent_id  text,
  amount_paid               numeric(10,2),
  notes                     text,
  cancellation_reason       text,
  cancelled_by              text check (cancelled_by in ('seeker', 'practitioner')),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- clients
create table clients (
  id              uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  seeker_id       uuid null references auth.users(id),
  guest_email     text,
  guest_name      text,
  notes           text,
  first_booked_at timestamptz,
  last_booked_at  timestamptz,
  session_count   int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- reviews
create table reviews (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references bookings(id),
  practitioner_id uuid not null references practitioners(id),
  reviewer_id     uuid null references auth.users(id),
  reviewer_name   text not null,
  rating          int not null check (rating between 1 and 5),
  body            text,
  is_published    boolean not null default false,
  is_featured     boolean not null default false,
  created_at      timestamptz not null default now()
);

-- subscriptions
create table subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  practitioner_id        uuid not null references practitioners(id),
  stripe_subscription_id text not null unique,
  stripe_customer_id     text not null,
  tier                   text not null check (tier in ('basic', 'premium')),
  billing_cycle          text not null check (billing_cycle in ('monthly', 'annual')),
  status                 text not null,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- sages
create table sages (
  id              uuid primary key references auth.users(id),
  display_name    text not null,
  slug            text not null unique,
  bio             text,
  photo_url       text,
  badge_active    boolean not null default true,
  is_practitioner boolean not null default false,
  created_at      timestamptz not null default now()
);

-- sage_recommendations
create table sage_recommendations (
  sage_id         uuid not null references sages(id) on delete cascade,
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  note            text,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  primary key (sage_id, practitioner_id)
);

-- ============================================================
-- SEED DATA — Categories (12 fixed)
-- ============================================================

insert into categories (name, slug, sort_order) values
  ('Energy Healing',      'energy-healing',       1),
  ('Journeys',            'journeys',              2),
  ('Readings',            'readings',              3),
  ('Ancient Healing Arts','ancient-healing-arts',  4),
  ('Consciousness',       'consciousness',         5),
  ('Embodied',            'embodied',              6),
  ('Natural Beauty',      'natural-beauty',        7),
  ('Family',              'family',                8),
  ('Creativity',          'creativity',            9),
  ('Intimate',            'intimate',             10),
  ('Coaching',            'coaching',             11),
  ('Ceremony',            'ceremony',             12);

-- ============================================================
-- SEED DATA — Modalities (all is_approved = true)
-- ============================================================

insert into modalities (category_id, name, slug, is_approved)
select c.id, m.name, m.slug, true
from (values
  -- Energy Healing
  ('energy-healing', 'Reiki',           'reiki'),
  ('energy-healing', 'Sound Healing',   'sound-healing'),
  ('energy-healing', 'Pranic Healing',  'pranic-healing'),
  ('energy-healing', 'Crystal Healing', 'crystal-healing'),
  ('energy-healing', 'Quantum Healing', 'quantum-healing'),
  ('energy-healing', 'Feng Shui',       'feng-shui'),

  -- Journeys
  ('journeys', 'Plant Medicine',           'plant-medicine'),
  ('journeys', 'Breathwork',               'breathwork'),
  ('journeys', 'Psychedelic Facilitation', 'psychedelic-facilitation'),
  ('journeys', 'Retreat',                  'retreat'),
  ('journeys', 'Vision Quest',             'vision-quest'),

  -- Readings
  ('readings', 'Astrology',       'astrology'),
  ('readings', 'Tarot',           'tarot'),
  ('readings', 'Human Design',    'human-design'),
  ('readings', 'Numerology',      'numerology'),
  ('readings', 'Akashic Records', 'akashic-records'),
  ('readings', 'Psychic Reading', 'psychic-reading'),
  ('readings', 'Channeling',      'channeling'),
  ('readings', 'Enneagram',       'enneagram'),
  ('readings', 'Gene Keys',       'gene-keys'),

  -- Ancient Healing Arts
  ('ancient-healing-arts', 'Acupuncture',                   'acupuncture'),
  ('ancient-healing-arts', 'Ayurveda',                      'ayurveda'),
  ('ancient-healing-arts', 'Traditional Chinese Medicine',  'traditional-chinese-medicine'),
  ('ancient-healing-arts', 'Cupping',                       'cupping'),
  ('ancient-healing-arts', 'Herbalism',                     'herbalism'),

  -- Consciousness
  ('consciousness', 'Meditation',          'meditation'),
  ('consciousness', 'Hypnotherapy',        'hypnotherapy'),
  ('consciousness', 'Past Life Regression','past-life-regression'),
  ('consciousness', 'Dream Work',          'dream-work'),
  ('consciousness', 'Shamanic Healing',    'shamanic-healing'),

  -- Embodied
  ('embodied', 'Somatic Therapy',        'somatic-therapy'),
  ('embodied', 'Massage',                'massage'),
  ('embodied', 'Bodywork',               'bodywork'),
  ('embodied', 'Dance Movement Therapy', 'dance-movement-therapy'),
  ('embodied', 'Yoga Therapy',           'yoga-therapy'),

  -- Natural Beauty
  ('natural-beauty', 'Holistic Facial',     'holistic-facial'),
  ('natural-beauty', 'Gua Sha',             'gua-sha'),
  ('natural-beauty', 'Facial Acupuncture',  'facial-acupuncture'),
  ('natural-beauty', 'Scalp Care',          'scalp-care'),
  ('natural-beauty', 'Aesthetics',          'aesthetics'),

  -- Family
  ('family', 'Doula',               'doula'),
  ('family', 'Birth Preparation',   'birth-preparation'),
  ('family', 'Postpartum Support',  'postpartum-support'),
  ('family', 'Fertility Support',   'fertility-support'),
  ('family', 'Infant Massage',      'infant-massage'),

  -- Creativity
  ('creativity', 'Art Therapy',     'art-therapy'),
  ('creativity', 'Expressive Arts', 'expressive-arts'),
  ('creativity', 'Writing',         'writing'),
  ('creativity', 'Music Therapy',   'music-therapy'),
  ('creativity', 'Portraits',       'portraits'),
  ('creativity', 'Photography',     'photography'),

  -- Intimate
  ('intimate', 'Sexuality Coaching',   'sexuality-coaching'),
  ('intimate', 'Tantra',               'tantra'),
  ('intimate', 'Relationship Coaching','relationship-coaching'),
  ('intimate', 'Somatic Sex Therapy',  'somatic-sex-therapy'),

  -- Coaching
  ('coaching', 'Life Coaching',          'life-coaching'),
  ('coaching', 'Spiritual Coaching',     'spiritual-coaching'),
  ('coaching', 'Business Coaching',      'business-coaching'),
  ('coaching', 'Nutrition Coaching',     'nutrition-coaching'),
  ('coaching', 'Therapy & Counseling',   'therapy-counseling'),

  -- Ceremony
  ('ceremony', 'Cacao Ceremony',    'cacao-ceremony'),
  ('ceremony', 'Grief Rituals',     'grief-rituals'),
  ('ceremony', 'Rites of Passage',  'rites-of-passage'),
  ('ceremony', 'Wedding Ceremony',  'wedding-ceremony'),
  ('ceremony', 'Death Doula',       'death-doula')
) as m(cat_slug, name, slug)
join categories c on c.slug = m.cat_slug;
