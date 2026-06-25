import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildConsentUrl, signState } from '@/lib/calendar'

// Starts the Google Calendar OAuth flow for the logged-in practitioner.
// State carries the HMAC-signed practitioner id (CSRF + identity).
export const runtime = 'nodejs'

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

  return NextResponse.redirect(buildConsentUrl(signState(user.id)))
}
