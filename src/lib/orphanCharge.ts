import 'server-only'

import Stripe from 'stripe'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'

// A charge succeeded for a booking that is already cancelled (expired hold,
// abandoned payment, or an occurrence cancel). Refund it on the connected
// account. Shared by the webhook and finalizeBookingCore so the two paths
// cannot double-refund: stripe_refund_id short-circuits, and the Stripe
// idempotency key is the booking id.

type CancelledCharge = {
  id: string
  practitioner_id: string
  stripe_refund_id: string | null
}

export async function refundSucceededChargeOnCancelledBooking(
  stripe: Stripe,
  booking: CancelledCharge,
  paymentIntentId: string,
  amountReceived: number
): Promise<boolean> {
  if (booking.stripe_refund_id) return true
  if (!amountReceived || amountReceived <= 0) return true

  const admin = createAdminClient()
  const { data: pr } = await admin
    .from('practitioners')
    .select('stripe_account_id')
    .eq('id', booking.practitioner_id)
    .maybeSingle()
  const account = pr?.stripe_account_id
  if (!account) {
    console.error(
      '[stripe-webhook] ORPHAN CHARGE on cancelled booking with no connected account to refund',
      { bookingId: booking.id, paymentIntent: paymentIntentId }
    )
    return false
  }

  console.error(
    '[stripe-webhook] LOUD: payment succeeded on an already-cancelled booking — refunding',
    { bookingId: booking.id, paymentIntent: paymentIntentId, amountReceived }
  )

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: amountReceived,
        metadata: { booking_id: booking.id },
      },
      { stripeAccount: account, idempotencyKey: `reconcile-orphan:${booking.id}` }
    )
    const { error } = await admin
      .from('bookings')
      .update({
        payment_status: 'refunded',
        amount_refunded: amountReceived / 100,
        stripe_refund_id: refund.id,
        updated_at: DateTime.utc().toISO(),
      })
      .eq('id', booking.id)
    if (error) {
      console.error('[stripe-webhook] orphan-charge refund recorded in Stripe but not on the booking', booking.id, error)
      return false
    }
    return true
  } catch (err) {
    console.error('[stripe-webhook] orphan-charge refund failed', booking.id, paymentIntentId, err)
    return false
  }
}
