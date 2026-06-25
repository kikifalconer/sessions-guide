# sessions.guide — Availability Blocks

Feature context for Claude Code. Read before building anything touching availability, location, or booking time windows.

---

## Core Principle

Location is a property of an **availability block**, not a practitioner profile.

Practitioners work across multiple locations on different schedules — a home studio on Mondays, a rented space in another city mid-week, Zoom every day, traveling internationally for a month. Location is attached to each availability window, not to the practitioner record. This is a key product differentiator. Preserve it in all schema and feature work.

---

## Schema

```sql
availability_blocks
  id                  uuid primary key default gen_random_uuid()
  practitioner_id     uuid not null references practitioners(id) on delete cascade
  format              text not null check (format in ('virtual', 'in_person', 'both'))
  location_place_id   text null           -- Google Places ID; null only when format = 'virtual'
  location_display    text null           -- human-readable label, stored at save time via Places API
  location_lat        numeric(9,6) null   -- for PostGIS radius queries
  location_lng        numeric(9,6) null   -- for PostGIS radius queries
  recurrence_rule     text null           -- e.g. 'WEEKLY:MON,WED'; null for one-off blocks
  start_date          date null           -- for date-bounded blocks
  end_date            date null           -- for date-bounded blocks
  start_time          time not null
  end_time            time not null
  timezone            text not null       -- IANA string e.g. 'America/Los_Angeles'
  is_active           boolean not null default true
  created_at          timestamptz not null default now()
  updated_at          timestamptz not null default now()

  constraint location_required_for_in_person check (
    format = 'virtual'
    or (format in ('in_person', 'both') and location_place_id is not null)
  )
```

---

## Format Field

| Value | Location required | Display |
|---|---|---|
| `virtual` | No — `location_place_id` is null | "Virtual" |
| `in_person` | Yes | City name pre-booking; full location post-booking |
| `both` | Yes (for in-person option) | "Virtual or In-Person · [City]" |

When format is `both`: seeker chooses at booking time. Their choice is stored on the booking record as `booked_format`.

---

## Block Types

**Recurring:** Practitioner available every Tuesday indefinitely.
- `recurrence_rule = 'WEEKLY:TUE'`, `start_date` and `end_date` null

**Date-bounded:** Practitioner in Bali March 1-31.
- `start_date = '2026-03-01'`, `end_date = '2026-03-31'`
- `recurrence_rule` may be null (any day in window) or set (specific days in window)

**One-off:** Single available window on a specific date.
- `start_date = end_date`, no recurrence rule

---

## Google Places ID

`location_place_id` is always a Google Places ID — never freeform text.

Supports city-level, neighbourhood-level, or full address. Practitioner chooses granularity. City-level protects home studio privacy.

**API:** Google Places API (classic) — already enabled. Do NOT use Places API New.
**Env var:** `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`

On selection via autocomplete:
1. Store the Place ID in `location_place_id`
2. Call Place Details to get human-readable label → store in `location_display`
3. Extract lat/lng → store in `location_lat` / `location_lng`

---

## Display Logic by Context

| Context | Show |
|---|---|
| Search results / discovery | City name only |
| Practitioner's own dashboard | Full `location_display` label |
| Pre-booking profile page | City name only |
| Post-booking confirmation (seeker) | Full place name / address |

---

## Search Query Logic

Geographic search queries `availability_blocks`, not `practitioners`.

"Bodyworkers in Melbourne" returns practitioners who have at least one active block where:
- `format` is `in_person` or `both`, AND
- PostGIS radius query on `location_lat`/`location_lng` matches Melbourne area

OR where:
- `format` is `virtual` (virtual sessions surface in all location searches unless seeker filters in-person only)

---

## Dashboard UX

Availability block creation form order:
1. **Format** first (virtual / in-person / both) — determines whether location field appears
2. **Location** (Google Places Autocomplete) — shown only for in-person or both
3. **Privacy note:** "Only your city is shown to seekers before booking"
4. **Recurring or specific dates** — toggle
5. **Time window** + **timezone**
6. **Session types** available in this block (optional — if not set, all active session types)

---

## Relationship to Bookings

At booking time:
- Location is copied from the block to the booking record (`booked_location_display`, `booked_location_place_id`)
- This is durable — if the practitioner later edits or deletes the block, past bookings retain the original location
- `booked_format` stores the seeker's chosen format (relevant when block format is `both`)
