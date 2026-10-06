import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type DashboardPractitioner = {
  id: string
  full_name: string
  slug: string
  subscription_tier: string
  is_published: boolean
  payment_method: string | null
  cancellation_policy: string | null
  confirmation_mode: string | null
}

// Shared auth guard for every /dashboard/* route (D28): requires a
// signed-in user with a practitioners row, redirects to /join otherwise.
// Previously this was inlined once in the single dashboard/page.tsx; now
// that the tab-shell has split into six real routes, each route needs the
// same guard, so it lives here instead of being copied six times.
export async function requirePractitioner(): Promise<DashboardPractitioner> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/join')

  const admin = createAdminClient()
  const { data: practitioner } = await admin
    .from('practitioners')
    .select(
      'id, full_name, slug, subscription_tier, is_published, payment_method, cancellation_policy, confirmation_mode'
    )
    .eq('id', user.id)
    .maybeSingle()

  if (!practitioner) redirect('/join')

  return practitioner as DashboardPractitioner
}
