import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  toPublicOccurrences,
  type BookableOccurrence,
  type OccurrenceSnapshot,
  type PublicOccurrence,
  type SeatSnapshot,
} from '@/lib/groupBooking'

// Service-role reads. session_occurrences has RLS and no policies, so the
// public anon client cannot see them. The values returned here are the only
// occurrence fields a public page may serialize.

function cityLabel(display: string | null): string | null {
  if (!display) return null
  const city = display.split(',')[0]?.trim()
  return city || null
}

type Loaded = {
  occurrences: OccurrenceSnapshot[]
  seats: SeatSnapshot[]
  cityByOccurrence: Map<string, string | null>
  formats: Map<string, 'virtual' | 'in_person'>
}

async function loadRaw(sessionTypeIds: string[]): Promise<Loaded> {
  const empty: Loaded = { occurrences: [], seats: [], cityByOccurrence: new Map(), formats: new Map() }
  if (sessionTypeIds.length === 0) return empty

  const admin = createAdminClient()
  const nowIso = new Date().toISOString()
  const { data: rows, error } = await admin
    .from('session_occurrences')
    .select(
      'id, session_type_id, availability_block_id, format, start_datetime, end_datetime, capacity, status'
    )
    .in('session_type_id', sessionTypeIds)
    .eq('status', 'scheduled')
    .gt('start_datetime', nowIso)
  if (error) return empty

  const occurrenceRows = rows ?? []
  const blockIds = [...new Set(occurrenceRows.map((row) => row.availability_block_id as string))]
  const occurrenceIds = occurrenceRows.map((row) => row.id as string)

  const [{ data: blockRows }, { data: seatRows }] = await Promise.all([
    blockIds.length
      ? admin.from('availability_blocks').select('id, timezone, location_display').in('id', blockIds)
      : Promise.resolve({ data: [] as { id: string; timezone: string; location_display: string | null }[] }),
    occurrenceIds.length
      ? admin
          .from('bookings')
          .select('occurrence_id, status, payment_status, created_at, seeker_id')
          .in('occurrence_id', occurrenceIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ])

  const zones = new Map(
    (blockRows ?? []).map((block) => [block.id as string, (block.timezone as string) || 'UTC'])
  )
  const cities = new Map(
    (blockRows ?? []).map((block) => [
      block.id as string,
      cityLabel((block.location_display as string | null) ?? null),
    ])
  )

  const formats = new Map<string, 'virtual' | 'in_person'>()
  const cityByOccurrence = new Map<string, string | null>()
  const occurrences: OccurrenceSnapshot[] = occurrenceRows.map((row) => {
    const format = row.format === 'in_person' ? 'in_person' : 'virtual'
    const id = row.id as string
    formats.set(id, format)
    cityByOccurrence.set(id, cities.get(row.availability_block_id as string) ?? null)
    return {
      id,
      sessionTypeId: row.session_type_id as string,
      status: row.status as string,
      startDatetime: row.start_datetime as string,
      endDatetime: row.end_datetime as string,
      capacity: Number(row.capacity),
      format,
      timezone: zones.get(row.availability_block_id as string) ?? 'UTC',
    }
  })

  const seats: SeatSnapshot[] = (seatRows ?? []).map((seat) => ({
    occurrenceId: seat.occurrence_id as string,
    status: seat.status as string,
    paymentStatus: (seat.payment_status as string | null) ?? null,
    createdAt: seat.created_at as string,
    seekerId: (seat.seeker_id as string | null) ?? null,
  }))

  return { occurrences, seats, cityByOccurrence, formats }
}

export async function loadPublicOccurrenceLists(
  sessionTypeIds: string[]
): Promise<Map<string, PublicOccurrence[]>> {
  const { occurrences, seats } = await loadRaw(sessionTypeIds)
  const now = new Date()
  const grouped = new Map<string, OccurrenceSnapshot[]>()
  for (const occurrence of occurrences) {
    const list = grouped.get(occurrence.sessionTypeId) ?? []
    list.push(occurrence)
    grouped.set(occurrence.sessionTypeId, list)
  }
  const out = new Map<string, PublicOccurrence[]>()
  for (const id of sessionTypeIds) {
    out.set(id, toPublicOccurrences(grouped.get(id) ?? [], seats, now))
  }
  return out
}

export async function loadBookableOccurrences(sessionTypeId: string): Promise<BookableOccurrence[]> {
  const { occurrences, seats, cityByOccurrence, formats } = await loadRaw([sessionTypeId])
  const now = new Date()
  return toPublicOccurrences(occurrences, seats, now).map((occurrence) => {
    const format = formats.get(occurrence.id) ?? 'virtual'
    return {
      ...occurrence,
      format,
      city: format === 'in_person' ? (cityByOccurrence.get(occurrence.id) ?? null) : null,
    }
  })
}
