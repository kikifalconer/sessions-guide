'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import SessionTypeForm, {
  type ModalityOption,
  type PractitionerDefaults,
  type SessionTypeRow,
} from './SessionTypeForm'
import { setSessionTypeActive } from './sessionTypeActions'
import GroupEvents from './GroupEvents'
import type { GuideBlock, GuideEvent } from './groupEventTypes'

const PRICING_SUMMARY: Record<string, string> = {
  donation: 'DONATION',
  inquire: 'INQUIRE',
}

const FORMAT_SUMMARY: Record<string, string> = {
  virtual: 'VIRTUAL',
  in_person: 'IN PERSON',
  both: 'VIRTUAL OR IN PERSON',
}

function priceSummary(s: SessionTypeRow): string {
  if (s.pricingModel === 'fixed') return s.price != null ? `$${s.price}` : ''
  if (s.pricingModel === 'sliding_scale') {
    return s.priceMin != null && s.priceMax != null ? `$${s.priceMin} – $${s.priceMax}` : ''
  }
  return PRICING_SUMMARY[s.pricingModel] ?? ''
}

type View = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; id: string }

export default function SessionsManager({
  sessionTypes,
  modalities,
  taggedModalityIds,
  defaults,
  modalityNameById,
  tier,
  blocks,
  events,
}: {
  sessionTypes: SessionTypeRow[]
  modalities: ModalityOption[]
  taggedModalityIds: string[]
  defaults: PractitionerDefaults
  modalityNameById: Record<string, string>
  tier: string
  blocks: GuideBlock[]
  events: GuideEvent[]
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
      const result = await setSessionTypeActive(id, isActive)
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
        return
      }
      router.refresh()
    })
  }

  if (view.kind === 'create') {
    return (
      <SessionTypeForm
        sessionType={null}
        modalities={modalities}
        taggedModalityIds={taggedModalityIds}
        defaults={defaults}
        tier={tier}
        onDone={done}
        onCancel={() => setView({ kind: 'list' })}
      />
    )
  }

  if (view.kind === 'edit') {
    const editing = sessionTypes.find((s) => s.id === view.id) ?? null
    return (
      <SessionTypeForm
        sessionType={editing}
        modalities={modalities}
        taggedModalityIds={taggedModalityIds}
        defaults={defaults}
        tier={tier}
        onDone={done}
        onCancel={() => setView({ kind: 'list' })}
      />
    )
  }

  const active = sessionTypes.filter((s) => s.isActive)
  const inactive = sessionTypes.filter((s) => !s.isActive)

  const row = (s: SessionTypeRow) => (
    <article
      key={s.id}
      className={`flex flex-col gap-3 py-4 ${s.isActive ? '' : 'opacity-60'}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-display text-dark">{s.name}</p>
        <p className="caption mt-1 text-dark opacity-70">
          {[
            `${s.durationMinutes} MIN`,
            s.maxCapacity != null && s.maxCapacity >= 2 ? 'GROUP' : '',
            FORMAT_SUMMARY[s.format],
            priceSummary(s).toUpperCase(),
            (modalityNameById[s.modalityId] ?? '').toUpperCase(),
          ]
            .filter(Boolean)
            .join('  ·  ')}
        </p>
        {!s.isActive && (
          <p className="caption mt-1 text-olive">INACTIVE</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          className="caption text-olive"
          onClick={() => setView({ kind: 'edit', id: s.id })}
          disabled={pending}
        >
          EDIT
        </button>
        {s.isActive ? (
          confirmId === s.id ? (
            <span className="flex items-center gap-3">
              <span className="caption text-dark">REMOVE</span>
              <button
                type="button"
                className="caption text-olive"
                onClick={() => toggleActive(s.id, false)}
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
              onClick={() => setConfirmId(s.id)}
              disabled={pending}
            >
              DEACTIVATE
            </button>
          )
        ) : (
          <button
            type="button"
            className="caption text-olive"
            onClick={() => toggleActive(s.id, true)}
            disabled={pending}
          >
            REACTIVATE
          </button>
        )}
      </div>
      </div>
      {s.maxCapacity != null && s.maxCapacity >= 2 && (
        <GroupEvents
          sessionTypeId={s.id}
          sessionFormat={s.format}
          maxCapacity={s.maxCapacity}
          tier={tier}
          blocks={blocks}
          events={events.filter((event) => event.sessionTypeId === s.id)}
        />
      )}
    </article>
  )

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-display font-normal normal-case tracking-normal text-olive">Your offerings</h3>
        <button
          type="button"
          className="btn-primary w-full sm:w-auto"
          onClick={() => setView({ kind: 'create' })}
        >
          Add offering
        </button>
      </div>

      {error && <p className="caption mt-4 text-olive">{error}</p>}

      {sessionTypes.length === 0 ? (
        <p className="mt-12 text-dark">
          No offerings yet. Add your first to start building your catalog.
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
