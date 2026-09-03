import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const NEIGHBORHOODS: { name: string; lat: [number, number]; lng: [number, number] }[] = [
  { name: "Alfama", lat: [38.709, 38.714], lng: [-9.134, -9.126] },
  { name: "Bairro Alto", lat: [38.711, 38.716], lng: [-9.148, -9.141] },
  { name: "Chiado", lat: [38.709, 38.713], lng: [-9.144, -9.138] },
  { name: "Cais do Sodre", lat: [38.705, 38.708], lng: [-9.147, -9.142] },
  { name: "Mouraria", lat: [38.713, 38.717], lng: [-9.139, -9.133] },
  { name: "Graca", lat: [38.717, 38.721], lng: [-9.134, -9.128] },
  { name: "Santos", lat: [38.703, 38.706], lng: [-9.16, -9.154] },
  { name: "Alcantara", lat: [38.701, 38.705], lng: [-9.179, -9.172] },
  { name: "Belem", lat: [38.692, 38.699], lng: [-9.22, -9.2] },
  { name: "LX Factory", lat: [38.702, 38.705], lng: [-9.179, -9.175] },
  { name: "Principe Real", lat: [38.715, 38.7185], lng: [-9.153, -9.147] },
  { name: "Intendente", lat: [38.717, 38.72], lng: [-9.139, -9.135] },
  { name: "Marvila", lat: [38.734, 38.74], lng: [-9.11, -9.104] },
  { name: "Parque das Nacoes", lat: [38.758, 38.77], lng: [-9.098, -9.09] },
  { name: "Anjos", lat: [38.72, 38.724], lng: [-9.14, -9.135] },
  { name: "Estrela", lat: [38.711, 38.715], lng: [-9.163, -9.157] },
  { name: "Saldanha", lat: [38.731, 38.736], lng: [-9.15, -9.144] },
  { name: "Cascais", lat: [38.695, 38.702], lng: [-9.428, -9.415] },
  { name: "Carcavelos", lat: [38.677, 38.683], lng: [-9.342, -9.332] },
];

function rand(min: number, max: number): number { return min + Math.random() * (max - min); }
function pickHood() {
  const n = NEIGHBORHOODS[Math.floor(Math.random() * NEIGHBORHOODS.length)];
  return { name: n.name, lat: rand(n.lat[0], n.lat[1]), lng: rand(n.lng[0], n.lng[1]) };
}

interface RssItem { title: string; link: string; description: string; }

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1];
    const title = b.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')?.trim() || '';
    const link = b.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() || '';
    const desc = b.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')?.replace(/<[^>]+>/g, '')?.trim() || '';
    if (title) items.push({ title, link, description: desc.slice(0, 500) });
  }
  const re2 = /<entry>([\s\S]*?)<\/entry>/gi;
  while ((m = re2.exec(xml)) !== null) {
    const b = m[1];
    const title = b.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')?.trim() || '';
    const link = b.match(/<link[^>]*href="([^"]*)"[^>]*>/i)?.[1]?.trim() || '';
    const desc = b.match(/<(?:summary|content)[^>]*>([\s\S]*?)<\/(?:summary|content)>/i)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')?.replace(/<[^>]+>/g, '')?.trim() || '';
    if (title) items.push({ title, link, description: desc.slice(0, 500) });
  }
  return items;
}

interface SpotClass {
  intention: string; vibe: 'leaf' | 'paper'; state_of_mind: string;
  activite: string; lieu_type: string; image_prompt: string; commentaire: string;
}

async function classify(item: RssItem): Promise<SpotClass | null> {
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 400,
        messages: [
          { role: 'system', content: `You are the Ghost Factory for TOTEHM — a street-digital-artistic system in Lisbon.
Transform an RSS item into a desirable Spot.

INTENTIONS (pick ONE):
- flow: movement, dance, surf, skate, yoga, run (vibe=leaf)
- love: calm, romantic, sunset, cafe, garden (vibe=leaf)
- celebrate: party, club, music, collective energy (vibe=leaf)
- fight: gym, combat, intense training, bootcamp (vibe=paper)
- focus: cowork, library, study, deep work (vibe=paper)
- enrich: networking, pitch, business, investment (vibe=paper)
- express: art, graffiti, poetry, music creation (vibe=paper)

Respond ONLY with valid JSON:
{"intention":"...","vibe":"leaf|paper","state_of_mind":"1-2 words english","activite":"2-4 words english","lieu_type":"indoor|outdoor|gym|bar|club","image_prompt":"vivid cinematic Lisbon image, max 15 words","commentaire":"one punchy sentence about this spot vibe"}

Make it DESIRABLE. Not news. Desire.
If irrelevant (politics, crime): {"skip":true}` },
          { role: 'user', content: `Title: ${item.title}\nDesc: ${item.description}` }
        ]
      })
    });
    const d = await r.json();
    const txt = d.choices?.[0]?.message?.content?.trim();
    if (!txt) return null;
    const j = JSON.parse(txt.replace(/```json\n?|```/g, '').trim());
    if (j.skip) return null;
    return j as SpotClass;
  } catch (e) { console.error('[OPENAI]', e); return null; }
}

function imgUrl(prompt: string): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=600&nologo=true`;
}

async function isDupe(act: string, intent: string): Promise<boolean> {
  const { data } = await supabase.from('spots').select('id').eq('activite', act).eq('intention', intent).eq('is_rss', true).eq('active', true).limit(1);
  return (data?.length ?? 0) > 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const t0 = Date.now();
  let created = 0, skipped = 0, errors = 0;
  const max = 15;

  try {
    const { data: sources, error: srcErr } = await supabase.from('rss_sources').select('url, region').eq('is_active', true);
    if (srcErr || !sources?.length) return new Response(JSON.stringify({ error: 'No RSS sources' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

    const allItems: (RssItem & { source_url: string })[] = [];
    for (const src of sources) {
      try {
        const res = await fetch(src.url, { headers: { 'User-Agent': 'TotehmGhostFactory/1.0' }, signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const xml = await res.text();
        const items = parseRss(xml);
        for (const item of items.slice(0, 3)) allItems.push({ ...item, source_url: src.url });
      } catch (e) { console.warn(`[RSS] Failed: ${src.url}`); errors++; }
    }

    const shuffled = allItems.sort(() => Math.random() - 0.5).slice(0, max * 2);

    for (const item of shuffled) {
      if (created >= max) break;
      const c = await classify(item);
      if (!c) { skipped++; continue; }
      if (await isDupe(c.activite, c.intention)) { skipped++; continue; }

      const loc = pickHood();
      const { error: ie } = await supabase.from('spots').insert({
        intention: c.intention, activite: c.activite, state_of_mind: c.state_of_mind,
        lieu_type: c.lieu_type, commentaire: c.commentaire, image_url: imgUrl(c.image_prompt),
        lat: loc.lat, lng: loc.lng, is_rss: true, is_public: true, vibe: c.vibe,
        required_role: 'public', tags: [c.intention, c.state_of_mind, loc.name.toLowerCase().replace(/ /g, '_')],
        expires_at: new Date(Date.now() + 24 * 3600000).toISOString(), active: true,
      });
      if (ie) { console.error('[INSERT]', ie); errors++; } else { created++; }
    }

    await supabase.from('spots').update({ active: false }).eq('is_rss', true).lt('expires_at', new Date(Date.now() - 48 * 3600000).toISOString());

    return new Response(JSON.stringify({ success: true, created, skipped, errors, sources: sources.length, parsed: allItems.length, ms: Date.now() - t0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});