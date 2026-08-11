import Image from 'next/image'
import { bannerCrop } from '@/lib/cloudinary'

// Full-width hero for editorial + sage pages. Focal-point auto-crop (bannerCrop),
// a bottom dark scrim (.page-hero-scrim, globals.css) so the light display-font
// title is always legible, title anchored toward the bottom, centered.
export default function PageHero({
  title,
  imageUrl,
}: {
  title: string
  imageUrl: string | null
}) {
  return (
    <header>
      <div className="relative h-[420px] w-full bg-surface">
        {imageUrl && (
          <Image
            src={bannerCrop(imageUrl, 1600, 600)}
            alt={title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="page-hero-scrim absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 flex justify-center px-6 pb-10 text-center">
          <h1 style={{ color: 'var(--color-light)' }}>{title}</h1>
        </div>
      </div>
    </header>
  )
}
