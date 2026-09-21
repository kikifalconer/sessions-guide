'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toggleFavorite } from './favoriteActions'

const RESUME_PARAM = 'favorite'

function HeartIcon({ filled }: { filled: boolean }) {
  // Hand-authored, matching header-nav.tsx's SearchIcon (same viewBox,
  // stroke, and no external icon library) -- filled on save, outline
  // otherwise, so state doesn't rely on color alone.
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M12 20.5c-.3 0-.6-.1-.8-.3C7.6 17 3.5 13.4 3.5 9.4 3.5 6.4 5.8 4 8.8 4c1.6 0 3 .7 3.9 1.9C13.6 4.7 15 4 16.6 4c3 0 5.4 2.4 5.4 5.4 0 4-4.1 7.6-7.7 10.8-.2.2-.5.3-.8.3z" />
    </svg>
  )
}

// Heart toggle for the profile hero. Renders for every visitor (signed-out
// included) -- a signed-out click sends them through /login, never a browse
// wall (D20). isOwner is decided by the caller: this component is simply not
// rendered on your own profile.
export default function FavoriteButton({
  practitionerId,
  initialSaved,
  isSignedIn,
  profilePath,
}: {
  practitionerId: string
  initialSaved: boolean
  isSignedIn: boolean
  profilePath: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saved, setSaved] = useState(initialSaved)
  const [pending, setPending] = useState(false)
  const resumedRef = useRef(false)

  const runToggle = () => {
    const optimistic = !saved
    setSaved(optimistic)
    setPending(true)
    toggleFavorite(practitionerId).then((result) => {
      setPending(false)
      if (result.ok) {
        setSaved(result.saved)
      } else {
        setSaved(!optimistic)
      }
    })
  }

  // Signed-out resume: after the magic-link round trip lands back here with
  // ?favorite=1, fire the save exactly once and strip the param so a refresh
  // (or the back button) never re-fires it.
  useEffect(() => {
    if (!isSignedIn) return
    if (resumedRef.current) return
    if (searchParams.get(RESUME_PARAM) !== '1') return
    resumedRef.current = true
    router.replace(profilePath, { scroll: false })
    runToggle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, searchParams])

  const onClick = () => {
    if (pending) return
    if (!isSignedIn) {
      const next = `${profilePath}?${RESUME_PARAM}=1`
      router.push(`/login?next=${encodeURIComponent(next)}`)
      return
    }
    runToggle()
  }

  return (
    <button
      type="button"
      className="btn-cream flex items-center justify-center px-3 py-3"
      onClick={onClick}
      disabled={pending}
      aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
      aria-pressed={saved}
    >
      <HeartIcon filled={saved} />
    </button>
  )
}
