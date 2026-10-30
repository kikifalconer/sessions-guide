// Shared by the Practice tab and its server actions. Not a 'use server' module.

export type GuideBlock = {
  id: string
  format: 'virtual' | 'in_person' | 'both'
  locationDisplay: string | null
  recurrenceRule: string | null
  startDate: string | null
  endDate: string | null
  startTime: string
  endTime: string
  timezone: string
  isActive: boolean
}

export type OpenSeat = {
  id: string
  clientName: string
  status: string
}

export type DirectSeat = {
  id: string
  clientName: string
  email: string
}

export type GuideEvent = {
  id: string
  sessionTypeId: string
  blockId: string
  format: 'virtual' | 'in_person'
  startDatetime: string
  endDatetime: string
  capacity: number
  status: 'scheduled' | 'cancelling' | 'cancelled'
  seatsTaken: number
  timezone: string
  googleEventId: string | null
  calendarConnected: boolean
  // Non-cancelled seats. Shown only while a cancel is waiting on a refund.
  openSeats: OpenSeat[]
  directSeats: DirectSeat[]
}

export type GroupEventInput = {
  sessionTypeId: string
  blockId: string
  format: string
  // YYYY-MM-DDTHH:mm, read in the block's timezone, not the browser's.
  startLocal: string
  endLocal: string
  capacity: number
}

export type TimeConflict = {
  source: string
  label: string
}

export type EventActionResult =
  | { ok: true }
  | { ok: false; error: string; conflicts?: TimeConflict[] }

export type CancelEventResult =
  | {
      ok: true
      status: 'cancelling' | 'cancelled'
      failed: { bookingId: string; clientName: string; error: string }[]
    }
  | { ok: false; error: string }
