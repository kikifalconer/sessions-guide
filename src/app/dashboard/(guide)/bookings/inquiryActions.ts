'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { InquiryStatus } from '@/lib/inquiries'

export type ActionResult = { ok: boolean; error?: string }

const GENERIC_ERROR = 'Something went wrong. Try again or contact support.'
const SIGN_IN_ERROR = 'Sign in to continue.'
const STATUSES: readonly InquiryStatus[] = ['new', 'read', 'archived']

async function requireUser(): Promise<{ id: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ? { id: user.id } : null
}

// Status changes on a Guide's own inquiry. onlyIfStatus limits the write to
// rows currently in that status, so opening a message can mark it read
// without pulling an archived message back into the inbox.
export async function setInquiryStatus(
  inquiryId: string,
  status: InquiryStatus,
  onlyIfStatus?: InquiryStatus
): Promise<ActionResult> {
  if (!STATUSES.includes(status) || (onlyIfStatus && !STATUSES.includes(onlyIfStatus))) {
    return { ok: false, error: GENERIC_ERROR }
  }

  const user = await requireUser()
  if (!user) return { ok: false, error: SIGN_IN_ERROR }

  const admin = createAdminClient()
  const { data: existing, error: readError } = await admin
    .from('inquiries')
    .select('id, practitioner_id, status')
    .eq('id', inquiryId)
    .maybeSingle()

  if (readError || !existing || existing.practitioner_id !== user.id) {
    return { ok: false, error: GENERIC_ERROR }
  }

  if (onlyIfStatus && existing.status !== onlyIfStatus) return { ok: true }
  if (existing.status === status) return { ok: true }

  let update = admin
    .from('inquiries')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', inquiryId)
    .eq('practitioner_id', user.id)

  if (onlyIfStatus) update = update.eq('status', onlyIfStatus)

  const { data: updated, error } = await update.select('id')
  if (error) return { ok: false, error: GENERIC_ERROR }
  // A concurrent status change can make an only-if update match nothing.
  // Ownership was already checked, so that is not a failure.
  if (!updated || updated.length === 0) {
    if (onlyIfStatus) return { ok: true }
    return { ok: false, error: GENERIC_ERROR }
  }

  revalidatePath('/dashboard/bookings/messages')
  revalidatePath(`/dashboard/bookings/messages/${inquiryId}`)
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}
