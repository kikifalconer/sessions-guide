'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendInquiryNotification } from '@/lib/email'

// Inquiry submission. The practitioner is re-resolved from the slug server-side
// (published only), and any session_type_id is validated to belong to that
// practitioner, so a client cannot write an inquiry against an arbitrary or
// unpublished practitioner. Trust only the name, email, and message.
export type InquiryResult = { ok: true } | { ok: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function practitionerEmail(id: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(id)
  return data.user?.email ?? null
}

export async function submitInquiry(input: {
  slug: string
  sessionTypeId: string | null
  name: string
  email: string
  message: string
}): Promise<InquiryResult> {
  const name = input.name.trim()
  const email = input.email.trim()
  const message = input.message.trim()

  if (!name) return { ok: false, error: 'Enter your name.' }
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Enter a valid email.' }
  if (!message) return { ok: false, error: 'Add a message.' }

  const admin = createAdminClient()
  const { data: practitioner } = await admin
    .from('practitioners')
    .select('id, full_name, is_published')
    .eq('slug', input.slug)
    .maybeSingle()
  if (!practitioner || !practitioner.is_published) {
    return { ok: false, error: 'Something went wrong. Try again or contact support.' }
  }

  // Validate the session belongs to this practitioner; otherwise treat the
  // inquiry as profile-level (null), never trust the posted id outright.
  let sessionTypeId: string | null = null
  let sessionName: string | null = null
  if (input.sessionTypeId) {
    const { data: st } = await admin
      .from('session_types')
      .select('id, name')
      .eq('id', input.sessionTypeId)
      .eq('practitioner_id', practitioner.id)
      .eq('is_active', true)
      .maybeSingle()
    if (st) {
      sessionTypeId = st.id as string
      sessionName = st.name as string
    }
  }

  const { error } = await admin.from('inquiries').insert({
    practitioner_id: practitioner.id,
    session_type_id: sessionTypeId,
    seeker_name: name,
    seeker_email: email,
    message: message.slice(0, 4000),
  })
  if (error) {
    return { ok: false, error: 'Something went wrong. Try again or contact support.' }
  }

  await sendInquiryNotification({
    practitionerEmail: await practitionerEmail(practitioner.id),
    seekerName: name,
    seekerEmail: email,
    message,
    sessionName,
  })

  return { ok: true }
}
