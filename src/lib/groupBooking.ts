import { DateTime } from 'luxon'
import { BRAND_NAME } from '@/lib/brand'

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

export function seatsTakenLabel(taken: number, capacity: number): string {
  return `${taken} of ${capacity} seats taken`
}

// One calendar event for the occurrence. Delete only once it is cancelled and
// an id was stored. A failed delete keeps the id so a retry can finish.
export function occurrenceCalendarAction(
  status: string,
  googleEventId: string | null
): 'delete' | 'upsert' | 'skip' {
  if (status === 'cancelled') return googleEventId ? 'delete' : 'skip'
  if (status === 'scheduled' || status === 'cancelling') return 'upsert'
  return 'skip'
}

// The note is for a connected calendar that is missing its event, or a
// cancelled event whose delete did not finish. No connection is not an error.
export function calendarNeedsRetry(
  status: string,
  googleEventId: string | null,
  calendarConnected: boolean
): boolean {
  if (!calendarConnected) return false
  if (status === 'cancelled') return Boolean(googleEventId)
  if (status === 'scheduled' || status === 'cancelling') return !googleEventId
  return false
}

export function occurrenceCalendarDescription(input: {
  format: 'virtual' | 'in_person'
  capacity: number
  locationDisplay: string | null
}): string {
  const lines = [
    input.format === 'in_person' ? IN_PERSON_LABEL : 'Virtual',
    `${input.capacity} seats`,
  ]
  if (input.format === 'in_person' && input.locationDisplay?.trim()) {
    lines.push(input.locationDisplay.trim())
  }
  return lines.join('\n')
}

// A Guide-added seat: no account, paid outside the platform, no Stripe refund.
export function isGuideAddedOffsiteSeat(seat: {
  occurrenceId: string | null
  seekerId: string | null
  paymentStatus: string | null
}): boolean {
  return Boolean(seat.occurrenceId) && !seat.seekerId && seat.paymentStatus === 'offsite'
}

// The old per-seat cancellation pair is replaced for a Guide cancel of a group
// seat, so the client receives one event email. A client cancelling their own
// seat keeps the existing pair.
export function sendsLegacyCancellationEmail(
  cancelledBy: 'seeker' | 'practitioner',
  occurrenceId: string | null
): boolean {
  return !(cancelledBy === 'practitioner' && occurrenceId)
}

export function cronCancelsHold(
  seat: {
    occurrenceId: string | null
    seekerId: string | null
    status: string
    paymentStatus: string | null
    createdAt: string
  },
  now: Date
): boolean {
  if (!seat.occurrenceId) return false
  return isStaleOnPlatformHold({ ...seat, occurrenceId: seat.occurrenceId }, now)
}

export function directSeatInput(
  name: string,
  email: string
): { name: string; email: string } | { error: string } {
  const trimmedName = name.trim()
  const trimmedEmail = email.trim().toLowerCase()
  if (!trimmedName) return { error: 'Add a name.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { error: 'Add an email address.' }
  }
  return { name: trimmedName, email: trimmedEmail }
}

export function directSeatDenialMessage(code: 'full' | 'already_booked' | 'not_found'): string {
  switch (code) {
    case 'full':
      return 'This event is full.'
    case 'already_booked':
      return 'That client already has a seat in this event.'
    case 'not_found':
      return 'This event is no longer available.'
  }
}

export function groupFormatLabel(format: 'virtual' | 'in_person'): string {
  return format === 'in_person' ? IN_PERSON_LABEL : 'Virtual'
}

export function groupPlaceLine(
  format: 'virtual' | 'in_person',
  locationDisplay: string | null,
  link: string
): string {
  if (format === 'in_person' && locationDisplay?.trim()) return `Where: ${locationDisplay.trim()}`
  return `Link: ${link}`
}

export function groupRefundStatus(input: {
  guideAdded: boolean
  paymentStatus: string
  refundAmount: number
  isFullRefund: boolean
  offsiteObligation: boolean
  offsiteRefundPercent: number
}): string {
  if (input.guideAdded) {
    return 'You paid your Guide directly. No refund is sent from the platform.'
  }
  if (input.paymentStatus === 'refunded' && input.refundAmount > 0) {
    const kind = input.isFullRefund ? 'A full refund' : 'A partial refund'
    return `${kind} of $${input.refundAmount.toFixed(2)} is on its way. Refunds usually take 5 to 10 business days to appear.`
  }
  if (input.offsiteObligation) {
    const share =
      input.offsiteRefundPercent >= 100 ? 'a full refund' : `a ${input.offsiteRefundPercent}% refund`
    return `You paid your Guide directly, so this refund is theirs to issue. Their cancellation policy entitles you to ${share}.`
  }
  if (input.paymentStatus === 'unpaid') return 'You were not charged.'
  return 'No refund applies under the cancellation policy for this event.'
}

export function groupSeatClientBody(input: {
  confirmed: boolean
  title: string
  rangeLabel: string
  timezone: string
  format: 'virtual' | 'in_person'
  placeLine: string
}): string {
  const lines = [
    input.confirmed
      ? `Your seat on ${BRAND_NAME} is confirmed.`
      : `Your seat on ${BRAND_NAME} is reserved.`,
    '',
    input.title,
    `${input.rangeLabel} (${input.timezone})`,
    `Format: ${groupFormatLabel(input.format)}`,
    input.placeLine,
  ]
  return lines.join('\n')
}

export function groupGuideSeatBody(input: {
  confirmed: boolean
  clientName: string
  title: string
  rangeLabel: string
  timezone: string
  taken: number
  capacity: number
}): string {
  return [
    input.confirmed ? 'A client booked a seat.' : 'A client reserved a seat.',
    '',
    input.clientName,
    input.title,
    `${input.rangeLabel} (${input.timezone})`,
    seatsTakenLabel(input.taken, input.capacity),
  ].join('\n')
}

export function groupEventCancelledBody(input: {
  kind: 'event' | 'seat'
  title: string
  rangeLabel: string
  timezone: string
  format: 'virtual' | 'in_person'
  refundStatus: string
}): string {
  return [
    input.kind === 'event' ? 'This event was cancelled.' : 'Your seat was cancelled.',
    '',
    input.title,
    `${input.rangeLabel} (${input.timezone})`,
    `Format: ${groupFormatLabel(input.format)}`,
    '',
    input.refundStatus,
  ].join('\n')
}
