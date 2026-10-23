import Link from 'next/link'
import { DateTime } from 'luxon'
import { BRAND_NAME } from '@/lib/brand'
import { listInquiries, type InquiryBox } from '@/lib/inquiries'
import { requirePractitioner } from '../../requirePractitioner'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import SegmentedNav from '@/components/dashboard/SegmentedNav'
import BookingsNav from '@/components/dashboard/BookingsNav'

export const metadata = { title: `messages | ${BRAND_NAME}` }

const INBOX_EMPTY = 'No messages yet. When clients send you a question from your page, it will show up here.'

export default async function DashboardMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ box?: string }>
}) {
  const practitioner = await requirePractitioner()
  const params = await searchParams
  const box: InquiryBox = params.box === 'archived' ? 'archived' : 'inbox'
  const inquiries = await listInquiries(practitioner.id, box)

  return (
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader title="Bookings" />
        <BookingsNav current="messages" />

        <div className="mt-8">
          <p id="message-filters" className="sr-only">
            Message filters
          </p>
          <SegmentedNav
            labelledBy="message-filters"
            items={[
              {
                label: 'Inbox',
                href: '/dashboard/bookings/messages',
                current: box === 'inbox',
              },
              {
                label: 'Archived',
                href: '/dashboard/bookings/messages?box=archived',
                current: box === 'archived',
              },
            ]}
          />
        </div>

        {inquiries.length === 0 ? (
          <EmptyState>{box === 'inbox' ? INBOX_EMPTY : 'No archived messages.'}</EmptyState>
        ) : (
          <ul className="mt-10 flex flex-col gap-2">
            {inquiries.map((item) => {
              const unread = item.status === 'new'
              const dateLabel = DateTime.fromISO(item.createdAt).toFormat('LLL d, yyyy')
              return (
                <li key={item.id}>
                  <Link
                    href={`/dashboard/bookings/messages/${item.id}`}
                    className="flex min-h-[44px] flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 outline-none transition-colors hover:text-olive focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={unread ? 'block font-normal text-olive' : 'block text-dark'}>
                        {unread && <span className="sr-only">Unread. </span>}
                        {item.seekerName}
                      </span>
                      <span className="mt-1 block truncate text-dark">{item.preview}</span>
                    </span>
                    <span className="caption w-36 shrink-0 text-right text-dark opacity-70 sm:w-44">
                      <span className="block truncate">{item.sessionLabel}</span>
                      <span className="mt-1 block">{dateLabel}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
