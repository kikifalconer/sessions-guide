// Task 2: sage redemption end-to-end, race-safety, compensating update.
import { execSync } from 'node:child_process'
import Stripe from 'stripe'
import {
  env, BASE_URL, admin, createFixture, authCookieHeader, teardownFixture, countZzverify,
} from './billing-verify.ts'

const stripe = new Stripe(env.STRIPE_SECRET_KEY)
const results: string[] = []
const ok = (label: string, pass: boolean, detail = '') =>
  results.push(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)

async function redeem(cookie: string, code: string) {
  const res = await fetch(`${BASE_URL}/api/sage-codes/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ code }),
  })
  let body: Record<string, unknown> = {}
  try { body = await res.json() } catch { /* ignore */ }
  return { status: res.status, body }
}

function generateCode(): string {
  const out = execSync('node scripts/generate-sage-codes.ts --count 1 --label "zzverify"', {
    encoding: 'utf8',
  })
  const m = out.match(/SAGE-[A-Z0-9]{4}-[A-Z0-9]{4}/)
  if (!m) throw new Error(`could not parse generated code from:\n${out}`)
  return m[0]
}

async function main() {
  const sb = admin()
  const createdSubs: string[] = []
  const createdCustomers: string[] = []

  // ---- Setup: fixture A (free) + one generated code -------------------------
  const A = await createFixture('free')
  const code = generateCode()
  const { data: codeRow } = await sb
    .from('sage_codes').select('code, redeemed_by, redeemed_at').eq('code', code).maybeSingle()
  ok('2.1 code generated, format valid', /^SAGE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code), code)
  ok('2.1 code initially unredeemed', !!codeRow && codeRow.redeemed_by === null)

  // ---- 2.2/2.3: redeem as A, assert full end state --------------------------
  const cookieA = await authCookieHeader(A.email)
  const r1 = await redeem(cookieA, code)
  ok('2.2 redeem returns 200 ok', r1.status === 200 && r1.body.ok === true, `status=${r1.status} body=${JSON.stringify(r1.body)}`)

  const { data: codeAfter } = await sb
    .from('sage_codes').select('redeemed_by, redeemed_at').eq('code', code).maybeSingle()
  ok('2.3 sage_codes redeemed_by = A', codeAfter?.redeemed_by === A.userId, `got ${codeAfter?.redeemed_by}`)
  ok('2.3 sage_codes redeemed_at set', !!codeAfter?.redeemed_at)

  const { data: subRow } = await sb
    .from('subscriptions').select('*').eq('practitioner_id', A.userId).maybeSingle()
  ok('2.3 subscriptions row status trialing', subRow?.status === 'trialing', `got ${subRow?.status}`)
  ok('2.3 subscriptions tier elevated', subRow?.tier === 'elevated', `got ${subRow?.tier}`)
  ok('2.3 subscriptions billing_cycle monthly', subRow?.billing_cycle === 'monthly', `got ${subRow?.billing_cycle}`)
  ok('2.3 subscriptions trial_end populated', !!subRow?.trial_end, `got ${subRow?.trial_end}`)

  const { data: pracA } = await sb
    .from('practitioners').select('subscription_tier, stripe_customer_id').eq('id', A.userId).maybeSingle()
  ok('2.3 practitioner tier -> elevated', pracA?.subscription_tier === 'elevated', `got ${pracA?.subscription_tier}`)

  if (subRow?.stripe_subscription_id) {
    createdSubs.push(subRow.stripe_subscription_id as string)
    if (pracA?.stripe_customer_id) createdCustomers.push(pracA.stripe_customer_id as string)
    const s = await stripe.subscriptions.retrieve(subRow.stripe_subscription_id as string)
    const item = s.items.data[0]
    const trialEndDays = s.trial_end ? (s.trial_end - Math.floor(Date.now() / 1000)) / 86400 : 0
    ok('2.3 Stripe sub status trialing', s.status === 'trialing', `got ${s.status}`)
    ok('2.3 Stripe sub on elevated_monthly price', item?.price?.lookup_key === 'elevated_monthly', `got ${item?.price?.lookup_key}`)
    ok('2.3 Stripe trial_end ~= now+365d', trialEndDays > 363 && trialEndDays < 366, `~${trialEndDays.toFixed(1)}d`)
    ok('2.3 Stripe missing_payment_method=cancel',
      s.trial_settings?.end_behavior?.missing_payment_method === 'cancel',
      `got ${s.trial_settings?.end_behavior?.missing_payment_method}`)
    ok('2.3 Stripe no default payment method', !s.default_payment_method, `got ${s.default_payment_method}`)
  } else {
    ok('2.3 Stripe subscription assertions', false, 'no stripe_subscription_id on row')
  }

  // ---- 2.4: race — redeem SAME code as fresh fixture B ----------------------
  const B = await createFixture('free')
  const cookieB = await authCookieHeader(B.email)
  const r2 = await redeem(cookieB, code)
  ok('2.4 second redeem rejected (409 already_redeemed)',
    r2.status === 409 && r2.body.error === 'already_redeemed', `status=${r2.status} body=${JSON.stringify(r2.body)}`)
  const { data: codeStill } = await sb
    .from('sage_codes').select('redeemed_by').eq('code', code).maybeSingle()
  ok('2.4 code redeemed_by unchanged (still A)', codeStill?.redeemed_by === A.userId, `got ${codeStill?.redeemed_by}`)
  const { data: subB } = await sb
    .from('subscriptions').select('id').eq('practitioner_id', B.userId).maybeSingle()
  ok('2.4 no subscription created for B', !subB)
  const { data: pracB } = await sb
    .from('practitioners').select('subscription_tier, stripe_customer_id').eq('id', B.userId).maybeSingle()
  ok('2.4 B tier unchanged (free)', pracB?.subscription_tier === 'free', `got ${pracB?.subscription_tier}`)
  // B may have gotten a stripe customer created before the claim failed? No —
  // claim happens BEFORE customer creation, so B should have no customer.
  ok('2.4 B has no stripe customer (claim precedes Stripe)', !pracB?.stripe_customer_id, `got ${pracB?.stripe_customer_id}`)

  // ---- 2.5: compensating update — Stripe fails AFTER claim ------------------
  // Inject failure via data: fixture C with a bogus stripe_customer_id so
  // subscriptions.create 404s after the code is claimed. Assert un-redeem.
  const C = await createFixture('free')
  await sb.from('practitioners')
    .update({ stripe_customer_id: 'cus_zzverifyINVALID000' }).eq('id', C.userId)
  const code2 = generateCode()
  const cookieC = await authCookieHeader(C.email)
  const r3 = await redeem(cookieC, code2)
  ok('2.5 redeem fails (500 redeem_failed) on Stripe error',
    r3.status === 500 && r3.body.error === 'redeem_failed', `status=${r3.status} body=${JSON.stringify(r3.body)}`)
  const { data: code2After } = await sb
    .from('sage_codes').select('redeemed_by, redeemed_at').eq('code', code2).maybeSingle()
  ok('2.5 code2 un-redeemed (redeemed_by back to null)', code2After?.redeemed_by === null, `got ${code2After?.redeemed_by}`)
  ok('2.5 code2 redeemed_at cleared', code2After?.redeemed_at === null, `got ${code2After?.redeemed_at}`)
  const { data: subC } = await sb
    .from('subscriptions').select('id').eq('practitioner_id', C.userId).maybeSingle()
  ok('2.5 no subscription row for C', !subC)
  const { data: pracC } = await sb
    .from('practitioners').select('subscription_tier').eq('id', C.userId).maybeSingle()
  ok('2.5 C tier still free', pracC?.subscription_tier === 'free', `got ${pracC?.subscription_tier}`)

  // ---- 2.6: cleanup Stripe + teardown --------------------------------------
  for (const id of createdSubs) {
    try { await stripe.subscriptions.cancel(id) } catch { /* already gone */ }
  }
  for (const id of createdCustomers) {
    try { await stripe.customers.del(id) } catch { /* ignore */ }
  }
  await teardownFixture(A)
  await teardownFixture(B)
  await teardownFixture(C)
  // Delete the generated zzverify codes.
  await sb.from('sage_codes').delete().like('label', 'zzverify%')

  const after = await countZzverify()
  ok('2.6 teardown to zero', Object.values(after).every((n) => n === 0), JSON.stringify(after))

  console.log('\n=== TASK 2 RESULTS ===')
  for (const r of results) console.log(r)
  const fails = results.filter((r) => r.startsWith('FAIL'))
  console.log(`\n${fails.length === 0 ? 'ALL PASS' : fails.length + ' FAILURE(S)'}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
