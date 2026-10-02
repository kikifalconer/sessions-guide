'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type ActionResult = { ok: boolean; error?: string }

const GENERIC_ERROR = 'Something went wrong. Try again or contact support.'

// D29 Community. Private practitioner notes on a client row. Ownership is
// re-verified against the signed-in user here rather than trusted from the
// client-submitted clientId, same guard shape as every other dashboard write.
export async function updateClientNotes(clientId: string, notes: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }

  const admin = createAdminClient()
  const { data: client, error: readError } = await admin
    .from('clients')
    .select('id, practitioner_id')
    .eq('id', clientId)
    .maybeSingle()

  if (readError || !client || client.practitioner_id !== user.id) {
    return { ok: false, error: GENERIC_ERROR }
  }

  const { error } = await admin
    .from('clients')
    .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', clientId)

  if (error) return { ok: false, error: GENERIC_ERROR }

  revalidatePath(`/dashboard/community/${clientId}`)
  return { ok: true }
}
