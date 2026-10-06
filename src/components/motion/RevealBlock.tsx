'use client'

import { useEffect, useRef, type ElementType, type ReactNode } from 'react'
import { DUR, EASE, STAGGER, TRIGGER, setWillChange } from '@/lib/motion'

// Element fade-rise. y 24 -> 0, opacity 0 -> 1, once, at top 80%.
//
// With `stagger`, the direct children animate in sequence instead of the
// wrapper moving as one block. Use that for lists, button rows, card groups.
//
// The initial state is set from JS (gsap.from), never authored in CSS, so a
// JS failure leaves the content visible rather than invisible. The cost of
// that choice is a possible one-frame flash of the un-animated state on slow
// connections; that is the deliberate trade, and it fails safe.

export default function RevealBlock({
  as: Tag = 'div',
  children,
  className = '',
  stagger,
  delay = 0,
}: {
  as?: ElementType
  children: ReactNode
  className?: string
  stagger?: keyof typeof STAGGER
  delay?: number
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let disposed = false
    let cleanup: (() => void) | null = null

    ;(async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (disposed) return
      gsap.registerPlugin(ScrollTrigger)

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const targets = stagger ? Array.from(el.children) : el
      if (stagger && (targets as Element[]).length === 0) return

      const tween = gsap.from(targets, {
        // Reduced motion drops the translate entirely and shortens the fade.
        y: reduced ? 0 : 24,
        opacity: 0,
        duration: reduced ? 0.15 : DUR.base,
        ease: EASE.out,
        delay,
        stagger: stagger && !reduced ? STAGGER[stagger] : 0,
        onStart: () => setWillChange(targets as Element | Element[], 'transform, opacity'),
        onComplete: () => setWillChange(targets as Element | Element[], ''),
        scrollTrigger: { trigger: el, start: TRIGGER.start, once: TRIGGER.once },
      })

      cleanup = () => {
        tween.scrollTrigger?.kill()
        tween.kill()
      }
    })()

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [stagger, delay])

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
