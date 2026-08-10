import Link from 'next/link'
import SiteHeader from '@/components/site-header'

export const metadata = {
  title: 'pricing | sessions.guide',
}

const TIERS: {
  name: string
  price: string
  for: string
  features: string[]
  highlight: boolean
}[] = [
  {
    name: 'Trial',
    price: 'Free',
    for: 'Your first month, on us.',
    features: [
      'Full access to the core tools',
      'List your session types',
      'Take real bookings',
      'Connect your calendar',
    ],
    highlight: false,
  },
  {
    name: 'Basic',
    // {/* PLACEHOLDER PRICE — set the founding rate before public launch */}
    price: 'Founding rate',
    for: 'Everything you need to run your practice.',
    features: [
      'Unlimited session types and availability',
      'Payments through Stripe or arranged directly',
      'Google Calendar sync',
      'Verified reviews and client records',
      'No fees taken from your sessions',
    ],
    highlight: true,
  },
  {
    name: 'Elevated',
    // {/* PLACEHOLDER PRICE — set the founding rate before public launch */}
    price: 'Founding rate',
    for: 'For established practitioners who want more reach.',
    features: [
      'Everything in Basic',
      'Featured placement in discovery',
      'A richer, more expressive profile',
      'Priority support',
      'Early access to new tools',
    ],
    highlight: false,
  },
]

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-bg">
        <section className="px-6 pt-20 text-center sm:pt-28">
          <h1>Pricing</h1>
          <p className="mx-auto mt-8 max-w-[52ch] text-dark">
            One flat subscription. We take nothing from your sessions, ever. What a
            seeker pays you is yours to keep.
          </p>
        </section>

        <section className="mx-auto max-w-[1100px] px-6 py-24 sm:px-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`flex flex-col border bg-surface px-8 py-10 ${
                  tier.highlight ? 'border-olive' : 'border-border'
                }`}
              >
                <p className="label text-dark">{tier.name}</p>
                <p className="mt-6 font-heading text-[2rem] font-light text-olive">
                  {tier.price}
                </p>
                <p className="mt-3 text-dark">{tier.for}</p>

                <ul className="mt-8 flex flex-col gap-3">
                  {tier.features.map((f) => (
                    <li key={f} className="text-dark">
                      {f}
                    </li>
                  ))}
                </ul>

                <Link href="/" className="btn-primary mt-10 self-start">
                  APPLY
                </Link>
              </div>
            ))}
          </div>

          <p className="caption mt-12 text-center text-dark opacity-70">
            Founding pricing is shared with your invitation while we onboard our
            first practitioners.
          </p>
        </section>
      </main>
    </>
  )
}
