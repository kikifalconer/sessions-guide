import { createHmac, timingSafeEqual } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'

// Google Calendar integration. OAuth (token exchange/refresh) via
// google-auth-library; Calendar API calls via direct REST. Every calendar
// caller goes through getValidAccessToken so token refresh lives in one place.
// Tokens are read/written with the service-role client only (D6).

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events', // events.insert / delete
  'https://www.googleapis.com/auth/calendar.readonly', // freebusy.query
]

function oauthClient(): OAuth2Client {
  return new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI, // env-driven; no hardcoding (D18)
  })
}

// --- OAuth state (CSRF + practitioner id), HMAC-signed -------------------

function stateSecret(): string {
  const s = process.env.ADMIN_SECRET
  if (!s) throw new Error('ADMIN_SECRET is required to sign OAuth state.')
  return s
}

export function signState(practitionerId: string): string {
  const payload = Buffer.from(practitionerId).toString('base64url')
  const sig = createHmac('sha256', stateSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyState(state: string): string | null {
  const [payload, sig] = (state ?? '').split('.')
  if (!payload || !sig) return null
  const expected = createHmac('sha256', stateSecret()).update(payload).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    return Buffer.from(payload, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

// --- OAuth flow ----------------------------------------------------------

export function buildConsentUrl(state: string): string {
  return oauthClient().generateAuthUrl({
    access_type: 'offline', // returns a refresh_token
    prompt: 'consent', // force refresh_token on every grant
    scope: SCOPES,
    state,
  })
}

export type ExchangedTokens = {
  access_token: string
  refresh_token: string
  expiry: string // ISO
  scope: string | null
}

export async function exchangeCode(code: string): Promise<ExchangedTokens | null> {
  try {
    const { tokens } = await oauthClient().getToken(code)
    if (!tokens.access_token || !tokens.refresh_token) return null
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : DateTime.utc().plus({ minutes: 55 }).toISO()!,
      scope: tokens.scope ?? null,
    }
  } catch {
    return null
  }
}

// --- Token helper (standalone, route-agnostic) ---------------------------

type IntegrationRow = {
  practitioner_id: string
  access_token: string
  refresh_token: string
  token_expiry: string
  calendar_id: string
  sync_enabled: boolean
}

export async function loadIntegration(practitionerId: string): Promise<IntegrationRow | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('calendar_integrations')
    .select('practitioner_id, access_token, refresh_token, token_expiry, calendar_id, sync_enabled')
    .eq('practitioner_id', practitionerId)
    .maybeSingle()
  return (data as IntegrationRow | null) ?? null
}

// Returns a valid access token for the practitioner, refreshing if needed and
// persisting the refreshed token. Returns null when there is no enabled
// integration or the refresh fails (revoked grant) — callers degrade
// gracefully and never block a booking on calendar failure (D5).
export async function getValidAccessToken(practitionerId: string): Promise<string | null> {
  const row = await loadIntegration(practitionerId)
  if (!row || !row.sync_enabled) return null

  const admin = createAdminClient()
  const client = oauthClient()
  client.setCredentials({
    refresh_token: row.refresh_token,
    access_token: row.access_token,
    expiry_date: new Date(row.token_expiry).getTime(),
  })

  try {
    // getAccessToken auto-refreshes when the access token is expired.
    const { token } = await client.getAccessToken()
    if (!token) throw new Error('no access token')

    // Persist a refreshed token/expiry if google-auth-library rotated it.
    const creds = client.credentials
    if (creds.access_token && creds.access_token !== row.access_token) {
      await admin
        .from('calendar_integrations')
        .update({
          access_token: creds.access_token,
          token_expiry: creds.expiry_date
            ? new Date(creds.expiry_date).toISOString()
            : DateTime.utc().plus({ minutes: 55 }).toISO(),
          updated_at: DateTime.utc().toISO(),
        })
        .eq('practitioner_id', practitionerId)
    }
    return token
  } catch {
    // Revoked or expired grant: flag the integration so the dashboard can
    // surface a reconnect prompt; never throw into the caller (D5).
    await admin
      .from('calendar_integrations')
      .update({ sync_enabled: false, updated_at: DateTime.utc().toISO() })
      .eq('practitioner_id', practitionerId)
    return null
  }
}

// --- Calendar REST (direct fetch) ----------------------------------------

export type BusyWindow = { start_datetime: string; end_datetime: string }

// Reads the practitioner's cached free/busy windows (populated by the hourly
// cron) over the bookable horizon. Returns BookedWindow-shaped rows so they
// merge directly into the slot generator's bookedWindows. Service-role read
// (calendar_busy is service-role-only). For non-connected practitioners the
// cron never writes rows, so this returns []. FAILS OPEN: a read error logs and
// returns [] rather than hiding the picker — the commit-time check is the
// correctness backstop.
export async function fetchCalendarBusyWindows(practitionerId: string): Promise<BusyWindow[]> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('calendar_busy')
      .select('start_datetime, end_datetime')
      .eq('practitioner_id', practitionerId)
      .gte('end_datetime', DateTime.utc().toISO())
    if (error) throw error
    return (data ?? []) as BusyWindow[]
  } catch (err) {
    console.error('fetchCalendarBusyWindows failed', practitionerId, err)
    return []
  }
}

// Free/busy windows for a calendar between two ISO instants.
export async function queryFreeBusy(
  accessToken: string,
  calendarId: string,
  timeMinIso: string,
  timeMaxIso: string
): Promise<BusyWindow[]> {
  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ timeMin: timeMinIso, timeMax: timeMaxIso, items: [{ id: calendarId }] }),
  })
  if (!res.ok) throw new Error(`freeBusy ${res.status}`)
  const json = (await res.json()) as {
    calendars?: Record<string, { busy?: { start: string; end: string }[] }>
  }
  const busy = json.calendars?.[calendarId]?.busy ?? []
  return busy.map((b) => ({ start_datetime: b.start, end_datetime: b.end }))
}

// Creates an event and returns its id (for bookings.google_event_id).
export async function insertEvent(
  accessToken: string,
  calendarId: string,
  event: { summary: string; description?: string; startIso: string; endIso: string }
): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.startIso },
        end: { dateTime: event.endIso },
      }),
    }
  )
  if (!res.ok) throw new Error(`events.insert ${res.status}`)
  const json = (await res.json()) as { id?: string }
  return json.id ?? null
}

// Best-effort delete; a 404/410 (already gone) is treated as success.
export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE', headers: { authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`events.delete ${res.status}`)
  }
}
