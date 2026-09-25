import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadSeekerData } from '@/lib/seekerData'
import { BRAND_NAME } from '@/lib/brand'
import SeekerReviews from '@/components/account/SeekerReviews'
import PageHeader from '@/components/dashboard/PageHeader'
import BasicCommunityNav from '../../BasicCommunityNav'

export const metadata = { title: `my reviews | ${BRAND_NAME}` }

export default async function AccountCommunityReviewsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=${encodeURIComponent('/account/community/reviews')}`)

  const data = await loadSeekerData(user.id)

  return (
    <main className="px-6 py-12 sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          title="Community"
          description="Share how your completed sessions went, and see the reviews you have written."
        />
        <BasicCommunityNav current="reviews" />
        <div className="mt-10">
          <SeekerReviews prompts={data.prompts} reviews={data.reviews} />
        </div>
      </div>
    </main>
  )
}
