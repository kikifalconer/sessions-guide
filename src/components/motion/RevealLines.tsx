'use client'

import { useEffect, useRef, type ElementType, type ReactNode } from 'react'
import { DUR, EASE, STAGGER, TRIGGER, setWillChange } from '@/lib/motion'

// The signature move: a heading's lines rise out from behind a mask.
//
// SSR contract: the heading renders as ordinary text on the server, intact and
// crawlable. SplitText only touches the DOM after mount, and restores the
// original markup on unmount.
//
// Re-splitting is handled by SplitText's own autoSplit, which re-runs on
// resize and after webfonts load, so lines stay correct when the line box
// changes. onSplit returns the tween so GSAP reverts the previous one.

export default function RevealLines({
  as: Tag = 'h2',
  children,
  className = '',
  delay = 0,
}: {
  as?: ElementType
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let disposed = false
    let cleanup: (() => void) | null = null

    ;(async () => {
      const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('gsap/SplitText'),
      ])
      if (disposed) return
      gsap.registerPlugin(ScrollTrigger, SplitText)

      // Reduced motion: a plain 150ms fade, no split, no transform.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const tween = gsap.from(el, {
          opacity: 0,
          duration: 0.15,
          delay,
          scrollTrigger: { trigger: el, start: TRIGGER.start, once: TRIGGER.once },
        })
        cleanup = () => {
          tween.scrollTrigger?.kill()
          tween.kill()
        }
        return
      }

      const split = SplitText.create(el, {
        type: 'lines',
        mask: 'lines', // SplitText builds the overflow:hidden wrapper for us
        linesClass: 'reveal-line',
        autoSplit: true,
        onSplit(self: { lines: Element[] }) {
          return gsap.from(self.lines, {
            yPercent: 100,
            duration: DUR.slow,
            ease: EASE.out,
            stagger: STAGGER.base,
            delay,
            onStart: () => setWillChange(self.lines, 'transform'),
            onComplete: () => setWillChange(self.lines, ''),
            scrollTrigger: { trigger: el, start: TRIGGER.start, once: TRIGGER.once },
          })
        },
      })

      cleanup = () => split.revert()
    })()

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [delay])

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
