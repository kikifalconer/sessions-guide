import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Help + Contact form intake. Service-side only. Sends the message to the team
// inbox via Resend, with the sender as reply-to. Delivery failure is non-fatal:
// the submitter still gets a calm confirmation. No database write.
export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NOTIFY_TO = 'hello@sessions.guide'

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const b = body as {
    name?: unknown
    email?: unknown
    message?: unknown
    topic?: unknown
  }
  const name = typeof b?.name === 'string' ? b.name.trim() : ''
  const email = typeof b?.email === 'string' ? b.email.trim() : ''
  const message = typeof b?.message === 'string' ? b.message.trim() : ''
  const topic = b?.topic === 'help' ? 'Help' : 'Contact'

  if (!name || !EMAIL_RE.test(email) || !message) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (apiKey && from) {
    try {
      const resend = new Resend(apiKey)
      // The Resend SDK returns API errors in-object rather than throwing (TD10).
      // No sent-flag is stamped here, so failure is non-fatal; log for debugging.
      const { error: sendError } = await resend.emails.send({
        from,
        to: NOTIFY_TO,
        replyTo: email,
        subject: `${topic} form: ${oneLine(name).slice(0, 120)}`,
        text: `Topic: ${topic}\nName: ${name}\nEmail: ${email}\n\n${message.slice(0, 5000)}`,
      })
      if (sendError) {
        console.error('[contact] send failed:', sendError.message ?? String(sendError))
      }
    } catch (err) {
      // Non-fatal: the submitter is still thanked.
      console.error('[contact] send threw:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
