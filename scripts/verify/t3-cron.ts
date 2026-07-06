// Task 3: cron reminder path — T-14, T-1, auth gate, idempotency.
// SAFETY: the cron processes ALL trialing subscriptions. Before invoking we
// assert no REAL (non-zzverify) trialing subs exist that it could touch/email.
import {
  env, BASE_URL, admin, createFixture, teardownFixture, countZzverify,
} from './billing-verify.ts'

const results: string[] = []
const ok = (label: string, pass: boolean, detail = '') =>
  results.push(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)

const CRON = `${BASE_URL}/api/cron/subscription-reminders`

async function callCron(auth: boolean) {
  const res = await fetch(CRON, {
    headers: auth ? { Authorization: `Bearer ${env.CRON_SECRET}` } : {},
  })
  let body: Record<string, unknown> = {}
  try { body = await res.json() } catch { /* ignore */ }
  return { status: res.status, body }
}

async function main() {
  const sb = admin()

  // ---- SAFETY GUARD: no real trialing subs in the danger window ------------
  const { data: realTrialing } = await sb
    .from('subscriptions')
    .select('id, stripe_subscription_id, trial_end, reminder_14_sent_at, reminder_1_sent_at')
    .eq('status', 'trialing')
    .not('stripe_subscription_id', 'like', 'zzverify%')
  const hazard = (realTrialing ?? []).filter((r) => {
    const te = r.trial_end ? new Date(r.trial_end as string).getTime() : 0
    const within14 = te > Date.now() && te <= Date.now() + 14 * 86400e3
    const unsent = !r.reminder_14_sent_at || !r.reminder_1_sent_at
    return within14 && unsent
  })
  if (hazard.length > 0) {
    console.log(`ABORT: ${hazard.length} REAL trialing subscription(s) in the reminder window; invoking the cron would touch/email real rows. Not proceeding with Task 3.`)
    console.log(JSON.stringify(hazard, null, 2))
    process.exit(2)
  }
  ok('3.0 safety: no real trialing subs in window', true, `real trialing total=${(realTrialing ?? []).length}`)

  // ---- Fixture + a trialing sub row (trial_end now+13d) ---------------------
  const F = await createFixture('elevated')
  const stamp = F.stamp
  const trialEnd13 = new Date(Date.now() + 13 * 86400e3).toISOString()
  const { error: insErr } = await sb.from('subscriptions').insert({
    practitioner_id: F.userId,
    stripe_subscription_id: `zzverify-sub-${stamp}`,
    stripe_customer_id: `zzverify-cus-${stamp}`,
    tier: 'elevated',
    billing_cycle: 'monthly',
    status: 'trialing',
    trial_end: trialEnd13,
    current_period_end: trialEnd13,
  })
  ok('3.1 inserted trialing sub (trial_end +13d)', !insErr, insErr?.message ?? '')

  // ---- 3.2: auth gate ------------------------------------------------------
  const noAuth = await callCron(false)
  ok('3.2 cron without bearer rejected', noAuth.status === 401 || noAuth.status === 403, `status=${noAuth.status}`)

  // ---- 3.3: T-14 fires -----------------------------------------------------
  const run1 = await callCron(true)
  ok('3.3 cron authorized 200', run1.status === 200, `status=${run1.status} body=${JSON.stringify(run1.body)}`)
  const { data: row1 } = await sb
    .from('subscriptions').select('reminder_14_sent_at, reminder_1_sent_at')
    .eq('stripe_subscription_id', `zzverify-sub-${stamp}`).maybeSingle()
  ok('3.3 reminder_14_sent_at stamped', !!row1?.reminder_14_sent_at, `got ${row1?.reminder_14_sent_at}`)
  ok('3.3 reminder_1_sent_at still null', row1?.reminder_1_sent_at === null, `got ${row1?.reminder_1_sent_at}`)
  ok('3.3 cron reported reminder14Sent>=1 (send attempted for our row)',
    Number(run1.body.reminder14Sent) >= 1, `reminder14Sent=${run1.body.reminder14Sent}`)

  // ---- 3.4: advance to T-1 -------------------------------------------------
  const trialEnd12h = new Date(Date.now() + 12 * 3600e3).toISOString()
  await sb.from('subscriptions')
    .update({ trial_end: trialEnd12h })
    .eq('stripe_subscription_id', `zzverify-sub-${stamp}`)
  const run2 = await callCron(true)
  const { data: row2 } = await sb
    .from('subscriptions').select('reminder_14_sent_at, reminder_1_sent_at')
    .eq('stripe_subscription_id', `zzverify-sub-${stamp}`).maybeSingle()
  ok('3.4 reminder_1_sent_at now stamped', !!row2?.reminder_1_sent_at, `got ${row2?.reminder_1_sent_at}`)
  ok('3.4 cron reported reminder1Sent>=1', Number(run2.body.reminder1Sent) >= 1, `reminder1Sent=${run2.body.reminder1Sent}`)

  // ---- 3.5: idempotency — third run changes nothing ------------------------
  const before = row2
  const run3 = await callCron(true)
  const { data: row3 } = await sb
    .from('subscriptions').select('reminder_14_sent_at, reminder_1_sent_at')
    .eq('stripe_subscription_id', `zzverify-sub-${stamp}`).maybeSingle()
  ok('3.5 reminder_14 unchanged on re-run', row3?.reminder_14_sent_at === before?.reminder_14_sent_at)
  ok('3.5 reminder_1 unchanged on re-run', row3?.reminder_1_sent_at === before?.reminder_1_sent_at)
  ok('3.5 third run sent nothing (both counters 0)',
    Number(run3.body.reminder14Sent) === 0 && Number(run3.body.reminder1Sent) === 0,
    `14=${run3.body.reminder14Sent} 1=${run3.body.reminder1Sent}`)

  // ---- teardown ------------------------------------------------------------
  await teardownFixture(F)
  const after = await countZzverify()
  ok('3.6 teardown to zero', Object.values(after).every((n) => n === 0), JSON.stringify(after))

  console.log('\n=== TASK 3 RESULTS ===')
  for (const r of results) console.log(r)
  const fails = results.filter((r) => r.startsWith('FAIL'))
  console.log(`\n${fails.length === 0 ? 'ALL PASS' : fails.length + ' FAILURE(S)'}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
