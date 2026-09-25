import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { BRAND_NAME } from '@/lib/brand'
import { requirePractitioner } from '../requirePractitioner'
import PageHeader from '@/components/dashboard/PageHeader'
import AccountNav from '@/components/dashboard/AccountNav'

export const metadata = { title: `abundance | ${BRAND_NAME}` }

export default async function DashboardAbundancePage() {
  const practitioner = await requirePractitioner()
  const admin = createAdminClient()
  const nowUtc = DateTime.utc()
  const monthStartIso = nowUtc.startOf('month').toISO() as string
  const monthEndIso = nowUtc.endOf('month').toISO() as string

  const { data: paidRows } = await admin
    .from('bookings')
    .select('start_datetime, amount_paid, amount_refunded')
    .eq('practitioner_id', practitioner.id)
    .eq('payment_status', 'paid')

  const rows = (paidRows ?? []).map((row) => ({
    startUtc: row.start_datetime as string,
    net: ((row.amount_paid as number | null) ?? 0) - ((row.amount_refunded as number | null) ?? 0),
  }))

  const thisMonth = rows.filter((r) => r.startUtc >= monthStartIso && r.startUtc <= monthEndIso)
  const monthTotal = thisMonth.reduce((sum, r) => sum + r.net, 0)
  const allTimeTotal = rows.reduce((sum, r) => sum + r.net, 0)

  return (
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          title="Account"
          description="Stripe earnings from sessions. This is separate from your membership."
        />
        <AccountNav current="abundance" />

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="py-4">
            <p className="caption text-dark/60">This month</p>
            <p className="mt-2 text-dark">${monthTotal.toFixed(2)}</p>
          </div>
          <div className="py-4">
            <p className="caption text-dark/60">All time</p>
            <p className="mt-2 text-dark">${allTimeTotal.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </main>
  )
}
