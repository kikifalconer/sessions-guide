'use client'

import { useMemo, useState, useTransition } from 'react'
import type { ModalityOption } from '../JoinFlow'
import { saveModalities } from '../actions'

const MAX_TOTAL = 3

export default function StepModalities({
  modalities,
  initialPrimaryId,
  initialSecondaryIds,
  onNext,
  onBack,
}: {
  modalities: ModalityOption[]
  initialPrimaryId: string | null
  initialSecondaryIds: string[]
  onNext: () => void
  onBack: () => void
}) {
  const [primaryId, setPrimaryId] = useState<string | null>(initialPrimaryId)
  const [secondaryIds, setSecondaryIds] = useState<string[]>(initialSecondaryIds)
  const [search, setSearch] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const byId = useMemo(
    () => new Map(modalities.map((m) => [m.id, m])),
    [modalities]
  )

  const selectedIds = useMemo(() => {
    const ids = new Set(secondaryIds)
    if (primaryId) ids.add(primaryId)
    return ids
  }, [primaryId, secondaryIds])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return modalities.filter(
      (m) =>
        !selectedIds.has(m.id) &&
        (q === '' ||
          m.name.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q))
    )
  }, [modalities, search, selectedIds])

  const primary = primaryId ? byId.get(primaryId) : undefined
  const atCapacity = selectedIds.size >= MAX_TOTAL

  const select = (id: string) => {
    setError(null)
    if (!primaryId) {
      setPrimaryId(id)
    } else if (secondaryIds.length < 2) {
      setSecondaryIds((ids) => [...ids, id])
    }
    setSearch('')
    setListOpen(false)
  }

  const removePrimary = () => {
    setPrimaryId(null)
  }

  const removeSecondary = (id: string) => {
    setSecondaryIds((ids) => ids.filter((x) => x !== id))
  }

  const submit = () => {
    if (!primaryId) {
      setError('Choose a primary modality.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await saveModalities(primaryId, secondaryIds)
      if (result.ok) {
        onNext()
      } else {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
      }
    })
  }

  return (
    <section>
      <h2 className="mb-2">Your modalities</h2>
      <p className="mb-8">
        Choose one primary modality. You can add up to two more.
      </p>

      <label htmlFor="modality_search" className="label mb-2 block text-dark">
        {primaryId ? 'ADD A MODALITY' : 'PRIMARY MODALITY'}
      </label>
      <div className="relative mb-6">
        <input
          id="modality_search"
          type="text"
          value={search}
          disabled={atCapacity}
          onChange={(e) => {
            setSearch(e.target.value)
            setListOpen(true)
          }}
          onFocus={() => setListOpen(true)}
          placeholder={atCapacity ? 'Three modalities selected' : 'Search modalities'}
          className="w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive disabled:opacity-60"
        />
        {listOpen && !atCapacity && (
          <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto border border-border bg-light">
            {filtered.length === 0 && (
              <li className="px-4 py-3">
                <p>No matches. Try a different search.</p>
              </li>
            )}
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => select(m.id)}
                  className="flex w-full items-baseline justify-between px-4 py-3 text-left hover:bg-surface"
                >
                  <span className="font-heading font-light text-dark">
                    {m.name}
                  </span>
                  <span className="caption text-dark opacity-60">
                    {m.category}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {primary && (
        <div className="mb-6">
          <p className="label mb-2 text-dark">PRIMARY</p>
          <div className="flex items-center justify-between border border-olive bg-surface px-4 py-3">
            <span className="font-heading font-light text-dark">
              {primary.name}
            </span>
            <button
              type="button"
              onClick={removePrimary}
              className="caption text-olive"
            >
              REMOVE
            </button>
          </div>
          <p className="caption mt-2 text-dark opacity-70">
            CATEGORY: {primary.category}
          </p>
        </div>
      )}

      {secondaryIds.length > 0 && (
        <div className="mb-6">
          <p className="label mb-2 text-dark">SECONDARY</p>
          <div className="flex flex-col gap-2">
            {secondaryIds.map((id) => {
              const m = byId.get(id)
              if (!m) return null
              return (
                <div
                  key={id}
                  className="flex items-center justify-between border border-border bg-surface px-4 py-3"
                >
                  <span className="font-heading font-light text-dark">
                    {m.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSecondary(id)}
                    className="caption text-olive"
                  >
                    REMOVE
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {error && <p className="caption mb-6 text-olive">{error}</p>}

      <div className="flex items-center gap-4">
        <button type="button" className="btn-secondary" onClick={onBack}>
          BACK
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={submit}
          disabled={pending}
        >
          {pending ? 'SAVING' : 'CONTINUE'}
        </button>
      </div>
    </section>
  )
}
