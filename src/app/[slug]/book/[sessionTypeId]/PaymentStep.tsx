'use client'

import { useState } from 'react'
import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js'
import { Elements, PaymentElement, AddressElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { finalizeBooking, type BookingResult } from './actions'

// Stripe Elements payment step. Billing address, phone, and card are
// collected here, only on the on-platform charge path. Shared by 1:1 and
// group booking. A failed finalize shows its error and never a confirmed
// screen, including a seat that was released and refunded.

export function PaymentStep({
  publishableKey,
  stripeAccountId,
  clientSecret,
  bookingId,
  summary,
  onDone,
  onCancel,
}: {
  publishableKey: string
  stripeAccountId: string
  clientSecret: string
  bookingId: string
  summary: string
  onDone: (result: Extract<BookingResult, { ok: true }>) => void
  onCancel: () => void
}) {
  const [stripePromise] = useState<Promise<StripeJs | null>>(() =>
    loadStripe(publishableKey, { stripeAccount: stripeAccountId })
  )

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm bookingId={bookingId} summary={summary} onDone={onDone} onCancel={onCancel} />
    </Elements>
  )
}

function PaymentForm({
  bookingId,
  summary,
  onDone,
  onCancel,
}: {
  bookingId: string
  summary: string
  onDone: (result: Extract<BookingResult, { ok: true }>) => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const pay = async () => {
    if (!stripe || !elements) return
    setError(null)
    setSubmitting(true)

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })
    if (stripeError) {
      setError(stripeError.message ?? 'Payment did not complete. Try again or contact support.')
      setSubmitting(false)
      return
    }

    const finalized = await finalizeBooking(bookingId)
    if (!finalized.ok) {
      setError(finalized.error)
      setSubmitting(false)
      return
    }
    onDone(finalized)
  }

  return (
    <section>
      <h5 className="mb-4 text-dark">PAYMENT</h5>
      <p className="mb-6">{summary}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void pay()
        }}
        className="flex flex-col gap-5"
      >
        <AddressElement options={{ mode: 'billing', fields: { phone: 'always' } }} />
        <PaymentElement />

        {error && <p className="caption text-olive">{error}</p>}

        <div className="flex items-center gap-4">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
            BACK
          </button>
          <button type="submit" className="btn-primary" disabled={submitting || !stripe}>
            {submitting ? 'PROCESSING' : 'PAY AND BOOK'}
          </button>
        </div>
      </form>
    </section>
  )
}
