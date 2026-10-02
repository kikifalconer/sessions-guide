'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Suggestion =
  | { kind: 'modality'; name: string; slug: string }
  | { kind: 'city'; name: string; slug: string }

export default function ExploreSearch({
  modalities,
  cities,
}: {
  modalities: { name: string; slug: string }[]
  cities: { label: string; slug: string }[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as Suggestion[]
    const mods: Suggestion[] = modalities
      .filter((m) => m.name.toLowerCase().includes(q) || m.slug.includes(q))
      .map((m) => ({ kind: 'modality' as const, name: m.name, slug: m.slug }))
    const cityItems: Suggestion[] = cities
      .filter((c) => c.label.toLowerCase().includes(q) || c.slug.includes(q))
      .map((c) => ({ kind: 'city' as const, name: c.label, slug: c.slug }))
    return [...mods, ...cityItems].slice(0, 8)
  }, [query, modalities, cities])

  const go = (item?: Suggestion) => {
    if (item?.kind === 'modality') {
      router.push(`/search?modality=${encodeURIComponent(item.slug)}`)
      return
    }
    if (item?.kind === 'city') {
      router.push(`/search?city=${encodeURIComponent(item.slug)}`)
      return
    }
    router.push('/search')
  }

  return (
    <form
      role="search"
      className="relative max-w-[560px]"
      onSubmit={(e) => {
        e.preventDefault()
        const chosen = suggestions[active]
        go(open && chosen ? chosen : undefined)
      }}
    >
      <label htmlFor="explore_search" className="sr-only">
        Search modalities and cities
      </label>
      <input
        id="explore_search"
        type="search"
        value={query}
        autoComplete="off"
        placeholder="Search by modality or city"
        className="w-full bg-light px-4 py-3 font-body font-light text-dark outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120)
        }}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => (i + 1) % suggestions.length)
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => (i - 1 + suggestions.length) % suggestions.length)
          }
          if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-20 mt-1 w-full bg-light"
          role="listbox"
          aria-label="Suggestions"
        >
          {suggestions.map((item, i) => {
            const href =
              item.kind === 'modality'
                ? `/search?modality=${encodeURIComponent(item.slug)}`
                : `/search?city=${encodeURIComponent(item.slug)}`
            return (
              <li key={`${item.kind}-${item.slug}`} role="option" aria-selected={i === active}>
                <a
                  href={href}
                  className={`flex w-full items-baseline justify-between px-4 py-3 text-left ${
                    i === active ? 'text-olive' : 'text-dark hover:text-olive'
                  }`}
                  onMouseEnter={() => setActive(i)}
                >
                  <span className="font-body font-light">{item.name}</span>
                  <span className="caption opacity-60">
                    {item.kind === 'modality' ? 'Modality' : 'City'}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </form>
  )
}
