// Task 5: free-tier public display cap (5.1) + alchemist ordering (5.2).
// Both driven over HTTP against the running dev server (real render path).
import {
  BASE_URL, admin, createFixture, teardownFixture, countZzverify,
} from './billing-verify.ts'

const MODALITY_ID = 'ac8102ed-bfc2-4674-bafd-e8b135f65e73' // approved (feng-shui)
const results: string[] = []
const ok = (label: string, pass: boolean, detail = '') =>
  results.push(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)

async function getHtml(path: string): Promise<string> {
  const res = await fetch(`${BASE_URL}${path}`, { cache: 'no-store' })
  return res.ok ? res.text() : `__STATUS_${res.status}__`
}

async function main() {
  const sb = admin()

  // ============ 5.1 free-tier public display cap ============================
  const P = await createFixture('free')
  const names = ['zzverifyAAA', 'zzverifyBBB', 'zzverifyCCC']
  for (let i = 0; i < 3; i++) {
    await sb.from('session_types').insert({
      practitioner_id: P.userId,
      modality_id: MODALITY_ID,
      name: names[i],
      duration_minutes: 60,
      format: 'virtual',
      pricing_model: 'fixed',
      price: 100,
      is_active: true,
      sort_order: i, // AAA=0, BBB=1, CCC=2
    })
  }

  const freeHtml = await getHtml(`/${P.slug}?nocache=${Date.now()}`)
  const freeShows = names.map((n) => freeHtml.includes(n))
  ok('5.1 free: first session type (AAA) shown', freeShows[0], `AAA=${freeShows[0]}`)
  ok('5.1 free: BBB hidden', !freeShows[1], `BBB shown=${freeShows[1]}`)
  ok('5.1 free: CCC hidden', !freeShows[2], `CCC shown=${freeShows[2]}`)
  if (freeHtml.startsWith('__STATUS_')) ok('5.1 profile page rendered', false, freeHtml)

  // Flip to elevated, re-fetch: all three should show.
  await sb.from('practitioners').update({ subscription_tier: 'elevated' }).eq('id', P.userId)
  const elevHtml = await getHtml(`/${P.slug}?nocache=${Date.now()}`)
  const elevShows = names.map((n) => elevHtml.includes(n))
  ok('5.1 elevated: all three session types shown',
    elevShows.every(Boolean), `AAA=${elevShows[0]} BBB=${elevShows[1]} CCC=${elevShows[2]}`)

  await teardownFixture(P)

  // ============ 5.2 alchemist featured-first ordering =======================
  // Two published fixtures; alchemist should sort ahead of the free one in the
  // shared /search result set (discoverSearch with no filters -> all published).
  const ALCH = await createFixture('alchemist')
  const FREE = await createFixture('free')
  const searchHtml = await getHtml(`/search?nocache=${Date.now()}`)
  let method = 'HTTP drive (/search render path)'
  if (searchHtml.startsWith('__STATUS_')) {
    ok('5.2 /search rendered', false, searchHtml)
  } else {
    const iAlch = searchHtml.indexOf(ALCH.slug)
    const iFree = searchHtml.indexOf(FREE.slug)
    ok('5.2 both fixtures present in /search', iAlch >= 0 && iFree >= 0, `iAlch=${iAlch} iFree=${iFree}`)
    ok('5.2 alchemist sorts BEFORE free peer', iAlch >= 0 && iFree >= 0 && iAlch < iFree, `iAlch=${iAlch} iFree=${iFree}`)
    // Is the alchemist fixture the very first practitioner card? (only alchemist)
    const firstSlugMatch = searchHtml.match(/\/zzverify-\d+/)
    ok('5.2 alchemist is first among cards (sole alchemist)',
      searchHtml.indexOf(ALCH.slug) === searchHtml.indexOf('/zzverify-') || (firstSlugMatch?.[0] === '/' + ALCH.slug),
      `firstZz=${firstSlugMatch?.[0]} alch=/${ALCH.slug}`)
  }
  console.log(`\n5.2 verification method: ${method}`)

  await teardownFixture(ALCH)
  await teardownFixture(FREE)

  const after = await countZzverify()
  ok('5.x teardown to zero', Object.values(after).every((n) => n === 0), JSON.stringify(after))

  console.log('\n=== TASK 5 RESULTS ===')
  for (const r of results) console.log(r)
  const fails = results.filter((r) => r.startsWith('FAIL'))
  console.log(`\n${fails.length === 0 ? 'ALL PASS' : fails.length + ' FAILURE(S)'}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
