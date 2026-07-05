'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/siteUrl'
import MagicLinkForm, { sanitizeNext } from '@/components/magic-link-form'

// /login: primary affordance is the shared magic-link form (seekers);
// secondary is Google for returning practitioners (Amendment 1). /join stays
// signup-only, so nothing here links there as a sign-in path.
//
// All copy is PLACEHOLDER — Kiki to review.

export default function LoginForm({
  next,
  initialError,
}: {
  next: string | null
  initialError: string | null
}) {
  const safeNext = sanitizeNext(next)
  const [error, setError] = useState<string | null>(
    initialError === 'link'
      ? 'That sign in link has expired or was already used. Request a new one below.'
      : initialError === 'auth'
        ? 'Sign in did not complete. Please try again.'
        : null
  )

  const signInWithGoogle = async () => {
    setError(null)
    const supabase = createClient()
    const callbackPath = safeNext
      ? `/auth/callback?next=${encodeURIComponent(safeNext)}`
      : '/auth/callback'
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${getSiteUrl()}${callbackPath}` },
    })
    if (oauthError) {
      setError('Google sign in did not start. Try again or use email.')
    }
  }

  return (
    <section>
      {error && <p className="caption mb-6 text-olive">{error}</p>}

      <MagicLinkForm next={safeNext} />

      <div className="my-8 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="caption text-dark">PRACTITIONERS</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <button type="button" className="btn-secondary w-full" onClick={signInWithGoogle}>
        SIGN IN WITH GOOGLE
      </button>
    </section>
  )
}
