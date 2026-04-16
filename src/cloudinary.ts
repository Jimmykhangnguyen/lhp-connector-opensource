const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  throw new Error('Missing Cloudinary environment variables. Copy .env.example to .env and fill in your values.')
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? 'Image upload failed')
  }

  const data = await response.json() as { secure_url: string }
  return data.secure_url
}

export function thumbnailUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  return url.replace('/upload/', '/upload/w_400,c_fill,q_auto,f_auto/')
}
