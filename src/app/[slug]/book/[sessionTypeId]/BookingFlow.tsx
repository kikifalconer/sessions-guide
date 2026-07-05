'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { DateTime } from 'luxon'
import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js'
import { Elements, PaymentElement, AddressElement, useStripe, useElements } from '@stripe/react-stripe-js'
import type { Slot } from '@/lib/availability'
import MagicLinkForm from '@/components/magic-link-form'
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
//
// D20: booking requires a seeker account. An unauthenticated seeker gets the
// magic-link step in-flow after choosing a time; the selection survives the
// auth round-trip as ?slot=&format= on this route (validated server-side as a
// hint, never trusted). Identity comes from the account — no name/email
// fields.

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
  // null = not signed in; the flow interposes the magic-link step.
  seeker: { name: string; email: string | null } | null
  // Selection restored from the URL after the auth round-trip (already
  // validated against generated slots by the server page; re-matched here).
  initialSlotStartUtc: string | null
  initialFormat: 'virtual' | 'in_person' | null
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

type Step = 'time' | 'format' | 'signin' | 'details' | 'payment' | 'done'

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

  // Which formats does the chosen slot actually offer for this session type?
  const slotFormats = (s: Slot): ('virtual' | 'in_person')[] => {
    const all = Array.from(new Set(s.offerings.map((o) => o.format)))
    return sessionType.format === 'both' ? all : all.filter((f) => f === sessionType.format)
  }

  // Restore the selection carried through the auth round-trip. The URL values
  // are hints: the slot must still exist in today's generated set and the
  // format must be one the slot offers, or the seeker just picks again.
  const initialSlot = props.initialSlotStartUtc
    ? slots.find((s) => s.startUtc === props.initialSlotStartUtc) ?? null
    : null
  const initialOptions = initialSlot ? slotFormats(initialSlot) : []
  const initialFormat = initialSlot
    ? props.initialFormat && initialOptions.includes(props.initialFormat)
      ? props.initialFormat
      : initialOptions.length === 1
        ? initialOptions[0]
        : null
    : null

  const [step, setStep] = useState<Step>(() => {
    if (!initialSlot) return 'time'
    if (!initialFormat) return 'format'
    return props.seeker ? 'details' : 'signin'
  })
  const [slot, setSlot] = useState<Slot | null>(initialSlot)
  const [bookedFormat, setBookedFormat] = useState<'virtual' | 'in_person' | null>(initialFormat)
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

  const formatOptions = useMemo((): ('virtual' | 'in_person')[] => {
    if (!slot) return []
    return slotFormats(slot)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, sessionType.format])

  // After time + format are set: signed-in seekers go to details, everyone
  // else gets the in-flow sign-in step (D20).
  const stepAfterFormat = (): Step => (props.seeker ? 'details' : 'signin')

  const chooseSlot = (s: Slot) => {
    setSlot(s)
    setError(null)
    const options = slotFormats(s)
    if (options.length === 1) {
      setBookedFormat(options[0])
      setStep(stepAfterFormat())
    } else {
      setBookedFormat(null)
      setStep('format')
    }
  }

  const bookingInput = (): BookingInput | null => {
    if (!slot || !bookedFormat) return null
    // Resolve the block that backs the chosen format (offerings may span two
    // overlapping blocks — M3).
    const blockId = slot.offerings.find((o) => o.format === bookedFormat)?.blockId
    if (!blockId) return null
    return {
      practitionerId: practitioner.id,
      sessionTypeId: sessionType.id,
      blockId,
      startUtc: slot.startUtc,
      bookedFormat,
      notes,
      requestedAmount: amount ? Number(amount) : null,
    }
  }

  // The selection survives the magic-link round-trip in the URL.
  const returnTo =
    slot && bookedFormat
      ? `/${practitioner.slug}/book/${sessionType.id}?slot=${encodeURIComponent(slot.startUtc)}&format=${bookedFormat}`
      : `/${practitioner.slug}/book/${sessionType.id}`

  const submitDetails = () => {
    const input = bookingInput()
    if (!input) return
    setError(null)
    startTransition(async () => {
      if (props.chargingNow) {
        // Guard BEFORE creating the hold + PaymentIntent: without a publishable
        // key (or connected account) the payment step cannot render, so creating
        // a hold would only lock the slot behind a blank screen (M4).
        if (!props.stripePublishableKey || !props.stripeAccountId) {
          setError(
            'Online payment is temporarily unavailable. Please try again later, or contact the practitioner to arrange payment.'
          )
          return
        }
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
  // City for the block backing the chosen format (falls back to the first
  // offering before a format is chosen).
  const cityBlockId = slot
    ? slot.offerings.find((o) => o.format === bookedFormat)?.blockId ?? slot.offerings[0]?.blockId
    : null
  const city = cityBlockId ? blockCities[cityBlockId] : null

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
                  setStep(stepAfterFormat())
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
                  setStep(stepAfterFormat())
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

      {step === 'signin' && slot && bookedFormat && (
        <section>
          {/* PLACEHOLDER COPY — Kiki to review. */}
          <h5 className="mb-4 text-dark">SIGN IN TO BOOK</h5>
          <p className="mb-1">{slotLabel}</p>
          <p className="mb-6">
            {bookedFormat === 'virtual' ? 'Virtual' : `In person${city ? ` in ${city}` : ''}`}
          </p>
          <p className="mb-6">
            Booking uses your sessions.guide account. Enter your email and we
            will send you a sign in link. Your selected time is kept for when
            you return.
          </p>
          <MagicLinkForm
            next={returnTo}
            sentNote="The link brings you back here with your time still selected."
          />
          <button
            type="button"
            className="caption mt-8 text-olive"
            onClick={() => setStep(formatOptions.length > 1 ? 'format' : 'time')}
          >
            BACK
          </button>
        </section>
      )}

      {step === 'details' && slot && bookedFormat && props.seeker && (
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
