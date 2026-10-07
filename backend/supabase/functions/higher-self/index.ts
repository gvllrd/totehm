// TOTEHM · higher-self — TotehmSM, LE SUPERMIROIR · 07/10/2026
// why : Wah, 07/10 — « une IA bien particulière qui fonctionne avec un LLM
//       puissant, accessible seulement aux membres payants ayant un abonnement
//       Higher. L'utilisateur parle avec son Higher Self. À chaque fois,
//       retravailler / corriger ses inputs — pas en mode coaching — en mode
//       « Je ». Le output est un reflective input. » · « Higher your social
//       media : envoyer les affirmations travaillées sur WhatsApp ou Telegram ».
// how : une fonction, deux gestes, le compte vient TOUJOURS de la session :
//       say      — le membre écrit ; l'accès est relu SOUS SA session
//                  (`totehmbot_access`, l'abonnement Higher ou un accès
//                  offert) ; 30 messages par 24 h ; son TOTEHM (`_bot_memory`)
//                  et les trois derniers échanges servent de contexte ; le
//                  modèle rend { kind, text } — la phrase du membre, en
//                  « je », et ce qu'elle travaille (habit · objective ·
//                  repulsion : la couleur de la bulle). Les deux bulles
//                  s'écrivent dans `sm_messages` APRÈS la réponse (un échec ne
//                  consomme rien).
//       telegram — une bulle TotehmSM du membre part dans SON Telegram, par
//                  TotehmBot (`profiles.telegram_id`) ; non lié → `not_linked`
//                  (la page demande un code de liaison, `new_bot_link_code`).
//       WhatsApp n'a pas d'API ici : la page ouvre `wa.me/?text=` (le membre
//       choisit le destinataire, lui-même compris). Zéro coût, zéro compte.
// cost : un appel de modèle par message ; contexte ≈ 1,5 k tokens. Plafond
//        30 / 24 h → au pire ≈ 4 $/mois/membre, en pratique < 1 $ (MASTER : 7 €/mois).
// what : { ok, me, sm, left } · { ok } · { error }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_COM } from "../_shared/origins.ts";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_SB, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const LIMIT = 30;
// Le meilleur modèle d'abord ; s'il n'est pas ouvert à ce compte OpenAI, le
// suivant. `HIGHER_SELF_MODEL` force un choix.
const MODELS = [Deno.env.get("HIGHER_SELF_MODEL"), "gpt-5", "gpt-4.1", "gpt-4o"].filter(Boolean) as string[];
const KINDS = ["habit", "objective", "repulsion"] as const;

const clean = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

const SYSTEM = `You are TotehmSM, the SuperMirror of a TOTEHM member.
You are not a coach, not a therapist, not an assistant, not a character. You have no voice of your own.
You speak ONLY as the member: first person singular ("I"), present tense.

The member writes how they are. You answer with how they will be: a REFLECTIVE INPUT —
the same intention, reworked and corrected, affirmative and concrete, in their own words whenever possible.

Rules:
- First person singular, present tense. Never "you". No advice, no question, no encouragement, no emoji, no quotes.
- One or two short sentences, 220 characters at most.
- Write in the same language as the member's message.
- When it fits, anchor on the member's own TOTEHM (habits, objectives, repulsions, visions, wisdom) and reuse their exact words.
- Turn a complaint into a decision, a fear into a stance, a vague wish into one concrete act (what, when, where).
- No medical, legal or financial claim.
- If the message expresses self-harm or a crisis, answer exactly: "I reach out to someone I trust, right now." with kind "habit".
Classify what the reflection works on:
- "habit": what I do, repeat, practice;
- "objective": where I am going, what I achieve;
- "repulsion": what I stop, refuse, resist.`;

const SCHEMA = {
  name: "reflection", strict: true,
  schema: { type: "object", additionalProperties: false, required: ["kind", "text"],
    properties: { kind: { type: "string", enum: [...KINDS] }, text: { type: "string" } } },
};

type Memory = { totehm?: Record<string, { text?: string }[]> };
function contexte(m: Memory | null): string {
  const t = m?.totehm ?? {};
  const part = (k: string, label: string) => {
    const l = (t[k] ?? []).map((x) => clean(x?.text, 120)).filter(Boolean).slice(0, 12);
    return l.length ? `${label}: ${l.join(" | ")}` : "";
  };
  return [part("habits", "My habits"), part("objectives", "My objectives"), part("repulsions", "My repulsions"),
          part("visions", "My visions"), part("wisdom", "My wisdom")].filter(Boolean).join("\n").slice(0, 3000);
}

async function reflect(key: string, ctx: string, history: { role: string; text: string }[], text: string) {
  const messages = [
    { role: "system", content: SYSTEM + (ctx ? `\n\nThe member's TOTEHM (their own words):\n${ctx}` : "") },
    ...history.map((h) => ({ role: h.role === "me" ? "user" : "assistant", content: h.text })),
    { role: "user", content: text },
  ];
  for (const model of MODELS) {
    const raisonne = /^(gpt-5|o\d)/.test(model);
    const body: Record<string, unknown> = {
      model, messages, response_format: { type: "json_schema", json_schema: SCHEMA },
      max_completion_tokens: raisonne ? 1600 : 300,
    };
    if (raisonne) body.reasoning_effort = "low"; else body.temperature = 0.7;
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = (await r.text()).slice(0, 240);
      console.error("[higher-self] openai", model, r.status, t);
      // Modèle absent ou paramètre refusé pour ce modèle : le suivant.
      if (r.status === 404 || (r.status === 400 && /model|parameter|unsupported/i.test(t))) continue;
      return null;
    }
    const d = await r.json();
    try {
      const p = JSON.parse(d.choices?.[0]?.message?.content ?? "{}");
      const kind = (KINDS as readonly string[]).includes(p.kind) ? p.kind : "habit";
      const out = clean(p.text, 400).replace(/^["“«]+|["”»]+$/g, "");
      if (out) { console.log(JSON.stringify({ evt: "sm", model, in: d.usage?.prompt_tokens, out: d.usage?.completion_tokens })); return { kind, text: out }; }
    } catch (_) { /* illisible : le modèle suivant */ }
  }
  return null;
}

Deno.serve(async (req) => {
  const headers = { ...corsHeaders(req.headers.get("origin"), SITE_COM), "Cache-Control": "no-store" };
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const { data: { user }, error: authErr } = await admin.auth.getUser(auth.replace("Bearer ", ""));
  if (authErr || !user) return json({ error: "no_session" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { return json({ error: "bad_request" }, 400); }

  // L'accès, relu SOUS la session du membre : la même règle que partout.
  const viewer = createClient(URL_SB, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: acc, error: aErr } = await viewer.rpc("totehmbot_access");
  if (aErr) { console.error("[higher-self] access", aErr.message); return json({ error: "unavailable" }, 503); }
  if (acc?.active !== true) return json({ error: "higher_required" }, 402);

  if (body.action === "say") {
    const text = clean(body.text, 600);
    if (text.length < 2) return json({ error: "empty" }, 422);
    const since = new Date(Date.now() - 864e5).toISOString();
    const { count, error: cErr } = await admin.from("sm_messages").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("role", "me").gte("created_at", since);
    if (cErr) { console.error("[higher-self] count", cErr.message); return json({ error: "unavailable" }, 503); }
    if ((count ?? 0) >= LIMIT) return json({ error: "quota", limit: LIMIT }, 429);

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) { console.error("[higher-self] OPENAI_API_KEY absente"); return json({ error: "unavailable" }, 503); }
    const [{ data: mem, error: mErr }, { data: last, error: lErr }] = await Promise.all([
      admin.rpc("_bot_memory", { p_user: user.id }),
      admin.from("sm_messages").select("role, text").eq("user_id", user.id).order("id", { ascending: false }).limit(6),
    ]);
    if (mErr) console.error("[higher-self] memory", mErr.message);
    if (lErr) console.error("[higher-self] history", lErr.message);

    const r = await reflect(key, contexte(mem as Memory), (last ?? []).slice().reverse(), text);
    if (!r) return json({ error: "unavailable" }, 503);

    const { data: rows, error: iErr } = await admin.from("sm_messages").insert([
      { user_id: user.id, role: "me", text },
      { user_id: user.id, role: "sm", kind: r.kind, text: r.text },
    ]).select("id, role, kind, text, created_at");
    if (iErr) { console.error("[higher-self] insert", iErr.message); return json({ error: "unavailable" }, 503); }
    const me = rows?.find((x) => x.role === "me"), sm = rows?.find((x) => x.role === "sm");
    const shape = (x: typeof me) => x && { id: x.id, role: x.role, kind: x.kind, text: x.text, at: x.created_at };
    return json({ ok: true, me: shape(me), sm: shape(sm), left: Math.max(0, LIMIT - (count ?? 0) - 1) });
  }

  if (body.action === "telegram") {
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id <= 0) return json({ error: "not_found" }, 404);
    const [{ data: m }, { data: p }] = await Promise.all([
      admin.from("sm_messages").select("text").eq("id", id).eq("user_id", user.id).eq("role", "sm").maybeSingle(),
      admin.from("profiles").select("telegram_id").eq("id", user.id).maybeSingle(),
    ]);
    if (!m) return json({ error: "not_found" }, 404);
    if (!p?.telegram_id) return json({ error: "not_linked" }, 409);
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!token) { console.error("[higher-self] TELEGRAM_BOT_TOKEN absente"); return json({ error: "unavailable" }, 503); }
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: p.telegram_id, text: m.text }),
    });
    if (!r.ok) { console.error("[higher-self] telegram", r.status); return json({ error: r.status === 403 ? "blocked" : "unavailable" }, 502); }
    return json({ ok: true });
  }

  return json({ error: "action" }, 400);
});
