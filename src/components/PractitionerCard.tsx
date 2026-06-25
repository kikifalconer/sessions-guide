import Image from 'next/image'
import Link from 'next/link'
import { faceCrop } from '@/lib/cloudinary'
import type { PractitionerCardData } from '@/lib/discovery'

// Shared practitioner result card (design-system "Cards"): surface bg, 1px
// border, no radius, photo on top, name h4, primary modality + city DM Mono
// labels, rating. Reused by category now; city/search later. Takes its rating
// from the discovery aggregate — never queries per card.
export default function PractitionerCard({ practitioner }: { practitioner: PractitionerCardData }) {
  const p = practitioner
  const filled = p.avgRating !== null ? Math.round(p.avgRating) : 0

  return (
    <Link
      href={`/${p.slug}`}
      className="block border border-border bg-surface transition-colors hover:border-olive"
    >
      <div className="relative aspect-[4/3] w-full bg-surface">
        {p.photoUrl && (
          <Image
            src={faceCrop(p.photoUrl, 600)}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover"
          />
        )}
      </div>

      <div className="p-4">
        <h4 className="text-dark">{p.fullName}</h4>

        {p.primaryModalityName && (
          <p className="caption mt-2 text-dark">{p.primaryModalityName}</p>
        )}
        {p.cityLabel && (
          <p className="caption mt-1 text-dark opacity-70">{p.cityLabel}</p>
        )}

        {p.reviewCount > 0 && p.avgRating !== null && (
          <p
            className="caption mt-2 text-olive"
            aria-label={`Rated ${p.avgRating.toFixed(1)} out of 5 from ${p.reviewCount} reviews`}
          >
            {'★'.repeat(filled)}
            {'☆'.repeat(5 - filled)}
            <span className="ml-2 text-dark">
              {p.avgRating.toFixed(1)} ({p.reviewCount})
            </span>
          </p>
        )}
      </div>
    </Link>
  )
}
