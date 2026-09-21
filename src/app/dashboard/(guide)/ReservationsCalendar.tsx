'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DateTime } from 'luxon'

// Month calendar of the practitioner's own bookings (D29), distinct from
// AvailabilityCalendar.tsx which renders availability *blocks*. Confirmed
// bookings (status confirmed/completed) get the citron marker, held ones
// (pending_payment/pending_approval -- the schema's own "hold" states) get
// the gray marker, matching the mockup's CONFIRMED/HELD legend. Cancelled
// bookings are excluded. `compact` renders the smaller right-rail version
// used on the account page; the full calendar section on /dashboard/bookings
// (D30 pass 1: consolidated from the old /dashboard/calendar) renders it at
// full size with the legend spelled out.

export type CalendarBookingMarker = {
  isoDate: string
  kind: 'confirmed' | 'held'
}

const WEEKDAY_TOKENS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const

export default function ReservationsCalendar({
  markers,
  compact = false,
}: {
  markers: CalendarBookingMarker[]
  compact?: boolean
}) {
  const [month, setMonth] = useState<DateTime>(() => DateTime.now().startOf('month'))

  const todayIso = DateTime.now().toISODate()
  const daysInMonth = month.daysInMonth ?? 30
  const leadingBlanks = month.weekday - 1

  const markersByDate = new Map<string, CalendarBookingMarker['kind'][]>()
  for (const m of markers) {
    const list = markersByDate.get(m.isoDate) ?? []
    list.push(m.kind)
    markersByDate.set(m.isoDate, list)
  }

  const cells: (DateTime | null)[] = []
  for (let i = 0; i < leadingBlanks; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(month.set({ day: d }))
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
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

      <div className="grid grid-cols-7 border-t border-l border-border">
        {WEEKDAY_TOKENS.map((d) => (
          <div key={d} className="border-r border-b border-border py-1 text-center">
            <span className="caption text-dark opacity-70">{compact ? d.slice(0, 1) : d}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-l border-border">
        {cells.map((cell, i) => {
          if (!cell) {
            return (
              <div
                key={`blank-${i}`}
                className={`${compact ? 'min-h-[2.25rem]' : 'min-h-[4rem]'} border-r border-b border-border bg-bg`}
              />
            )
          }
          const isoDate = cell.toISODate() as string
          const kinds = markersByDate.get(isoDate) ?? []
          const isToday = isoDate === todayIso

          return (
            <div
              key={isoDate}
              className={`${compact ? 'min-h-[2.25rem]' : 'min-h-[4rem]'} flex flex-col items-center border-r border-b border-border py-1`}
            >
              <span className={`caption ${isToday ? 'text-olive' : 'text-dark opacity-70'}`}>
                {cell.day}
              </span>
              {kinds.length > 0 && (
                <div className="mt-1 flex gap-0.5">
                  {kinds.slice(0, 3).map((kind, idx) => (
                    <span
                      key={idx}
                      className={`inline-block h-1.5 w-1.5 ${
                        kind === 'confirmed' ? 'bg-citron' : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-6">
        <span className="caption flex items-center gap-2 text-dark opacity-70">
          <span className="inline-block h-1.5 w-1.5 bg-citron" /> CONFIRMED
        </span>
        <span className="caption flex items-center gap-2 text-dark opacity-70">
          <span className="inline-block h-1.5 w-1.5 bg-border" /> HELD
        </span>
      </div>

      {compact && (
        <Link href="/dashboard/bookings" className="caption mt-4 block text-olive">
          OPEN FULL CALENDAR
        </Link>
      )}
    </div>
  )
}
