'use server'

import { revalidatePath } from 'next/cache'
import { DateTime } from 'luxon'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { liveFreeBusyForWindow } from '@/lib/calendar'
import { syncOccurrenceCalendar } from '@/lib/calendarSync'
import { cancelBooking } from '@/lib/cancellation'
import {
  directSeatDenialMessage,
  directSeatInput,
  isGuideAddedOffsiteSeat,
  seatBlocksOccurrenceClose,
} from '@/lib/groupBooking'
import { expireStaleHolds } from '@/app/[slug]/book/[sessionTypeId]/actions'
import { validateGroupOccurrence, type GroupOccurrenceBlock } from '@/lib/groupOccurrence'
import type { CancelEventResult, EventActionResult, GroupEventInput, TimeConflict } from './groupEventTypes'

// A 'use server' module may export only async functions. Types live in
// groupEventTypes.ts.

type Admin = ReturnType<typeof createAdminClient>
type DbError = { code?: string; message?: string } | null

const GENERIC_ERROR = 'Something went wrong. Try again or contact support.'
const NOT_FOUND = 'That event could not be found.'
const CALENDAR_UNVERIFIED = 'Your calendar could not be checked. Try again in a moment.'
const OVERLAP_SESSION = 'That time overlaps another session. Choose a different time.'
const OVERLAP_EVENT = 'That time overlaps another event. Choose a different time.'

async function requireUser(): Promise<{ id: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return { id: user.id }
}

function revalidate() {
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/offerings')
}

function asCapacity(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return null
}

function overlapMessage(error: DbError): string | null {
  const message = error?.message ?? ''
  if (message.includes('occurrence_overlap')) return OVERLAP_SESSION
  if (error?.code === '23P01') return OVERLAP_EVENT
  return null
}

function zonedToUtc(local: string, zone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) return null
  const dt = DateTime.fromISO(local, { zone })
  if (!dt.isValid) return null
  return dt.toUTC().toISO()
}

function windowLabel(start: string, end: string, zone: string): string {
  const s = DateTime.fromISO(start, { setZone: true }).setZone(zone)
  const e = DateTime.fromISO(end, { setZone: true }).setZone(zone)
  if (!s.isValid || !e.isValid) return `${start} – ${end}`
  if (s.toISODate() === e.toISODate()) {
    return `${s.toFormat('ccc, LLL d, yyyy, h:mm a')} – ${e.toFormat('h:mm a')}`
  }
  return `${s.toFormat('ccc, LLL d, yyyy, h:mm a')} – ${e.toFormat('ccc, LLL d, yyyy, h:mm a')}`
}

function asBlock(row: {
  format: string
  recurrence_rule: string | null
  start_date: string | null
  end_date: string | null
  start_time: string
  end_time: string
  timezone: string
}): GroupOccurrenceBlock {
  return {
    format: row.format,
    recurrenceRule: row.recurrence_rule,
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time,
    endTime: row.end_time,
    timezone: row.timezone,
  }
}

async function loadOwnedSessionType(admin: Admin, id: string, practitionerId: string) {
  const { data } = await admin
    .from('session_types')
    .select('id, format, max_capacity, practitioner_id')
    .eq('id', id)
    .eq('practitioner_id', practitionerId)
    .maybeSingle()
  return data
}

async function loadOwnedBlock(admin: Admin, id: string, practitionerId: string) {
  const { data } = await admin
    .from('availability_blocks')
    .select(
      'id, format, recurrence_rule, start_date, end_date, start_time, end_time, timezone, is_active, practitioner_id'
    )
    .eq('id', id)
    .eq('practitioner_id', practitionerId)
    .maybeSingle()
  return data
}

async function loadTier(admin: Admin, practitionerId: string): Promise<string | null> {
  const { data } = await admin
    .from('practitioners')
    .select('subscription_tier')
    .eq('id', practitionerId)
    .maybeSingle()
  return (data?.subscription_tier as string | null) ?? null
}

async function seatsTaken(admin: Admin, occurrenceId: string): Promise<number> {
  const { count } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('occurrence_id', occurrenceId)
    .neq('status', 'cancelled')
  return count ?? 0
}

async function findConflicts(
  admin: Admin,
  practitionerId: string,
  startIso: string,
  endIso: string,
  zone: string,
  ignoreOccurrenceId: string | null
): Promise<TimeConflict[] | { error: string }> {
  const { data: sessions, error: sessionError } = await admin
    .from('bookings')
    .select('start_datetime, end_datetime')
    .eq('practitioner_id', practitionerId)
    .is('occurrence_id', null)
    .neq('status', 'cancelled')
    .lt('start_datetime', endIso)
    .gt('end_datetime', startIso)
  if (sessionError) return { error: GENERIC_ERROR }

  const { data: events, error: eventError } = await admin
    .from('session_occurrences')
    .select('id, start_datetime, end_datetime')
    .eq('practitioner_id', practitionerId)
    .in('status', ['scheduled', 'cancelling'])
    .lt('start_datetime', endIso)
    .gt('end_datetime', startIso)
  if (eventError) return { error: GENERIC_ERROR }

  const conflicts: TimeConflict[] = []
  for (const row of sessions ?? []) {
    conflicts.push({
      source: 'Another session',
      label: windowLabel(row.start_datetime as string, row.end_datetime as string, zone),
    })
  }
  for (const row of events ?? []) {
    if (row.id === ignoreOccurrenceId) continue
    conflicts.push({
      source: 'Another event',
      label: windowLabel(row.start_datetime as string, row.end_datetime as string, zone),
    })
  }

  const live = await liveFreeBusyForWindow(practitionerId, startIso, endIso)
  if (!live.ok) return { error: CALENDAR_UNVERIFIED }
  const spanStart = DateTime.fromISO(startIso)
  const spanEnd = DateTime.fromISO(endIso)
  for (const busy of live.busy) {
    const starts = DateTime.fromISO(busy.start_datetime)
    const ends = DateTime.fromISO(busy.end_datetime)
    if (!starts.isValid || !ends.isValid) return { error: CALENDAR_UNVERIFIED }
    if (starts < spanEnd && ends > spanStart) {
      conflicts.push({
        source: 'Google Calendar',
        label: windowLabel(busy.start_datetime, busy.end_datetime, zone),
      })
    }
  }
  return conflicts
}

async function clientName(admin: Admin, seekerId: string | null, guestName: string | null): Promise<string> {
  if (seekerId) {
    const { data } = await admin.from('seekers').select('full_name').eq('id', seekerId).maybeSingle()
    const name = (data?.full_name as string | null)?.trim()
    if (name) return name
  }
  const guest = guestName?.trim()
  return guest || 'A client'
}

export async function createGroupEvent(input: GroupEventInput): Promise<EventActionResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }
  const admin = createAdminClient()

  const sessionType = await loadOwnedSessionType(admin, input.sessionTypeId, user.id)
  const block = await loadOwnedBlock(admin, input.blockId, user.id)
  if (!sessionType || !block) return { ok: false, error: NOT_FOUND }
  if (!block.is_active) return { ok: false, error: 'Choose an active availability block.' }

  const startIso = zonedToUtc(input.startLocal, block.timezone)
  const endIso = zonedToUtc(input.endLocal, block.timezone)
  if (!startIso || !endIso) return { ok: false, error: 'Set a start and an end.' }

  const tier = await loadTier(admin, user.id)
  const validated = validateGroupOccurrence({
    tier,
    isNew: true,
    sessionType: {
      format: sessionType.format as string,
      maxCapacity: asCapacity(sessionType.max_capacity),
    },
    block: asBlock(block),
    format: input.format,
    startDatetime: startIso,
    endDatetime: endIso,
    capacity: input.capacity,
  })
  if ('error' in validated) return { ok: false, error: validated.error }

  const conflicts = await findConflicts(
    admin,
    user.id,
    validated.row.startDatetime,
    validated.row.endDatetime,
    block.timezone,
    null
  )
  if ('error' in conflicts) return { ok: false, error: conflicts.error }
  if (conflicts.length > 0) {
    return { ok: false, error: 'That time conflicts with:', conflicts }
  }

  const { data: created, error } = await admin
    .from('session_occurrences')
    .insert({
      practitioner_id: user.id,
      session_type_id: sessionType.id,
      availability_block_id: block.id,
      format: validated.row.format,
      start_datetime: validated.row.startDatetime,
      end_datetime: validated.row.endDatetime,
      capacity: validated.row.capacity,
      status: 'scheduled',
    })
    .select('id')
    .single()
  if (error || !created) {
    const mapped = overlapMessage(error)
    return { ok: false, error: mapped ?? GENERIC_ERROR }
  }

  await syncOccurrenceCalendar(created.id as string)
  revalidate()
  return { ok: true }
}

export async function updateGroupEvent(
  occurrenceId: string,
  input: GroupEventInput
): Promise<EventActionResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }
  const admin = createAdminClient()

  const { data: occurrence } = await admin
    .from('session_occurrences')
    .select(
      'id, practitioner_id, session_type_id, availability_block_id, format, start_datetime, end_datetime, capacity, status'
    )
    .eq('id', occurrenceId)
    .eq('practitioner_id', user.id)
    .maybeSingle()
  if (!occurrence) return { ok: false, error: NOT_FOUND }
  if (occurrence.status !== 'scheduled') {
    return { ok: false, error: 'This event is already being cancelled.' }
  }
  if (occurrence.session_type_id !== input.sessionTypeId) return { ok: false, error: NOT_FOUND }

  const sessionType = await loadOwnedSessionType(admin, input.sessionTypeId, user.id)
  if (!sessionType) return { ok: false, error: NOT_FOUND }

  const taken = await seatsTaken(admin, occurrence.id)
  const maxCapacity = asCapacity(sessionType.max_capacity)
  if (!Number.isInteger(input.capacity) || input.capacity < 2) {
    return { ok: false, error: 'Set a capacity of 2 or more.' }
  }
  if (input.capacity < taken) {
    return { ok: false, error: 'Seats stay at or above the clients already booked.' }
  }
  if (maxCapacity !== null && input.capacity > maxCapacity) {
    return { ok: false, error: 'Capacity is above this session type maximum.' }
  }

  // Booked seats freeze the span. Only capacity is written, and it still goes
  // through the occurrence validator against the stored window.
  if (taken > 0) {
    const block = await loadOwnedBlock(admin, occurrence.availability_block_id as string, user.id)
    if (!block) return { ok: false, error: NOT_FOUND }
    const tier = await loadTier(admin, user.id)
    const validated = validateGroupOccurrence({
      tier,
      isNew: false,
      sessionType: { format: sessionType.format as string, maxCapacity },
      block: asBlock(block),
      format: occurrence.format as string,
      startDatetime: occurrence.start_datetime as string,
      endDatetime: occurrence.end_datetime as string,
      capacity: input.capacity,
    })
    if ('error' in validated) return { ok: false, error: validated.error }
    const { error } = await admin
      .from('session_occurrences')
      .update({ capacity: validated.row.capacity, updated_at: new Date().toISOString() })
      .eq('id', occurrence.id)
      .eq('practitioner_id', user.id)
      .eq('status', 'scheduled')
    if (error) return { ok: false, error: GENERIC_ERROR }
    await syncOccurrenceCalendar(occurrence.id as string)
    revalidate()
    return { ok: true }
  }

  const block = await loadOwnedBlock(admin, input.blockId, user.id)
  if (!block) return { ok: false, error: NOT_FOUND }
  const startIso = zonedToUtc(input.startLocal, block.timezone)
  const endIso = zonedToUtc(input.endLocal, block.timezone)
  if (!startIso || !endIso) return { ok: false, error: 'Set a start and an end.' }

  if (!block.is_active && block.id !== occurrence.availability_block_id) {
    return { ok: false, error: 'Choose an active availability block.' }
  }

  const tier = await loadTier(admin, user.id)
  const validated = validateGroupOccurrence({
    tier,
    isNew: false,
    sessionType: { format: sessionType.format as string, maxCapacity },
    block: asBlock(block),
    format: input.format,
    startDatetime: startIso,
    endDatetime: endIso,
    capacity: input.capacity,
  })
  if ('error' in validated) return { ok: false, error: validated.error }

  const conflicts = await findConflicts(
    admin,
    user.id,
    validated.row.startDatetime,
    validated.row.endDatetime,
    block.timezone,
    occurrence.id
  )
  if ('error' in conflicts) return { ok: false, error: conflicts.error }
  if (conflicts.length > 0) {
    return { ok: false, error: 'That time conflicts with:', conflicts }
  }

  const { error } = await admin
    .from('session_occurrences')
    .update({
      availability_block_id: block.id,
      format: validated.row.format,
      start_datetime: validated.row.startDatetime,
      end_datetime: validated.row.endDatetime,
      capacity: validated.row.capacity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', occurrence.id)
    .eq('practitioner_id', user.id)
    .eq('status', 'scheduled')
  if (error) {
    const mapped = overlapMessage(error)
    return { ok: false, error: mapped ?? GENERIC_ERROR }
  }

  await syncOccurrenceCalendar(occurrence.id as string)
  revalidate()
  return { ok: true }
}

async function finishCancellation(
  admin: Admin,
  occurrenceId: string,
  practitionerId: string
): Promise<'cancelling' | 'cancelled'> {
  // Completed seats already happened and are not refunded, so they do not
  // keep the event in cancelling. Cancelled seats are already resolved.
  const { data: seatRows, error: seatError } = await admin
    .from('bookings')
    .select('status')
    .eq('occurrence_id', occurrenceId)
  if (seatError) return 'cancelling'
  const blocking = (seatRows ?? []).some((row) => seatBlocksOccurrenceClose(row.status as string))
  if (blocking) return 'cancelling'
  const { error } = await admin
    .from('session_occurrences')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', occurrenceId)
    .eq('practitioner_id', practitionerId)
    .eq('status', 'cancelling')
  if (error) return 'cancelling'
  await syncOccurrenceCalendar(occurrenceId)
  return 'cancelled'
}

async function cancelOneSeat(
  admin: Admin,
  bookingId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const result = await cancelBooking({
      bookingId,
      cancelledBy: 'practitioner',
      notice: 'event',
    })
    if (!result.ok) return { ok: false, error: result.error }
    return { ok: true }
  } catch {
    return { ok: false, error: GENERIC_ERROR }
  }
}

export async function cancelGroupEvent(occurrenceId: string): Promise<CancelEventResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }
  const admin = createAdminClient()

  const { data: occurrence } = await admin
    .from('session_occurrences')
    .select('id, status, practitioner_id')
    .eq('id', occurrenceId)
    .eq('practitioner_id', user.id)
    .maybeSingle()
  if (!occurrence) return { ok: false, error: NOT_FOUND }
  if (occurrence.status === 'cancelled') {
    return { ok: true, status: 'cancelled', failed: [] }
  }

  if (occurrence.status === 'scheduled') {
    const { error } = await admin
      .from('session_occurrences')
      .update({ status: 'cancelling', updated_at: new Date().toISOString() })
      .eq('id', occurrence.id)
      .eq('practitioner_id', user.id)
      .eq('status', 'scheduled')
    if (error) return { ok: false, error: GENERIC_ERROR }
  }

  const { data: seats, error: seatsError } = await admin
    .from('bookings')
    .select('id, seeker_id, guest_name, status')
    .eq('occurrence_id', occurrence.id)
    .eq('practitioner_id', user.id)
    .neq('status', 'cancelled')
  if (seatsError) return { ok: false, error: GENERIC_ERROR }

  const failed: { bookingId: string; clientName: string; error: string }[] = []
  for (const seat of seats ?? []) {
    // A completed seat is not refunded and does not block the event closing.
    if (seat.status === 'completed') continue
    const name = await clientName(admin, (seat.seeker_id as string | null) ?? null, (seat.guest_name as string | null) ?? null)
    const result = await cancelOneSeat(admin, seat.id as string)
    if (!result.ok) failed.push({ bookingId: seat.id as string, clientName: name, error: result.error })
  }

  const status = await finishCancellation(admin, occurrence.id, user.id)
  revalidate()
  return { ok: true, status, failed }
}

export async function retryGroupSeat(
  occurrenceId: string,
  bookingId: string
): Promise<CancelEventResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }
  const admin = createAdminClient()

  const { data: occurrence } = await admin
    .from('session_occurrences')
    .select('id, status')
    .eq('id', occurrenceId)
    .eq('practitioner_id', user.id)
    .maybeSingle()
  if (!occurrence) return { ok: false, error: NOT_FOUND }
  if (occurrence.status === 'cancelled') {
    return { ok: true, status: 'cancelled', failed: [] }
  }
  if (occurrence.status !== 'cancelling') {
    return { ok: false, error: 'Cancel the event before retrying a refund.' }
  }

  const { data: seat } = await admin
    .from('bookings')
    .select('id, seeker_id, guest_name, status')
    .eq('id', bookingId)
    .eq('occurrence_id', occurrence.id)
    .eq('practitioner_id', user.id)
    .maybeSingle()
  if (!seat) return { ok: false, error: 'That booking could not be found.' }

  const failed: { bookingId: string; clientName: string; error: string }[] = []
  if (seat.status !== 'cancelled' && seat.status !== 'completed') {
    const name = await clientName(
      admin,
      (seat.seeker_id as string | null) ?? null,
      (seat.guest_name as string | null) ?? null
    )
    const result = await cancelOneSeat(admin, seat.id as string)
    if (!result.ok) failed.push({ bookingId: seat.id as string, clientName: name, error: result.error })
  }

  const status = await finishCancellation(admin, occurrence.id, user.id)
  revalidate()
  return { ok: true, status, failed }
}

export async function retryOccurrenceCalendar(occurrenceId: string): Promise<EventActionResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }
  const admin = createAdminClient()
  const { data: occurrence } = await admin
    .from('session_occurrences')
    .select('id')
    .eq('id', occurrenceId)
    .eq('practitioner_id', user.id)
    .maybeSingle()
  if (!occurrence) return { ok: false, error: NOT_FOUND }
  const synced = await syncOccurrenceCalendar(occurrenceId)
  revalidate()
  if (synced === 'failed') return { ok: false, error: 'Calendar not synced. Try again.' }
  return { ok: true }
}

export async function addDirectSeat(
  occurrenceId: string,
  name: string,
  email: string
): Promise<EventActionResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }
  const parsed = directSeatInput(name, email)
  if ('error' in parsed) return { ok: false, error: parsed.error }

  const admin = createAdminClient()
  const { data: occurrence } = await admin
    .from('session_occurrences')
    .select('id, status')
    .eq('id', occurrenceId)
    .eq('practitioner_id', user.id)
    .maybeSingle()
  if (!occurrence) return { ok: false, error: NOT_FOUND }
  if (occurrence.status !== 'scheduled') {
    return { ok: false, error: 'This event is no longer available.' }
  }

  await expireStaleHolds(user.id)

  const { data: rpcData, error: rpcError } = await admin.rpc('add_offsite_group_seat', {
    p_occurrence_id: occurrenceId,
    p_guest_name: parsed.name,
    p_guest_email: parsed.email,
  })
  if (rpcError) {
    const message = rpcError.message ?? ''
    if (message.includes('not_found')) return { ok: false, error: directSeatDenialMessage('not_found') }
    if (rpcError.code === 'PGRST202' || message.includes('add_offsite_group_seat')) {
      return { ok: false, error: 'Direct seats need a database update before they can be added.' }
    }
    return { ok: false, error: GENERIC_ERROR }
  }

  const rpcRow = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as
    | { booking_id: string | null; error: string | null }
    | null
  const code = rpcRow?.error
  if (code === 'full' || code === 'already_booked' || code === 'not_found') {
    return { ok: false, error: directSeatDenialMessage(code) }
  }
  if (code || !rpcRow?.booking_id) return { ok: false, error: GENERIC_ERROR }

  revalidate()
  return { ok: true }
}

export async function removeDirectSeat(
  occurrenceId: string,
  bookingId: string
): Promise<EventActionResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }
  const admin = createAdminClient()
  const { data: seat } = await admin
    .from('bookings')
    .select('id, seeker_id, payment_status, occurrence_id, status')
    .eq('id', bookingId)
    .eq('occurrence_id', occurrenceId)
    .eq('practitioner_id', user.id)
    .maybeSingle()
  if (!seat) return { ok: false, error: NOT_FOUND }
  if (
    !isGuideAddedOffsiteSeat({
      occurrenceId: (seat.occurrence_id as string | null) ?? null,
      seekerId: (seat.seeker_id as string | null) ?? null,
      paymentStatus: (seat.payment_status as string | null) ?? null,
    })
  ) {
    return { ok: false, error: 'That seat cannot be removed this way.' }
  }
  if (seat.status === 'cancelled') {
    revalidate()
    return { ok: true }
  }
  const result = await cancelBooking({
    bookingId,
    cancelledBy: 'practitioner',
    notice: 'seat',
  })
  if (!result.ok) return { ok: false, error: result.error }
  revalidate()
  return { ok: true }
}
