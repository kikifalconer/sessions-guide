'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cancelBooking, type CancelResult } from '@/lib/cancellation'

// Seeker self-cancel. The opaque seeker_token IS the authorization: it resolves
// to exactly one booking, so no login is required and a seeker cannot reach
// another booking. The full token is never logged.
export async function cancelByToken(token: string): Promise<CancelResult> {
  if (!token || token.length < 32) {
    return { ok: false, error: 'This cancellation link is not valid.' }
  }
  const admin = createAdminClient()
  const { data } = await admin
    .from('bookings')
    .select('id')
    .eq('seeker_token', token)
    .maybeSingle()
  if (!data) {
    return { ok: false, error: 'This cancellation link is not valid.' }
  }
  return cancelBooking({
    bookingId: data.id as string,
    cancelledBy: 'seeker',
    reason: 'seeker_self_cancel',
  })
}
