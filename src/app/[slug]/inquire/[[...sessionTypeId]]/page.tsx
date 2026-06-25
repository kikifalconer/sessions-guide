import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import InquiryForm from './InquiryForm'

export const metadata = { title: 'Inquire | sessions.guide' }

// Inquiry page. `/[slug]/inquire` is profile-level (About button → null
// session, per D11); `/[slug]/inquire/[sessionTypeId]` carries session context
// (per-card INQUIRE on inquire-priced session types).
export default async function InquirePage({
  params,
}: {
  params: Promise<{ slug: string; sessionTypeId?: string[] }>
}) {
  const { slug, sessionTypeId } = await params
  const admin = createAdminClient()

  const { data: practitioner } = await admin
    .from('practitioners')
    .select('id, full_name, slug, is_published')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()
  if (!practitioner) notFound()

  // Optional session context for the pre-fill. An invalid id falls back to a
  // profile-level inquiry rather than 404-ing the whole page.
  const rawSessionId = sessionTypeId?.[0] ?? null
  let sessionContextId: string | null = null
  let sessionName: string | null = null
  if (rawSessionId) {
    const { data: st } = await admin
      .from('session_types')
      .select('id, name')
      .eq('id', rawSessionId)
      .eq('practitioner_id', practitioner.id)
      .eq('is_active', true)
      .maybeSingle()
    if (st) {
      sessionContextId = st.id as string
      sessionName = st.name as string
    }
  }

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto w-full max-w-xl px-6 py-16">
        <p className="label mb-2 text-dark">INQUIRE</p>
        <h2 className="mb-2">{practitioner.full_name}</h2>
        <p className="mb-8">
          {sessionName
            ? `Send a message about ${sessionName}.`
            : 'Send a message to ask about working together.'}
        </p>

        <InquiryForm
          slug={practitioner.slug}
          sessionTypeId={sessionContextId}
          practitionerName={practitioner.full_name}
          practitionerSlug={practitioner.slug}
        />
      </div>
    </main>
  )
}
