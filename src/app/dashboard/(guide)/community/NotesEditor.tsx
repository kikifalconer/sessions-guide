'use client'

import { useState, useTransition } from 'react'
import { updateClientNotes } from './actions'

// Private practitioner notes on a client, editable at any time (D29 spec).
export default function NotesEditor({
  clientId,
  initialNotes,
}: {
  clientId: string
  initialNotes: string | null
}) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saved, setSaved] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const save = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateClientNotes(clientId, notes)
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
        return
      }
      setSaved(true)
    })
  }

  return (
    <div>
      <label htmlFor="client_notes" className="label mb-2 block text-dark">
        NOTES
      </label>
      <textarea
        id="client_notes"
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value)
          setSaved(false)
        }}
        rows={6}
        placeholder="Private notes about this client. Only you can see this."
        className="w-full max-w-[560px] bg-light px-4 py-3 font-body font-light text-dark outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
      />
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className="btn-secondary" disabled={pending || saved} onClick={save}>
          {pending ? 'SAVING' : 'SAVE NOTES'}
        </button>
        {error && <p className="caption text-olive">{error}</p>}
      </div>
    </div>
  )
}
