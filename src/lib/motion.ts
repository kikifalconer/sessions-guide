// Motion tokens. The single source of truth for every duration, ease and
// stagger in the redesigned routes. Import these; never write a bare number
// into a tween or a transition.
//
// The GSAP string eases and the CSS cubic-bezier are deliberately paired:
// EASE.cssOut is the CSS equivalent of EASE.out, so a hover transition and a
// scroll reveal on the same element feel like the same system.

export const EASE = {
  out: 'expo.out', // reveals, entrances
  inOut: 'power3.inOut', // pins, transitions
  cssOut: 'cubic-bezier(0.16, 1, 0.3, 1)', // CSS hover/focus equivalent
} as const

export const DUR = {
  fast: 0.35, // hover, small UI
  base: 0.8, // standard reveal
  slow: 1.2, // hero, large type
} as const

export const STAGGER = { tight: 0.04, base: 0.08, loose: 0.14 } as const

export const TRIGGER = { start: 'top 80%', once: true } as const

// Below this width StickyStack stops pinning and scrolls normally, per the
// brief. Matches Tailwind's `md`.
export const PIN_MIN_WIDTH = 768

/** True when the visitor has asked for reduced motion. SSR-safe. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// will-change is set when a tween starts and cleared when it finishes, so no
// element keeps a compositor layer alive for the life of the page. Spread
// these into any tween that transforms or fades.
export const WILL_CHANGE_TRANSFORM = {
  onStart: (targets: Element | Element[]) => setWillChange(targets, 'transform'),
  onComplete: (targets: Element | Element[]) => setWillChange(targets, ''),
}

export function setWillChange(targets: Element | Element[], value: string): void {
  const list = Array.isArray(targets) ? targets : [targets]
  for (const el of list) {
    if (el instanceof HTMLElement) el.style.willChange = value
  }
}
