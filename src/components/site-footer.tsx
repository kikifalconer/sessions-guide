import Link from 'next/link'
import Image from 'next/image'

// Global site footer. Added once in the root layout so it appears on every page.
// Olive field, three link columns, and a full-width bottom bar.

const LINK =
  'font-ui text-[0.72rem] uppercase tracking-[0.08em] text-light/80 transition-opacity hover:text-light'

export default function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-olive text-light">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-12 px-6 py-20 sm:grid-cols-3 sm:px-10">
        {/* Column one — mark + platform story */}
        <div className="flex flex-col items-start gap-5">
          <Image
            src="/sessions-logo-light.svg"
            alt="Sessions Guide"
            width={150}
            height={31}
            className="mb-2"
          />
          <Link href="/mission" className={LINK}>
            The Mission
          </Link>
          <a
            href="https://instagram.com/sessionsguide"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK}
          >
            Instagram
          </a>
        </div>

        {/* Column two — for practitioners */}
        <div className="flex flex-col gap-5 sm:pt-2">
          <Link href="/join-sessions" className={LINK}>
            Join Sessions
          </Link>
          <Link href="/pricing" className={LINK}>
            Pricing
          </Link>
          <Link href="/dashboard" className={LINK}>
            Manage Your Sessions
          </Link>
        </div>

        {/* Column three — support */}
        <div className="flex flex-col gap-5 sm:pt-2">
          <Link href="/help" className={LINK}>
            Help
          </Link>
          <Link href="/contact" className={LINK}>
            Contact
          </Link>
        </div>
      </div>

      <div className="border-t border-light/15">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row sm:px-10">
          <p className="font-ui text-[0.68rem] uppercase tracking-[0.08em] text-light/60">
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
