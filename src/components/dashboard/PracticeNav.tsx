import SegmentedNav from '@/components/dashboard/SegmentedNav'

export default function PracticeNav({
  current,
}: {
  current: 'sessions' | 'photos' | 'profile'
}) {
  return (
    <div className="mt-8">
      <p id="practice-views" className="sr-only">
        Practice views
      </p>
      <SegmentedNav
        labelledBy="practice-views"
        items={[
          {
            label: 'Sessions',
            href: '/dashboard/offerings',
            current: current === 'sessions',
          },
          {
            label: 'Photos',
            href: '/dashboard/offerings/photos',
            current: current === 'photos',
          },
          {
            label: 'Profile',
            href: '/dashboard/offerings/profile',
            current: current === 'profile',
          },
        ]}
      />
    </div>
  )
}
