import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing authorization' }, 401)
  }

  let body: { content_key?: string; summary?: string; content?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { content_key, summary, content } = body

  if (!content_key || typeof content_key !== 'string') {
    return json({ error: 'content_key is required' }, 400)
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return json({ error: 'content is required and cannot be empty' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    console.error('[sync-knowledge] Missing env vars')
    return json({ error: 'Server configuration error' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  })

  const { error } = await supabase
    .from('bot_knowledge')
    .upsert(
      {
        content_key,
        summary: summary ?? '',
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'content_key', ignoreDuplicates: false }
    )

  if (error) {
    console.error('[sync-knowledge] Upsert error:', error)
    return json({ error: error.message }, 500)
  }

  console.log('[sync-knowledge] Synced:', content_key)
  return json({ ok: true, key: content_key })
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
