'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import type { BookableOccurrence } from '@/lib/groupBooking'
import MagicLinkForm from '@/components/magic-link-form'
import { bookGroupOccurrence, releaseHold, type BookingResult } from './actions'
import { PaymentStep } from './PaymentStep'

// Group booking. The client picks a scheduled occurrence. Format is fixed on
// that occurrence. The payload has a date range, a format label, and
// "Spots available" or "Full" — never a capacity or a seat count.

type SessionTypeView = {
  id: string
  name: string
  pricingModel: string
  price: number | null
  priceMin: number | null
  priceMax: number | null
  modalityName: string | null
}

type Props = {
  practitioner: { id: string; name: string; slug: string }
  sessionType: SessionTypeView
  occurrences: BookableOccurrence[]
  seeker: { name: string; email: string | null } | null
  initialOccurrenceId: string | null
  chargingNow: boolean
  paymentMethod: 'stripe' | 'offsite'
  connectReady: boolean
  cancellationPolicyCopy: string
  offsiteInstructions: string | null
  stripePublishableKey: string | null
  stripeAccountId: string | null
  disclaimer: string | null
}

type Step = 'pick' | 'signin' | 'details' | 'payment' | 'done'

const fieldClass =
  'w-full border border-border bg-surface px-4 py-3 font-body font-light text-dark outline-none focus:border-olive'

function priceLabel(st: SessionTypeView): string | null {
  if (st.pricingModel === 'fixed' && st.price) return `$${st.price.toFixed(2)}`
  if (st.pricingModel === 'sliding_scale' && st.priceMin !== null && st.priceMax !== null)
    return `$${st.priceMin.toFixed(2)} to $${st.priceMax.toFixed(2)}, you choose`
  if (st.pricingModel === 'donation') return 'By donation'
  return null
}

export default function GroupBookingFlow(props: Props) {
  const { practitioner, sessionType, occurrences } = props
  const initial = props.initialOccurrenceId
    ? occurrences.find((occurrence) => occurrence.id === props.initialOccurrenceId) ?? null
    : null

  const [step, setStep] = useState<Step>(() => {
    if (!initial) return 'pick'
    return props.seeker ? 'details' : 'signin'
  })
  const [occurrence, setOccurrence] = useState<BookableOccurrence | null>(initial)
  const [notes, setNotes] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [hold, setHold] = useState<{ bookingId: string; clientSecret: string } | null>(null)
  const [result, setResult] = useState<Extract<BookingResult, { ok: true }> | null>(null)

  const returnTo = occurrence
    ? `/${practitioner.slug}/book/${sessionType.id}?occurrence=${encodeURIComponent(occurrence.id)}`
    : `/${practitioner.slug}/book/${sessionType.id}`

  const place =
    occurrence?.format === 'virtual'
      ? 'Virtual'
      : `In\u2011person${occurrence?.city ? ` in ${occurrence.city}` : ''}`

  const amountRequired =
    props.chargingNow &&
    (sessionType.pricingModel === 'sliding_scale' || sessionType.pricingModel === 'donation')

  const choose = (next: BookableOccurrence) => {
    setOccurrence(next)
    setError(null)
    setStep(props.seeker ? 'details' : 'signin')
  }

  const submitDetails = () => {
    if (!occurrence) return
    setError(null)
    startTransition(async () => {
      if (props.chargingNow && (!props.stripePublishableKey || !props.stripeAccountId)) {
        setError(
          'Online payment is temporarily unavailable. Please try again later, or contact the Guide to arrange payment.'
        )
        return
      }
      const booked = await bookGroupOccurrence({
        practitionerId: practitioner.id,
        sessionTypeId: sessionType.id,
        occurrenceId: occurrence.id,
        notes,
        requestedAmount: amount ? Number(amount) : null,
      })
      if (!booked.ok) {
        setError(booked.error)
        return
      }
      if (booked.mode === 'hold') {
        setHold({ bookingId: booked.bookingId, clientSecret: booked.clientSecret })
        setStep('payment')
        return
      }
      setResult({
        ok: true,
        bookingId: booked.bookingId,
        status: booked.status,
        locationDisplay: booked.locationDisplay,
        whenLabel: booked.whenLabel,
      })
      setStep('done')
    })
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <p className="label mb-2 text-dark">BOOK A SESSION</p>
      <h2 className="mb-1">{sessionType.name}</h2>
      <p className="mb-1">
        With {practitioner.name}
        {sessionType.modalityName ? `. ${sessionType.modalityName}.` : ''}
      </p>
      {priceLabel(sessionType) && <p className="mb-1">{priceLabel(sessionType)}</p>}
      <p className="caption mb-8 text-dark opacity-70">{props.cancellationPolicyCopy}</p>

      {props.disclaimer && (
        <div className="mb-8 border border-border bg-surface px-4 py-3">
          <p className="caption text-dark">{props.disclaimer}</p>
        </div>
      )}

      {step === 'pick' && (
        <section>
          <h5 className="mb-4 text-dark">CHOOSE A DATE</h5>
          {occurrences.length === 0 ? (
            <div>
              <p>No upcoming dates.</p>
              <Link href={`/${practitioner.slug}`} className="btn-secondary mt-6 inline-block">
                BACK TO PROFILE
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {occurrences.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => choose(item)}
                    className="btn-secondary w-full text-left"
                  >
                    <span className="block">{item.rangeLabel}</span>
                    <span className="mt-1 block">{item.formatLabel}</span>
                    <span className="mt-1 block">{item.availability}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {step === 'signin' && occurrence && (
        <section>
          <h5 className="mb-4 text-dark">SIGN IN TO BOOK</h5>
          <p className="mb-1">{occurrence.rangeLabel}</p>
          <p className="mb-6">{place}</p>
          <p className="mb-6">
            {`Booking uses your ${BRAND_NAME} account. Enter your email and we will send you a sign\u2011in link. Your selected event is kept for when you return.`}
          </p>
          <MagicLinkForm
            next={returnTo}
            sentNote="The link brings you back here with your event still selected."
          />
          <button type="button" className="caption mt-8 text-olive" onClick={() => setStep('pick')}>
            BACK
          </button>
        </section>
      )}

      {step === 'details' && occurrence && props.seeker && (
        <section>
          <h5 className="mb-4 text-dark">YOUR DETAILS</h5>
          <p className="mb-1">{occurrence.rangeLabel}</p>
          <p className="mb-6">{place}</p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitDetails()
            }}
            className="flex flex-col gap-5"
          >
            <div>
              <p className="label mb-2 text-dark">BOOKING AS</p>
              <p>
                {props.seeker.name}
                {props.seeker.email ? ` (${props.seeker.email})` : ''}
              </p>
            </div>

            {amountRequired && (
              <div>
                <label htmlFor="amount" className="label mb-2 block text-dark">
                  {sessionType.pricingModel === 'donation' ? 'YOUR DONATION (USD)' : 'CHOOSE YOUR AMOUNT (USD)'}
                </label>
                <input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  min={sessionType.pricingModel === 'sliding_scale' ? sessionType.priceMin ?? 1 : 1}
                  max={sessionType.pricingModel === 'sliding_scale' ? sessionType.priceMax ?? undefined : undefined}
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={fieldClass}
                  required
                />
                {sessionType.pricingModel === 'sliding_scale' &&
                  sessionType.priceMin !== null &&
                  sessionType.priceMax !== null && (
                    <p className="caption mt-1 text-dark opacity-70">
                      BETWEEN ${sessionType.priceMin.toFixed(0)} AND ${sessionType.priceMax.toFixed(0)}. PAY WHAT WORKS FOR YOU.
                    </p>
                  )}
              </div>
            )}

            <div>
              <label htmlFor="booking_notes" className="label mb-2 block text-dark">
                NOTE TO YOUR GUIDE (OPTIONAL)
              </label>
              <textarea
                id="booking_notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={fieldClass}
              />
            </div>

            {error && <p className="caption text-olive">{error}</p>}

            <div className="flex items-center gap-4">
              <button type="button" className="btn-secondary" onClick={() => setStep('pick')}>
                BACK
              </button>
              <button type="submit" className="btn-primary" disabled={pending}>
                {pending ? 'ONE MOMENT' : props.chargingNow ? 'CONTINUE TO PAYMENT' : 'CONFIRM BOOKING'}
              </button>
            </div>
          </form>

          {!props.chargingNow && (props.paymentMethod === 'offsite' || !props.connectReady) && (
            <p className="caption mt-6 text-dark opacity-70">PAYMENT IS ARRANGED DIRECTLY WITH YOUR GUIDE.</p>
          )}
          {!props.chargingNow && props.paymentMethod === 'offsite' && props.offsiteInstructions && (
            <p className="caption mt-2 text-dark opacity-70">{props.offsiteInstructions}</p>
          )}
        </section>
      )}

      {step === 'payment' && hold && occurrence && props.stripePublishableKey && props.stripeAccountId && (
        <PaymentStep
          publishableKey={props.stripePublishableKey}
          stripeAccountId={props.stripeAccountId}
          clientSecret={hold.clientSecret}
          bookingId={hold.bookingId}
          summary={`${sessionType.name}. ${occurrence.rangeLabel}.`}
          onDone={(paid) => {
            setResult(paid)
            setStep('done')
          }}
          onCancel={() => {
            void releaseHold(hold.bookingId)
            setHold(null)
            setStep('details')
          }}
        />
      )}

      {step === 'done' && result && (
        <section>
          {result.status === 'confirmed' && <h2 className="mb-4">Your session is confirmed.</h2>}
          {result.status === 'pending_payment' && <h2 className="mb-4">Your session is reserved.</h2>}
          <p className="mb-1">{sessionType.name}</p>
          <p className="mb-1">{result.whenLabel}</p>
          {result.locationDisplay && <p className="mb-1">{result.locationDisplay}</p>}
          {result.status === 'pending_payment' && props.offsiteInstructions && (
            <div className="mt-4 border border-border bg-surface px-4 py-3">
              <p className="caption mb-1 text-dark">HOW TO PAY</p>
              <p>{props.offsiteInstructions}</p>
            </div>
          )}
          <p className="mt-4">The details are in your email.</p>
          <Link href={`/${practitioner.slug}`} className="btn-secondary mt-8 inline-block">
            BACK TO PROFILE
          </Link>
        </section>
      )}
    </div>
  )
}
