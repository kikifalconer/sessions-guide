import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SiteHeader from '@/components/site-header'
import BillingClient from './BillingClient'
import type { Tier } from '@/lib/tiers'

export const metadata = { title: 'billing | sessions.guide' }

// Dashboard billing surface (D24). Server resolves the practitioner's tier and
// most recent subscription row (service-role read); the interactive surface is
// BillingClient. A comped/grandfathered practitioner is 'elevated' with no
// subscription row and no customer — handled explicitly downstream.
export default async function BillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/join')

  const admin = createAdminClient()
  const { data: practitioner } = await admin
    .from('practitioners')
    .select('subscription_tier, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!practitioner) redirect('/join')

  const tier = (practitioner.subscription_tier ?? 'free') as Tier

  const { data: sub } = await admin
    .from('subscriptions')
    .select('tier, billing_cycle, status, current_period_end, trial_end')
    .eq('practitioner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const subscription = sub
    ? {
        tier: sub.tier as string,
        cycle: sub.billing_cycle as string,
        status: sub.status as string,
        currentPeriodEnd: (sub.current_period_end as string | null) ?? null,
        trialEnd: (sub.trial_end as string | null) ?? null,
      }
    : null

  return (
    <>
      <SiteHeader />
      <BillingClient
        tier={tier}
        subscription={subscription}
        hasCustomer={Boolean(practitioner.stripe_customer_id)}
      />
    </>
  )
}
