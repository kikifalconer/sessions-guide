// Task 6: final teardown confirmation across DB, auth, webhook ledger, Stripe.
import Stripe from 'stripe'
import { env, admin, countZzverify } from './billing-verify.ts'

async function main() {
  const sb = admin()
  const stripe = new Stripe(env.STRIPE_SECRET_KEY)

  const counts = await countZzverify()

  const { count: ledger } = await sb
    .from('stripe_webhook_events')
    .select('id', { count: 'exact', head: true })
    .like('id', 'evt_zzverify%')

  // Stripe stragglers: any test customer with a zzverify+ email.
  let stripeCustomers = 0
  for await (const c of stripe.customers.list({ limit: 100 })) {
    if ((c.email ?? '').startsWith('zzverify+')) {
      stripeCustomers++
      try { await stripe.customers.del(c.id) } catch { /* ignore */ }
    }
  }

  console.log('=== FINAL TEARDOWN STATE (all must be 0) ===')
  console.log('DB counts:', JSON.stringify(counts))
  console.log('webhook ledger evt_zzverify:', ledger)
  console.log('Stripe zzverify customers found (now deleted):', stripeCustomers)

  const allZero =
    Object.values(counts).every((n) => n === 0) && (ledger ?? 0) === 0 && stripeCustomers === 0
  console.log(allZero ? '\nCLEAN — zero zzverify artifacts remain' : '\nWARNING — residual artifacts (see above)')
}

main().catch((e) => { console.error(e); process.exit(1) })
