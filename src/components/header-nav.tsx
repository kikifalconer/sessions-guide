'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type NavLink = { label: string; href: string; live: boolean }
export type AuthSlot = { label: string; href: string }

// Tailwind `md` (768px) — the same breakpoint that drives inline-vs-hamburger.
const DESKTOP_MQ = '(min-width: 768px)'

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  )
}

// Interactive part of the shared header: inline links on desktop (regular
// mode) and the hamburger toggle + menu. The open menu is a full-screen
// overlay on mobile; at/above the desktop breakpoint (reachable only in
// always-hamburger / profile mode) it is a compact panel anchored top-right.
export default function HeaderNav({
  links,
  authSlot,
  alwaysHamburger,
}: {
  links: NavLink[]
  authSlot: AuthSlot
  alwaysHamburger: boolean
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on route change.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // While open: Esc to close, focus trap, restore focus to the toggle on
  // close, click-away (desktop panel only — on mobile the full-screen panel
  // has no "outside"), and body-scroll lock in the full-screen variant only.
  useEffect(() => {
    if (!open) return

    const prevOverflow = document.body.style.overflow
    const mq = window.matchMedia(DESKTOP_MQ)
    // Desktop compact panel exists only in always-hamburger mode.
    const isDesktopPanel = () => alwaysHamburger && mq.matches

    const applyScrollLock = () => {
      document.body.style.overflow = isDesktopPanel() ? prevOverflow : 'hidden'
    }
    applyScrollLock()
    mq.addEventListener('change', applyScrollLock)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      if (toggleRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    panelRef.current?.querySelector<HTMLElement>('a[href], button:not([disabled])')?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
      mq.removeEventListener('change', applyScrollLock)
      document.body.style.overflow = prevOverflow
      toggleRef.current?.focus()
    }
  }, [open, alwaysHamburger])

  const renderRow = (label: string, href: string, withSearchIcon: boolean) => (
    <Link
      key={href + label}
      href={href}
      className="caption flex items-center gap-3 border-t border-border px-6 py-5 text-dark transition-colors hover:text-olive"
    >
      {withSearchIcon && <SearchIcon />}
      {label}
    </Link>
  )

  return (
    <>
      {/* Desktop inline links — regular mode only */}
      {!alwaysHamburger && (
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) =>
            l.label === 'SEARCH' ? (
              <Link
                key={l.href}
                href={l.href}
                aria-label="Search"
                className="text-dark transition-colors hover:text-olive"
              >
                <SearchIcon />
              </Link>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className="caption text-dark transition-colors hover:text-olive"
              >
                {l.label}
              </Link>
            )
          )}
          <Link
            href={authSlot.href}
            className="caption text-dark transition-colors hover:text-olive"
          >
            {authSlot.label}
          </Link>
        </nav>
      )}

      {/* Toggle + menu. The relative wrapper anchors the desktop panel under
          the button; the mobile full-screen overlay uses `fixed` and ignores
          it. Wrapper carries the toggle's visibility. */}
      <div className={`relative shrink-0 ${alwaysHamburger ? 'block' : 'md:hidden'}`}>
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="block"
        >
          <span className="hamburger-icon" aria-hidden="true" />
        </button>

        {open && (
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-50 bg-bg md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-max md:min-w-[20ch] md:max-w-[28ch] md:border md:border-border"
          >
            {/* Close (X) row — full-screen variant only; the desktop panel
                closes via click-away / Esc / re-tap. */}
            <div className="flex items-center justify-end px-3 py-4 sm:px-6 sm:py-5 md:hidden">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="shrink-0"
              >
                <span className="menu-close-icon" aria-hidden="true" />
              </button>
            </div>

            <nav className="flex flex-col border-b border-border md:border-b-0">
              {links.map((l) => renderRow(l.label, l.href, l.label === 'SEARCH'))}
              {renderRow(authSlot.label, authSlot.href, false)}
            </nav>
          </div>
        )}
      </div>
    </>
  )
}
