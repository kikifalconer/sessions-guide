import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveAuthDestination } from '@/lib/authDestination'
import { INVITE_COOKIE, isValidInviteCode } from '@/lib/invite'

// OAuth callback. Exchanges the code for a session.
//
// D20 / Amendment 2: a practitioners row is created ONLY when the flow
// explicitly originated from the /join signup wizard (?source=join, set by
// StepAccount). Every other successful auth (e.g. the /login Google button)
// routes by account shape instead — a seeker completing auth here must never
// gain a practitioners row.
// Only allow same-origin relative redirect targets. Rejects absolute URLs,
// protocol-relative (`//host`), and backslash (`/\host`) forms that could turn
// `${origin}${next}` into an off-site redirect (M5).
function safeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return null
  }
  return raw
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))
  const fromJoin = searchParams.get('source') === 'join'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      if (fromJoin) {
        // Hard server-side invite gate (H4, F-13). ?source=join is attacker-
        // controllable — the OAuth flow can be initiated with an arbitrary
        // redirect_to — so this route must re-validate the invite cookie
        // before creating a practitioners row, exactly as /join and
        // signUpWithEmail do. Without this check, the Google path was a
        // complete bypass of the invite-only gate: the row alone is what
        // /dashboard authorizes on.
        const cookieStore = await cookies()
        if (!isValidInviteCode(cookieStore.get(INVITE_COOKIE)?.value)) {
          return NextResponse.redirect(`${origin}/?error=invite`)
        }

        const admin = createAdminClient()
        await admin.from('practitioners').upsert(
          {
            id: data.user.id,
            full_name: '',
            slug: data.user.id,
            subscription_tier: null,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        )
        return NextResponse.redirect(`${origin}${next ?? '/join'}`)
      }

      const destination = await resolveAuthDestination(data.user.id)
      return NextResponse.redirect(`${origin}${next ?? destination}`)
    }
  }

  const errorHome = fromJoin ? '/join' : '/login'
  return NextResponse.redirect(`${origin}${errorHome}?error=auth`)
}
