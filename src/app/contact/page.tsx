import SiteHeader from '@/components/site-header'
import ContactForm from '@/components/contact-form'

export const metadata = {
  title: 'contact | sessions.guide',
}

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-bg">
        <section className="px-6 pt-20 text-center sm:pt-28">
          <h1>Contact</h1>
          <p className="mx-auto mt-8 max-w-[52ch] text-dark">
            Whether you are a practitioner, a seeker, or simply curious, we would
            love to hear from you.
          </p>
        </section>

        <section className="mx-auto grid max-w-[1000px] grid-cols-1 gap-16 px-6 py-24 sm:px-10 md:grid-cols-[1fr_320px]">
          <div>
            <h2 className="mb-8">Send a note</h2>
            <ContactForm topic="contact" />
          </div>

          <div className="md:pt-2">
            <p className="label mb-4 text-dark">ELSEWHERE</p>
            <div className="flex flex-col gap-3">
              <a
                href="mailto:hello@sessions.guide"
                className="text-dark underline underline-offset-4 hover:text-olive"
              >
                hello@sessions.guide
              </a>
              <a
                href="https://instagram.com/sessionsguide"
                target="_blank"
                rel="noopener noreferrer"
                className="text-dark underline underline-offset-4 hover:text-olive"
              >
                Instagram
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
