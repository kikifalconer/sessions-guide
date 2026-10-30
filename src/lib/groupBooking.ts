import { DateTime } from 'luxon'

// Pure group-booking rules shared by the public pages, the Practice cancel
// close, paid finalization, and scripts/check-group-validation.ts.
// Capacity and seat counts stay in these functions. Callers that render to a
// client must pass on only PublicOccurrence.

export const HOLD_EXPIRY_MS = 30 * 60 * 1000

export const IN_PERSON_LABEL = 'In\u2011person'

export const SEAT_RELEASED_MESSAGE = "This seat was released. You've been refunded."

export type SpotLabel = 'Spots available' | 'Full'

export type PublicOccurrence = {
  id: string
  rangeLabel: string
  formatLabel: string
  availability: SpotLabel
}

export type BookableOccurrence = PublicOccurrence & {
  format: 'virtual' | 'in_person'
  city: string | null
}

export type SeatSnapshot = {
  occurrenceId: string
  status: string
  paymentStatus: string | null
  createdAt: string
  seekerId: string | null
}

export type OccurrenceSnapshot = {
  id: string
  sessionTypeId: string
  status: string
  startDatetime: string
  endDatetime: string
  capacity: number
  format: string
  timezone: string
}

// A completed seat already happened and is not refunded. A cancelled seat is
// gone. Either one lets cancelling become cancelled.
export function seatBlocksOccurrenceClose(status: string): boolean {
  return status !== 'cancelled' && status !== 'completed'
}

export function isGroupCapacity(value: unknown): boolean {
  if (typeof value === 'string' && /^\d+$/.test(value)) return isGroupCapacity(Number(value))
  return typeof value === 'number' && Number.isInteger(value) && value >= 2
}

// Same predicate as book_group_seat: pending_payment, unpaid, older than 30
// minutes. Equal to 30 minutes still holds the seat (created_at < now - 30min).
export function isStaleOnPlatformHold(seat: SeatSnapshot, now: Date): boolean {
  if (seat.status !== 'pending_payment' || seat.paymentStatus !== 'unpaid') return false
  const created = Date.parse(seat.createdAt)
  if (!Number.isFinite(created)) return false
  return now.getTime() - created > HOLD_EXPIRY_MS
}

export function isOccupyingSeat(seat: SeatSnapshot, now: Date): boolean {
  if (seat.status === 'cancelled') return false
  if (isStaleOnPlatformHold(seat, now)) return false
  return true
}

export function publicSpotLabel(occupyingCount: number, capacity: number): SpotLabel {
  return occupyingCount >= capacity ? 'Full' : 'Spots available'
}

export function occurrenceFormatLabel(format: string): string {
  if (format === 'in_person') return IN_PERSON_LABEL
  if (format === 'virtual') return 'Virtual'
  return 'Virtual'
}

export function eventRangeLabel(startIso: string, endIso: string, zone: string): string {
  const start = DateTime.fromISO(startIso, { setZone: true }).setZone(zone || 'UTC')
  const end = DateTime.fromISO(endIso, { setZone: true }).setZone(zone || 'UTC')
  if (!start.isValid || !end.isValid) return startIso
  if (start.toISODate() === end.toISODate()) {
    return `${start.toFormat('ccc, LLL d, yyyy, h:mm a')} – ${end.toFormat('h:mm a')}`
  }
  return `${start.toFormat('ccc, LLL d, yyyy, h:mm a')} – ${end.toFormat('ccc, LLL d, h:mm a')}`
}

// Drops cancelling, cancelled, and past rows. The returned objects have no
// capacity, counts, or seat ids.
export function toPublicOccurrences(
  occurrences: OccurrenceSnapshot[],
  seats: SeatSnapshot[],
  now: Date
): PublicOccurrence[] {
  return occurrences
    .filter((occurrence) => occurrence.status === 'scheduled' && Date.parse(occurrence.startDatetime) > now.getTime())
    .sort((a, b) => a.startDatetime.localeCompare(b.startDatetime))
    .map((occurrence) => {
      const occupying = seats.filter(
        (seat) => seat.occurrenceId === occurrence.id && isOccupyingSeat(seat, now)
      ).length
      return {
        id: occurrence.id,
        rangeLabel: eventRangeLabel(occurrence.startDatetime, occurrence.endDatetime, occurrence.timezone),
        formatLabel: occurrenceFormatLabel(occurrence.format),
        availability: publicSpotLabel(occupying, occurrence.capacity),
      }
    })
}

export type GroupSeatCode = 'started' | 'already_booked' | 'full' | 'not_found'

export type GroupSeatDecision = { outcome: 'grant' } | { outcome: GroupSeatCode }

// Mirrors book_group_seat's order after the occurrence row is locked: free
// stale holds, then started, already_booked, full, grant. The live insert is
// the SQL function. This stays in lockstep with it for the validation script.
export function decideGroupSeat(input: {
  occurrenceStatus: string | null
  startDatetime: string
  capacity: number
  seekerId: string | null
  now: Date
  seats: SeatSnapshot[]
}): GroupSeatDecision {
  if (!input.seekerId || input.occurrenceStatus !== 'scheduled') {
    return { outcome: 'not_found' }
  }
  const live = input.seats.filter((seat) => !isStaleOnPlatformHold(seat, input.now))
  if (Date.parse(input.startDatetime) <= input.now.getTime()) {
    return { outcome: 'started' }
  }
  if (live.some((seat) => seat.seekerId === input.seekerId && seat.status !== 'cancelled')) {
    return { outcome: 'already_booked' }
  }
  const occupying = live.filter((seat) => seat.status !== 'cancelled').length
  if (occupying >= input.capacity) return { outcome: 'full' }
  return { outcome: 'grant' }
}

export function groupSeatDenialMessage(code: GroupSeatCode): string {
  switch (code) {
    case 'already_booked':
      return 'You already have a seat in this event.'
    case 'full':
      return 'This event is full.'
    case 'not_found':
      return 'This event is no longer available.'
    case 'started':
      return 'This event has already started.'
  }
}

export type GroupBookingInput = {
  practitionerId: string
  sessionTypeId: string
  occurrenceId: string
  notes: string
  requestedAmount: number | null
}

export type GroupBookResult =
  | {
      ok: true
      mode: 'hold'
      bookingId: string
      clientSecret: string
      stripeAccountId: string
    }
  | {
      ok: true
      mode: 'booked'
      bookingId: string
      status: string
      locationDisplay: string | null
      whenLabel: string
    }
  | { ok: false; error: string }

export type ZeroRowFinalize = 'idempotent_confirmed' | 'refund_released' | 'error'

// A confirming update that matched nothing is not a confirmation. Only an
// already-confirmed row is the idempotent success. Cancelled means refund.
export function finalizeZeroRowOutcome(status: string): ZeroRowFinalize {
  if (status === 'confirmed') return 'idempotent_confirmed'
  if (status === 'cancelled') return 'refund_released'
  return 'error'
}
