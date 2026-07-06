// Shared, teardown-safe fixtures for the billing verification pass.
// TEST-MODE ONLY. All data is zzverify-prefixed. Never touches real rows.
//
// Auth approach: to drive the cookie-authed routes (redemption), we sign the
// fixture user in through the REAL @supabase/ssr server client backed by an
// in-memory cookie jar, then replay those (version-exact) cookies in fetch.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

export const env: Record<string, string> = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

export const BASE_URL = 'http://localhost:3000'
export const FIXTURE_PASSWORD = 'zzverify-Passw0rd-!x'

export function admin() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type Fixture = {
  userId: string
  email: string
  slug: string
  stamp: string
}

// Creates a throwaway auth user (with password so we can sign in) + a
// practitioner row whose id == auth user id (CLAUDE.md rule).
export async function createFixture(tier: string = 'free'): Promise<Fixture> {
  const sb = admin()
  // A per-fixture stamp keeps slug/email unique even within one run.
  const stamp = `${Date.now()}${Math.floor(process.hrtime()[1] % 1000)}`
  const email = `zzverify+${stamp}@sessions.guide`

  const { data: created, error: userErr } = await sb.auth.admin.createUser({
    email,
    password: FIXTURE_PASSWORD,
    email_confirm: true,
  })
  if (userErr || !created.user) throw new Error(`createUser failed: ${userErr?.message}`)
  const userId = created.user.id

  const slug = `zzverify-${stamp}`
  const { error: prErr } = await sb.from('practitioners').insert({
    id: userId,
    full_name: 'zzverify Test',
    slug,
    subscription_tier: tier,
    is_published: true,
  })
  if (prErr) {
    await sb.auth.admin.deleteUser(userId)
    throw new Error(`practitioner insert failed: ${prErr.message}`)
  }
  return { userId, email, slug, stamp }
}

// Signs the fixture user in via the real ssr client and returns a Cookie header
// string carrying the exact auth cookies the dev server will read.
export async function authCookieHeader(email: string): Promise<string> {
  const jar = new Map<string, string>()
  const client = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
        setAll: (list: { name: string; value: string }[]) => {
          for (const { name, value } of list) jar.set(name, value)
        },
      },
    }
  )
  const { error } = await client.auth.signInWithPassword({ email, password: FIXTURE_PASSWORD })
  if (error) throw new Error(`signInWithPassword failed: ${error.message}`)
  if (jar.size === 0) throw new Error('no auth cookies were written by ssr client')
  return [...jar.entries()].map(([n, v]) => `${n}=${v}`).join('; ')
}

// Deletes everything a fixture may have created. Safe to call repeatedly.
export async function teardownFixture(f: Fixture): Promise<void> {
  const sb = admin()
  await sb.from('subscriptions').delete().eq('practitioner_id', f.userId)
  // Release any sage_codes this fixture redeemed (do not delete real codes).
  await sb
    .from('sage_codes')
    .update({ redeemed_by: null, redeemed_at: null })
    .eq('redeemed_by', f.userId)
  await sb.from('session_types').delete().eq('practitioner_id', f.userId)
  await sb.from('practitioners').delete().eq('id', f.userId)
  await sb.auth.admin.deleteUser(f.userId)
}

// Counts every zzverify-prefixed row across the tables this pass can touch,
// plus zzverify auth users. Used to assert teardown-to-zero.
export async function countZzverify(): Promise<Record<string, number>> {
  const sb = admin()
  const prac = await sb
    .from('practitioners')
    .select('id', { count: 'exact', head: true })
    .like('slug', 'zzverify%')
  const codes = await sb
    .from('sage_codes')
    .select('id', { count: 'exact', head: true })
    .like('label', 'zzverify%')
  const subs = await sb
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .like('stripe_subscription_id', 'zzverify%')
  // Auth users: list and filter by email prefix.
  const { data: users } = await sb.auth.admin.listUsers({ perPage: 200 })
  const zzUsers = (users?.users ?? []).filter((u) => (u.email ?? '').startsWith('zzverify+')).length
  return {
    practitioners: prac.count ?? -1,
    sage_codes_label: codes.count ?? -1,
    subscriptions_stripeid: subs.count ?? -1,
    auth_users: zzUsers,
  }
}
