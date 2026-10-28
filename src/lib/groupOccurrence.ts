import { DateTime } from 'luxon'
import { blockHostsSessionFormat, parseRecurrenceRule } from '@/lib/availability'

// Every insert or update of session_occurrences must call this. There is no
// second validator. Start and end are the occurrence span; this function has
// no duration argument and must not grow one. A downgraded Guide can still
// edit an existing occurrence. Only isNew requires subscription_tier =
// 'alchemist', read from practitioners, never from a subscriptions row (D24).

export type GroupOccurrenceBlock = {
  format: string
  recurrenceRule: string | null
  startDate: string | null // YYYY-MM-DD, or null when the block is open
  endDate: string | null
  startTime: string // HH:MM:SS
  endTime: string
  timezone: string
}

export type GroupOccurrenceInput = {
  tier: string | null
  isNew: boolean
  sessionType: {
    format: string
    maxCapacity: number | null
  }
  block: GroupOccurrenceBlock
  format: string
  startDatetime: string
  endDatetime: string
  capacity: number
}

export type GroupOccurrenceWrite = {
  format: 'virtual' | 'in_person'
  startDatetime: string
  endDatetime: string
  capacity: number
}

type OccupiedDays = { first: DateTime; last: DateTime }

function localDay(value: string | null, zone: string): DateTime | null {
  if (!value) return null
  const day = DateTime.fromISO(value, { zone }).startOf('day')
  return day.isValid ? day : null
}

// Dates the occurrence actually occupies in the block timezone. An end that
// lands exactly on local midnight does not occupy that next calendar day.
function occupiedDays(start: DateTime, end: DateTime): OccupiedDays | null {
  if (!start.isValid || !end.isValid || end <= start) return null
  const first = start.startOf('day')
  const endOnMidnight = end.equals(end.startOf('day'))
  const last = (endOnMidnight ? end.minus({ milliseconds: 1 }) : end).startOf('day')
  if (!first.isValid || !last.isValid || last < first) return null
  return { first, last }
}

function dayCovers(day: DateTime, startDate: string | null, endDate: string | null, zone: string): boolean {
  const first = localDay(startDate, zone)
  const last = localDay(endDate, zone)
  if ((startDate && !first) || (endDate && !last)) return false
  if (first && day < first) return false
  if (last && day > last) return false
  return true
}

function formatFits(sessionFormat: string, blockFormat: string, occurrenceFormat: string): occurrenceFormat is 'virtual' | 'in_person' {
  if (occurrenceFormat !== 'virtual' && occurrenceFormat !== 'in_person') return false
  if (sessionFormat === 'virtual' && occurrenceFormat !== 'virtual') return false
  if (sessionFormat === 'in_person' && occurrenceFormat !== 'in_person') return false
  if (sessionFormat !== 'virtual' && sessionFormat !== 'in_person' && sessionFormat !== 'both') {
    return false
  }
  return blockHostsSessionFormat(blockFormat, occurrenceFormat)
}

export function validateGroupOccurrence(
  input: GroupOccurrenceInput
): { row: GroupOccurrenceWrite } | { error: string } {
  if (input.isNew && input.tier !== 'alchemist') {
    return { error: 'An Alchemist Guide can schedule a group session.' }
  }

  const typeMax = input.sessionType.maxCapacity
  const typeIsGroup = typeMax !== null && Number.isInteger(typeMax) && typeMax >= 2
  if (input.isNew && !typeIsGroup) {
    return { error: 'Choose a group session type.' }
  }
  if (!Number.isInteger(input.capacity) || input.capacity < 2) {
    return { error: 'Set a capacity of 2 or more.' }
  }
  if (typeIsGroup && input.capacity > (typeMax as number)) {
    return { error: 'Capacity is above this session type maximum.' }
  }

  if (!formatFits(input.sessionType.format, input.block.format, input.format)) {
    return { error: 'Choose virtual or in\u2011person, matching the session type and the block.' }
  }

  const zone = input.block.timezone
  const start = DateTime.fromISO(input.startDatetime, { setZone: true }).setZone(zone)
  const end = DateTime.fromISO(input.endDatetime, { setZone: true }).setZone(zone)
  const span = occupiedDays(start, end)
  if (!start.isValid || !zone || !DateTime.now().setZone(zone).isValid || !span) {
    return { error: 'Set an end after the start.' }
  }

  const multiDay = span.last > span.first
  const weekdays = parseRecurrenceRule(input.block.recurrenceRule)
  if (weekdays === 'invalid') {
    return { error: 'That block has a weekly rule this session cannot use.' }
  }

  if (multiDay) {
    if (!input.block.startDate || !input.block.endDate || weekdays) {
      return {
        error: 'A session that runs past midnight needs a block with a start date, an end date, and no weekly days.',
      }
    }
    if (!dayCovers(span.first, input.block.startDate, input.block.endDate, zone) || !dayCovers(span.last, input.block.startDate, input.block.endDate, zone)) {
      return { error: 'Those dates sit outside the block.' }
    }
  } else {
    if (!dayCovers(span.first, input.block.startDate, input.block.endDate, zone)) {
      return { error: 'That date is outside the block.' }
    }
    if (weekdays && !weekdays.has(span.first.weekday)) {
      return { error: 'That date is not one of the block weekly days.' }
    }
    const isoDate = span.first.toISODate()
    const dayStart = DateTime.fromISO(`${isoDate}T${input.block.startTime}`, { zone })
    const dayEnd = DateTime.fromISO(`${isoDate}T${input.block.endTime}`, { zone })
    if (!dayStart.isValid || !dayEnd.isValid || dayEnd <= dayStart) {
      return { error: 'That block has no usable hours on this date.' }
    }
    if (start < dayStart || end > dayEnd) {
      return { error: 'That time sits outside the block hours.' }
    }
  }

  const startUtc = start.toUTC().toISO()
  const endUtc = end.toUTC().toISO()
  if (!startUtc || !endUtc) return { error: 'Set an end after the start.' }

  return {
    row: {
      format: input.format,
      startDatetime: startUtc,
      endDatetime: endUtc,
      capacity: input.capacity,
    },
  }
}
