'use client'

import { useState, useTransition } from 'react'
import { saveBio } from '@/app/join/actions'

export default function BioEditor({ initialBio }: { initialBio: string | null }) {
  const [bio, setBio] = useState(initialBio ?? '')
  const [saved, setSaved] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const save = () => {
    setError(null)
    startTransition(async () => {
      const result = await saveBio(bio)
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
        return
      }
      setSaved(true)
    })
  }

  return (
    <div>
      <label htmlFor="bio" className="label mb-2 block text-dark">
        Bio
      </label>
      <textarea
        id="bio"
        rows={8}
        value={bio}
        onChange={(e) => {
          setBio(e.target.value)
          setSaved(false)
        }}
        className="w-full resize-y bg-light px-4 py-3 font-body font-light text-dark outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
      />
      <button
        type="button"
        className="btn-secondary mt-3"
        disabled={pending || saved}
        onClick={save}
      >
        {pending ? 'Saving' : 'Save bio'}
      </button>
      {error && <p className="caption mt-2 text-olive">{error}</p>}
    </div>
  )
}
