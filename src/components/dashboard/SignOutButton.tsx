'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()

  return (
    <button
      type="button"
      className="caption mt-3 text-left text-cream/80 outline-none hover:text-citron focus-visible:outline focus-visible:outline-2 focus-visible:outline-cream"
      onClick={async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
      }}
    >
      Sign out
    </button>
  )
}
