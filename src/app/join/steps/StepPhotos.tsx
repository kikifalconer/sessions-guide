'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { uploadToCloudinary, bannerCrop, faceCrop } from '@/lib/cloudinary'
import { savePhotoUrl } from '../actions'

function useUploader(
  field: 'banner_url' | 'photo_url',
  initialUrl: string | null
) {
  const [url, setUrl] = useState(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const secureUrl = await uploadToCloudinary(file)
      const result = await savePhotoUrl(field, secureUrl)
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
      } else {
        setUrl(secureUrl)
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Upload failed. Try again or use a different image.'
      )
    } finally {
      setUploading(false)
    }
  }

  return { url, uploading, error, inputRef, onFile }
}

export default function StepPhotos({
  initialBannerUrl,
  initialPhotoUrl,
  onNext,
  onBack,
}: {
  initialBannerUrl: string | null
  initialPhotoUrl: string | null
  onNext: () => void
  onBack: () => void
}) {
  const banner = useUploader('banner_url', initialBannerUrl)
  const photo = useUploader('photo_url', initialPhotoUrl)

  return (
    <section>
      <h2 className="mb-2">Your photos</h2>
      <p className="mb-8">
        Both are optional. You can add or change them any time from your
        dashboard.
      </p>

      <div className="mb-8">
        <p className="label mb-2 text-dark">BANNER IMAGE</p>
        <div className="relative h-40 w-full overflow-hidden border border-border bg-surface">
          {banner.url && (
            <Image
              src={bannerCrop(banner.url, 800, 320)}
              alt="Banner preview"
              fill
              sizes="(max-width: 768px) 100vw, 576px"
              className="object-cover"
            />
          )}
        </div>
        <input
          ref={banner.inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => banner.onFile(e.target.files?.[0])}
        />
        <button
          type="button"
          className="btn-secondary mt-3"
          disabled={banner.uploading}
          onClick={() => banner.inputRef.current?.click()}
        >
          {banner.uploading
            ? 'UPLOADING'
            : banner.url
              ? 'REPLACE BANNER'
              : 'UPLOAD BANNER'}
        </button>
        {banner.error && (
          <p className="caption mt-2 text-olive">{banner.error}</p>
        )}
      </div>

      <div className="mb-10">
        <p className="label mb-2 text-dark">PROFILE PHOTO</p>
        <div className="relative h-36 w-36 overflow-hidden rounded-full border border-border bg-surface">
          {photo.url && (
            <Image
              src={faceCrop(photo.url, 288)}
              alt="Profile photo preview"
              fill
              sizes="144px"
              className="object-cover"
            />
          )}
        </div>
        <input
          ref={photo.inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => photo.onFile(e.target.files?.[0])}
        />
        <button
          type="button"
          className="btn-secondary mt-3"
          disabled={photo.uploading}
          onClick={() => photo.inputRef.current?.click()}
        >
          {photo.uploading
            ? 'UPLOADING'
            : photo.url
              ? 'REPLACE PHOTO'
              : 'UPLOAD PHOTO'}
        </button>
        {photo.error && <p className="caption mt-2 text-olive">{photo.error}</p>}
      </div>

      <div className="flex items-center gap-4">
        <button type="button" className="btn-secondary" onClick={onBack}>
          BACK
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={onNext}
          disabled={banner.uploading || photo.uploading}
        >
          CONTINUE
        </button>
      </div>
    </section>
  )
}
