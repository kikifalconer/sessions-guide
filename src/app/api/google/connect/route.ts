import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { buildConsentUrl, signState } from '@/lib/calendar'

// Starts the Google Calendar OAuth flow for the logged-in practitioner. State
// carries the HMAC-signed practitioner id, a single-use nonce (mirrored in an
// httpOnly cookie and consumed at the callback), and an expiry (C4).
export const runtime = 'nodejs'

const STATE_COOKIE = 'g_cal_oauth_nonce'
const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/join', process.env.NEXT_PUBLIC_SITE_URL))
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return NextResponse.json({ error: 'google_oauth_not_configured' }, { status: 500 })
  }

  const nonce = randomUUID()
  const state = signState({ pid: user.id, nonce, exp: Date.now() + STATE_TTL_MS })

  const res = NextResponse.redirect(buildConsentUrl(state))
  res.cookies.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // sent on the top-level GET redirect back from Google
    path: '/',
    maxAge: STATE_TTL_MS / 1000,
  })
  return res
}
