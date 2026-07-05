'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/siteUrl'

// Magic-link sign in / sign up in one flow (D20). full_name and the D21
// newsletter opt-in ride through the OTP round-trip as user metadata; the
// confirm route applies them only when creating a brand-new seeker profile,
// so returning seekers re-typing here never rename their account.
//
// All copy is PLACEHOLDER — Kiki to review.

function sanitizeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return null
  }
  return raw
}

export default function LoginForm({
  next,
  initialError,
}: {
  next: string | null
  initialError: string | null
}) {
  const safeNext = sanitizeNext(next)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [pending, setPending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(
    initialError === 'link'
      ? 'That sign in link has expired or was already used. Request a new one below.'
      : initialError === 'auth'
        ? 'Sign in did not complete. Please try again.'
        : null
  )

  const confirmPath = safeNext
    ? `/auth/confirm?next=${encodeURIComponent(safeNext)}`
    : '/auth/confirm'

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    const supabase = createClient()
    // OTP redirects always build from NEXT_PUBLIC_SITE_URL (spec rule), never
    // a hardcoded or window-derived origin.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${getSiteUrl()}${confirmPath}`,
        data: {
          seeker_full_name: fullName.trim(),
          newsletter_opt_in: newsletter,
        },
      },
    })
    setPending(false)
    if (otpError) {
      setError('Something went wrong sending your link. Try again or contact support.')
    } else {
      setSentTo(email.trim())
    }
  }

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

  if (sentTo) {
    return (
      <section aria-live="polite">
        <h3 className="mb-4">Check your email</h3>
        <p className="mb-2">
          We sent a sign in link to {sentTo}. Open it on this device to continue.
        </p>
        <p className="mb-8 text-sm">Nothing arriving? Check spam, or send it again.</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setSentTo(null)}
        >
          USE A DIFFERENT EMAIL
        </button>
      </section>
    )
  }

  return (
    <section>
      <form onSubmit={sendLink} className="flex flex-col gap-6">
        <div>
          <label htmlFor="full_name" className="label mb-2 block text-dark">
            FULL NAME
          </label>
          <input
            id="full_name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive"
          />
          <p className="caption mt-2 text-dark/60">
            USED FOR YOUR ACCOUNT IF THIS IS YOUR FIRST SIGN IN
          </p>
        </div>

        <div>
          <label htmlFor="email" className="label mb-2 block text-dark">
            EMAIL
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive"
          />
        </div>

        {/* D21: express opt-in only — unchecked by default, never inferred. */}
        <label htmlFor="newsletter" className="flex items-start gap-3">
          <input
            id="newsletter"
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
            className="mt-1 h-4 w-4 accent-olive"
          />
          <span className="font-heading text-sm font-light text-dark">
            Send me occasional notes from sessions.guide. You can change this
            any time.
          </span>
        </label>

        {error && <p className="caption text-olive">{error}</p>}

        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'SENDING LINK' : 'SEND SIGN IN LINK'}
        </button>
      </form>

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
