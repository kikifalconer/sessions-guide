import SegmentedNav from '@/components/dashboard/SegmentedNav'

export default function BookingsNav({
  current,
}: {
  current: 'guide' | 'client' | 'availability'
}) {
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
        ]}
      />
    </div>
  )
}
