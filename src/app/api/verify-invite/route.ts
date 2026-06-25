import { NextRequest, NextResponse } from 'next/server'

// Invitation code check. Compares a submitted code against the comma-separated
// INVITE_CODES env list, case-insensitively. The code list is never returned
// in any response field.
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const configured = process.env.INVITE_CODES
  if (!configured) {
    return NextResponse.json({ error: 'invite_codes_not_configured' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ valid: false })
  }

  const raw = (body as { code?: unknown })?.code
  const code = typeof raw === 'string' ? raw.trim().toLowerCase() : ''

  const allowed = configured
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)

  const valid = code.length > 0 && allowed.includes(code)
  return NextResponse.json({ valid })
}
