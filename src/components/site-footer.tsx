import Link from 'next/link'
import Image from 'next/image'
import { BRAND_NAME } from '@/lib/brand'

// Global site footer. Added once in the root layout so it appears on every page.
// Olive field, a wordmark column plus two citron-headed link columns, and a
// full-width bottom bar.

const HEADER = 'font-ui text-[0.72rem] uppercase tracking-[0.08em] text-citron'
const LINK =
  'font-ui text-[0.72rem] uppercase tracking-[0.08em] text-cream transition-opacity hover:opacity-80'
// Held-out items with no live route (or explicitly withheld — THE SAGES
// PROGRAM: Curator naming and whether it ships at all are both open,
// BRAND-12/BRAND-14) render as plain text, never as an anchor.
const HELD_OUT = 'font-ui text-[0.72rem] uppercase tracking-[0.08em] text-cream/50'

export default function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-olive text-cream">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-12 px-6 py-20 sm:grid-cols-3 sm:px-10">
        {/* Column one — mark + platform links */}
        <div className="flex flex-col items-start gap-5">
          {/* Cream mark: light lettering, for the olive footer field. */}
          <Image
            src="/guidesspace-logo-cream.png"
            alt={BRAND_NAME}
            width={221}
            height={31}
            className="mb-2"
          />
          <Link href="/mission" className={LINK}>
            The Mission
          </Link>
          <Link href="/contact" className={LINK}>
            Contact
          </Link>
          <a
            href="https://instagram.com/guidesspace"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK}
          >
            Instagram
          </a>
        </div>

        {/* Column two — for guides */}
        <div className="flex flex-col gap-5 sm:pt-2">
          <p className={HEADER}>For Guides</p>
          <p className={LINK}>
            <Link href="/join-guidesspace" className="hover:opacity-80">
              Join
            </Link>
            {' / '}
            <Link href="/login" className="hover:opacity-80">
              Log In
            </Link>
          </p>
          <Link href="/pricing" className={LINK}>
            Pricing
          </Link>
          {/* No standalone /faq route or #faq anchor exists anywhere today. */}
          <span className={HELD_OUT}>FAQ</span>
        </div>

        {/* Column three — for clients */}
        <div className="flex flex-col gap-5 sm:pt-2">
          <p className={HEADER}>For Clients</p>
          <Link href="/explore" className={LINK}>
            Explore Guides
          </Link>
          <span className={HELD_OUT}>The Sages Program</span>
          <Link href="/help" className={LINK}>
            Help
          </Link>
        </div>
      </div>

      <div className="border-t border-light/15">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row sm:px-10">
          <p className="font-ui text-[0.68rem] uppercase tracking-[0.08em] text-cream/60">
            Copyright {year} Sessions Guide Inc.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className={LINK}>
              Privacy
            </Link>
            <Link href="/terms" className={LINK}>
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
