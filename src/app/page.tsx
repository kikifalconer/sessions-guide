'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

// Landing page. Header-free by design (the root layout injects no header); the
// full-width wordmark is the top of the page. All colors/fonts come from CSS
// variables (Tailwind tokens). The invitation + waitlist forms are preserved.

const FIELD =
  'w-full border border-border bg-surface px-4 py-3 font-ui text-[0.8rem] tracking-[0.04em] text-dark outline-none focus:border-olive'

export default function LandingPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [waitlistState, setWaitlistState] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')

  const [code, setCode] = useState('')
  const [codeState, setCodeState] = useState<'idle' | 'pending' | 'invalid'>('idle')

  const submitWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    setWaitlistState('pending')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      setWaitlistState(res.ok && json.ok ? 'done' : 'error')
    } catch {
      setWaitlistState('error')
    }
  }

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setCodeState('pending')
    try {
      const res = await fetch('/api/verify-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const json = await res.json()
      if (json.valid) {
        router.push('/join')
        return
      }
      setCodeState('invalid')
    } catch {
      setCodeState('invalid')
    }
  }

  return (
    <main>
      {/* ---------- Section 1 — wordmark, hero line, invitation ---------- */}
      <section className="relative flex min-h-screen flex-col">
        {/* Full-height photographic background. */}
        <Image
          src="/images/reikiHero2.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Legibility wash over the photograph. */}
        <div className="absolute inset-0 bg-black/25" />

        {/* Full-width wordmark, flush to the very top: no padding, no margin. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sessions-logo-light.svg"
          alt="Sessions Guide"
          className="relative z-[1] block w-full"
        />

        <div className="relative z-[1] mx-auto flex max-w-[760px] flex-1 flex-col justify-center px-6 pb-28 pt-12 text-center sm:pt-20">
          <p className="mx-auto max-w-[48ch] text-[1.05rem] leading-[1.8] text-light">
            A booking platform for transformational and healing sessions:
            ceremonies, readings, treatments, healings, and journeys.
          </p>

          <div className="mt-16 flex flex-col items-stretch justify-center gap-12 sm:flex-row sm:gap-16">
            {/* Waitlist */}
            <div className="w-full sm:max-w-[320px]">
              {waitlistState === 'done' ? (
                <p className="label text-light">{"You're on the list."}</p>
              ) : (
                <>
                  <p className="label mb-3 text-light">APPLY FOR AN INVITATION</p>
                  <form onSubmit={submitWaitlist} className="flex flex-col gap-3">
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={FIELD}
                    />
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={waitlistState === 'pending'}
                    >
                      {waitlistState === 'pending' ? 'SENDING' : 'APPLY'}
                    </button>
                  </form>
                  {waitlistState === 'error' && (
                    <p className="label mt-3 text-light">Something went wrong. Try again.</p>
                  )}
                </>
              )}
            </div>

            {/* Invitation code */}
            <div className="w-full sm:max-w-[320px]">
              <p className="label mb-3 text-light">ENTER INVITATION CODE</p>
              <form onSubmit={submitCode} className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="-"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={`${FIELD} uppercase tracking-[0.1em]`}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={codeState === 'pending'}
                >
                  {codeState === 'pending' ? 'CHECKING' : 'ENTER'}
                </button>
              </form>
              {codeState === 'invalid' && (
                <p className="label mt-3 text-light">{"That code isn't recognised."}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Section 2 — Built from the inside ---------- */}
      <section className="bg-bg">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-16 px-6 py-28 sm:px-10 md:grid-cols-2">
          <div className="relative aspect-[4/5] w-full overflow-hidden">
            <Image
              src="/images/stockPhotos/hands-magic.jpg"
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>

          <div>
            <h2 className="mb-10">Built from the inside.</h2>
            <p className="mb-6 max-w-[54ch] text-dark">
              As a cofounder of Conscious City Guide, I spent a decade working with
              thousands of practitioners, healers, teachers, and guides. And though
              their work was unique, their challenges were common.
            </p>
            <p className="mb-6 max-w-[54ch] text-dark">
              Sessions Guide was created for the light workers: so they can receive
              the abundance they deserve while having sovereignty over how they get
              paid. So healers can focus on their energy rather than admin. And so
              nomads won&rsquo;t need to rebuild their client list with each new place
              they land. Every tool here was chosen so practitioners can stay inside
              their practice.
            </p>
            <p className="max-w-[54ch] text-dark">
              And Sessions Guide was created so people seeking healing will find their
              healers. Those seeking guidance will find their guides. And those
              seeking transformation can find their alchemist.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Section 3 — full-bleed image + statement ---------- */}
      <section className="relative">
        <div className="relative h-[72vh] min-h-[440px] w-full">
          <Image
            src="/images/stockPhotos/wing.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
          {/* Legibility wash over the photograph. */}
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            {/* Inline style so it wins over the global h1 olive color. */}
            <h1 className="max-w-[16ch]" style={{ color: 'var(--color-light)' }}>
              {"Making Lightworkers' Work Lighter"}
            </h1>
            <Link href="/join-sessions" className="btn-primary mt-10">
              LEARN MORE
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
