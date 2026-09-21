'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BRAND_NAME } from '@/lib/brand'

// Sidebar shell for every /dashboard/* route (D30 pass 1: six-tab IA
// consolidation). Full 280px rail with labels at >=1280px, a narrow
// abbreviated-label rail at 768-1279px, and below 768px a slim header (logo
// only -- see the note below on the hamburger) with MobileTabBar.tsx
// (mounted separately in layout.tsx, as its own nav landmark) carrying
// primary navigation instead of this component's text nav.
//
// Icons: /public/icons (ACCOUNT.png, SESSIONS.png, BOOKINGS.png,
// AVAILABILITY.png, COMMUNITY.png, ABUNDANCE.png), per instruction. Two
// filename/label mismatches, not missing icons: SESSIONS.png is used for
// MY OFFERINGS, BOOKINGS.png for MY BOOKINGS -- same concept, different
// name on disk. All six targets have a matching file; none substituted.
//
// KNOWN ISSUE, not fixed in this pass: these PNGs are a solid dark-olive
// fill (~#454832) on a transparent background -- effectively the same color
// as this sidebar's bg-olive. On this dark surface they will have little to
// no visible contrast. Flagging rather than silently working around it
// (e.g. a light chip behind each icon, or a different bar background) --
// that's a visual decision, not a routing one.
const NAV = [
  { label: 'ACCOUNT', short: 'ACC', href: '/dashboard/account', icon: '/icons/ACCOUNT.png' },
  { label: 'MY OFFERINGS', short: 'OFF', href: '/dashboard/offerings', icon: '/icons/SESSIONS.png' },
  { label: 'MY BOOKINGS', short: 'BKG', href: '/dashboard/bookings', icon: '/icons/BOOKINGS.png' },
  { label: 'AVAILABILITY', short: 'AVL', href: '/dashboard/availability', icon: '/icons/AVAILABILITY.png' },
  { label: 'COMMUNITY', short: 'COM', href: '/dashboard/community', icon: '/icons/COMMUNITY.png' },
  { label: 'ABUNDANCE', short: 'ABN', href: '/dashboard/abundance', icon: '/icons/ABUNDANCE.png' },
] as const

export default function DashboardSidebar({
  fullName,
  isPublished,
}: {
  fullName: string
  isPublished: boolean
}) {
  const pathname = usePathname()

  return (
    <aside className="flex w-full shrink-0 flex-col border-border bg-olive md:sticky md:top-0 md:h-screen md:w-20 md:border-r xl:w-[280px]">
      {/* Mobile-only header (<768px): logo only now. The hamburger and its
          overflow menu (MobileMenu.tsx) are gone from this pass -- six
          routes fit exactly into the six-slot bottom bar, so there is
          nothing left for an overflow menu to hold. MobileMenu.tsx and the
          six hand-authored SVG icon components under src/components/icons/
          are now unused; left on disk rather than deleted, since this pass
          is scoped to routes, not cleanup. */}
      <div className="flex shrink-0 items-center justify-between border-b border-light/20 px-4 py-4 md:hidden">
        <Link href="/" aria-label={`${BRAND_NAME} home`}>
          <Image src="/guidesspace-logo-cream.png" alt={BRAND_NAME} width={140} height={13} />
        </Link>
      </div>

      {/* xl+ header: unchanged from before this pass. */}
      <div className="hidden shrink-0 border-b border-light/20 px-6 py-6 xl:block">
        <Link href="/dashboard/account" aria-label={`${BRAND_NAME} home`}>
          <Image src="/guidesspace-logo-cream.png" alt={BRAND_NAME} width={180} height={17} />
        </Link>
      </div>

      <nav className="hidden flex-1 md:flex md:flex-col">
        {NAV.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              title={item.label}
              className={`flex shrink-0 items-center gap-3 border-l-2 px-3 py-4 text-left xl:px-6 ${
                isActive ? 'border-citron bg-olive-hover' : 'border-transparent'
              }`}
            >
              <Image src={item.icon} alt="" width={28} height={20} aria-hidden="true" />
              <span className="caption hidden text-cream md:inline xl:hidden">{item.short}</span>
              <span className="caption hidden text-cream xl:inline">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="hidden shrink-0 border-t border-light/20 px-6 py-6 xl:block">
        <p className="caption text-cream">{fullName || 'Your profile'}</p>
        <p className="caption mt-1 text-citron">{isPublished ? 'LIVE' : 'DRAFT'}</p>
      </div>
    </aside>
  )
}
