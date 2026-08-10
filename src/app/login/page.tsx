import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveAuthDestination } from '@/lib/authDestination'
import LoginForm from './LoginForm'

export const metadata = { title: 'sign in | sessions.guide' }

// Single sign-in entry point (D20 / Amendment 1). Primary: seeker magic link.
// Secondary: Google for returning practitioners. /join stays signup-only.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(await resolveAuthDestination(user.id))
  }

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto w-full max-w-xl px-6 py-16">
        {/* PLACEHOLDER COPY throughout this page — Kiki to review. */}
        <h2 className="mb-3">Sign in</h2>
        <p className="mb-10">
          Enter your email and we will send you a sign in link. No password to
          remember.
        </p>
        <LoginForm next={sp.next ?? null} initialError={sp.error ?? null} />
      </div>
    </main>
  )
}
