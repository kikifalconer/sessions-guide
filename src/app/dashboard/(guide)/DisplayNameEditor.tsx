'use client'

import { useState, useTransition } from 'react'
import { saveNameTagline } from '@/app/join/actions'

// Display Name field for the dashboard's YOUR PROFILE card, reusing
// onboarding's saveNameTagline() action. Tagline isn't a mockup field here,
// so it's carried through unchanged rather than exposed as a second input.
export default function DisplayNameEditor({
  initialFullName,
  initialTagline,
}: {
  initialFullName: string
  initialTagline: string | null
}) {
  const [name, setName] = useState(initialFullName)
  const [saved, setSaved] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const save = () => {
    setError(null)
    startTransition(async () => {
      const result = await saveNameTagline(name, initialTagline ?? '')
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
        return
      }
      setSaved(true)
    })
  }

  return (
    <div>
      <label htmlFor="display_name" className="label mb-2 block text-dark">
        DISPLAY NAME
      </label>
      <div className="flex items-center gap-3">
        <input
          id="display_name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSaved(false)
          }}
          className="w-full max-w-[360px] border border-border bg-surface px-4 py-3 font-body font-light text-dark outline-none focus:border-olive"
        />
        <button
          type="button"
          className="btn-secondary shrink-0"
          disabled={pending || saved || !name.trim()}
          onClick={save}
        >
          {pending ? 'SAVING' : 'SAVE'}
        </button>
      </div>
      {error && <p className="caption mt-2 text-olive">{error}</p>}
    </div>
  )
}
