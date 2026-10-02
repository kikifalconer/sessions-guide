'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateBlockInput, type BlockInput } from '@/lib/availabilityBlock'

// NOTE: a 'use server' module may export ONLY async functions. Do NOT re-export
// types from here (e.g. `export type { BlockInput }`) — the server-action
// transform emits a runtime reference to the re-exported name, which type erasure
// has removed, throwing "X is not defined" at module evaluation. Import shared
// types straight from '@/lib/availabilityBlock' instead.

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

// The load-bearing ownership gate (reused from pass 1's ownsSessionType). A block
// id arrives from the client and is NEVER trusted as proof of ownership: the row
// counts only if BOTH its id and its practitioner_id match. There is no RLS on
// availability_blocks, so this is the sole protection against cross-practitioner
// writes. Every edit/delete routes through here before touching the row.
async function ownsAvailabilityBlock(
  admin: Admin,
  id: string,
  userId: string
): Promise<boolean> {
  if (!id || typeof id !== 'string') return false
  const { data } = await admin
    .from('availability_blocks')
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

export async function createBlock(input: BlockInput): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }

  const result = validateBlockInput(input)
  if ('error' in result) return { ok: false, error: result.error }

  const admin = createAdminClient()
  const { data: practitioner } = await admin
    .from('practitioners')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  if (!practitioner) return { ok: false, error: GENERIC_ERROR }

  // practitioner_id is always the authenticated user, never a client value.
  const { error } = await admin
    .from('availability_blocks')
    .insert({ ...result.row, practitioner_id: user.id })
  if (error) return { ok: false, error: GENERIC_ERROR }

  revalidatePath('/dashboard')
  await revalidateProfile(admin, user.id)
  return { ok: true }
}

export async function updateBlock(id: string, input: BlockInput): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }

  const result = validateBlockInput(input)
  if ('error' in result) return { ok: false, error: result.error }

  const admin = createAdminClient()
  if (!(await ownsAvailabilityBlock(admin, id, user.id))) {
    return { ok: false, error: 'That availability block could not be found.' }
  }

  const { error } = await admin
    .from('availability_blocks')
    .update({ ...result.row, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('practitioner_id', user.id)
  if (error) return { ok: false, error: GENERIC_ERROR }

  revalidatePath('/dashboard')
  await revalidateProfile(admin, user.id)
  return { ok: true }
}

// Soft delete / restore. bookings.availability_block_id is ON DELETE RESTRICT, so
// a hard delete would block or orphan past bookings. is_active = false drops the
// block from discovery and the slot picker (both filter is_active) while keeping
// every booking reference intact, and is reversible.
export async function setBlockActive(id: string, isActive: boolean): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }

  const admin = createAdminClient()
  if (!(await ownsAvailabilityBlock(admin, id, user.id))) {
    return { ok: false, error: 'That availability block could not be found.' }
  }

  const { error } = await admin
    .from('availability_blocks')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('practitioner_id', user.id)
  if (error) return { ok: false, error: GENERIC_ERROR }

  revalidatePath('/dashboard')
  await revalidateProfile(admin, user.id)
  return { ok: true }
}
