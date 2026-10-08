// Local-dev demo seed: creates a small, realistic marketplace so the app can be
// exercised end to end (discovery, profile, booking) against a LOCAL Supabase.
//
// Creates confirmed auth users + published practitioners, assigns approved
// modalities, and adds session types + availability blocks. Idempotent: reruns
// skip rows that already exist (keyed by practitioner slug).
//
// Run from the project root:  ALLOW_SEED=1 node scripts/seed-demo.mjs
// Guarded by assertSeedAllowed so it refuses to touch a production database.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { assertSeedAllowed } from './seed-guard.mjs'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
assertSeedAllowed(env.NEXT_PUBLIC_SUPABASE_URL)

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const DEMO_PASSWORD = 'demo-Passw0rd-!x'

// Pick approved modalities by slug so the demo has stable, category-linked labels.
async function modalityBySlug(slug) {
  const { data } = await sb
    .from('modalities')
    .select('id, name, slug')
    .eq('slug', slug)
    .eq('is_approved', true)
    .maybeSingle()
  return data
}

// Fallback: first N approved modalities if a preferred slug is not present.
async function fallbackModalities(n) {
  const { data } = await sb
    .from('modalities')
    .select('id, name, slug')
    .eq('is_approved', true)
    .order('name')
    .limit(n)
  return data ?? []
}

function plusDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const demoPractitioners = [
  {
    email: 'demo.maya@sessions.guide',
    full_name: 'Maya Rivers',
    slug: 'maya-rivers',
    tagline: 'Somatic breathwork for nervous-system regulation',
    bio: 'Maya guides embodied breathwork journeys that help you meet stored tension with steadiness. Sessions blend slow, paced breathing with gentle somatic tracking.',
    subscription_tier: 'alchemist',
    preferredModalitySlugs: ['breathwork', 'somatic-experiencing'],
    sessionTypes: [
      {
        name: 'Breathwork Journey (Virtual)',
        description: 'A 60-minute guided breathwork session held over video.',
        duration_minutes: 60,
        format: 'virtual',
        pricing_model: 'fixed',
        price: 120,
        is_active: true,
        sort_order: 1,
      },
      {
        name: 'Extended Somatic Session',
        description: 'A 90-minute in-person or virtual somatic deep dive, sliding scale.',
        duration_minutes: 90,
        format: 'both',
        pricing_model: 'sliding_scale',
        price_min: 90,
        price_max: 180,
        is_active: true,
        sort_order: 2,
      },
    ],
    blocks: [
      {
        format: 'virtual',
        recurrence_rule: 'WEEKLY:MON,WED',
        start_time: '09:00:00',
        end_time: '13:00:00',
        timezone: 'America/Los_Angeles',
        is_active: true,
      },
      {
        format: 'both',
        location_place_id: 'demo-seed-topanga',
        location_display: 'Topanga, CA, USA',
        location_lat: 34.0937,
        location_lng: -118.6012,
        recurrence_rule: 'WEEKLY:FRI',
        start_time: '10:00:00',
        end_time: '16:00:00',
        timezone: 'America/Los_Angeles',
        is_active: true,
      },
    ],
  },
  {
    email: 'demo.eli@sessions.guide',
    full_name: 'Eli Fontaine',
    slug: 'eli-fontaine',
    tagline: 'Meditation and mindfulness for busy minds',
    bio: 'Eli teaches practical mindfulness for people who think they cannot meditate. Expect grounded, secular guidance and plenty of room to be exactly where you are.',
    subscription_tier: 'free',
    preferredModalitySlugs: ['meditation', 'mindfulness'],
    sessionTypes: [
      {
        name: 'Intro to Meditation',
        description: 'A 45-minute virtual foundations session.',
        duration_minutes: 45,
        format: 'virtual',
        pricing_model: 'fixed',
        price: 75,
        is_active: true,
        sort_order: 1,
      },
    ],
    blocks: [
      {
        format: 'virtual',
        recurrence_rule: 'WEEKLY:TUE,THU',
        start_time: '08:00:00',
        end_time: '12:00:00',
        timezone: 'America/New_York',
        is_active: true,
      },
      {
        format: 'in_person',
        location_place_id: 'demo-seed-ubud',
        location_display: 'Ubud, Gianyar Regency, Bali, Indonesia',
        location_lat: -8.5069,
        location_lng: 115.2625,
        start_date: plusDays(14),
        end_date: plusDays(21),
        start_time: '08:00:00',
        end_time: '12:00:00',
        timezone: 'Asia/Makassar',
        is_active: true,
      },
    ],
  },
]

async function ensureUser(email) {
  // Look for an existing confirmed user with this email.
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 200 })
  const existing = (list?.users ?? []).find((u) => (u.email ?? '') === email)
  if (existing) return existing.id
  const { data: created, error } = await sb.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  })
  if (error || !created.user) throw new Error(`createUser failed for ${email}: ${error?.message}`)
  return created.user.id
}

async function resolveModalities(preferredSlugs) {
  const resolved = []
  for (const slug of preferredSlugs) {
    const m = await modalityBySlug(slug)
    if (m) resolved.push(m)
  }
  if (resolved.length === 0) {
    return fallbackModalities(2)
  }
  return resolved
}

for (const p of demoPractitioners) {
  console.log(`\n=== ${p.full_name} (${p.slug}) ===`)
  const userId = await ensureUser(p.email)

  const { data: existingPr } = await sb
    .from('practitioners')
    .select('id')
    .eq('slug', p.slug)
    .maybeSingle()

  if (!existingPr) {
    const { error } = await sb.from('practitioners').insert({
      id: userId,
      full_name: p.full_name,
      slug: p.slug,
      tagline: p.tagline,
      bio: p.bio,
      subscription_tier: p.subscription_tier,
      is_published: true,
    })
    if (error) {
      console.log(`FAILED practitioner insert: ${error.message}`)
      continue
    }
    console.log('created practitioner')
  } else {
    console.log('practitioner exists')
  }

  const mods = await resolveModalities(p.preferredModalitySlugs)
  for (let i = 0; i < mods.length && i < 3; i++) {
    const modality = mods[i]
    const { error } = await sb
      .from('practitioner_modalities')
      .upsert(
        { practitioner_id: userId, modality_id: modality.id, is_primary: i === 0 },
        { onConflict: 'practitioner_id,modality_id' }
      )
    console.log(
      error
        ? `  modality FAILED ${modality.slug}: ${error.message}`
        : `  modality ${i === 0 ? '(primary) ' : ''}${modality.name}`
    )
  }

  const primaryModality = mods[0]
  for (const st of p.sessionTypes) {
    const { data: existing } = await sb
      .from('session_types')
      .select('id')
      .eq('practitioner_id', userId)
      .eq('name', st.name)
      .maybeSingle()
    if (existing) {
      console.log(`  session type exists: ${st.name}`)
      continue
    }
    const { error } = await sb
      .from('session_types')
      .insert({ practitioner_id: userId, modality_id: primaryModality?.id ?? null, ...st })
    console.log(error ? `  session type FAILED ${st.name}: ${error.message}` : `  session type: ${st.name}`)
  }

  for (const block of p.blocks) {
    const { data: existing } = await sb
      .from('availability_blocks')
      .select('id')
      .eq('practitioner_id', userId)
      .eq('format', block.format)
      .eq('start_time', block.start_time)
      .maybeSingle()
    if (existing) {
      console.log(`  block exists: ${block.format} ${block.start_time}`)
      continue
    }
    const { error } = await sb
      .from('availability_blocks')
      .insert({ practitioner_id: userId, ...block })
    console.log(
      error
        ? `  block FAILED ${block.format}: ${error.message}`
        : `  block: ${block.format} ${block.recurrence_rule ?? 'date-bounded'}`
    )
  }
}

console.log('\nDemo seed complete.')
