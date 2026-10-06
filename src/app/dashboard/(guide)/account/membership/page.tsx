import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { BRAND_NAME } from '@/lib/brand'
import type { Tier } from '@/lib/tiers'
import { requirePractitioner } from '../../requirePractitioner'
import BillingClient from '../../billing/BillingClient'
import PageHeader from '@/components/dashboard/PageHeader'
import AccountNav from '@/components/dashboard/AccountNav'

export const metadata = { title: `membership | ${BRAND_NAME}` }

export default async function DashboardMembershipPage() {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()

  const [{ data: billingPractitioner }, { data: sub }] = await Promise.all([
    admin.from('practitioners').select('subscription_tier, stripe_customer_id').eq('id', practitioner.id).maybeSingle(),
    admin
      .from('subscriptions')
      .select('tier, billing_cycle, status, current_period_end, trial_end')
      .eq('practitioner_id', practitioner.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!billingPractitioner) redirect('/join')

  const tier = (billingPractitioner.subscription_tier ?? 'free') as Tier
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
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader title="Account" />
        <AccountNav current="membership" />
        <div className="mt-10">
          <BillingClient
            tier={tier}
            subscription={subscription}
            hasCustomer={Boolean(billingPractitioner.stripe_customer_id)}
          />
        </div>
      </div>
    </main>
  )
}
