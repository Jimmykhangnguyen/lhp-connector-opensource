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

// Set to true to hold posts for manual approval, false to approve automatically
const REQUIRE_APPROVAL = true

const DEFAULT_IMAGE_URL = 'https://res.cloudinary.com/drnlcmzsy/image/upload/v1774757795/dmfay0dilxqkzecx7yop.jpg'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    const key = `rate:submit:${ip}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 86400)
    if (count > 2) {
      return new Response(
        JSON.stringify({ error: 'Too many submissions. Please try again later.' }),
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

  const name       = form.get('name') as string
  const cls        = form.get('class') as string
  const school_year = form.get('school_year') as string
  const city       = form.get('city') as string
  const country    = form.get('country') as string
  const caption    = form.get('caption') as string | null
  const lat        = parseFloat(form.get('lat') as string)
  const lng        = parseFloat(form.get('lng') as string)
  const instagram  = form.get('instagram') as string | null
  const facebook   = form.get('facebook') as string | null
  const linkedin   = form.get('linkedin') as string | null
  const imageFile  = form.get('image') as File | null

  let image_url = DEFAULT_IMAGE_URL
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

  const { error } = await supabase.from('posts').insert({
    name, class: cls, school_year, city, country, caption, image_url, lat, lng,
    instagram, facebook, linkedin,
    approved: !REQUIRE_APPROVAL,
  })

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, requiresApproval: REQUIRE_APPROVAL }),
    { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
  )
})
