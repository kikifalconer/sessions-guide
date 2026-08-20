import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { resolveAuthDestination } from '@/lib/authDestination'
import HeaderNav, { type NavLink } from './header-nav'

// Shared site header.
//   <SiteHeader />                     regular pages: inline links on desktop,
//                                      hamburger on mobile.
//   <SiteHeader centerLabel={name} />  profile pages: centered name, hamburger
//                                      at all widths.
//
// Held-out links are one-line `live: false` entries; flip to true when the
// page ships. SEARCH renders as a magnifier on desktop and a labeled row in
// the menu.
const LINKS: NavLink[] = [
  { label: 'EXPLORE', href: '/explore', live: false },
  { label: 'SEARCH', href: '/search', live: true },
  { label: 'FOR PRACTITIONERS', href: '/join', live: false },
  { label: 'SAGES', href: '/sages', live: false },
  { label: 'ABOUT', href: '/about', live: false },
]

export default async function SiteHeader({ centerLabel }: { centerLabel?: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // D20: seekers hold accounts too, so a session no longer implies a
  // practitioner. Route by account shape via the shared helper (same check as
  // post-login routing): practitioners row → DASHBOARD, else ACCOUNT.
  let authSlot: { label: string; href: string }
  if (user) {
    const destination = await resolveAuthDestination(user.id)
    authSlot =
      destination === '/dashboard'
        ? { label: 'DASHBOARD', href: '/dashboard' }
        : { label: 'ACCOUNT', href: '/account' }
  } else {
    authSlot = { label: 'LOG IN', href: '/login' }
  }

  const links = LINKS.filter((l) => l.live)

  return (
    <header className="flex items-center justify-between gap-2 bg-bg px-3 py-4 sm:px-6 sm:py-5">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <Link href="/" aria-label="guides’space home" className="shrink-0">
          {/* Sage mark: dark lettering, for the light header field. Dimensions
              carry the PNG's real 7.12:1 aspect (7689x1080) rather than the old
              SVG's 4.93:1, so it is not stretched; next/image serves a 2x
              srcset from the large source, so it stays crisp. */}
          <Image
            src="/guidesspace-logo-sage.png"
            alt="guides’space"
            width={199}
            height={28}
            priority
          />
        </Link>

        {centerLabel && (
          <>
            <Image src="/x.svg" alt="" width={28} height={28} className="shrink-0" />
            <span className="min-w-0 truncate font-heading text-[16px] font-thin uppercase leading-none text-olive sm:text-[24px] md:text-[34px]">
              {centerLabel}
            </span>
          </>
        )}
      </div>

      <HeaderNav links={links} authSlot={authSlot} alwaysHamburger={!!centerLabel} />
    </header>
  )
}
