import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  runAllChecks,
  totalAnomalies,
  buildDigest,
  sendDigest,
} from '@/lib/agents/anomalyChecks'

// Daily Vercel Cron: read-only booking anomaly watcher. Queries for operational
// anomalies and emails a digest to the admin. Never writes to any business
// table, never mutates a booking, never calls Stripe or Google. Auth matches the
// complete-bookings cron: fail-closed Bearer CRON_SECRET.
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'cron_secret_not_configured' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()

    // runAllChecks guards each check individually, so a single failing check
    // never aborts the run or the digest.
    const checks = await runAllChecks(admin)
    const anomalies = totalAnomalies(checks)

    // Always send, including on zero anomalies.
    const { subject, text } = buildDigest(checks, anomalies)
    const sent = await sendDigest(subject, text)
    if (!sent) {
      console.error('[anomaly-watcher] digest was not sent; the next daily run is the retry')
    }

    return NextResponse.json({ ok: true, anomalies, checks })
  } catch (err) {
    // The whole run failed before any check could execute (e.g. client setup).
    console.error('[anomaly-watcher] run failed before checks', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'run_failed' },
      { status: 500 }
    )
  }
}
