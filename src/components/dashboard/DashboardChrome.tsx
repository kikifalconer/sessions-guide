'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BRAND_NAME } from '@/lib/brand'
import {
  isDashboardNavActive,
  type DashboardNavItem,
} from '@/lib/dashboardNav'

function navLinkClass(active: boolean): string {
  return [
    'flex min-h-[44px] shrink-0 items-center border-l-2 px-6 py-2.5 text-left outline-none',
    'font-body font-light uppercase tracking-[0.06em] text-[1.14rem] leading-[1.65]',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cream',
    active ? 'border-citron text-citron' : 'border-transparent text-cream hover:text-citron',
  ].join(' ')
}

export default function DashboardChrome({
  children,
  items,
  mobileTabs,
  fullName,
  statusLabel,
}: {
  children: React.ReactNode
  items: readonly DashboardNavItem[]
  mobileTabs: readonly DashboardNavItem[]
  fullName: string
  statusLabel?: string
}) {
  const pathname = usePathname()

  return (
    <div className="dashboard-shell flex min-h-screen flex-col bg-bg md:flex-row">
      <aside className="flex w-full shrink-0 flex-col bg-olive md:sticky md:top-0 md:h-screen md:w-[300px]">
        <Link
          href="/"
          aria-label={`${BRAND_NAME} home`}
          className="block w-full md:hidden"
        >
          <Image
            src="/guidesspace-mobile-banner.png"
            alt={BRAND_NAME}
            width={1245}
            height={80}
            className="h-auto w-full"
            priority
          />
        </Link>

        <Link
          href="/"
          aria-label={`${BRAND_NAME} home`}
          className="hidden w-full px-8 pt-8 pb-10 md:block"
        >
          <Image
            src="/guidesspace-logo-cream.png"
            alt={BRAND_NAME}
            width={300}
            height={27}
            className="h-auto w-full"
            priority
          />
        </Link>

        <nav aria-label="Dashboard" className="hidden flex-1 md:flex md:flex-col md:gap-4">
          {items.map((item) => {
            const isActive = isDashboardNavActive(pathname, item)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={navLinkClass(isActive)}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden shrink-0 px-6 py-6 md:block">
          <p className="font-body text-[1.14rem] font-light leading-[1.65] text-cream">
            {fullName || 'Your profile'}
          </p>
          {statusLabel && <p className="caption mt-1 text-citron">{statusLabel}</p>}
        </div>
      </aside>

      <div
        className={`min-w-0 flex-1 bg-bg ${
          mobileTabs.length > 0 ? 'pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0' : ''
        }`}
      >
        {children}
      </div>

      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-40 flex min-h-20 bg-olive md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {mobileTabs.map((item) => {
          const isActive = isDashboardNavActive(pathname, item)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 px-0.5 py-1.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-cream ${
                isActive ? 'text-citron' : 'text-cream/80'
              }`}
            >
              <Image
                src={item.icon}
                alt=""
                width={32}
                height={23}
                aria-hidden="true"
                className="brightness-0 invert"
              />
              <span className="caption whitespace-nowrap !text-[0.5625rem] leading-none">
                {item.shortLabel ?? item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
