import { notFound } from 'next/navigation'
import SiteHeader from '@/components/site-header'
import PractitionerCard from '@/components/PractitionerCard'
import PageHero from '@/components/pages/PageHero'
import PageBlocks from '@/components/pages/PageBlocks'
import { JsonLd, sagePageJsonLd } from '@/lib/seo/structuredData'
import { getPublishedPage, getSage, getSageRecommendations } from '@/lib/pagesData'

// Sage pages. Published-only (draft/unknown 404s, generic metadata for drafts).
// Below the blocks: the Sage's curated practitioner list from
// sage_recommendations (sort_order), published practitioners only, each with the
// Sage's note.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await getPublishedPage(slug, 'sage')
  if (!result) return { title: 'sessions.guide' }
  const { page } = result
  return {
    title: page.seo_title ?? `${page.title} | sessions.guide`,
    description: page.seo_description ?? undefined,
  }
}

export default async function SagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await getPublishedPage(slug, 'sage')
  if (!result) notFound()
  const { page, blocks } = result

  const [recommendations, sage] = await Promise.all([
    page.sage_id ? getSageRecommendations(page.sage_id) : Promise.resolve([]),
    page.sage_id ? getSage(page.sage_id) : Promise.resolve(null),
  ])

  const seo = sagePageJsonLd({
    title: page.title,
    slug: page.slug,
    description: page.seo_description,
    image: page.hero_image_url,
    sageName: sage?.display_name ?? page.title,
  })

  return (
    <main className="min-h-screen bg-bg">
      <JsonLd data={seo} />
      <SiteHeader />
      <PageHero title={page.title} imageUrl={page.hero_image_url} />
      <div className="mx-auto w-full max-w-[1000px] px-6 py-12">
        <div className="max-w-[900px]">
          <PageBlocks blocks={blocks} />
        </div>

        {recommendations.length > 0 && (
          <section className="mt-14 border-t border-border pt-10">
            {/* PLACEHOLDER COPY */}
            <p className="label mb-6 text-olive">Recommended practitioners</p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map(({ card, note }) => (
                <div key={card.id} className="flex flex-col gap-3">
                  <PractitionerCard practitioner={card} />
                  {note && <p className="caption text-dark">{note}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
