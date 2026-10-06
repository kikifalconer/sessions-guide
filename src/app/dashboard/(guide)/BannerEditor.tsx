'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { uploadToCloudinary, bannerCrop } from '@/lib/cloudinary'
import { savePhotoUrl } from '@/app/join/actions'

export default function BannerEditor({ initialBannerUrl }: { initialBannerUrl: string | null }) {
  const [url, setUrl] = useState(initialBannerUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const secureUrl = await uploadToCloudinary(file)
      const result = await savePhotoUrl('banner_url', secureUrl)
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong. Try again or contact support.')
      } else {
        setUrl(secureUrl)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Try again or use a different image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-w-0 flex-1">
      <p className="label mb-2 text-dark">Banner</p>
      <div className="relative h-32 w-full overflow-hidden bg-light">
        {url && (
          <Image
            src={bannerCrop(url, 800, 320)}
            alt="Profile banner"
            fill
            sizes="(max-width: 768px) 100vw, 480px"
            className="object-cover"
          />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        className="btn-secondary mt-3"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Uploading' : url ? 'Replace banner' : 'Upload banner'}
      </button>
      {error && <p className="caption mt-2 text-olive">{error}</p>}
    </div>
  )
}
