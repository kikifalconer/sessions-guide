'use server'

import { OAuth2Client } from 'google-auth-library'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadIntegration } from '@/lib/calendar'

export type CalendarActionResult = { ok: boolean; error?: string }

// Disconnect: revoke the grant at Google (best-effort) and delete the
// integration row + this practitioner's cached busy windows. Auth comes from
// the session — a practitioner can only disconnect their own integration.
export async function disconnectCalendar(): Promise<CalendarActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sign in to continue.' }

  const integration = await loadIntegration(user.id)
  if (integration) {
    try {
      const client = new OAuth2Client()
      await client.revokeToken(integration.refresh_token)
    } catch {
      // Revoke is best-effort; we still drop our copy of the tokens.
    }
  }

  const admin = createAdminClient()
  await admin.from('calendar_integrations').delete().eq('practitioner_id', user.id)
  await admin.from('calendar_busy').delete().eq('practitioner_id', user.id)
  return { ok: true }
}
