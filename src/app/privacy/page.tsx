import SiteHeader from '@/components/site-header'

export const metadata = {
  title: 'privacy | sessions.guide',
}

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-bg">
        <div className="mx-auto max-w-[820px] px-6 py-24 sm:py-28">
          <h1>Privacy</h1>
          <p className="caption mt-6 text-dark opacity-70">Last updated July 2026</p>

          <p className="mt-10 text-dark">
            This Privacy Policy explains what information Sessions Guide Inc.
            collects, how we use it, and the choices you have. It applies to the
            Sessions Guide website and services. By using Sessions Guide, you agree
            to the practices described here.
          </p>

          <section className="mt-12">
            <h3 className="mb-3">Who we are</h3>
            <p className="text-dark">
              Sessions Guide is a booking platform that connects seekers with
              practitioners of transformational and healing work. When we say we,
              us, or our, we mean Sessions Guide Inc.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Information we collect</h3>
            <p className="mb-4 text-dark">
              We collect information you give us and information created as you use
              the platform:
            </p>
            <ul className="flex list-disc flex-col gap-2 pl-6 text-dark">
              <li>
                Account and profile details, such as name, email, biography, links,
                and the photos or media you upload.
              </li>
              <li>
                Booking details, such as the sessions you book or offer, the times,
                the format, and any notes you add.
              </li>
              <li>
                Payment details, which are handled by our payment processor. We do
                not store full card numbers on our own systems.
              </li>
              <li>
                Calendar data, if a practitioner chooses to connect a calendar so
                that availability stays accurate.
              </li>
              <li>
                Messages you send us, including inquiries, help requests, and
                reviews.
              </li>
              <li>
                Usage and device information, such as pages viewed and general
                technical data, collected to keep the service working and secure.
              </li>
            </ul>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">How we use information</h3>
            <p className="text-dark">
              We use information to provide and improve the platform, to process
              bookings and payments, to send transactional messages such as
              confirmations and cancellation notices, to support you, to keep the
              service safe, and to comply with our legal obligations. We do not sell
              your personal information.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">How we share information</h3>
            <p className="mb-4 text-dark">
              We share information only as needed to run the platform:
            </p>
            <ul className="flex list-disc flex-col gap-2 pl-6 text-dark">
              <li>
                With practitioners and seekers, so a session can be arranged. A
                practitioner receives the details needed to prepare for a booking. A
                seeker sees the public profile of a practitioner.
              </li>
              <li>
                With service providers who process data on our behalf, including
                hosting, database, payment, media, calendar, and email providers.
                They may act only under our instructions.
              </li>
              <li>
                When required by law, to protect rights and safety, or in connection
                with a business transfer.
              </li>
            </ul>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Payments</h3>
            <p className="text-dark">
              Payments made on the platform are processed by Stripe. When you pay
              through Sessions Guide, your payment information is provided directly
              to Stripe and handled under the Stripe privacy terms. Some
              practitioners arrange payment with you directly, outside the platform.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Cookies and similar technologies</h3>
            <p className="text-dark">
              We use cookies and similar technologies to keep you signed in, to
              remember your preferences, and to understand how the platform is used.
              You can control cookies through your browser settings, though some
              features may not work without them.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Data retention</h3>
            <p className="text-dark">
              We keep information for as long as your account is active and as needed
              to provide the service, resolve disputes, and meet legal requirements.
              When information is no longer needed, we remove or de-identify it.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Your choices and rights</h3>
            <p className="text-dark">
              You may review and update your profile at any time, and you may ask us
              to access, correct, or delete your personal information. Depending on
              where you live, you may have additional rights. To make a request,
              write to us at the address below.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Security</h3>
            <p className="text-dark">
              We use reasonable technical and organizational measures to protect your
              information. No method of storage or transmission is perfectly secure,
              so we cannot guarantee absolute security.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Children</h3>
            <p className="text-dark">
              Sessions Guide is intended for adults. It is not directed to children
              under the age of majority, and we do not knowingly collect their
              personal information.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Changes to this policy</h3>
            <p className="text-dark">
              We may update this policy from time to time. When we do, we will revise
              the date above and, where appropriate, provide additional notice.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Contact</h3>
            <p className="text-dark">
              Questions about privacy are welcome at hello@sessions.guide.
            </p>
          </section>
        </div>
      </main>
    </>
  )
}
