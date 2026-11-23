// TOTEHM · my-chapter — « My Chapter », le récit de MA semaine (Wah, décision B du 22/11/2026).
// ═══════════════════════════════════════════════════════════════════════
// why  : « un feedback en mode narratif, qui prendrait TOUT en compte — toutes les actions effectuées dans le TOTEHM,
//        tous les choix effectués dans Telegram — avec un LLM… autobiography ». Offert.
// how  : SEULEMENT après l'accord explicite du membre (`chapter_settings.enabled`) : la matière de la semaine
//        (`chapter_week_material`, serveur seul) part au modèle ; le chapitre revient à la 1re personne, dans la langue
//        de SES box, avec SES mots, sans rien inventer ni diagnostiquer. Un chapitre par semaine (lundi 00:00 UTC),
//        trois écritures au plus (la table archive chaque version). Rien d'autre n'est écrit.
// what : POST { action:'write' } → { ok, chapter } | { error }.
// ═══════════════════════════════════════════════════════════════════════
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_COM } from "../_shared/origins.ts";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const MODEL = "gpt-4o";
const MAX_WRITES = 3;

const SYSTEM = `You write ONE chapter of a person's autobiography: the week that just happened, in their TOTEHM.
TOTEHM vocabulary: a Habit serves a Why (an Objective with a deadline, or a Vision without one); a Trigger is a repulsion — a bad habit used as the signal to take the better action; My Story holds lessons from the past. TotehmBot asks « Are you on it? » and the person answers On It, No Time or No Energy.

RULES (all mandatory):
1. First person (« I »), past tense, as the person. Write in the language the person uses in their own box texts.
2. Only facts present in the material. Never invent an event, a place, a person, a feeling or a number.
3. Use the person's own words: quote Habit, Objective, Vision, Trigger names exactly as written.
4. No Time and No Energy are honest answers, never failures. Never write « failed », « missed », « should », « must », or any advice.
5. No diagnosis, no psychology, no cause you cannot see. Unanswered questions are unknown: do not mention them as absence.
6. 120 to 220 words. Calm, concrete, a little literary. No emoji, no hashtags, no list.
7. If a previous chapter is given, continue its thread without repeating it.
8. Title: 2 to 6 words, from the week itself.
Output JSON only: {"title":"...","body":"..."}`;

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"), SITE_COM);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) => Response.json(b, { status, headers: cors });
  const { data: { user }, error: authErr } = await sb.auth.getUser((req.headers.get("authorization") ?? "").replace("Bearer ", ""));
  if (authErr || !user) return json({ error: "unauthorized" }, 401);
  let action = "";
  try { action = String((await req.json())?.action ?? ""); } catch { return json({ error: "bad request" }, 400); }
  if (action !== "write") return json({ error: "bad request" }, 400);
  if (!KEY) return json({ error: "unavailable" }, 503);

  const { data: st } = await sb.from("chapter_settings").select("enabled").eq("user_id", user.id).maybeSingle();
  if (!st?.enabled) return json({ error: "consent" }, 403);

  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7;
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  const to = new Date(from.getTime() + 7 * 864e5);
  const { data: ex, error: exErr } = await sb.from("book_chapters").select("id,version,chapter_no")
    .eq("user_id", user.id).eq("opened_at", from.toISOString()).maybeSingle();
  if (exErr) { console.error("[my-chapter] read", exErr.message); return json({ error: "try again" }, 503); }
  if (ex && ex.version >= MAX_WRITES) return json({ error: "limit" }, 429);

  const { data: m, error: mErr } = await sb.rpc("chapter_week_material", { p_user: user.id, p_from: from.toISOString(), p_to: now.toISOString() });
  if (mErr || !m) { console.error("[my-chapter] material", mErr?.message); return json({ error: "try again" }, 503); }
  if (!(m.gestures?.length) && !(m.answers?.length)) return json({ error: "quiet" }, 409);

  let title = "", body = "";
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, temperature: 0.7, max_tokens: 700, response_format: { type: "json_object" },
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: "Material of my week (JSON):\n" + JSON.stringify(m) }] }),
    });
    if (!r.ok) { console.error("[my-chapter] model", r.status); return json({ error: "try again" }, 502); }
    const out = JSON.parse((await r.json())?.choices?.[0]?.message?.content ?? "{}");
    title = String(out.title ?? "").trim().slice(0, 80);
    body = String(out.body ?? "").trim().slice(0, 4000);
  } catch (e) { console.error("[my-chapter] model", e instanceof Error ? e.message : e); return json({ error: "try again" }, 502); }
  if (!title || body.length < 40) return json({ error: "try again" }, 502);

  const counts: Record<string, number> = {};
  for (const g of m.gestures ?? []) if (g?.intention) counts[g.intention] = (counts[g.intention] ?? 0) + 1;
  const intention = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const row = { title, body, intention, generated_at: new Date().toISOString(), closed_at: to.toISOString() };
  let saved;
  if (ex) saved = await sb.from("book_chapters").update(row).eq("id", ex.id).select("chapter_no,title,body,opened_at,closed_at,generated_at,version").single();
  else {
    const { count } = await sb.from("book_chapters").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    saved = await sb.from("book_chapters").insert({ ...row, user_id: user.id, opened_at: from.toISOString(), chapter_no: (count ?? 0) + 1, visibility: "private" })
      .select("chapter_no,title,body,opened_at,closed_at,generated_at,version").single();
  }
  if (saved.error) { console.error("[my-chapter] save", saved.error.message); return json({ error: "try again" }, 503); }
  const c = saved.data;
  return json({ ok: true, writes_left: Math.max(0, MAX_WRITES - c.version),
    chapter: { no: c.chapter_no, title: c.title, body: c.body, from: c.opened_at, to: c.closed_at, written_at: c.generated_at, version: c.version } });
});
