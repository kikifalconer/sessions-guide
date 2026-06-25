'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { cancelByToken } from './cancelActions'
import type { CancelResult } from '@/lib/cancellation'

// Refund line shown after cancellation. Calm and specific: what was refunded
// and when, or that no refund applies. No apology, no alarm.
function refundLine(result: Extract<CancelResult, { ok: true }>): string | null {
  if (result.paymentStatus === 'refunded' && result.refundAmount > 0) {
    const kind = result.isFull ? 'A full refund' : 'A partial refund'
    return `${kind} of $${result.refundAmount.toFixed(2)} is on its way. Refunds usually take 5 to 10 business days to appear.`
  }
  if (result.offsiteObligation && result.refundAmount > 0) {
    return `A refund of $${result.refundAmount.toFixed(2)} is due from your practitioner, who arranges payment directly with you.`
  }
  if (result.paymentStatus === 'paid' && result.refundAmount === 0) {
    return 'No refund applies under the cancellation policy for this session.'
  }
  return null
}

export default function CancelConfirm({
  token,
  practitionerSlug,
}: {
  token: string
  practitionerSlug: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState<Extract<CancelResult, { ok: true }> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await cancelByToken(token)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDone(result)
    })
  }

  if (done) {
    const line = refundLine(done)
    return (
      <section>
        <h2 className="mb-4">Your session has been cancelled.</h2>
        <p className="mb-1">{done.sessionName}</p>
        <p className="mb-1">{done.whenLabel}</p>
        {line && <p className="mt-4">{line}</p>}
        {practitionerSlug && (
          <Link href={`/${practitionerSlug}`} className="btn-secondary mt-8 inline-block">
            BACK TO PROFILE
          </Link>
        )}
      </section>
    )
  }

  return (
    <div className="mt-8 flex flex-col gap-4">
      {error && <p className="caption text-olive">{error}</p>}
      <div className="flex items-center gap-4">
        <button type="button" className="btn-primary" onClick={submit} disabled={pending}>
          {pending ? 'CANCELLING' : 'CANCEL SESSION'}
        </button>
        {practitionerSlug && (
          <Link href={`/${practitionerSlug}`} className="btn-secondary inline-block">
            KEEP MY SESSION
          </Link>
        )}
      </div>
    </div>
  )
}
