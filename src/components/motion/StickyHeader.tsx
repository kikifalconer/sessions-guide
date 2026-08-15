'use client'

import { useEffect, useRef, type ReactNode } from 'react'

// Sticky header shell. Takes the existing server-rendered <SiteHeader /> as
// children, so the auth slot and nav keep rendering on the server and this
// wrapper only owns scroll state.
//
// Deliberately NOT used on / — decisions.md (Shared Site Header, June 2026)
// keeps the holding page header-free, and SiteHeader's Supabase getUser() call
// would force that page dynamic.
//
// State is written as data attributes and the visual transition lives in CSS
// (.sticky-header in globals.css), so no JS runs per frame. The scroll
// listener is passive and rAF-throttled.

const SOLID_AFTER = 80
const HIDE_AFTER = 400

export default function StickyHeader({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let lastY = window.scrollY
    let ticking = false

    const apply = () => {
      ticking = false
      const y = window.scrollY

      el.dataset.solid = String(y > SOLID_AFTER)

      // Hide on scroll down past HIDE_AFTER, reveal on any scroll up.
      const goingDown = y > lastY
      if (y > HIDE_AFTER && goingDown) {
        el.dataset.hidden = 'true'
      } else if (!goingDown) {
        el.dataset.hidden = 'false'
      }

      lastY = y
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(apply)
    }

    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header ref={ref} className="sticky-header" data-solid="false" data-hidden="false">
      {children}
    </header>
  )
}
