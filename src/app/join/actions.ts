'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUniqueSlug } from '@/lib/slug'

export type ActionResult = { ok: boolean; error?: string }

const GENERIC_ERROR = 'Something went wrong. Try again or contact support.'

async function getSessionUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

// Step 1. Creates the auth user, then the practitioners row keyed by the
// auth user id. full_name and slug are NOT NULL in the schema, so the row
// starts with an empty name and the user id as a placeholder slug. Step 2
// replaces both. subscription_tier starts null and is set to 'basic' at
// step 6, which doubles as the onboarding completion marker.
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<ActionResult> {
  if (!email.trim() || !password) {
    return { ok: false, error: 'Enter an email and a password.' }
  }
  if (password.length < 8) {
    return { ok: false, error: 'Use a password with at least 8 characters.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  })

  if (error) {
    return { ok: false, error: error.message }
  }
  if (!data.user || !data.session) {
    return {
      ok: false,
      error:
        'This email needs confirmation before you can continue. Check your inbox, or contact support.',
    }
  }

  const admin = createAdminClient()
  const { error: insertError } = await admin.from('practitioners').upsert(
    {
      id: data.user.id,
      full_name: '',
      slug: data.user.id,
      subscription_tier: null,
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  if (insertError) {
    return { ok: false, error: GENERIC_ERROR }
  }
  return { ok: true }
}

// Step 2
export async function saveNameTagline(
  fullName: string,
  tagline: string
): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }

  const name = fullName.trim()
  if (!name) return { ok: false, error: 'Enter your name.' }

  const admin = createAdminClient()
  const { data: row, error: readError } = await admin
    .from('practitioners')
    .select('slug')
    .eq('id', user.id)
    .maybeSingle()

  if (readError || !row) return { ok: false, error: GENERIC_ERROR }

  // Replace the placeholder slug once. Editing the name later keeps the slug stable.
  const slug =
    row.slug === user.id ? await generateUniqueSlug(name, user.id) : row.slug

  const { error } = await admin
    .from('practitioners')
    .update({
      full_name: name,
      tagline: tagline.trim() || null,
      slug,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return { ok: false, error: GENERIC_ERROR }
  return { ok: true }
}

// Step 3. One primary required, up to two secondary, max three total.
// The DB partial unique index is the backstop for the one-primary rule.
export async function saveModalities(
  primaryId: string,
  secondaryIds: string[]
): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }

  if (!primaryId) {
    return { ok: false, error: 'Choose a primary modality.' }
  }
  const secondaries = [...new Set(secondaryIds)].filter(
    (id) => id && id !== primaryId
  )
  if (secondaries.length > 2) {
    return { ok: false, error: 'Choose up to two secondary modalities.' }
  }

  const allIds = [primaryId, ...secondaries]
  const admin = createAdminClient()

  const { data: approved, error: lookupError } = await admin
    .from('modalities')
    .select('id')
    .in('id', allIds)
    .eq('is_approved', true)

  if (lookupError) return { ok: false, error: GENERIC_ERROR }
  if ((approved ?? []).length !== allIds.length) {
    return { ok: false, error: 'One of those modalities is not available. Choose from the list.' }
  }

  const { error: deleteError } = await admin
    .from('practitioner_modalities')
    .delete()
    .eq('practitioner_id', user.id)

  if (deleteError) return { ok: false, error: GENERIC_ERROR }

  const { error: insertError } = await admin
    .from('practitioner_modalities')
    .insert(
      allIds.map((modalityId) => ({
        practitioner_id: user.id,
        modality_id: modalityId,
        is_primary: modalityId === primaryId,
      }))
    )

  if (insertError) return { ok: false, error: GENERIC_ERROR }
  return { ok: true }
}

// Step 4
export async function saveBio(bio: string): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('practitioners')
    .update({ bio: bio.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { ok: false, error: GENERIC_ERROR }
  return { ok: true }
}

// Step 5. The browser uploads straight to Cloudinary; this only records
// the returned secure_url.
export async function savePhotoUrl(
  field: 'banner_url' | 'photo_url',
  secureUrl: string
): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }

  if (field !== 'banner_url' && field !== 'photo_url') {
    return { ok: false, error: GENERIC_ERROR }
  }
  if (!secureUrl.startsWith('https://res.cloudinary.com/')) {
    return { ok: false, error: 'That upload did not come back from Cloudinary. Try again.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('practitioners')
    .update({ [field]: secureUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { ok: false, error: GENERIC_ERROR }
  return { ok: true }
}

// Step 6. Sets the tier directly. No Stripe Checkout, no subscriptions
// table write during the invite-only phase. See decisions.md.
export async function completeOnboarding(
  link1: string,
  link2: string,
  link3: string
): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('practitioners')
    .update({
      link_1: normalizeUrl(link1),
      link_2: normalizeUrl(link2),
      link_3: normalizeUrl(link3),
      subscription_tier: 'basic',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return { ok: false, error: GENERIC_ERROR }

  redirect('/dashboard')
}
