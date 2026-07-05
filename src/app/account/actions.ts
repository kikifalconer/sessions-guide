'use server'

import { DateTime } from 'luxon'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cancelBooking } from '@/lib/cancellation'
import { submitReviewForBooking, type ReviewSubmitResult } from '@/lib/reviewSubmit'

// Seeker dashboard actions (D20). Two-layer ownership, matching the dashboard
// CRUD pattern: an explicit seeker_id ownership check up front, and writes
// that go through engines which re-verify state themselves. Session identity
// comes from the server client; ids are never trusted from the client beyond
// selection.

const GENERIC_ERROR = 'Something went wrong. Try again or contact support.'
const SIGN_IN_ERROR = 'Sign in to continue.'

async function requireUser(): Promise<{ id: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ? { id: user.id } : null
}

async function ownsBooking(bookingId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .eq('seeker_id', userId)
    .maybeSingle()
  return Boolean(data)
}

export type OwnCancelResult =
  | {
      ok: true
      refundAmount: number
      isFull: boolean
      offsiteObligation: boolean
      paymentStatus: 'paid' | 'unpaid' | 'refunded' | 'offsite'
    }
  | { ok: false; error: string }

// Self-cancel from the dashboard. Routes through the SAME engine as the
// seeker_token cancel link (policy tiers, Connect refund with
// { stripeAccount }, status transitions) — no second implementation.
export async function cancelOwnBooking(bookingId: string): Promise<OwnCancelResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: SIGN_IN_ERROR }
  if (!bookingId || !(await ownsBooking(bookingId, user.id))) {
    return { ok: false, error: GENERIC_ERROR }
  }

  const result = await cancelBooking({ bookingId, cancelledBy: 'seeker' })
  if (!result.ok) return { ok: false, error: result.error }

  revalidatePath('/account')
  revalidatePath('/dashboard')
  return {
    ok: true,
    refundAmount: result.refundAmount,
    isFull: result.isFull,
    offsiteObligation: result.offsiteObligation,
    paymentStatus: result.paymentStatus,
  }
}

// Review from the dashboard: ownership check here, everything else in the
// shared core (same one the /review/[token] link uses).
export async function submitOwnReview(input: {
  bookingId: string
  rating: number
  body: string
}): Promise<ReviewSubmitResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: SIGN_IN_ERROR }
  if (!input.bookingId || !(await ownsBooking(input.bookingId, user.id))) {
    return { ok: false, error: GENERIC_ERROR }
  }

  const result = await submitReviewForBooking(input)
  if (result.ok) {
    revalidatePath('/account')
    revalidatePath('/dashboard')
  }
  return result
}

export type SettingsResult = { ok: true } | { ok: false; error: string }

// SETTINGS: full_name + the D21 newsletter flag. Upsert, because a
// practitioner (or a pre-0011 auth user) may hold no seekers row yet —
// they are still a valid seeker (D20).
export async function updateSeekerSettings(input: {
  fullName: string
  newsletterOptIn: boolean
}): Promise<SettingsResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: SIGN_IN_ERROR }

  const fullName = input.fullName.trim()
  if (!fullName) return { ok: false, error: 'Enter your name.' }
  if (fullName.length > 200) return { ok: false, error: 'Enter a shorter name.' }

  const admin = createAdminClient()
  const { error } = await admin.from('seekers').upsert(
    {
      id: user.id,
      full_name: fullName,
      newsletter_opt_in: input.newsletterOptIn === true,
      updated_at: DateTime.utc().toISO(),
    },
    { onConflict: 'id' }
  )
  if (error) return { ok: false, error: GENERIC_ERROR }

  revalidatePath('/account')
  return { ok: true }
}
