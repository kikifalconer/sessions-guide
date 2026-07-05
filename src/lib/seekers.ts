import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

// Seeker profile helpers (D20/D21). seekers.id = auth.users.id, same identity
// pattern as practitioners. All access is service-role (RLS on, no policies).

export type SeekerProfile = {
  id: string
  full_name: string
  newsletter_opt_in: boolean
}

export async function getSeekerProfile(
  userId: string
): Promise<SeekerProfile | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('seekers')
    .select('id, full_name, newsletter_opt_in')
    .eq('id', userId)
    .maybeSingle()
  return (data as SeekerProfile | null) ?? null
}

// Creates the seekers row on first successful magic-link verify (Amendment 2).
// full_name and newsletter_opt_in ride through the OTP round-trip as user
// metadata set by the /login form (signInWithOtp options.data); metadata is
// only applied to NEW auth users, which is exactly the first-verify case.
// Never overwrites an existing row: a returning seeker re-typing a different
// name at sign-in must not silently rename their profile (they edit it in
// /account SETTINGS instead).
export async function ensureSeekerRow(user: User): Promise<void> {
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('seekers')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  if (existing) return

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const metaName = typeof meta.seeker_full_name === 'string' ? meta.seeker_full_name.trim() : ''
  const emailPrefix = (user.email ?? '').split('@')[0]
  const fullName = metaName || emailPrefix || 'Seeker'

  await admin.from('seekers').insert({
    id: user.id,
    full_name: fullName,
    // D21: express opt-in only. Anything other than an explicit true from the
    // signup checkbox stays false.
    newsletter_opt_in: meta.newsletter_opt_in === true,
  })
}
