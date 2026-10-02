'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cancelBooking } from '@/lib/cancellation'

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
      error: 'Finish your profile first. Add your name and at least one modality before publishing.',
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

export async function cancelGuideBooking(bookingId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  // RLS is service-role only (0010). practitioners.id is the auth user id.
  const admin = createAdminClient()
  const { data: practitioner } = await admin
    .from('practitioners')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!practitioner) return { ok: false, error: 'No practitioner profile' }
  const { data: booking } = await admin
    .from('bookings')
    .select('id, practitioner_id')
    .eq('id', bookingId)
    .maybeSingle()

  if (!booking || booking.practitioner_id !== practitioner.id) {
    return { ok: false, error: 'This booking could not be found.' }
  }

  const result = await cancelBooking({ bookingId, cancelledBy: 'practitioner' })
  if (!result.ok) return { ok: false, error: result.error }

  revalidatePath('/dashboard/bookings')
  revalidatePath(`/dashboard/bookings/${bookingId}`)
  return { ok: true }
}
