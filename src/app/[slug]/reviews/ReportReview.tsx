'use client'

import { useState, useTransition } from 'react'
import { reportReview } from './reportActions'

// Calm, composed, non-accusatory report affordance. Sensitive context: no
// exclamation, no alarm. Optional reason; confirmation makes no promise of
// follow-up (the report path is public and may be bad-faith).
export default function ReportReview({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  if (done) {
    return <p className="caption mt-2 text-dark opacity-70">Thank you for flagging it.</p>
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="caption mt-2 text-dark opacity-50 transition-opacity hover:opacity-100"
      >
        REPORT
      </button>
    )
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <label htmlFor={`reason-${reviewId}`} className="caption text-dark opacity-70">
        TELL US WHY (OPTIONAL)
      </label>
      <textarea
        id={`reason-${reviewId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={2000}
        className="w-full border border-border bg-surface px-3 py-2 font-heading font-light text-[0.85rem] text-dark outline-none focus:border-olive"
      />
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await reportReview(reviewId, reason)
              setDone(true)
            })
          }
          className="caption text-olive"
        >
          {pending ? 'SENDING' : 'SUBMIT REPORT'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="caption text-dark opacity-50"
        >
          CANCEL
        </button>
      </div>
    </div>
  )
}
