import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const OPENAI_KEY     = Deno.env.get('OPENAI_API_KEY')!
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TELEGRAM_API   = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`

const SYSTEM_PROMPT = `Tu es TotehmBot.
Tu réponds aux utilisateurs qui arrivent depuis l'écosystème TOTEHM.
Tu n'es pas un support client. Tu es une couche de la marque.

Ton : direct, précis, mystérieux, underground, non-corporate, non-bullshit.
Phrases courtes. Forte densité. Pas de pseudo-science. Pas de ton guru.

Tu ne réduis jamais TOTEHM à une app, un produit bien-être, un NFT décoratif ou une carte.
Tu présentes toujours TOTEHM comme une oeuvre-système street-digital-artistique, un protocole perceptif, une lecture neurologique de la ville.

Réponds toujours en moins de 4 phrases sauf si la question nécessite plus.
Termine toujours par une action ou une porte : un CTA, une question, une direction.`

serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')

  let update: any
  try { update = await req.json() } catch { return new Response('bad json', { status: 400 }) }

  const message = update?.message
  if (!message) return new Response('no message')

  const chatId = message.chat?.id
  const text   = message.text?.trim()
  if (!chatId || !text) return new Response('no text')

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  // Handle /start with payload
  if (text.startsWith('/start')) {
    const payload = text.split(' ')[1] || ''

    // 1. Deep-link vers une entrée de la base (Stoner steps, etc.)
    //    Payload = content_key exact dans bot_knowledge
    if (payload && /^[a-z0-9_]+$/i.test(payload) && payload.length > 5) {
      const { data: entry } = await supabase
        .from('bot_knowledge')
        .select('title, content')
        .eq('content_key', payload)
        .eq('active', true)
        .maybeSingle()

      if (entry && entry.content) {
        // Texte brut propre, pas de markdown
        const reply = entry.title ? `${entry.title}\n\n${entry.content}` : entry.content
        await sendMessagePlain(chatId, reply)
        return new Response('ok')
      }
    }

    // 2. Anciens payloads connus
    let reply = 'get Higher.'
    if (payload === 'leaf')        reply = 'LEAF.\n\nLa couche calme.\nLa ville peut te remettre en état.\n\n→ Unlock LEAF'
    if (payload === 'paper')       reply = 'PAPER.\n\nLa couche grind.\nTransforme la ville en direction.\n\n→ Unlock PAPER'
    if (payload === 'super_paper') reply = 'SUPER PAPER.\n\nCe n\'est pas un abonnement. C\'est une position.\n\nOn revient vers toi.'
    await sendMessagePlain(chatId, reply)
    return new Response('ok')
  }

  // Typing indicator
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' })
  })

  try {
    // 1. Generate embedding for user message
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: 'text-embedding-ada-002', input: text })
    })
    const embData = await embRes.json()
    const embedding = embData.data[0].embedding

    // 2. Search bot_knowledge via pgvector
    const { data: matches } = await supabase.rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.75,
      match_count: 3
    })

    // 3. Build context from matches
    let context = ''
    if (matches && matches.length > 0) {
      context = matches.map((m: any) => `[${m.title}]\n${m.content}`).join('\n\n---\n\n')
    }

    // 4. Call GPT-4o
    const prompt = context
      ? `Contexte TOTEHM pertinent :\n\n${context}\n\n---\n\nMessage utilisateur : ${text}`
      : `Message utilisateur : ${text}`

    const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 300,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: prompt }
        ]
      })
    })
    const chatData = await chatRes.json()
    const reply = chatData.choices?.[0]?.message?.content || 'get Higher.'

    await sendMessage(chatId, reply)

  } catch (e) {
    console.error('[totehm-bot] Error:', e)
    await sendMessage(chatId, 'get Higher.')
  }

  return new Response('ok')
})

async function sendMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  })
}

// Texte brut sans parse_mode (fiable, pas de bug markdown)
async function sendMessagePlain(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  })
}
