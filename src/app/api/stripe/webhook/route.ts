import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { reconcileRefundFromEvent } from '@/lib/cancellation'

// Stripe webhook. Foundational for Phase 4 — first consumer of
// STRIPE_WEBHOOK_SECRET. Every event is signature-verified, then deduped via
// the stripe_webhook_events ledger (a replayed event acks 200 and stops).
// Refund events are reconciled onto the booking. All writes use service role.
// Connect events arrive with an `account` field; the same endpoint handles them.

// Stripe needs the raw, unparsed body to verify the signature.
export const runtime = 'nodejs'

const REFUND_EVENTS = new Set([
  'charge.refunded',
  'charge.refund.updated',
  'refund.created',
  'refund.updated',
])

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!secret || !apiKey) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 })
  }

  const stripe = new Stripe(apiKey)
  const payload = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret)
  } catch {
    // Bad signature: do not process, do not retry-storm.
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Idempotency: claim the event id. A duplicate insert means we already
  // handled it (or are handling it) — ack and stop.
  const { error: claimError } = await admin
    .from('stripe_webhook_events')
    .insert({ id: event.id, type: event.type })
  if (claimError) {
    // Primary-key conflict (already processed) or transient DB error. Either
    // way, ack 200 so Stripe does not hammer us; a true transient loss is
    // acceptable given refunds are also written synchronously at cancel time.
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    if (REFUND_EVENTS.has(event.type)) {
      await reconcileRefundFromEvent(event)
    }
    // Other event types (payment, Connect account updates) are accepted and
    // recorded for idempotency; handlers are added as later features need them.
  } catch {
    // Processing failed after the event was claimed. Ack 200 to avoid a retry
    // storm; the synchronous cancel-time write is the source of truth for
    // refund state, so reconciliation is best-effort.
    return NextResponse.json({ received: true, reconciled: false })
  }

  return NextResponse.json({ received: true })
}
