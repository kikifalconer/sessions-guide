'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendReportNotice } from '@/lib/email'

// Public report write (D17) — the first public write in Phase 5. Service-role
// per CLAUDE.md (anon can't write through RLS / TD3). Append-only: every report
// inserts a row (count = signal); the admin notice is deduped to the FIRST
// report per review so repeats can't spam the inbox. No reporter PII is stored.
// The action returns ok regardless of whether the review is reportable, so it
// never leaks a review's existence/state to the reporter.
export type ReportResult = { ok: boolean }

export async function reportReview(reviewId: unknown, reason: unknown): Promise<ReportResult> {
  if (!reviewId || typeof reviewId !== 'string') return { ok: true }
  // A crafted call could pass a non-string reason; coerce rather than throw on
  // reason.trim() (which would surface as a 500) (L3).
  const cleanReason = typeof reason === 'string' ? reason.trim() : ''

  const admin = createAdminClient()

  // You can only report a review you can actually see (published). Unknown or
  // unpublished -> silently ok, no write, no leak.
  const { data: review } = await admin
    .from('reviews')
    .select('id, practitioner_id, is_published')
    .eq('id', reviewId)
    .maybeSingle()
  if (!review || !review.is_published) return { ok: true }

  // Dedupe the admin notice: only the first report of this review notifies.
  const { count } = await admin
    .from('review_reports')
    .select('*', { count: 'exact', head: true })
    .eq('review_id', reviewId)
  const isFirstReport = (count ?? 0) === 0

  // Always append the report row (multiple reports = stronger triage signal).
  await admin.from('review_reports').insert({
    review_id: reviewId,
    reason: cleanReason.slice(0, 2000) || null,
  })

  if (isFirstReport) {
    await sendReportNotice({
      reviewId,
      practitionerId: review.practitioner_id as string,
      reason: cleanReason || null,
    })
  }

  return { ok: true }
}
