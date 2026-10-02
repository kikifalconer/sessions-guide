import SegmentedNav from '@/components/dashboard/SegmentedNav'

export default function BasicCommunityNav({
  current,
}: {
  current: 'favourites' | 'reviews'
}) {
  return (
    <div className="mt-8">
      <p id="community-views" className="sr-only">
        Community views
      </p>
      <SegmentedNav
        labelledBy="community-views"
        items={[
          {
            label: 'Favourite guides',
            href: '/account/community',
            current: current === 'favourites',
          },
          {
            label: 'My reviews',
            href: '/account/community/reviews',
            current: current === 'reviews',
          },
        ]}
      />
    </div>
  )
}
