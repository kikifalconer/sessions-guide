import SiteHeader from '@/components/site-header'
import ContactForm from '@/components/contact-form'

export const metadata = {
  title: 'Help | Sessions Guide',
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Do I need an account to book a session?',
    a: 'No. You can book as a guest with just your name and email. If a session takes payment on the platform, you will add your card at checkout. You can always claim your booking to an account later.',
  },
  {
    q: 'How do payments work?',
    a: 'It depends on the practitioner. Some collect payment through the platform at the time of booking, and some arrange payment with you directly. The booking screen tells you which applies before you confirm.',
  },
  {
    q: 'How do I cancel a booking?',
    a: 'Every confirmation email includes a cancel link. Open it to see the practitioner cancellation policy and any refund that applies, then confirm. If you cannot find the email, write to us and we will help.',
  },
  {
    q: 'What is the cancellation and refund policy?',
    a: 'Each practitioner sets their own policy from a small set of options, ranging from flexible to strict. The policy that applies to your session is shown before you book and again on the cancel screen. Refunds are handled automatically where they apply.',
  },
  {
    q: 'How do I leave a review?',
    a: 'Only seekers who have actually completed a session can review, so the link comes to you by email after your session. One review per booking keeps things honest.',
  },
  {
    q: 'I want to offer sessions. How do I join?',
    a: 'Sessions Guide is opening by invitation while we onboard our first practitioners. Apply from the home page or the Join Sessions page, and we will be in touch.',
  },
  {
    q: 'I have an invitation code. What now?',
    a: 'Enter it on the home page. Once it is recognised, you can create your account and set up your profile, session types, and availability.',
  },
  {
    q: 'How does calendar sync work?',
    a: 'Practitioners can connect a Google Calendar so booked sessions appear there and outside commitments block off time on the platform. It keeps a schedule honest and prevents double booking.',
  },
]

export default function HelpPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-bg">
        <section className="px-6 pt-20 text-center sm:pt-28">
          <h1>Help</h1>
          <p className="mx-auto mt-8 max-w-[52ch] text-dark">
            A few of the questions we hear most. If yours is not here, send it
            along and we will get back to you.
          </p>
        </section>

        <section className="mx-auto max-w-[760px] px-6 py-24">
          <div className="flex flex-col gap-12">
            {FAQ.map((item) => (
              <div key={item.q}>
                <h3 className="mb-3">{item.q}</h3>
                <p className="text-dark">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-[760px] px-6 py-24">
            <h2 className="mb-4">Still need a hand?</h2>
            <p className="mb-10 max-w-[52ch] text-dark">
              Tell us what is going on and we will help you sort it out.
            </p>
            <ContactForm topic="help" />
          </div>
        </section>
      </main>
    </>
  )
}
