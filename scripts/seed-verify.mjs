// Phase 5 verification seed — additive, non-destructive. Creates 5 new
// practitioners (B-F) + reviews, writes an incremental manifest (incl. auth.users
// ids) for teardown. Reuses Kiki (kiki-falconer-2) additively.
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env={};for(const l of readFileSync('.env.local','utf8').split('\n')){const m=l.match(/^([A-Za-z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'')}
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const MANIFEST='scripts/verify-seed-manifest.json'
const man={ authUsers:[], practitioners:[], sessionTypes:[], bookings:[], reviews:[] }
const save=()=>writeFileSync(MANIFEST, JSON.stringify(man,null,2))

const modIds={}
for(const slug of ['business-coaching','reiki','meditation','psychedelic-facilitation']){
  const {data}=await sb.from('modalities').select('id').eq('slug',slug).single(); modIds[slug]=data.id
}
const {data:kiki}=await sb.from('practitioners').select('id').eq('slug','kiki-falconer-2').single()
const {data:kst}=await sb.from('session_types').select('id').eq('practitioner_id',kiki.id).limit(1).single()
const {data:kvb}=await sb.from('availability_blocks').select('id').eq('practitioner_id',kiki.id).eq('format','virtual').single()

async function newPractitioner(email, fullName, slug, modalitySlug, published, block){
  const {data:u,error:ue}=await sb.auth.admin.createUser({ email, email_confirm:true })
  if(ue) throw new Error('createUser '+email+': '+ue.message)
  const id=u.user.id; man.authUsers.push(id); man.practitioners.push(id); save()
  const {error:pe}=await sb.from('practitioners').insert({ id, full_name:fullName, slug, subscription_tier:'basic', is_published:published })
  if(pe) throw new Error('practitioner '+slug+': '+pe.message)
  await sb.from('practitioner_modalities').insert({ practitioner_id:id, modality_id:modIds[modalitySlug], is_primary:true })
  if(block) await sb.from('availability_blocks').insert({ practitioner_id:id, is_active:true, start_time:'09:00:00', end_time:'13:00:00', timezone:'America/Los_Angeles', recurrence_rule:'WEEKLY:MON', ...block })
  console.log('  +',fullName,'('+slug+')','published='+published,'->',id)
  return id
}

console.log('Seeding new practitioners B-F...')
const bea=await newPractitioner('vseed-b@example.com','Bea Stone','verify-bea-stone','reiki',true,
  { format:'in_person', location_place_id:'vseed-santa-monica', location_display:'Santa Monica, CA, USA', location_lat:34.0195, location_lng:-118.4912 })
await newPractitioner('vseed-c@example.com','Cal Ng','verify-cal-ng','reiki',true,
  { format:'in_person', location_place_id:'vseed-san-diego', location_display:'San Diego, CA, USA', location_lat:32.7157, location_lng:-117.1611 })
await newPractitioner('vseed-d@example.com','Dia Vance','verify-dia-vance','meditation',true,
  { format:'virtual', location_display:null })
await newPractitioner('vseed-e@example.com','Eli Moss','verify-eli-moss','psychedelic-facilitation',true,
  { format:'in_person', location_place_id:'vseed-topanga-e', location_display:'Topanga, CA, USA', location_lat:34.0937, location_lng:-118.6012 })
await newPractitioner('vseed-f@example.com','Fay Unp','verify-fay-unp','business-coaching',false,
  { format:'in_person', location_place_id:'vseed-topanga-f', location_display:'Topanga, CA, USA', location_lat:34.0937, location_lng:-118.6012 })

// Bea session type (clean: her own booking uses her own session type)
const {data:bst}=await sb.from('session_types').insert({ practitioner_id:bea, modality_id:modIds['reiki'], name:'Reiki Session', duration_minutes:60, format:'in_person', pricing_model:'fixed', price:100, is_active:true }).select('id').single()
man.sessionTypes.push(bst.id); save()
const {data:bb}=await sb.from('availability_blocks').select('id').eq('practitioner_id',bea).single()

const day=(n)=>new Date(Date.now()-n*864e5).toISOString()
async function seedReview({practitionerId, blockId, sessionTypeId, bookedFormat, rating, published, featured, body, createdDaysAgo, startDaysAgo}){
  const start=day(startDaysAgo), end=new Date(Date.parse(start)+36e5).toISOString()
  const {data:b,error:be}=await sb.from('bookings').insert({ practitioner_id:practitionerId, availability_block_id:blockId, session_type_id:sessionTypeId, guest_name:'Verify Seeker', guest_email:'vseed-review@example.com', booked_format:bookedFormat, start_datetime:start, end_datetime:end, status:'completed', confirmation_mode:'instant', payment_status:'offsite' }).select('id').single()
  if(be) throw new Error('booking: '+be.message)
  man.bookings.push(b.id); save()
  const {data:r,error:re}=await sb.from('reviews').insert({ booking_id:b.id, practitioner_id:practitionerId, reviewer_name:'Verify Reviewer', rating, body, is_published:published, is_featured:featured, created_at:day(createdDaysAgo) }).select('id').single()
  if(re) throw new Error('review: '+re.message)
  man.reviews.push(r.id); save()
  console.log('  + review p='+practitionerId.slice(0,8),'rating='+rating,'pub='+published,'feat='+featured)
}

console.log('Seeding reviews...')
// Kiki: A (pub, FEATURED, 5, older), B (pub, not featured, 4, newer), C (UNPUBLISHED, 1)
await seedReview({practitionerId:kiki.id, blockId:kvb.id, sessionTypeId:kst.id, bookedFormat:'virtual', rating:5, published:true,  featured:true,  body:'Featured: a grounding, generous session. The kind you rebook.', createdDaysAgo:9, startDaysAgo:11})
await seedReview({practitionerId:kiki.id, blockId:kvb.id, sessionTypeId:kst.id, bookedFormat:'virtual', rating:4, published:true,  featured:false, body:'Newer review: thoughtful and steady, well worth it.',           createdDaysAgo:2, startDaysAgo:9})
await seedReview({practitionerId:kiki.id, blockId:kvb.id, sessionTypeId:kst.id, bookedFormat:'virtual', rating:1, published:false, featured:false, body:'UNPUBLISHED: must never appear or affect the average.',          createdDaysAgo:1, startDaysAgo:7})
// Bea: one published 3-star (distinct from Kiki's 4.5 — a bleed would be obvious)
await seedReview({practitionerId:bea, blockId:bb.id, sessionTypeId:bst.id, bookedFormat:'in_person', rating:3, published:true, featured:false, body:'Solid reiki session, calm and professional.', createdDaysAgo:3, startDaysAgo:5})

save()
console.log('\nSeed complete. Manifest:', MANIFEST)
console.log('authUsers:', man.authUsers.length, '| practitioners:', man.practitioners.length, '| sessionTypes:', man.sessionTypes.length, '| bookings:', man.bookings.length, '| reviews:', man.reviews.length)
