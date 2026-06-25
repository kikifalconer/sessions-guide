import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Resolves an IANA timezone from coordinates via the classic Google Time Zone
// API (maps.googleapis.com/maps/api/timezone/json). Server-side because the
// web-service endpoint is not CORS-friendly from the browser. The availability
// form calls this after a place is picked so a travel block (e.g. a Bali block
// created from California) gets the LOCATION's zone, not the practitioner's —
// the timezone the slot generator needs to schedule real bookings correctly.
//
// Auth-gated to a signed-in practitioner so it can't be used as an open quota
// drain. The returned timeZoneId is shown editable in the form, so a bad geocode
// is catchable.
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
  }

  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!key) return NextResponse.json({ error: 'not configured' }, { status: 500 })

  // Fixed timestamp: the timeZoneId (e.g. 'Asia/Makassar') is stable regardless
  // of the instant; only the offset varies with DST, which we don't use here.
  const timestamp = 1735689600 // 2025-01-01T00:00:00Z
  const url =
    `https://maps.googleapis.com/maps/api/timezone/json` +
    `?location=${lat},${lng}&timestamp=${timestamp}&key=${key}`

  try {
    const res = await fetch(url)
    const json = (await res.json()) as { status?: string; timeZoneId?: string }
    if (json.status !== 'OK' || !json.timeZoneId) {
      return NextResponse.json({ error: 'could not resolve timezone' }, { status: 502 })
    }
    return NextResponse.json({ timeZoneId: json.timeZoneId })
  } catch {
    return NextResponse.json({ error: 'could not resolve timezone' }, { status: 502 })
  }
}
