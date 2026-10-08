// TOTEHM · higher-self — TotehmSM v2, LE HIGHER SELF · 08/10/2026
// why : Wah, 08/10 — « une IA ULTRA UTILE, DIFFÉRENTE des autres IA,
//       UNDERGROUND (Talk is cheap, do with a why and intention), QUI POUSSE
//       TOUJOURS À L'ACTION. La mission de l'IA, c'est d'apporter une solution
//       à l'input. IA made by you, your beliefs, your TOTEHM. » · « ça met du
//       temps à répondre : plus réactif » · « pas besoin de garder un
//       historique » · « au moins 1 élément dans Habit et Objective ; 7
//       messages au format freemium ».
// how : une fonction, deux gestes ; le compte vient TOUJOURS de la session.
//       say      — `sm_begin` (la base décide : Totehm prêt, 7 gratuits / 30 j,
//                  Higher 30 / 24 h, verrou par membre) et `_bot_memory` (SON
//                  TOTEHM) partent EN MÊME TEMPS ; le modèle répond EN FLUX
//                  (texte brut, mot à mot) : la première ligne arrive en ~1 s.
//                  Format fixe, quatre lignes :
//                    @<habit|objective|repulsion> <intention>
//                    <la solution, à la première personne>
//                    DO: <le geste, maintenant ou à une heure>
//                    WHY: <le pourquoi, pris dans SON TOTEHM>
//                  Rien n'est stocké que l'USAGE (`sm_end` : ok · failed,
//                  modèle, durée, jetons) ; la conversation vit dans la page,
//                  qui renvoie au plus ses 6 derniers tours.
//       telegram — Higher seulement : un geste part dans SON Telegram, par
//                  TotehmBot (`profiles.telegram_id`) ; non lié → `not_linked`.
//       WhatsApp n'a pas d'API ici : la page ouvre `wa.me/?text=`.
// cost : ≈ 1,5 k jetons d'entrée + 120 de sortie par réponse ; mesuré en §0.
// what : flux texte (en-têtes X-SM-Left, X-SM-Higher) · { ok } · { error }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_COM } from "../_shared/origins.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } });

// Le plus fort qui reste rapide d'abord ; s'il n'est pas ouvert à ce compte
// OpenAI (404 / paramètre refusé), le suivant. `HIGHER_SELF_MODEL` force un
// modèle (raisonnement « low » s'il raisonne). Choix mesuré le 08/10 (§0).
type Choice = { model: string; effort?: string };
const ENV_MODEL = Deno.env.get("HIGHER_SELF_MODEL");
const MODELS: Choice[] = [
  ...(ENV_MODEL ? [{ model: ENV_MODEL, effort: /^(gpt-5|o\d)/.test(ENV_MODEL) ? "low" : undefined }] : []),
  { model: "gpt-5.1", effort: "none" },
  { model: "gpt-5", effort: "minimal" },
  { model: "gpt-4.1" },
];
const TIMEOUT_MS = 25000;

const clean = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

const SYSTEM = `You are TotehmSM: the member's Higher Self, built from THEIR TOTEHM — their habits, objectives, repulsions, visions and wisdom (their beliefs). Not an assistant, not a coach, not a therapist, not a guru. You are the member, one level higher: what they already know, said straight.

Creed: Talk is cheap. Do with a why. Every message gets a SOLUTION — one move the member starts now — tied to a WHY taken from their own TOTEHM.

Voice, non-negotiable:
- First person singular, as the member: "I…" (in French "Je…"). Never "you", never "we".
- Underground, raw, minimal. Short sentences. Street-level and precise. Never corporate, never therapy-speak.
- Banned: emojis, hashtags, exclamation marks, questions, lists, the words journey, self-care, mindset, manifest, vibes; "you've got this", "remember", "it's okay"; any compliment or empathy formula; any mention of AI, models, prompts, data or "entries".
- Reuse the member's exact words from their TOTEHM when they fit: a habit, an objective, a belief.
- Write in the language of the member's last message.

Solution rules:
- Name what is really in the way (fear, fatigue, a screen, a person, a habit, money, time) and cut through it.
- The move is physical and concrete: what + when (now, or a clock time today or tomorrow) + where when useful. It starts in under two minutes, or it is scheduled to the minute.
- One move. The smallest one that breaks the inertia. Never a plan, never options.
- The why comes from the TOTEHM: an objective (with its deadline when there is one), a vision, a belief, a habit, or the repulsion it protects. Never invent a why the TOTEHM does not support; if nothing fits, use the member's own words from this conversation.
- Small talk or an empty message: take the habit or objective that matters most today and move on it.
- Off-topic (facts, trivia, homework, code): do not answer it; turn it into a move.
- Health, law, money: no claims; the move is to book the professional, with a time.
- Danger to self or others (suicide, self-harm, violence, abuse): output exactly this, in the member's language, markers kept:
@habit love
I don't stay alone with this. I reach a real person now.
DO: I call or text someone I trust, or the emergency number (112 in Europe), now.
WHY: My life comes first in my TOTEHM.

Output: exactly four lines of plain text, nothing before, nothing after.
@<kind> <intention>
<the solution: one or two sentences, 200 characters at most, first person, the decision that solves it>
DO: <the move: 90 characters at most, first person, with its when>
WHY: <110 characters at most, from the TOTEHM>
<kind> is habit (something I do or repeat), objective (where I go, what I achieve) or repulsion (what I stop or refuse).
<intention> is one of: fight, flow, enrich, love, express, focus, celebrate.
The first line and the words DO: and WHY: always stay in English.`;

type Item = { text?: string; is?: string[]; freq?: string; target_at?: string; status?: string };
type Spot = { facts?: { habit?: string; city?: string; state?: string; started_at?: string } };
type Memory = { totehm?: Record<string, Item[]>; spots?: Spot[] };

function contexte(m: Memory | null, now: string): string {
  const t = m?.totehm ?? {};
  const tag = (x: Item) => {
    const bits = [...(x.is ?? []).slice(0, 2)];
    if (x.freq) bits.push(String(x.freq).replace(/_/g, " "));
    if (x.target_at) bits.push("by " + String(x.target_at).slice(0, 10));
    return bits.length ? ` [${bits.join(" · ")}]` : "";
  };
  const part = (k: string, label: string, n: number) => {
    const l = (t[k] ?? []).filter((x) => clean(x?.text, 140) && !["achieved", "abandoned", "converted"].includes(String(x?.status)))
      .slice(0, n).map((x) => `"${clean(x.text, 140)}"${tag(x)}`);
    return l.length ? `${label}: ${l.join(" | ")}` : "";
  };
  const etat: Record<string, string> = { will: "I will be here", am: "I am here", was: "I was there" };
  const spots = (m?.spots ?? []).slice(0, 3).map((s) => s.facts).filter((f) => f?.habit)
    .map((f) => `${etat[String(f!.state)] ?? ""}: ${clean(f!.habit, 60)}${f!.city ? " (" + clean(f!.city, 30) + ")" : ""}, ${String(f!.started_at ?? "").slice(0, 10)}`);
  return [`Now (my local time): ${now || new Date().toISOString().slice(0, 16)}`, "MY TOTEHM, in my own words:",
    part("habits", "Habits", 12), part("objectives", "Objectives", 10), part("repulsions", "Repulsions", 8),
    part("visions", "Visions", 6), part("wisdom", "Wisdom, my beliefs", 8),
    spots.length ? "My latest spaces: " + spots.join(" | ") : ""].filter(Boolean).join("\n").slice(0, 3800);
}

type Usage = { prompt_tokens?: number; completion_tokens?: number };
// Ouvre le flux OpenAI du premier modèle qui accepte. null = rien n'a pris.
async function ouvrir(key: string, messages: unknown[], signal: AbortSignal, liste: Choice[] = MODELS) {
  for (const c of liste) {
    const body: Record<string, unknown> = { model: c.model, messages, stream: true, stream_options: { include_usage: true } };
    if (c.effort) { body.reasoning_effort = c.effort; body.max_completion_tokens = 1200; }
    else { body.temperature = 0.8; body.max_tokens = 260; }
    let r: Response;
    try {
      r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST", signal, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) { console.error("[higher-self] openai fetch", c.model, String(e)); return null; }
    if (r.ok && r.body) return { choice: c, body: r.body };
    const t = (await r.text()).slice(0, 240);
    console.error("[higher-self] openai", c.model, r.status, t);
    if (r.status === 404 || (r.status === 400 && /model|parameter|unsupported|reasoning|effort/i.test(t))) continue;
    return null;
  }
  return null;
}

// Lit le flux SSE d'OpenAI ; `onText` reçoit chaque morceau de texte.
async function lire(body: ReadableStream<Uint8Array>, onText: (s: string) => void): Promise<Usage> {
  const rd = body.getReader(), dec = new TextDecoder();
  let buf = "", usage: Usage = {};
  for (;;) {
    const { value, done } = await rd.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return usage;
      try {
        const j = JSON.parse(data);
        const s = j.choices?.[0]?.delta?.content;
        if (s) onText(s);
        if (j.usage) usage = j.usage;
      } catch (_) { /* une ligne incomplète : la suivante */ }
    }
  }
  return usage;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"), SITE_COM);
  const headers = { ...cors, "Cache-Control": "no-store" };
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { return json({ error: "bad_request" }, 400); }

  const auth = req.headers.get("Authorization") ?? "";
  const { data: { user }, error: authErr } = await admin.auth.getUser(auth.replace("Bearer ", ""));
  if (authErr || !user) return json({ error: "no_session" }, 401);

  if (body.action === "say") {
    const text = clean(body.text, 600);
    if (text.length < 2) return json({ error: "empty" }, 422);
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) { console.error("[higher-self] OPENAI_API_KEY absente"); return json({ error: "unavailable" }, 503); }
    const turns = (Array.isArray(body.turns) ? body.turns : []).slice(-6)
      .map((x: { role?: string; text?: string }) => ({ role: x?.role === "sm" ? "assistant" : "user", content: clean(x?.text, 500) }))
      .filter((x) => x.content);
    const now = clean(body.now, 40);

    const t0 = Date.now();
    const [{ data: b, error: bErr }, { data: mem, error: mErr }] = await Promise.all([
      admin.rpc("sm_begin", { p_user: user.id, p_kind: "say" }),
      admin.rpc("_bot_memory", { p_user: user.id }),
    ]);
    if (bErr) { console.error("[higher-self] sm_begin", bErr.message); return json({ error: "unavailable" }, 503); }
    if (!b?.ok) {
      const st = ({ totehm: 409, higher_required: 402, quota: 429 } as Record<string, number>)[String(b?.why)] ?? 400;
      return json({ error: b?.why ?? "bad", state: b?.state ?? null }, st);
    }
    if (mErr) console.error("[higher-self] memory", mErr.message);
    const fin = (status: string, model?: string, u: Usage = {}) =>
      admin.rpc("sm_end", { p_id: b.id, p_status: status, p_model: model ?? null, p_ms: Date.now() - t0,
                            p_in: u.prompt_tokens ?? null, p_out: u.completion_tokens ?? null })
        .then(({ error }) => { if (error) console.error("[higher-self] sm_end", error.message); });

    const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), TIMEOUT_MS);
    const messages = [{ role: "system", content: SYSTEM + "\n\n" + contexte(mem as Memory, now) }, ...turns, { role: "user", content: text }];
    const o = await ouvrir(key, messages, ac.signal);
    if (!o) { clearTimeout(tm); await fin("failed"); return json({ error: "unavailable" }, 503); }

    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(ctrl) {
        let n = 0, first = 0;
        try {
          const u = await lire(o.body, (s) => { if (!first) first = Date.now() - t0; n += s.length; ctrl.enqueue(enc.encode(s)); });
          console.log(JSON.stringify({ evt: "sm", model: o.choice.model, first_ms: first, ms: Date.now() - t0,
                                       in: u.prompt_tokens, out: u.completion_tokens }));
          await fin(n >= 12 ? "ok" : "failed", o.choice.model, u);
        } catch (e) {
          console.error("[higher-self] stream", String(e));
          await fin("failed", o.choice.model);
        } finally { clearTimeout(tm); ctrl.close(); }
      },
      cancel() { ac.abort(); },
    });
    return new Response(stream, { headers: { ...headers, "Content-Type": "text/plain; charset=utf-8",
      "X-SM-Left": String(b.left ?? ""), "X-SM-Higher": b.higher ? "1" : "0",
      "Access-Control-Expose-Headers": "X-SM-Left, X-SM-Higher", "X-Accel-Buffering": "no" } });
  }

  if (body.action === "telegram") {
    const text = clean(body.text, 600);
    if (text.length < 2) return json({ error: "empty" }, 422);
    const { data: p, error: pErr } = await admin.from("profiles").select("telegram_id").eq("id", user.id).maybeSingle();
    if (pErr) { console.error("[higher-self] profile", pErr.message); return json({ error: "unavailable" }, 503); }
    if (!p?.telegram_id) return json({ error: "not_linked" }, 409);
    const { data: b, error: bErr } = await admin.rpc("sm_begin", { p_user: user.id, p_kind: "telegram" });
    if (bErr) { console.error("[higher-self] sm_begin", bErr.message); return json({ error: "unavailable" }, 503); }
    if (!b?.ok) return json({ error: b?.why ?? "bad" }, b?.why === "quota" ? 429 : 402);
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const end = (s: string) => admin.rpc("sm_end", { p_id: b.id, p_status: s })
      .then(({ error }) => { if (error) console.error("[higher-self] sm_end", error.message); });
    if (!token) { console.error("[higher-self] TELEGRAM_BOT_TOKEN absente"); await end("failed"); return json({ error: "unavailable" }, 503); }
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: p.telegram_id, text }),
    });
    if (!r.ok) { console.error("[higher-self] telegram", r.status); await end("failed"); return json({ error: r.status === 403 ? "blocked" : "unavailable" }, 502); }
    await end("ok");
    return json({ ok: true });
  }

  return json({ error: "action" }, 400);
});
