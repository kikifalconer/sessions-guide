'use client'

import { useState, useTransition } from 'react'
import { completeOnboarding } from '../actions'
import { detectPlatform } from '@/lib/links'

export default function StepLinks({
  initialLink1,
  initialLink2,
  initialLink3,
  onBack,
}: {
  initialLink1: string
  initialLink2: string
  initialLink3: string
  onBack: () => void
}) {
  const [links, setLinks] = useState([initialLink1, initialLink2, initialLink3])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const setLink = (index: number, value: string) =>
    setLinks((prev) => prev.map((v, i) => (i === index ? value : v)))

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await completeOnboarding(links[0], links[1], links[2])
      if (result && !result.ok) {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
      }
    })
  }

  const fieldClass =
    'w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive'

  return (
    <section>
      <h2 className="mb-2">Your links</h2>
      <p className="mb-8">
        Add up to three links to your profile. Your website, your Instagram, a YouTube channel,
        a Substack, whatever best represents your work.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex flex-col gap-6"
      >
        {links.map((value, i) => {
          const label = detectPlatform(value)
          return (
            <div key={i}>
              <input
                id={`link_${i + 1}`}
                type="text"
                value={value}
                onChange={(e) => setLink(i, e.target.value)}
                placeholder="Paste a link."
                className={fieldClass}
              />
              {label && (
                <p className="caption mt-1 text-dark">{label}</p>
              )}
            </div>
          )
        })}

        {error && <p className="caption text-olive">{error}</p>}

        <div className="flex items-center gap-4">
          <button type="button" className="btn-secondary" onClick={onBack}>
            BACK
          </button>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? 'FINISHING' : 'FINISH'}
          </button>
        </div>
      </form>
    </section>
  )
}
