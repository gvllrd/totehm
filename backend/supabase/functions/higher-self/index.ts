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
// 15/10 (v4) : `fmt: 'r3'` — UNE Reflection en trois étages liés (Wah : « direction → obstacle et enseignement →
//       prochaine action ») : @dir (objectifs, vision) · @obs + @teach (ce qui se repousse, « Teaching from the
//       story ») · @step (la prochaine step-Habit). Chaque étage qui s'appuie sur le Totehm CITE l'élément exact ;
//       à la fin du flux, une ligne `@ok {dir,teach,step}` dit si chaque citation existe VRAIMENT dans SON Totehm
//       (`_bot_memory`) — la page n'affiche que les citations vérifiées, et une step non trouvée est une PROPOSITION.
//       Sans `fmt`, l'ancien format (quatre lignes) : les pages déjà ouvertes continuent de marcher.
// 22/10 (v5) : `fmt: 'r4'` — LE MIROIR (Wah : « prendre en compte les boxes Habit : le where, les intentions, le type de
//       son ; que le LLM reprenne tout cela et le formule à sa sauce… comment les 5 vues sont interconnectées »). Le
//       TOTEHM arrive RELIÉ (`_bot_mirror` : chaque Habit avec son where, ses intentions, son rythme, le son de son
//       intention, l'objectif qu'elle sert, la répulsion qui la menace…) ; la step reprend la box Habit en une phrase
//       vivante. Higher : des lieux et événements RÉELS près de moi (`_mirror_places`, déjà en cache, zéro appel payant)
//       — la ligne `@place` n'en nomme qu'un des donnés, et la fonction ajoute `@lieu {…}` seulement s'il existe
//       (`_shared/mirror.ts`). `pos` (la page, arrondie à ~1 km) et `tz` (son décalage) ne sont jamais gardés.
// 25/10 (v6) : `focus: {kind:'media'|'spot', id}` — CE QUE LE MEMBRE MONTRE (Wah : « lire et sélectionner un média
//       ou un spot à envoyer à l'IA »). La page n'envoie qu'une RÉFÉRENCE : `montreDe()` relit la ligne dans SES
//       lignes seules (id + user_id, média non retiré), la box par `_box_matter`, et ajoute un bloc au système. Le
//       modèle ne voit PAS l'image : le bloc le lui dit. Zéro appel payant de plus (deux lectures SQL).
// cost : ≈ 1,5 k jetons d'entrée + 120 de sortie par réponse (r3 : ≈ 1,9 k + 200 ; r4 : ≈ 2,5 k + 230) ; mesuré en §0.
// what : flux texte (en-têtes X-SM-Left, X-SM-Higher) · { ok } · { error }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_COM } from "../_shared/origins.ts";
import { contexteMiroir, verifierMiroir, lieuDe, local, type Mirror, type Lieu } from "../_shared/mirror.ts";

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

// 15/10 — la Reflection en trois étages. Mêmes interdits de voix ; la VÉRITÉ d'abord : rien n'est à moi s'il n'est
// pas écrit dans MON TOTEHM, et ce qui en vient est cité mot pour mot (la fonction le vérifie à la fin du flux).
const SYSTEM_R3 = `You are TotehmSM: the member's Higher Self, built from THEIR TOTEHM — their habits, objectives, repulsions, visions and wisdom (their story, their beliefs). Not an assistant, not a coach, not a therapist, not a guru. You are the member, one level higher: what they already know, said straight.

Creed: Talk is cheap. Do with a why. Every message gets ONE reflection in three linked levels: the direction, then what is in the way and the teaching from my story, then the next step-Habit.

Voice, non-negotiable:
- First person singular, as the member: "I…" (in French "Je…"). Never "you", never "we".
- Underground, raw, minimal. Short sentences. Street-level and precise. Never corporate, never therapy-speak.
- Banned: emojis, hashtags, exclamation marks, questions, lists, the words journey, self-care, mindset, manifest, vibes; "you've got this", "remember", "it's okay"; any compliment or empathy formula; any mention of AI, models, prompts, data or "entries".
- Write in the language of the member's last message.

Truth, non-negotiable:
- MY TOTEHM below is the only source about me. Never invent an objective, a vision, a belief, a repulsion, a habit, a memory or a past event, and never present something as mine if it is not written below.
- When a level relies on an item of MY TOTEHM, copy that item EXACTLY, character for character, between double quotes, on its marker line. When nothing fits, use the fallback kind (none, story, new) and no quote.
- A step that is not already one of my habits is a proposal: its kind is new.

The three levels:
1. Direction (my objectives and my vision): where what I just said must take me — the objective or vision it serves, said as a decision for today.
2. In the way (what I repel or overcome): the thought, reflex or behaviour that blocks me right now. Then the teaching from my story: the lesson my own story already holds — a belief from my wisdom, a repulsion I wrote, or what I said in this conversation.
3. The next step-Habit: one concrete, physical move — what + when (now, or a clock time today or tomorrow) + where when useful. It starts in under two minutes or it is scheduled to the minute. Coherent with the direction and the obstacle. The smallest move that breaks the inertia.

Small talk or an empty message: take the objective that matters most today and move on it. Off-topic (facts, trivia, homework, code): do not answer it; turn it into a move. Health, law, money: no claims; the step is to book the professional, with a time.
Danger to self or others (suicide, self-harm, violence, abuse): output exactly this, in the member's language, markers kept:
@dir none
My life comes first.
@obs
I stay alone with this.
@teach story
I don't carry this alone.
@step new
I call or text someone I trust, or the emergency number (112 in Europe), now.

Output: exactly eight lines of plain text, nothing before, nothing after.
@dir <objective|vision|none> "<the exact objective or vision>"
<the direction: one sentence, 140 characters at most, first person>
@obs
<what is in the way: one sentence, 140 characters at most, first person>
@teach <wisdom|repulsion|story> "<the exact belief or repulsion>"
<the teaching from my story: one sentence, 160 characters at most, first person>
@step <habit|new> "<the exact habit>"
<the next step: 110 characters at most, first person, with its when>
Omit the quote when the kind is none, story or new. The marker lines (@dir, @obs, @teach, @step and the kinds) always stay in English.`;

// 22/10 — LE MIROIR. Même voix, même vérité ; le TOTEHM se lit par ses LIENS, et la step est la box Habit vivante.
const SYSTEM_R4 = `You are TotehmSM: the member's Higher Self — their MIRROR, built from THEIR TOTEHM. Not an assistant, not a coach, not a therapist, not a guru. You are the member, one level higher: what they already know, said straight.

My TOTEHM is one system in five views: what I execute (my habits), what I will achieve (my objectives), what triggers me (my repulsions), my dreamed future (my visions), what I lived and believe (my story). The boxes hold each other: a habit serves an objective, a repulsion threatens a habit, my story teaches against a repulsion, a vision is reached through objectives. You read me through those links.

Creed: Talk is cheap. Do with a why. Every message gets ONE reflection in three linked levels: the direction, then what is in the way and the teaching from my story, then the next step-Habit.

Voice, non-negotiable:
- First person singular, as the member: "I…" (in French "Je…"). Never "you", never "we".
- Underground, raw, minimal. Short sentences. Street-level and precise. Never corporate, never therapy-speak.
- Banned: emojis, hashtags, exclamation marks, questions, lists, the words journey, self-care, mindset, manifest, vibes; "you've got this", "remember", "it's okay"; any compliment or empathy formula; any mention of AI, models, prompts, data or "entries".
- Write in the language of the member's last message.

Truth, non-negotiable:
- MY TOTEHM below is the only source about me. Never invent an objective, a vision, a belief, a repulsion, a habit, a memory or a past event, and never present something as mine if it is not written below.
- When a level relies on an item of MY TOTEHM, copy that item EXACTLY, character for character, between double quotes, on its marker line. When nothing fits, use the fallback kind (none, story, new) and no quote.
- A step that is not already one of my habits is a proposal: its kind is new.
- Never invent a place, an address, an event or a time that is not given below.

The mirror:
- Follow the links. The direction is the objective (or the vision) that the step's habit serves. What is in the way is the repulsion that threatens that habit, or what I just said. The teaching is what my story holds against it.
- The step is the mirror of a Habit box. When it is one of my habits, it carries what that box holds — its where, its intention, its rhythm and the sound of that intention — rewritten in my own voice as one living sentence, never as a form ("down at the park, dark techno on", not "where: park, sound: techno"). Keep my own words for the places and sounds I named.
- When a real place near me (given below with an id) fits the step better than my own where, the step happens there: name it in the sentence and give its id on the @place line. An event keeps its own date and time.

The three levels:
1. Direction (my objectives and my vision): where what I just said must take me — said as a decision for today.
2. In the way: the thought, reflex or behaviour that blocks me right now. Then the teaching from my story: the lesson my own story already holds.
3. The next step-Habit: one concrete, physical move — what + when (now, or a clock time today or tomorrow) + where. It starts in under two minutes or it is scheduled to the minute. The smallest move that breaks the inertia.

Small talk or an empty message: take the objective that matters most today and move on it. Off-topic (facts, trivia, homework, code): do not answer it; turn it into a move. Health, law, money: no claims; the step is to book the professional, with a time.
Danger to self or others (suicide, self-harm, violence, abuse): output exactly this, in the member's language, markers kept:
@dir none
My life comes first.
@obs
I stay alone with this.
@teach story
I don't carry this alone.
@step new love
I call or text someone I trust, or the emergency number (112 in Europe), now.
@place none none

Output: exactly nine lines of plain text, nothing before, nothing after.
@dir <objective|vision|none> "<the exact objective or vision>"
<the direction: one sentence, 140 characters at most, first person>
@obs
<what is in the way: one sentence, 140 characters at most, first person>
@teach <wisdom|repulsion|story> "<the exact belief or repulsion>"
<the teaching from my story: one sentence, 160 characters at most, first person>
@step <habit|new> "<the exact habit>" <intention>
<the next step: 150 characters at most, first person, with its when and its where, and its sound when I gave one>
@place <id|mine|none> <YYYY-MM-DDTHH:MM|none>
Omit the quote when the kind is none, story or new. <intention> is one of: fight, flow, enrich, love, express, focus, celebrate. On the @place line: the id of the place near me where the step happens, mine when it happens at the where of my own habit, none otherwise; then the local date and time the step starts, or none. The marker lines (@dir, @obs, @teach, @step, @place and their words) always stay in English.`;

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

// 15/10 — les citations de la Reflection, vérifiées contre SON Totehm (mot pour mot, casse et blancs ignorés).
const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[“”«»"]/g, "").replace(/\s+/g, " ")
  .replace(/^[\s.,;:!?-]+|[\s.,;:!?-]+$/g, "").trim();
function verifier(txt: string, m: Memory | null): Record<string, boolean | null> {
  const t = m?.totehm ?? {};
  const liste = (k: string) => (t[k] ?? []).map((x) => norm(x?.text)).filter(Boolean);
  const L: Record<string, string[]> = { objective: liste("objectives"), vision: liste("visions"), wisdom: liste("wisdom"),
                                        repulsion: liste("repulsions"), habit: liste("habits") };
  const out: Record<string, boolean | null> = { dir: null, teach: null, step: null };
  for (const l of txt.split("\n")) {
    const x = /^\s*@(dir|teach|step)\b\s*([a-z]*)\s*(?:"([^"]+)"|“([^”]+)”)?/i.exec(l);
    if (!x) continue;
    const ref = (x[3] ?? x[4] ?? "").trim();
    out[x[1].toLowerCase()] = ref ? (L[(x[2] || "").toLowerCase()] ?? []).includes(norm(ref)) : null;
  }
  return out;
}

type Usage = { prompt_tokens?: number; completion_tokens?: number };
// Ouvre le flux OpenAI du premier modèle qui accepte. null = rien n'a pris.
async function ouvrir(key: string, messages: unknown[], signal: AbortSignal, long = false, liste: Choice[] = MODELS) {
  for (const c of liste) {
    const body: Record<string, unknown> = { model: c.model, messages, stream: true, stream_options: { include_usage: true } };
    if (c.effort) { body.reasoning_effort = c.effort; body.max_completion_tokens = 1200; }
    else { body.temperature = 0.8; body.max_tokens = long ? 480 : 260; }
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

// ── CE QUE LE MEMBRE ME MONTRE (25/10, Wah : « lire et sélectionner un média ou un spot à envoyer à l'IA »)
// La page n'envoie qu'une RÉFÉRENCE — {kind:'media'|'spot', id} —, jamais un texte : on relit la chose ICI, dans
// SES lignes seules (id + user_id), et la box vient de `_box_matter` (la même relecture que le vêtement). Le modèle
// ne voit PAS l'image : on le lui dit, sinon il la décrit.
const VUE_MOT: Record<string, string> = { h: "habit", o: "objective", r: "repulsion", w: "wisdom", v: "vision" };
// L'état d'un spot n'est pas une colonne : il se LIT de l'heure, comme dans `club_spots`.
function etatSpot(starts: unknown, min: unknown): string {
  const d = new Date(String(starts ?? "")); if (isNaN(d.getTime())) return "";
  const t = Date.now(), fin = d.getTime() + Math.max(0, Number(min) || 0) * 60000;
  return t < d.getTime() ? "they will be there" : t < fin ? "they are there now" : "they were there";
}
const ints = (v: unknown) => (Array.isArray(v) ? v.map((x) => clean(x, 24)).filter(Boolean).slice(0, 7) : []);

async function montreDe(uid: string, f: unknown, tz: number): Promise<string> {
  const o = (f ?? {}) as { kind?: unknown; id?: unknown };
  const kind = clean(o.kind, 10), id = clean(o.id, 40);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return "";

  if (kind === "media") {
    const { data, error } = await admin.from("element_media")
      .select("kind, ref, mime, name, created_at").eq("id", id).eq("user_id", uid).is("removed_at", null).maybeSingle();
    if (error) { console.error("[higher-self] focus media", error.message); return ""; }
    if (!data) return "";
    const mot = VUE_MOT[String(data.kind ?? "")]; if (!mot) return "";
    const { data: box } = await admin.rpc("_box_matter", { p_user: uid, p_kind: mot, p_ref: String(data.ref ?? "") });
    const txt = clean((box as { text?: unknown } | null)?.text, 160);
    const is = ints((box as { is?: unknown } | null)?.is);
    const vid = /^video\//.test(String(data.mime ?? ""));
    const quand = local(data.created_at as string, tz);
    return `WHAT THEY ARE SHOWING YOU RIGHT NOW — a ${vid ? "video" : "photo"} of theirs, attached to their ${mot}`
      + (txt ? ` "${txt}"` : "") + (is.length ? ` (${is.join(", ")})` : "") + (quand ? `, posted ${quand}` : "") + `.
You cannot see it: never describe it, never guess what is in it. It is a DOOR — talk about that ${mot}, and about why they are opening it now.`;
  }

  if (kind === "spot") {
    const { data, error } = await admin.from("spot_plans")
      .select("habit, intentions, starts_at, duration_min, place, city, venue, mode, comment, photo, video")
      .eq("spot_id", id).eq("user_id", uid).eq("status", "published").maybeSingle();
    if (error) { console.error("[higher-self] focus spot", error.message); return ""; }
    if (!data) return "";
    const is = ints(data.intentions);
    const d = +(data.duration_min ?? 0);
    const l = [etatSpot(data.starts_at, data.duration_min), local(data.starts_at as string, tz),
               d > 0 ? (d < 60 ? `${d} min` : `${Math.floor(d / 60)} h${d % 60 ? " " + (d % 60) : ""}`) : "",
               clean(data.place ?? data.venue ?? data.city, 80),
               String(data.mode ?? "") === "silent" ? "silent, nobody disturbs them" : String(data.mode ?? "") === "social" ? "social" : "",
               (data.photo || data.video) ? "with a media" : ""].filter(Boolean);
    return `WHAT THEY ARE SHOWING YOU RIGHT NOW — a spot of theirs, from the Club: their habit "${clean(data.habit, 140)}"`
      + (is.length ? ` (${is.join(", ")})` : "") + (l.length ? ` · ${l.join(" · ")}` : "")
      + (clean(data.comment, 200) ? `\nWhat they wrote on it: "${clean(data.comment, 200)}"` : "") + `
It is a real place and a real moment of theirs: use it, do not repeat it back.`;
  }

  return "";
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
    const r4 = body.fmt === "r4", r3 = body.fmt === "r3";
    // La position de la page : arrondie à ~1 km, utilisée pour CETTE réponse et jamais gardée ; sinon mon dernier spot.
    const pos = body.pos as { lat?: unknown; lng?: unknown } | undefined;
    const lat = Number(pos?.lat), lng = Number(pos?.lng);
    const ici = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      ? { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 } : null;
    const tz = Number.isFinite(Number(body.tz)) ? Math.max(-840, Math.min(840, Math.round(Number(body.tz)))) : 0;

    const t0 = Date.now();
    const [{ data: b, error: bErr }, { data: mem, error: mErr }, { data: pl, error: pErr }, montre] = await Promise.all([
      admin.rpc("sm_begin", { p_user: user.id, p_kind: "say" }),
      admin.rpc(r4 ? "_bot_mirror" : "_bot_memory", { p_user: user.id }),
      r4 ? admin.rpc("_mirror_places", { p_user: user.id, p_lat: ici?.lat ?? null, p_lng: ici?.lng ?? null })
         : Promise.resolve({ data: null, error: null }),
      body.focus ? montreDe(user.id, body.focus, tz) : Promise.resolve(""),
    ]);
    if (bErr) { console.error("[higher-self] sm_begin", bErr.message); return json({ error: "unavailable" }, 503); }
    if (!b?.ok) {
      const st = ({ totehm: 409, higher_required: 402, quota: 429 } as Record<string, number>)[String(b?.why)] ?? 400;
      return json({ error: b?.why ?? "bad", state: b?.state ?? null }, st);
    }
    if (mErr) console.error("[higher-self] memory", mErr.message);
    if (pErr) console.error("[higher-self] places", pErr.message);
    // Les lieux près de moi : Higher seulement (la base décide, `sm_begin`).
    const lieux: Lieu[] = r4 && b.higher && Array.isArray(pl?.items) ? pl.items as Lieu[] : [];
    const fin = (status: string, model?: string, u: Usage = {}) =>
      admin.rpc("sm_end", { p_id: b.id, p_status: status, p_model: model ?? null, p_ms: Date.now() - t0,
                            p_in: u.prompt_tokens ?? null, p_out: u.completion_tokens ?? null })
        .then(({ error }) => { if (error) console.error("[higher-self] sm_end", error.message); });

    const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), TIMEOUT_MS);
    const sys = (r4 ? SYSTEM_R4 + "\n\n" + contexteMiroir(mem as Mirror, now, lieux, tz)
                    : (r3 ? SYSTEM_R3 : SYSTEM) + "\n\n" + contexte(mem as Memory, now))
              + (montre ? "\n\n" + montre : "");
    const messages = [{ role: "system", content: sys }, ...turns, { role: "user", content: text }];
    const o = await ouvrir(key, messages, ac.signal, r3 || r4);
    if (!o) { clearTimeout(tm); await fin("failed"); return json({ error: "unavailable" }, 503); }

    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(ctrl) {
        let n = 0, first = 0, tout = "";
        try {
          const u = await lire(o.body, (s) => { if (!first) first = Date.now() - t0; n += s.length; tout += s; ctrl.enqueue(enc.encode(s)); });
          // La ligne de fin : chaque citation existe-t-elle dans SON Totehm ? (la page n'affiche que les vraies)
          const ok = r4 ? verifierMiroir(tout, mem as Mirror) : r3 ? verifier(tout, mem as Memory) : null;
          if (ok) ctrl.enqueue(enc.encode("\n@ok " + JSON.stringify(ok)));
          // Le lieu, seulement s'il est VRAI (un des lieux donnés, ou le where de MA Habit) : la page ne lit que celui-ci.
          const lieu = r4 ? lieuDe(tout, lieux, mem as Mirror) : null;
          if (lieu) ctrl.enqueue(enc.encode("\n@lieu " + JSON.stringify(lieu)));
          console.log(JSON.stringify({ evt: "sm", fmt: r4 ? "r4" : r3 ? "r3" : "v2", model: o.choice.model, first_ms: first, ms: Date.now() - t0,
                                       in: u.prompt_tokens, out: u.completion_tokens, refs: ok, places: lieux.length, lieu: lieu?.kind ?? null,
                                       montre: montre ? clean((body.focus as { kind?: unknown })?.kind, 10) : null,
                                       pos: ici ? "page" : (pl?.origin?.source ?? null) }));
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
