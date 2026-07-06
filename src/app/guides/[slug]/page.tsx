import { notFound } from 'next/navigation'
import SiteHeader from '@/components/site-header'
import PageHero from '@/components/pages/PageHero'
import PageBlocks from '@/components/pages/PageBlocks'
import { JsonLd, articleJsonLd } from '@/lib/seo/structuredData'
import { getPublishedPage } from '@/lib/pagesData'

// Editorial guides. Published-only: a draft or unknown slug 404s, and metadata
// stays generic so a draft title never leaks (mirrors the practitioner H2 rule).
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await getPublishedPage(slug, 'editorial')
  if (!result) return { title: 'sessions.guide' }
  const { page } = result
  return {
    title: page.seo_title ?? `${page.title} | sessions.guide`,
    description: page.seo_description ?? undefined,
  }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await getPublishedPage(slug, 'editorial')
  if (!result) notFound()
  const { page, blocks } = result

  const seo = articleJsonLd({
    title: page.title,
    slug: page.slug,
    description: page.seo_description,
    image: page.hero_image_url,
  })

  return (
    <main className="min-h-screen bg-bg">
      <JsonLd data={seo} />
      <SiteHeader />
      <PageHero title={page.title} imageUrl={page.hero_image_url} />
      <div className="mx-auto w-full max-w-[900px] px-6 py-12">
        <PageBlocks blocks={blocks} />
      </div>
    </main>
  )
}
