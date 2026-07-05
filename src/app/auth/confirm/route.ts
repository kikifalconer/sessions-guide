import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureSeekerRow } from '@/lib/seekers'
import { resolveAuthDestination } from '@/lib/authDestination'

// Seeker magic-link confirmation (D20 / Amendment 2). Separate from
// /auth/callback on purpose: that route is the practitioner OAuth callback and
// (when the flow originates from /join) creates practitioners rows. A seeker
// landing HERE never gains a practitioners row.
//
// Two verification shapes are accepted:
// - ?token_hash=...&type=... — Supabase email template customized to the
//   token-hash form. Works cross-device (link opened anywhere).
// - ?code=... — the default {{ .ConfirmationURL }} template redirect (PKCE).
//   Works only in the browser that requested the link, because the code
//   verifier lives in that browser's cookies.
// Handling both means the flow works out of the box and gets cross-device
// robustness the moment the email template is switched (manual item for Kiki).

// Same-origin relative targets only (mirrors /auth/callback, M5).
function safeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return null
  }
  return raw
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  const supabase = await createClient()
  let userId: string | null = null

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })
    if (!error && data.user) userId = data.user.id
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) userId = data.user.id
  }

  if (!userId) {
    const retry = next ? `?next=${encodeURIComponent(next)}&error=link` : '?error=link'
    return NextResponse.redirect(`${origin}/login${retry}`)
  }

  const destination = await resolveAuthDestination(userId)
  if (destination === '/account') {
    // First seeker verify creates the profile row; existing rows are never
    // overwritten. Practitioners signing in by magic link skip this — their
    // identity already lives on the practitioners row.
    const admin = createAdminClient()
    const { data: userData } = await admin.auth.admin.getUserById(userId)
    if (userData?.user) await ensureSeekerRow(userData.user)
  }

  return NextResponse.redirect(`${origin}${next ?? destination}`)
}
