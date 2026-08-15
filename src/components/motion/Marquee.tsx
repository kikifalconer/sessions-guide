'use client'

import { useEffect, useRef, type ReactNode } from 'react'

// Infinite horizontal ticker.
//
// The track is duplicated once and translated by exactly -50%, so the loop is
// seamless with no gap calculation. The duplicate is aria-hidden, so assistive
// tech and crawlers read the content once.
//
// Scroll velocity nudges speed and direction: scrolling down pushes the
// marquee along, scrolling up slows or reverses it briefly, then it eases back
// to base speed. That is what stops it reading as a mechanical loop.
//
// Pauses when off-screen (IntersectionObserver) and on hover/focus-within.

export default function Marquee({
  children,
  speed = 40, // seconds for one full pass at base rate
  reverse = false,
  className = '',
  ariaLabel,
}: {
  children: ReactNode
  speed?: number
  reverse?: boolean
  className?: string
  ariaLabel?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const track = trackRef.current
    if (!root || !track) return

    // Reduced motion: render static. No loop, no observer, no listeners.
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

      const direction = reverse ? 1 : -1
      // Start at -50% when reversed so the tween always travels through
      // populated track rather than empty space.
      gsap.set(track, { xPercent: reverse ? -50 : 0 })

      const tween = gsap.to(track, {
        xPercent: reverse ? 0 : -50,
        duration: speed,
        ease: 'none',
        repeat: -1,
      })
      track.style.willChange = 'transform'

      // Velocity nudge. timeScale eases back to 1 continuously.
      const velocityTrigger = ScrollTrigger.create({
        trigger: root,
        onUpdate: (self) => {
          const v = self.getVelocity()
          if (!v) return
          const nudge = gsap.utils.clamp(-6, 6, 1 + (v / 900) * direction)
          gsap.to(tween, { timeScale: nudge, duration: 0.2, overwrite: true })
          gsap.to(tween, { timeScale: 1, duration: 1.2, delay: 0.2, overwrite: false })
        },
      })

      // Off-screen pause: no compositor work for a marquee nobody can see.
      const io = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? tween.play() : tween.pause()),
        { rootMargin: '100px' }
      )
      io.observe(root)

      const pause = () => tween.pause()
      const play = () => tween.play()
      root.addEventListener('mouseenter', pause)
      root.addEventListener('mouseleave', play)
      root.addEventListener('focusin', pause)
      root.addEventListener('focusout', play)

      cleanup = () => {
        io.disconnect()
        velocityTrigger.kill()
        tween.kill()
        track.style.willChange = ''
        root.removeEventListener('mouseenter', pause)
        root.removeEventListener('mouseleave', play)
        root.removeEventListener('focusin', pause)
        root.removeEventListener('focusout', play)
      }
    })()

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [speed, reverse])

  return (
    <div
      ref={rootRef}
      className={`w-full overflow-hidden ${className}`}
      role="marquee"
      aria-label={ariaLabel}
    >
      <div ref={trackRef} className="flex w-max">
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  )
}
