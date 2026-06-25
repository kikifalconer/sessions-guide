import Link from 'next/link'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveCancellationPolicy, CANCELLATION_POLICY_COPY } from '@/lib/booking'
import { computeRefund } from '@/lib/cancellation'
import CancelConfirm from './CancelConfirm'

export const metadata = { title: 'Cancel your session | sessions.guide' }

function whenLabel(startUtc: string, zone: string): string {
  return (
    DateTime.fromISO(startUtc).setZone(zone).toFormat('cccc, LLLL d, yyyy, h:mm a') +
    ` (${zone})`
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto w-full max-w-xl px-6 py-16">{children}</div>
    </main>
  )
}

export default async function CancelPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data } = await admin
    .from('bookings')
    .select(
      `id, status, payment_status, amount_paid, start_datetime, booked_format,
       session_types ( name, cancellation_policy ),
       practitioners ( full_name, slug, cancellation_policy ),
       availability_blocks ( timezone )`
    )
    .eq('seeker_token', token)
    .maybeSingle()

  if (!data) {
    return (
      <Shell>
        <h2 className="mb-4">This cancellation link is not valid.</h2>
        <p>Check the link in your confirmation email, or contact your practitioner directly.</p>
      </Shell>
    )
  }

  const st = data.session_types as unknown as { name: string; cancellation_policy: string | null } | null
  const p = data.practitioners as unknown as {
    full_name: string
    slug: string
    cancellation_policy: string | null
  } | null
  const block = data.availability_blocks as unknown as { timezone: string } | null

  const sessionName = st?.name ?? 'Session'
  const practitionerName = p?.full_name ?? 'your practitioner'
  const slug = p?.slug ?? null
  const zone = block?.timezone ?? 'UTC'
  const when = whenLabel(data.start_datetime, zone)

  if (data.status === 'completed') {
    return (
      <Shell>
        <h2 className="mb-4">This session has already taken place.</h2>
        <p>{sessionName} with {practitionerName}, {when}.</p>
      </Shell>
    )
  }

  if (data.status === 'cancelled') {
    return (
      <Shell>
        <h2 className="mb-4">This session is already cancelled.</h2>
        <p className="mb-1">{sessionName}</p>
        <p>{when}</p>
        {slug && (
          <Link href={`/${slug}`} className="btn-secondary mt-8 inline-block">
            BACK TO PROFILE
          </Link>
        )}
      </Shell>
    )
  }

  // Indicative refund preview (computed against now; the actual refund is
  // computed at the moment of cancellation).
  const policy = resolveCancellationPolicy(
    { cancellation_policy: st?.cancellation_policy ?? null } as never,
    { cancellation_policy: p?.cancellation_policy ?? null } as never
  )
  const amountPaid = data.amount_paid ?? 0
  const hoursBefore = DateTime.fromISO(data.start_datetime).diffNow('hours').hours
  const preview = computeRefund(policy, amountPaid, hoursBefore)
  const showRefundPreview = amountPaid > 0

  return (
    <Shell>
      <p className="label mb-2 text-dark">CANCEL YOUR SESSION</p>
      <h2 className="mb-6">{sessionName}</h2>

      <p className="mb-1">With {practitionerName}</p>
      <p className="mb-1">{when}</p>
      <p className="mb-6">{data.booked_format === 'virtual' ? 'Virtual' : 'In person'}</p>

      <div className="border border-border bg-surface px-4 py-4">
        <p className="caption mb-2 text-dark">CANCELLATION POLICY</p>
        <p>{CANCELLATION_POLICY_COPY[policy]}</p>
        {showRefundPreview && (
          <p className="mt-3">
            {preview.amount > 0
              ? `If you cancel now, your refund would be $${preview.amount.toFixed(2)}.`
              : 'If you cancel now, no refund would apply.'}
          </p>
        )}
      </div>

      <CancelConfirm token={token} practitionerSlug={slug} />
    </Shell>
  )
}
