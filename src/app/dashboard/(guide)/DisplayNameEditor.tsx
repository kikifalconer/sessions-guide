'use client'

import { useState, useTransition } from 'react'
import { saveNameTagline } from '@/app/join/actions'

export default function DisplayNameEditor({
  initialFullName,
  initialTagline,
  fields = 'both',
}: {
  initialFullName: string
  initialTagline: string | null
  fields?: 'name' | 'tagline' | 'both'
}) {
  const [name, setName] = useState(initialFullName)
  const [tagline, setTagline] = useState(initialTagline ?? '')
  const [saved, setSaved] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const save = () => {
    setError(null)
    startTransition(async () => {
      const result = await saveNameTagline(name, tagline)
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
        return
      }
      setSaved(true)
    })
  }

  const fieldClass =
    'w-full max-w-[360px] bg-light px-4 py-3 font-body font-light text-dark outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive'

  const showName = fields === 'name' || fields === 'both'
  const showTagline = fields === 'tagline' || fields === 'both'

  return (
    <div className="flex flex-col gap-8">
      {showName && (
        <div>
          <label htmlFor="display_name" className="label mb-2 block text-dark">
            Display name
          </label>
          <input
            id="display_name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setSaved(false)
            }}
            className={fieldClass}
          />
        </div>
      )}
      {showTagline && (
        <div>
          <label htmlFor="tagline" className="label mb-2 block text-dark">
            Tagline
          </label>
          <input
            id="tagline"
            type="text"
            value={tagline}
            onChange={(e) => {
              setTagline(e.target.value)
              setSaved(false)
            }}
            className={fieldClass}
          />
        </div>
      )}
      <div>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending || saved || !name.trim()}
          onClick={save}
        >
          {pending ? 'Saving' : 'Save'}
        </button>
        {error && <p className="caption mt-2 text-olive">{error}</p>}
      </div>
    </div>
  )
}
