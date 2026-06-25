'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  getPredictions,
  getPlaceDetails,
  resolveTimezone,
  type Prediction,
} from '@/lib/places'
import { createBlock, updateBlock } from './availabilityActions'
import type { BlockInput } from '@/lib/availabilityBlock'

export type AvailabilityBlockRow = {
  id: string
  format: string
  locationPlaceId: string | null
  locationDisplay: string | null
  locationLat: number | null
  locationLng: number | null
  recurrenceRule: string | null
  startDate: string | null
  endDate: string | null
  startTime: string // 'HH:MM:SS'
  endTime: string
  timezone: string
  isActive: boolean
}

const FIELD =
  'w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive'

const FORMAT_LABEL: Record<string, string> = {
  virtual: 'Virtual',
  in_person: 'In person',
  both: 'Virtual or in person',
}

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const

function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// 'HH:MM:SS' -> 'HH:MM' for <input type="time">
function toInputTime(t: string | null): string {
  if (!t) return ''
  return t.slice(0, 5)
}

function parseDays(rule: string | null): Set<string> {
  if (!rule) return new Set()
  const m = rule.match(/^WEEKLY:(.+)$/)
  if (!m) return new Set()
  return new Set(m[1].split(','))
}

export default function AvailabilityBlockForm({
  block,
  onDone,
  onCancel,
}: {
  block: AvailabilityBlockRow | null
  onDone: () => void
  onCancel: () => void
}) {
  const isEdit = Boolean(block)

  const [format, setFormat] = useState(block?.format ?? 'virtual')

  // Location (resolved geocode). Kept together so we never carry a partial set.
  const [placeId, setPlaceId] = useState<string | null>(block?.locationPlaceId ?? null)
  const [display, setDisplay] = useState<string | null>(block?.locationDisplay ?? null)
  const [lat, setLat] = useState<number | null>(block?.locationLat ?? null)
  const [lng, setLng] = useState<number | null>(block?.locationLng ?? null)
  const [search, setSearch] = useState('')
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [resolving, setResolving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Schedule
  const [scheduleType, setScheduleType] = useState<'recurring' | 'dates'>(
    block?.startDate ? 'dates' : 'recurring'
  )
  const [days, setDays] = useState<Set<string>>(parseDays(block?.recurrenceRule ?? null))
  const [startDate, setStartDate] = useState(block?.startDate ?? '')
  const [endDate, setEndDate] = useState(block?.endDate ?? '')

  // Time + timezone
  const [startTime, setStartTime] = useState(toInputTime(block?.startTime ?? null))
  const [endTime, setEndTime] = useState(toInputTime(block?.endTime ?? null))
  const [timezone, setTimezone] = useState(block?.timezone ?? browserZone())
  // null = not attempted; false = derivation failed and we fell back to the
  // browser zone (warn so a travel-block mismatch is catchable, not silent).
  const [tzDerived, setTzDerived] = useState<boolean | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const needsLocation = format === 'in_person' || format === 'both'

  // Debounced autocomplete predictions.
  useEffect(() => {
    if (!needsLocation || !search.trim()) {
      setPredictions([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        setPredictions(await getPredictions(search))
      } catch {
        setPredictions([])
      }
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, needsLocation])

  const clearLocation = () => {
    setPlaceId(null)
    setDisplay(null)
    setLat(null)
    setLng(null)
    setTzDerived(null)
  }

  const selectPlace = async (p: Prediction) => {
    setError(null)
    setPredictions([])
    setSearch('')
    setResolving(true)
    try {
      const resolved = await getPlaceDetails(p.placeId)
      if (!resolved) {
        clearLocation()
        setError('We could not read a city for that location. Pick a more specific place from the suggestions.')
        return
      }
      setPlaceId(resolved.placeId)
      setDisplay(resolved.display)
      setLat(resolved.lat)
      setLng(resolved.lng)
      // Auto-derive the IANA zone from the location (correct for travel blocks).
      // If derivation fails we keep the prior value but flag it, so the fallback
      // is visible rather than a silent mis-schedule.
      const tz = await resolveTimezone(resolved.lat, resolved.lng)
      if (tz) {
        setTimezone(tz)
        setTzDerived(true)
      } else {
        setTzDerived(false)
      }
    } catch {
      clearLocation()
      setError('That location could not be resolved. Try again.')
    } finally {
      setResolving(false)
    }
  }

  const toggleDay = (d: string) => {
    setDays((prev) => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }

  const buildRule = (): string | null => {
    if (!days.size) return null
    // Emit in fixed weekday order so the rule matches the slot generator's grammar.
    const ordered = WEEKDAYS.filter((d) => days.has(d))
    return `WEEKLY:${ordered.join(',')}`
  }

  const submit = () => {
    setError(null)
    const recurrenceRule = buildRule()
    const input: BlockInput = {
      format,
      locationPlaceId: needsLocation ? placeId : null,
      locationDisplay: needsLocation ? display : null,
      locationLat: needsLocation ? lat : null,
      locationLng: needsLocation ? lng : null,
      recurrenceRule: scheduleType === 'dates' ? (days.size ? recurrenceRule : null) : recurrenceRule,
      startDate: scheduleType === 'dates' ? startDate || null : null,
      endDate: scheduleType === 'dates' ? endDate || null : null,
      startTime,
      endTime,
      timezone,
    }
    startTransition(async () => {
      const result = block ? await updateBlock(block.id, input) : await createBlock(input)
      if (result.ok) onDone()
      else setError(result.error ?? 'Something went wrong. Try again or contact support.')
    })
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-[640px]">
      <p className="label mb-8 text-dark">
        {isEdit ? 'EDIT AVAILABILITY BLOCK' : 'NEW AVAILABILITY BLOCK'}
      </p>

      <div className="flex flex-col gap-6">
        {/* 1. Format — drives whether location appears. */}
        <div>
          <label htmlFor="ab_format" className="label mb-2 block text-dark">
            FORMAT
          </label>
          <select
            id="ab_format"
            value={format}
            onChange={(e) => {
              setFormat(e.target.value)
              if (e.target.value === 'virtual') clearLocation()
            }}
            className={FIELD}
          >
            {Object.entries(FORMAT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Location — only for in_person/both. */}
        {needsLocation && (
          <div>
            <p className="label mb-2 text-dark">LOCATION</p>
            {placeId && display ? (
              <div className="flex items-center justify-between border border-olive bg-surface px-4 py-3">
                <span className="font-heading font-light text-dark">{display}</span>
                <button type="button" onClick={clearLocation} className="caption text-olive">
                  CHANGE
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={resolving ? 'Resolving location' : 'Search for a place'}
                  disabled={resolving}
                  className={FIELD}
                />
                {predictions.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto border border-border bg-light">
                    {predictions.map((p) => (
                      <li key={p.placeId}>
                        <button
                          type="button"
                          onClick={() => selectPlace(p)}
                          className="block w-full px-4 py-3 text-left font-heading font-light text-dark hover:bg-surface"
                        >
                          {p.description}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <p className="caption mt-2 text-dark opacity-70">
              Only your city is shown to seekers before booking.
            </p>
          </div>
        )}

        {/* 3. Recurring vs specific dates. */}
        <div>
          <p className="label mb-2 text-dark">SCHEDULE</p>
          <div className="mb-4 flex gap-3">
            <button
              type="button"
              onClick={() => setScheduleType('recurring')}
              className={
                scheduleType === 'recurring' ? 'btn-primary' : 'btn-secondary'
              }
            >
              RECURRING
            </button>
            <button
              type="button"
              onClick={() => setScheduleType('dates')}
              className={scheduleType === 'dates' ? 'btn-primary' : 'btn-secondary'}
            >
              SPECIFIC DATES
            </button>
          </div>

          {scheduleType === 'dates' && (
            <div className="mb-4 flex flex-col gap-6 sm:flex-row">
              <div className="flex-1">
                <label htmlFor="ab_start_date" className="label mb-2 block text-dark">
                  START DATE
                </label>
                <input
                  id="ab_start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={FIELD}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="ab_end_date" className="label mb-2 block text-dark">
                  END DATE
                </label>
                <input
                  id="ab_end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={FIELD}
                />
              </div>
            </div>
          )}

          <p className="caption mb-2 text-dark opacity-70">
            {scheduleType === 'recurring'
              ? 'DAYS OF THE WEEK'
              : 'DAYS (LEAVE EMPTY FOR ANY DAY IN RANGE)'}
          </p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`caption border px-3 py-2 ${
                  days.has(d)
                    ? 'border-olive bg-olive text-light'
                    : 'border-border bg-surface text-dark'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Time window + timezone. */}
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="ab_start_time" className="label mb-2 block text-dark">
              START TIME
            </label>
            <input
              id="ab_start_time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={FIELD}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="ab_end_time" className="label mb-2 block text-dark">
              END TIME
            </label>
            <input
              id="ab_end_time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={FIELD}
            />
          </div>
        </div>

        <div>
          <label htmlFor="ab_timezone" className="label mb-2 block text-dark">
            TIMEZONE
          </label>
          <input
            id="ab_timezone"
            type="text"
            list="ab_tz_list"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={FIELD}
          />
          <TimezoneOptions />
          {needsLocation && tzDerived === false && (
            <p className="caption mt-2 text-olive">
              Could not detect the timezone for this location. Set it to the location&apos;s timezone before saving.
            </p>
          )}
          {needsLocation && tzDerived !== false && (
            <p className="caption mt-2 text-dark opacity-70">
              Set from the location. Edit if it looks wrong.
            </p>
          )}
        </div>

        {error && <p className="caption text-olive">{error}</p>}

        <div className="flex items-center gap-4">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={pending}>
            CANCEL
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={submit}
            disabled={pending || resolving}
          >
            {pending ? 'SAVING' : isEdit ? 'SAVE CHANGES' : 'CREATE BLOCK'}
          </button>
        </div>
      </div>
    </div>
  )
}

// IANA zones for the timezone input's datalist (typeahead + free text; the value
// is validated server-side). Falls back to a small set if the runtime lacks
// Intl.supportedValuesOf.
function TimezoneOptions() {
  let zones: string[] = []
  try {
    const sv = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf
    zones = sv ? sv('timeZone') : []
  } catch {
    zones = []
  }
  if (zones.length === 0) {
    zones = ['UTC', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'Asia/Makassar']
  }
  return (
    <datalist id="ab_tz_list">
      {zones.map((z) => (
        <option key={z} value={z} />
      ))}
    </datalist>
  )
}
