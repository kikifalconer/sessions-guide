import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

// Platform-account Stripe helpers for subscription billing (D24). This is the
// PLATFORM customer that carries the practitioner's own subscription — distinct
// from Stripe Connect (stripe_account_id), which carries seeker session
// payments as Direct charges. The two never mix.

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key)
}

// Returns the practitioner's platform Stripe customer id, creating and
// persisting one on first use. Service-role write per CLAUDE.md — the regular
// server client is used only to resolve user.id; the id is passed in here.
export async function getOrCreateStripeCustomer(practitionerId: string): Promise<string> {
  const admin = createAdminClient()
  const { data: pr } = await admin
    .from('practitioners')
    .select('stripe_customer_id, full_name')
    .eq('id', practitionerId)
    .maybeSingle()

  if (pr?.stripe_customer_id) return pr.stripe_customer_id as string

  // Email comes from auth.users (the practitioner's login), not a profile column.
  const { data: userData } = await admin.auth.admin.getUserById(practitionerId)
  const email = userData?.user?.email ?? undefined

  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email,
    name: (pr?.full_name as string | null) ?? undefined,
    metadata: { practitioner_id: practitionerId },
  })

  await admin
    .from('practitioners')
    .update({ stripe_customer_id: customer.id })
    .eq('id', practitionerId)

  return customer.id
}
