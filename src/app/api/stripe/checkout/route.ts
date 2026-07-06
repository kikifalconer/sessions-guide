import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, getOrCreateStripeCustomer } from '@/lib/stripeCustomer'
import { tierToPriceId, type PaidTier, type BillingCycle } from '@/lib/tiers'
import { getSiteUrl } from '@/lib/siteUrl'

// Starts a subscription Checkout Session for the logged-in practitioner (D24).
// Regular server client only resolves user.id; the customer is created/persisted
// via the service-role helper. mode: 'subscription'.
export const runtime = 'nodejs'

const PAID_TIERS: PaidTier[] = ['elevated', 'alchemist']
const CYCLES: BillingCycle[] = ['monthly', 'annual']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { tier?: unknown; cycle?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const tier = body.tier as PaidTier
  const cycle = body.cycle as BillingCycle
  if (!PAID_TIERS.includes(tier) || !CYCLES.includes(cycle)) {
    return NextResponse.json({ error: 'invalid_tier_or_cycle' }, { status: 400 })
  }

  let priceId: string
  try {
    priceId = tierToPriceId(tier, cycle)
  } catch (err) {
    console.error('[stripe-checkout] price env not configured', err)
    return NextResponse.json({ error: 'billing_not_configured' }, { status: 500 })
  }

  try {
    const customerId = await getOrCreateStripeCustomer(user.id)
    const stripe = getStripe()
    const base = getSiteUrl()

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/dashboard/billing?checkout=success`,
      cancel_url: `${base}/dashboard/billing?checkout=cancelled`,
      // Mirrored on the subscription so the webhook can attribute it even if the
      // checkout.session is not the event that reaches us first.
      subscription_data: { metadata: { practitioner_id: user.id } },
      metadata: { practitioner_id: user.id },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'no_checkout_url' }, { status: 500 })
    }
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe-checkout] session creation failed', err)
    return NextResponse.json({ error: 'checkout_failed' }, { status: 500 })
  }
}
