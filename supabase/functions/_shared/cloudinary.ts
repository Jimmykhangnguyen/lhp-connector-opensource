async function signUpload(timestamp: number, apiSecret: string): Promise<string> {
  const str = `timestamp=${timestamp}${apiSecret}`
  const buf = new TextEncoder().encode(str)
  const hash = await crypto.subtle.digest('SHA-1', buf)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME')!
  const apiKey    = Deno.env.get('CLOUDINARY_API_KEY')!
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET')!

  const timestamp = Math.floor(Date.now() / 1000)
  const signature = await signUpload(timestamp, apiSecret)

  const form = new FormData()
  form.append('file', file)
  form.append('api_key', apiKey)
  form.append('timestamp', timestamp.toString())
  form.append('signature', signature)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || 'Image upload failed')
  }

  const data = await res.json()
  return data.secure_url
}
