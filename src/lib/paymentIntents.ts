import Stripe from 'stripe'

// Server-side PaymentIntent lifecycle helpers (RC1). The booking flow creates
// PaymentIntents on the practitioner's CONNECTED account (Direct charges), so
// every call here is Connect-scoped with { stripeAccount }. These helpers are
// best-effort and NEVER throw: a Stripe failure must not block the DB status
// change the caller is committing.

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  return key ? new Stripe(key) : null
}

// PaymentIntent statuses that can still be cancelled via the API. A 'succeeded'
// or 'processing' PI cannot be cancelled and is intentionally left for webhook
// reconciliation (C2); 'canceled' is already terminal.
const CANCELLABLE = new Set([
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'requires_capture',
])

// Cancels the PaymentIntent backing an abandoned/expired hold so it can never
// be charged after the slot has been released. If the PI already succeeded
// (money captured before we cancelled), it is left in place for the
// payment_intent.succeeded webhook to reconcile + refund (C2).
export async function cancelHeldPaymentIntent(params: {
  paymentIntentId: string | null
  stripeAccountId: string | null
}): Promise<void> {
  const { paymentIntentId, stripeAccountId } = params
  if (!paymentIntentId || !stripeAccountId) return
  const stripe = getStripe()
  if (!stripe) return
  try {
    const intent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      {},
      { stripeAccount: stripeAccountId }
    )
    if (!CANCELLABLE.has(intent.status)) return
    await stripe.paymentIntents.cancel(
      paymentIntentId,
      { cancellation_reason: 'abandoned' },
      { stripeAccount: stripeAccountId }
    )
  } catch (err) {
    // Best-effort: log and move on. The DB row is already released.
    console.error('cancelHeldPaymentIntent failed', paymentIntentId, err)
  }
}
