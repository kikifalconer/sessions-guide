# sessions.guide — Categories and Modalities

Feature context for Claude Code. Read before building anything touching modality selection, category pages, or search filtering.

---

## Two Layers, Different Jobs

**Categories** = navigation. 12 fixed buckets. Never manually assigned. Always inferred from modality.
**Modalities** = identity and search. Specific practices within each category. Practitioner-facing.

---

## The 12 Categories

Fixed. These never change without a significant product decision.

| Category | Slug |
|---|---|
| Energy Healing | `energy-healing` |
| Journeys | `journeys` |
| Readings | `readings` |
| Ancient Healing Arts | `ancient-healing-arts` |
| Consciousness | `consciousness` |
| Embodied | `embodied` |
| Natural Beauty | `natural-beauty` |
| Family | `family` |
| Creativity | `creativity` |
| Intimate | `intimate` |
| Coaching | `coaching` |
| Ceremony | `ceremony` |

Note: "Frequency" is used as the display name for `energy-healing` in some UI contexts.

---

## Modalities by Category

```
Energy Healing:       Reiki, Sound Healing, Pranic Healing, Crystal Healing, Quantum Healing, Feng Shui
Journeys:             Plant Medicine, Breathwork, Psychedelic Facilitation, Retreat, Vision Quest
Readings:             Astrology, Tarot, Human Design, Numerology, Akashic Records, Psychic Reading, Channeling, Enneagram, Gene Keys
Ancient Healing Arts: Acupuncture, Ayurveda, Traditional Chinese Medicine, Cupping, Herbalism
Consciousness:        Meditation, Hypnotherapy, Past Life Regression, Dream Work, Shamanic Healing
Embodied:             Somatic Therapy, Massage, Bodywork, Dance Movement Therapy, Yoga Therapy
Natural Beauty:       Holistic Facial, Gua Sha, Facial Acupuncture, Scalp Care, Aesthetics
Family:               Doula, Birth Preparation, Postpartum Support, Fertility Support, Infant Massage
Creativity:           Art Therapy, Expressive Arts, Writing, Music Therapy, Portraits, Photography
Intimate:             Sexuality Coaching, Tantra, Relationship Coaching, Somatic Sex Therapy
Coaching:             Life Coaching, Spiritual Coaching, Business Coaching, Nutrition Coaching, Therapy & Counseling
Ceremony:             Cacao Ceremony, Grief Rituals, Rites of Passage, Wedding Ceremony, Death Doula
```

---

## Schema

### categories
```sql
id          uuid primary key default gen_random_uuid()
name        text not null unique
slug        text not null unique
sort_order  int not null default 0
created_at  timestamptz not null default now()
```
Seed all 12 on first migration.

### modalities
```sql
id            uuid primary key default gen_random_uuid()
category_id   uuid not null references categories(id)
name          text not null unique
slug          text not null unique
is_approved   boolean not null default false  -- seed as true; suggestions start false
suggested_by  uuid null references practitioners(id)
created_at    timestamptz not null default now()
```

### practitioner_modalities (join table)
```sql
practitioner_id   uuid not null references practitioners(id) on delete cascade
modality_id       uuid not null references modalities(id)
is_primary        boolean not null default false
primary key (practitioner_id, modality_id)
```

Enforce one primary modality per practitioner:
```sql
create unique index one_primary_modality_per_practitioner
  on practitioner_modalities (practitioner_id)
  where is_primary = true;
```

### session_types — modality column
```sql
alter table session_types
  add column modality_id uuid not null references modalities(id);
```

---

## Rules

- Max 3 modalities per practitioner; exactly 1 must be primary
- Each session type has exactly 1 modality
- Category is always inferred via join — never stored on session types or practitioner records
- Practitioner-suggested modalities: `is_approved = false` until admin approves
- No modality may be deleted if referenced — soft-deprecate instead

---

## Category Inference Queries

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

---

## Seeker-Facing Display

**Practitioner profile:**
- Primary modality shown in header (e.g. "Astrologer")
- Secondary modalities listed below ("Also offers: Tarot")
- Breadcrumb: Readings › Astrology

**Session type card:**
- Modality tag shown
- Category NOT shown at session type level — implied by modality

**Homepage:** 12 category pills. Tap → all practitioners with a modality in that category.

**Search/filter:** Filter by modality within a category, or search modality by name.

---

## Dashboard UX

**Profile modality selection:**
1. Select primary modality from searchable dropdown (approved modalities only)
2. Optionally add up to 2 secondary modalities
3. Category label appears automatically — practitioner sees it but cannot change it
4. "Suggest a modality" option → goes to admin queue

**Session type creation:**
1. Modality pre-filtered to practitioner's tagged modalities
2. Can select any approved modality — if not on profile, soft prompt: "Add [modality] to your profile?"
3. One modality per session type

---

## Psychedelic Facilitation

Any session type or profile where `modality.slug = 'psychedelic-facilitation'` must display:

> "Psychedelic journey facilitation may be subject to local laws and regulations. Practitioners and clients are solely responsible for ensuring compliance with the laws of their jurisdiction."

Triggered automatically by slug — never a manual toggle.
