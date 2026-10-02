import SegmentedNav from '@/components/dashboard/SegmentedNav'

export default function AccountNav({
  current,
}: {
  current: 'info' | 'abundance' | 'membership'
}) {
  return (
    <div className="mt-8">
      <p id="account-views" className="sr-only">
        Account views
      </p>
      <SegmentedNav
        labelledBy="account-views"
        items={[
          {
            label: 'Basic info',
            href: '/dashboard/account',
            current: current === 'info',
          },
          {
            label: 'Abundance',
            href: '/dashboard/abundance',
            current: current === 'abundance',
          },
          {
            label: 'Membership',
            href: '/dashboard/account/membership',
            current: current === 'membership',
          },
        ]}
      />
    </div>
  )
}
