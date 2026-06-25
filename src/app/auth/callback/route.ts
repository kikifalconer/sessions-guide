import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// OAuth callback. Exchanges the code for a session, makes sure a
// practitioners row exists for the auth user, then sends them back
// into the join flow.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/join'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
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
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/join?error=auth`)
}
