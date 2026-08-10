import SiteHeader from '@/components/site-header'

export const metadata = {
  title: 'terms | sessions.guide',
}

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-bg">
        <div className="mx-auto max-w-[820px] px-6 py-24 sm:py-28">
          <h1>Terms</h1>
          <p className="caption mt-6 text-dark opacity-70">Last updated July 2026</p>

          <p className="mt-10 text-dark">
            These Terms of Service govern your use of Sessions Guide, operated by
            Sessions Guide Inc. By creating an account or using the platform, you
            agree to these terms. If you do not agree, please do not use Sessions
            Guide.
          </p>

          <section className="mt-12">
            <h3 className="mb-3">What Sessions Guide is</h3>
            <p className="text-dark">
              Sessions Guide is a platform that helps practitioners of
              transformational and healing work offer sessions, and helps seekers
              find and book them. Sessions Guide is not a party to the session
              itself. The agreement for a session is between the practitioner and
              the seeker.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Eligibility and accounts</h3>
            <p className="text-dark">
              You must be old enough to form a binding contract to use Sessions
              Guide. You are responsible for the accuracy of the information on your
              account and for keeping your login credentials secure. You are
              responsible for activity that happens under your account.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">For practitioners</h3>
            <p className="text-dark">
              Practitioners access the platform through a subscription. You keep the
              full amount a seeker pays for a session. Sessions Guide takes no
              commission on sessions. You are responsible for the services you
              offer, for the accuracy of your listings and availability, for
              honoring your stated cancellation policy, and for any licenses, taxes,
              or legal requirements that apply to your work. Payouts through the
              platform are handled by Stripe and are subject to the Stripe terms.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">For seekers</h3>
            <p className="text-dark">
              You may book sessions as a guest or with an account. When you book, you
              agree to the practitioner cancellation policy shown at the time of
              booking. If a session takes payment on the platform, you authorize the
              charge described at checkout. Some practitioners arrange payment
              directly with you.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Payments, subscriptions, and fees</h3>
            <p className="text-dark">
              Session payments made on the platform and practitioner subscriptions
              are processed by Stripe. Subscription fees are billed on the cycle
              shown when you subscribe and continue until cancelled. Except where the
              law or these terms require otherwise, fees already paid are not
              refundable.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Cancellations and refunds</h3>
            <p className="text-dark">
              Each practitioner sets a cancellation policy from a defined set of
              options. The policy that applies to a booking is shown before you
              confirm and again on the cancel screen. Where a refund applies, it is
              calculated according to that policy and issued to the original payment
              method. Sessions arranged for payment directly with a practitioner are
              settled between the practitioner and the seeker.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Reviews and content</h3>
            <p className="text-dark">
              Only a seeker who has completed a booking may leave a review, and only
              once per booking. You are responsible for the content you post, and it
              must be truthful and lawful. By posting content, you grant Sessions
              Guide a license to display and distribute it on the platform.
              Practitioners cannot remove honest reviews, though genuinely abusive
              content may be reported for review.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Acceptable use</h3>
            <p className="text-dark">
              Do not use Sessions Guide to break the law, to harm or deceive others,
              to infringe the rights of others, to interfere with the platform, or to
              access it through unauthorized means. We may suspend or remove accounts
              that do.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Wellness disclaimer</h3>
            <p className="text-dark">
              The practitioners on Sessions Guide offer a wide range of modalities.
              Their sessions are not a substitute for medical, psychological, or
              professional advice, diagnosis, or treatment. Sessions Guide does not
              endorse or verify the outcome of any session, and does not provide
              medical care. You are responsible for your own choices, and for
              complying with the laws of your jurisdiction. If you have a medical or
              mental health concern, please consult a qualified professional.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Third-party services</h3>
            <p className="text-dark">
              Sessions Guide relies on third-party services for payments, media,
              calendar, email, and hosting. Your use of those features may also be
              subject to the terms of those providers. We are not responsible for
              third-party services.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Intellectual property</h3>
            <p className="text-dark">
              Sessions Guide, its name, and its design are owned by Sessions Guide
              Inc. You keep ownership of the content you provide, and you grant us
              the license needed to operate the platform. You may not copy or reuse
              the platform beyond what these terms allow.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Disclaimers and limitation of liability</h3>
            <p className="text-dark">
              The platform is provided on an as is and as available basis, without
              warranties of any kind, to the fullest extent permitted by law. To the
              fullest extent permitted by law, Sessions Guide Inc. is not liable for
              indirect, incidental, or consequential damages, and our total
              liability is limited to the amount you paid us in the twelve months
              before the event giving rise to the claim.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Indemnification</h3>
            <p className="text-dark">
              You agree to indemnify Sessions Guide Inc. against claims and costs
              arising from your use of the platform, your content, or your breach of
              these terms.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Termination</h3>
            <p className="text-dark">
              You may stop using Sessions Guide at any time. We may suspend or end
              access if these terms are broken or to protect the platform and its
              community. Some provisions survive termination by their nature.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Governing law</h3>
            <p className="text-dark">
              These terms are governed by the laws of the state in which Sessions
              Guide Inc. is organized, without regard to conflict of law rules.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Changes to these terms</h3>
            <p className="text-dark">
              We may update these terms from time to time. When we do, we will revise
              the date above and, where appropriate, provide additional notice.
              Continued use of the platform means you accept the updated terms.
            </p>
          </section>

          <section className="mt-12">
            <h3 className="mb-3">Contact</h3>
            <p className="text-dark">
              Questions about these terms are welcome at hello@sessions.guide.
            </p>
          </section>
        </div>
      </main>
    </>
  )
}
