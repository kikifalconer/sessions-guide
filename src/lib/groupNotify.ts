import { createAdminClient } from '@/lib/supabase/admin'
import { sendGroupSeatEmails } from '@/lib/email'
import {
  eventRangeLabel,
  groupGuideSeatBody,
  groupPlaceLine,
  groupSeatClientBody,
  seatsTakenLabel,
} from '@/lib/groupBooking'
import { resolveSeekerIdentity } from '@/lib/seekerIdentity'
import { getSiteUrl } from '@/lib/siteUrl'

// Seat-count line after a booking or a cancellation. Null when the count
// cannot be read, so a mailer can omit the note rather than invent a number.
async function guideEmail(practitionerId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(practitionerId)
  return data.user?.email ?? null
}

export async function seatsTakenNote(occurrenceId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { count, error } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('occurrence_id', occurrenceId)
    .neq('status', 'cancelled')
  const { data: occurrence } = await admin
    .from('session_occurrences')
    .select('capacity')
    .eq('id', occurrenceId)
    .maybeSingle()
  if (error || count == null || !occurrence) return null
  return seatsTakenLabel(count, Number(occurrence.capacity))
}

// Client confirmation (or reservation) plus the Guide's seat-count note.
// Never throws. Call only after the seat row is saved.
export async function notifyGroupSeatBooked(bookingId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: booking, error } = await admin
      .from('bookings')
      .select(
        `id, occurrence_id, practitioner_id, status, booked_format, booked_location_display,
         start_datetime, end_datetime, seeker_id, guest_name, guest_email,
         session_types ( name ),
         availability_blocks ( timezone )`
      )
      .eq('id', bookingId)
      .maybeSingle()
    if (error || !booking?.occurrence_id) return

    const { data: occurrence } = await admin
      .from('session_occurrences')
      .select('capacity, end_datetime')
      .eq('id', booking.occurrence_id)
      .maybeSingle()
    const { count } = await admin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('occurrence_id', booking.occurrence_id)
      .neq('status', 'cancelled')
    if (!occurrence || count == null) return

    const identity = await resolveSeekerIdentity({
      seeker_id: booking.seeker_id,
      guest_name: booking.guest_name,
      guest_email: booking.guest_email,
    })
    const sessionType = booking.session_types as unknown as { name: string } | null
    const block = booking.availability_blocks as unknown as { timezone: string } | null
    const zone = block?.timezone ?? 'UTC'
    const format = booking.booked_format === 'in_person' ? 'in_person' : 'virtual'
    const end = (booking.end_datetime as string | null) ?? (occurrence.end_datetime as string)
    const range = eventRangeLabel(booking.start_datetime as string, end, zone)
    const title = sessionType?.name ?? 'Session'
    const confirmed = booking.status === 'confirmed'
    let link = ''
    try {
      link = `${getSiteUrl()}/account/bookings`
    } catch {
      link = ''
    }
    const placeLine = groupPlaceLine(format, booking.booked_location_display, link)
    const taken = count
    const capacity = Number(occurrence.capacity)

    await sendGroupSeatEmails({
      clientEmail: identity.email ?? '',
      clientSubject: confirmed ? 'Your seat is confirmed' : 'Your seat is reserved',
      clientText: groupSeatClientBody({
        confirmed,
        title,
        rangeLabel: range,
        timezone: zone,
        format,
        placeLine,
      }),
      guideEmail: await guideEmail(booking.practitioner_id as string),
      guideSubject: confirmed ? 'A client booked a seat' : 'A client reserved a seat',
      guideText: groupGuideSeatBody({
        confirmed,
        clientName: identity.name,
        title,
        rangeLabel: range,
        timezone: zone,
        taken,
        capacity,
      }),
    })
  } catch (err) {
    console.error('notifyGroupSeatBooked failed', bookingId, err)
  }
}
