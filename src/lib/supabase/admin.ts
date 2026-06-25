import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service role client. Server-side only. Bypasses RLS.
// Use the regular server client solely to read the auth session,
// then pass the user id into queries made with this client.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
