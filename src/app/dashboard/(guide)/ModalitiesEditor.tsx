'use client'

import { useMemo, useState, useTransition } from 'react'
import { saveModalities } from '@/app/join/actions'

export type ModalityOption = { id: string; name: string; slug: string; category: string }

const MAX_TOTAL = 3

// Modalities field for the dashboard's YOUR PROFILE card. Same picker
// interaction and save action as onboarding's StepModalities.tsx -- a
// primary/secondary picker, not a free-text field, since that's what the
// underlying practitioner_modalities data actually is -- adapted for inline
// editing (Save-in-place) rather than wizard back/next.
export default function ModalitiesEditor({
  modalities,
  initialPrimaryId,
  initialSecondaryIds,
}: {
  modalities: ModalityOption[]
  initialPrimaryId: string | null
  initialSecondaryIds: string[]
}) {
  const [primaryId, setPrimaryId] = useState<string | null>(initialPrimaryId)
  const [secondaryIds, setSecondaryIds] = useState<string[]>(initialSecondaryIds)
  const [search, setSearch] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [saved, setSaved] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const byId = useMemo(() => new Map(modalities.map((m) => [m.id, m])), [modalities])

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
        (q === '' || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
    )
  }, [modalities, search, selectedIds])

  const primary = primaryId ? byId.get(primaryId) : undefined
  const atCapacity = selectedIds.size >= MAX_TOTAL

  const select = (id: string) => {
    setError(null)
    setSaved(false)
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
    setSaved(false)
  }

  const removeSecondary = (id: string) => {
    setSecondaryIds((ids) => ids.filter((x) => x !== id))
    setSaved(false)
  }

  const save = () => {
    if (!primaryId) {
      setError('Choose a primary modality.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await saveModalities(primaryId, secondaryIds)
      if (result.ok) {
        setSaved(true)
      } else {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
      }
    })
  }

  return (
    <div>
      <label htmlFor="dash_modality_search" className="label mb-2 block text-dark">
        MODALITIES
      </label>
      <div className="relative mb-4 max-w-[360px]">
        <input
          id="dash_modality_search"
          type="text"
          value={search}
          disabled={atCapacity}
          onChange={(e) => {
            setSearch(e.target.value)
            setListOpen(true)
          }}
          onFocus={() => setListOpen(true)}
          placeholder={atCapacity ? 'Three modalities selected' : 'Search modalities'}
          className="w-full border border-border bg-surface px-4 py-3 font-body font-light text-dark outline-none focus:border-olive disabled:opacity-60"
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
                  <span className="font-body font-light text-dark">{m.name}</span>
                  <span className="caption text-dark opacity-60">{m.category}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {primary && (
          <span className="flex items-center gap-2 border border-olive bg-surface px-3 py-2">
            <span className="caption text-dark">{primary.name}</span>
            <button type="button" onClick={removePrimary} className="caption text-olive">
              REMOVE
            </button>
          </span>
        )}
        {secondaryIds.map((id) => {
          const m = byId.get(id)
          if (!m) return null
          return (
            <span key={id} className="flex items-center gap-2 border border-border bg-surface px-3 py-2">
              <span className="caption text-dark">{m.name}</span>
              <button type="button" onClick={() => removeSecondary(id)} className="caption text-olive">
                REMOVE
              </button>
            </span>
          )
        })}
      </div>

      {error && <p className="caption mb-3 text-olive">{error}</p>}

      <button type="button" className="btn-secondary" disabled={pending || saved} onClick={save}>
        {pending ? 'SAVING' : 'SAVE'}
      </button>
    </div>
  )
}
