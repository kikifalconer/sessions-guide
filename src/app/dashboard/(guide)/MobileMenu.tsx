'use client'

import { useEffect, useRef, type RefObject } from 'react'
import Link from 'next/link'

// Overflow menu for the three dashboard routes that don't have a bottom-bar
// slot (Calendar, Reservations, My Bookings). Text links only -- the icon
// language belongs to the bottom bar (MobileTabBar.tsx), not this menu.
const MENU_ITEMS = [
  { label: 'Calendar', href: '/dashboard/calendar' },
  { label: 'Reservations', href: '/dashboard/reservations' },
  { label: 'My Bookings', href: '/dashboard/bookings' },
] as const

export default function MobileMenu({
  open,
  onClose,
  triggerRef,
}: {
  open: boolean
  onClose: () => void
  triggerRef: RefObject<HTMLButtonElement | null>
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
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

    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.querySelector<HTMLElement>('a[href], button:not([disabled])')?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      triggerRef.current?.focus()
    }
  }, [open, onClose, triggerRef])

  if (!open) return null

  return (
    <div role="dialog" aria-modal="true" aria-label="More dashboard pages" className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-dark/40"
      />
      <div ref={panelRef} className="absolute inset-x-0 top-0 bg-olive px-4 pb-2 pt-4">
        <div className="flex items-center justify-end pb-2">
          <button type="button" onClick={onClose} aria-label="Close menu">
            <span
              className="menu-close-icon"
              style={{ backgroundColor: 'var(--color-cream)' }}
              aria-hidden="true"
            />
          </button>
        </div>
        <nav aria-label="More" className="flex flex-col">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="border-t border-light/20 py-4 font-body text-cream first:border-t-0"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
