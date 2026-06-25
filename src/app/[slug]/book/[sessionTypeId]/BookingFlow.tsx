'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { DateTime } from 'luxon'
import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js'
import { Elements, PaymentElement, AddressElement, useStripe, useElements } from '@stripe/react-stripe-js'
import type { Slot } from '@/lib/availability'
import {
  createBooking,
  createBookingHold,
  finalizeBooking,
  releaseHold,
  type BookingInput,
  type BookingResult,
} from './actions'

// Multi-step seeker booking flow. Low-anxiety by design: no countdowns, no
// urgency copy, no exclamation points. City-only location until confirmation.

type SessionTypeView = {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  format: string
  pricingModel: string
  price: number | null
  priceMin: number | null
  priceMax: number | null
  modalityName: string | null
}

type Props = {
  practitioner: { id: string; name: string; slug: string }
  sessionType: SessionTypeView
  slots: Slot[]
  blockCities: Record<string, string | null>
  chargingNow: boolean
  paymentMethod: 'stripe' | 'offsite'
  connectReady: boolean
  confirmationMode: string
  cancellationPolicyCopy: string
  offsiteInstructions: string | null
  stripePublishableKey: string | null
  stripeAccountId: string | null
  disclaimer: string | null
}

type Step = 'time' | 'format' | 'details' | 'payment' | 'done'

const fieldClass =
  'w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive'

function priceLabel(st: SessionTypeView): string | null {
  if (st.pricingModel === 'fixed' && st.price) return `$${st.price.toFixed(2)}`
  if (st.pricingModel === 'sliding_scale' && st.priceMin !== null && st.priceMax !== null)
    return `$${st.priceMin.toFixed(2)} to $${st.priceMax.toFixed(2)}, you choose`
  if (st.pricingModel === 'donation') return 'By donation'
  return null
}

export default function BookingFlow(props: Props) {
  const { practitioner, sessionType, slots, blockCities } = props

  const [step, setStep] = useState<Step>('time')
  const [slot, setSlot] = useState<Slot | null>(null)
  const [bookedFormat, setBookedFormat] = useState<'virtual' | 'in_person' | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [hold, setHold] = useState<{ bookingId: string; clientSecret: string } | null>(null)
  const [result, setResult] = useState<Extract<BookingResult, { ok: true }> | null>(null)

  const localZone = useMemo(() => DateTime.local().zoneName ?? 'your local time', [])

  // Slots grouped by the seeker's local date.
  const slotsByDate = useMemo(() => {
    const groups = new Map<string, Slot[]>()
    for (const s of slots) {
      const key = DateTime.fromISO(s.startUtc).toLocal().toFormat('cccc, LLLL d')
      const list = groups.get(key) ?? []
      list.push(s)
      groups.set(key, list)
    }
    return groups
  }, [slots])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Which formats does the chosen slot actually offer for this session type?
  const formatOptions = useMemo((): ('virtual' | 'in_person')[] => {
    if (!slot) return []
    const fromBlock: ('virtual' | 'in_person')[] =
      slot.blockFormat === 'both' ? ['virtual', 'in_person'] : [slot.blockFormat]
    if (sessionType.format === 'both') return fromBlock
    return fromBlock.filter((f) => f === sessionType.format)
  }, [slot, sessionType.format])

  const chooseSlot = (s: Slot) => {
    setSlot(s)
    setError(null)
    const fromBlock: ('virtual' | 'in_person')[] =
      s.blockFormat === 'both' ? ['virtual', 'in_person'] : [s.blockFormat]
    const options = sessionType.format === 'both' ? fromBlock : fromBlock.filter((f) => f === sessionType.format)
    if (options.length === 1) {
      setBookedFormat(options[0])
      setStep('details')
    } else {
      setBookedFormat(null)
      setStep('format')
    }
  }

  const bookingInput = (): BookingInput | null => {
    if (!slot || !bookedFormat) return null
    return {
      practitionerId: practitioner.id,
      sessionTypeId: sessionType.id,
      blockId: slot.blockId,
      startUtc: slot.startUtc,
      bookedFormat,
      name,
      email,
      notes,
      requestedAmount: amount ? Number(amount) : null,
    }
  }

  const submitDetails = () => {
    const input = bookingInput()
    if (!input) return
    setError(null)
    startTransition(async () => {
      if (props.chargingNow) {
        const held = await createBookingHold(input)
        if (!held.ok) {
          setError(held.error)
          return
        }
        setHold({ bookingId: held.bookingId, clientSecret: held.clientSecret })
        setStep('payment')
      } else {
        const booked = await createBooking(input)
        if (!booked.ok) {
          setError(booked.error)
          return
        }
        setResult(booked)
        setStep('done')
      }
    })
  }

  const slotLabel = slot
    ? DateTime.fromISO(slot.startUtc).toLocal().toFormat("cccc, LLLL d, h:mm a") + ` (${localZone})`
    : ''
  const city = slot ? blockCities[slot.blockId] : null

  const amountRequired =
    props.chargingNow &&
    (sessionType.pricingModel === 'sliding_scale' || sessionType.pricingModel === 'donation')

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <p className="label mb-2 text-dark">BOOK A SESSION</p>
      <h2 className="mb-1">{sessionType.name}</h2>
      <p className="mb-1">
        {sessionType.durationMinutes} minutes with {practitioner.name}
        {sessionType.modalityName ? `. ${sessionType.modalityName}.` : ''}
      </p>
      {priceLabel(sessionType) && <p className="mb-1">{priceLabel(sessionType)}</p>}
      <p className="caption mb-8 text-dark opacity-70">{props.cancellationPolicyCopy}</p>

      {props.disclaimer && (
        <div className="mb-8 border border-border bg-surface px-4 py-3">
          <p className="caption text-dark">{props.disclaimer}</p>
        </div>
      )}

      {step === 'time' && (
        <section>
          <h5 className="mb-4 text-dark">CHOOSE A TIME</h5>
          {slots.length === 0 ? (
            <div>
              <p>
                No times are open right now. You can inquire with {practitioner.name} directly
                from their profile.
              </p>
              <Link href={`/${practitioner.slug}`} className="btn-secondary mt-6 inline-block">
                BACK TO PROFILE
              </Link>
            </div>
          ) : (
            <>
              <p className="caption mb-4 text-dark opacity-70">TIMES SHOWN IN {localZone.toUpperCase()}</p>
              <div className="mb-6 flex flex-wrap gap-2">
                {[...slotsByDate.keys()].map((date) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={selectedDate === date ? 'btn-primary' : 'btn-secondary'}
                  >
                    {date.toUpperCase()}
                  </button>
                ))}
              </div>
              {selectedDate && (
                <div className="flex flex-wrap gap-2">
                  {(slotsByDate.get(selectedDate) ?? []).map((s) => (
                    <button
                      key={s.startUtc}
                      type="button"
                      onClick={() => chooseSlot(s)}
                      className="btn-secondary"
                    >
                      {DateTime.fromISO(s.startUtc).toLocal().toFormat('h:mm a').toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {step === 'format' && slot && (
        <section>
          <h5 className="mb-4 text-dark">VIRTUAL OR IN PERSON</h5>
          <p className="mb-6">{slotLabel}</p>
          <div className="flex flex-col gap-3">
            {formatOptions.includes('virtual') && (
              <button
                type="button"
                className="btn-secondary text-left"
                onClick={() => {
                  setBookedFormat('virtual')
                  setStep('details')
                }}
              >
                VIRTUAL
              </button>
            )}
            {formatOptions.includes('in_person') && (
              <button
                type="button"
                className="btn-secondary text-left"
                onClick={() => {
                  setBookedFormat('in_person')
                  setStep('details')
                }}
              >
                IN PERSON{city ? ` IN ${city.toUpperCase()}` : ''}
              </button>
            )}
          </div>
          <button type="button" className="caption mt-8 text-olive" onClick={() => setStep('time')}>
            CHOOSE A DIFFERENT TIME
          </button>
        </section>
      )}

      {step === 'details' && slot && bookedFormat && (
        <section>
          <h5 className="mb-4 text-dark">YOUR DETAILS</h5>
          <p className="mb-1">{slotLabel}</p>
          <p className="mb-6">
            {bookedFormat === 'virtual' ? 'Virtual' : `In person${city ? ` in ${city}` : ''}`}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitDetails()
            }}
            className="flex flex-col gap-5"
          >
            <div>
              <label htmlFor="seeker_name" className="label mb-2 block text-dark">
                NAME
              </label>
              <input
                id="seeker_name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={fieldClass}
                required
              />
            </div>
            <div>
              <label htmlFor="seeker_email" className="label mb-2 block text-dark">
                EMAIL
              </label>
              <input
                id="seeker_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
                required
              />
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
                NOTE TO YOUR PRACTITIONER (OPTIONAL)
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
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep(formatOptions.length > 1 ? 'format' : 'time')}
              >
                BACK
              </button>
              <button type="submit" className="btn-primary" disabled={pending}>
                {pending
                  ? 'ONE MOMENT'
                  : props.chargingNow
                    ? 'CONTINUE TO PAYMENT'
                    : 'CONFIRM BOOKING'}
              </button>
            </div>
          </form>

          {!props.chargingNow && props.paymentMethod === 'offsite' && props.offsiteInstructions && (
            <p className="caption mt-6 text-dark opacity-70">
              PAYMENT IS ARRANGED DIRECTLY WITH YOUR PRACTITIONER.
            </p>
          )}
          {!props.chargingNow && props.paymentMethod === 'stripe' && !props.connectReady && (
            <p className="caption mt-6 text-dark opacity-70">
              PAYMENT IS ARRANGED DIRECTLY WITH YOUR PRACTITIONER.
            </p>
          )}
        </section>
      )}

      {step === 'payment' && hold && props.stripePublishableKey && props.stripeAccountId && (
        <PaymentStep
          publishableKey={props.stripePublishableKey}
          stripeAccountId={props.stripeAccountId}
          clientSecret={hold.clientSecret}
          bookingId={hold.bookingId}
          summary={`${sessionType.name}. ${slotLabel}.`}
          onDone={(r) => {
            setResult(r)
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
          {result.status === 'pending_approval' && (
            <h2 className="mb-4">Your request has been sent.</h2>
          )}
          {result.status === 'pending_payment' && <h2 className="mb-4">Your session is reserved.</h2>}

          <p className="mb-1">{sessionType.name}</p>
          <p className="mb-1">{result.whenLabel}</p>
          {result.locationDisplay && <p className="mb-1">{result.locationDisplay}</p>}

          {result.status === 'pending_approval' && (
            <p className="mt-4">
              {practitioner.name} will confirm your request. You will hear back by email.
            </p>
          )}
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

// Stripe Elements payment step. Billing address, phone, and card are
// collected here, only on the on-platform charge path.
function PaymentStep({
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
