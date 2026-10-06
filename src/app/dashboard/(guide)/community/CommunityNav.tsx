import SegmentedNav from '@/components/dashboard/SegmentedNav'

export default function CommunityNav({
  current,
}: {
  current: 'clients' | 'favourites' | 'reviews'
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
            label: 'Clients',
            href: '/dashboard/community',
            current: current === 'clients',
          },
          {
            label: 'Favourite guides',
            href: '/dashboard/community/favourites',
            current: current === 'favourites',
          },
          {
            label: 'Reviews',
            href: '/dashboard/community/reviews',
            current: current === 'reviews',
          },
        ]}
      />
    </div>
  )
}
