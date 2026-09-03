import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, SITE_SPACE } from "../_shared/origins.ts";

// generate_objective — My next objective (le futur du Totehm)
//
// v26 — SEPT HABITUDES, COMPLÉMENTAIRES, NOTÉES SUR 100.
//
// Ce qui change, et pourquoi :
//
// 1. SEPT au lieu de trois ou quatre. Le brief veut sept habitudes
//    hautement vérifiables. Les limites par champ ont été RESSERRÉES dans
//    la même passe : `why` en une phrase, `reasoning` en deux, UNE source.
//    Sans ça, sept habitudes doublaient le budget de sortie — mesuré à
//    ~7 s en anglais et ~42 s en français pour QUATRE. Sept verbeuses
//    seraient sorties du temps d'attente acceptable et auraient déclenché
//    la troncature (`finish_reason === "length"`), qui rend un JSON
//    illisible et fait payer les tokens pour rien.
//
// 2. EXCLUSIONS. Le client envoie les habitudes déjà posées dans le
//    Totehm. Le modèle doit proposer autre chose : strictement
//    complémentaire, jamais une reformulation. Sans cette liste le
//    générateur reproposait ce que la personne faisait déjà — le serveur
//    ne peut pas deviner un Totehm qu'il ne voit pas.
//
// 3. SCORE 0-100. Les trois paliers restent calculés (ils servent le
//    raisonnement du modèle) mais ne s'affichent plus : un nombre se
//    compare sans apprendre de vocabulaire.
//
// ÉCONOMIE — on ne paie jamais deux fois le même objectif :
//   couche 1  hash (langue + objectif normalisé + empreinte du profil)
//   couche 2  voisin sémantique pgvector — UNIQUEMENT sans exclusions
//   couche 3  conception + notation + rapport en UN SEUL appel, puis cache
//
//   La couche 2 est volontairement coupée dès qu'il y a des exclusions :
//   un voisin sémantique a été conçu pour UN AUTRE profil, ses habitudes
//   ne sont complémentaires de rien. Servir ce cache-là, c'est renvoyer
//   une réponse fausse pour économiser un dixième de centime.
//
//   Coût mesuré par génération (gpt-4o-mini) : ~1,2 k tokens d'entrée et
//   ~2,8 k de sortie, soit ~0,0019 $. À 1 000 membres × 3 générations par
//   mois : ~5,70 $/mois, contre un ARPU de 6,75 €/mois. Le poste n'est pas
//   un risque tant que le débit par IP tient.

const FREQ_IDS = [
  "every_minute","hourly","several_daily","every_morning","every_afternoon","daily",
  "every_evening","every_weekday","every_night","every_other_day","twice_week",
  "every_weekend","weekly","every_monday","every_tuesday","every_wednesday",
  "every_thursday","every_friday","every_saturday","every_sunday","biweekly",
  "twice_month","monthly","every_1st_month","every_15th_month","seasonal",
  "quarterly","semiannual","yearly","every_birthday","every_newyear","randomly","sometimes"
];
const INTENTS = ["fight","flow","enrich","love","express","focus","celebrate"];
const LEVELS  = ["essential","recommended","experimental"];

const WANT_MIN = 3;    // en dessous, on préfère trois solides à sept remplies de vide
const WANT_MAX = 7;

const CHAT_MODEL  = Deno.env.get("OBJECTIVE_MODEL") ?? "gpt-4o-mini";
const EMBED_MODEL = "text-embedding-3-small";
const SIM_THRESHOLD = Number(Deno.env.get("OBJECTIVE_SIM_THRESHOLD") ?? "0.72");
const RATE_LIMIT  = Number(Deno.env.get("OBJECTIVE_RATE_LIMIT") ?? "30");
const RATE_WINDOW = 3600;

// Hors alphabet latin, un même texte coûte 2 à 3 fois plus de tokens.
const WIDE = new Set(["zh","ja","ko","ru","ar","he","hi","th","el"]);
const RTL  = new Set(["ar","he","fa","ur","ps","sd","yi","dv","ckb"]);

// CORS restreint aux domaines TOTEHM. Wildcard '*' aurait laissé n'importe
// quel site appeler la fonction — coût OpenAI ~0,002 $ par appel, la facture
// serait pour Wah. `corsHeaders` importé de _shared/origins.ts, même pattern
// que higher-checkout, stripe-webhook, higher-map. `json()` est construit
// dans Deno.serve, closed over l'origine du requester.

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/^(i\s+(want|wanna|need|would\s+like)\s+to|i'?d\s+like\s+to|je\s+(veux|voudrais|souhaite))\s+/i, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const STOP: Record<string, string[]> = {
  fr: ["je","tu","mon","ma","mes","un","une","des","le","la","les","du","de","etre","être","avoir","plus","pour","avec","dans","sur","bon","bonne","meilleur","devenir","faire","mieux","chaque","jour","ne","pas","et"],
  es: ["yo","mi","un","una","los","las","del","ser","estar","para","con","mejor","cada","hacer","dia","día","mas","más","quiero","y"],
  pt: ["eu","meu","minha","um","uma","dos","das","ser","estar","para","com","melhor","cada","fazer","dia","mais","quero","e"],
  de: ["ich","mein","meine","ein","eine","der","die","das","und","fur","für","mit","werden","sein","besser","jeden","tag","will","zu"],
  it: ["io","mio","mia","un","una","del","della","essere","per","con","migliore","ogni","fare","giorno","piu","più","voglio","e"],
  nl: ["ik","mijn","een","de","het","en","voor","met","worden","zijn","beter","elke","dag","wil"],
  pl: ["ja","moj","mój","moja","i","w","na","do","byc","być","lepszy","kazdy","każdy","dzien","dzień","chce","chcę"],
  tr: ["ben","benim","bir","ve","icin","için","ile","olmak","daha","her","gun","gün","istiyorum"],
  en: ["i","my","a","an","the","to","be","get","become","better","every","day","want","more","with","for","and"],
};
function langBucket(raw: string): string {
  if (/[\u4e00-\u9fff]/.test(raw)) return "zh";
  if (/[\u3040-\u30ff]/.test(raw)) return "ja";
  if (/[\uac00-\ud7af]/.test(raw)) return "ko";
  if (/[\u0400-\u04ff]/.test(raw)) return "ru";
  if (/[\u0600-\u06ff]/.test(raw)) return "ar";
  if (/[\u0590-\u05ff]/.test(raw)) return "he";
  if (/[\u0900-\u097f]/.test(raw)) return "hi";
  if (/[\u0e00-\u0e7f]/.test(raw)) return "th";
  if (/[\u0370-\u03ff]/.test(raw)) return "el";
  const t = " " + raw.toLowerCase().replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ") + " ";
  let best = "en", score = 0;
  for (const [code, words] of Object.entries(STOP)) {
    let n = 0;
    for (const w of words) if (t.includes(" " + w + " ")) n++;
    if (n > score) { score = n; best = code; }
  }
  return best;
}

const URL_OK = /^https:\/\/([a-z0-9-]+\.)*(doi\.org|who\.int|nice\.org\.uk|cochranelibrary\.com|ncbi\.nlm\.nih\.gov|nih\.gov|cdc\.gov|nhs\.uk)\//i;
const UI_KEYS = ["why","close","s_why","s_reason","s_conf","s_src","validated","no_why","no_src"];

const SCHEMA = {
  name: "graded_habits",
  strict: true,
  schema: {
    type: "object", additionalProperties: false, required: ["lang", "ui", "habits"],
    properties: {
      lang: { type: "string", description: "ISO 639-1 code of the language used in the answer" },
      ui: {
        type: "object", additionalProperties: false, required: UI_KEYS,
        properties: {
          why:       { type: "string", description: "button opening the report, e.g. 'Why'" },
          close:     { type: "string", description: "button closing the report, e.g. 'Close'" },
          s_why:     { type: "string", description: "section heading: why this habit" },
          s_reason:  { type: "string", description: "section heading: reasoning" },
          s_conf:    { type: "string", description: "section heading: confidence" },
          s_src:     { type: "string", description: "section heading: sources" },
          validated: { type: "string", description: "short status line, e.g. 'validated - accept what feels true'" },
          no_why:    { type: "string", description: "fallback: no rationale returned" },
          no_src:    { type: "string", description: "fallback: no source returned" }
        }
      },
      habits: {
        type: "array",
        items: {
          type: "object", additionalProperties: false,
          required: ["text","f","f_label","i","level","level_label","score","why","reasoning","confidence","stoner","sources"],
          properties: {
            text:        { type: "string" },
            f:           { type: "string", enum: FREQ_IDS },
            f_label:     { type: "string" },
            i:           { type: "string", enum: INTENTS },
            level:       { type: "string", enum: LEVELS },
            level_label: { type: "string" },
            score:       { type: "integer", description: "0-100. How strongly the evidence supports THIS habit for THIS objective, combined with how verifiable it is. 90+ only for strong consensus AND a habit whose completion is objectively checkable." },
            why:         { type: "string" },
            reasoning:   { type: "string" },
            confidence:  { type: "string" },
            stoner:      { type: "boolean", description: "true only if the habit IS a trained mental-performance practice: meditation, breathwork, mindfulness, visualisation, body scan. False for physical exercise, diet, sleep hygiene, study or social habits." },
            sources: {
              type: "array",
              items: {
                type: "object", additionalProperties: false,
                required: ["title","ref","url"],
                properties: { title: { type: "string" }, ref: { type: "string" }, url: { type: "string" } }
              }
            }
          }
        }
      }
    }
  }
};

function sysPrompt(exclude: string[]): string {
  const base = `You are TOTEHM's habit designer AND its evidence reviewer. You do both jobs in a single pass.

LANGUAGE — THIS RULE OVERRIDES EVERYTHING ELSE.
Detect the language the user wrote their objective in, and write EVERY piece of text you produce in that exact language: habit names, f_label, level_label, why, reasoning, confidence, source titles, and every string inside "ui". If the objective is in Greek, answer entirely in Greek. If in Polish, entirely in Polish. Never default to English unless the user wrote in English. Set "lang" to the ISO 639-1 code of that language.
Only the machine-readable ids stay in English: f, i and level.

STEP 1 — Design ${WANT_MAX} habits that genuinely move the user's objective forward.
STEP 2 — HIGHLY VERIFIABLE ONLY. Every habit must be one a person can answer "did I do it, yes or no" about, at the end of the period, without interpretation. "Sleep better" is not verifiable. "Go to bed before 23:00" is. "Be more social" is not. "Call one friend" is. Reject any habit that cannot be checked off objectively, and design another in its place.
STEP 3 — Review each one against what the scientific and clinical literature actually says. Drop any habit nothing solid supports. ${WANT_MIN} well-grounded habits beat ${WANT_MAX} weak ones: if you cannot ground ${WANT_MAX}, return fewer. Never pad the list.
STEP 4 — Grade what survives:
  essential    = strong consensus; the objective is hard to reach without it.
  recommended  = solid evidence, but conditional on context or on the person's profile.
  experimental = limited, emerging or conflicting evidence.
STEP 5 — Give each habit a score from 0 to 100 combining evidence strength and verifiability. Spread the scores: two habits should rarely share the same number. 90+ is reserved for strong consensus AND objectively checkable.
STEP 6 — Write the report for each survivor: why it serves THIS objective, the reasoning, the confidence and what grounds it, and the main source.

BE COMPACT. This is a phone screen and every extra word costs the user waiting time. Respect these limits strictly:
- text: imperative sentence, MAX 60 characters.
- why: ONE short sentence.
- reasoning: MAX 2 short sentences.
- confidence: ONE short sentence.
- sources: EXACTLY 1 entry per habit. Never 2 or more.
- ui strings: 1 to 4 words each.
- Return ${WANT_MAX} habits when the evidence allows it, never more. Never fewer than ${WANT_MIN}.

Other rules:
- f: exactly one id from: ${FREQ_IDS.join(", ")}.
- f_label: that same frequency written naturally in the user's language, 1-3 words, lowercase.
- i: exactly one of: fight (hard effort), flow (movement), enrich (wealth/network), love (connection/beauty), express (creation), focus (deep mental work), celebrate (collective energy).
- stoner: true ONLY when the habit itself is a trained mental-performance practice — meditation, breathwork, mindfulness, visualisation, body scan, focused attention training. False for physical exercise, nutrition, sleep hygiene, reading, studying or social habits. Judge the practice, not the goal: running to clear your head is false, sitting to breathe is true.
- level_label: the level name in the user's language (French: Essentiel / Recommandé / Expérimental).
- sources: title = the study, guideline or body. ref = short bibliographic reference (authors, journal, year) or the issuing organisation. Never put a bare URL in ref. Author names and journal titles keep their original spelling and script.
- NEVER invent a source. Cite landmark studies, meta-analyses or official guidelines you are genuinely confident exist. A well-known guideline beats an obscure paper you half-remember.
- Leave url as an empty string unless it is a canonical, stable address you are certain of (DOI, WHO, NICE, Cochrane, PubMed, CDC, NHS).
- If you cannot ground a habit in anything real, drop it rather than grade it low.`;

  if (!exclude.length) return base;

  // Le profil est envoyé au modèle en clair : c'est ce qui rend la
  // complémentarité possible. Rien n'en est stocké côté serveur.
  return base + `

ALREADY IN THIS PERSON'S TOTEHM — DO NOT PROPOSE THESE, NOR ANY REPHRASING OF THEM:
${exclude.map(h => "- " + h).join("\n")}

Every habit you return must be STRICTLY COMPLEMENTARY to that list: a different action, on a different lever, that adds something the list does not already cover. If one of your candidates is the same act said differently — same verb, same object, different words — discard it and design another. Do not comment on the existing list; do not mention it in any output field.`;
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req.headers.get("origin"), SITE_SPACE);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: cors });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "generation engine not configured", code: "NO_KEY" }, 503);

  let objective = "";
  let exclude: string[] = [];
  try {
    const body = await req.json();
    objective = String(body?.objective || "").slice(0, 300).trim();
    if (Array.isArray(body?.exclude)) {
      exclude = body.exclude
        .map((h: unknown) => String(h ?? "").trim().slice(0, 90))
        .filter((h: string) => h.length > 1)
        .slice(0, 40);
    }
  } catch (_) { /* corps vide */ }
  if (objective.length < 4) return json({ error: "objective too short" }, 400);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const norm = normalize(objective);
  const bucket = langBucket(objective);
  // L'empreinte du profil entre dans la clé de cache. Sans elle, deux
  // personnes aux Totehms opposés recevaient la même liste — et la
  // promesse de complémentarité était fausse pour l'une des deux.
  const fp = exclude.length
    ? await sha256([...exclude.map(normalize)].sort().join("|"))
    : "";
  const hash = await sha256(bucket + "|" + norm + (fp ? "|" + fp.slice(0, 16) : ""));
  const dir = (l: string) => (RTL.has(l) ? "rtl" : "ltr");

  // COUCHE 1 — même objectif, même profil, déjà payé : gratuit, instantané
  try {
    const { data } = await sb.rpc("hit_objective_cache", { p_hash: hash });
    if (data?.habits) {
      const l = data.lang || bucket;
      return json({ habits: data.habits, lang: l, dir: dir(l), ui: data.ui || {}, cached: "exact" });
    }
  } catch (_) { /* le cache ne doit jamais bloquer une réponse */ }

  // Débit : l'endpoint est public, la facture ne doit pas l'être
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  try {
    const { data: allowed } = await sb.rpc("bump_objective_rate", {
      p_key: ip, p_limit: RATE_LIMIT, p_window: RATE_WINDOW,
    });
    if (allowed === false) return json({ error: "too many objectives, try again later", code: "RATE" }, 429);
  } catch (_) { /* en cas de panne du compteur, on laisse passer */ }

  // COUCHE 2 — reformulation déjà payée, DANS LA MÊME LANGUE.
  // Coupée dès qu'il y a un profil : un voisin sémantique a été conçu
  // pour quelqu'un d'autre, ses habitudes ne complètent pas ce Totehm-ci.
  let embedding: number[] | null = null;
  if (!exclude.length) {
    try {
      const er = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: EMBED_MODEL, input: norm }),
      });
      if (er.ok) {
        embedding = (await er.json())?.data?.[0]?.embedding ?? null;
        if (embedding) {
          const { data: near } = await sb.rpc("match_objective", {
            query_embedding: JSON.stringify(embedding), match_threshold: 0, p_lang_bucket: bucket,
          });
          const hit = Array.isArray(near) ? near[0] : null;
          if (hit) {
            console.log(JSON.stringify({ evt: "sim", bucket, best: hit.similarity, threshold: SIM_THRESHOLD }));
            if (hit.similarity >= SIM_THRESHOLD && hit.habits) {
              await sb.rpc("touch_objective_cache", { p_id: hit.id });
              const l = hit.lang || bucket;
              return json({ habits: hit.habits, lang: l, dir: dir(l), ui: hit.ui || {}, cached: "semantic" });
            }
          }
        }
      }
    } catch (_) { /* pas d'embedding : on génère, c'est tout */ }
  }

  // COUCHE 3 — un seul appel : conception + vérification + notation.
  // Le budget monte parce qu'il y a sept habitudes, mais les champs ont été
  // resserrés dans la même passe : le volume de sortie reste du même ordre
  // qu'avec quatre habitudes verbeuses, et le temps d'attente avec lui.
  const budget = WIDE.has(bucket) ? 5200 : 3200;
  const t0 = Date.now();
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.6,
      max_tokens: budget,
      response_format: { type: "json_schema", json_schema: SCHEMA },
      messages: [{ role: "system", content: sysPrompt(exclude) }, { role: "user", content: objective }],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    return json({ error: "openai error", detail: t.slice(0, 300) }, 502);
  }

  const data = await r.json();
  const finish = data.choices?.[0]?.finish_reason;
  console.log(JSON.stringify({
    evt: "gen", bucket, budget, finish, ms: Date.now() - t0,
    excl: exclude.length, out: data.usage?.completion_tokens,
  }));

  // Tronqué = JSON illisible. On le dit au lieu de renvoyer un silence.
  if (finish === "length") {
    return json({ error: "answer truncated for this language", code: "TRUNCATED", lang: bucket }, 502);
  }

  const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  const LEVEL_SCORE: Record<string, number> = { essential: 95, recommended: 80, experimental: 62 };

  let habits: unknown[] = [];
  let lang = bucket;
  const ui: Record<string, string> = {};
  try {
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    lang = (str(parsed.lang, 8).toLowerCase().split(/[-_]/)[0]) || bucket;
    for (const k of UI_KEYS) {
      const v = str(parsed.ui?.[k], 80);
      if (v) ui[k] = v;
    }
    habits = (parsed.habits || [])
      .filter((h: any) => h && typeof h.text === "string"
        && FREQ_IDS.includes(h.f) && INTENTS.includes(h.i) && LEVELS.includes(h.level))
      .slice(0, WANT_MAX)
      .map((h: any) => {
        // Un score hors bornes ou absent est ramené au palier : le front
        // n'affiche QUE le score, il ne doit jamais tomber sur un trou.
        const raw = typeof h.score === "number" && isFinite(h.score)
          ? h.score : LEVEL_SCORE[h.level] ?? 60;
        return {
          text: str(h.text, 80),
          f: h.f,
          f_label: str(h.f_label, 40),
          i: h.i,
          level: h.level,
          level_label: str(h.level_label, 40),
          score: Math.max(0, Math.min(100, Math.round(raw))),
          why: str(h.why, 400),
          reasoning: str(h.reasoning, 900),
          confidence: str(h.confidence, 300),
          stoner: h.stoner === true,
          sources: (Array.isArray(h.sources) ? h.sources : [])
            .slice(0, 2)
            .map((s: any) => {
              const url = str(s?.url, 300);
              return { title: str(s?.title, 200), ref: str(s?.ref, 200), url: URL_OK.test(url) ? url : "" };
            })
            .filter((s: any) => s.title || s.ref),
        };
      })
      .sort((a: any, b: any) => b.score - a.score);
  } catch (_) { /* réponse illisible : liste vide plutôt qu'une erreur */ }

  if (habits.length) {
    try {
      await sb.from("objective_cache").upsert({
        norm_hash: hash, norm, objective, habits, model: CHAT_MODEL,
        lang, lang_bucket: bucket, ui,
        // L'embedding n'est écrit QUE pour les réponses sans profil :
        // la couche 2 doit rester un cache objectif -> habitudes, jamais
        // un cache du Totehm de quelqu'un d'autre.
        embedding: embedding ? JSON.stringify(embedding) : null,
      }, { onConflict: "norm_hash" });
    } catch (_) { /* un cache qui échoue ne doit pas casser la réponse */ }
  }

  return json({ habits, lang, dir: dir(lang), ui, cached: "none" });
});
