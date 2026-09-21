import { redirect } from 'next/navigation'
import { DateTime } from 'luxon'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { requirePractitioner } from '../requirePractitioner'
import BillingClient from '../billing/BillingClient'
import type { Tier } from '@/lib/tiers'

export const metadata = { title: `abundance | ${BRAND_NAME}` }

// D30 pass 1: consolidates the old BILLING route into ABUNDANCE (target IA:
// "earnings, billing" in one bucket). Both sections below are unchanged
// from their source files (this page's own prior earnings content, and
// billing/page.tsx's practitioner/subscription reads + BillingClient) --
// glue only, no query or component logic changed. /dashboard/billing now
// redirects here.
export default async function DashboardAbundancePage() {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()
  const nowUtc = DateTime.utc()
  const monthStartIso = nowUtc.startOf('month').toISO() as string
  const monthEndIso = nowUtc.endOf('month').toISO() as string

  const { data: paidRows } = await admin
    .from('bookings')
    .select('id, start_datetime, amount_paid, amount_refunded, guest_name, seeker_id, session_types ( name )')
    .eq('practitioner_id', practitioner.id)
    .eq('payment_status', 'paid')
    .order('start_datetime', { ascending: false })

  const seekerIds = Array.from(
    new Set((paidRows ?? []).map((r) => r.seeker_id as string | null).filter(Boolean))
  ) as string[]
  const seekerNameById: Record<string, string> = {}
  if (seekerIds.length > 0) {
    const { data: seekerRows } = await admin.from('seekers').select('id, full_name').in('id', seekerIds)
    for (const row of seekerRows ?? []) {
      seekerNameById[row.id as string] = row.full_name as string
    }
  }

  const rows = (paidRows ?? []).map((row) => {
    const st = row.session_types as unknown as { name: string } | null
    const seekerId = row.seeker_id as string | null
    const clientName = seekerId
      ? (seekerNameById[seekerId] ?? 'A client')
      : ((row.guest_name as string | null) ?? 'A client')
    const net = ((row.amount_paid as number | null) ?? 0) - ((row.amount_refunded as number | null) ?? 0)
    return {
      id: row.id as string,
      startUtc: row.start_datetime as string,
      sessionName: st?.name ?? 'Session',
      clientName,
      net,
    }
  })

  const thisMonth = rows.filter((r) => r.startUtc >= monthStartIso && r.startUtc <= monthEndIso)
  const monthTotal = thisMonth.reduce((sum, r) => sum + r.net, 0)
  const allTimeTotal = rows.reduce((sum, r) => sum + r.net, 0)

  // Billing section -- same reads as the old billing/page.tsx, unchanged.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/join')

  const { data: billingPractitioner } = await admin
    .from('practitioners')
    .select('subscription_tier, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!billingPractitioner) redirect('/join')

  const tier = (billingPractitioner.subscription_tier ?? 'free') as Tier

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
    <main className="px-8 py-12">
      <div className="mx-auto w-full max-w-[1200px]">
        <h1>Abundance</h1>

        <div className="mt-4">
          <h2>Earnings</h2>
          <p className="mt-4 max-w-[60ch] text-dark">
            Payments processed through Stripe only. Does not include sessions paid outside the
            platform.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="border border-border bg-surface px-4 py-4">
              <p className="caption text-dark/60">THIS MONTH</p>
              <p className="mt-2 text-dark">${monthTotal.toFixed(2)}</p>
            </div>
            <div className="border border-border bg-surface px-4 py-4">
              <p className="caption text-dark/60">ALL TIME</p>
              <p className="mt-2 text-dark">${allTimeTotal.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-12">
            <h3>Paid sessions</h3>
            {rows.length === 0 ? (
              <p className="mt-4 max-w-[60ch] text-dark">
                Nothing processed through Stripe yet.
              </p>
            ) : (
              <ul className="mt-6 flex flex-col gap-2">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between border border-border bg-surface px-4 py-3"
                  >
                    <span className="caption text-dark">
                      {r.sessionName} · {r.clientName}
                    </span>
                    <span className="flex items-center gap-4">
                      <span className="caption text-dark/60">
                        {DateTime.fromISO(r.startUtc).toFormat('ccc, LLL d, yyyy')}
                      </span>
                      <span className="caption text-dark">${r.net.toFixed(2)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-16">
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
