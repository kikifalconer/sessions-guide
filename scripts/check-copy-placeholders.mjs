// Fails the build when unwritten copy is still in the tree.
//
// Runs as npm's `prebuild`, so it fires on every `npm run build`, which is the
// command Vercel uses for this project.
//
// Two markers are looked for across src/:
//   COPY NEEDED   the standing marker for a string that has not been written
//   DUMMY_        scaffolding constants standing in for real copy
//
// Override: ALLOW_COPY_PLACEHOLDERS=1 downgrades this to a warning so local
// verification builds can run while copy is outstanding. The override is
// IGNORED when VERCEL_ENV=production, which every Vercel production build
// sets, so there is no way to ship a placeholder by setting an env var.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../src', import.meta.url).pathname
const PATTERNS = [
  { label: 'COPY NEEDED', re: /COPY NEEDED/ },
  { label: 'dummy copy constant', re: /\bDUMMY_[A-Z0-9_]+\b/ },
]
const EXT = /\.(tsx?|css)$/

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (EXT.test(entry)) out.push(full)
  }
  return out
}

const hits = []
for (const file of walk(ROOT)) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    for (const { label, re } of PATTERNS) {
      if (re.test(line)) {
        hits.push({
          file: file.replace(`${ROOT}/`, 'src/'),
          line: i + 1,
          label,
          text: line.trim().slice(0, 100),
        })
      }
    }
  })
}

if (hits.length === 0) {
  console.log('[copy-check] no placeholders found.')
  process.exit(0)
}

const isVercelProduction = process.env.VERCEL_ENV === 'production'
const overridden = process.env.ALLOW_COPY_PLACEHOLDERS === '1' && !isVercelProduction

console.error('')
console.error('  UNWRITTEN COPY IN THE TREE')
console.error('')
for (const h of hits) {
  console.error(`  ${h.file}:${h.line}  [${h.label}]`)
  console.error(`      ${h.text}`)
}
console.error('')

if (overridden) {
  console.error('  ALLOW_COPY_PLACEHOLDERS=1 set: continuing as a WARNING.')
  console.error('  This override is ignored when VERCEL_ENV=production.')
  console.error('')
  process.exit(0)
}

if (isVercelProduction) {
  console.error('  VERCEL_ENV=production. This build cannot proceed and the')
  console.error('  override does not apply here. Write the copy first.')
} else {
  console.error('  Write the copy, or set ALLOW_COPY_PLACEHOLDERS=1 for a local')
  console.error('  verification build. That override will not work in production.')
}
console.error('')
process.exit(1)
