import { validateSessionTypeInput, type SessionTypeGate, type SessionTypeInput } from '@/lib/sessionType'
import { validateGroupOccurrence, type GroupOccurrenceInput } from '@/lib/groupOccurrence'
import { BRAND_NAME } from '@/lib/brand'
import {
  calendarNeedsRetry,
  cronCancelsHold,
  decideGroupSeat,
  directSeatDenialMessage,
  directSeatInput,
  eventRangeLabel,
  finalizeZeroRowOutcome,
  groupEventCancelledBody,
  groupGuideSeatBody,
  groupPlaceLine,
  groupRefundStatus,
  groupSeatClientBody,
  groupSeatDenialMessage,
  isGuideAddedOffsiteSeat,
  isOccupyingSeat,
  occurrenceCalendarAction,
  occurrenceCalendarDescription,
  publicSpotLabel,
  seatBlocksOccurrenceClose,
  seatsTakenLabel,
  sendsLegacyCancellationEmail,
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

{
  const now = new Date('2026-06-01T12:00:00Z')
  const stale = new Date(now.getTime() - 31 * 60 * 1000).toISOString()
  const guideAdded = {
    occurrenceId: 'occ',
    seekerId: null,
    status: 'confirmed',
    paymentStatus: 'offsite',
    createdAt: stale,
  }
  check('guide-added offsite seat is recognized', isGuideAddedOffsiteSeat(guideAdded))
  check(
    'guide-added offsite seat is not a stale hold',
    !cronCancelsHold(guideAdded, now)
  )
  check(
    'stale unpaid group hold is cancelled by the cron',
    cronCancelsHold(
      {
        occurrenceId: 'occ',
        seekerId: 'seeker',
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        createdAt: stale,
      },
      now
    )
  )
  check(
    'a 1:1 hold is not cancelled by the group cron',
    !cronCancelsHold(
      {
        occurrenceId: null,
        seekerId: 'seeker',
        status: 'pending_payment',
        paymentStatus: 'unpaid',
        createdAt: stale,
      },
      now
    )
  )
  check(
    'guide-added seat still occupies capacity',
    isOccupyingSeat(
      {
        occurrenceId: 'occ',
        seekerId: null,
        status: 'confirmed',
        paymentStatus: 'offsite',
        createdAt: stale,
      },
      now
    )
  )
  check('seat count line', seatsTakenLabel(3, 8) === '3 of 8 seats taken')
  check('new scheduled event is inserted', occurrenceCalendarAction('scheduled', null) === 'upsert')
  check('time edit patches the stored event', occurrenceCalendarAction('scheduled', 'evt') === 'upsert')
  check('cancelled event with an id is deleted', occurrenceCalendarAction('cancelled', 'evt') === 'delete')
  check('cancelled event with no id is skipped', occurrenceCalendarAction('cancelled', null) === 'skip')
  check('no calendar connection is not a retry', !calendarNeedsRetry('scheduled', null, false))
  check('missing event on a connected calendar retries', calendarNeedsRetry('scheduled', null, true))
  check('failed delete keeps the retry', calendarNeedsRetry('cancelled', 'evt', true))
  const description = occurrenceCalendarDescription({
    format: 'in_person',
    capacity: 8,
    locationDisplay: 'Oakland, CA',
  })
  check('calendar description uses a non-breaking hyphen', description.includes('In\u2011person'))
  check('calendar description has no client email', !description.includes('@'))
  check(
    'guide cancel of a group seat skips the old email',
    !sendsLegacyCancellationEmail('practitioner', 'occ')
  )
  check(
    'client cancel keeps the existing email',
    sendsLegacyCancellationEmail('seeker', 'occ')
  )
  check(
    'a 1:1 cancel keeps the existing email',
    sendsLegacyCancellationEmail('practitioner', null)
  )
  const refund = groupRefundStatus({
    guideAdded: true,
    paymentStatus: 'offsite',
    refundAmount: 0,
    isFullRefund: false,
    offsiteObligation: false,
    offsiteRefundPercent: 100,
  })
  check('direct seat cancel names no platform refund', refund.includes('No refund is sent from the platform.'))
  check('direct seat cancel has no dollar amount', !refund.includes('$'))
  const clientMail = groupSeatClientBody({
    confirmed: true,
    title: 'Circle',
    rangeLabel: eventRangeLabel(
      '2026-06-02T17:00:00.000Z',
      '2026-06-02T18:30:00.000Z',
      'America/Los_Angeles'
    ),
    timezone: 'America/Los_Angeles',
    format: 'in_person',
    placeLine: groupPlaceLine('in_person', 'Oakland, CA', 'https://example.com/account/bookings'),
  })
  check('client confirmation names the brand', clientMail.includes(BRAND_NAME))
  check('client confirmation uses a non-breaking hyphen', clientMail.includes('In\u2011person'))
  check('client confirmation includes the place', clientMail.includes('Where: Oakland, CA'))
  check('client confirmation has no placeholder', !clientMail.includes('COPY NEEDED') && !clientMail.includes('DUMMY_'))
  const guideMail = groupGuideSeatBody({
    confirmed: true,
    clientName: 'Ada',
    title: 'Circle',
    rangeLabel: 'Tue, Jun 2, 2026, 10:00 AM – 11:30 AM',
    timezone: 'America/Los_Angeles',
    taken: 3,
    capacity: 8,
  })
  check('guide mail says a client booked', guideMail.startsWith('A client booked a seat.'))
  check('guide mail includes the seat count', guideMail.includes('3 of 8 seats taken'))
  const cancelledMail = groupEventCancelledBody({
    kind: 'event',
    title: 'Circle',
    rangeLabel: 'Tue, Jun 2, 2026, 10:00 AM – 11:30 AM',
    timezone: 'America/Los_Angeles',
    format: 'virtual',
    refundStatus: refund,
  })
  check('event cancellation says the event was cancelled', cancelledMail.startsWith('This event was cancelled.'))
  check('virtual cancellation says Virtual', cancelledMail.includes('Format: Virtual'))
  const parsed = directSeatInput('  Ada  ', 'Ada@Example.com')
  check(
    'direct seat input trims and lowercases',
    !('error' in parsed) && parsed.name === 'Ada' && parsed.email === 'ada@example.com'
  )
  check('direct seat input rejects a blank email', 'error' in directSeatInput('Ada', 'not-an-email'))
  check('full direct seat message', directSeatDenialMessage('full') === 'This event is full.')
  const publicJson = JSON.stringify(
    toPublicOccurrences(
      [
        {
          id: 'occ',
          sessionTypeId: 'session',
          status: 'scheduled',
          startDatetime: '2026-06-02T17:00:00.000Z',
          endDatetime: '2026-06-02T18:30:00.000Z',
          timezone: 'America/Los_Angeles',
          format: 'in_person',
          capacity: 8,
        },
      ],
      [guideAdded],
      now
    )
  )
  check('public payload does not include the seat count line', !publicJson.includes('seats taken'))
  check('public payload does not include capacity', !publicJson.includes('capacity'))
}

if (failed) {
  console.error(failed, 'failed')
  process.exit(1)
}
console.log('all checks passed')
