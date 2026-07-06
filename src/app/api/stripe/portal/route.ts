import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripeCustomer'
import { getSiteUrl } from '@/lib/siteUrl'

// Opens the Stripe billing portal for the logged-in practitioner (D24), where
// they manage payment method, invoices, and cancellation. Requires an existing
// platform customer — grandfathered comped practitioners have none and get a
// clear 400 rather than a broken portal.
export const runtime = 'nodejs'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: pr } = await admin
    .from('practitioners')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  const customerId = pr?.stripe_customer_id as string | null
  if (!customerId) {
    return NextResponse.json({ error: 'no_customer' }, { status: 400 })
  }

  try {
    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getSiteUrl()}/dashboard/billing`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe-portal] session creation failed', err)
    return NextResponse.json({ error: 'portal_failed' }, { status: 500 })
  }
}
