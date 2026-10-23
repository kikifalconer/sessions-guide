'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BRAND_NAME } from '@/lib/brand'
import { setInquiryStatus } from '../inquiryActions'

type InquiryStatus = 'new' | 'read' | 'archived'

function replyMailto(email: string, name: string, dateLabel: string, message: string): string {
  const quoted = message
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')
  const body = `\n\nOn ${dateLabel}, ${name} wrote:\n${quoted}`
  const subject = `Re: your question on ${BRAND_NAME}`
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export default function MessageActions({
  inquiryId,
  status,
  seekerName,
  seekerEmail,
  message,
  dateLabel,
}: {
  inquiryId: string
  status: InquiryStatus
  seekerName: string
  seekerEmail: string
  message: string
  dateLabel: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const marked = useRef(false)

  useEffect(() => {
    if (status !== 'new' || marked.current) return
    marked.current = true
    startTransition(async () => {
      const result = await setInquiryStatus(inquiryId, 'read', 'new')
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
        return
      }
      router.refresh()
    })
  }, [inquiryId, router, status])

  const update = (next: InquiryStatus) => {
    setError(null)
    startTransition(async () => {
      const result = await setInquiryStatus(inquiryId, next)
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mt-10">
      <div className="flex flex-wrap gap-2">
        <a className="btn-primary" href={replyMailto(seekerEmail, seekerName, dateLabel, message)}>
          Reply by email
        </a>
        {status === 'archived' ? (
          <button type="button" className="btn-secondary" disabled={pending} onClick={() => update('read')}>
            Move to inbox
          </button>
        ) : (
          <button type="button" className="btn-secondary" disabled={pending} onClick={() => update('archived')}>
            Archive
          </button>
        )}
        {status !== 'new' && (
          <button type="button" className="btn-secondary" disabled={pending} onClick={() => update('new')}>
            Mark as unread
          </button>
        )}
      </div>
      {error && <p className="caption mt-4 text-olive">{error}</p>}
    </div>
  )
}
