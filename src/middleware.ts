import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Session refresh (F-15).
//
// Supabase access tokens expire (default 1h) and are renewed by exchanging the
// refresh token — an exchange that ROTATES the refresh token, invalidating the
// old one. Server Components cannot write cookies, so when that exchange
// happens inside a page render the replacement tokens are discarded (see the
// swallowed catch in lib/supabase/server.ts) while the old refresh token is
// already spent server-side. The next request then finds a dead session and the
// user is silently signed out mid-visit.
//
// Middleware runs where cookie writes ARE legal, so refreshing here is what
// keeps a session alive. This file only refreshes; it deliberately does not
// gate routes — every protected page already does its own auth check, and
// duplicating that logic here would give us two places to keep in sync.
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Anonymous traffic (crawlers, discovery, profile pages) carries no Supabase
  // cookie and has nothing to refresh. Skipping it keeps an auth round-trip off
  // the hot path for the majority of a public marketplace's requests.
  const hasSupabaseCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-'))
  if (!hasSupabaseCookie) return supabaseResponse

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Triggers the refresh when the access token is stale. The result is
  // intentionally unused — setAll above is the point.
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  // Everything except static assets and /api. Route handlers can set cookies
  // themselves, so they refresh natively; excluding them also keeps this off
  // the Stripe webhook and the CRON_SECRET-guarded cron routes.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
