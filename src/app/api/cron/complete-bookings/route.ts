import { NextRequest, NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendReviewRequestEmail } from '@/lib/email'
import { reviewUrl } from '@/lib/siteUrl'
import { getValidAccessToken, queryFreeBusy } from '@/lib/calendar'

// Hourly Vercel Cron. Three independent passes:
//   (a) promote confirmed -> completed once end_datetime has passed (D7);
//   (b) send the review-request email ~24h after end_datetime, decoupled from
//       the completion moment (D9), idempotent via review_request_sent_at;
//   (c) refresh cached calendar_busy windows from Google free/busy (D4).
// Each pass is independently failure-guarded — none throws into another.
// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically when
// CRON_SECRET is set in the project env.
export const runtime = 'nodejs'

const REVIEW_DELAY_HOURS = 24
const BUSY_HORIZON_DAYS = 56 // matches the slot generator horizon

// Pass (c): refresh each enabled integration's cached free/busy windows. Fully
// isolated — wrapped by the caller, and per-practitioner guarded here.
async function refreshCalendarBusy(): Promise<number> {
  const admin = createAdminClient()
  const { data: integrations } = await admin
    .from('calendar_integrations')
    .select('practitioner_id, calendar_id')
    .eq('sync_enabled', true)

  const timeMin = DateTime.utc().toISO() as string
  const timeMax = DateTime.utc().plus({ days: BUSY_HORIZON_DAYS }).toISO() as string
  let synced = 0

  for (const integ of integrations ?? []) {
    try {
      const token = await getValidAccessToken(integ.practitioner_id as string)
      if (!token) continue // degraded/revoked integration; skip, never block
      const windows = await queryFreeBusy(
        token,
        (integ.calendar_id as string) ?? 'primary',
        timeMin,
        timeMax
      )
      // Replace this practitioner's cached windows.
      await admin.from('calendar_busy').delete().eq('practitioner_id', integ.practitioner_id)
      if (windows.length > 0) {
        await admin.from('calendar_busy').insert(
          windows.map((w) => ({
            practitioner_id: integ.practitioner_id,
            start_datetime: w.start_datetime,
            end_datetime: w.end_datetime,
          }))
        )
      }
      await admin
        .from('calendar_integrations')
        .update({ last_synced_at: DateTime.utc().toISO() })
        .eq('practitioner_id', integ.practitioner_id)
      synced += 1
    } catch {
      // One practitioner's sync failure never affects the others or pass (a)/(b).
    }
  }
  return synced
}

function whenLabel(startUtc: string, zone: string): string {
  return (
    DateTime.fromISO(startUtc).setZone(zone).toFormat('cccc, LLLL d, yyyy, h:mm a') +
    ` (${zone})`
  )
}

async function practitionerEmail(id: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(id)
  return data.user?.email ?? null
}

export async function GET(req: NextRequest) {
  // Explicit, fail-closed auth. A missing secret is a misconfiguration, not an
  // open door.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'cron_secret_not_configured' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const nowIso = DateTime.utc().toISO() as string
  const reviewCutoffIso = DateTime.utc().minus({ hours: REVIEW_DELAY_HOURS }).toISO() as string

  // (a) Promote confirmed -> completed where the session has ended.
  const { data: promoted, error: promoteError } = await admin
    .from('bookings')
    .update({ status: 'completed', updated_at: nowIso })
    .eq('status', 'confirmed')
    .lt('end_datetime', nowIso)
    .select('id')
  if (promoteError) {
    return NextResponse.json({ error: 'promote_failed' }, { status: 500 })
  }

  // (b) Review-request candidates: completed, ended >= 24h ago, not yet sent.
  const { data: candidates } = await admin
    .from('bookings')
    .select(
      `id, seeker_token, guest_name, guest_email, practitioner_id, start_datetime,
       session_types ( name ),
       practitioners ( full_name ),
       availability_blocks ( timezone )`
    )
    .eq('status', 'completed')
    .is('review_request_sent_at', null)
    .lt('end_datetime', reviewCutoffIso)

  let requested = 0
  const rows = candidates ?? []

  // Drop candidates that already have a review (one extra query, not N+1).
  const ids = rows.map((r) => r.id as string)
  let reviewedIds = new Set<string>()
  if (ids.length > 0) {
    const { data: reviews } = await admin.from('reviews').select('booking_id').in('booking_id', ids)
    reviewedIds = new Set((reviews ?? []).map((r) => r.booking_id as string))
  }

  for (const row of rows) {
    if (reviewedIds.has(row.id as string)) continue
    if (!row.guest_email) continue

    const st = row.session_types as unknown as { name: string } | null
    const p = row.practitioners as unknown as { full_name: string } | null
    const block = row.availability_blocks as unknown as { timezone: string } | null

    try {
      const sent = await sendReviewRequestEmail({
        seekerName: (row.guest_name as string | null) ?? '',
        seekerEmail: row.guest_email as string,
        practitionerName: p?.full_name ?? 'your practitioner',
        sessionName: st?.name ?? 'your session',
        whenLabel: whenLabel(row.start_datetime as string, block?.timezone ?? 'UTC'),
        reviewUrl: reviewUrl(row.seeker_token as string),
      })
      // Stamp only on a real send so a transient failure retries next pass.
      if (sent) {
        await admin
          .from('bookings')
          .update({ review_request_sent_at: nowIso })
          .eq('id', row.id)
        requested += 1
      }
    } catch {
      // One bad row never aborts the batch.
    }
  }

  // (c) Calendar busy refresh — isolated: its own try/catch so a calendar
  // outage can never affect the completion/review passes above.
  let calendarSynced = 0
  try {
    calendarSynced = await refreshCalendarBusy()
  } catch {
    calendarSynced = -1 // signal the pass errored without throwing the request
  }

  return NextResponse.json({
    ok: true,
    completed: promoted?.length ?? 0,
    reviewRequestsSent: requested,
    calendarSynced,
  })
}
