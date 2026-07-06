// READ-ONLY preflight for the billing verification pass. Creates no data.
// Run: node scripts/verify/preflight.ts

import { readFileSync } from 'node:fs'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const env: Record<string, string> = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const KEY = env.STRIPE_SECRET_KEY ?? ''
console.log('[1] STRIPE key prefix:', KEY.slice(0, 8), KEY.startsWith('sk_test_') ? 'OK' : 'NOT TEST — STOP')

// The four NEW price env var names the shipped code reads.
const NEW_VARS = [
  'STRIPE_PRICE_ELEVATED_MONTHLY',
  'STRIPE_PRICE_ELEVATED_ANNUAL',
  'STRIPE_PRICE_ALCHEMIST_MONTHLY',
  'STRIPE_PRICE_ALCHEMIST_ANNUAL',
]
console.log('\n[2a] New price env vars present in .env.local?')
for (const v of NEW_VARS) console.log(`   ${v}: ${env[v] ? 'SET' : 'MISSING'}`)

// Known IDs printed by scripts/stripe-setup-billing.ts at PAUSE 2 — retrieve to
// prove the Stripe objects exist regardless of the env-file gap.
const KNOWN = {
  STRIPE_PRICE_ELEVATED_MONTHLY: 'price_1Tq1XSE82gLXXqbz8Zyz6hLW',
  STRIPE_PRICE_ELEVATED_ANNUAL: 'price_1Tq1XSE82gLXXqbzqi4HNKko',
  STRIPE_PRICE_ALCHEMIST_MONTHLY: 'price_1Tq1XTE82gLXXqbzzDKNUxGx',
  STRIPE_PRICE_ALCHEMIST_ANNUAL: 'price_1Tq1XTE82gLXXqbzgCSwm7l0',
}
const EXPECT: Record<string, { amount: number; interval: string; lookup: string }> = {
  STRIPE_PRICE_ELEVATED_MONTHLY: { amount: 3333, interval: 'month', lookup: 'elevated_monthly' },
  STRIPE_PRICE_ELEVATED_ANNUAL: { amount: 33333, interval: 'year', lookup: 'elevated_annual' },
  STRIPE_PRICE_ALCHEMIST_MONTHLY: { amount: 7777, interval: 'month', lookup: 'alchemist_monthly' },
  STRIPE_PRICE_ALCHEMIST_ANNUAL: { amount: 77777, interval: 'year', lookup: 'alchemist_annual' },
}

async function main() {
  const stripe = new Stripe(KEY)

  console.log('\n[2b] Retrieve each price from Stripe (by env value if set, else known id):')
  for (const name of NEW_VARS) {
    const id = env[name] || (KNOWN as Record<string, string>)[name]
    try {
      const p = await stripe.prices.retrieve(id)
      const exp = EXPECT[name]
      const ok =
        p.unit_amount === exp.amount &&
        p.recurring?.interval === exp.interval &&
        p.lookup_key === exp.lookup &&
        p.active
      console.log(
        `   ${name}: amount=${p.unit_amount} interval=${p.recurring?.interval} lookup=${p.lookup_key} active=${p.active} ${ok ? 'OK' : 'MISMATCH'}`
      )
    } catch (e) {
      console.log(`   ${name}: RETRIEVE FAILED (${(e as Error).message})`)
    }
  }

  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  console.log('\n[3] Live DB schema presence:')
  const { error: scErr } = await sb.from('sage_codes').select('id').limit(1)
  console.log('   sage_codes table:', scErr ? `MISSING (${scErr.message})` : 'OK')
  const { error: colErr } = await sb
    .from('subscriptions')
    .select('trial_end, reminder_14_sent_at, reminder_1_sent_at')
    .limit(1)
  console.log('   subscriptions trial columns:', colErr ? `MISSING (${colErr.message})` : 'OK')

  console.log('\n[4] Clean slate (zzverify-prefixed rows):')
  const pr = await sb
    .from('practitioners')
    .select('id', { count: 'exact', head: true })
    .like('slug', 'zzverify%')
  console.log('   practitioners zzverify:', pr.count ?? `err ${pr.error?.message}`)
  const sc = await sb
    .from('sage_codes')
    .select('id', { count: 'exact', head: true })
    .like('label', 'zzverify%')
  console.log('   sage_codes zzverify(label):', sc.count ?? `err ${sc.error?.message}`)
  const su = await sb
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .like('stripe_subscription_id', 'zzverify%')
  console.log('   subscriptions zzverify(stripe_subscription_id):', su.count ?? `err ${su.error?.message}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
