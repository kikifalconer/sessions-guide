'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Fixed bottom tab bar, <768px only. Six items -- the full IA, not a
// subset, now that MY BOOKINGS consolidates what used to be three separate
// routes (Reservations, Calendar, Bookings). There is no longer a hamburger
// overflow menu (see DashboardSidebar.tsx) -- these six are everything.
//
// Icons: /public/icons, per instruction. SESSIONS.png/BOOKINGS.png used for
// MY OFFERINGS/MY BOOKINGS -- filename doesn't match the label, but the
// concept does; not a missing-icon case. See DashboardSidebar.tsx for the
// flagged contrast issue (dark-olive icon fill on a dark-olive bar) -- same
// files, same problem, not fixed here either.
//
// Labels intentionally skip the site's .caption/.label treatment (uppercase
// + letter-spacing) -- at 375px there isn't room for the extra tracking
// width across six items; plain small text is what keeps every label on
// one line (checked against all six current labels, including the two
// longest: "AVAILABILITY" and "MY OFFERINGS"/"MY BOOKINGS").
const TABS = [
  { label: 'Account', href: '/dashboard/account', icon: '/icons/ACCOUNT.png' },
  { label: 'My Offerings', href: '/dashboard/offerings', icon: '/icons/SESSIONS.png' },
  { label: 'My Bookings', href: '/dashboard/bookings', icon: '/icons/BOOKINGS.png' },
  { label: 'Availability', href: '/dashboard/availability', icon: '/icons/AVAILABILITY.png' },
  { label: 'Community', href: '/dashboard/community', icon: '/icons/COMMUNITY.png' },
  { label: 'Abundance', href: '/dashboard/abundance', icon: '/icons/ABUNDANCE.png' },
] as const

export default function MobileTabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-light/20 bg-olive md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ label, href, icon }) => {
        const isActive = pathname === href || pathname?.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 ${
              isActive ? 'text-citron' : 'text-cream/70'
            }`}
          >
            <Image src={icon} alt="" width={22} height={16} aria-hidden="true" />
            <span className="whitespace-nowrap font-body text-[0.5625rem] leading-none">
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
