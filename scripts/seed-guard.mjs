// Shared safety guard for the destructive seed / teardown scripts (M8).
//
// These scripts write and delete rows with the SERVICE-ROLE key against whatever
// NEXT_PUBLIC_SUPABASE_URL is in .env.local — which, in this repo, points at the
// live project. Running them by accident corrupts production data. This guard
// makes the target explicit and refuses to run without confirmation.
//
//   - If PROD_SUPABASE_URL is set and matches the target, refuse outright.
//   - Otherwise require ALLOW_SEED=1 to confirm the target is non-production.
export function assertSeedAllowed(supabaseUrl) {
  const host = (() => {
    try {
      return new URL(supabaseUrl).host
    } catch {
      return String(supabaseUrl)
    }
  })()

  const prodHost = (() => {
    try {
      return new URL(process.env.PROD_SUPABASE_URL || '').host
    } catch {
      return ''
    }
  })()

  if (prodHost && host === prodHost) {
    console.error(
      `REFUSING: "${host}" matches PROD_SUPABASE_URL — seed/teardown scripts must never run against production.`
    )
    process.exit(1)
  }

  if (process.env.ALLOW_SEED !== '1') {
    console.error(`REFUSING: about to write/delete data on Supabase host "${host}".`)
    console.error(
      'If this is a NON-production database, re-run with ALLOW_SEED=1 to confirm.'
    )
    process.exit(1)
  }

  console.log(`Seed guard OK — target host: ${host}`)
}
