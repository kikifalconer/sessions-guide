import { NextRequest, NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeCode, verifyState } from '@/lib/calendar'

// Google Calendar OAuth callback. Verifies the signed state, exchanges the
// code, and stores tokens in calendar_integrations via the service-role
// client. redirect_uri is read from env only (D18) — set inside oauthClient().
export const runtime = 'nodejs'

function dashboard(path = '/dashboard', query = ''): URL {
  return new URL(`${path}${query}`, process.env.NEXT_PUBLIC_SITE_URL)
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  // User declined consent, or Google returned an error.
  if (error || !code || !state) {
    return NextResponse.redirect(dashboard('/dashboard', '?calendar=error'))
  }

  const practitionerId = verifyState(state)
  if (!practitionerId) {
    return NextResponse.redirect(dashboard('/dashboard', '?calendar=error'))
  }

  const tokens = await exchangeCode(code)
  if (!tokens) {
    return NextResponse.redirect(dashboard('/dashboard', '?calendar=error'))
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
    return NextResponse.redirect(dashboard('/dashboard', '?calendar=error'))
  }

  return NextResponse.redirect(dashboard('/dashboard', '?calendar=connected'))
}
