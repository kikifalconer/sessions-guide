import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadSeekerData } from '@/lib/seekerData'
import { BRAND_NAME } from '@/lib/brand'
import SeekerBookings from '@/components/account/SeekerBookings'
import PageHeader from '@/components/dashboard/PageHeader'

export const metadata = { title: `my bookings | ${BRAND_NAME}` }

export default async function AccountBookingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=${encodeURIComponent('/account/bookings')}`)

  const data = await loadSeekerData(user.id)

  return (
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          title="My Bookings"
          description="Sessions you have booked with guides, upcoming and past."
        />
        <div className="mt-10">
          <SeekerBookings upcoming={data.upcoming} past={data.past} />
        </div>
      </div>
    </main>
  )
}
