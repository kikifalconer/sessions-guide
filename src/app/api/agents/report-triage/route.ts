import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  gatherReports,
  triageReview,
  buildDigest,
  sendDigest,
  type TriageOutcome,
} from '@/lib/agents/reportTriage'

// Daily Vercel Cron: read-only review-report triage. Classifies each newly
// reported review with one Claude API call and emails the admin a digest. Never
// writes to reviews, review_reports, or any other table, and never unpublishes
// anything. Auth matches the anomaly-watcher / complete-bookings cron:
// fail-closed Bearer CRON_SECRET.
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

    // Gather runs before any triage; if IT fails, the whole run fails (500).
    const { toTriage, previouslyActioned, reportsFound, overflow } = await gatherReports(admin)

    const outcomes: TriageOutcome[] = previouslyActioned.map((review) => ({
      kind: 'previously_actioned' as const,
      review,
    }))

    // triageReview never throws: one review's API/parse failure never aborts the
    // run or the digest.
    let failures = 0
    for (const review of toTriage) {
      const outcome = await triageReview(review)
      outcomes.push(outcome)
      if (outcome.kind === 'failed' || outcome.kind === 'unparsed') failures += 1
    }

    const reviewsTriaged = toTriage.length

    // Always send, including on zero new reports.
    const { subject, text } = buildDigest(outcomes, reportsFound, reviewsTriaged, overflow)
    const sent = await sendDigest(subject, text)
    if (!sent) {
      console.error('[report-triage] digest was not sent; the next daily run is the retry')
    }

    return NextResponse.json({
      ok: true,
      reports_found: reportsFound,
      reviews_triaged: reviewsTriaged,
      failures,
    })
  } catch (err) {
    // The whole run failed before any triage could execute (e.g. client setup or
    // the gather query).
    console.error('[report-triage] run failed before triage', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'run_failed' },
      { status: 500 }
    )
  }
}
