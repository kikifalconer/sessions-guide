'use client'

import { useState, useTransition } from 'react'
import { saveLinks } from '@/app/join/actions'
import { detectPlatform } from '@/lib/links'

export default function LinksEditor({
  initialLinks,
}: {
  initialLinks: [string, string, string]
}) {
  const [links, setLinks] = useState<[string, string, string]>(initialLinks)
  const [saved, setSaved] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const setLink = (index: number, value: string) => {
    setLinks((prev) => {
      const next = [...prev] as [string, string, string]
      next[index] = value
      return next
    })
    setSaved(false)
  }

  const save = () => {
    setError(null)
    startTransition(async () => {
      const result = await saveLinks(links[0], links[1], links[2])
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
        return
      }
      setSaved(true)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {links.map((value, i) => {
        const label = detectPlatform(value)
        const id = `profile_link_${i + 1}`
        return (
          <div key={id}>
            <label htmlFor={id} className="label mb-2 block text-dark">
              Link {i + 1}
            </label>
            <input
              id={id}
              type="text"
              value={value}
              onChange={(e) => setLink(i, e.target.value)}
              placeholder="Paste a link."
              className="w-full bg-light px-4 py-3 font-body font-light text-dark outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
            />
            {label && <p className="caption mt-1 text-dark">{label}</p>}
          </div>
        )
      })}
      <button
        type="button"
        className="btn-secondary self-start"
        disabled={pending || saved}
        onClick={save}
      >
        {pending ? 'Saving' : 'Save links'}
      </button>
      {error && <p className="caption text-olive">{error}</p>}
    </div>
  )
}
