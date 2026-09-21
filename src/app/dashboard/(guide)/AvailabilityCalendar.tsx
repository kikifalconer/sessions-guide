'use client'

import { useState } from 'react'
import { DateTime } from 'luxon'
import type { AvailabilityBlockRow } from './AvailabilityBlockForm'

// Monthly calendar view of the practitioner's availability. Read-only display
// plus click-through: clicking a rendered block opens its edit form; clicking an
// empty day opens the create form pre-filled with that date (wired by the
// parent). No create/edit/delete happens here.

// luxon weekday: Monday = 1 ... Sunday = 7. Grid is Monday-first.
const WEEKDAY_TOKENS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const

function parseDays(rule: string | null): Set<string> {
  if (!rule) return new Set()
  const m = rule.match(/^WEEKLY:(.+)$/)
  if (!m) return new Set()
  return new Set(m[1].split(','))
}

// Mirrors the slot generator's interpretation: a weekday rule filters days;
// start_date/end_date bound the window; a block with no rule falls on every day
// (within its window if it has one). isoDate is 'YYYY-MM-DD' (lexicographically
// comparable), weekday is luxon 1..7.
function blockOccursOn(
  b: AvailabilityBlockRow,
  isoDate: string,
  weekday: number
): boolean {
  if (b.startDate) {
    if (isoDate < b.startDate) return false
    const end = b.endDate ?? b.startDate
    if (isoDate > end) return false
  }
  const days = parseDays(b.recurrenceRule)
  if (days.size > 0) return days.has(WEEKDAY_TOKENS[weekday - 1])
  return true
}

function timeWindow(b: AvailabilityBlockRow): string {
  return `${b.startTime.slice(0, 5)}–${b.endTime.slice(0, 5)}`
}

// Full location is correct on the practitioner's own dashboard.
function locationSummary(b: AvailabilityBlockRow): string {
  if (b.format === 'virtual') return 'VIRTUAL'
  if (b.format === 'in_person') return b.locationDisplay ?? 'IN PERSON'
  return b.locationDisplay
    ? `VIRTUAL OR IN-PERSON · ${b.locationDisplay}`
    : 'VIRTUAL OR IN-PERSON'
}

export default function AvailabilityCalendar({
  blocks,
  onSelectBlock,
  onSelectDay,
}: {
  blocks: AvailabilityBlockRow[]
  onSelectBlock: (id: string) => void
  onSelectDay: (isoDate: string) => void
}) {
  const [month, setMonth] = useState<DateTime>(() =>
    DateTime.now().startOf('month')
  )

  const todayIso = DateTime.now().toISODate()
  const daysInMonth = month.daysInMonth ?? 30
  const leadingBlanks = month.weekday - 1 // Monday-first offset

  const cells: (DateTime | null)[] = []
  for (let i = 0; i < leadingBlanks; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(month.set({ day: d }))
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      {/* Month controls */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          className="caption text-olive"
          onClick={() => setMonth((m) => m.minus({ months: 1 }))}
        >
          PREV
        </button>
        <p className="label text-dark">{month.toFormat('LLLL yyyy').toUpperCase()}</p>
        <button
          type="button"
          className="caption text-olive"
          onClick={() => setMonth((m) => m.plus({ months: 1 }))}
        >
          NEXT
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-t border-l border-border">
        {WEEKDAY_TOKENS.map((d) => (
          <div key={d} className="border-r border-b border-border px-2 py-2">
            <span className="caption text-dark opacity-70">{d}</span>
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 border-l border-border">
        {cells.map((cell, i) => {
          if (!cell) {
            return (
              <div
                key={`blank-${i}`}
                className="min-h-[7rem] border-r border-b border-border bg-bg"
              />
            )
          }
          const isoDate = cell.toISODate() as string
          const dayBlocks = blocks.filter((b) =>
            blockOccursOn(b, isoDate, cell.weekday)
          )
          const isToday = isoDate === todayIso

          return (
            <div
              key={isoDate}
              onClick={() => onSelectDay(isoDate)}
              className="min-h-[7rem] cursor-pointer border-r border-b border-border px-2 py-2 transition-colors hover:bg-surface"
            >
              <span
                className={`caption ${isToday ? 'text-olive' : 'text-dark opacity-70'}`}
              >
                {cell.day}
              </span>

              <div className="mt-1 flex flex-col gap-1">
                {dayBlocks.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectBlock(b.id)
                    }}
                    className="block w-full border border-border bg-surface px-2 py-1 text-left transition-colors hover:border-olive"
                  >
                    <span className="caption block truncate text-dark">
                      {timeWindow(b)}
                    </span>
                    <span className="caption block truncate text-dark opacity-70">
                      {locationSummary(b)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
