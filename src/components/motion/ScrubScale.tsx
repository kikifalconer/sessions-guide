'use client'

import { useEffect, useRef, type ReactNode } from 'react'

// Scroll-linked scale and parallax for media.
//
// Scales 1.08 -> 1 and translates a little as the element crosses the
// viewport, scrub-linked. Total travel stays under 40px by design: this is
// meant to be felt, not seen. Two or three per page, no more.
//
// The wrapper clips, so the scaled child never bleeds past its box.
// Replaces the CSS animation-timeline: view() implementation that previously
// did this, so there is one scroll system rather than two.

export default function ScrubScale({
  children,
  className = '',
  travel = 32, // px of vertical drift across the whole pass
}: {
  children: ReactNode
  className?: string
  travel?: number
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const inner = innerRef.current
    if (!root || !inner) return

    // Reduced motion: no scrub, no parallax. The image simply sits there.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let disposed = false
    let cleanup: (() => void) | null = null

    ;(async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (disposed) return
      gsap.registerPlugin(ScrollTrigger)

      // A scrub tween never "completes", so will-change cannot be cleared in
      // onComplete the way a normal reveal does it. Toggle it on the trigger
      // instead: the layer exists only while the element is actually in the
      // viewport being scrubbed, and is released the moment it leaves.
      const tween = gsap.fromTo(
        inner,
        { scale: 1.08, y: -travel / 2 },
        {
          scale: 1,
          y: travel / 2,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true,
            onToggle: (self) => {
              inner.style.willChange = self.isActive ? 'transform' : ''
            },
          },
        }
      )

      cleanup = () => {
        tween.scrollTrigger?.kill()
        tween.kill()
        inner.style.willChange = ''
      }
    })()

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [travel])

  return (
    <div ref={rootRef} className={`relative overflow-hidden ${className}`}>
      <div ref={innerRef} className="h-full w-full">
        {children}
      </div>
    </div>
  )
}
