import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { INVITE_COOKIE, isValidInviteCode } from '@/lib/invite'
import JoinFlow, { type ModalityOption, type PractitionerPrefill } from './JoinFlow'

export const metadata = {
  title: 'Join sessions.guide',
}

export default async function JoinPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Invite gate (H4): a visitor who is not already signed in must hold a valid
  // invite cookie (set by /api/verify-invite). This keeps the whole signup entry
  // — email form AND the Google button — behind the invite during the
  // invite-only phase. Signed-in users are already onboarding, so they pass.
  if (!user) {
    const cookieStore = await cookies()
    if (!isValidInviteCode(cookieStore.get(INVITE_COOKIE)?.value)) {
      redirect('/')
    }
  }

  const admin = createAdminClient()

  const { data: modalityRows } = await admin
    .from('modalities')
    .select('id, name, slug, categories(name)')
    .eq('is_approved', true)
    .order('name')

  const modalities: ModalityOption[] = (modalityRows ?? []).map((m) => {
    const category = m.categories as { name: string } | { name: string }[] | null
    return {
      id: m.id as string,
      name: m.name as string,
      slug: m.slug as string,
      category: Array.isArray(category) ? category[0]?.name ?? '' : category?.name ?? '',
    }
  })

  let initialStep = 1
  let prefill: PractitionerPrefill = null
  let initialPrimaryId: string | null = null
  let initialSecondaryIds: string[] = []

  if (user) {
    const PROFILE_COLS =
      'id, full_name, slug, tagline, bio, photo_url, banner_url, link_1, link_2, link_3, subscription_tier'

    const { data: existing, error: readError } = await admin
      .from('practitioners')
      .select(PROFILE_COLS)
      .eq('id', user.id)
      .maybeSingle()

    // A transient read error must NOT be treated as "no row": doing so would
    // overwrite a live, completed profile with placeholder values (H3). Fail
    // loudly instead of fabricating state.
    if (readError) {
      throw new Error('Could not load your profile. Please try again.')
    }

    let practitioner = existing
    if (!practitioner) {
      // Signed-in user without a row (e.g. interrupted OAuth flow). Create the
      // placeholder row. ignoreDuplicates:true = INSERT ... ON CONFLICT DO
      // NOTHING, so a concurrent request can never clobber an existing row
      // (matches the sibling call sites in join/actions.ts and auth/callback).
      await admin
        .from('practitioners')
        .upsert(
          {
            id: user.id,
            full_name: '',
            slug: user.id,
            subscription_tier: null,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        )
      const { data: created } = await admin
        .from('practitioners')
        .select(PROFILE_COLS)
        .eq('id', user.id)
        .maybeSingle()
      practitioner = created
    }

    if (practitioner?.subscription_tier) {
      redirect('/dashboard')
    }

    const { data: pmRows } = await admin
      .from('practitioner_modalities')
      .select('modality_id, is_primary')
      .eq('practitioner_id', user.id)

    initialPrimaryId =
      pmRows?.find((r) => r.is_primary)?.modality_id ?? null
    initialSecondaryIds =
      pmRows?.filter((r) => !r.is_primary).map((r) => r.modality_id) ?? []

    if (practitioner) {
      prefill = {
        fullName: practitioner.full_name ?? '',
        tagline: practitioner.tagline ?? '',
        bio: practitioner.bio ?? '',
        photoUrl: practitioner.photo_url ?? null,
        bannerUrl: practitioner.banner_url ?? null,
        link1: practitioner.link_1 ?? '',
        link2: practitioner.link_2 ?? '',
        link3: practitioner.link_3 ?? '',
      }
    }

    if (!practitioner || practitioner.full_name === '') {
      initialStep = 2
    } else if (!pmRows || pmRows.length === 0) {
      initialStep = 3
    } else {
      initialStep = 4
    }
  }

  return (
    <JoinFlow
      initialStep={initialStep}
      isSignedIn={Boolean(user)}
      modalities={modalities}
      prefill={prefill}
      initialPrimaryId={initialPrimaryId}
      initialSecondaryIds={initialSecondaryIds}
    />
  )
}
