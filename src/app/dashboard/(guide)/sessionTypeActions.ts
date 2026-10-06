'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateSessionTypeInput, type SessionTypeInput } from '@/lib/sessionType'

// NOTE: a 'use server' module may export ONLY async functions. Do NOT re-export
// types from here (e.g. `export type { SessionTypeInput }`) — the server-action
// transform emits a runtime reference to the re-exported name, which type erasure
// has removed, throwing "X is not defined" at module evaluation. Import shared
// types straight from '@/lib/sessionType' instead.

export type ActionResult = { ok: boolean; error?: string }

const GENERIC_ERROR = 'Something went wrong. Try again or contact support.'

type Admin = ReturnType<typeof createAdminClient>

async function getSessionUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

async function isApprovedModality(admin: Admin, modalityId: string): Promise<boolean> {
  const { data } = await admin
    .from('modalities')
    .select('id')
    .eq('id', modalityId)
    .eq('is_approved', true)
    .maybeSingle()
  return Boolean(data)
}

// The load-bearing ownership gate. A session_type id arrives from the client and
// is NEVER trusted as proof of ownership: the row counts only if BOTH its id and
// its practitioner_id match. There is no RLS on session_types (audit STOP-1), so
// this check is the sole protection against cross-practitioner writes. Every
// edit/delete path must route through here before touching the row.
async function ownsSessionType(
  admin: Admin,
  id: string,
  userId: string
): Promise<boolean> {
  if (!id || typeof id !== 'string') return false
  const { data } = await admin
    .from('session_types')
    .select('id')
    .eq('id', id)
    .eq('practitioner_id', userId)
    .maybeSingle()
  return Boolean(data)
}

async function revalidateProfile(admin: Admin, userId: string) {
  const { data } = await admin
    .from('practitioners')
    .select('slug')
    .eq('id', userId)
    .maybeSingle()
  if (data?.slug) revalidatePath(`/${data.slug}`)
}

export async function createSessionType(input: SessionTypeInput): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }

  const result = validateSessionTypeInput(input)
  if ('error' in result) return { ok: false, error: result.error }

  const admin = createAdminClient()

  const { data: practitioner } = await admin
    .from('practitioners')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  if (!practitioner) return { ok: false, error: GENERIC_ERROR }

  if (!(await isApprovedModality(admin, result.row.modality_id))) {
    return { ok: false, error: 'That modality is not available. Choose from the list.' }
  }

  // practitioner_id is always the authenticated user, never a client value.
  const { error } = await admin
    .from('session_types')
    .insert({ ...result.row, practitioner_id: user.id })
  if (error) return { ok: false, error: GENERIC_ERROR }

  revalidatePath('/dashboard')
  await revalidateProfile(admin, user.id)
  return { ok: true }
}

export async function updateSessionType(
  id: string,
  input: SessionTypeInput
): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }

  const result = validateSessionTypeInput(input)
  if ('error' in result) return { ok: false, error: result.error }

  const admin = createAdminClient()
  if (!(await ownsSessionType(admin, id, user.id))) {
    return { ok: false, error: 'That session type could not be found.' }
  }

  if (!(await isApprovedModality(admin, result.row.modality_id))) {
    return { ok: false, error: 'That modality is not available. Choose from the list.' }
  }

  const { error } = await admin
    .from('session_types')
    .update({ ...result.row, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('practitioner_id', user.id)
  if (error) return { ok: false, error: GENERIC_ERROR }

  revalidatePath('/dashboard')
  await revalidateProfile(admin, user.id)
  return { ok: true }
}

// Soft delete / restore. bookings.session_type_id and inquiries.session_type_id
// are ON DELETE RESTRICT (audit), so a hard delete would block or orphan history.
// is_active = false removes the type from discovery and booking while preserving
// every past reference, and is reversible.
export async function setSessionTypeActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }

  const admin = createAdminClient()
  if (!(await ownsSessionType(admin, id, user.id))) {
    return { ok: false, error: 'That session type could not be found.' }
  }

  const { error } = await admin
    .from('session_types')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('practitioner_id', user.id)
  if (error) return { ok: false, error: GENERIC_ERROR }

  revalidatePath('/dashboard')
  await revalidateProfile(admin, user.id)
  return { ok: true }
}

// Soft prompt support: a session type may use any approved modality. When the
// chosen one is not on the practitioner's profile, the form offers to add it.
// Honours the max-of-three rule from onboarding; never blocks the session itself.
export async function addModalityToProfile(modalityId: string): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }
  if (!modalityId) return { ok: false, error: GENERIC_ERROR }

  const admin = createAdminClient()
  if (!(await isApprovedModality(admin, modalityId))) {
    return { ok: false, error: 'That modality is not available. Choose from the list.' }
  }

  const { data: existing } = await admin
    .from('practitioner_modalities')
    .select('modality_id')
    .eq('practitioner_id', user.id)
  const rows = existing ?? []
  if (rows.some((r) => r.modality_id === modalityId)) return { ok: true }
  if (rows.length >= 3) {
    return {
      ok: false,
      error: 'You have the maximum of three modalities, so this one was not added. You can still offer this session.',
    }
  }

  const { error } = await admin.from('practitioner_modalities').insert({
    practitioner_id: user.id,
    modality_id: modalityId,
    is_primary: rows.length === 0,
  })
  if (error) return { ok: false, error: GENERIC_ERROR }

  revalidatePath('/dashboard')
  await revalidateProfile(admin, user.id)
  return { ok: true }
}
