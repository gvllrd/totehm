// TOTEHM · bot-tick  v3 — master v5
// why  : le bot est le PROLONGEMENT de totehm.space. Il ne cree aucune
//        donnee — il lit totehms.steps et rend des reponses.
// how  : pg_cron l'appelle chaque heure. push_decision est deterministe
//        et dit NON par defaut.
// what : { checked, sent, reasons } — aucun appel IA, jamais.

import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const TG = Deno.env.get("TELEGRAM_BOT_TOKEN");

// DONE / MISSED. Deux boutons, deux taps. Le geste quotidien doit
// couter le moins possible — c'est lui qui alimente l'autobiographie.
function keyboard(outcomeId: number) {
  return {
    inline_keyboard: [[
      { text: "Done",   callback_data: `o:${outcomeId}:done` },
      { text: "Missed", callback_data: `o:${outcomeId}:missed` },
    ]],
  };
}

async function send(chatId: string, text: string, markup: unknown) {
  const r = await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: markup }),
  });
  if (!r.ok) console.error("telegram:", r.status, (await r.text()).slice(0, 200));
  return r.ok;
}

Deno.serve(async (req) => {
  // Appelee par pg_cron avec le service_role, jamais depuis un navigateur.
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "\u0000")) {
    return new Response("forbidden", { status: 403 });
  }
  if (!TG) {
    return new Response(JSON.stringify({ error: "no_telegram_token" }), { status: 500 });
  }

  // Seuls les membres qui ont ACTIVE le bot. bot=false est le defaut :
  // on ne pousse jamais a quelqu'un qui n'a rien demande.
  const { data: rows, error } = await admin
    .from("totehms").select("user_id").eq("bot", true);

  if (error) {
    console.error("totehms:", error.message);
    return new Response(JSON.stringify({ error: "db" }), { status: 500 });
  }

  let sent = 0;
  const reasons: Record<string, number> = {};

  for (const row of rows ?? []) {
    const uid = row.user_id as string;

    // Toute la decision est en SQL. Deterministe, zero appel payant,
    // et NOTHING domine : la fonction dit non par defaut.
    const { data: d } = await admin.rpc("push_decision", { p_user: uid });
    if (!d?.send) {
      const why = String(d?.why ?? "unknown");
      reasons[why] = (reasons[why] ?? 0) + 1;
      continue;
    }

    const { data: prof } = await admin
      .from("profiles").select("telegram_id").eq("id", uid).maybeSingle();
    if (!prof?.telegram_id) {
      reasons["no_telegram"] = (reasons["no_telegram"] ?? 0) + 1;
      continue;
    }

    // record_push cree l'envoi ET la question ouverte dans la meme
    // transaction : les deux ne peuvent pas diverger.
    const { data: pushId, error: recErr } = await admin.rpc("record_push", {
      p_user: uid, p_habit: d.habit, p_body: d.body,
      p_repulsion: d.repulsion_id ?? null,
    });
    if (recErr) { console.error("record_push:", recErr.message); continue; }

    const { data: push } = await admin
      .from("pushes").select("outcome_id").eq("id", pushId).maybeSingle();

    if (await send(String(prof.telegram_id), d.body, keyboard(Number(push?.outcome_id)))) {
      sent++;
    }
  }

  return new Response(
    JSON.stringify({ checked: rows?.length ?? 0, sent, reasons }),
    { headers: { "Content-Type": "application/json" } },
  );
});
