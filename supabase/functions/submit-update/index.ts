import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Redis } from 'https://esm.sh/@upstash/redis'
import { uploadToCloudinary } from '../_shared/cloudinary.ts'

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const key = `rate:update:${ip}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 86400)
    if (count > 3) {
      return new Response(
        JSON.stringify({ error: 'Too many update requests. Please try again later.' }),
        { status: 429, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }
  } catch (e) {
    console.error('Redis error:', e)
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body.' }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }

  const name        = form.get('name') as string
  const cls         = form.get('class') as string
  const school_year = form.get('school_year') as string

  if (!name?.trim() || !cls?.trim()) {
    return new Response(
      JSON.stringify({ error: 'Name and class are required to identify your post.' }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }

  const imageFile = form.get('image') as File | null
  let image_url: string | null = null
  if (imageFile && imageFile.size > 0) {
    try {
      image_url = await uploadToCloudinary(imageFile)
    } catch (e) {
      return new Response(
        JSON.stringify({ error: (e as Error).message }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }
  }

  const { error } = await supabase.from('post_updates').insert({
    name:        name.trim(),
    class:       cls.trim(),
    school_year: school_year?.trim() || null,
    city:        form.get('city') as string | null,
    country:     form.get('country') as string | null,
    lat:         form.get('lat') ? parseFloat(form.get('lat') as string) : null,
    lng:         form.get('lng') ? parseFloat(form.get('lng') as string) : null,
    caption:     form.get('caption') as string | null,
    image_url,
    instagram:   form.get('instagram') as string | null,
    facebook:    form.get('facebook') as string | null,
    linkedin:    form.get('linkedin') as string | null,
  })

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
  )
})
