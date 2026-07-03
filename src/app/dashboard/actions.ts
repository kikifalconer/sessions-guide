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
    .select('slug, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (readError || !row) {
    return { ok: false, error: 'Something went wrong. Try again or contact support.' }
  }

  // Minimum completeness before a profile can go public (H5). The onboarding
  // placeholder row has an empty full_name and its slug set to the auth user id;
  // publishing that would push a nameless, unusable card onto discovery. Require
  // a real name, a real (non-placeholder) slug, and at least one primary
  // modality — the same things onboarding collects.
  const hasName = Boolean(row.full_name && row.full_name.trim())
  const hasRealSlug = Boolean(row.slug && row.slug !== user.id)
  const { count: primaryCount } = await admin
    .from('practitioner_modalities')
    .select('modality_id', { count: 'exact', head: true })
    .eq('practitioner_id', user.id)
    .eq('is_primary', true)
  const hasPrimaryModality = (primaryCount ?? 0) > 0

  if (!hasName || !hasRealSlug || !hasPrimaryModality) {
    return {
      ok: false,
      error: 'Finish your profile first — add your name and at least one modality before publishing.',
    }
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
