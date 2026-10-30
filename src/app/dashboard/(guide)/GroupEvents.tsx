'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DateTime } from 'luxon'
import {
  cancelGroupEvent,
  createGroupEvent,
  retryGroupSeat,
  updateGroupEvent,
} from './occurrenceActions'
import type { GuideBlock, GuideEvent, TimeConflict } from './groupEventTypes'

const FIELD =
  'w-full bg-light px-4 py-3 font-body font-light text-dark outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive'

const IN_PERSON = 'In\u2011person'

const FORMAT_LABEL: Record<string, string> = {
  virtual: 'Virtual',
  in_person: IN_PERSON,
  both: `Virtual or ${IN_PERSON.toLowerCase()}`,
}

function formatChoices(sessionFormat: string, blockFormat: string): Array<'virtual' | 'in_person'> {
  const fromSession: Array<'virtual' | 'in_person'> =
    sessionFormat === 'both'
      ? ['virtual', 'in_person']
      : sessionFormat === 'virtual' || sessionFormat === 'in_person'
        ? [sessionFormat]
        : []
  const fromBlock: Array<'virtual' | 'in_person'> =
    blockFormat === 'both'
      ? ['virtual', 'in_person']
      : blockFormat === 'virtual' || blockFormat === 'in_person'
        ? [blockFormat]
        : []
  return fromSession.filter((format) => fromBlock.includes(format))
}

function blockLabel(block: GuideBlock): string {
  const days = block.recurrenceRule?.startsWith('WEEKLY:')
    ? block.recurrenceRule.slice('WEEKLY:'.length).replaceAll(',', ', ')
    : 'Any day'
  const dates = [block.startDate, block.endDate].filter(Boolean).join(' – ')
  return [FORMAT_LABEL[block.format] ?? block.format, days, dates || block.timezone, block.locationDisplay]
    .filter(Boolean)
    .join('  ·  ')
}

function eventRange(event: GuideEvent): string {
  const zone = event.timezone || 'UTC'
  const start = DateTime.fromISO(event.startDatetime, { setZone: true }).setZone(zone)
  const end = DateTime.fromISO(event.endDatetime, { setZone: true }).setZone(zone)
  if (!start.isValid || !end.isValid) return event.startDatetime
  if (start.toISODate() === end.toISODate()) {
    return `${start.toFormat('ccc, LLL d, yyyy, h:mm a')} – ${end.toFormat('h:mm a')}`
  }
  return `${start.toFormat('ccc, LLL d, yyyy, h:mm a')} – ${end.toFormat('ccc, LLL d, h:mm a')}`
}

function localValue(iso: string, zone: string): string {
  const dt = DateTime.fromISO(iso, { setZone: true }).setZone(zone)
  return dt.isValid ? dt.toFormat("yyyy-MM-dd'T'HH:mm") : ''
}

export default function GroupEvents({
  sessionTypeId,
  sessionFormat,
  maxCapacity,
  tier,
  blocks,
  events,
}: {
  sessionTypeId: string
  sessionFormat: string
  maxCapacity: number
  tier: string
  blocks: GuideBlock[]
  events: GuideEvent[]
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'cancel'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<TimeConflict[]>([])
  const [pending, startTransition] = useTransition()
  const canCreate = tier === 'alchemist'
  const activeBlocks = blocks.filter((block) => block.isActive)
  const now = DateTime.utc()
  const upcoming: GuideEvent[] = []
  const past: GuideEvent[] = []
  for (const event of events) {
    const end = DateTime.fromISO(event.endDatetime, { setZone: true })
    const stillAhead = event.status !== 'cancelled' && end.isValid && end >= now
    if (stillAhead) upcoming.push(event)
    else past.push(event)
  }
  upcoming.sort((a, b) => a.startDatetime.localeCompare(b.startDatetime))
  past.sort((a, b) => b.startDatetime.localeCompare(a.startDatetime))

  const refresh = () => {
    setMode('list')
    setEditingId(null)
    setError(null)
    setConflicts([])
    router.refresh()
  }

  const onCreate = () => {
    setError(null)
    setConflicts([])
    setEditingId(null)
    setMode('create')
  }

  const row = (event: GuideEvent) => (
    <article key={event.id} className="flex flex-col gap-3 border-t border-olive/20 py-4">
      <div className="min-w-0">
        <p className="text-dark">{eventRange(event)}</p>
        <p className="caption mt-1 text-dark opacity-70">
          {FORMAT_LABEL[event.format] ?? event.format}
          {'  ·  '}
          {event.timezone}
        </p>
        <p className="caption mt-1 text-dark">
          {event.seatsTaken} of {event.capacity} seats taken
        </p>
        {event.status === 'cancelling' && (
          <p className="caption mt-1 text-olive">Cancelling</p>
        )}
        {event.status === 'cancelled' && (
          <p className="caption mt-1 text-dark opacity-70">Cancelled</p>
        )}
      </div>
      {event.status === 'scheduled' && (
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            className="caption text-olive"
            disabled={pending}
            onClick={() => {
              setError(null)
              setConflicts([])
              setEditingId(event.id)
              setMode('edit')
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="caption text-olive"
            disabled={pending}
            onClick={() => {
              setError(null)
              setConflicts([])
              setEditingId(event.id)
              setMode('cancel')
            }}
          >
            Cancel event
          </button>
        </div>
      )}
      {event.status === 'cancelling' && event.openSeats.length > 0 && (
        <ul className="flex flex-col gap-3">
          {event.openSeats.map((seat) => (
            <li key={seat.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-dark">The refund for {seat.clientName} did not go through.</p>
              <button
                type="button"
                className="btn-secondary w-full sm:w-auto"
                disabled={pending}
                onClick={() => {
                  setError(null)
                  startTransition(async () => {
                    const result = await retryGroupSeat(event.id, seat.id)
                    if (!result.ok) {
                      setError(result.error)
                      return
                    }
                    if (result.failed.length > 0) {
                      setError(result.failed[0]?.error ?? 'The refund did not go through.')
                    }
                    router.refresh()
                  })
                }}
              >
                Retry refund
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  )

  return (
    <section className="mt-2 w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-display font-normal normal-case tracking-normal text-olive">Events</h3>
        {canCreate && mode === 'list' && (
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onCreate}>
            Add event
          </button>
        )}
      </div>

      {error && <p className="caption mt-4 text-olive">{error}</p>}
      {conflicts.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {conflicts.map((conflict) => (
            <li key={`${conflict.source}-${conflict.label}`} className="text-dark">
              {conflict.source}
              {' · '}
              {conflict.label}
            </li>
          ))}
        </ul>
      )}

      {mode === 'create' && (
        <EventForm
          sessionTypeId={sessionTypeId}
          sessionFormat={sessionFormat}
          maxCapacity={maxCapacity}
          blocks={activeBlocks}
          event={null}
          seatsTaken={0}
          pending={pending}
          onCancel={() => {
            setMode('list')
            setError(null)
            setConflicts([])
          }}
          onSubmit={(input) => {
            setError(null)
            setConflicts([])
            startTransition(async () => {
              const result = await createGroupEvent(input)
              if (!result.ok) {
                setError(result.error)
                setConflicts(result.conflicts ?? [])
                return
              }
              refresh()
            })
          }}
        />
      )}

      {mode === 'edit' && editingId && (
        <EventForm
          sessionTypeId={sessionTypeId}
          sessionFormat={sessionFormat}
          maxCapacity={maxCapacity}
          blocks={blocks.filter(
            (block) =>
              block.isActive ||
              block.id === events.find((event) => event.id === editingId)?.blockId
          )}
          event={events.find((event) => event.id === editingId) ?? null}
          seatsTaken={events.find((event) => event.id === editingId)?.seatsTaken ?? 0}
          pending={pending}
          onCancel={() => {
            setMode('list')
            setEditingId(null)
            setError(null)
            setConflicts([])
          }}
          onSubmit={(input) => {
            setError(null)
            setConflicts([])
            startTransition(async () => {
              const result = await updateGroupEvent(editingId, input)
              if (!result.ok) {
                setError(result.error)
                setConflicts(result.conflicts ?? [])
                return
              }
              refresh()
            })
          }}
        />
      )}

      {mode === 'cancel' && editingId && (
        <div className="mt-4 flex flex-col gap-4 bg-light px-4 py-4">
          <p className="text-dark">
            Cancel this event and refund each client. A refund that fails stays listed so you can retry it.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              disabled={pending}
              onClick={() => {
                setMode('list')
                setEditingId(null)
              }}
            >
              Keep event
            </button>
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              disabled={pending}
              onClick={() => {
                setError(null)
                startTransition(async () => {
                  const result = await cancelGroupEvent(editingId)
                  if (!result.ok) {
                    setError(result.error)
                    return
                  }
                  setMode('list')
                  setEditingId(null)
                  setError(
                    result.failed.length > 0
                      ? 'Some refunds did not go through. Retry them below.'
                      : null
                  )
                  router.refresh()
                })
              }}
            >
              {pending ? 'Cancelling' : 'Cancel event'}
            </button>
          </div>
        </div>
      )}

      {mode === 'list' && events.length === 0 && (
        <p className="mt-4 text-dark">No events yet.</p>
      )}
      {mode === 'list' && upcoming.length > 0 && (
        <div className="mt-4">
          <p className="label text-dark">Upcoming</p>
          {upcoming.map(row)}
        </div>
      )}
      {mode === 'list' && past.length > 0 && (
        <div className="mt-4">
          <p className="label text-dark">Past</p>
          {past.map(row)}
        </div>
      )}
    </section>
  )
}

function EventForm({
  sessionTypeId,
  sessionFormat,
  maxCapacity,
  blocks,
  event,
  seatsTaken,
  pending,
  onCancel,
  onSubmit,
}: {
  sessionTypeId: string
  sessionFormat: string
  maxCapacity: number
  blocks: GuideBlock[]
  event: GuideEvent | null
  seatsTaken: number
  pending: boolean
  onCancel: () => void
  onSubmit: (input: {
    sessionTypeId: string
    blockId: string
    format: string
    startLocal: string
    endLocal: string
    capacity: number
  }) => void
}) {
  const locked = seatsTaken > 0
  const initialBlock = blocks.find((block) => block.id === event?.blockId) ?? blocks[0]
  const [blockId, setBlockId] = useState(initialBlock?.id ?? '')
  const block = blocks.find((item) => item.id === blockId) ?? null
  const choices = block ? formatChoices(sessionFormat, block.format) : []
  const [format, setFormat] = useState(event?.format ?? choices[0] ?? 'virtual')
  const zone = block?.timezone ?? event?.timezone ?? 'UTC'
  const [startLocal, setStartLocal] = useState(event ? localValue(event.startDatetime, zone) : '')
  const [endLocal, setEndLocal] = useState(event ? localValue(event.endDatetime, zone) : '')
  const [seats, setSeats] = useState(String(event?.capacity ?? maxCapacity))
  const [localError, setLocalError] = useState<string | null>(null)

  const onBlock = (id: string) => {
    setBlockId(id)
    const next = blocks.find((item) => item.id === id)
    const nextChoices = next ? formatChoices(sessionFormat, next.format) : []
    if (!nextChoices.includes(format as 'virtual' | 'in_person')) {
      setFormat(nextChoices[0] ?? 'virtual')
    }
  }

  const submit = () => {
    setLocalError(null)
    const capacity = Number.parseInt(seats, 10)
    if (!Number.isInteger(capacity) || capacity < Math.max(2, seatsTaken) || capacity > maxCapacity) {
      setLocalError(
        seatsTaken > 0
          ? 'Seats stay at or above the clients already booked, and at or below the session maximum.'
          : 'Set a seat count of 2 or more, up to the session maximum.'
      )
      return
    }
    if (!locked && (!blockId || !startLocal || !endLocal || !format)) {
      setLocalError('Choose a block, a format, a start, and an end.')
      return
    }
    onSubmit({
      sessionTypeId,
      blockId: locked && event ? event.blockId : blockId,
      format: locked && event ? event.format : format,
      startLocal: locked && event ? localValue(event.startDatetime, event.timezone) : startLocal,
      endLocal: locked && event ? localValue(event.endDatetime, event.timezone) : endLocal,
      capacity,
    })
  }

  if (!event && blocks.length === 0) {
    return (
      <p className="mt-4 text-dark">Add an availability block before you schedule an event.</p>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-6">
      {locked && (
        <p className="text-dark">
          Clients are booked. You can change the seat count, down to the clients already booked and up to the session maximum. To change the date, time, block, or format, cancel this event and create it again.
        </p>
      )}
      <div>
        <label htmlFor={`ev_block_${event?.id ?? 'new'}`} className="label mb-2 block text-dark">
          Availability block
        </label>
        <select
          id={`ev_block_${event?.id ?? 'new'}`}
          value={blockId}
          onChange={(e) => onBlock(e.target.value)}
          className={FIELD}
          disabled={locked || pending}
        >
          {blocks.map((item) => (
            <option key={item.id} value={item.id}>
              {blockLabel(item)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`ev_format_${event?.id ?? 'new'}`} className="label mb-2 block text-dark">
          Format
        </label>
        <select
          id={`ev_format_${event?.id ?? 'new'}`}
          value={choices.includes(format as 'virtual' | 'in_person') ? format : choices[0]}
          onChange={(e) => setFormat(e.target.value as 'virtual' | 'in_person')}
          className={FIELD}
          disabled={locked || pending || choices.length === 0}
        >
          {choices.map((choice) => (
            <option key={choice} value={choice}>
              {FORMAT_LABEL[choice]}
            </option>
          ))}
        </select>
        {choices.length === 0 && (
          <p className="caption mt-2 text-olive">This block does not fit this session.</p>
        )}
      </div>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex-1">
          <label htmlFor={`ev_start_${event?.id ?? 'new'}`} className="label mb-2 block text-dark">
            Start
          </label>
          <input
            id={`ev_start_${event?.id ?? 'new'}`}
            type="datetime-local"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
            className={FIELD}
            disabled={locked || pending}
          />
        </div>
        <div className="flex-1">
          <label htmlFor={`ev_end_${event?.id ?? 'new'}`} className="label mb-2 block text-dark">
            End
          </label>
          <input
            id={`ev_end_${event?.id ?? 'new'}`}
            type="datetime-local"
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
            className={FIELD}
            disabled={locked || pending}
          />
        </div>
      </div>
      <p className="caption text-dark opacity-70">Times use {zone}.</p>
      <div>
        <label htmlFor={`ev_seats_${event?.id ?? 'new'}`} className="label mb-2 block text-dark">
          Seats
        </label>
        <input
          id={`ev_seats_${event?.id ?? 'new'}`}
          type="number"
          min={Math.max(2, seatsTaken)}
          max={maxCapacity}
          step={1}
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
          className={FIELD}
          disabled={pending}
        />
      </div>
      {localError && <p className="caption text-olive">{localError}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onCancel} disabled={pending}>
          Back
        </button>
        <button type="button" className="btn-primary w-full sm:w-auto" onClick={submit} disabled={pending}>
          {pending ? 'Saving' : event ? 'Save event' : 'Create event'}
        </button>
      </div>
    </div>
  )
}
