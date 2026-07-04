import Image from 'next/image'
import Link from 'next/link'
import SiteHeader from '@/components/site-header'

export const metadata = {
  title: 'Join Sessions | Sessions Guide',
}

const BENEFITS: { title: string; body: string }[] = [
  {
    title: 'Keep what you earn',
    body: 'Sessions Guide runs on a flat subscription. We take nothing from your sessions. What a seeker pays you is yours.',
  },
  {
    title: 'Get paid your way',
    body: 'Collect payment through the platform, or arrange it directly with your client. You decide how money moves, on every session type you offer.',
  },
  {
    title: 'Carry your practice with you',
    body: 'Work from one city this month and another the next. Your clients, your availability, and your reviews travel with you, so you never rebuild from zero.',
  },
  {
    title: 'Spend your energy on the work',
    body: 'Booking, reminders, calendar sync, and cancellations run in the background, so your attention stays on the person in front of you.',
  },
  {
    title: 'Reviews earned honestly',
    body: 'Only seekers who have actually booked with you can leave a review. Your reputation is built by the people who have done the work.',
  },
  {
    title: 'A calendar that tells the truth',
    body: 'Connect your Google Calendar and your outside commitments block off automatically, so you are never double booked.',
  },
]

export default function JoinSessionsPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-bg">
        {/* h1 centered above the full-width hero image */}
        <section className="px-6 pb-12 pt-20 text-center sm:pt-24">
          <h1>Join Sessions</h1>
        </section>

        <div className="relative h-[56vh] min-h-[360px] w-full">
          <Image
            src="/images/stockPhotos/hands-magic-2.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>

        <section className="mx-auto max-w-[760px] px-6 pt-24 text-center">
          <p className="mx-auto max-w-[54ch] text-dark">
            Sessions Guide is a home for the business of a healing practice, made
            for practitioners who would rather spend their time in the work than in
            the admin around it. Here is what you can expect.
          </p>
        </section>

        <section className="mx-auto max-w-[1100px] px-6 py-24 sm:px-10">
          <div className="grid grid-cols-1 gap-x-16 gap-y-14 md:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.title}>
                <h3 className="mb-3">{b.title}</h3>
                <p className="max-w-[48ch] text-dark">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-[760px] px-6 py-24 text-center">
            <h2 className="mb-8">Come inside.</h2>
            <p className="mx-auto mb-10 max-w-[46ch] text-dark">
              Sessions Guide is opening by invitation while we onboard our first
              practitioners with care. Apply and we will be in touch.
            </p>
            <Link href="/" className="btn-primary">
              APPLY FOR AN INVITATION
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
