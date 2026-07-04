import Image from 'next/image'
import SiteHeader from '@/components/site-header'

export const metadata = {
  title: 'The Mission | Sessions Guide',
}

export default function MissionPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-bg">
        <section className="px-6 pt-20 text-center sm:pt-28">
          <h1>The Mission</h1>
          <p className="mx-auto mt-8 max-w-[52ch] text-dark">
            Sessions Guide exists so the people who hold space for others can be
            held too.
          </p>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 py-20 sm:px-10 sm:py-28">
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <Image
              src="/images/stockPhotos/mystic.jpg"
              alt=""
              fill
              sizes="(min-width: 1200px) 1200px, 100vw"
              className="object-cover"
            />
          </div>
        </section>

        <section className="mx-auto max-w-[760px] px-6 pb-28">
          <p className="mb-6 text-dark">
            We build the quiet infrastructure behind a practice. Booking and
            payments, calendars and reviews, and the client relationships that
            carry a practitioner from one season to the next. When the logistics
            are handled well they disappear, and what is left is the work itself.
          </p>

          <h2 className="mb-8 mt-16">Built from the inside.</h2>
          <p className="mb-6 text-dark">
            I came to this as a cofounder of Conscious City Guide, where I spent a
            decade in close company with thousands of practitioners, healers,
            teachers, and guides. I watched extraordinary people do extraordinary
            work, and I watched them lose hours to the parts of the job no one
            trained them for. Chasing payments. Rebuilding a schedule after a move.
            Explaining a cancellation policy for the hundredth time.
          </p>
          <p className="mb-6 text-dark">
            Their gifts were singular. Their frustrations were shared. Sessions
            Guide is the answer I wished I could hand each of them, a home for the
            business of a practice that respects the practice itself.
          </p>
          <p className="text-dark">
            It is built for the light workers, and for the seekers looking for
            them. If you are a practitioner, I hope this gives you room to breathe.
            If you are looking for a guide, I hope it helps you find the right one.
          </p>
        </section>
      </main>
    </>
  )
}
