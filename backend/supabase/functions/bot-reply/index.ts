// TotehmBot: private self reports and optional context, no model in the tracking loop.
// The verified Telegram sender maps to a linked profile; readers and writes enforce that owner.
// Existing Club/Map commands remain separate from practice collection.
// Deploy without gateway JWT verification; Telegram webhook secret is mandatory.

import { createClient } from "npm:@supabase/supabase-js@2";
import { liveWarm, LIVE_RADIUS_M } from "../_shared/live.ts";
import {handleTrackingUpdate} from "../_shared/tracking-bot.ts";
import {createTelegramTransport,TelegramAPIError} from '../_shared/tracking-telegram.ts';
import {createTrackingTick} from "../_shared/tracking-tick.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const TG   = Deno.env.get("TELEGRAM_BOT_TOKEN");
const MAP  = "https://www.totehm.com/map";
const APP  = "https://www.totehm.com/totehm";
const ok   = () => new Response("ok", { status: 200 });

// The main TOTEHM opens in the browser; linking never pretends to create a browser session.
const kbApp = (label = "Open my TOTEHM") => ({
  inline_keyboard: [[{ text: label, url: APP }]],
});

const tg=createTelegramTransport(TG);

const say = (chat: string, text: string, markup?: unknown) =>
  tg("sendMessage", { chat_id: chat, text, reply_markup: markup });
const sayHtml = (chat: string, text: string, markup?: unknown) =>
  tg("sendMessage", {
    chat_id: chat, text, parse_mode: "HTML",
    link_preview_options: { is_disabled: true }, reply_markup: markup,
  });
const ack = async(id:string)=>{
  // Callback acknowledgement is cosmetic; Club writes still perform their own checks.
  try{return await tg("answerCallbackQuery",{callback_query_id:id});}
  catch{console.error('[bot-reply]','callback_ack_failed');}
};
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

const HELP = `TotehmBot.

/track — how check-ins work
/review — your practice summary
/settings — timezone, quiet hours and daily limit
/tonight — nearby events matched to your intentions
/spot — share a Club spot
/spots — find nearby Club spots
/wisdom <lesson> — save a lesson
/objective <objective> — save an objective
/map — open Higher Map
/pause · /resume — pause or resume questions
/cancel — cancel the current step`;

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
  keyboard: [[{ text: "\u{1F4CD} Share my location", request_location: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
});
const kbWhen = () => ({
  inline_keyboard: [
    [{ text: "Now — 1 h", callback_data: "s:w:60" },
     { text: "Now — 3 h", callback_data: "s:w:180" }],
    [{ text: "A place, without an end time", callback_data: "s:w:0" }],
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
    [{ text: "\u{1F507} Silent — focused, on your own", callback_data: "s:e:silent" },
     { text: "\u{1F30A} Social — together", callback_data: "s:e:social" }],
  ],
});

async function askActivite(chat: string) {
  await say(chat,
    "What will people do here?\n" +
    "One line. For example: Quiet coworking session.",
    { force_reply: true, input_field_placeholder: "the specific activity" });
}
async function askComment(chat: string) {
  await say(chat,
    "Why here?\n" +
    "Others will read this. Write a sentence or send /skip.",
    { force_reply: true, input_field_placeholder: "what makes this place special" });
}
async function askLocation(chat: string) {
  await say(chat,
    "Where?\nShare your location or the location of the place.",
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
  return d.toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  });
}

async function tonight(chat: string, uid: string, lat: number, lng: number) {
  const ints = await myIntentions(uid);
  if (!ints.length) {
    await say(chat,
      "Give at least one Habit an intention to guide " +
      "what I look for nearby.\n" + MAP);
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
      ? ` · from ${Math.round(Number(e.price_min))} ${esc(e.currency ?? "")}`.trimEnd()
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
      "Nothing nearby matches your TOTEHM yet.\n" +
      "Check the map again in a few hours.");
    return;
  }

  let out = "";
  if (lines.length) out += "<b>WHAT'S ON</b>\n\n" + lines.join("\n\n");
  if (placeLines.length) {
    if (out) out += "\n\n";
    out += "<b>ET SI TU NE BOUGES PAS LOIN</b>\n" + placeLines.join("\n");
  }
  out += `\n\n<a href="${MAP}">Open Higher Map</a>`;

  await sayHtml(chat, out, { remove_keyboard: true });
}

// ─────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Read-only operator probe. Older deployed versions answer GET without sending messages.
  if(req.method==='GET'&&new URL(req.url).searchParams.get('health')==='1'){
    const health=createTrackingTick({db:admin,token:TG,serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,webhookSecret:Deno.env.get('TELEGRAM_WEBHOOK_SECRET'),projectOrigin:Deno.env.get('SUPABASE_URL')!});
    return health(new Request(req.url,{method:'POST',headers:{authorization:req.headers.get('authorization')??'','x-tick-token':req.headers.get('x-tick-token')??'','content-type':'application/json'},body:JSON.stringify({mode:'health'})}));
  }
  if (req.method !== "POST") return ok();

  const expected = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (!expected || req.headers.get("x-telegram-bot-api-secret-token") !== expected) {
    return new Response("forbidden", { status: 403 });
  }

  let u: Record<string, any> = {};
  try { u = await req.json(); } catch (_) { return ok(); }

  try {
    // Personal data stays in the linked person's private Telegram conversation.
    const origin=u.callback_query?.message??u.message, sender=u.callback_query?.from??u.message?.from;
    if(origin&&(origin.chat?.type!=="private"||String(origin.chat.id)!==String(sender?.id)))return ok();
    if(await handleTrackingUpdate(admin,u,tg))return ok();
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
        await say(chat, "Open your TOTEHM on totehm.com to connect your account.");
        return ok();
      }
      const uid = prof.id as string;

      // ── LE SPOT ──
      if (parts[0] === "s") {
        const d = await draftGet(tgId);
        if (!d) { await say(chat, "This draft expired. Use /spot to start again."); return ok(); }
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
            "Who can see it?\n" +
            "• Club — members only, on their map\n" +
            "• Public — everyone",
            kbVisibility());
          return ok();
        }

        if (parts[1] === "v") {
          // La visibilité est un choix technique (qui voit) ; l'énergie est le
          // contrat social (comment on y est). Les deux séparés, dans cet ordre.
          data.is_public = parts[2] === "public";
          await draftSet(tgId, uid, "energie", data);
          await say(chat,
            "What is the atmosphere?\n" +
            "• Silent — focused, on your own, seul\n" +
            "• Social — together, with others",
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
            await say(chat, "Something is missing. Use /spot to start again.");
            return ok();
          }
          const { error } = await admin.from("spots").insert(row);
          await draftClear(tgId);
          if (error) {
            console.error("spot insert:", error.message);
            await say(chat, "Could not save this spot. Try again shortly.");
            return ok();
          }
          const when = row.expires_at
            ? `for ${Math.round((row.duration_min ?? 0) / 60)} h`
            : "without an end time";
          const energyLabel = em === "silent" ? "Silent" : "Social";
          await say(chat,
            `Spot saved.\n\n${intName(row.intention)} · ${row.activite}\n` +
            `${pub ? "Public" : "Club"} · ${energyLabel}, ${when}.\n\n` +
            `It now appears nearby for people who have ${intName(row.intention)} ` +
            `in their TOTEHM.`);
          return ok();
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
          `Saved: ${text}.\nI will remind you at the right time.`);
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
          ? `Connected, ${prof.pseudo}.\n\n${HELP}`
          : "To connect your account, open your TOTEHM on totehm.com and choose Connect TotehmBot in the member menu.",
          prof ? kbApp("Open my TOTEHM") : undefined);
        return ok();
      }
      const {data:linked,error:linkError}=await admin.rpc("tracking_link",{p_code:code,p_telegram:tgId});
      if(linkError||!linked?.ok){await say(chat,"This link has expired. Request a new one from your TOTEHM.");return ok();}
      const settings=linked.settings??{};
      await say(chat,
        `TotehmBot connected.\n\nYour Habit check-ins arrive here automatically. Tap Done or Missed. /review to review your practice.\n\n`+
        `${settings.timezone} · quiet hours ${settings.quiet_from}:00 to ${settings.quiet_to}:00 · ${settings.max_daily} questions maximum per day. /pause pauses questions.\n\n`+
        `An unanswered question stays unknown. `+(settings.share_chatgpt?'Practice sharing with ChatGPT is enabled. You can turn it off in your dashboard.':'Practice sharing with ChatGPT stays off until you enable it in your dashboard.'),
        kbApp("Open my TOTEHM"));
      return ok();
    }

    // À partir d'ici, il faut être lié.
    const { data: prof } = await admin
      .from("profiles").select("id").eq("telegram_id", tgId).maybeSingle();
    if (!prof?.id) {
      await say(chat, "Open your TOTEHM on totehm.com to connect your account.");
      return ok();
    }
    const uid = prof.id as string;

    if ((text === "/cancel" || text === "/annuler")) {
      await draftClear(tgId);
      await say(chat, "Cancelled.", { remove_keyboard: true });
      return ok();
    }
    if (text === "/aide" || text === "/help") {
      await say(chat, HELP, kbApp("Open my TOTEHM"));
      return ok();
    }
    if (text === "/carte" || text === "/map") { await say(chat, MAP); return ok(); }

    // ══ /wisdom et /objectif — une idée se note où elle arrive ═══════
    if (text.startsWith("/wisdom") || text.startsWith("/lecon") || text.startsWith("/leçon")) {
      const body = text.replace(/^\/(wisdom|lecon|leçon)\s*/i, "").trim();
      if (!body) {
        await say(chat, "Write your lesson after the command.\nExample: /wisdom sleep comes first");
        return ok();
      }
      const { error } = await admin.rpc("add_wisdom_admin",
        { p_user: uid, p_text: body, p_intention: null });
      await say(chat, error ? "Could not save your lesson." : "Saved to MY STORY.",
        error ? undefined : kbApp("View MY STORY"));
      return ok();
    }
    if (text.startsWith("/objectif") || text.startsWith("/objective")) {
      const body = text.replace(/^\/(objectif|objective)\s*/i, "").trim();
      if (!body) {
        await say(chat, "Write your objective after the command.\nExample: /objective finish the track by Friday");
        return ok();
      }
      const { error } = await admin.rpc("add_objective_admin", { p_user: uid, p_text: body });
      await say(chat, error ? "Could not save your objective." : "Saved to your Objectives.",
        error ? undefined : kbApp("View my Objectives"));
      return ok();
    }

    // ── /spots : chercher les lieux du Club ──
    if (text === "/spots") {
      if (!(await isMember(uid))) {
        await say(chat, "Club spots require membership.");
        return ok();
      }
      await draftSet(tgId, uid, "lieu", {}, "spots");
      await say(chat, "Where are you?", kbLocation());
      return ok();
    }

    // ── /tonight : on démarre ──
    if (text === "/tonight" || text === "/cesoir") {
      if (!(await isMember(uid))) {
        await say(chat,
          "The map requires membership.\n" +
          "Manage membership from your TOTEHM on totehm.com.");
        return ok();
      }
      await draftSet(tgId, uid, "lieu", {}, "tonight");
      await say(chat, "Where are you?", kbLocation());
      return ok();
    }

    // ── /spot : on démarre ──
    if (text === "/spot") {
      if (!(await canPost(uid))) {
        await say(chat,
          "Sharing a spot requires Club membership.\n" +
          "Manage membership from your TOTEHM on totehm.com.");
        return ok();
      }
      await draftSet(tgId, uid, "intention", {});
      await say(chat,
        "Which intention is this spot for?\n" +
        "This determines who discovers it.",
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
          await say(chat, "Share a location to find nearby spots.", kbLocation());
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
            "No spots nearby yet. Use /spot to share the first.",
            { remove_keyboard: true });
          return ok();
        }
        await sayHtml(chat,
          "<b>CLUB SPOTS</b>\n\n" + list.map((s) =>
            `<b>${esc(s.activite)}</b> · ${esc(intName(String(s.intention)))}\n` +
            (s.commentaire ? `${esc(String(s.commentaire).slice(0, 90))}\n` : "") +
            `${fmtDist(Number(s.dist_m ?? 0))}` +
            (s.energy_mode ? ` · ${esc(s.energy_mode)}` : "") +
            ` · <a href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}">directions</a>`
          ).join("\n\n"),
          { remove_keyboard: true });
        return ok();
      }

      // ── /tonight : une seule étape, la position ──
      if (draft.kind === "tonight") {
        if (!loc) {
          await say(chat, "Share a location to explore nearby.", kbLocation());
          return ok();
        }
        await draftClear(tgId);
        await tonight(chat, uid, Number(loc.latitude), Number(loc.longitude));
        return ok();
      }

      // La position : native Telegram, donc aucun géocodage, donc 0 €.
      if (draft.step === "lieu") {
        if (!loc) {
          await say(chat, "Please use the location button.", kbLocation());
          return ok();
        }
        data.lat = loc.latitude;
        data.lng = loc.longitude;
        if (msg.venue?.title && !data.activite) data.activite = String(msg.venue.title).slice(0, 80);
        await draftSet(tgId, uid, "quand", data);
        await say(chat, "Location received.", { remove_keyboard: true });
        await say(chat, "When?", kbWhen());
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
        if (!["/skip", "/passer"].includes(text)) {
          if (!text || text.startsWith("/")) { await askComment(chat); return ok(); }
          data.commentaire = text.slice(0, 300);
        }
        await draftSet(tgId, uid, "lieu", data);
        await askLocation(chat);
        return ok();
      }

      // Une étape à boutons : on rappelle le bouton plutôt que d'avaler le texte.
      if (draft.step === "intention") { await say(chat, "Choose an intention.", kbIntentions()); return ok(); }
      if (draft.step === "quand")     { await say(chat, "When?", kbWhen()); return ok(); }
      if (draft.step === "visibilite"){ await say(chat, "Club or public?", kbVisibility()); return ok(); }
      if (draft.step === "energie")   { await say(chat, "Silent or social?", kbEnergy()); return ok(); }
      return ok();
    }

    // A note is collected only after the person explicitly opens a tracking detail.
    // Unrelated messages never mutate a Repulsion, an Objective or MY STORY.
    await say(chat,"Your check-ins arrive here automatically. /review for your practice · /settings for notifications · /help for more.");
    return ok();

  } catch (e) {
    console.error("[bot-reply]",e instanceof TelegramAPIError?e.message:"update_failed");
    const cq=u.callback_query;
    if(cq?.id&&cq.message?.chat?.type==='private'&&String(cq.message.chat.id)===String(cq.from?.id)){
      try{await tg('answerCallbackQuery',{callback_query_id:String(cq.id),text:'Could not confirm this update. Try again to check the saved result.',show_alert:true});}catch{/* The safe transport logs the delivery failure without exposing member content. */}
    }
    // Acknowledge the transport to avoid Telegram replaying writes or partially sent messages.
    return Response.json({ok:false,error:"update_failed"},{status:200});
  }
});
