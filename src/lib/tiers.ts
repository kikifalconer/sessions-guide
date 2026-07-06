// Tier <-> Stripe price mapping (D24). Server-only: reads the STRIPE_PRICE_*
// env vars, which are not NEXT_PUBLIC. The four price ids come from
// scripts/stripe-setup-billing.ts.

export const TIERS = ['free', 'elevated', 'alchemist'] as const
export type Tier = (typeof TIERS)[number]

export type BillingCycle = 'monthly' | 'annual'

// 'free' has no Stripe price — it is the absence of a paid subscription.
export type PaidTier = 'elevated' | 'alchemist'

type PriceEntry = { tier: PaidTier; cycle: BillingCycle; envVar: string }

const PRICE_ENV: PriceEntry[] = [
  { tier: 'elevated', cycle: 'monthly', envVar: 'STRIPE_PRICE_ELEVATED_MONTHLY' },
  { tier: 'elevated', cycle: 'annual', envVar: 'STRIPE_PRICE_ELEVATED_ANNUAL' },
  { tier: 'alchemist', cycle: 'monthly', envVar: 'STRIPE_PRICE_ALCHEMIST_MONTHLY' },
  { tier: 'alchemist', cycle: 'annual', envVar: 'STRIPE_PRICE_ALCHEMIST_ANNUAL' },
]

// Maps a Stripe price id back to its tier + billing cycle. Throws loudly on an
// unknown id: a webhook that cannot resolve the tier must fail (and be retried)
// rather than silently assigning the wrong tier or none.
export function priceIdToTier(priceId: string): { tier: PaidTier; cycle: BillingCycle } {
  for (const e of PRICE_ENV) {
    if (process.env[e.envVar] && process.env[e.envVar] === priceId) {
      return { tier: e.tier, cycle: e.cycle }
    }
  }
  throw new Error(
    `priceIdToTier: unknown Stripe price id "${priceId}" — no STRIPE_PRICE_* env var matches. ` +
      `Confirm the four billing price env vars are set in this environment.`
  )
}

// Resolves the configured Stripe price id for a paid tier + cycle. Throws if the
// env var is unset so a checkout never starts against an empty price id.
export function tierToPriceId(tier: PaidTier, cycle: BillingCycle): string {
  const entry = PRICE_ENV.find((e) => e.tier === tier && e.cycle === cycle)
  if (!entry) {
    throw new Error(`tierToPriceId: no price mapping for tier "${tier}" cycle "${cycle}"`)
  }
  const priceId = process.env[entry.envVar]
  if (!priceId) {
    throw new Error(`tierToPriceId: env var ${entry.envVar} is not set`)
  }
  return priceId
}
