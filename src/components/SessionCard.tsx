import Image from 'next/image'
import Link from 'next/link'
import { cardCrop, faceCrop } from '@/lib/cloudinary'
import type { DiscoverySession } from '@/lib/discovery'

function priceLabel(session: DiscoverySession): string {
  if (session.pricingModel === 'donation') return 'Donation'
  if (session.pricingModel === 'inquire') return 'Inquire'
  if (session.pricingModel === 'fixed' && session.price != null) return `$${session.price}`
  if (
    session.pricingModel === 'sliding_scale' &&
    session.priceMin != null &&
    session.priceMax != null
  ) {
    return `$${session.priceMin} – $${session.priceMax}`
  }
  return ''
}

function formatLabel(format: string): string {
  if (format === 'virtual') return 'Virtual'
  if (format === 'in_person') return 'In person'
  if (format === 'both') return 'Virtual or in person'
  return format
}

export default function SessionCard({ session }: { session: DiscoverySession }) {
  const imageUrl = session.photoUrl ?? session.guidePhotoUrl
  const cropped = imageUrl
    ? session.photoUrl
      ? cardCrop(imageUrl, 800, 600)
      : faceCrop(imageUrl, 600)
    : null
  const price = priceLabel(session)

  return (
    <Link href={session.href} className="block min-w-0 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-light">
        {cropped && (
          <Image
            src={cropped}
            alt={session.name}
            fill
            sizes="(max-width: 768px) 80vw, 360px"
            className="object-cover"
          />
        )}
      </div>
      <div className="pt-3">
        <p className="line-clamp-2 font-display text-[1.25rem]! font-normal uppercase leading-[1.15] tracking-[0.04em] text-dark md:text-[1.4rem]!">
          {session.name}
        </p>
        <p className="caption mt-1 text-dark">{session.guideName}</p>
        <p className="caption mt-1 text-dark opacity-70">
          {[
            `${session.durationMinutes} min`,
            price,
            formatLabel(session.format),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    </Link>
  )
}
