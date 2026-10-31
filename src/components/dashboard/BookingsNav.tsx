import SegmentedNav from '@/components/dashboard/SegmentedNav'
import { countUnreadInquiries } from '@/lib/inquiries'
import { createClient } from '@/lib/supabase/server'

export default async function BookingsNav({
  current,
}: {
  current: 'guide' | 'client' | 'availability' | 'messages'
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const unreadCount = user ? await countUnreadInquiries(user.id) : 0

  return (
    <div className="mt-8">
      <p id="booking-views" className="sr-only">
        Booking views
      </p>
      <SegmentedNav
        labelledBy="booking-views"
        items={[
          {
            label: 'As a guide',
            href: '/dashboard/bookings?role=guide',
            current: current === 'guide',
          },
          {
            label: 'As a client',
            href: '/dashboard/bookings?role=client',
            current: current === 'client',
          },
          {
            label: 'Availability',
            href: '/dashboard/availability',
            current: current === 'availability',
          },
          {
            label: 'Messages',
            href: '/dashboard/bookings/messages',
            current: current === 'messages',
            badge: unreadCount,
          },
        ]}
      />
    </div>
  )
}
