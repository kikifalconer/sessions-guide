import { NextRequest, NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { cancelHeldPaymentIntent } from '@/lib/paymentIntents'

// Cancels stale unpaid group holds so a seat stops counting as taken even
// when nobody else tries to book. Offsite and Guide-added seats are unpaid
// only in the payment_status sense of 'unpaid', and those rows are excluded.
// Same auth as the other Vercel crons: missing secret fails closed.
export const runtime = 'nodejs'

const HOLD_EXPIRY_MINUTES = 30

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'cron_secret_not_configured' }, { status: 500 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const cutoff = DateTime.utc().minus({ minutes: HOLD_EXPIRY_MINUTES }).toISO()
  if (!cutoff) return NextResponse.json({ error: 'expire_failed' }, { status: 500 })
  const { data: expired, error } = await admin
    .from('bookings')
    .update({ status: 'cancelled', cancellation_reason: 'payment_abandoned' })
    .not('occurrence_id', 'is', null)
    .eq('status', 'pending_payment')
    .eq('payment_status', 'unpaid')
    .lt('created_at', cutoff)
    .select('id, practitioner_id, stripe_payment_intent_id')

  if (error) {
    console.error('expire-group-holds: update failed', error.message)
    return NextResponse.json({ error: 'expire_failed' }, { status: 500 })
  }

  const rows = expired ?? []
  const byPractitioner = new Map<string, string[]>()
  for (const row of rows) {
    const paymentIntentId = row.stripe_payment_intent_id as string | null
    if (!paymentIntentId) continue
    const practitionerId = row.practitioner_id as string
    const list = byPractitioner.get(practitionerId) ?? []
    list.push(paymentIntentId)
    byPractitioner.set(practitionerId, list)
  }

  for (const [practitionerId, paymentIntentIds] of byPractitioner) {
    const { data: practitioner } = await admin
      .from('practitioners')
      .select('stripe_account_id')
      .eq('id', practitionerId)
      .maybeSingle()
    for (const paymentIntentId of paymentIntentIds) {
      await cancelHeldPaymentIntent({
        paymentIntentId,
        stripeAccountId: (practitioner?.stripe_account_id as string | null) ?? null,
      })
    }
  }

  return NextResponse.json({ expired: rows.length })
}
