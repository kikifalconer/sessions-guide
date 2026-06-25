'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import AvailabilityBlockForm, {
  type AvailabilityBlockRow,
} from './AvailabilityBlockForm'
import { setBlockActive } from './availabilityActions'

const FORMAT_SUMMARY: Record<string, string> = {
  virtual: 'VIRTUAL',
  in_person: 'IN PERSON',
  both: 'VIRTUAL OR IN PERSON',
}

function scheduleSummary(b: AvailabilityBlockRow): string {
  const parts: string[] = []
  const rule = b.recurrenceRule?.replace(/^WEEKLY:/, '').replace(/,/g, ', ')
  if (rule) parts.push(rule)
  else if (!b.startDate) parts.push('EVERY DAY')
  if (b.startDate) {
    parts.push(b.startDate === b.endDate ? b.startDate : `${b.startDate} – ${b.endDate}`)
  }
  return parts.join('  ·  ')
}

type View = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; id: string }

export default function AvailabilityManager({
  blocks,
}: {
  blocks: AvailabilityBlockRow[]
}) {
  const router = useRouter()
  const [view, setView] = useState<View>({ kind: 'list' })
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const done = () => {
    setView({ kind: 'list' })
    router.refresh()
  }

  const toggleActive = (id: string, isActive: boolean) => {
    setError(null)
    setConfirmId(null)
    startTransition(async () => {
      const result = await setBlockActive(id, isActive)
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
        return
      }
      router.refresh()
    })
  }

  if (view.kind === 'create') {
    return (
      <AvailabilityBlockForm
        block={null}
        onDone={done}
        onCancel={() => setView({ kind: 'list' })}
      />
    )
  }

  if (view.kind === 'edit') {
    const editing = blocks.find((b) => b.id === view.id) ?? null
    return (
      <AvailabilityBlockForm
        block={editing}
        onDone={done}
        onCancel={() => setView({ kind: 'list' })}
      />
    )
  }

  const active = blocks.filter((b) => b.isActive)
  const inactive = blocks.filter((b) => !b.isActive)

  const row = (b: AvailabilityBlockRow) => (
    <article
      key={b.id}
      className={`flex flex-col gap-3 border border-border bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
        b.isActive ? '' : 'opacity-60'
      }`}
    >
      <div className="min-w-0">
        <p className="caption text-dark">{FORMAT_SUMMARY[b.format]}</p>
        {/* Dashboard shows the FULL location_display (city-only is the seeker rule). */}
        {b.locationDisplay && (
          <p className="caption mt-1 text-dark opacity-70">{b.locationDisplay}</p>
        )}
        <p className="caption mt-1 text-dark opacity-70">
          {[
            scheduleSummary(b),
            `${b.startTime.slice(0, 5)}–${b.endTime.slice(0, 5)}`,
            b.timezone,
          ]
            .filter(Boolean)
            .join('  ·  ')}
        </p>
        {!b.isActive && <p className="caption mt-1 text-olive">INACTIVE</p>}
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          className="caption text-olive"
          onClick={() => setView({ kind: 'edit', id: b.id })}
          disabled={pending}
        >
          EDIT
        </button>
        {b.isActive ? (
          confirmId === b.id ? (
            <span className="flex items-center gap-3">
              <span className="caption text-dark">REMOVE</span>
              <button
                type="button"
                className="caption text-olive"
                onClick={() => toggleActive(b.id, false)}
                disabled={pending}
              >
                CONFIRM
              </button>
              <button
                type="button"
                className="caption text-dark"
                onClick={() => setConfirmId(null)}
                disabled={pending}
              >
                CANCEL
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="caption text-olive"
              onClick={() => setConfirmId(b.id)}
              disabled={pending}
            >
              DEACTIVATE
            </button>
          )
        ) : (
          <button
            type="button"
            className="caption text-olive"
            onClick={() => toggleActive(b.id, true)}
            disabled={pending}
          >
            REACTIVATE
          </button>
        )}
      </div>
    </article>
  )

  return (
    <div className="mx-auto mt-10 w-full max-w-[760px]">
      <div className="flex items-center justify-between">
        <p className="label text-dark">YOUR AVAILABILITY</p>
        <button type="button" className="btn-primary" onClick={() => setView({ kind: 'create' })}>
          ADD BLOCK
        </button>
      </div>

      {error && <p className="caption mt-4 text-olive">{error}</p>}

      {blocks.length === 0 ? (
        <p className="mt-12 text-center text-dark">
          No availability yet. Add your first block so seekers can book with you.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {active.map(row)}
          {inactive.length > 0 && (
            <>
              <p className="label mt-6 text-dark opacity-70">INACTIVE</p>
              {inactive.map(row)}
            </>
          )}
        </div>
      )}
    </div>
  )
}
