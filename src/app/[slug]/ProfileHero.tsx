import { Suspense } from 'react'
import Image from 'next/image'
import { bannerCrop } from '@/lib/cloudinary'
import FavoriteButton from './FavoriteButton'

export default function ProfileHero({
  name,
  tagline,
  bannerUrl,
  favorite,
}: {
  name: string
  tagline: string | null
  bannerUrl: string | null
  // null only for the owner viewing their own profile -- everyone else gets
  // the heart, signed-out visitors included.
  favorite: {
    practitionerId: string
    initialSaved: boolean
    isSignedIn: boolean
    profilePath: string
  } | null
}) {
  return (
    <header>
      <div className="relative h-[420px] w-full bg-surface">
        {bannerUrl && (
          <Image
            src={bannerCrop(bannerUrl, 1600, 600)}
            alt={`${name} banner`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}

        {/* 10% black wash over the banner */}
        <div className="absolute inset-0 bg-hero-overlay" />

        {favorite && (
          <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
            {/* FavoriteButton reads useSearchParams() for the signed-out
                resume flow -- Next.js requires a Suspense boundary around
                any client component that does, regardless of rendering mode. */}
            <Suspense fallback={null}>
              <FavoriteButton
                practitionerId={favorite.practitionerId}
                initialSaved={favorite.initialSaved}
                isSignedIn={favorite.isSignedIn}
                profilePath={favorite.profilePath}
              />
            </Suspense>
          </div>
        )}

        {/* Name and tagline over the hero: display font, styled as h1, white */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <h1 style={{ color: 'var(--color-light)' }}>{name}</h1>
          {tagline && (
            <p className="mt-3 text-light">
              <span className="text-[1.3em] font-medium">{tagline}</span>
            </p>
          )}
        </div>
      </div>
    </header>
  )
}
