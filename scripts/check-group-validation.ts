import { validateSessionTypeInput, type SessionTypeGate, type SessionTypeInput } from '@/lib/sessionType'
import { validateGroupOccurrence, type GroupOccurrenceInput } from '@/lib/groupOccurrence'
import {
  decideGroupSeat,
  finalizeZeroRowOutcome,
  groupSeatDenialMessage,
  isOccupyingSeat,
  publicSpotLabel,
  seatBlocksOccurrenceClose,
  toPublicOccurrences,
  type SeatSnapshot,
} from '@/lib/groupBooking'

let failed = 0
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log('PASS', name)
    return
  }
  failed += 1
  console.error('FAIL', name, detail ?? '')
}

const baseInput = (): SessionTypeInput => ({
  name: 'Circle',
  description: null,
  durationMinutes: 60,
  format: 'both',
  modalityId: 'mod',
  pricingModel: 'fixed',
  price: 40,
  priceMin: null,
  priceMax: null,
  confirmationMode: 'instant',
  paymentMethod: null,
  cancellationPolicy: null,
  photoUrl: null,
  maxCapacity: null,
})

function gate(partial: Partial<SessionTypeGate> = {}): SessionTypeGate {
  return {
    tier: 'free',
    existingMaxCapacity: null,
    practitionerConfirmationMode: 'instant',
    ...partial,
  }
}

for (const tier of ['free', 'elevated', 'basic', null] as const) {
  const r = validateSessionTypeInput({ ...baseInput(), maxCapacity: 8 }, gate({ tier }))
  check(`new group blocked for ${tier}`, 'error' in r)
}

{
  const kept = validateSessionTypeInput(
    { ...baseInput(), maxCapacity: 4 },
    gate({ tier: 'free', existingMaxCapacity: 8 })
  )
  check('downgrade can lower capacity', 'row' in kept && kept.row.max_capacity === 4)
  const same = validateSessionTypeInput(
    { ...baseInput(), maxCapacity: 8 },
    gate({ tier: 'elevated', existingMaxCapacity: 8 })
  )
  check('downgrade can keep capacity', 'row' in same && same.row.max_capacity === 8)
  const floor = validateSessionTypeInput(
    { ...baseInput(), maxCapacity: 2 },
    gate({ tier: 'free', existingMaxCapacity: 8 })
  )
  check('downgrade can lower to 2', 'row' in floor && floor.row.max_capacity === 2)
  const raised = validateSessionTypeInput(
    { ...baseInput(), maxCapacity: 9 },
    gate({ tier: 'free', existingMaxCapacity: 8 })
  )
  check(
    'downgrade cannot raise capacity',
    'error' in raised && raised.error === 'You can lower the seat count, not raise it.'
  )
  const cleared = validateSessionTypeInput(
    { ...baseInput(), maxCapacity: null },
    gate({ tier: 'free', existingMaxCapacity: 8 })
  )
  check('downgrade cannot clear a group type', 'error' in cleared)
  const below = validateSessionTypeInput(
    { ...baseInput(), maxCapacity: 1 },
    gate({ tier: 'free', existingMaxCapacity: 8 })
  )
  check('capacity cannot go below 2', 'error' in below)
  const alchemistRaise = validateSessionTypeInput(
    { ...baseInput(), maxCapacity: 12 },
    gate({ tier: 'alchemist', existingMaxCapacity: 8 })
  )
  check('alchemist can raise capacity', 'row' in alchemistRaise && alchemistRaise.row.max_capacity === 12)
}

const block = {
  format: 'both',
  recurrenceRule: 'WEEKLY:MON',
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  startTime: '09:00:00',
  endTime: '17:00:00',
  timezone: 'America/Vancouver',
}

function occ(partial: Partial<GroupOccurrenceInput> = {}): GroupOccurrenceInput {
  return {
    tier: 'alchemist',
    isNew: true,
    sessionType: { format: 'both', maxCapacity: 10 },
    block,
    format: 'virtual',
    startDatetime: '2026-11-02T09:00:00-08:00',
    endDatetime: '2026-11-02T16:00:00-08:00',
    capacity: 8,
    ...partial,
  }
}

{
  check('single-day inside hours', 'row' in validateGroupOccurrence(occ()))
  check(
    'weekly rule rejects tuesday',
    'error' in
      validateGroupOccurrence(
        occ({
          startDatetime: '2026-11-03T09:00:00-08:00',
          endDatetime: '2026-11-03T16:00:00-08:00',
        })
      )
  )
  const retreatBlock = { ...block, recurrenceRule: null }
  check(
    'multi-day ignores daily hours',
    'row' in
      validateGroupOccurrence(
        occ({
          block: retreatBlock,
          startDatetime: '2026-11-02T20:00:00-08:00',
          endDatetime: '2026-11-03T10:00:00-08:00',
        })
      )
  )
  check('new occurrence blocked after downgrade', 'error' in validateGroupOccurrence(occ({ tier: 'free' })))
  check(
    'existing occurrence still editable after downgrade',
    'row' in validateGroupOccurrence(occ({ tier: 'free', isNew: false }))
  )
}

const now = new Date('2026-11-02T18:00:00.000Z')
const upcoming = '2026-11-10T17:00:00.000Z'

function seat(partial: Partial<SeatSnapshot> & Pick<SeatSnapshot, 'status'>): SeatSnapshot {
  return {
    occurrenceId: 'occ',
    paymentStatus: 'unpaid',
    createdAt: '2026-11-02T17:50:00.000Z',
    seekerId: 'seeker-a',
    ...partial,
  }
}

{
  const stale = seat({
    status: 'pending_payment',
    paymentStatus: 'unpaid',
    createdAt: '2026-11-02T17:00:00.000Z',
    seekerId: 'seeker-stale',
  })
  const fresh = seat({
    status: 'pending_payment',
    paymentStatus: 'unpaid',
    createdAt: '2026-11-02T17:50:00.000Z',
    seekerId: 'seeker-fresh',
  })
  check('stale unpaid hold is not occupying', !isOccupyingSeat(stale, now))
  check('fresh unpaid hold is occupying', isOccupyingSeat(fresh, now))
  check('offsite hold is not stale', isOccupyingSeat({ ...stale, paymentStatus: 'offsite' }, now))

  const occurrence = {
    id: 'occ',
    sessionTypeId: 'type',
    status: 'scheduled',
    startDatetime: upcoming,
    endDatetime: '2026-11-10T19:00:00.000Z',
    capacity: 1,
    format: 'virtual',
    timezone: 'America/Vancouver',
  }
  const freed = toPublicOccurrences([occurrence], [stale], now)
  check(
    'stale hold freed leaves spots available',
    freed.length === 1 && freed[0]?.availability === 'Spots available'
  )
  check(
    'public payload has no capacity or counts',
    freed.length === 1 &&
      Object.keys(freed[0] ?? {}).sort().join() === 'availability,formatLabel,id,rangeLabel' &&
      !JSON.stringify(freed).includes('capacity')
  )
  const full = toPublicOccurrences([occurrence], [fresh], now)
  check('one occupying seat on capacity 1 is full', full[0]?.availability === 'Full')
  check('full label is only the word', publicSpotLabel(2, 2) === 'Full' && publicSpotLabel(1, 2) === 'Spots available')

  const hidden = toPublicOccurrences(
    [
      { ...occurrence, id: 'past', startDatetime: '2026-11-02T16:00:00.000Z' },
      { ...occurrence, id: 'closing', status: 'cancelling' },
      { ...occurrence, id: 'gone', status: 'cancelled' },
    ],
    [],
    now
  )
  check('past, cancelling, and cancelled stay off the public list', hidden.length === 0)

  const base = {
    occurrenceStatus: 'scheduled' as string | null,
    startDatetime: upcoming,
    capacity: 2,
    seekerId: 'seeker-new',
    now,
  }
  check(
    'stale holds are freed before the seat is granted',
    decideGroupSeat({ ...base, seats: [stale, { ...stale, seekerId: 'seeker-stale-2' }] }).outcome === 'grant'
  )
  check(
    'already_booked',
    decideGroupSeat({
      ...base,
      seekerId: 'seeker-fresh',
      seats: [fresh],
    }).outcome === 'already_booked' &&
      groupSeatDenialMessage('already_booked') === 'You already have a seat in this event.'
  )
  check(
    'full',
    decideGroupSeat({
      ...base,
      capacity: 1,
      seats: [fresh],
    }).outcome === 'full' && groupSeatDenialMessage('full') === 'This event is full.'
  )
  check(
    'not_found message',
    groupSeatDenialMessage('not_found') === 'This event is no longer available.'
  )
}

{
  check('completed seat does not block close', !seatBlocksOccurrenceClose('completed'))
  check('cancelled seat does not block close', !seatBlocksOccurrenceClose('cancelled'))
  check('confirmed seat blocks close', seatBlocksOccurrenceClose('confirmed'))
  check('pending payment blocks close', seatBlocksOccurrenceClose('pending_payment'))
  check(
    'zero-row finalize of a cancelled booking refunds',
    finalizeZeroRowOutcome('cancelled') === 'refund_released'
  )
  check(
    'zero-row finalize of a confirmed booking stays confirmed',
    finalizeZeroRowOutcome('confirmed') === 'idempotent_confirmed'
  )
  check('zero-row finalize of anything else is not confirmed', finalizeZeroRowOutcome('pending_payment') === 'error')
}

if (failed) {
  console.error(failed, 'failed')
  process.exit(1)
}
console.log('all checks passed')
