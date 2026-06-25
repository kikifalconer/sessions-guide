'use client'

import { useState, useTransition } from 'react'
import { saveNameTagline } from '../actions'

export default function StepName({
  initialFullName,
  initialTagline,
  onNext,
  onBack,
}: {
  initialFullName: string
  initialTagline: string
  onNext: () => void
  onBack: () => void
}) {
  const [fullName, setFullName] = useState(initialFullName)
  const [tagline, setTagline] = useState(initialTagline)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await saveNameTagline(fullName, tagline)
      if (result.ok) {
        onNext()
      } else {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
      }
    })
  }

  return (
    <section>
      <h2 className="mb-8">Your name</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex flex-col gap-6"
      >
        <div>
          <label htmlFor="full_name" className="label mb-2 block text-dark">
            FULL NAME
          </label>
          <input
            id="full_name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive"
          />
        </div>

        <div>
          <label htmlFor="tagline" className="label mb-2 block text-dark">
            TAGLINE
          </label>
          <input
            id="tagline"
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="One line seekers will see under your name"
            className="w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive"
          />
        </div>

        {error && <p className="caption text-olive">{error}</p>}

        <div className="flex items-center gap-4">
          <button type="button" className="btn-secondary" onClick={onBack}>
            BACK
          </button>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? 'SAVING' : 'CONTINUE'}
          </button>
        </div>
      </form>
    </section>
  )
}
