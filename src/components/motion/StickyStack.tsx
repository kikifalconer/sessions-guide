'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { EASE, PIN_MIN_WIDTH } from '@/lib/motion'

// Pinned section with internal progression.
//
// The section pins for `viewports` screen-heights while its states advance on
// scrub. Every state is server-rendered and stacked; only opacity/transform
// change, so all of the text is in the HTML and readable with JS off (states
// simply appear stacked in document order, which is why each state should be
// independently meaningful).
//
// Pinning is disabled below 768px and under reduced motion, where the states
// scroll normally as a plain sequence. Never pin two of these in one viewport.

export default function StickyStack({
  states,
  className = '',
  viewports = 1.25,
}: {
  states: ReactNode[]
  className?: string
  viewports?: number
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    let disposed = false
    let cleanup: (() => void) | null = null

    ;(async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (disposed) return
      gsap.registerPlugin(ScrollTrigger)

      // matchMedia gives us the teardown for free when the query stops
      // matching, so a resize across the breakpoint unpins cleanly.
      const mm = gsap.matchMedia()

      mm.add(
        {
          pinned: `(min-width: ${PIN_MIN_WIDTH}px) and (prefers-reduced-motion: no-preference)`,
        },
        (context) => {
          if (!context.conditions?.pinned) return

          const panels = Array.from(
            root.querySelectorAll<HTMLElement>('[data-stack-state]')
          )
          if (panels.length < 2) return

          // Stack them: all but the first start hidden and offset.
          gsap.set(panels, { position: 'absolute', inset: 0 })
          gsap.set(panels.slice(1), { opacity: 0, y: 32 })
          gsap.set(panels[0], { opacity: 1, y: 0 })

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root,
              start: 'top top',
              end: () => `+=${window.innerHeight * viewports}`,
              pin: true,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })

          panels.forEach((panel, i) => {
            if (i === 0) return
            tl.to(panels[i - 1], { opacity: 0, y: -32, ease: EASE.inOut }, i - 1)
            tl.to(panel, { opacity: 1, y: 0, ease: EASE.inOut }, i - 1)
          })

          return () => {
            tl.kill()
            gsap.set(panels, { clearProps: 'all' })
          }
        }
      )

      cleanup = () => mm.revert()
    })()

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [viewports])

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {states.map((state, i) => (
        <div key={i} data-stack-state className="w-full">
          {state}
        </div>
      ))}
    </div>
  )
}
