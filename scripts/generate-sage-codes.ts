// Sage code generator (D25). Creates single-redemption codes of the form
// SAGE-XXXX-XXXX (crypto-random, unambiguous charset — no 0/O/1/I) and inserts
// them via the service-role client. Prints each code so it can be handed out.
//
// Run from the project root:
//   node scripts/generate-sage-codes.ts --count 10 --label "Autumn 2026 Sages"
//
// (Node strips the TS types natively; matches the plain-node runner used by the
// existing .mjs scripts. No dotenv/tsx dependency.)

import { readFileSync } from 'node:fs'
import { randomInt } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// --- env (hand-parsed, mirrors scripts/seed-booking-dev.mjs) ----------------
const env: Record<string, string> = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase env missing from .env.local')
  process.exit(1)
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// --- args -------------------------------------------------------------------
function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const count = Number.parseInt(argValue('--count') ?? '', 10)
const label = argValue('--label') ?? null
if (!Number.isInteger(count) || count < 1) {
  console.error('Usage: node scripts/generate-sage-codes.ts --count N [--label "text"]')
  process.exit(1)
}

// Unambiguous charset: no 0, O, 1, I.
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function group(): string {
  let s = ''
  for (let i = 0; i < 4; i++) s += CHARSET[randomInt(CHARSET.length)]
  return s
}
function makeCode(): string {
  return `SAGE-${group()}-${group()}`
}

async function main(): Promise<void> {
  const created: string[] = []
  for (let i = 0; i < count; i++) {
    let inserted = false
    let attempts = 0
    while (!inserted && attempts < 10) {
      attempts++
      const code = makeCode()
      const { error } = await sb.from('sage_codes').insert({ code, label })
      if (!error) {
        created.push(code)
        inserted = true
      } else if (error.code === '23505') {
        // Unique collision (astronomically rare) — regenerate and retry.
        continue
      } else {
        console.error('Insert failed:', error.message)
        process.exit(1)
      }
    }
    if (!inserted) {
      console.error('Could not generate a unique code after 10 attempts; aborting.')
      process.exit(1)
    }
  }

  console.log(`Created ${created.length} sage code(s)${label ? ` (label: ${label})` : ''}:\n`)
  for (const code of created) console.log(code)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
