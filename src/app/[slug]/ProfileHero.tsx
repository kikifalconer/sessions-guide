import Image from 'next/image'
import { bannerCrop } from '@/lib/cloudinary'

export default function ProfileHero({
  name,
  tagline,
  bannerUrl,
}: {
  name: string
  tagline: string | null
  bannerUrl: string | null
}) {
  return (
    <header>
      <div className="relative h-[420px] w-full bg-surface">
        {bannerUrl && (
          <Image
            src={bannerCrop(bannerUrl, 1600, 600)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}

        {/* 10% black wash over the banner */}
        <div className="absolute inset-0 bg-hero-overlay" />

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
