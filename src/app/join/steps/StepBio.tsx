'use client'

import { useState, useTransition } from 'react'
import { saveBio } from '../actions'

export default function StepBio({
  initialBio,
  onNext,
  onBack,
}: {
  initialBio: string
  onNext: () => void
  onBack: () => void
}) {
  const [bio, setBio] = useState(initialBio)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await saveBio(bio)
      if (result.ok) {
        onNext()
      } else {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
      }
    })
  }

  return (
    <section>
      <h2 className="mb-2">About you</h2>
      <p className="mb-8">
        Tell seekers who you are, how you work, and what a session with you is
        like. Take the space you need.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex flex-col gap-6"
      >
        <div>
          <label htmlFor="bio" className="label mb-2 block text-dark">
            BIO
          </label>
          <textarea
            id="bio"
            rows={10}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full resize-y border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive"
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
