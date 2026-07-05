import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  resolveCancellationPolicy,
  CANCELLATION_POLICY_COPY,
} from '@/lib/booking'

// Seeker-side dashboard data (D20), shared by /account and the practitioner
// MY SESSIONS tab (bookings where the user is the seeker, reviews they wrote).
// Service-role reads scoped to the user id; plain serializable views out.

export type SeekerBookingView = {
  id: string
  status: 'pending_payment' | 'pending_approval' | 'confirmed' | 'cancelled' | 'completed'
  startUtc: string
  endUtc: string
  bookedFormat: 'virtual' | 'in_person'
  // Location display rule (availability-blocks.md): full location only
  // post-booking on confirmed/completed rows; city-only otherwise. Applied
  // HERE so the full address is never even serialized to the client early.
  locationDisplay: string | null
  sessionName: string
  practitionerName: string
  practitionerSlug: string | null
  paymentStatus: 'unpaid' | 'paid' | 'refunded' | 'offsite' | null
  amountPaid: number | null
  amountRefunded: number | null
  cancellationPolicyCopy: string
  notes: string | null
}

export type SeekerReviewView = {
  id: string
  rating: number
  body: string | null
  isPublished: boolean
  createdAt: string
  practitionerName: string
  practitionerSlug: string | null
}

// A completed booking with no review yet: prompt the seeker to write one.
export type ReviewPromptView = {
  bookingId: string
  sessionName: string
  practitionerName: string
  practitionerSlug: string | null
  startUtc: string
}

export type SeekerData = {
  upcoming: SeekerBookingView[]
  past: SeekerBookingView[]
  prompts: ReviewPromptView[]
  reviews: SeekerReviewView[]
}

// City only (same derivation as discovery and the booking flow).
function cityLabel(display: string | null): string | null {
  if (!display) return null
  const city = display.split(',')[0]?.trim()
  return city || null
}

export async function loadSeekerData(userId: string): Promise<SeekerData> {
  const admin = createAdminClient()

  const [{ data: bookingRows }, { data: reviewRows }] = await Promise.all([
    admin
      .from('bookings')
      .select(
        `id, status, start_datetime, end_datetime, booked_format,
         booked_location_display, payment_status, amount_paid, amount_refunded, notes,
         session_types ( name, cancellation_policy ),
         practitioners ( full_name, slug, cancellation_policy )`
      )
      .eq('seeker_id', userId)
      .order('start_datetime', { ascending: false }),
    admin
      .from('reviews')
      .select(
        `id, booking_id, rating, body, is_published, created_at,
         practitioners ( full_name, slug )`
      )
      .eq('reviewer_id', userId)
      .order('created_at', { ascending: false }),
  ])

  const bookings = (bookingRows ?? []).map((row) => {
    const st = row.session_types as unknown as {
      name: string
      cancellation_policy: string | null
    } | null
    const p = row.practitioners as unknown as {
      full_name: string
      slug: string
      cancellation_policy: string | null
    } | null

    const status = row.status as SeekerBookingView['status']
    const fullLocation = status === 'confirmed' || status === 'completed'
    const policy = resolveCancellationPolicy(
      { cancellation_policy: st?.cancellation_policy ?? null } as never,
      { cancellation_policy: p?.cancellation_policy ?? null } as never
    )

    const view: SeekerBookingView = {
      id: row.id as string,
      status,
      startUtc: row.start_datetime as string,
      endUtc: row.end_datetime as string,
      bookedFormat: row.booked_format as 'virtual' | 'in_person',
      locationDisplay: fullLocation
        ? ((row.booked_location_display as string | null) ?? null)
        : cityLabel((row.booked_location_display as string | null) ?? null),
      sessionName: st?.name ?? 'Session',
      practitionerName: p?.full_name ?? 'Your practitioner',
      practitionerSlug: p?.slug ?? null,
      paymentStatus: (row.payment_status as SeekerBookingView['paymentStatus']) ?? null,
      amountPaid: (row.amount_paid as number | null) ?? null,
      amountRefunded: (row.amount_refunded as number | null) ?? null,
      cancellationPolicyCopy: CANCELLATION_POLICY_COPY[policy],
      notes: (row.notes as string | null) ?? null,
    }
    return view
  })

  const now = DateTime.utc().toISO() as string
  const upcoming = bookings
    .filter((b) => b.startUtc >= now && b.status !== 'cancelled' && b.status !== 'completed')
    .sort((a, b) => a.startUtc.localeCompare(b.startUtc))
  const past = bookings
    .filter((b) => !(b.startUtc >= now && b.status !== 'cancelled' && b.status !== 'completed'))
    .sort((a, b) => b.startUtc.localeCompare(a.startUtc))

  const reviews: SeekerReviewView[] = (reviewRows ?? []).map((row) => {
    const p = row.practitioners as unknown as { full_name: string; slug: string } | null
    return {
      id: row.id as string,
      rating: row.rating as number,
      body: (row.body as string | null) ?? null,
      isPublished: row.is_published as boolean,
      createdAt: row.created_at as string,
      practitionerName: p?.full_name ?? 'Your practitioner',
      practitionerSlug: p?.slug ?? null,
    }
  })

  // Prompt on completed bookings that have no review yet. Matched on
  // booking_id (not reviewer_id) so historical guest-era reviews still count.
  const completed = bookings.filter((b) => b.status === 'completed')
  let reviewedBookingIds = new Set<string>()
  if (completed.length > 0) {
    const { data: reviewed } = await admin
      .from('reviews')
      .select('booking_id')
      .in('booking_id', completed.map((b) => b.id))
    reviewedBookingIds = new Set((reviewed ?? []).map((r) => r.booking_id as string))
  }
  const prompts: ReviewPromptView[] = completed
    .filter((b) => !reviewedBookingIds.has(b.id))
    .map((b) => ({
      bookingId: b.id,
      sessionName: b.sessionName,
      practitionerName: b.practitionerName,
      practitionerSlug: b.practitionerSlug,
      startUtc: b.startUtc,
    }))

  return { upcoming, past, prompts, reviews }
}
