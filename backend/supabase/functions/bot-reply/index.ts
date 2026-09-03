// TOTEHM · bot-reply  v4
// why  : deux boucles vivent maintenant dans le même webhook — le geste
//        quotidien (DONE/MISSED/WHY) et la production de contenu (un spot
//        posé par un membre). Telegram n'accepte QU'UN webhook par bot :
//        il n'y avait pas le choix de les séparer en deux fonctions.
// how  : la liaison d'abord (elle manquait, et sans elle rien n'était
//        joignable), puis un brouillon en base pour tenir une conversation
//        à cinq temps. ZÉRO appel IA, ZÉRO API payante — la position vient
//        de Telegram lui-même, donc aucun géocodage.
// what : 200 toujours — un 500 fait rejouer Telegram en boucle.

import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const TG = Deno.env.get("TELEGRAM_BOT_TOKEN");
const ok = () => new Response("ok", { status: 200 });

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
const ack = (id: string) => tg("answerCallbackQuery", { callback_query_id: id });
const strip = (chat: string, msg: number) =>
  tg("editMessageReplyMarkup",
     { chat_id: chat, message_id: msg, reply_markup: { inline_keyboard: [] } });

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

// ─────────────────────────────────────────────────────────────────────────
// LE BROUILLON
// Une ligne par membre, écrasée à chaque pas, effacée à la fin.
// TTL 30 min : un brouillon oublié ne doit jamais avaler la réponse à un
// « Pourquoi ? » posé une heure plus tard.
// ─────────────────────────────────────────────────────────────────────────
const DRAFT_TTL_MIN = 30;

async function draftGet(tgId: number) {
  const { data } = await admin.from("bot_drafts")
    .select("user_id, step, data, updated_at").eq("telegram_id", tgId).maybeSingle();
  if (!data) return null;
  const age = (Date.now() - new Date(data.updated_at).getTime()) / 60000;
  if (age > DRAFT_TTL_MIN) { await draftClear(tgId); return null; }
  return data;
}
const draftSet = (tgId: number, uid: string, step: string, data: Record<string, unknown>) =>
  admin.from("bot_drafts").upsert(
    { telegram_id: tgId, user_id: uid, kind: "spot", step, data,
      updated_at: new Date().toISOString() },
    { onConflict: "telegram_id" },
  );
const draftClear = (tgId: number) =>
  admin.from("bot_drafts").delete().eq("telegram_id", tgId);

// ─────────────────────────────────────────────────────────────────────────
// QUI A LE DROIT DE POSER UN SPOT
//
// BRAND.md : « you did the method, so you can publish a spot » — le
// Figher (méthode Stoner + abonnement) est la qualification visée.
// AUJOURD'HUI cette condition rendrait la fonction morte : 0 membre la
// remplit. On ouvre donc au membre du Club. Pour resserrer sur le Figher,
// mettre REQUIRE_FIGHER à true — une ligne, rien d'autre à changer.
// ─────────────────────────────────────────────────────────────────────────
const REQUIRE_FIGHER = false;

async function canPost(uid: string): Promise<boolean> {
  const { data: sub } = await admin.from("subscriptions")
    .select("status").eq("user_id", uid)
    .in("status", ["active", "trialing"]).limit(1);
  if (!sub?.length) return false;
  if (!REQUIRE_FIGHER) return true;
  const { data: badge } = await admin.from("higher_badges")
    .select("id").eq("id", uid).limit(1);
  return !!badge?.length;
}

// ─────────────────────────────────────────────────────────────────────────
// LES ÉCRANS DU FLOW
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

      // ── DONE / MISSED ── le geste quotidien, inchangé
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

      // ── la Repulsion, choisie dans le corpus ── inchangé
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

    // ── /start <code> : LA LIAISON QUI MANQUAIT ──
    // Elle n'existait nulle part. C'est pour ça que 0 profil sur 3 avait un
    // telegram_id, et que le bot n'a jamais parlé à personne.
    if (text.startsWith("/start")) {
      const code = text.slice(6).trim();
      if (!code) {
        const { data: prof } = await admin
          .from("profiles").select("pseudo").eq("telegram_id", tgId).maybeSingle();
        await say(chat, prof
          ? `On est liés, ${prof.pseudo}.\n\n/spot — poser un lieu sur la carte\n/annuler — abandonner ce qui est en cours`
          : "Pour lier ton compte : ouvre ton Totehm sur totehm.space, menu membre, « Connect TotehmBot ».");
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
      const { data: prof } = await admin
        .from("profiles").select("pseudo").eq("id", link!.user_id).maybeSingle();
      await say(chat,
        `C'est lié, ${prof?.pseudo ?? ""}.\n\n` +
        `Je te demanderai si tu as tenu tes habitudes. Deux taps, pas plus.\n\n` +
        `/spot — poser un lieu sur la carte du Club`);
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

    // ── /spot : on démarre ──
    if (text === "/spot") {
      if (!(await canPost(uid))) {
        await say(chat,
          "Poser un lieu est réservé aux membres du Club.\n" +
          "Ton essai de 7 jours s'ouvre depuis ton Totehm, sur totehm.space.");
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
    // comme l'obstacle d'une habitude ratée. Le TTL de 30 min garantit
    // qu'un brouillon oublié ne capture pas un WHY posé plus tard.
    const draft = await draftGet(tgId);
    if (draft) {
      const data = (draft.data ?? {}) as Record<string, any>;

      // La position : native Telegram, donc aucun géocodage, donc 0 €.
      if (draft.step === "lieu") {
        const loc = msg.location ?? msg.venue?.location;
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

    // ═══ LE GESTE QUOTIDIEN — inchangé ═══
    if (!msg.text) return ok();

    const { data: last } = await admin
      .from("habit_outcomes").select("id, habit_text, obstacle")
      .eq("user_id", uid)
      .order("asked_at", { ascending: false }).limit(1).maybeSingle();
    if (!last) return ok();

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
