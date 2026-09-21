'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { uploadToCloudinary, faceCrop } from '@/lib/cloudinary'
import { savePhotoUrl } from '@/app/join/actions'

// Portrait upload for the dashboard's YOUR PROFILE card. Same upload path
// and save action as onboarding's StepPhotos.tsx (photo_url only -- no
// banner field in this card), adapted for inline editing rather than a
// wizard step: no back/next, just upload-and-save-in-place.
export default function PortraitEditor({ initialPhotoUrl }: { initialPhotoUrl: string | null }) {
  const [url, setUrl] = useState(initialPhotoUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const secureUrl = await uploadToCloudinary(file)
      const result = await savePhotoUrl('photo_url', secureUrl)
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
    <div>
      <p className="label mb-2 text-dark">PORTRAIT</p>
      <div className="relative aspect-square w-full max-w-[180px] overflow-hidden border border-border bg-surface">
        {url && (
          <Image
            src={faceCrop(url, 360)}
            alt="Profile portrait"
            fill
            sizes="180px"
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
        {uploading ? 'UPLOADING' : url ? 'REPLACE' : 'UPLOAD'}
      </button>
      {error && <p className="caption mt-2 text-olive">{error}</p>}
    </div>
  )
}
