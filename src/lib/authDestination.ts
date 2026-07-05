import { createAdminClient } from '@/lib/supabase/admin'

// Post-auth routing (D20 / Amendment 1), shared by the OAuth callback, the
// magic-link confirm route, the /login page, and the site header so all four
// agree: a practitioners row for the user means the practitioner dashboard,
// anything else is a seeker and lands on /account. A practitioner may ALSO
// hold a seekers row; the practitioner surface wins as the richer home.
export async function resolveAuthDestination(
  userId: string
): Promise<'/dashboard' | '/account'> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('practitioners')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  return data ? '/dashboard' : '/account'
}
