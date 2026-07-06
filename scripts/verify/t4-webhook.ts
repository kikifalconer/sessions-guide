// Task 4: customer.subscription.deleted downgrade guard + signature gate.
import Stripe from 'stripe'
import {
  env, BASE_URL, admin, createFixture, teardownFixture, countZzverify,
} from './billing-verify.ts'

const stripe = new Stripe(env.STRIPE_SECRET_KEY)
const WH = `${BASE_URL}/api/stripe/webhook`
const results: string[] = []
const ok = (label: string, pass: boolean, detail = '') =>
  results.push(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)

function deletedEvent(evtId: string, subId: string, cusId: string) {
  return {
    id: evtId,
    object: 'event',
    type: 'customer.subscription.deleted',
    data: { object: { id: subId, object: 'subscription', customer: cusId, status: 'canceled' } },
  }
}

async function postSigned(payloadObj: unknown, opts: { badSig?: boolean } = {}) {
  const payload = JSON.stringify(payloadObj)
  const sig = opts.badSig
    ? 't=1,v1=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
    : stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET })
  const res = await fetch(WH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
    body: payload,
  })
  let body: Record<string, unknown> = {}
  try { body = await res.json() } catch { /* ignore */ }
  return { status: res.status, body }
}

async function main() {
  const sb = admin()

  // ================= Case A: real subscriber downgrades =====================
  const A = await createFixture('elevated')
  const subIdA = `zzverify-sub-A-${A.stamp}`
  await sb.from('subscriptions').insert({
    practitioner_id: A.userId,
    stripe_subscription_id: subIdA,
    stripe_customer_id: `zzverify-cus-${A.stamp}`,
    tier: 'elevated', billing_cycle: 'monthly', status: 'active',
  })
  const { data: aBefore } = await sb.from('practitioners').select('subscription_tier').eq('id', A.userId).maybeSingle()
  const rA = await postSigned(deletedEvent(`evt_zzverify_A_${A.stamp}`, subIdA, `zzverify-cus-${A.stamp}`))
  ok('4.A webhook accepted (200)', rA.status === 200, `status=${rA.status} body=${JSON.stringify(rA.body)}`)
  const { data: aSub } = await sb.from('subscriptions').select('status').eq('stripe_subscription_id', subIdA).maybeSingle()
  const { data: aAfter } = await sb.from('practitioners').select('subscription_tier').eq('id', A.userId).maybeSingle()
  ok('4.A subscriptions status -> canceled', aSub?.status === 'canceled', `before=active after=${aSub?.status}`)
  ok('4.A practitioner tier -> free', aAfter?.subscription_tier === 'free', `before=${aBefore?.subscription_tier} after=${aAfter?.subscription_tier}`)

  // ============ Case B: comped grandfathered (no sub row) untouched =========
  const B = await createFixture('elevated') // elevated, NO subscriptions row
  const { data: bBefore } = await sb.from('practitioners').select('subscription_tier').eq('id', B.userId).maybeSingle()
  const rB = await postSigned(deletedEvent(`evt_zzverify_B_${B.stamp}`, `zzverify-sub-nomatch-${B.stamp}`, `zzverify-cus-${B.stamp}`))
  ok('4.B webhook accepted (200)', rB.status === 200, `status=${rB.status} body=${JSON.stringify(rB.body)}`)
  const { data: bAfter } = await sb.from('practitioners').select('subscription_tier').eq('id', B.userId).maybeSingle()
  const { data: bSub } = await sb.from('subscriptions').select('id').eq('practitioner_id', B.userId).maybeSingle()
  ok('4.B comped practitioner tier UNCHANGED (elevated)', bAfter?.subscription_tier === 'elevated', `before=${bBefore?.subscription_tier} after=${bAfter?.subscription_tier}`)
  ok('4.B still has no subscription row', !bSub)

  // ================= Signature negative case ================================
  const D = await createFixture('elevated')
  const subIdD = `zzverify-sub-D-${D.stamp}`
  await sb.from('subscriptions').insert({
    practitioner_id: D.userId,
    stripe_subscription_id: subIdD,
    stripe_customer_id: `zzverify-cus-${D.stamp}`,
    tier: 'elevated', billing_cycle: 'monthly', status: 'active',
  })
  const rBad = await postSigned(deletedEvent(`evt_zzverify_D_${D.stamp}`, subIdD, `zzverify-cus-${D.stamp}`), { badSig: true })
  ok('4.sig bad signature rejected (400)', rBad.status === 400, `status=${rBad.status} body=${JSON.stringify(rBad.body)}`)
  const { data: dSub } = await sb.from('subscriptions').select('status').eq('stripe_subscription_id', subIdD).maybeSingle()
  const { data: dAfter } = await sb.from('practitioners').select('subscription_tier').eq('id', D.userId).maybeSingle()
  ok('4.sig no DB change: sub still active', dSub?.status === 'active', `got ${dSub?.status}`)
  ok('4.sig no DB change: tier still elevated', dAfter?.subscription_tier === 'elevated', `got ${dAfter?.subscription_tier}`)
  // The bad-sig event must NOT be recorded in the dedupe ledger (rejected pre-insert).
  const { data: ledgerBad } = await sb.from('stripe_webhook_events').select('id').eq('id', `evt_zzverify_D_${D.stamp}`).maybeSingle()
  ok('4.sig bad-sig event NOT in dedupe ledger', !ledgerBad)

  // ================= teardown ==============================================
  await teardownFixture(A)
  await teardownFixture(B)
  await teardownFixture(D)
  await sb.from('stripe_webhook_events').delete().like('id', 'evt_zzverify%')
  const { count: ledgerLeft } = await sb.from('stripe_webhook_events')
    .select('id', { count: 'exact', head: true }).like('id', 'evt_zzverify%')
  const after = await countZzverify()
  ok('4.teardown to zero', Object.values(after).every((n) => n === 0) && (ledgerLeft ?? 0) === 0,
    `${JSON.stringify(after)} ledger=${ledgerLeft}`)

  console.log('\n=== TASK 4 RESULTS ===')
  for (const r of results) console.log(r)
  const fails = results.filter((r) => r.startsWith('FAIL'))
  console.log(`\n${fails.length === 0 ? 'ALL PASS' : fails.length + ' FAILURE(S)'}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
