// Idempotent Stripe product/price setup for the three-tier billing model (D24).
// Creates two products (Elevated, Alchemist) and four recurring prices with
// stable lookup_keys, then prints the price IDs mapped to their env var names.
//
// Run from the project root:  node scripts/stripe-setup-billing.ts
// (Node strips the TS types natively; matches the plain-node runner used by the
// existing .mjs seed scripts. No dotenv/tsx dependency.)
//
// SAFE TO RE-RUN, including later against LIVE keys: every object is looked up
// before it is created. Prices are matched by their globally-unique lookup_key;
// products by exact name. A second run creates nothing and prints the same IDs.

import { readFileSync } from 'node:fs'
import Stripe from 'stripe'

// --- env (hand-parsed, mirrors scripts/seed-booking-dev.mjs) ----------------
const env: Record<string, string> = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const secretKey = env.STRIPE_SECRET_KEY
if (!secretKey) {
  console.error('STRIPE_SECRET_KEY missing from .env.local')
  process.exit(1)
}
const stripe = new Stripe(secretKey)

// --- product + price definitions --------------------------------------------
type PriceDef = {
  lookupKey: string
  envVar: string
  amount: number // cents
  interval: 'month' | 'year'
}

type ProductDef = {
  name: string
  metadataTier: string
  prices: PriceDef[]
}

const PRODUCTS: ProductDef[] = [
  {
    name: 'sessions.guide Elevated',
    metadataTier: 'elevated',
    prices: [
      { lookupKey: 'elevated_monthly', envVar: 'STRIPE_PRICE_ELEVATED_MONTHLY', amount: 3333, interval: 'month' },
      { lookupKey: 'elevated_annual', envVar: 'STRIPE_PRICE_ELEVATED_ANNUAL', amount: 33333, interval: 'year' },
    ],
  },
  {
    name: 'sessions.guide Alchemist',
    metadataTier: 'alchemist',
    prices: [
      { lookupKey: 'alchemist_monthly', envVar: 'STRIPE_PRICE_ALCHEMIST_MONTHLY', amount: 7777, interval: 'month' },
      { lookupKey: 'alchemist_annual', envVar: 'STRIPE_PRICE_ALCHEMIST_ANNUAL', amount: 77777, interval: 'year' },
    ],
  },
]

// Find a product by exact name (immediate consistency, unlike search). Create
// it if absent. Marked with metadata for later attribution.
async function findOrCreateProduct(def: ProductDef): Promise<Stripe.Product> {
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    if (product.name === def.name) return product
  }
  const created = await stripe.products.create({
    name: def.name,
    metadata: { app: 'sessions.guide', tier: def.metadataTier },
  })
  console.log(`  created product ${def.name} (${created.id})`)
  return created
}

// Find a price by its globally-unique lookup_key. Create it if absent. The
// lookup_key is the idempotency anchor: Stripe rejects a duplicate, and re-runs
// simply find the existing one.
async function findOrCreatePrice(productId: string, p: PriceDef): Promise<string> {
  const existing = await stripe.prices.list({ lookup_keys: [p.lookupKey], active: true, limit: 1 })
  if (existing.data.length > 0) return existing.data[0].id

  const created = await stripe.prices.create({
    product: productId,
    lookup_key: p.lookupKey,
    unit_amount: p.amount,
    currency: 'usd',
    recurring: { interval: p.interval },
  })
  console.log(`  created price ${p.lookupKey} (${created.id})`)
  return created.id
}

async function main(): Promise<void> {
  const mode = secretKey.startsWith('sk_live') ? 'LIVE' : 'TEST'
  console.log(`Stripe billing setup (${mode} mode)`)
  const results: { envVar: string; priceId: string }[] = []

  for (const def of PRODUCTS) {
    const product = await findOrCreateProduct(def)
    for (const price of def.prices) {
      const priceId = await findOrCreatePrice(product.id, price)
      results.push({ envVar: price.envVar, priceId })
    }
  }

  console.log('\nPrice IDs (add these to .env.local and Vercel Production):\n')
  for (const r of results) {
    console.log(`${r.envVar}=${r.priceId}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
