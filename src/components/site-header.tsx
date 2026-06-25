import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
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
  { label: 'EXPLORE', href: '/', live: false },
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

  // An account implies a practitioner (seekers book as guests), so a session
  // means DASHBOARD; otherwise LOG IN. No practitioners query needed.
  const authSlot = user
    ? { label: 'DASHBOARD', href: '/dashboard' }
    : { label: 'LOG IN', href: '/join' }

  const links = LINKS.filter((l) => l.live)

  return (
    <header className="flex items-center justify-between gap-2 bg-bg px-3 py-4 sm:px-6 sm:py-5">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <Link href="/" aria-label="sessions.guide home" className="shrink-0">
          <Image
            src="/sessions-logo.svg"
            alt="sessions.guide"
            width={138}
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
