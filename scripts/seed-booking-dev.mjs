// Dev seed for Phase 3 booking flow testing. Inserts session types and
// availability blocks for the first published (or only) practitioner.
// Run from the project root: node scripts/seed-booking-dev.mjs
// Idempotent: skips rows whose names/windows already exist.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: practitioner } = await sb
  .from('practitioners')
  .select('id, full_name, slug')
  .limit(1)
  .single()
if (!practitioner) {
  console.log('No practitioner found. Onboard one first.')
  process.exit(1)
}
console.log(`Seeding for ${practitioner.full_name} (${practitioner.slug})`)

const { data: modality } = await sb
  .from('modalities')
  .select('id, name')
  .eq('is_approved', true)
  .limit(1)
  .single()
if (!modality) {
  console.log('No approved modality found. Seed modalities first.')
  process.exit(1)
}

const sessionTypes = [
  {
    practitioner_id: practitioner.id,
    modality_id: modality.id,
    name: 'Dev Fixed Virtual Session',
    description: 'Seeded for booking flow testing. Fixed price, virtual.',
    duration_minutes: 60,
    format: 'virtual',
    pricing_model: 'fixed',
    price: 120,
    is_active: true,
    sort_order: 90,
  },
  {
    practitioner_id: practitioner.id,
    modality_id: modality.id,
    name: 'Dev Sliding Scale In Person',
    description: 'Seeded for booking flow testing. Sliding scale, in person or virtual.',
    duration_minutes: 90,
    format: 'both',
    pricing_model: 'sliding_scale',
    price_min: 80,
    price_max: 200,
    is_active: true,
    sort_order: 91,
  },
  {
    practitioner_id: practitioner.id,
    modality_id: modality.id,
    name: 'Dev Inquire Session',
    description: 'Seeded for booking flow testing. Inquire pricing, should show INQUIRE.',
    duration_minutes: 120,
    format: 'in_person',
    pricing_model: 'inquire',
    is_active: true,
    sort_order: 92,
  },
]

for (const st of sessionTypes) {
  const { data: existing } = await sb
    .from('session_types')
    .select('id')
    .eq('practitioner_id', practitioner.id)
    .eq('name', st.name)
    .maybeSingle()
  if (existing) {
    console.log(`session type exists: ${st.name}`)
    continue
  }
  const { error } = await sb.from('session_types').insert(st)
  console.log(error ? `FAILED ${st.name}: ${error.message}` : `created session type: ${st.name}`)
}

const today = new Date()
const plus = (days) => {
  const d = new Date(today)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const blocks = [
  {
    practitioner_id: practitioner.id,
    format: 'virtual',
    recurrence_rule: 'WEEKLY:MON,WED',
    start_time: '09:00:00',
    end_time: '13:00:00',
    timezone: 'America/Los_Angeles',
    is_active: true,
  },
  {
    practitioner_id: practitioner.id,
    format: 'both',
    location_place_id: 'dev-seed-topanga',
    location_display: 'Topanga, CA, USA',
    location_lat: 34.0937,
    location_lng: -118.6012,
    recurrence_rule: 'WEEKLY:FRI',
    start_time: '10:00:00',
    end_time: '16:00:00',
    timezone: 'America/Los_Angeles',
    is_active: true,
  },
  {
    practitioner_id: practitioner.id,
    format: 'in_person',
    location_place_id: 'dev-seed-ubud',
    location_display: 'Ubud, Gianyar Regency, Bali, Indonesia',
    location_lat: -8.5069,
    location_lng: 115.2625,
    start_date: plus(14),
    end_date: plus(21),
    start_time: '08:00:00',
    end_time: '12:00:00',
    timezone: 'Asia/Makassar',
    is_active: true,
  },
]

for (const block of blocks) {
  const { data: existing } = await sb
    .from('availability_blocks')
    .select('id')
    .eq('practitioner_id', practitioner.id)
    .eq('format', block.format)
    .eq('start_time', block.start_time)
    .maybeSingle()
  if (existing) {
    console.log(`block exists: ${block.format} ${block.start_time}`)
    continue
  }
  const { error } = await sb.from('availability_blocks').insert(block)
  console.log(
    error
      ? `FAILED block ${block.format}: ${error.message}`
      : `created block: ${block.format} ${block.recurrence_rule ?? 'date-bounded'}`
  )
}

console.log('Seed complete.')
