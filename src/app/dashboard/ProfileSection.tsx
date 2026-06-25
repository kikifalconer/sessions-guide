'use client'

import { useState, useTransition } from 'react'
import { publishProfile } from './actions'

export default function ProfileSection({
  slug,
  isPublished,
}: {
  slug: string
  isPublished: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const publish = () => {
    setError(null)
    startTransition(async () => {
      const result = await publishProfile()
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
      }
    })
  }

  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <a
          href={`/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary inline-block"
        >
          PREVIEW PROFILE
        </a>

        {isPublished ? (
          <span className="caption text-olive">PROFILE LIVE</span>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={publish}
            disabled={pending}
          >
            {pending ? 'PUBLISHING' : 'PUBLISH PROFILE'}
          </button>
        )}
      </div>

      {error && <p className="caption text-olive">{error}</p>}
    </div>
  )
}
