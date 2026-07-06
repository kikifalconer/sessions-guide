// COPY: placeholder, pending rework
import Link from 'next/link'
import SiteHeader from '@/components/site-header'

export const metadata = { title: 'Help | sessions.guide' }

const LINK =
  'label block border border-border px-6 py-8 text-olive hover:border-olive'

export default function HelpLanding() {
  return (
    <>
      <SiteHeader />
      <main className="bg-bg">
        <section className="mx-auto max-w-[1200px] px-6 pb-24 pt-20">
          <h1>Help</h1>
          <p className="mt-6 max-w-[60ch] text-dark">
            Find answers below. Practitioners and seekers each have their own guide.
          </p>

          <div className="mt-12 grid gap-6 border-t border-border pt-12 sm:grid-cols-2">
            <Link href="/help/practitioners" className={LINK}>
              For practitioners
            </Link>
            <Link href="/help/seekers" className={LINK}>
              For seekers
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
