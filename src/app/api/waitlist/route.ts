import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

// Waitlist signup. Service-role client only (never anon). Duplicate emails are
// a success, not an error, for the user. Internal notification to the team;
// no email is ever sent to the submitting user.
export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NOTIFY_TO = 'hello@sessions.guide'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const raw = (body as { email?: unknown })?.email
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('waitlist').insert({ email })

  if (error) {
    // Unique violation: already registered. Never surface this as an error.
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, message: 'already_registered' })
    }
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  // New signup recorded. Notify the team. A notification failure must not fail
  // the signup the user already completed.
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (apiKey && from) {
    try {
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from,
        to: NOTIFY_TO,
        subject: 'New waitlist signup',
        text: `Email: ${email}\nReceived: ${new Date().toISOString()}`,
      })
    } catch {
      // Internal notification failure is non-fatal.
    }
  }

  return NextResponse.json({ ok: true })
}
