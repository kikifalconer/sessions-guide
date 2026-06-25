'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// Pre-launch holding page. Self-contained: the root layout injects no header
// or nav, so no layout override is needed. All colors/fonts come from CSS
// variables (Tailwind tokens); black/white overlays use token opacities.

const LABEL_CLASS =
  'font-ui text-[0.7rem] uppercase tracking-[0.08em] text-light/70'
const FIELD_CLASS =
  'font-ui text-[0.75rem] bg-white/10 border border-white/30 text-light placeholder:text-light/50 px-4 py-[0.65rem] outline-none focus:border-white/60'
const SUBMIT_CLASS =
  'font-ui text-[0.75rem] uppercase tracking-[0.08em] bg-light text-olive border-none px-5 py-[0.65rem] cursor-pointer'

const MODALITIES =
  'REIKI + ASTROLOGY + COACHING + DOULA + BODYWORK + ACUPUNCTURE + AYURVEDA + JOURNEYS + BREATH WORK + SOUND HEALING + EQUINE THERAPY + TAROT + HUMAN DESIGN + HERBALISM + HYPNOSIS + NATURAL BEAUTY + CEREMONY + MORE'

export default function HoldingPage() {
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
    <main className="relative min-h-screen w-full">
      {/* Background image */}
      <Image
        src="/images/hero.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 z-[1] bg-black/25" />

      {/* Content */}
      <div className="relative z-[2] flex min-h-screen flex-col items-center justify-center px-8 text-center">
        {/* Logo sits outside the 600px text column so it can be 60% of the
            viewport width and stay centered at any screen size. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sessions-logo-light.svg"
          alt="sessions.guide"
          className="mb-8 block w-[60vw] max-w-none"
        />

        <div className="w-full max-w-[600px]">
          <h2 className="mb-3 text-light">
            {"Designed to make light workers' work lighter"}
          </h2>

          <p className="mb-7 text-light/80">
            Book sessions in the transformational and healing arts.
          </p>

          <p className="modality-list mb-10">{MODALITIES}</p>

          <hr className="mx-auto mb-10 w-[120px] border-0 border-t border-light/20" />

          {/* Waitlist */}
          <div className="mb-8">
            {waitlistState === 'done' ? (
              <p className={`${LABEL_CLASS} text-light/80`}>{"You're on the list."}</p>
            ) : (
              <>
                <p className={`${LABEL_CLASS} mb-[0.6rem]`}>APPLY FOR AN INVITATION</p>
                <form onSubmit={submitWaitlist} className="flex flex-col gap-0 sm:flex-row">
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${FIELD_CLASS} flex-1`}
                  />
                  <button type="submit" className={SUBMIT_CLASS} disabled={waitlistState === 'pending'}>
                    APPLY
                  </button>
                </form>
                {waitlistState === 'error' && (
                  <p className={`${LABEL_CLASS} mt-[0.6rem] text-light/80`}>
                    Something went wrong. Try again.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Invitation code */}
          <div className="mb-8">
            <p className={`${LABEL_CLASS} mb-[0.6rem]`}>ENTER INVITATION CODE</p>
            <form onSubmit={submitCode} className="flex flex-col items-center gap-0 sm:flex-row sm:justify-center">
              <input
                type="text"
                placeholder="-"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`${FIELD_CLASS} w-full uppercase tracking-[0.1em] sm:w-[220px]`}
              />
              <button type="submit" className={SUBMIT_CLASS} disabled={codeState === 'pending'}>
                ENTER
              </button>
            </form>
            {codeState === 'invalid' && (
              <p className={`${LABEL_CLASS} mt-[0.6rem] text-light/80`}>
                {"That code isn't recognised."}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
