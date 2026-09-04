// TOTEHM · bot-reply v6 — TOTEHMBOT, LE TOTEHM DANS LA POCHE
// why  : Telegram n'accepte QU'UN webhook par bot. Le geste quotidien
//        (DONE/MISSED/WHY), la production de contenu (/spot) et la lecture
//        du monde (/tonight) vivent donc dans la MÊME fonction. Les séparer
//        demanderait un second bot, donc un second token, donc un second
//        compte à lier — pour rien.
// how  : la liaison d'abord, puis un brouillon en base pour tenir une
//        conversation à plusieurs temps. ZÉRO appel IA dans la boucle : la
//        position vient de Telegram, la décision vient de PostgreSQL, les
//        mots d'une Repulsion sont ceux du membre.
// what : 200 toujours — un 500 fait rejouer Telegram en boucle.
//
// CE QUI A CHANGÉ EN v5
//   1. /tonight — la Higher Map dans Telegram. Événements Ticketmaster et
//      lieux, autour de la position envoyée, rangés par les intentions du
//      Totehm. C'est la moitié « Ticketmaster » du produit, accessible sans
//      ouvrir un navigateur.
//   2. LA LIAISON ALLUME LE BOT. `totehms.bot` valait `false` pour tout le
//      monde et rien ne le passait à `true` : même réparé, le bot n'aurait
//      eu personne à servir. Lier TotehmBot EST la permission — on ne la
//      demande pas deux fois. /pause la retire.
//   3. /aide, /pause, /reprendre, /carte. Un bot sans liste de commandes
//      est un bot qu'on n'utilise qu'une fois.
//
// CE QUI A CHANGÉ EN v6 — le bot devient le PROLONGEMENT des quatre écrans
//   · Un bouton `web_app` ouvre HigherSelf DANS Telegram. C'est le Totehm
//     entier — habitudes avec leur série, leçons, objectifs, spots — sans
//     quitter la conversation. Un bouton, pas une explication.
//   · /moi rend le tracking : ce qui attend une réponse, les séries en
//     cours, la consistance. Déduit, jamais saisi.
//   · /wisdom et /objectif posent une leçon ou un objectif en une ligne.
//     Une idée se note là où elle arrive, pas là où il y a un écran.
//   · /spots cherche les lieux du Club autour de la position envoyée.
//
// verify_jwt = false — Telegram n'a pas de JWT Supabase. La sécurité vient
// de `TELEGRAM_WEBHOOK_SECRET`, vérifié ci-dessous.

import { createClient } from "npm:@supabase/supabase-js@2";
import { liveWarm, LIVE_RADIUS_M } from "../_shared/live.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const TG   = Deno.env.get("TELEGRAM_BOT_TOKEN");
const MAP  = "https://www.totehm.space/map";
const APP  = "https://www.totehm.space/higherself";
const ok   = () => new Response("ok", { status: 200 });

// Un bouton `web_app` ouvre une page DANS Telegram, plein écran, avec la
// session déjà là. C'est ce qui fait la différence entre « va sur le
// site » et « c'est ouvert ». Rien à configurer chez BotFather : la
// seule contrainte est le HTTPS.
const kbApp = (label = "Ouvrir mon Totehm") => ({
  inline_keyboard: [[{ text: label, web_app: { url: APP } }]],
});

async function tg(method: string, payload: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${TG}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) console.error("telegram", method, r.status, (await r.text()).slice(0, 200));
}

const say = (chat: string, text: string, markup?: unknown) =>
  tg("sendMessage", { chat_id: chat, text, reply_markup: markup });
const sayHtml = (chat: string, text: string, markup?: unknown) =>
  tg("sendMessage", {
    chat_id: chat, text, parse_mode: "HTML",
    link_preview_options: { is_disabled: true }, reply_markup: markup,
  });
const ack   = (id: string) => tg("answerCallbackQuery", { callback_query_id: id });
const strip = (chat: string, msg: number) =>
  tg("editMessageReplyMarkup",
     { chat_id: chat, message_id: msg, reply_markup: { inline_keyboard: [] } });

// Telegram en mode HTML n'accepte que <b> <i> <a> <code> : tout le reste
// doit être échappé, sinon un titre de concert contenant « & » fait
// échouer l'envoi entier — et le membre ne reçoit rien du tout.
const esc = (s: unknown) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ═══ LES SEPT ═══ copiées, jamais partagées : trois origines, trois copies.
const INTS: Array<{ id: string; name: string }> = [
  { id: "fight",     name: "Fight" },
  { id: "flow",      name: "Flow" },
  { id: "enrich",    name: "Enrich" },
  { id: "love",      name: "Love" },
  { id: "express",   name: "Express" },
  { id: "focus",     name: "Focus" },
  { id: "celebrate", name: "Celebrate" },
];
const intName = (id: string) => INTS.find((x) => x.id === id)?.name ?? id;

const HELP =
  "TotehmBot.\n\n" +
  "/moi — où tu en es : séries, consistance, ce qui attend\n" +
  "/tonight — ce qui se passe autour de toi, rangé par tes intentions\n" +
  "/spot — poser un lieu sur la carte du Club\n" +
  "/spots — chercher les lieux du Club autour de toi\n" +
  "/wisdom <ta leçon> — poser une leçon\n" +
  "/objectif <ton objectif> — poser un objectif\n" +
  "/carte — ouvrir la Higher Map\n" +
  "/pause · /reprendre — couper ou relancer la question quotidienne\n" +
  "/annuler — abandonner ce qui est en cours";

// ─────────────────────────────────────────────────────────────────────────
// LE BROUILLON
// Une ligne par membre, écrasée à chaque pas, effacée à la fin.
// TTL 30 min : un brouillon oublié ne doit jamais avaler la réponse à un
// « Pourquoi ? » posé une heure plus tard.
// ─────────────────────────────────────────────────────────────────────────
const DRAFT_TTL_MIN = 30;

async function draftGet(tgId: number) {
  const { data } = await admin.from("bot_drafts")
    .select("user_id, kind, step, data, updated_at").eq("telegram_id", tgId).maybeSingle();
  if (!data) return null;
  const age = (Date.now() - new Date(data.updated_at).getTime()) / 60000;
  if (age > DRAFT_TTL_MIN) { await draftClear(tgId); return null; }
  return data;
}
const draftSet = (
  tgId: number, uid: string, step: string,
  data: Record<string, unknown>, kind = "spot",
) =>
  admin.from("bot_drafts").upsert(
    { telegram_id: tgId, user_id: uid, kind, step, data,
      updated_at: new Date().toISOString() },
    { onConflict: "telegram_id" },
  );
const draftClear = (tgId: number) =>
  admin.from("bot_drafts").delete().eq("telegram_id", tgId);

// ─────────────────────────────────────────────────────────────────────────
// QUI A LE DROIT
//
// BRAND.md : « you did the method, so you can publish a spot » — le Figher
// (méthode Stoner + abonnement) est la qualification visée. AUJOURD'HUI
// cette condition rendrait la fonction morte : 0 membre la remplit. On
// ouvre donc au membre du Club. Pour resserrer, REQUIRE_FIGHER à true —
// une ligne, rien d'autre à changer.
// ─────────────────────────────────────────────────────────────────────────
const REQUIRE_FIGHER = false;

async function isMember(uid: string): Promise<boolean> {
  const { data } = await admin.from("subscriptions")
    .select("status").eq("user_id", uid)
    .in("status", ["active", "trialing"]).limit(1);
  return !!data?.length;
}
async function canPost(uid: string): Promise<boolean> {
  if (!(await isMember(uid))) return false;
  if (!REQUIRE_FIGHER) return true;
  const { data: badge } = await admin.from("higher_badges").select("id").eq("id", uid).limit(1);
  return !!badge?.length;
}

// Les intentions réellement portées par le Totehm. `totehms.steps` est la
// vérité — `totehm_events` est un journal, et il est incomplet.
async function myIntentions(uid: string): Promise<string[]> {
  const { data } = await admin.from("totehms")
    .select("steps").eq("user_id", uid)
    .order("updated_at", { ascending: false }).limit(1);
  const steps = (data?.[0]?.steps ?? []) as { i?: string; intention?: string }[];
  return [...new Set(steps.map((s) => (s.i || s.intention || "").trim()).filter(Boolean))];
}

// ─────────────────────────────────────────────────────────────────────────
// LES ÉCRANS DU FLOW /spot
// ─────────────────────────────────────────────────────────────────────────
const kbIntentions = () => ({
  inline_keyboard: [
    INTS.slice(0, 2).map((x) => ({ text: x.name, callback_data: `s:i:${x.id}` })),
    INTS.slice(2, 4).map((x) => ({ text: x.name, callback_data: `s:i:${x.id}` })),
    INTS.slice(4, 6).map((x) => ({ text: x.name, callback_data: `s:i:${x.id}` })),
    INTS.slice(6).map((x) => ({ text: x.name, callback_data: `s:i:${x.id}` })),
  ],
});
const kbLocation = () => ({
  keyboard: [[{ text: "\u{1F4CD} Envoyer ma position", request_location: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
});
const kbWhen = () => ({
  inline_keyboard: [
    [{ text: "Maintenant — 1 h", callback_data: "s:w:60" },
     { text: "Maintenant — 3 h", callback_data: "s:w:180" }],
    [{ text: "C'est un lieu, pas un moment", callback_data: "s:w:0" }],
  ],
});
const kbVisibility = () => ({
  inline_keyboard: [
    [{ text: "\u{1F511} Club", callback_data: "s:v:club" },
     { text: "\u{1F30D} Public", callback_data: "s:v:public" }],
  ],
});
const kbEnergy = () => ({
  inline_keyboard: [
    [{ text: "\u{1F507} Silent — tête baissée", callback_data: "s:e:silent" },
     { text: "\u{1F30A} Social — en présence", callback_data: "s:e:social" }],
  ],
});

async function askActivite(chat: string) {
  await say(chat,
    "Qu'est-ce qu'on y fait, exactement ?\n" +
    "Une ligne. « Session de travail silencieuse », pas « bosser ».",
    { force_reply: true, input_field_placeholder: "l'activité précise" });
}
async function askComment(chat: string) {
  await say(chat,
    "Pourquoi là ?\n" +
    "C'est la phrase que liront les autres. Écris-la, ou envoie /passer.",
    { force_reply: true, input_field_placeholder: "ce que cet endroit a de particulier" });
}
async function askLocation(chat: string) {
  await say(chat,
    "Où ça ?\nEnvoie ta position — ou celle du lieu si tu n'y es pas.",
    kbLocation());
}

// ═════════════════════════════════════════════════════════════════════════
// /tonight — LA HIGHER MAP DANS TELEGRAM
//
// Même base que le radar, même classement : `live_near` pour les
// événements, `places_near` pour les lieux, filtrés sur les intentions du
// Totehm. Une différence assumée : AUCUN embedding n'est calculé ici.
//
// Pourquoi. La boucle du bot est mécanique — jamais un centime (README).
// Le radar paie ~30 tokens par habitude pour ranger finement ; le bot rend
// cinq lignes et n'a pas besoin de ce raffinement. Sans embedding, les deux
// RPC retombent sur le tri intention + date + distance : moins fin, gratuit,
// et le bot reste déterministe.
// ═════════════════════════════════════════════════════════════════════════
const fmtDist = (m: number) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

function fmtWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("fr-FR", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  });
}

async function tonight(chat: string, uid: string, lat: number, lng: number) {
  const ints = await myIntentions(uid);
  if (!ints.length) {
    await say(chat,
      "Donne une intention à au moins une habitude — c'est elle qui décide " +
      "de ce que je regarde autour de toi.\n" + MAP);
    return;
  }

  // Un balayage au plus toutes les 12 h par cellule de 11 km. Le deuxième
  // membre de la ville ne coûte rien.
  await liveWarm(admin, lat, lng);

  const [{ data: live }, { data: near }] = await Promise.all([
    admin.rpc("live_near", {
      p_lat: lat, p_lng: lng, p_radius: LIVE_RADIUS_M,
      p_habits: [], p_intentions: ints, p_limit: 5, p_horizon_days: 10,
    }),
    admin.rpc("places_near", {
      p_lat: lat, p_lng: lng, p_radius: 4000,
      p_intentions: ints, p_limit: 3, p_places: true, p_include_club: true,
    }),
  ]);

  const lines: string[] = [];

  for (const e of (live ?? []) as Record<string, unknown>[]) {
    const when  = fmtWhen(e.starts_at as string | null);
    const price = e.price_min != null
      ? ` · dès ${Math.round(Number(e.price_min))} ${esc(e.currency ?? "")}`.trimEnd()
      : "";
    const title = e.url
      ? `<a href="${esc(e.url)}">${esc(e.name)}</a>`
      : `<b>${esc(e.name)}</b>`;
    lines.push(
      `<b>${esc(intName(String(e.intention)))}</b> · ${esc(when)}\n` +
      `${title}\n` +
      `${esc(e.venue ?? "")}${e.venue ? " · " : ""}${fmtDist(Number(e.dist_m ?? 0))}${price}`);
  }

  const placeLines = ((near ?? []) as Record<string, unknown>[]).map((p) =>
    `· <b>${esc(p.name)}</b> — ${fmtDist(Number(p.dist_m ?? 0))}` +
    (p.why ? ` — ${esc(String(p.why).slice(0, 70))}` : ""));

  if (!lines.length && !placeLines.length) {
    await say(chat,
      "Rien autour de toi qui corresponde à ton Totehm pour l'instant.\n" +
      "La carte garde la mémoire de ce coin — repasse dans quelques heures.");
    return;
  }

  let out = "";
  if (lines.length) out += "<b>CE QUI SE PASSE</b>\n\n" + lines.join("\n\n");
  if (placeLines.length) {
    if (out) out += "\n\n";
    out += "<b>ET SI TU NE BOUGES PAS LOIN</b>\n" + placeLines.join("\n");
  }
  out += `\n\n<a href="${MAP}">Ouvrir la Higher Map</a>`;

  await sayHtml(chat, out, { remove_keyboard: true });
}

// ─────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== "POST") return ok();

  const expected = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (expected && req.headers.get("x-telegram-bot-api-secret-token") !== expected) {
    return new Response("forbidden", { status: 403 });
  }

  let u: Record<string, any> = {};
  try { u = await req.json(); } catch (_) { return ok(); }

  try {
    // ═══════════════════════════════════════════════════════════════════
    // UN BOUTON
    // ═══════════════════════════════════════════════════════════════════
    if (u.callback_query) {
      const cq    = u.callback_query;
      const chat  = String(cq.message?.chat?.id ?? "");
      const tgId  = Number(cq.from?.id ?? 0);
      const parts = String(cq.data ?? "").split(":");
      await ack(String(cq.id));
      if (chat && cq.message?.message_id) await strip(chat, cq.message.message_id);

      const { data: prof } = await admin
        .from("profiles").select("id").eq("telegram_id", tgId).maybeSingle();
      if (!prof?.id) {
        await say(chat, "Ouvre ton Totehm sur totehm.space pour lier ton compte.");
        return ok();
      }
      const uid = prof.id as string;

      // ── LE SPOT ──
      if (parts[0] === "s") {
        const d = await draftGet(tgId);
        if (!d) { await say(chat, "Ce brouillon a expiré. /spot pour recommencer."); return ok(); }
        const data = (d.data ?? {}) as Record<string, any>;

        if (parts[1] === "i") {
          const id = parts[2];
          if (!INTS.some((x) => x.id === id)) return ok();
          data.intention = id;
          await draftSet(tgId, uid, "activite", data);
          await say(chat, `${intName(id)}.`);
          await askActivite(chat);
          return ok();
        }

        if (parts[1] === "w") {
          const min = Number(parts[2]) || 0;
          if (min > 0) {
            data.duration_min = min;
            data.expires_at = new Date(Date.now() + min * 60000).toISOString();
          } else {
            data.duration_min = null;
            data.expires_at = null;
          }
          await draftSet(tgId, uid, "visibilite", data);
          await say(chat,
            "Qui peut le voir ?\n" +
            "• Club — seulement les membres, sur leur carte\n" +
            "• Public — tout le monde",
            kbVisibility());
          return ok();
        }

        if (parts[1] === "v") {
          // La visibilité est un choix technique (qui voit) ; l'énergie est le
          // contrat social (comment on y est). Les deux séparés, dans cet ordre.
          data.is_public = parts[2] === "public";
          await draftSet(tgId, uid, "energie", data);
          await say(chat,
            "Comment on y est ?\n" +
            "• Silent — tête baissée, seul\n" +
            "• Social — en présence, à plusieurs",
            kbEnergy());
          return ok();
        }

        if (parts[1] === "e") {
          const em  = parts[2] === "silent" ? "silent" : "social";
          const pub = !!data.is_public;
          // ══ LE user_id VIENT DE LA BASE, JAMAIS DU MESSAGE ══
          // Le bot écrit avec le service_role : la RLS ne le protège pas.
          // C'est ici, et seulement ici, que l'appartenance se décide.
          const row = {
            user_id:       uid,
            intention:     String(data.intention ?? ""),
            activite:      String(data.activite ?? "").slice(0, 80),
            commentaire:   data.commentaire ? String(data.commentaire).slice(0, 300) : null,
            lat:           Number(data.lat),
            lng:           Number(data.lng),
            duration_min:  data.duration_min ?? null,
            expires_at:    data.expires_at ?? null,
            is_public:     pub,
            required_role: pub ? "public" : "figher",
            energy_mode:   em,
            active:        true,
          };
          if (!row.intention || !row.activite || !isFinite(row.lat) || !isFinite(row.lng)) {
            await draftClear(tgId);
            await say(chat, "Il manquait quelque chose. /spot pour recommencer.");
            return ok();
          }
          const { error } = await admin.from("spots").insert(row);
          await draftClear(tgId);
          if (error) {
            console.error("spot insert:", error.message);
            await say(chat, "Je n'ai pas réussi à le poser. Réessaie dans un moment.");
            return ok();
          }
          const when = row.expires_at
            ? `pendant ${Math.round((row.duration_min ?? 0) / 60)} h`
            : "en permanence";
          const energyLabel = em === "silent" ? "Silent" : "Social";
          await say(chat,
            `C'est posé.\n\n${intName(row.intention)} · ${row.activite}\n` +
            `${pub ? "Public" : "Club"} · ${energyLabel}, ${when}.\n\n` +
            `Il apparaît maintenant sur la carte de ceux qui portent ${intName(row.intention)} ` +
            `dans leur Totehm, autour de ce point.`);
          return ok();
        }
        return ok();
      }

      // ── DONE / MISSED ── le geste quotidien
      if (parts[0] === "o") {
        const outId = Number(parts[1]);
        const val   = parts[2];

        const { data: row } = await admin
          .from("habit_outcomes").select("habit_text")
          .eq("id", outId).eq("user_id", uid).maybeSingle();
        if (!row) return ok();

        await admin.from("habit_outcomes")
          .update({ outcome: val, answered_at: new Date().toISOString() })
          .eq("id", outId).eq("user_id", uid);

        if (val === "done") {
          await say(chat, "✓");
        } else {
          await say(chat, `Pourquoi ?`, {
            force_reply: true,
            input_field_placeholder: "en une phrase — ou ignore",
          });
        }
        return ok();
      }

      // ── la Repulsion, choisie dans le corpus ──
      if (parts[0] === "r") {
        const { data: pend } = await admin
          .from("obstacles").select("habit_text, said")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (!pend) return ok();

        const text = decodeURIComponent(parts.slice(2).join(":"));
        await admin.rpc("set_repulsion_admin", {
          p_user: uid, p_habit: pend.habit_text,
          p_obstacle: pend.said, p_repulsion: text,
        });
        await say(chat,
          `C'est noté : ${text}.\nJe te le rappellerai au bon moment — pas avant.`);
        return ok();
      }
      return ok();
    }

    // ═══════════════════════════════════════════════════════════════════
    // UN MESSAGE
    // ═══════════════════════════════════════════════════════════════════
    const msg = u.message;
    if (!msg) return ok();
    const chat = String(msg.chat?.id ?? "");
    const tgId = Number(msg.from?.id ?? 0);
    const text = String(msg.text ?? "").trim().slice(0, 300);

    // ── /start <code> : LA LIAISON ──
    if (text.startsWith("/start")) {
      const code = text.slice(6).trim();
      if (!code) {
        const { data: prof } = await admin
          .from("profiles").select("pseudo").eq("telegram_id", tgId).maybeSingle();
        await say(chat, prof
          ? `On est liés, ${prof.pseudo}.\n\n${HELP}`
          : "Pour lier ton compte : ouvre ton Totehm sur totehm.space, menu membre, « Connect TotehmBot ».",
          prof ? kbApp("Ouvrir mon Totehm") : undefined);
        return ok();
      }
      const { data: link } = await admin
        .from("bot_link_codes").select("user_id, created_at, used_at")
        .eq("code", code).maybeSingle();
      const fresh = link && !link.used_at &&
        (Date.now() - new Date(link.created_at).getTime()) < 10 * 60000;
      if (!fresh) {
        await say(chat, "Ce lien a expiré. Redemande-en un depuis ton Totehm.");
        return ok();
      }
      // Un compte Telegram ne peut être branché que sur un Totehm à la fois.
      await admin.from("profiles").update({ telegram_id: null }).eq("telegram_id", tgId);
      await admin.from("profiles").update({ telegram_id: tgId }).eq("id", link!.user_id);
      await admin.from("bot_link_codes")
        .update({ used_at: new Date().toISOString() }).eq("code", code);

      // ══ LIER, C'EST DONNER LA PERMISSION ══
      // `totehms.bot` restait `false` : le membre branchait le bot et le bot
      // se taisait. On ne demande pas deux fois la même chose.
      const { error: botErr } = await admin
        .from("totehms").update({ bot: true, updated_at: new Date().toISOString() })
        .eq("user_id", link!.user_id);
      if (botErr) console.error("bot on:", botErr.message);

      const { data: prof } = await admin
        .from("profiles").select("pseudo").eq("id", link!.user_id).maybeSingle();
      await say(chat,
        `C'est lié, ${prof?.pseudo ?? ""}.\n\n` +
        `Je te demanderai si tu as tenu tes habitudes. Deux taps, pas plus. ` +
        `Jamais entre 22 h et 8 h, jamais plus de deux fois par jour, et je me tais ` +
        `une semaine si tu m'ignores trois fois.\n\n${HELP}`,
        kbApp("Ouvrir mon Totehm"));
      return ok();
    }

    // À partir d'ici, il faut être lié.
    const { data: prof } = await admin
      .from("profiles").select("id").eq("telegram_id", tgId).maybeSingle();
    if (!prof?.id) {
      await say(chat, "Ouvre ton Totehm sur totehm.space pour lier ton compte.");
      return ok();
    }
    const uid = prof.id as string;

    if (text === "/annuler") {
      await draftClear(tgId);
      await say(chat, "Abandonné.", { remove_keyboard: true });
      return ok();
    }
    if (text === "/aide" || text === "/help") {
      await say(chat, HELP, kbApp("Ouvrir mon Totehm"));
      return ok();
    }
    if (text === "/carte" || text === "/map") { await say(chat, MAP); return ok(); }

    if (text === "/pause") {
      await admin.from("totehms").update({ bot: false }).eq("user_id", uid);
      await say(chat, "Je me tais. /reprendre quand tu veux — /tonight et /spot marchent toujours.");
      return ok();
    }
    if (text === "/reprendre") {
      await admin.from("totehms").update({ bot: true }).eq("user_id", uid);
      await say(chat, "C'est reparti. Je reprends mes questions, aux mêmes horaires.");
      return ok();
    }

    // ══ /moi — LE TRACKING, DÉDUIT ══════════════════════════════════
    // Exactement les chiffres de la mini-app : `higherself_state()` est
    // la MÊME fonction, appelée avec l'uuid parce que le bot n'a pas de
    // session. Deux surfaces, un seul calcul — sinon elles finiraient par
    // ne pas dire la même chose du même membre.
    if (text === "/moi" || text === "/me") {
      const { data: st } = await admin.rpc("higherself_state", { p_user: uid });
      const habits = (st?.habits ?? []) as Record<string, unknown>[];
      if (!habits.length) {
        await say(chat, "Ton Totehm est vide. Écris une première habitude, puis reviens.",
          kbApp("Ouvrir mon Totehm"));
        return ok();
      }
      const waiting = habits.filter((h) => h.pending_id);
      const lines = habits.map((h) => {
        const bits: string[] = [];
        if (h.streak && Number(h.streak) > 0) bits.push(`${h.streak} d'affilée`);
        if (h.consistency != null)            bits.push(`${h.consistency}% tenu`);
        if (!h.ready)                         bits.push("pas de fréquence");
        return `<b>${esc(h.habit)}</b>${bits.length ? "\n" + esc(bits.join(" · ")) : ""}`;
      });
      await sayHtml(chat,
        (waiting.length
          ? `<b>${waiting.length}</b> question${waiting.length > 1 ? "s" : ""} attend${waiting.length > 1 ? "ent" : ""} une réponse.\n\n`
          : "Rien en attente.\n\n") +
        lines.join("\n\n"),
        kbApp("Répondre dans mon Totehm"));
      return ok();
    }

    // ══ /wisdom et /objectif — une idée se note où elle arrive ═══════
    if (text.startsWith("/wisdom") || text.startsWith("/lecon") || text.startsWith("/leçon")) {
      const body = text.replace(/^\/(wisdom|lecon|leçon)\s*/i, "").trim();
      if (!body) {
        await say(chat, "Écris la leçon après la commande.\nExemple : /wisdom on ne rattrape jamais une nuit blanche");
        return ok();
      }
      const { error } = await admin.rpc("add_wisdom_admin",
        { p_user: uid, p_text: body, p_intention: null });
      await say(chat, error ? "Je n'ai pas réussi à la poser." : "Posée dans ton Wisdom.",
        error ? undefined : kbApp("Voir mes leçons"));
      return ok();
    }
    if (text.startsWith("/objectif") || text.startsWith("/objective")) {
      const body = text.replace(/^\/(objectif|objective)\s*/i, "").trim();
      if (!body) {
        await say(chat, "Écris l'objectif après la commande.\nExemple : /objectif finir le morceau avant vendredi");
        return ok();
      }
      const { error } = await admin.rpc("add_objective_admin", { p_user: uid, p_text: body });
      await say(chat, error ? "Je n'ai pas réussi à le poser." : "Posé dans tes objectifs.",
        error ? undefined : kbApp("Voir mes objectifs"));
      return ok();
    }

    // ── /spots : chercher les lieux du Club ──
    if (text === "/spots") {
      if (!(await isMember(uid))) {
        await say(chat, "Les lieux du Club font partie de l'adhésion.");
        return ok();
      }
      await draftSet(tgId, uid, "lieu", {}, "spots");
      await say(chat, "Tu es où ?", kbLocation());
      return ok();
    }

    // ── /tonight : on démarre ──
    if (text === "/tonight" || text === "/cesoir") {
      if (!(await isMember(uid))) {
        await say(chat,
          "La carte fait partie de l'adhésion.\n" +
          "Ton premier mois s'ouvre depuis ton Totehm, sur totehm.space.");
        return ok();
      }
      await draftSet(tgId, uid, "lieu", {}, "tonight");
      await say(chat, "Tu es où ?", kbLocation());
      return ok();
    }

    // ── /spot : on démarre ──
    if (text === "/spot") {
      if (!(await canPost(uid))) {
        await say(chat,
          "Poser un lieu est réservé aux membres du Club.\n" +
          "Ton premier mois s'ouvre depuis ton Totehm, sur totehm.space.");
        return ok();
      }
      await draftSet(tgId, uid, "intention", {});
      await say(chat,
        "Un lieu, pour quelle intention ?\n" +
        "C'est elle qui décidera à qui il apparaît.",
        kbIntentions());
      return ok();
    }

    // ══ LE BROUILLON PASSE AVANT LE « POURQUOI ? » ══
    // Sans cette priorité, la réponse à une étape du spot serait enregistrée
    // comme l'obstacle d'une habitude ratée. Le TTL de 30 min garantit qu'un
    // brouillon oublié ne capture pas un WHY posé plus tard.
    const draft = await draftGet(tgId);
    if (draft) {
      const data = (draft.data ?? {}) as Record<string, any>;
      const loc  = msg.location ?? msg.venue?.location;

      // ── /spots : une seule étape, la position ──
      if (draft.kind === "spots") {
        if (!loc) {
          await say(chat, "J'ai besoin d'une position pour chercher autour de toi.", kbLocation());
          return ok();
        }
        await draftClear(tgId);
        const { data: rows } = await admin.rpc("spot_search", {
          p_lat: Number(loc.latitude), p_lng: Number(loc.longitude),
          p_radius: 20000, p_q: null, p_intention: null, p_limit: 8,
        });
        const list = (rows ?? []) as Record<string, unknown>[];
        if (!list.length) {
          await say(chat,
            "Aucun lieu posé autour de toi. /spot pour être le premier.",
            { remove_keyboard: true });
          return ok();
        }
        await sayHtml(chat,
          "<b>LES LIEUX DU CLUB</b>\n\n" + list.map((s) =>
            `<b>${esc(s.activite)}</b> · ${esc(intName(String(s.intention)))}\n` +
            (s.commentaire ? `${esc(String(s.commentaire).slice(0, 90))}\n` : "") +
            `${fmtDist(Number(s.dist_m ?? 0))}` +
            (s.energy_mode ? ` · ${esc(s.energy_mode)}` : "") +
            ` · <a href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}">y aller</a>`
          ).join("\n\n"),
          { remove_keyboard: true });
        return ok();
      }

      // ── /tonight : une seule étape, la position ──
      if (draft.kind === "tonight") {
        if (!loc) {
          await say(chat, "J'ai besoin d'une position pour regarder autour de toi.", kbLocation());
          return ok();
        }
        await draftClear(tgId);
        await tonight(chat, uid, Number(loc.latitude), Number(loc.longitude));
        return ok();
      }

      // La position : native Telegram, donc aucun géocodage, donc 0 €.
      if (draft.step === "lieu") {
        if (!loc) {
          await say(chat, "J'ai besoin d'une position, pas d'un texte.", kbLocation());
          return ok();
        }
        data.lat = loc.latitude;
        data.lng = loc.longitude;
        if (msg.venue?.title && !data.activite) data.activite = String(msg.venue.title).slice(0, 80);
        await draftSet(tgId, uid, "quand", data);
        await say(chat, "Position reçue.", { remove_keyboard: true });
        await say(chat, "C'est pour quand ?", kbWhen());
        return ok();
      }

      if (draft.step === "activite") {
        if (!text || text.startsWith("/")) { await askActivite(chat); return ok(); }
        data.activite = text.slice(0, 80);
        await draftSet(tgId, uid, "commentaire", data);
        await askComment(chat);
        return ok();
      }

      if (draft.step === "commentaire") {
        if (text !== "/passer") {
          if (!text || text.startsWith("/")) { await askComment(chat); return ok(); }
          data.commentaire = text.slice(0, 300);
        }
        await draftSet(tgId, uid, "lieu", data);
        await askLocation(chat);
        return ok();
      }

      // Une étape à boutons : on rappelle le bouton plutôt que d'avaler le texte.
      if (draft.step === "intention") { await say(chat, "Choisis une intention.", kbIntentions()); return ok(); }
      if (draft.step === "quand")     { await say(chat, "C'est pour quand ?", kbWhen()); return ok(); }
      if (draft.step === "visibilite"){ await say(chat, "Club ou public ?", kbVisibility()); return ok(); }
      if (draft.step === "energie")   { await say(chat, "Silent ou social ?", kbEnergy()); return ok(); }
      return ok();
    }

    // ═══ LE GESTE QUOTIDIEN ═══
    if (!msg.text) return ok();

    // Une commande inconnue ne doit JAMAIS être enregistrée comme l'obstacle
    // d'une habitude ratée. Le membre a tapé /truc, pas raconté sa journée.
    if (text.startsWith("/")) { await say(chat, HELP); return ok(); }

    const { data: last } = await admin
      .from("habit_outcomes").select("id, habit_text, obstacle")
      .eq("user_id", uid)
      .order("asked_at", { ascending: false }).limit(1).maybeSingle();
    if (!last) { await say(chat, HELP); return ok(); }

    if (last.obstacle) {
      await admin.rpc("set_repulsion_admin", {
        p_user: uid, p_habit: last.habit_text,
        p_obstacle: last.obstacle, p_repulsion: text,
      });
      await say(chat, `C'est noté : ${text}.\nJe te le rappellerai au bon moment.`);
      return ok();
    }

    const { data: obs } = await admin.rpc("record_obstacle_admin", {
      p_user: uid, p_habit: last.habit_text,
      p_said: text, p_outcome: last.id,
    });

    if (obs?.recurring && !obs?.already_handled) {
      const { data: sug } = await admin.rpc("suggest_repulsions_admin", {
        p_user: uid, p_obstacle: text, p_habit: last.habit_text,
      });
      const rows = (sug?.from_corpus ?? []).slice(0, 3).map((c: any) => ([{
        text: String(c.repulsion).slice(0, 60),
        callback_data: `r::${encodeURIComponent(String(c.repulsion)).slice(0, 50)}`,
      }]));
      await say(chat,
        `Ça revient souvent.\n\n${sug?.frame ?? "Qu'est-ce que tu repousses ?"}\n` +
        (rows.length ? "Choisis, ou écris la tienne." : "Écris-la — tu es le premier."),
        rows.length
          ? { inline_keyboard: rows }
          : { force_reply: true, input_field_placeholder: "je repousse..." });
    } else {
      await say(chat, "✓");
    }
    return ok();

  } catch (e) {
    console.error("bot-reply:", e);
    return ok();
  }
});
