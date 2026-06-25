'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { disconnectCalendar } from './calendarActions'

// SETTINGS panel: connect / disconnect the practitioner's Google Calendar.
// Connected state is fetched server-side and passed in; disconnect reuses the
// existing disconnectCalendar action, then router.refresh() re-reads the
// server props so the panel flips to not-connected.
export default function CalendarSettings({
  connected,
  calendarId,
  syncEnabled,
}: {
  connected: boolean
  calendarId: string | null
  syncEnabled: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const disconnect = () => {
    setError(null)
    startTransition(async () => {
      const result = await disconnectCalendar()
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      <p className="label text-dark">GOOGLE CALENDAR</p>

      {connected ? (
        <>
          <p className="caption text-olive">
            CONNECTED{calendarId ? ` (${calendarId.toUpperCase()})` : ''}
          </p>
          {!syncEnabled && (
            <p className="caption text-dark">Syncing is paused. Reconnect to resume.</p>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={disconnect}
            disabled={pending}
          >
            {pending ? 'DISCONNECTING' : 'DISCONNECT'}
          </button>
        </>
      ) : (
        <>
          <p className="caption text-dark">NOT CONNECTED</p>
          <p>Connecting keeps your bookings and your Google Calendar in sync, both ways.</p>
          <a href="/api/google/connect" className="btn-primary inline-block">
            CONNECT GOOGLE CALENDAR
          </a>
        </>
      )}

      {error && <p className="caption text-olive">{error}</p>}
    </div>
  )
}
