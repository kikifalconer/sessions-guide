import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Interim admin gate (D-entry / TD: formalize a real admin role before a second
// admin exists). A single admin identified by ADMIN_USER_ID. FAIL-CLOSED: an
// unset or empty ADMIN_USER_ID denies everyone, so a missing env var can never
// accidentally grant access. Regular server client only reads user.id.

function adminId(): string | null {
  const id = process.env.ADMIN_USER_ID
  return id && id.trim() ? id : null
}

// For server components / route entry: redirect non-admins away.
export async function requireAdmin(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const id = adminId()
  if (!id || user.id !== id) redirect('/dashboard')
  return user.id
}

// For server actions: returns the admin id, or null if the caller is not the
// admin (caller returns an unauthorized result rather than redirecting).
export async function getAdminUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const id = adminId()
  if (!id || user.id !== id) return null
  return user.id
}
