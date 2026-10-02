'use client'

import { useEffect, useRef } from 'react'
import { DUR, EASE, TRIGGER } from '@/lib/motion'

// Number reveal for metrics.
//
// SSR contract: the FINAL value is what renders on the server, formatted, so
// a crawler and a JS-less visitor read the real figure. The count from zero is
// applied on mount and only when the element enters the viewport.
//
// Locale formatting is pinned to en-US rather than the visitor's locale, so
// the server string and the first client string cannot disagree and trigger a
// hydration mismatch.

const FORMAT = new Intl.NumberFormat('en-US')

export default function CountUp({
  value,
  prefix = '',
  suffix = '',
  className = '',
}: {
  value: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Reduced motion: leave the final value alone. Nothing to animate.
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

      const counter = { n: 0 }
      const tween = gsap.to(counter, {
        n: value,
        duration: DUR.slow,
        ease: EASE.out,
        onUpdate: () => {
          el.textContent = FORMAT.format(Math.round(counter.n))
        },
        onComplete: () => {
          el.textContent = FORMAT.format(value)
        },
        scrollTrigger: { trigger: el, start: TRIGGER.start, once: TRIGGER.once },
      })

      cleanup = () => {
        tween.scrollTrigger?.kill()
        tween.kill()
        el.textContent = FORMAT.format(value)
      }
    })()

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [value])

  return (
    <span className={className}>
      {prefix}
      <span ref={ref}>{FORMAT.format(value)}</span>
      {suffix}
    </span>
  )
}
