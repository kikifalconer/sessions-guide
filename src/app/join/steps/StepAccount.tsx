'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { signUpWithEmail } from '../actions'

export default function StepAccount({
  isSignedIn,
  onNext,
}: {
  isSignedIn: boolean
  onNext: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (isSignedIn) {
    return (
      <section>
        <h2 className="mb-6">Create your account</h2>
        <p className="mb-8">You are signed in. Continue to set up your profile.</p>
        <button type="button" className="btn-primary" onClick={onNext}>
          CONTINUE
        </button>
      </section>
    )
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await signUpWithEmail(email, password)
      if (result.ok) {
        onNext()
      } else {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
      }
    })
  }

  const signInWithGoogle = async () => {
    setError(null)
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/join`,
      },
    })
    if (oauthError) {
      setError('Google sign in did not start. Try again or use email.')
    }
  }

  return (
    <section>
      <h2 className="mb-8">Create your account</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex flex-col gap-6"
      >
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

        <div>
          <label htmlFor="password" className="label mb-2 block text-dark">
            PASSWORD
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border bg-surface px-4 py-3 font-heading font-light text-dark outline-none focus:border-olive"
          />
        </div>

        {error && <p className="caption text-olive">{error}</p>}

        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'CREATING ACCOUNT' : 'CREATE ACCOUNT'}
        </button>
      </form>

      <div className="my-8 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="caption text-dark">OR</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        className="btn-secondary w-full"
        onClick={signInWithGoogle}
      >
        CONTINUE WITH GOOGLE
      </button>
    </section>
  )
}
