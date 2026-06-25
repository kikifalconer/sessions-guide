import { DateTime, Interval } from 'luxon'

// Slot generation against availability blocks. All math runs in the block's
// IANA timezone via luxon; slots are returned as UTC ISO instants. The custom
// recurrence format is `WEEKLY:MON,WED` (not RFC 5545). Unknown rule formats
// fail closed: the block produces no slots rather than slots we cannot honor.

export type AvailabilityBlockRow = {
  id: string
  format: 'virtual' | 'in_person' | 'both'
  location_display: string | null
  location_place_id: string | null
  recurrence_rule: string | null
  start_date: string | null // 'YYYY-MM-DD'
  end_date: string | null
  start_time: string // 'HH:MM:SS'
  end_time: string
  timezone: string // IANA
}

export type BookedWindow = {
  start_datetime: string // ISO
  end_datetime: string
}

export type Slot = {
  startUtc: string
  endUtc: string
  blockId: string
  blockFormat: 'virtual' | 'in_person' | 'both'
  timezone: string
}

// luxon weekday numbers: Monday = 1 ... Sunday = 7
const WEEKDAYS: Record<string, number> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 7,
}

// Returns the set of luxon weekday numbers, null when the block has no rule
// (every day in its window), or 'invalid' for an unrecognized rule format.
export function parseRecurrenceRule(
  rule: string | null
): Set<number> | null | 'invalid' {
  if (!rule) return null
  const match = rule.match(/^WEEKLY:([A-Z]{3}(?:,[A-Z]{3})*)$/)
  if (!match) return 'invalid'
  const days = new Set<number>()
  for (const token of match[1].split(',')) {
    const weekday = WEEKDAYS[token]
    if (!weekday) return 'invalid'
    days.add(weekday)
  }
  return days
}

// A session type's format constrains which blocks can host it.
export function blockHostsSessionFormat(
  blockFormat: string,
  sessionFormat: string
): boolean {
  if (sessionFormat === 'virtual') return blockFormat === 'virtual' || blockFormat === 'both'
  if (sessionFormat === 'in_person') return blockFormat === 'in_person' || blockFormat === 'both'
  return true // session 'both' fits any block; the block constrains the choice
}

export function generateSlots(
  blocks: AvailabilityBlockRow[],
  bookedWindows: BookedWindow[],
  durationMinutes: number,
  options: { now: DateTime; horizonDays: number; leadMinutes?: number }
): Slot[] {
  const { now, horizonDays, leadMinutes = 60 } = options
  const earliestStart = now.plus({ minutes: leadMinutes })
  const horizonEnd = now.plus({ days: horizonDays })

  const booked = bookedWindows.map((w) =>
    Interval.fromDateTimes(
      DateTime.fromISO(w.start_datetime),
      DateTime.fromISO(w.end_datetime)
    )
  )

  const slots: Slot[] = []
  const seenStarts = new Set<string>()

  for (const block of blocks) {
    const weekdays = parseRecurrenceRule(block.recurrence_rule)
    if (weekdays === 'invalid') continue // fail closed

    const zone = block.timezone
    let cursor = (
      block.start_date
        ? DateTime.fromISO(block.start_date, { zone })
        : now.setZone(zone)
    ).startOf('day')
    const lastDay = (
      block.end_date
        ? DateTime.fromISO(block.end_date, { zone })
        : horizonEnd.setZone(zone)
    ).startOf('day')
    if (!cursor.isValid || !lastDay.isValid) continue

    for (; cursor <= lastDay; cursor = cursor.plus({ days: 1 })) {
      if (cursor > horizonEnd.setZone(zone)) break
      if (weekdays && !weekdays.has(cursor.weekday)) continue

      const dayStart = DateTime.fromISO(`${cursor.toISODate()}T${block.start_time}`, { zone })
      const dayEnd = DateTime.fromISO(`${cursor.toISODate()}T${block.end_time}`, { zone })
      if (!dayStart.isValid || !dayEnd.isValid || dayEnd <= dayStart) continue

      // Back-to-back slots of the session's duration within the window.
      for (
        let slotStart = dayStart;
        slotStart.plus({ minutes: durationMinutes }) <= dayEnd;
        slotStart = slotStart.plus({ minutes: durationMinutes })
      ) {
        const slotEnd = slotStart.plus({ minutes: durationMinutes })
        if (slotStart < earliestStart) continue
        if (slotStart > horizonEnd) continue

        const slotInterval = Interval.fromDateTimes(slotStart, slotEnd)
        if (booked.some((b) => b.overlaps(slotInterval))) continue

        const startUtc = slotStart.toUTC().toISO()
        const endUtc = slotEnd.toUTC().toISO()
        if (!startUtc || !endUtc || seenStarts.has(startUtc)) continue
        seenStarts.add(startUtc)

        slots.push({
          startUtc,
          endUtc,
          blockId: block.id,
          blockFormat: block.format,
          timezone: zone,
        })
      }
    }
  }

  slots.sort((a, b) => a.startUtc.localeCompare(b.startUtc))
  return slots
}
