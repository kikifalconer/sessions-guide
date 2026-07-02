import { NextRequest, NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeCode, verifyState } from '@/lib/calendar'

// Google Calendar OAuth callback. Verifies the signed state (nonce + expiry),
// requires the logged-in user to match the practitioner in the state and the
// nonce to match the connect-time cookie (C4), exchanges the code, and stores
// tokens in calendar_integrations via the service-role client. redirect_uri is
// read from env only (D18).
export const runtime = 'nodejs'

const STATE_COOKIE = 'g_cal_oauth_nonce'

function dashboard(path = '/dashboard', query = ''): URL {
  return new URL(`${path}${query}`, process.env.NEXT_PUBLIC_SITE_URL)
}

// Redirect helper that also clears the single-use nonce cookie.
function redirectClearingNonce(url: URL): NextResponse {
  const res = NextResponse.redirect(url)
  res.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  // User declined consent, or Google returned an error.
  if (error || !code || !state) {
    return redirectClearingNonce(dashboard('/dashboard', '?calendar=error'))
  }

  const parsed = verifyState(state)
  if (!parsed) {
    return redirectClearingNonce(dashboard('/dashboard', '?calendar=error'))
  }

  // Session binding: the logged-in user MUST be the practitioner named in the
  // state. This defeats the calendar-attach CSRF — a victim who follows an
  // attacker's consent link is logged in as themselves, not as `pid`.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.id !== parsed.pid) {
    return redirectClearingNonce(dashboard('/dashboard', '?calendar=error'))
  }

  // Single-use nonce: must match the cookie set at connect time.
  const cookieNonce = req.cookies.get(STATE_COOKIE)?.value
  if (!cookieNonce || cookieNonce !== parsed.nonce) {
    return redirectClearingNonce(dashboard('/dashboard', '?calendar=error'))
  }

  const practitionerId = parsed.pid

  const tokens = await exchangeCode(code)
  if (!tokens) {
    return redirectClearingNonce(dashboard('/dashboard', '?calendar=error'))
  }

  const admin = createAdminClient()
  const nowIso = DateTime.utc().toISO()
  const { error: upsertError } = await admin.from('calendar_integrations').upsert(
    {
      practitioner_id: practitionerId,
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: tokens.expiry,
      scope: tokens.scope,
      calendar_id: 'primary',
      sync_enabled: true,
      connected_at: nowIso,
      updated_at: nowIso,
    },
    { onConflict: 'practitioner_id' }
  )
  if (upsertError) {
    return redirectClearingNonce(dashboard('/dashboard', '?calendar=error'))
  }

  return redirectClearingNonce(dashboard('/dashboard', '?calendar=connected'))
}
