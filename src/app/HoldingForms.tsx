'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RevealBlock from '@/components/motion/RevealBlock'

// The two forms from the holding page, split out so that src/app/page.tsx can
// be a server component and export metadata (a 'use client' page cannot).
//
// Behaviour is frozen: same endpoints, same state machines, same button label
// swaps, same success and failure strings. The restyle touches presentation
// only.
//
// The two columns are the direct children of the RevealBlock so that
// STAGGER.loose actually staggers them against each other. Wrapping this
// component from outside would stagger a single element, which is a no-op.

// Square by construction (the radius tokens are 0, and no rounded utility is
// used). text-body is 1rem, which also stops iOS Safari zooming the viewport
// on focus, something the previous 0.8rem did trigger.
const FIELD =
  'w-full border border-border bg-surface px-4 py-3 font-ui text-body tracking-[0.04em] text-dark outline-none transition-colors focus:border-olive focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-olive'

export default function HoldingForms({ delay = 0 }: { delay?: number }) {
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
    <RevealBlock
      stagger="loose"
      delay={delay}
      className="mt-20 flex flex-col items-stretch gap-10 sm:flex-row sm:gap-16"
    >
      {/* Waitlist */}
      <div className="w-full sm:max-w-[320px]">
        {waitlistState === 'done' ? (
          <p className="t-eyebrow text-light">{"You're on the list."}</p>
        ) : (
          <>
            <p className="t-eyebrow mb-4 text-light">APPLY FOR AN INVITATION</p>
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
                className="btn-primary btn-fill"
                disabled={waitlistState === 'pending'}
              >
                {waitlistState === 'pending' ? 'SENDING' : 'APPLY'}
              </button>
            </form>
            {waitlistState === 'error' && (
              <p className="t-eyebrow mt-3 text-light">Something went wrong. Try again.</p>
            )}
          </>
        )}
      </div>

      {/* Invitation code */}
      <div className="w-full sm:max-w-[320px]">
        <p className="t-eyebrow mb-4 text-light">ENTER INVITATION CODE</p>
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
            className="btn-primary btn-fill"
            disabled={codeState === 'pending'}
          >
            {codeState === 'pending' ? 'CHECKING' : 'ENTER'}
          </button>
        </form>
        {codeState === 'invalid' && (
          <p className="t-eyebrow mt-3 text-light">{"That code isn't recognised."}</p>
        )}
      </div>
    </RevealBlock>
  )
}
