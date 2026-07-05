import { createAdminClient } from '@/lib/supabase/admin'
import { resolveSeekerIdentity } from '@/lib/seekerIdentity'
import { getValidAccessToken, insertEvent, deleteEvent } from '@/lib/calendar'

// Outbound Google Calendar sync, route-agnostic (mirrors the refund engine).
// Every call is NON-FATAL: a calendar failure must never block or roll back a
// booking or a cancellation. These helpers catch everything and return.

// Creates a calendar event for a confirmed booking and stores its id on the
// booking. No-ops when: not confirmed, already evented, or the practitioner
// has no calendar connected (all expected, not errors).
export async function createCalendarEventForBooking(bookingId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: booking } = await admin
      .from('bookings')
      .select(
        `id, practitioner_id, status, google_event_id, booked_format,
         booked_location_display, start_datetime, end_datetime, seeker_id, guest_name, guest_email, notes,
         session_types ( name )`
      )
      .eq('id', bookingId)
      .maybeSingle()

    if (!booking) return
    if (booking.status !== 'confirmed') return // instant + paid only; not pending_*
    if (booking.google_event_id) return // idempotent

    const { data: integration } = await admin
      .from('calendar_integrations')
      .select('calendar_id, sync_enabled')
      .eq('practitioner_id', booking.practitioner_id)
      .maybeSingle()
    if (!integration || !integration.sync_enabled) return // not connected = expected

    const accessToken = await getValidAccessToken(booking.practitioner_id)
    if (!accessToken) return // revoked/expired grant; degrade silently (D5)

    const st = booking.session_types as unknown as { name: string } | null
    const sessionName = st?.name ?? 'Session'
    // Account-backed rows resolve to the account name; historical guest rows
    // to guest_name (Amendment 3).
    const identity = await resolveSeekerIdentity({
      seeker_id: (booking.seeker_id as string | null) ?? null,
      guest_name: (booking.guest_name as string | null) ?? null,
      guest_email: (booking.guest_email as string | null) ?? null,
    })
    const seekerName = identity.name
    const where =
      booking.booked_format === 'in_person'
        ? booking.booked_location_display || 'In person'
        : 'Virtual'

    const descriptionLines = [`Session with ${seekerName}.`, `Format: ${where}.`]
    if (booking.notes) descriptionLines.push('', `Note from the seeker: ${booking.notes}`)

    const eventId = await insertEvent(accessToken, integration.calendar_id ?? 'primary', {
      summary: `${sessionName} with ${seekerName}`,
      description: descriptionLines.join('\n'),
      startIso: booking.start_datetime as string, // timestamptz ISO (offset), never naive
      endIso: booking.end_datetime as string,
    })
    if (!eventId) return

    await admin.from('bookings').update({ google_event_id: eventId }).eq('id', bookingId)
  } catch (err) {
    // Never block a booking on calendar failure.
    console.error('createCalendarEventForBooking failed', bookingId, err)
  }
}

// Deletes the calendar event for a booking and clears the id. No-ops when no
// event was ever created. Best-effort and non-fatal.
export async function deleteCalendarEventForBooking(bookingId: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { data: booking } = await admin
      .from('bookings')
      .select('id, practitioner_id, google_event_id')
      .eq('id', bookingId)
      .maybeSingle()

    if (!booking || !booking.google_event_id) return // nothing was created

    const { data: integration } = await admin
      .from('calendar_integrations')
      .select('calendar_id')
      .eq('practitioner_id', booking.practitioner_id)
      .maybeSingle()

    // Only clear the pointer once the remote event is CONFIRMED gone. If the
    // grant is revoked (no token) or the delete errors, keep google_event_id so
    // the event is not orphaned with no way to find it again (M1).
    let remoteDeleteConfirmed = false
    if (integration) {
      const accessToken = await getValidAccessToken(booking.practitioner_id)
      if (accessToken) {
        try {
          // deleteEvent treats 404/410 (already gone) as success.
          await deleteEvent(
            accessToken,
            integration.calendar_id ?? 'primary',
            booking.google_event_id as string
          )
          remoteDeleteConfirmed = true
        } catch (err) {
          console.error(
            'deleteCalendarEventForBooking: remote delete failed, keeping google_event_id',
            bookingId,
            err
          )
        }
      } else {
        console.error(
          'deleteCalendarEventForBooking: calendar grant unusable, keeping google_event_id',
          bookingId
        )
      }
    } else {
      console.error(
        'deleteCalendarEventForBooking: no integration, cannot delete remote event; keeping google_event_id',
        bookingId
      )
    }

    if (remoteDeleteConfirmed) {
      await admin.from('bookings').update({ google_event_id: null }).eq('id', bookingId)
    }
  } catch (err) {
    // Never block a cancellation/refund on calendar failure.
    console.error('deleteCalendarEventForBooking failed', bookingId, err)
  }
}
