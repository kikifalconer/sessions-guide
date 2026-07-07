import { DateTime } from 'luxon'
import { Resend } from 'resend'
import type { createAdminClient } from '@/lib/supabase/admin'

// Booking anomaly watcher: read-only operational diagnostics. Every check is a
// named function returning { check, count, items }, where items are short
// one-line descriptors (booking/practitioner ids), capped at MAX_ITEMS. Column
// names verified against schema.md. Nothing here writes to any business table.

type Admin = ReturnType<typeof createAdminClient>

export type CheckResult = {
  check: string
  count: number
  items: string[]
  failed?: boolean
}

const MAX_ITEMS = 20

const short = (id: unknown): string => (typeof id === 'string' ? id.slice(0, 8) : '?')
const fmt = (iso: unknown): string =>
  typeof iso === 'string'
    ? `${DateTime.fromISO(iso).toUTC().toFormat('yyyy-LL-dd HH:mm')} UTC`
    : 'unknown'

type Row = Record<string, unknown>
type QueryResult = {
  data: Row[] | null
  count: number | null
  error: { message?: string } | null
}

// Runs a count-exact query (total count, items capped at MAX_ITEMS) and maps
// each returned row to a one-line descriptor. Throws on a query error so the
// per-check guard in runAllChecks turns it into a CHECK FAILED line.
async function collect(
  check: string,
  run: () => PromiseLike<QueryResult>,
  toItem: (row: Row) => string
): Promise<CheckResult> {
  const { data, count, error } = await run()
  if (error) throw new Error(error.message ?? 'query failed')
  const rows = data ?? []
  return { check, count: count ?? rows.length, items: rows.slice(0, MAX_ITEMS).map(toItem) }
}

// 1. Bookings stuck awaiting practitioner approval: pending_approval, created
//    more than 72h ago, session still in the future.
export async function stuckPendingApproval(admin: Admin): Promise<CheckResult> {
  const now = DateTime.utc()
  const cut72 = now.minus({ hours: 72 }).toISO() as string
  const nowIso = now.toISO() as string
  return collect(
    'stuck_pending_approval',
    () =>
      admin
        .from('bookings')
        .select('id, practitioner_id, start_datetime', { count: 'exact' })
        .eq('status', 'pending_approval')
        .lt('created_at', cut72)
        .gt('start_datetime', nowIso)
        .limit(MAX_ITEMS) as unknown as PromiseLike<QueryResult>,
    (r) => `booking ${short(r.id)} pract ${short(r.practitioner_id)} starts ${fmt(r.start_datetime)}`
  )
}

// 2. Confirmed bookings whose session ended more than 26h ago and were never
//    promoted to completed (the hourly completion cron should have caught them).
export async function overdueCompletion(admin: Admin): Promise<CheckResult> {
  const cut26 = DateTime.utc().minus({ hours: 26 }).toISO() as string
  return collect(
    'overdue_completion',
    () =>
      admin
        .from('bookings')
        .select('id, practitioner_id, end_datetime', { count: 'exact' })
        .eq('status', 'confirmed')
        .lt('end_datetime', cut26)
        .limit(MAX_ITEMS) as unknown as PromiseLike<QueryResult>,
    (r) => `booking ${short(r.id)} pract ${short(r.practitioner_id)} ended ${fmt(r.end_datetime)}`
  )
}

// 3. Cancelled + paid bookings with a recorded refund amount but no Stripe
//    refund id (a refund the ledger believes happened but Stripe never issued).
export async function refundGap(admin: Admin): Promise<CheckResult> {
  return collect(
    'refund_gap',
    () =>
      admin
        .from('bookings')
        .select('id, practitioner_id, amount_refunded', { count: 'exact' })
        .eq('status', 'cancelled')
        .eq('payment_status', 'paid')
        .gt('amount_refunded', 0)
        .is('stripe_refund_id', null)
        .limit(MAX_ITEMS) as unknown as PromiseLike<QueryResult>,
    (r) =>
      `booking ${short(r.id)} pract ${short(r.practitioner_id)} refunded ${String(r.amount_refunded)} no refund id`
  )
}

// 4. Offsite bookings still open (pending_payment or confirmed) more than 7 days
//    after the session ended, where the practitioner likely never reconciled.
export async function offsitePastUnresolved(admin: Admin): Promise<CheckResult> {
  const cut7d = DateTime.utc().minus({ days: 7 }).toISO() as string
  return collect(
    'offsite_past_unresolved',
    () =>
      admin
        .from('bookings')
        .select('id, practitioner_id, status, end_datetime', { count: 'exact' })
        .eq('payment_status', 'offsite')
        .in('status', ['pending_payment', 'confirmed'])
        .lt('end_datetime', cut7d)
        .limit(MAX_ITEMS) as unknown as PromiseLike<QueryResult>,
    (r) =>
      `booking ${short(r.id)} pract ${short(r.practitioner_id)} ${String(r.status)} ended ${fmt(r.end_datetime)}`
  )
}

// 5. Calendar integrations with sync disabled (a revoked or expired grant that
//    is degraded and awaiting practitioner reconnect).
export async function calendarSyncDisabled(admin: Admin): Promise<CheckResult> {
  return collect(
    'calendar_sync_disabled',
    () =>
      admin
        .from('calendar_integrations')
        .select('practitioner_id, last_synced_at', { count: 'exact' })
        .eq('sync_enabled', false)
        .limit(MAX_ITEMS) as unknown as PromiseLike<QueryResult>,
    (r) =>
      `pract ${short(r.practitioner_id)} sync disabled last sync ${r.last_synced_at ? fmt(r.last_synced_at) : 'never'}`
  )
}

// 6. Sync-enabled integrations whose cached free/busy has not refreshed in more
//    than 26h (includes never-synced rows: an enabled integration that has never
//    synced is a sync-health anomaly too). See report note.
export async function calendarBusyStale(admin: Admin): Promise<CheckResult> {
  const cut26 = DateTime.utc().minus({ hours: 26 }).toISO() as string
  return collect(
    'calendar_busy_stale',
    () =>
      admin
        .from('calendar_integrations')
        .select('practitioner_id, last_synced_at', { count: 'exact' })
        .eq('sync_enabled', true)
        .or(`last_synced_at.is.null,last_synced_at.lt.${cut26}`)
        .limit(MAX_ITEMS) as unknown as PromiseLike<QueryResult>,
    (r) => `pract ${short(r.practitioner_id)} last sync ${r.last_synced_at ? fmt(r.last_synced_at) : 'never'}`
  )
}

// 7. Non-cancelled bookings more than 48h past their end with no review request
//    sent (review-request cron health).
export async function reviewRequestOverdue(admin: Admin): Promise<CheckResult> {
  const cut48 = DateTime.utc().minus({ hours: 48 }).toISO() as string
  return collect(
    'review_request_overdue',
    () =>
      admin
        .from('bookings')
        .select('id, practitioner_id, status, end_datetime', { count: 'exact' })
        .neq('status', 'cancelled')
        .lt('end_datetime', cut48)
        .is('review_request_sent_at', null)
        .limit(MAX_ITEMS) as unknown as PromiseLike<QueryResult>,
    (r) =>
      `booking ${short(r.id)} pract ${short(r.practitioner_id)} ${String(r.status)} ended ${fmt(r.end_datetime)}`
  )
}

const CHECKS: { name: string; run: (admin: Admin) => Promise<CheckResult> }[] = [
  { name: 'stuck_pending_approval', run: stuckPendingApproval },
  { name: 'overdue_completion', run: overdueCompletion },
  { name: 'refund_gap', run: refundGap },
  { name: 'offsite_past_unresolved', run: offsitePastUnresolved },
  { name: 'calendar_sync_disabled', run: calendarSyncDisabled },
  { name: 'calendar_busy_stale', run: calendarBusyStale },
  { name: 'review_request_overdue', run: reviewRequestOverdue },
]

// Runs every check, guarding each independently: a check that throws becomes a
// CHECK FAILED result and never aborts the run or the digest.
export async function runAllChecks(admin: Admin): Promise<CheckResult[]> {
  const out: CheckResult[] = []
  for (const c of CHECKS) {
    try {
      out.push(await c.run(admin))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      out.push({ check: c.name, count: 0, items: [`CHECK FAILED: ${c.name}: ${msg}`], failed: true })
    }
  }
  return out
}

export function totalAnomalies(checks: CheckResult[]): number {
  return checks.reduce((n, c) => n + (c.failed ? 0 : c.count), 0)
}

// Plain-text digest. Brand voice: no em dashes, no exclamation points, calm and
// directional.
export function buildDigest(
  checks: CheckResult[],
  anomalies: number
): { subject: string; text: string } {
  const noun = anomalies === 1 ? 'anomaly' : 'anomalies'
  const subject = anomalies > 0 ? `Daily ops digest: ${anomalies} ${noun}` : 'Daily ops digest: clear'

  const lines: string[] = ['Daily ops digest for sessions.guide.', '']
  lines.push(
    anomalies > 0
      ? `${anomalies} ${noun} across ${checks.length} checks.`
      : `No anomalies across ${checks.length} checks. All clear.`
  )
  lines.push('')

  for (const c of checks) {
    if (c.failed) {
      for (const it of c.items) lines.push(it)
    } else if (c.count === 0) {
      lines.push(`${c.check}: clear`)
    } else {
      lines.push(`${c.check}: ${c.count}`)
      for (const it of c.items) lines.push(`  ${it}`)
      if (c.count > c.items.length) lines.push(`  and ${c.count - c.items.length} more`)
    }
  }

  lines.push('')
  lines.push('This digest is read only. No bookings were changed.')
  return { subject, text: lines.join('\n') }
}

// Sends the digest to the admin. The shared email.ts deliver() choke point is
// not exported, so its TD10 behavior is replicated here rather than modifying
// email.ts: inspect the returned { error }, catch thrown errors, both resolve
// to false, and log on failure (no sent-flag exists; the next daily run is the
// retry). Recipient + sender follow the report-notice pattern.
export async function sendDigest(subject: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    console.error('[anomaly-watcher] email not configured; RESEND_API_KEY or RESEND_FROM_EMAIL missing')
    return false
  }
  const to = process.env.REPORT_NOTICE_EMAIL ?? 'hello@sessions.guide'
  const resend = new Resend(apiKey)
  try {
    const { error } = await resend.emails.send({ from, to, subject, text })
    if (error) {
      console.error(`[anomaly-watcher] digest send failed: ${error.message ?? String(error)}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[anomaly-watcher] digest send threw:', err)
    return false
  }
}
