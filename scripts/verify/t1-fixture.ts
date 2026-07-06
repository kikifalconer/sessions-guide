// Task 1: fixture create/teardown round-trip + auth cookie sanity.
import { admin, createFixture, authCookieHeader, teardownFixture, countZzverify } from './billing-verify.ts'

async function main() {
  const sb = admin()
  console.log('before:', await countZzverify())

  const f = await createFixture('free')
  console.log('created fixture:', { userId: f.userId, slug: f.slug, email: f.email })

  const { data: pr } = await sb
    .from('practitioners')
    .select('id, slug, subscription_tier')
    .eq('id', f.userId)
    .maybeSingle()
  console.log('practitioner present:', pr ? `YES tier=${pr.subscription_tier}` : 'NO — FAIL')

  const cookie = await authCookieHeader(f.email)
  const cookieNames = cookie.split('; ').map((c) => c.split('=')[0])
  console.log('auth cookie header built:', cookieNames.length, 'cookie(s):', cookieNames.join(', '))

  await teardownFixture(f)
  const after = await countZzverify()
  console.log('after teardown:', after)
  const zero = Object.values(after).every((n) => n === 0)
  console.log(zero ? 'ROUND-TRIP PASS (all zzverify counts 0)' : 'ROUND-TRIP FAIL (nonzero remains)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
