import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
  const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const openaiKey    = Deno.env.get('OPENAI_API_KEY')!

  if (!openaiKey) return json({ error: 'Missing OPENAI_API_KEY' }, 500)

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // Fetch all entries without embeddings (or all if force=true)
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
  const force = body.force === true

  const query = supabase
    .from('bot_knowledge')
    .select('id, content_key, title, summary, content')
    .eq('active', true)

  if (!force) query.is('embedding', null)

  const { data: entries, error: fetchErr } = await query
  if (fetchErr) return json({ error: fetchErr.message }, 500)
  if (!entries || entries.length === 0) return json({ ok: true, processed: 0, message: 'Nothing to embed' })

  console.log(`[generate-embeddings] Processing ${entries.length} entries`)

  let processed = 0
  let failed = 0
  const errors: string[] = []

  for (const entry of entries) {
    try {
      // Build text to embed: title + summary + content
      const text = [
        entry.title,
        entry.summary ?? '',
        entry.content
      ].filter(Boolean).join('\n\n').slice(0, 8000)

      // Call OpenAI embeddings API
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`OpenAI ${res.status}: ${err}`)
      }

      const data = await res.json()
      const embedding = data.data[0].embedding

      // Store embedding in Supabase
      const { error: updateErr } = await supabase
        .from('bot_knowledge')
        .update({ embedding, updated_at: new Date().toISOString() })
        .eq('id', entry.id)

      if (updateErr) throw new Error(updateErr.message)

      processed++
      console.log(`[generate-embeddings] ✓ ${entry.content_key}`)

    } catch (e) {
      failed++
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${entry.content_key}: ${msg}`)
      console.error(`[generate-embeddings] ✗ ${entry.content_key}:`, msg)
    }
  }

  return json({ ok: true, processed, failed, errors })
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
