// Removes ONLY the Phase 5 verification roster (from scripts/verify-seed-manifest.json).
// Kiki and her part-2 fixtures (blocks, dev session types) are untouched.
// Order: reviews -> bookings -> new practitioners (cascade modalities/blocks/
// session_types) -> auth.users (NOT reached by cascade — deleted explicitly).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env={};for(const l of readFileSync('.env.local','utf8').split('\n')){const m=l.match(/^([A-Za-z0-9_]+)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'')}
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const man=JSON.parse(readFileSync('scripts/verify-seed-manifest.json'))
const r1=await sb.from('reviews').delete().in('id', man.reviews); console.log('reviews deleted:', r1.error?r1.error.message:'OK', '('+man.reviews.length+')')
const r2=await sb.from('bookings').delete().in('id', man.bookings); console.log('bookings deleted:', r2.error?r2.error.message:'OK', '('+man.bookings.length+')')
const r3=await sb.from('practitioners').delete().in('id', man.practitioners); console.log('practitioners deleted (cascade modalities/blocks/session_types):', r3.error?r3.error.message:'OK', '('+man.practitioners.length+')')
let au=0; for(const id of man.authUsers){ const {error}=await sb.auth.admin.deleteUser(id); if(!error) au++; else console.log('  deleteUser '+id+' failed:', error.message) }
console.log('auth.users deleted:', au+'/'+man.authUsers.length)
console.log('Teardown complete. Kiki untouched.')
