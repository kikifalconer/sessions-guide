'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type ToggleFavoriteResult = { ok: true; saved: boolean } | { ok: false; error: string }

const GENERIC_ERROR = 'Something went wrong. Try again or contact support.'

async function requireUser(): Promise<{ id: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ? { id: user.id } : null
}

// D29 favorites (0017_favorites.sql). Single toggle action -- current state
// is resolved server-side, never trusted from the client's optimistic UI, so
// a stale client can't flip the row the wrong way. The heart is per-user
// state: it must never enter the public profile page's cache, so only
// /account/favorites is revalidated here. The client's optimistic toggle
// plus this action's returned `saved` value is the source of truth for what
// the button shows next.
export async function toggleFavorite(practitionerId: string): Promise<ToggleFavoriteResult> {
  const user = await requireUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }
  if (user.id === practitionerId) return { ok: false, error: GENERIC_ERROR }

  const admin = createAdminClient()
  const { data: existing, error: readError } = await admin
    .from('favorites')
    .select('seeker_id')
    .eq('seeker_id', user.id)
    .eq('practitioner_id', practitionerId)
    .maybeSingle()
  if (readError) return { ok: false, error: GENERIC_ERROR }

  if (existing) {
    const { error } = await admin
      .from('favorites')
      .delete()
      .eq('seeker_id', user.id)
      .eq('practitioner_id', practitionerId)
    if (error) return { ok: false, error: GENERIC_ERROR }
    revalidatePath('/account/favorites')
    return { ok: true, saved: false }
  }

  const { error } = await admin
    .from('favorites')
    .upsert(
      { seeker_id: user.id, practitioner_id: practitionerId },
      { onConflict: 'seeker_id,practitioner_id', ignoreDuplicates: true }
    )
  if (error) return { ok: false, error: GENERIC_ERROR }
  revalidatePath('/account/favorites')
  return { ok: true, saved: true }
}
