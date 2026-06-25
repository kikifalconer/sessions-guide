// Pure validation + normalization for availability_blocks writes, shared by the
// dashboard server actions. Mirrors src/lib/sessionType.ts (pass 1).
//
// CRITICAL (A2 acceptance criterion): the DB CHECK only requires location_place_id
// for in_person/both — it does NOT require lat/lng or a city-derivable display.
// But the verified discovery read (src/lib/discovery.ts) SILENTLY DROPS any
// in_person/both block missing location_lat, location_lng, or a city label. So a
// block saved with a null geocode is invisible to city pages + search — a bug of
// the same severity as a missing ownership check. This module is the guard that
// fails VISIBLY at save instead of silently at read.

import { DateTime } from 'luxon'
import { parseRecurrenceRule } from './availability'

export const FORMATS = ['virtual', 'in_person', 'both'] as const

export type BlockInput = {
  format: string
  // location — only for in_person/both; resolved client-side via classic Places
  locationPlaceId: string | null
  locationDisplay: string | null // city-first "City, Region, Country"
  locationLat: number | null
  locationLng: number | null
  // schedule
  recurrenceRule: string | null // 'WEEKLY:MON,WED' or null
  startDate: string | null // 'YYYY-MM-DD'
  endDate: string | null
  startTime: string // 'HH:MM' or 'HH:MM:SS'
  endTime: string
  timezone: string // IANA
}

export type BlockRow = {
  format: string
  location_place_id: string | null
  location_display: string | null
  location_lat: number | null
  location_lng: number | null
  recurrence_rule: string | null
  start_date: string | null
  end_date: string | null
  start_time: string
  end_time: string
  timezone: string
}

function inSet<T extends string>(set: readonly T[], value: string): value is T {
  return (set as readonly string[]).includes(value)
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function normalizeTime(t: string): string | null {
  const m = t?.trim().match(TIME_RE)
  if (!m) return null
  return `${m[1]}:${m[2]}:${m[3] ?? '00'}`
}

function isValidDate(d: string): boolean {
  return DATE_RE.test(d) && DateTime.fromISO(d).isValid
}

function isValidZone(tz: string): boolean {
  return DateTime.now().setZone(tz).isValid
}

// The exact value discovery's cityLabel extracts (display.split(',')[0].trim()).
function cityFirstSegment(display: string): string | null {
  return display.split(',')[0]?.trim() || null
}

export function validateBlockInput(input: BlockInput): { row: BlockRow } | { error: string } {
  if (!inSet(FORMATS, input.format)) return { error: 'Choose a format.' }

  // Location — the A2 acceptance criterion. For in_person/both the block MUST
  // carry a place id, non-null in-range lat/lng, AND a city-first display, or it
  // is silently invisible to discovery. Reject; never persist a null geocode.
  let placeId: string | null = null
  let display: string | null = null
  let lat: number | null = null
  let lng: number | null = null
  if (input.format === 'in_person' || input.format === 'both') {
    placeId = input.locationPlaceId?.trim() || null
    display = input.locationDisplay?.trim() || null
    lat = input.locationLat
    lng = input.locationLng
    if (!placeId) return { error: 'Choose a location from the suggestions.' }
    if (
      lat === null ||
      lng === null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return {
        error: 'That location did not resolve to map coordinates. Pick it again from the suggestions.',
      }
    }
    if (!display || !cityFirstSegment(display)) {
      return {
        error: 'We could not read a city for that location. Pick a more specific place from the suggestions.',
      }
    }
  }
  // virtual: all location fields stay null.

  // Times
  const startTime = normalizeTime(input.startTime)
  const endTime = normalizeTime(input.endTime)
  if (!startTime || !endTime) return { error: 'Set a start and end time.' }
  if (endTime <= startTime) return { error: 'The end time must be after the start time.' }

  // Timezone — consumed directly by the luxon-based slot generator; an invalid
  // IANA string produces zero slots, so reject it here.
  const timezone = input.timezone?.trim()
  if (!timezone || !isValidZone(timezone)) {
    return { error: 'Set a valid timezone for this block.' }
  }

  // Recurrence + dates. Uses the SAME parser the slot generator reads
  // (parseRecurrenceRule), so the form can only write what the reader accepts.
  const recurrenceRule = input.recurrenceRule?.trim() || null
  if (recurrenceRule && parseRecurrenceRule(recurrenceRule) === 'invalid') {
    return { error: 'Choose at least one day of the week.' }
  }
  const startDate = input.startDate?.trim() || null
  let endDate = input.endDate?.trim() || null
  if (startDate && !isValidDate(startDate)) return { error: 'Enter a valid start date.' }
  if (endDate && !isValidDate(endDate)) return { error: 'Enter a valid end date.' }

  // Block-type coherence: recurring (rule, no dates), date-bounded (start+end,
  // rule optional), one-off (start=end). At least one of rule/dates is required
  // so the form can't accidentally create an unbounded every-day block.
  if (!recurrenceRule && !startDate) {
    return { error: 'Choose recurring days, or set a date range.' }
  }
  if (startDate) {
    if (!endDate) return { error: 'Set an end date.' }
    if (endDate < startDate) return { error: 'The end date must be on or after the start date.' }
  } else if (endDate) {
    return { error: 'Set a start date.' }
  }
  // recurring (no dates): both stay null.
  if (!startDate) endDate = null

  return {
    row: {
      format: input.format,
      location_place_id: placeId,
      location_display: display,
      location_lat: lat,
      location_lng: lng,
      recurrence_rule: recurrenceRule,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
      timezone,
    },
  }
}
