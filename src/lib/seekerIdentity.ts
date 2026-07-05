import { createAdminClient } from '@/lib/supabase/admin'

// Shared seeker identity resolution (D20 / Amendment 3). New bookings carry
// seeker_id with null guest fields, historical rows carry guest_name /
// guest_email; every consumer that needs a display name or recipient email
// resolves through here instead of reading guest fields directly.
//
// Precedence: guest fields when present (historical truth — what the seeker
// typed at the time), account identity otherwise. Account name prefers the
// seekers profile, then the practitioners profile (practitioners are valid
// seekers and may hold no seekers row), then the signup metadata carried
// through the OTP round-trip.

export type SeekerIdentity = {
  name: string // never empty; final fallback 'A seeker'
  email: string | null // null when unresolvable (email sends must skip, not '')
}

export async function accountIdentity(userId: string): Promise<SeekerIdentity> {
  const admin = createAdminClient()
  const [{ data: userData }, { data: seeker }, { data: practitioner }] =
    await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin.from('seekers').select('full_name').eq('id', userId).maybeSingle(),
      admin.from('practitioners').select('full_name').eq('id', userId).maybeSingle(),
    ])

  const user = userData?.user ?? null
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
  const metaName =
    typeof meta.seeker_full_name === 'string' ? meta.seeker_full_name.trim() : ''

  const name =
    (seeker?.full_name as string | undefined)?.trim() ||
    (practitioner?.full_name as string | undefined)?.trim() ||
    metaName ||
    'A seeker'

  return { name, email: user?.email ?? null }
}

export async function resolveSeekerIdentity(booking: {
  seeker_id: string | null
  guest_name: string | null
  guest_email: string | null
}): Promise<SeekerIdentity> {
  const guestName = booking.guest_name?.trim() || null
  const guestEmail = booking.guest_email?.trim() || null

  if (guestName && guestEmail) return { name: guestName, email: guestEmail }
  if (!booking.seeker_id) {
    return { name: guestName ?? 'A seeker', email: guestEmail }
  }

  const account = await accountIdentity(booking.seeker_id)
  return { name: guestName ?? account.name, email: guestEmail ?? account.email }
}
