'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { DateTime } from 'luxon'
import type { SeekerBookingView } from '@/lib/seekerData'
import { cancelOwnBooking, type OwnCancelResult } from '@/app/account/actions'

// Seeker-side bookings list + detail + self-cancel. Shared between /account
// BOOKINGS and the practitioner MY SESSIONS tab (built once, per spec).
// Times shown in the seeker's local zone, like the booking flow.
// All copy is PLACEHOLDER — Kiki to review.

const STATUS_LABEL: Record<SeekerBookingView['status'], string> = {
  pending_payment: 'AWAITING PAYMENT',
  pending_approval: 'AWAITING CONFIRMATION',
  confirmed: 'CONFIRMED',
  cancelled: 'CANCELLED',
  completed: 'COMPLETED',
}

function whenLocal(iso: string): string {
  return DateTime.fromISO(iso).toLocal().toFormat('cccc, LLLL d, yyyy, h:mm a')
}

function canCancel(b: SeekerBookingView): boolean {
  if (b.status === 'cancelled' || b.status === 'completed') return false
  return DateTime.fromISO(b.startUtc) > DateTime.utc()
}

function CancelPanel({ booking }: { booking: SeekerBookingView }) {
  const [confirming, setConfirming] = useState(false)
  const [outcome, setOutcome] = useState<Extract<OwnCancelResult, { ok: true }> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (outcome) {
    return (
      <div className="mt-4 border border-border bg-surface px-4 py-3">
        <p className="mb-1">Your session is cancelled.</p>
        {outcome.paymentStatus === 'refunded' && outcome.refundAmount > 0 && (
          <p>
            {outcome.isFull ? 'A full refund' : 'A partial refund'} of $
            {outcome.refundAmount.toFixed(2)} is on its way. Refunds usually take 5
            to 10 business days to appear.
          </p>
        )}
        {outcome.offsiteObligation && outcome.refundAmount > 0 && (
          <p>
            A refund of ${outcome.refundAmount.toFixed(2)} is due from your
            practitioner, who arranges payment directly with you.
          </p>
        )}
        {outcome.paymentStatus === 'paid' && outcome.refundAmount === 0 && (
          <p>No refund applies under the cancellation policy for this session.</p>
        )}
      </div>
    )
  }

  if (!confirming) {
    return (
      <button type="button" className="btn-secondary mt-4" onClick={() => setConfirming(true)}>
        CANCEL THIS SESSION
      </button>
    )
  }

  return (
    <div className="mt-4 border border-border bg-surface px-4 py-3">
      <p className="mb-2">This will cancel your session.</p>
      <p className="caption mb-4 text-dark opacity-70">{booking.cancellationPolicyCopy}</p>
      {error && <p className="caption mb-3 text-olive">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() => {
            setError(null)
            startTransition(async () => {
              const result = await cancelOwnBooking(booking.id)
              if (!result.ok) {
                setError(result.error)
                return
              }
              setOutcome(result)
            })
          }}
        >
          {pending ? 'ONE MOMENT' : 'CONFIRM CANCELLATION'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          KEEP MY SESSION
        </button>
      </div>
    </div>
  )
}

function BookingCard({ booking }: { booking: SeekerBookingView }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-border bg-surface">
      <button
        type="button"
        className="flex w-full items-baseline justify-between gap-4 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="label block text-dark">{booking.sessionName.toUpperCase()}</span>
          <span className="mt-1 block font-heading text-sm font-light text-dark">
            {whenLocal(booking.startUtc)} with {booking.practitionerName}
          </span>
        </span>
        <span className="caption shrink-0 text-olive">{STATUS_LABEL[booking.status]}</span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4">
          <p className="mb-1">
            {booking.bookedFormat === 'virtual' ? 'Virtual' : 'In person'}
            {booking.locationDisplay ? `. ${booking.locationDisplay}` : ''}
          </p>
          {booking.amountPaid !== null && booking.paymentStatus === 'paid' && (
            <p className="mb-1">Paid: ${booking.amountPaid.toFixed(2)}</p>
          )}
          {booking.paymentStatus === 'refunded' && booking.amountRefunded !== null && (
            <p className="mb-1">Refunded: ${booking.amountRefunded.toFixed(2)}</p>
          )}
          {booking.paymentStatus === 'offsite' && (
            <p className="mb-1">Payment is arranged directly with your practitioner.</p>
          )}
          {booking.notes && (
            <p className="mb-1">Your note: {booking.notes}</p>
          )}
          {booking.practitionerSlug && (
            <Link href={`/${booking.practitionerSlug}`} className="caption text-olive">
              VIEW PROFILE
            </Link>
          )}
          {canCancel(booking) && <CancelPanel booking={booking} />}
        </div>
      )}
    </div>
  )
}

export default function SeekerBookings({
  upcoming,
  past,
}: {
  upcoming: SeekerBookingView[]
  past: SeekerBookingView[]
}) {
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <p>
        No sessions yet. When you book one, it will live here.{' '}
        <Link href="/search" className="caption text-olive">
          FIND A PRACTITIONER
        </Link>
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h5 className="mb-4 text-dark">UPCOMING</h5>
        {upcoming.length === 0 ? (
          <p>Nothing coming up.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h5 className="mb-4 text-dark">PAST</h5>
          <div className="flex flex-col gap-3">
            {past.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
