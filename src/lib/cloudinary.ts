// Client-safe Cloudinary helpers. Uploads go directly from the browser
// to Cloudinary using the unsigned upload preset. Only the returned
// secure_url is sent to our server.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

export async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured. Check your environment variables.')
  }

  const body = new FormData()
  body.append('file', file)
  body.append('upload_preset', UPLOAD_PRESET)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body }
  )

  if (!res.ok) {
    throw new Error('Upload failed. Try again or use a different image.')
  }

  const json = (await res.json()) as { secure_url?: string }
  if (!json.secure_url) {
    throw new Error('Upload failed. Try again or use a different image.')
  }
  return json.secure_url
}

function withTransform(url: string, transform: string): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url
  }
  return url.replace('/upload/', `/upload/${transform}/`)
}

// Hero banner: focal point auto-crop
export function bannerCrop(url: string, width = 1600, height = 480): string {
  return withTransform(url, `c_fill,g_auto,w_${width},h_${height}`)
}

// Profile photo: smart face crop
export function faceCrop(url: string, size = 400): string {
  return withTransform(url, `c_fill,g_face,w_${size},h_${size}`)
}

// Session card photo: focal point auto-crop
export function cardCrop(url: string, width = 800, height = 600): string {
  return withTransform(url, `c_fill,g_auto,w_${width},h_${height}`)
}
