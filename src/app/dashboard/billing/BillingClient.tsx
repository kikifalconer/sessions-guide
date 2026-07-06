'use client'

import { useState } from 'react'
import type { Tier, PaidTier, BillingCycle } from '@/lib/tiers'

// All user-facing copy here is PLACEHOLDER — Kiki to rework. Prices are real
// (D24). Chrome is DM Mono uppercase via .caption/.label/.btn-* and CSS-variable
// Tailwind tokens; no border-radius, no em dashes, no exclamation points.

type Subscription = {
  tier: string
  cycle: string
  status: string
  currentPeriodEnd: string | null
  trialEnd: string | null
}

const TIER_INFO: Record<PaidTier, { name: string; monthly: string; annual: string; features: string[] }> = {
  elevated: {
    name: 'Elevated',
    monthly: '$33.33 / month',
    annual: '$333.33 / year',
    features: ['Unlimited session types', 'Calendar integration'],
  },
  alchemist: {
    name: 'Alchemist',
    monthly: '$77.77 / month',
    annual: '$777.77 / year',
    features: ['Everything in Elevated', 'Featured first in search and discovery'],
  },
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BillingClient({
  tier,
  subscription,
  hasCustomer,
}: {
  tier: Tier
  subscription: Subscription | null
  hasCustomer: boolean
}) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sageCode, setSageCode] = useState('')
  const [sageMessage, setSageMessage] = useState<string | null>(null)
  const [sageOk, setSageOk] = useState(false)

  async function subscribe(paidTier: PaidTier) {
    setBusy(paidTier)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: paidTier, cycle }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError('Something went wrong starting checkout. Please try again in a moment.')
        setBusy(null)
        return
      }
      window.location.href = data.url as string
    } catch {
      setError('Something went wrong starting checkout. Please try again in a moment.')
      setBusy(null)
    }
  }

  async function manageBilling() {
    setBusy('portal')
    setError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError('Something went wrong opening the billing portal. Please try again in a moment.')
        setBusy(null)
        return
      }
      window.location.href = data.url as string
    } catch {
      setError('Something went wrong opening the billing portal. Please try again in a moment.')
      setBusy(null)
    }
  }

  async function redeemSage(e: React.FormEvent) {
    e.preventDefault()
    const code = sageCode.trim()
    if (!code) return
    setBusy('sage')
    setSageMessage(null)
    setSageOk(false)
    try {
      const res = await fetch('/api/sage-codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSageMessage(
          data?.error === 'already_redeemed'
            ? 'That code has already been used.'
            : data?.error === 'expired'
              ? 'That code has expired.'
              : data?.error === 'not_found'
                ? 'That code was not recognized.'
                : 'Something went wrong redeeming that code. Please try again in a moment.'
        )
        setBusy(null)
        return
      }
      // Calm, specific success state (D25).
      setSageOk(true)
      setSageMessage('Your free year of Elevated is active. Your account has been upgraded.')
      setBusy(null)
      // Reflect the new tier once the row is written.
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      setSageMessage('Something went wrong redeeming that code. Please try again in a moment.')
      setBusy(null)
    }
  }

  const isSubscriber = subscription !== null
  const isComped = !isSubscriber && tier !== 'free'
  const renewalLabel = formatDate(subscription?.currentPeriodEnd ?? null)
  const trialLabel = formatDate(subscription?.trialEnd ?? null)

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto w-full max-w-3xl px-6 py-16">
        {/* PLACEHOLDER COPY — Kiki rework */}
        <p className="label mb-2 text-olive">Billing</p>
        <h2 className="mb-8">Your plan</h2>

        {error && <p className="caption mb-6 text-olive">{error}</p>}

        {/* Current-plan summary */}
        <section className="mb-10 border border-border bg-surface p-6">
          {/* PLACEHOLDER COPY — Kiki rework */}
          <p className="label mb-2 text-dark">Current tier</p>
          <p className="font-ui text-olive" style={{ letterSpacing: '0.06em' }}>
            {tier.toUpperCase()}
          </p>

          {isSubscriber && (
            <div className="mt-4">
              <p className="caption text-dark">
                {subscription?.cycle === 'annual' ? 'Annual billing' : 'Monthly billing'}
                {subscription?.status ? ` — ${subscription.status}` : ''}
              </p>
              {subscription?.status === 'trialing' && trialLabel && (
                <p className="caption mt-2 text-dark">
                  Your free year of Elevated ends on {trialLabel}. Nothing is charged until then.
                </p>
              )}
              {subscription?.status !== 'trialing' && renewalLabel && (
                <p className="caption mt-2 text-dark">Next renewal on {renewalLabel}.</p>
              )}
            </div>
          )}

          {isComped && (
            <p className="caption mt-4 text-dark">
              {/* PLACEHOLDER COPY — Kiki rework */}
              You are on the Elevated plan as a founding practitioner. There is nothing to pay.
            </p>
          )}

          {(isSubscriber || hasCustomer) && (
            <button
              type="button"
              className="btn-secondary mt-6"
              onClick={manageBilling}
              disabled={busy !== null}
            >
              {busy === 'portal' ? 'Opening' : 'Manage billing'}
            </button>
          )}
        </section>

        {/* Upgrade cards + sage code — free tier only */}
        {tier === 'free' && (
          <>
            {/* Cycle toggle */}
            <div className="mb-8 flex items-center gap-3">
              <button
                type="button"
                className="btn-secondary"
                style={
                  cycle === 'monthly'
                    ? { backgroundColor: 'var(--color-olive)', color: 'var(--color-light)' }
                    : undefined
                }
                onClick={() => setCycle('monthly')}
              >
                Monthly
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={
                  cycle === 'annual'
                    ? { backgroundColor: 'var(--color-olive)', color: 'var(--color-light)' }
                    : undefined
                }
                onClick={() => setCycle('annual')}
              >
                Annual
              </button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {(['elevated', 'alchemist'] as PaidTier[]).map((paidTier) => {
                const info = TIER_INFO[paidTier]
                return (
                  <section key={paidTier} className="border border-border bg-surface p-6">
                    {/* PLACEHOLDER COPY — Kiki rework */}
                    <p className="label mb-2 text-olive">{info.name}</p>
                    <p className="font-ui mb-4 text-dark" style={{ letterSpacing: '0.04em' }}>
                      {cycle === 'monthly' ? info.monthly : info.annual}
                    </p>
                    <ul className="mb-6">
                      {info.features.map((f) => (
                        <li key={f} className="caption mb-2 text-dark">
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="btn-primary w-full"
                      onClick={() => subscribe(paidTier)}
                      disabled={busy !== null}
                    >
                      {busy === paidTier ? 'Starting' : 'Subscribe'}
                    </button>
                  </section>
                )
              })}
            </div>

            {/* Sage code redemption (D25) — wired to /api/sage-codes/redeem */}
            <section className="mt-12 border border-border bg-surface p-6">
              {/* PLACEHOLDER COPY — Kiki rework */}
              <p className="label mb-2 text-olive">Sage code</p>
              <p className="caption mb-4 text-dark">
                Have a Sage code? Redeem it for a free year of Elevated.
              </p>
              <form onSubmit={redeemSage} className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={sageCode}
                  onChange={(e) => setSageCode(e.target.value)}
                  placeholder="SAGE-XXXX-XXXX"
                  className="font-ui flex-1 border border-border bg-light px-4 py-3 text-dark"
                  style={{ letterSpacing: '0.06em' }}
                  disabled={busy === 'sage' || sageOk}
                />
                <button
                  type="submit"
                  className="btn-secondary"
                  disabled={busy === 'sage' || sageOk || sageCode.trim() === ''}
                >
                  {busy === 'sage' ? 'Redeeming' : 'Redeem'}
                </button>
              </form>
              {sageMessage && (
                <p className="caption mt-4 text-olive">{sageMessage}</p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}
