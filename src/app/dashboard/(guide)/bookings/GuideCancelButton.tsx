'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelGuideBooking } from '../actions'

export function GuideCancelButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onCancel() {
    if (!confirm('Cancel this booking?')) return
    setBusy(true)
    setError(null)
    const result = await cancelGuideBooking(bookingId)
    if (!result.ok) {
      setError(result.error ?? 'Could not cancel this booking.')
      setBusy(false)
      return
    }
    router.refresh()
  }

  return (
    <div>
      <button
        type="button"
        className="btn-secondary"
        onClick={onCancel}
        disabled={busy}
      >
        {busy ? 'Cancelling' : 'Cancel booking'}
      </button>
      {error && <p className="caption mt-3 text-olive">{error}</p>}
    </div>
  )
}
