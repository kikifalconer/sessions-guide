import { NextRequest, NextResponse } from 'next/server'
import {
  INVITE_COOKIE,
  INVITE_TTL_SECONDS,
  isValidInviteCode,
  normalizeInviteCode,
} from '@/lib/invite'

// Invitation code check. Compares a submitted code against INVITE_CODES via the
// shared, constant-time helper. On a valid code, sets an httpOnly cookie that
// /join and signUpWithEmail re-validate server-side (H4). The code list is never
// returned in any response field.
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!process.env.INVITE_CODES) {
    return NextResponse.json({ error: 'invite_codes_not_configured' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ valid: false })
  }

  const raw = (body as { code?: unknown })?.code
  const valid = isValidInviteCode(raw)

  const res = NextResponse.json({ valid })
  if (valid) {
    res.cookies.set(INVITE_COOKIE, normalizeInviteCode(raw), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: INVITE_TTL_SECONDS,
    })
  }
  return res
}
