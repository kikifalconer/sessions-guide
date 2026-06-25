'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type ActionResult = { ok: boolean; error?: string }

export async function publishProfile(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }

  const admin = createAdminClient()
  const { data: row, error: readError } = await admin
    .from('practitioners')
    .select('slug')
    .eq('id', user.id)
    .maybeSingle()

  if (readError || !row) {
    return { ok: false, error: 'Something went wrong. Try again or contact support.' }
  }

  const { error } = await admin
    .from('practitioners')
    .update({ is_published: true, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    return { ok: false, error: 'Something went wrong. Try again or contact support.' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/${row.slug}`)
  return { ok: true }
}
