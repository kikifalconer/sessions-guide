'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// The one place ScrollTrigger is registered and Lenis is created.
//
// Renders NOTHING, and is imported normally rather than via next/dynamic.
// The brief asked for `next/dynamic { ssr: false }`, which the App Router
// forbids in Server Components (node_modules/next/dist/docs/01-app/02-guides/
// lazy-loading.md:94). The same goal is met more directly, and it is the
// pattern that doc recommends for external libraries: this file is a client
// component that renders null, and gsap/lenis are pulled in with a dynamic
// import() inside the effect. They are therefore absent from the server
// bundle AND from the initial client bundle, arriving as a lazy chunk after
// mount. The effect components (RevealLines, RevealBlock, ...) stay
// server-rendered by contrast, so their text ships in the HTML and is
// crawlable.
//
// Lenis integration note: the brief asked for ScrollTrigger.scrollerProxy().
// That API is for a custom scroll CONTAINER. Lenis here drives native window
// scroll, so the correct wiring is the documented ticker pattern below
// (lenis.on('scroll', ScrollTrigger.update) plus gsap.ticker driving raf).
// scrollerProxy would fight the native scroller rather than cooperate.

export default function MotionProvider() {
  const pathname = usePathname()

  useEffect(() => {
    let disposed = false
    let dispose: (() => void) | null = null

    ;(async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (disposed) return

      gsap.registerPlugin(ScrollTrigger)

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      // Reduced motion: no Lenis at all. Native scrolling, no interception.
      if (reduced) {
        dispose = () => {
          ScrollTrigger.getAll().forEach((t) => t.kill())
        }
        return
      }

      const { default: Lenis } = await import('lenis')
      if (disposed) return

      const lenis = new Lenis({
        duration: 1.1,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        // Touch devices keep their native scrolling; smoothing touch fights
        // the platform and costs more than it gains.
        syncTouch: false,
      })

      lenis.on('scroll', ScrollTrigger.update)

      const raf = (time: number) => lenis.raf(time * 1000)
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(0)

      // Webfonts change line boxes, which changes every trigger's start/end.
      // Recompute once the faces are in.
      if (document.fonts?.ready) {
        document.fonts.ready.then(() => {
          if (!disposed) ScrollTrigger.refresh()
        })
      }

      dispose = () => {
        gsap.ticker.remove(raf)
        gsap.ticker.lagSmoothing(500, 33)
        lenis.destroy()
        // Kill every trigger on route change. App Router keeps the JS context
        // alive across navigations, so triggers pointing at unmounted DOM
        // would otherwise accumulate and leak.
        ScrollTrigger.getAll().forEach((t) => t.kill())
      }
    })()

    return () => {
      disposed = true
      dispose?.()
    }
  }, [pathname])

  return null
}
