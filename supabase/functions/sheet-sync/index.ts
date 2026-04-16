import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const SYNC_SECRET = Deno.env.get('SHEET_SYNC_SECRET')!

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  if (req.headers.get('x-sync-secret') !== SYNC_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  let record: Record<string, unknown>
  try {
    record = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const { error } = await supabase.from('posts').insert({
    ...record,
    approved: true,
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 })
})
