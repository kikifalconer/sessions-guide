import { DateTime } from 'luxon'
import { Resend } from 'resend'
import { getSiteUrl } from '@/lib/siteUrl'
import type { createAdminClient } from '@/lib/supabase/admin'

// Review-report triage: read-only daily pass over newly reported reviews. For
// each review with a report in the last 25h it calls the Claude API to classify
// the report and recommend an action, then the route emails the admin a digest.
// This NEVER writes to reviews, review_reports, or any other table, and never
// unpublishes anything. Every recommendation is advisory. Structural twin of the
// anomaly watcher (auth, response shape, digest conventions, error handling).
//
// Column names verified against schema.md: review_reports(review_id, reason,
// created_at); reviews(id, rating, body, reviewer_name, is_published,
// practitioner_id); practitioners(full_name, slug).

type Admin = ReturnType<typeof createAdminClient>

// The Claude model. Verified via the claude-api skill (Anthropic's current model
// reference) on 2026-07-07 rather than recalled from memory. Haiku 4.5 is chosen
// because this task pins temperature 0, and temperature is REJECTED with a 400 on
// the Opus 4.8/4.7, Sonnet 5, and Fable 5 tier; Haiku 4.5 accepts it and is the
// right tier for a bounded JSON classification.
const TRIAGE_MODEL = 'claude-haiku-4-5'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const CALL_TIMEOUT_MS = 30_000
const MAX_REVIEWS = 20
const WINDOW_HOURS = 25

// The only recommendation values that exist (allowlist, not a prohibition).
const RECOMMENDATIONS = ['no_action', 'monitor', 'review_manually'] as const
export type TriageRecommendation = (typeof RECOMMENDATIONS)[number]

export const SYSTEM_PROMPT = [
  'You are a moderation triage assistant for a wellness marketplace.',
  'Reviews on this platform are booking-verified: only a seeker who completed a real session can leave one.',
  'Practitioners cannot remove or edit reviews. Your job is to classify the report, not to moderate.',
  'A human reads your output and decides whether to act. You take no action yourself.',
  '',
  'Respond with ONLY a JSON object. No markdown fences, no preamble, no trailing text. Exactly this shape:',
  '{',
  '  "classification": "spam" | "abuse_or_harassment" | "legitimate_negative" | "suspected_bad_faith" | "unclear",',
  '  "confidence": "high" | "medium" | "low",',
  '  "recommendation": "no_action" | "monitor" | "review_manually",',
  '  "rationale": "<one sentence, max 40 words>"',
  '}',
].join('\n')

type ReviewMeta = {
  review_id: string
  practitioner_name: string
  practitioner_slug: string
  rating: number
  report_count: number // total reports for this review (triage signal, D17)
  new_reports: number // reports in the last 25h window
  body: string | null
  reviewer_name: string
  reasons: string[] // all report reason texts for this review
}

export type TriageOutcome =
  | {
      kind: 'triaged'
      review: ReviewMeta
      classification: string
      confidence: string
      recommendation: TriageRecommendation
      rationale: string
      coerced: boolean
    }
  | { kind: 'previously_actioned'; review: ReviewMeta }
  | { kind: 'unparsed'; review: ReviewMeta; raw: string }
  | { kind: 'failed'; review: ReviewMeta; error: string }

export type GatherResult = {
  toTriage: ReviewMeta[]
  previouslyActioned: ReviewMeta[]
  reportsFound: number // report rows in the 25h window
  overflow: number // published reviews beyond the MAX_REVIEWS cap
}

const short = (id: unknown): string => (typeof id === 'string' ? id.slice(0, 8) : '?')

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

// --- data gathering -------------------------------------------------------

export async function gatherReports(admin: Admin): Promise<GatherResult> {
  const cut25 = DateTime.utc().minus({ hours: WINDOW_HOURS }).toISO() as string

  // 1. Reviews reported in the window.
  const { data: windowRows, error: wErr } = await admin
    .from('review_reports')
    .select('review_id')
    .gt('created_at', cut25)
  if (wErr) throw new Error(wErr.message)

  const window = windowRows ?? []
  const reportsFound = window.length
  const reviewIds = [...new Set(window.map((r) => r.review_id as string))]
  if (reviewIds.length === 0) {
    return { toTriage: [], previouslyActioned: [], reportsFound: 0, overflow: 0 }
  }

  const newByReview = new Map<string, number>()
  for (const r of window) {
    const id = r.review_id as string
    newByReview.set(id, (newByReview.get(id) ?? 0) + 1)
  }

  // 2. ALL reports for those reviews (total count is the triage signal, D17).
  const { data: allReports, error: rErr } = await admin
    .from('review_reports')
    .select('review_id, reason')
    .in('review_id', reviewIds)
  if (rErr) throw new Error(rErr.message)

  const totalByReview = new Map<string, { count: number; reasons: string[] }>()
  for (const r of allReports ?? []) {
    const id = r.review_id as string
    const e = totalByReview.get(id) ?? { count: 0, reasons: [] }
    e.count += 1
    if (r.reason) e.reasons.push(String(r.reason))
    totalByReview.set(id, e)
  }

  // 3. The reviews + their practitioner.
  const { data: reviews, error: revErr } = await admin
    .from('reviews')
    .select('id, rating, body, reviewer_name, is_published, practitioners ( full_name, slug )')
    .in('id', reviewIds)
  if (revErr) throw new Error(revErr.message)

  const previouslyActioned: ReviewMeta[] = []
  const candidates: ReviewMeta[] = []

  for (const rev of reviews ?? []) {
    const id = rev.id as string
    const total = totalByReview.get(id) ?? { count: 0, reasons: [] }
    const p = firstOf(rev.practitioners as unknown as { full_name?: string; slug?: string } | null)
    const meta: ReviewMeta = {
      review_id: id,
      practitioner_name: (p?.full_name as string | undefined) ?? 'unknown practitioner',
      practitioner_slug: (p?.slug as string | undefined) ?? '',
      rating: (rev.rating as number | null) ?? 0,
      report_count: total.count,
      new_reports: newByReview.get(id) ?? 0,
      body: (rev.body as string | null) ?? null,
      reviewer_name: (rev.reviewer_name as string | null) ?? 'a seeker',
      reasons: total.reasons,
    }
    // Unpublished reviews were already actioned; note them, do not re-triage.
    if (rev.is_published === false) previouslyActioned.push(meta)
    else candidates.push(meta)
  }

  // Cap triage at MAX_REVIEWS, keeping the highest report counts.
  candidates.sort((a, b) => b.report_count - a.report_count)
  const toTriage = candidates.slice(0, MAX_REVIEWS)
  const overflow = Math.max(0, candidates.length - MAX_REVIEWS)

  return { toTriage, previouslyActioned, reportsFound, overflow }
}

// --- the LLM call ---------------------------------------------------------

// User message per call. Only the listed fields: rating, body, reviewer name,
// practitioner name, report count, each report reason. No emails, no tokens, no
// ids.
function userMessage(r: ReviewMeta): string {
  const lines = [
    `Review rating: ${r.rating} of 5`,
    `Reviewer name: ${r.reviewer_name}`,
    `Practitioner: ${r.practitioner_name}`,
    `Report count: ${r.report_count}`,
    '',
    'Review body:',
    r.body && r.body.trim() ? r.body.trim() : '(no body)',
    '',
    'Report reasons:',
  ]
  if (r.reasons.length === 0) lines.push('(none given)')
  else for (const reason of r.reasons) lines.push(`- ${reason}`)
  return lines.join('\n')
}

type CallResult = { ok: true; text: string } | { ok: false; error: string }

async function callClaude(user: string): Promise<CallResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { ok: false, error: 'ANTHROPIC_API_KEY not set' }
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: TRIAGE_MODEL,
        max_tokens: 1024,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: user }],
      }),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return { ok: false, error: `HTTP ${res.status} ${detail.slice(0, 200)}`.trim() }
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[] }
    const text = (json.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
      .trim()
    if (!text) return { ok: false, error: 'empty response' }
    return { ok: true, text }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'request failed' }
  }
}

// Strip accidental code fences and parse the JSON object defensively.
function parseTriage(text: string): {
  classification: string
  confidence: string
  recommendation: TriageRecommendation
  rationale: string
  coerced: boolean
} | null {
  let t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const tryParse = (s: string): Record<string, unknown> | null => {
    try {
      const v = JSON.parse(s)
      return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  let obj = tryParse(t)
  if (!obj) {
    const m = t.match(/\{[\s\S]*\}/)
    if (m) obj = tryParse(m[0])
  }
  if (!obj) return null

  // Allowlist coercion: the ONLY valid recommendations are the three below.
  const rawRec = obj.recommendation
  const validRec = typeof rawRec === 'string' && (RECOMMENDATIONS as readonly string[]).includes(rawRec)
  return {
    classification: typeof obj.classification === 'string' ? obj.classification : 'unclear',
    confidence: typeof obj.confidence === 'string' ? obj.confidence : 'low',
    recommendation: validRec ? (rawRec as TriageRecommendation) : 'review_manually',
    rationale: typeof obj.rationale === 'string' ? obj.rationale : '',
    coerced: !validRec,
  }
}

// Triage one review. Never throws: an API error or parse failure becomes a
// TRIAGE FAILED / UNPARSED outcome so one review never aborts the run.
export async function triageReview(r: ReviewMeta): Promise<TriageOutcome> {
  const call = await callClaude(userMessage(r))
  if (!call.ok) return { kind: 'failed', review: r, error: call.error }
  const parsed = parseTriage(call.text)
  if (!parsed) return { kind: 'unparsed', review: r, raw: call.text }
  return {
    kind: 'triaged',
    review: r,
    classification: parsed.classification,
    confidence: parsed.confidence,
    recommendation: parsed.recommendation,
    rationale: parsed.rationale,
    coerced: parsed.coerced,
  }
}

// --- digest ---------------------------------------------------------------

// Plain-text digest. Brand voice: no em dashes, no exclamation points, calm and
// directional. Each triaged review carries a direct URL to its reviews page; no
// action links.
export function buildDigest(
  outcomes: TriageOutcome[],
  reportsFound: number,
  reviewsTriaged: number,
  overflow: number
): { subject: string; text: string } {
  const reviewedNoun = reviewsTriaged === 1 ? 'review' : 'reviews'
  const subject =
    reportsFound === 0
      ? 'Report triage: clear'
      : `Report triage: ${reviewsTriaged} ${reviewedNoun} triaged`

  const site = getSiteUrl()
  const url = (slug: string) => (slug ? `${site}/${slug}/reviews` : '(no practitioner slug)')

  const lines: string[] = ['Report triage for sessions.guide.', '']
  lines.push(
    reportsFound === 0
      ? 'No new reports in the last 25 hours. All clear.'
      : `${reportsFound} report(s) in the last 25 hours across ${reviewsTriaged} ${reviewedNoun} triaged.`
  )
  if (overflow > 0) {
    lines.push(
      `${overflow} additional reported review(s) were not triaged this run (over the ${MAX_REVIEWS} per run cap). They will be picked up on the next run.`
    )
  }
  lines.push('')

  const triaged = outcomes.filter((o) => o.kind === 'triaged')
  const previously = outcomes.filter((o) => o.kind === 'previously_actioned')
  const unparsed = outcomes.filter((o) => o.kind === 'unparsed')
  const failed = outcomes.filter((o) => o.kind === 'failed')

  for (const o of triaged) {
    if (o.kind !== 'triaged') continue
    const r = o.review
    lines.push(`${r.practitioner_name}  rating ${r.rating}/5  reports ${r.report_count}`)
    lines.push(`  classification: ${o.classification} (confidence ${o.confidence})`)
    lines.push(`  recommendation: ${o.recommendation}${o.coerced ? ' (coerced from an unknown value)' : ''}`)
    lines.push(`  rationale: ${o.rationale}`)
    lines.push(`  ${url(r.practitioner_slug)}`)
    lines.push('')
  }

  if (previously.length > 0) {
    lines.push('Previously actioned:')
    for (const o of previously) {
      const r = o.review
      lines.push(
        `  ${r.practitioner_name}  rating ${r.rating}/5  previously actioned, ${r.new_reports} new report(s)`
      )
      lines.push(`    ${url(r.practitioner_slug)}`)
    }
    lines.push('')
  }

  for (const o of unparsed) {
    if (o.kind !== 'unparsed') continue
    const r = o.review
    lines.push(`UNPARSED TRIAGE (${r.practitioner_name}, review ${short(r.review_id)}):`)
    lines.push(`  ${o.raw}`)
    lines.push(`  ${url(r.practitioner_slug)}`)
    lines.push('')
  }

  for (const o of failed) {
    if (o.kind !== 'failed') continue
    const r = o.review
    lines.push(`TRIAGE FAILED (${r.practitioner_name}, review ${short(r.review_id)}): ${o.error}`)
    lines.push(`  ${url(r.practitioner_slug)}`)
    lines.push('')
  }

  lines.push('Every recommendation above is advisory. This digest changed nothing.')
  return { subject, text: lines.join('\n').replace(/\n{3,}/g, '\n\n') }
}

// Sends the digest to the admin. The shared email.ts deliver() choke point is
// not exported, so its TD10 behavior is replicated here rather than modifying
// email.ts: inspect the returned { error }, catch thrown errors, both resolve to
// false, and log on failure (no sent-flag exists; the next daily run is the
// retry). Recipient + sender follow the report-notice pattern.
export async function sendDigest(subject: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    console.error('[report-triage] email not configured; RESEND_API_KEY or RESEND_FROM_EMAIL missing')
    return false
  }
  const to = process.env.REPORT_NOTICE_EMAIL ?? 'hello@sessions.guide'
  const resend = new Resend(apiKey)
  try {
    const { error } = await resend.emails.send({ from, to, subject, text })
    if (error) {
      console.error(`[report-triage] digest send failed: ${error.message ?? String(error)}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[report-triage] digest send threw:', err)
    return false
  }
}
