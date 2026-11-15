// TOTEHM · atelier — CONQUER THE WORLD : LA PORTE ET LES ENVOIS · 12/11/2026
// why : Wah — « un superbe dashboard Commercial et communication, gamifié, où
//       ça envoie automatiquement en appuyant sur des boutons ». Les boutons
//       sont dans `/conquer` ; ce qui PART passe ici, parce qu'un email de
//       prospection a besoin d'une clé (Resend) qu'une page ne doit jamais voir.
//       Et `/atelier` a besoin d'une porte ouverte : une galerie n'a pas de
//       TOTEHM, elle ne peut pas se connecter pour se présenter.
// how : deux gestes.
//       apply — SANS session : une galerie ou un artiste se présente. Tout est
//               validé en base (`outreach_apply`, qui freine aussi un robot),
//               et Wah reçoit un email.
//       send  — un administrateur (`_boutique_admin`) seulement. On RÉSERVE
//               d'abord (`outreach_claim` passe les lignes à « contacté »),
//               puis on envoie une par une, puis on écrit le grand livre
//               (`outreach_sent`). Réserver d'abord est ce qui empêche un
//               double tap d'écrire deux fois à la même galerie ; un envoi qui
//               échoue REND la ligne à la file avec son motif.
//       ⚠️ Les mots viennent de la BASE (`outreach_templates`) : Wah les
//       réécrit sans déployer. Seuls {{name}}, {{city}} et {{segment}} sont
//       remplacés — on n'invente JAMAIS une phrase sur un prospect.
// what : { ok, sent, failed } ou { error }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_BOUT } from "../_shared/origins.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// L'adresse qui ENVOIE est aussi celle qui REÇOIT : une boîte `no-reply` sur un
// email de prospection, c'est une réponse perdue.
const FROM = "TOTEHM <atelier@higher.boutique>";
const REPLY = "atelier@higher.boutique";
const PAGE = SITE_BOUT + "/atelier";
const clean = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const dors = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Le corps part en TEXTE BRUT : un email de prospection en HTML tombe plus
// souvent en indésirable, et celui-ci se lit très bien sans mise en forme.
async function envoyer(to: string, subject: string, text: string): Promise<string | null> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return "no_key";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY, subject, text }),
    });
    if (r.ok) return null;
    return (await r.text()).slice(0, 200);
  } catch (e) {
    return String(e).slice(0, 200);
  }
}

function remplir(s: string, p: Record<string, unknown>) {
  return String(s ?? "")
    .replaceAll("{{name}}", clean(p.name, 120))
    .replaceAll("{{city}}", clean(p.city, 80))
    .replaceAll("{{segment}}", clean(p.segment, 20));
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"), SITE_BOUT);
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { return json({ error: "bad_request" }, 400); }
  const action = String(body.action ?? "");

  // ── LA PORTE — sans session : une galerie n'a pas de TOTEHM ───────────
  if (action === "apply") {
    // Le pot de miel : un champ que personne ne voit et qu'un robot remplit.
    if (clean(body.website, 80)) return json({ ok: true });
    const kind = String(body.kind ?? "");
    const { data, error } = await admin.rpc("outreach_apply", {
      p_kind: kind,
      p_name: clean(body.name, 120),
      p_city: clean(body.city, 80),
      p_email: clean(body.email, 160),
      p_link: clean(body.link, 300) || null,
      p_word: clean(body.word, 600) || null,
    });
    if (error) { console.error("[atelier] apply:", error.message); return json({ error: "unavailable" }, 503); }
    if (data?.error) return json({ error: data.error }, 422);
    // Wah l'apprend tout de suite : une galerie qui se présente n'attend pas.
    const quoi = kind === "gallery" ? "GALLERY" : "ARTIST";
    const { data: adms } = await admin.from("boutique_admins").select("user_id");
    const to: string[] = [];
    for (const a of adms ?? []) {
      const { data: u } = await admin.auth.admin.getUserById(a.user_id);
      if (u?.user?.email) to.push(u.user.email);
    }
    for (const t of to) {
      await envoyer(t, `${quoi} · ${clean(body.name, 60)} · ${clean(body.city, 40)}`,
        `${quoi}\n${clean(body.name, 120)} — ${clean(body.city, 80)}\n${clean(body.email, 160)}\n` +
        `${clean(body.link, 300)}\n\n${clean(body.word, 600)}\n\n${SITE_BOUT}/conquer`);
    }
    return json({ ok: true });
  }

  // ── LES ENVOIS — un administrateur seulement ──────────────────────────
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "no_session" }, 401);
  const { data: { user }, error: authErr } = await admin.auth.getUser(auth.replace("Bearer ", ""));
  if (authErr || !user?.email) return json({ error: "no_session" }, 401);
  const { data: isAdmin, error: aErr } = await admin.rpc("_boutique_admin", { p_user: user.id });
  if (aErr) { console.error("[atelier] admin:", aErr.message); return json({ error: "unavailable" }, 503); }
  if (isAdmin !== true) return json({ error: "forbidden" }, 403);

  if (action === "send") {
    const kind = body.kind === "followup" ? "followup" : "first";
    const city = clean(body.city, 80) || null;
    // ⚠️ VINGT AU PLUS, PAR TAP. Au-delà, le domaine se fait classer en
    // indésirable et l'on brûle higher.boutique pour de bon.
    const n = Math.max(1, Math.min(Number(body.limit) || 10, 20));
    const { data: lot, error } = await admin.rpc("outreach_claim", { p_kind: kind, p_city: city, p_limit: n });
    if (error) { console.error("[atelier] claim:", error.message); return json({ error: "unavailable" }, 503); }
    if (lot?.error) return json({ error: lot.error }, 422);
    const jobs = Array.isArray(lot?.jobs) ? lot.jobs : [];
    const T = (lot?.templates ?? {}) as Record<string, { subject?: string; body?: string }>;
    let sent = 0; const failed: { name: string; why: string }[] = [];
    for (const j of jobs) {
      const p = j as Record<string, unknown>;
      // Un segment sans mots écrits retombe sur ceux de la galerie.
      const slug = `${p.segment}_${kind}`;
      const t = T[slug] ?? T[`gallery_${kind}`];
      if (!t?.subject || !t?.body) {
        await admin.rpc("outreach_sent", { p_id: p.id, p_kind: kind, p_subject: null, p_ok: false, p_error: "no_template:" + slug });
        failed.push({ name: String(p.name), why: "no_template" });
        continue;
      }
      const subject = remplir(t.subject, p), text = remplir(t.body, p);
      const why = await envoyer(String(p.email), subject, text);
      await admin.rpc("outreach_sent", { p_id: p.id, p_kind: kind, p_subject: subject, p_ok: !why, p_error: why });
      if (why) failed.push({ name: String(p.name), why: why.slice(0, 80) }); else sent++;
      // Resend accepte deux requêtes par seconde : on reste poli.
      await dors(600);
    }
    return json({ ok: true, claimed: jobs.length, sent, failed });
  }

  // ── UN ESSAI — l'email part à l'administrateur, à personne d'autre ────
  if (action === "preview") {
    const slug = clean(body.slug, 60) || "gallery_first";
    const { data: t } = await admin.from("outreach_templates").select("subject, body").eq("slug", slug).maybeSingle();
    if (!t) return json({ error: "no_template" }, 404);
    const faux = { name: clean(body.name, 120) || "Galeria Exemplo", city: clean(body.city, 80) || "Lisbon", segment: "gallery" };
    const why = await envoyer(user.email, "[TEST] " + remplir(t.subject, faux), remplir(t.body, faux));
    return why ? json({ error: "send", why }, 502) : json({ ok: true, to: user.email });
  }

  return json({ error: "action" }, 400);
});
