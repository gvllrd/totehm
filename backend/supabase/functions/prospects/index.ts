import { createClient } from 'npm:@supabase/supabase-js@2'
import { resolveOrigin, SITE_SPACE } from '../_shared/origins.ts'

const OPENAI_KEY  = Deno.env.get('OPENAI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// La clé admin lit un secret Supabase (PROSPECTS_ADMIN_KEY). Pas de fallback :
// une fonction qui accepte tout par défaut à cause d'un secret manquant est
// une backdoor. `!` force la présence du secret au démarrage.
const ADMIN_KEY = Deno.env.get('PROSPECTS_ADMIN_KEY')!

const SITE_URL = SITE_SPACE

// CORS restreint aux domaines TOTEHM — importé du shared. Fabriqué per-request
// dans serve() pour refléter l'origine du caller. Wildcard aurait exposé la
// génération OpenAI à n'importe quel site.
function corsOf(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(req.headers.get('origin'), SITE_SPACE),
    'Access-Control-Allow-Headers': 'content-type, x-admin-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

const SYSTEM_PROMPT = `You are the voice of TOTEHM — an underground street-digital-artistic brand from Lisbon created by the artist Wah. TOTEHM sells "digital LSD": the Stoner Experience\u00a9, an artistic and neurological performance that restores temporal coherence.

THE CORE SYSTEM (immutable logic):
stress / stimulation \u2192 cortisol / dopamine traps \u2192 fragmentation of time \u2192 loss of temporal coherence \u2192 restoration.

THE CORE MANIFESTO (canonical reference):
"Most people think they're just losing energy. That it was just a bad day. That tomorrow will be better. They're losing years. Not to disease. Not to age. Not to genetics. To internal stress and external stimulation. Inside: anxiety, pressure, negativity, overthinking \u2192 excess cortisol \u2192 time becomes heavy, dense, slow. Outside: notifications, scrolling, instant rewards \u2192 dopamine traps \u2192 time feels infinite. Neither allows temporal coherence. Scattered attention. Scattered brainwaves. Scattered reality. When time becomes coherent: deep focus lasts, decisions sharpen, actions align, performance follows. Reality becomes navigable again. The most valuable resource on Earth isn't money, status or power. It's time. Take it back."

YOUR TASK: given a TARGET (a person, a company, a gallery, an institution), produce a PERSONALIZED landing experience + a short outreach email, both strictly following the CORE system but reinterpreted through the target's world (their craft, pressures, daily reality).

TONE: direct, precise, mysterious, underground, non-corporate, no flattery, no hype words, no exclamation marks. Short lines. High density. Never mention NFT, crypto or price. Never promise financial returns. The email must create curiosity, not sell.

SLIDE FORMAT \u2014 respond ONLY with valid JSON, no markdown fences:
{
  "slides": [
    { "slot": "reframe|inside|outside|fragment|coherence|reclaim",
      "parts": [ {"t":"g","x":"gray narration line(s), use \\n for line breaks"},
                 {"t":"c","x":"coral punchline"} ] }
  ],
  "email_subject": "max 6 words, lowercase allowed, intriguing",
  "email_body": "45-90 words, plain text, line breaks with \\n, addressed to the target, ends with the link placeholder {PAGE_URL} on its own line, then a single sign-off line: Wah \u2014 TOTEHM"
}

SLIDE RULES:
- 6 slides exactly, in this slot order: reframe, inside, outside, fragment, coherence, reclaim.
- Each slide: 2-4 parts. Alternate g (constat, Futura gray) and c (punchline, Quantico coral).
- The reframe slide opens on the target's world ("Most champions...", "Most galleries...").
- inside = their internal stress \u2192 cortisol. outside = their external stimulation \u2192 dopamine traps.
- fragment = the cost in their craft. coherence = what returns when time coheres for THEM.
- reclaim = last slide, last part must be {"t":"c","x":"Take it back."} (the CTA button is added automatically after it).
- Lines short. Punchlines hit. Personal but never sycophantic.`

function slugify(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

Deno.serve(async (req) => {
  const CORS = corsOf(req)
  const json = (obj: any, status = 200) =>
    new Response(JSON.stringify(obj), {
      status, headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('method', { status: 405, headers: CORS })

  let body: any
  try { body = await req.json() } catch { return json({ error: 'bad json' }, 400) }
  const action = body.action

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  // \u2500\u2500 PUBLIC : get page content by slug \u2500\u2500
  if (action === 'get') {
    const { data } = await sb.from('prospects')
      .select('target_name,page_content,status').eq('slug', body.slug).maybeSingle()
    if (!data) return json({ error: 'not found' }, 404)
    return json({ target_name: data.target_name, page_content: data.page_content })
  }

  // \u2500\u2500 ADMIN actions below \u2500\u2500
  if (req.headers.get('x-admin-key') !== ADMIN_KEY) return json({ error: 'unauthorized' }, 401)

  if (action === 'list') {
    const { data } = await sb.from('prospects')
      .select('id,slug,target_name,email,status,created_at,sent_at')
      .order('created_at', { ascending: false }).limit(100)
    return json({ prospects: data || [] })
  }

  if (action === 'generate') {
    const { target_name, context, email } = body
    if (!target_name) return json({ error: 'target_name required' }, 400)

    const userPrompt = `TARGET: ${target_name}\nCONTEXT: ${context || 'none provided'}\n\nGenerate the personalized experience JSON now.`

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.8,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    })
    const aiData = await aiRes.json()
    let gen: any
    try { gen = JSON.parse(aiData.choices[0].message.content) }
    catch { return json({ error: 'generation failed', raw: aiData }, 500) }

    // slug unique
    let slug = slugify(target_name)
    const { data: existing } = await sb.from('prospects').select('slug').like('slug', slug + '%')
    if (existing && existing.some((r: any) => r.slug === slug)) slug = slug + '-' + (existing.length + 1)

    const page_url = `${SITE_URL}/p.html?p=${slug}`
    const email_body = (gen.email_body || '').replace('{PAGE_URL}', page_url)

    const { data: rec, error } = await sb.from('prospects').insert({
      slug, target_name, context: context || null, email: email || null,
      page_content: { slides: gen.slides },
      email_subject: gen.email_subject, email_body,
    }).select().single()
    if (error) return json({ error: error.message }, 500)
    return json({ prospect: rec, page_url })
  }

  if (action === 'update') {
    const { id, email_subject, email_body, email, page_content } = body
    const patch: any = {}
    if (email_subject !== undefined) patch.email_subject = email_subject
    if (email_body !== undefined) patch.email_body = email_body
    if (email !== undefined) patch.email = email
    if (page_content !== undefined) patch.page_content = page_content
    const { data, error } = await sb.from('prospects').update(patch).eq('id', id).select().single()
    if (error) return json({ error: error.message }, 500)
    return json({ prospect: data })
  }

  if (action === 'send') {
    const { id, webhook_url } = body
    if (!webhook_url) return json({ error: 'webhook_url required' }, 400)
    const { data: p } = await sb.from('prospects').select('*').eq('id', id).maybeSingle()
    if (!p) return json({ error: 'not found' }, 404)
    if (!p.email) return json({ error: 'prospect has no email' }, 400)

    const page_url = `${SITE_URL}/p.html?p=${p.slug}`
    const hookRes = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: p.email, subject: p.email_subject, body: p.email_body,
        target_name: p.target_name, page_url,
      }),
    })
    if (!hookRes.ok) return json({ error: 'n8n webhook failed', status: hookRes.status }, 502)

    await sb.from('prospects').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id)
    return json({ ok: true, sent_to: p.email })
  }

  return json({ error: 'unknown action' }, 400)
})
