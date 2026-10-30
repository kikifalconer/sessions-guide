import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { reconcileRefundFromEvent } from '@/lib/cancellation'
import { finalizeBookingCore } from '@/lib/bookingFinalize'
import { refundSucceededChargeOnCancelledBooking } from '@/lib/orphanCharge'
import { priceIdToTier, highestTier, ACTIVE_SUBSCRIPTION_STATUSES } from '@/lib/tiers'

// Stripe webhook. Foundational for Phase 4 — first consumer of
// STRIPE_WEBHOOK_SECRET. Every event is signature-verified, then deduped via
// the stripe_webhook_events ledger (a replayed event acks 200 and stops).
// Refund events are reconciled onto the booking; payment_intent.succeeded
// finalizes the booking server-side so a lost client round-trip never loses a
// charge (C2). All writes use service role. Connect events arrive with an
// `account` field; the same endpoint handles them.

// Stripe needs the raw, unparsed body to verify the signature.
export const runtime = 'nodejs'

const REFUND_EVENTS = new Set([
  'charge.refunded',
  'charge.refund.updated',
  'refund.created',
  'refund.updated',
  'refund.failed', // H7: a failed refund must not be recorded as 'refunded'
])

type AdminClient = ReturnType<typeof createAdminClient>

async function handlePaymentSucceeded(
  stripe: Stripe,
  admin: AdminClient,
  event: Stripe.Event
): Promise<void> {
  const pi = event.data.object as Stripe.PaymentIntent
  const bookingId = (pi.metadata?.booking_id as string | undefined) ?? null

  const base = admin
    .from('bookings')
    .select('id, status, practitioner_id, stripe_refund_id')
  const { data: booking } = bookingId
    ? await base.eq('id', bookingId).maybeSingle()
    : await base.eq('stripe_payment_intent_id', pi.id).maybeSingle()

  if (!booking) {
    console.error('[stripe-webhook] payment_intent.succeeded for unknown booking', {
      paymentIntent: pi.id,
      bookingId,
    })
    return
  }

  if (booking.status === 'cancelled') {
    await refundSucceededChargeOnCancelledBooking(stripe, booking, pi.id, pi.amount_received)
    return
  }

  // pending_payment (or confirmed re-entry): finalize idempotently. The core
  // re-verifies the charge with Stripe and only the atomic transition winner
  // sends emails / creates the calendar event. Unauthenticated on purpose (F-19):
  // ownership is the webhook signature, not a seeker session.
  await finalizeBookingCore(booking.id)
}

// --- Subscription events (D24) -------------------------------------------
// Drive practitioners.subscription_tier from Stripe. All writes service-role.

function unixToIso(unix: number | null | undefined): string | null {
  return typeof unix === 'number' ? DateTime.fromSeconds(unix).toUTC().toISO() : null
}

// Period dates moved from the subscription onto its items in recent Stripe API
// versions; read the item first, fall back to the (older) top-level fields.
function periodDates(sub: Stripe.Subscription): { start: string | null; end: string | null } {
  const loose = sub as unknown as {
    current_period_start?: number | null
    current_period_end?: number | null
    items?: { data?: Array<{ current_period_start?: number | null; current_period_end?: number | null }> }
  }
  const item = loose.items?.data?.[0]
  return {
    start: unixToIso(item?.current_period_start ?? loose.current_period_start),
    end: unixToIso(item?.current_period_end ?? loose.current_period_end),
  }
}

async function practitionerIdByCustomer(
  admin: AdminClient,
  customerId: string
): Promise<string | null> {
  const { data } = await admin
    .from('practitioners')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return (data?.id as string | undefined) ?? null
}

// Upsert the subscriptions row from a Stripe subscription and sync the
// practitioner's tier. Resolves the practitioner via metadata (set at checkout /
// redemption) and falls back to the stored customer id. priceIdToTier throws on
// an unknown price so an unresolvable tier fails into the retry path rather than
// being written wrong.
async function upsertSubscriptionAndTier(
  admin: AdminClient,
  sub: Stripe.Subscription,
  metadataPractitionerId: string | null
): Promise<void> {
  const priceId = sub.items.data[0]?.price?.id
  if (!priceId) {
    console.error('[stripe-webhook] subscription has no price; skipping', sub.id)
    return
  }
  const { tier, cycle } = priceIdToTier(priceId)
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  const practitionerId =
    metadataPractitionerId ??
    (sub.metadata?.practitioner_id as string | undefined) ??
    (await practitionerIdByCustomer(admin, customerId))
  if (!practitionerId) {
    console.error('[stripe-webhook] subscription for unknown practitioner', {
      subscription: sub.id,
      customer: customerId,
    })
    return
  }

  const { start, end } = periodDates(sub)
  await admin.from('subscriptions').upsert(
    {
      practitioner_id: practitionerId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      tier,
      billing_cycle: cycle,
      status: sub.status,
      current_period_start: start,
      current_period_end: end,
      trial_end: unixToIso(sub.trial_end),
      updated_at: DateTime.utc().toISO(),
    },
    { onConflict: 'stripe_subscription_id' }
  )

  await admin.from('practitioners').update({ subscription_tier: tier }).eq('id', practitionerId)
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  admin: AdminClient,
  event: Stripe.Event
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session
  if (session.mode !== 'subscription') return // ignore non-subscription checkouts
  const subId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  if (!subId) return
  const sub = await stripe.subscriptions.retrieve(subId)
  await upsertSubscriptionAndTier(
    admin,
    sub,
    (session.metadata?.practitioner_id as string | undefined) ?? null
  )
}

async function handleSubscriptionUpdated(
  admin: AdminClient,
  event: Stripe.Event
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription
  await upsertSubscriptionAndTier(admin, sub, null)
}

// Cancellation / trial expiry -> free (D24/D26). The guard is load-bearing:
// grandfathered comped practitioners have NO subscriptions row (and no Stripe
// subscription), so this can never fire for them. Only a practitioner with a
// real row for this subscription is downgraded.
async function handleSubscriptionDeleted(
  admin: AdminClient,
  event: Stripe.Event
): Promise<void> {
  const sub = event.data.object as Stripe.Subscription
  const { data: row } = await admin
    .from('subscriptions')
    .select('id, practitioner_id')
    .eq('stripe_subscription_id', sub.id)
    .maybeSingle()
  if (!row) return // no row -> comped/grandfathered; never downgrade

  const nowIso = DateTime.utc().toISO()
  await admin
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: nowIso })
    .eq('id', row.id)

  // Recompute from what is LEFT rather than assuming 'free' (F-25). A
  // practitioner may hold another active subscription — an upgrade that
  // replaced rather than modified, or a second redemption — and hard-setting
  // 'free' here would strip a tier they are still paying for. The status
  // update above already excluded this row.
  const { data: remaining } = await admin
    .from('subscriptions')
    .select('tier')
    .eq('practitioner_id', row.practitioner_id)
    .in('status', [...ACTIVE_SUBSCRIPTION_STATUSES])

  await admin
    .from('practitioners')
    .update({ subscription_tier: highestTier(remaining ?? []) })
    .eq('id', row.practitioner_id)
}

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
    // A primary-key conflict means we already handled this event — ack 200.
    // Any OTHER error is transient: do NOT swallow it, or a payment_intent
    // finalization could be lost forever. Return 500 so Stripe retries.
    if (claimError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true })
    }
    console.error('[stripe-webhook] claim insert failed (transient)', event.id, claimError)
    return NextResponse.json({ error: 'claim_failed' }, { status: 500 })
  }

  try {
    if (REFUND_EVENTS.has(event.type)) {
      await reconcileRefundFromEvent(event)
    } else if (event.type === 'payment_intent.succeeded') {
      await handlePaymentSucceeded(stripe, admin, event)
    } else if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(stripe, admin, event)
    } else if (event.type === 'customer.subscription.updated') {
      await handleSubscriptionUpdated(admin, event)
    } else if (event.type === 'customer.subscription.deleted') {
      await handleSubscriptionDeleted(admin, event)
    }
    // Other event types (Connect account updates, etc.) are accepted and
    // recorded for idempotency; handlers are added as later features need them.
  } catch (err) {
    // Processing failed after the event was claimed. Release the claim and 500
    // so Stripe retries — otherwise a claimed-but-unprocessed event (e.g. a
    // lost payment finalization) could never be recovered.
    console.error('[stripe-webhook] handler failed; releasing claim for retry', event.type, event.id, err)
    await admin.from('stripe_webhook_events').delete().eq('id', event.id)
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
