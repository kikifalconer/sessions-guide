import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DateTime } from 'luxon'
import { BRAND_NAME } from '@/lib/brand'
import { getInquiry } from '@/lib/inquiries'
import { requirePractitioner } from '../../../requirePractitioner'
import BookingsNav from '@/components/dashboard/BookingsNav'
import MessageActions from '../MessageActions'

export const metadata = { title: `message | ${BRAND_NAME}` }

export default async function DashboardMessagePage({
  params,
}: {
  params: Promise<{ inquiryId: string }>
}) {
  const { inquiryId } = await params
  const practitioner = await requirePractitioner()
  const inquiry = await getInquiry(practitioner.id, inquiryId)
  if (!inquiry) notFound()

  const dateLabel = DateTime.fromISO(inquiry.createdAt).toFormat('LLL d, yyyy')
  const backHref =
    inquiry.status === 'archived'
      ? '/dashboard/bookings/messages?box=archived'
      : '/dashboard/bookings/messages'

  return (
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <BookingsNav current="messages" />
        <p className="caption mt-10">
          <Link
            href={backHref}
            className="text-olive outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
          >
            Back to messages
          </Link>
        </p>
        <h1 className="mt-4">{inquiry.seekerName}</h1>
        <p className="caption mt-4 text-dark opacity-70">
          {inquiry.sessionLabel} · {dateLabel}
        </p>
        <p className="mt-2 text-dark">{inquiry.seekerEmail}</p>
        <p className="mt-8 max-w-[68ch] whitespace-pre-wrap text-dark">{inquiry.message}</p>
        <MessageActions
          inquiryId={inquiry.id}
          status={inquiry.status}
          seekerName={inquiry.seekerName}
          seekerEmail={inquiry.seekerEmail}
          message={inquiry.message}
          dateLabel={dateLabel}
        />
      </div>
    </main>
  )
}
