export type DashboardNavItem = {
  label: string
  href: string
  icon: string
  shortLabel?: string
  /** Extra path prefixes that keep this tab active. */
  prefixes?: string[]
  /** Only highlight on an exact pathname match (BASIC Account). */
  exact?: boolean
  /** Special matcher for public discovery URLs. */
  match?: 'explore'
}

export const MEMBER_NAV: DashboardNavItem[] = [
  {
    label: 'Explore',
    shortLabel: 'Explore',
    href: '/explore',
    icon: '/icons/search.png',
    match: 'explore',
  },
  {
    label: 'Community',
    shortLabel: 'Community',
    href: '/dashboard/community',
    icon: '/icons/community.png',
  },
  {
    label: 'Bookings',
    shortLabel: 'Bookings',
    href: '/dashboard/bookings',
    icon: '/icons/bookings.png',
    prefixes: ['/dashboard/availability', '/dashboard/calendar', '/dashboard/reservations'],
  },
  {
    label: 'Practice',
    shortLabel: 'Practice',
    href: '/dashboard/offerings',
    icon: '/icons/offerings.png',
  },
  {
    label: 'Account',
    shortLabel: 'Account',
    href: '/dashboard/account',
    icon: '/icons/account.png',
    prefixes: ['/dashboard/abundance', '/dashboard/billing'],
  },
]

export const MEMBER_MOBILE_TABS: DashboardNavItem[] = MEMBER_NAV

export const BASIC_NAV: DashboardNavItem[] = [
  {
    label: 'Explore',
    shortLabel: 'Explore',
    href: '/explore',
    icon: '/icons/search.png',
    match: 'explore',
  },
  {
    label: 'Bookings',
    shortLabel: 'Bookings',
    href: '/account/bookings',
    icon: '/icons/bookings.png',
  },
  {
    label: 'Community',
    shortLabel: 'Community',
    href: '/account/community',
    icon: '/icons/community.png',
  },
  {
    label: 'Account',
    shortLabel: 'Account',
    href: '/account',
    icon: '/icons/account.png',
    exact: true,
  },
]

const EXPLORE_RESERVED = new Set([
  'account',
  'api',
  'auth',
  'cancel',
  'contact',
  'dashboard',
  'explore',
  'guides',
  'help',
  'in',
  'join',
  'join-guidesspace',
  'login',
  'mission',
  'motion-demo',
  'pricing',
  'privacy',
  'review',
  'sages',
  'search',
  'terms',
  'about',
  'welcome',
  'faq',
])

export function isExplorePath(pathname: string): boolean {
  if (pathname === '/explore' || pathname.startsWith('/explore/')) return true
  if (pathname === '/search' || pathname.startsWith('/search/')) return true
  if (pathname.startsWith('/in/')) return true
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return false
  if (EXPLORE_RESERVED.has(parts[0])) return false
  if (parts[1] === 'book' || parts[1] === 'inquire') return false
  if (parts.length === 1) return true
  if (parts.length === 2 && parts[1] === 'reviews') return true
  return false
}

function pathMatchesPrefix(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function isDashboardNavActive(pathname: string | null, item: DashboardNavItem): boolean {
  if (!pathname) return false
  if (item.match === 'explore') return isExplorePath(pathname)
  if (item.exact) return pathname === item.href
  if (pathMatchesPrefix(pathname, item.href)) return true
  return (item.prefixes ?? []).some((prefix) => pathMatchesPrefix(pathname, prefix))
}
