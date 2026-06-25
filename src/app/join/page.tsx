import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import JoinFlow, { type ModalityOption, type PractitionerPrefill } from './JoinFlow'

export const metadata = {
  title: 'Join sessions.guide',
}

export default async function JoinPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    let { data: practitioner } = await admin
      .from('practitioners')
      .select(
        'id, full_name, slug, tagline, bio, photo_url, banner_url, link_1, link_2, link_3, subscription_tier'
      )
      .eq('id', user.id)
      .maybeSingle()

    if (!practitioner) {
      // Signed-in user without a row (e.g. interrupted OAuth flow). Create the
      // placeholder row here so the rest of the flow has something to update.
      const { data: inserted } = await admin
        .from('practitioners')
        .upsert(
          {
            id: user.id,
            full_name: '',
            slug: user.id,
            subscription_tier: null,
          },
          { onConflict: 'id', ignoreDuplicates: false }
        )
        .select(
          'id, full_name, slug, tagline, bio, photo_url, banner_url, link_1, link_2, link_3, subscription_tier'
        )
        .maybeSingle()
      practitioner = inserted
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
