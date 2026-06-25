import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import ReviewForm from './ReviewForm'

export const metadata = { title: 'Leave a review | sessions.guide' }

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto w-full max-w-xl px-6 py-16">{children}</div>
    </main>
  )
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data } = await admin
    .from('bookings')
    .select(
      `id, status, guest_name,
       session_types ( name ),
       practitioners ( full_name, slug )`
    )
    .eq('seeker_token', token)
    .maybeSingle()

  if (!data) {
    return (
      <Shell>
        <h2 className="mb-4">This review link is not valid.</h2>
        <p>Check the link in your email, or contact your practitioner directly.</p>
      </Shell>
    )
  }

  const st = data.session_types as unknown as { name: string } | null
  const p = data.practitioners as unknown as { full_name: string; slug: string } | null
  const sessionName = st?.name ?? 'your session'
  const practitionerName = p?.full_name ?? 'your practitioner'
  const slug = p?.slug ?? null

  // A session can be reviewed only once it is complete.
  if (data.status === 'cancelled') {
    return (
      <Shell>
        <h2 className="mb-4">This session was cancelled.</h2>
        <p>There is nothing to review here. Reach out to {practitionerName} to rebook.</p>
      </Shell>
    )
  }
  if (data.status !== 'completed') {
    return (
      <Shell>
        <h2 className="mb-4">Your session is still ahead.</h2>
        <p>You can leave a review once your session with {practitionerName} is complete.</p>
      </Shell>
    )
  }

  // Already reviewed: one review per booking.
  const { data: existing } = await admin
    .from('reviews')
    .select('id')
    .eq('booking_id', data.id)
    .maybeSingle()
  if (existing) {
    return (
      <Shell>
        <h2 className="mb-4">You have already reviewed this session.</h2>
        <p>Thank you for sharing your experience with {practitionerName}.</p>
        {slug && (
          <Link href={`/${slug}`} className="btn-secondary mt-8 inline-block">
            VIEW PROFILE
          </Link>
        )}
      </Shell>
    )
  }

  const reviewerName = (data.guest_name as string | null)?.trim() || 'A seeker'

  return (
    <Shell>
      <p className="label mb-2 text-dark">LEAVE A REVIEW</p>
      <h2 className="mb-2">{practitionerName}</h2>
      <p className="mb-8">{sessionName}</p>

      <ReviewForm
        token={token}
        practitionerName={practitionerName}
        practitionerSlug={slug}
        reviewerName={reviewerName}
      />
    </Shell>
  )
}
