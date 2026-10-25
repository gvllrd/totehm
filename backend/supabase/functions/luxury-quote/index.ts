// TOTEHM · luxury-quote — LE LUXE, UN PROJET QUE L'ON DÉPOSE · 05 → 24/10/2026
// why : Wah, 24/10 — « simplifie largement la rubrique luxe… ici c'est 500
//       balles pour déposer le projet (remboursé si pas de possibilité) ». Le
//       membre PHOTOGRAPHIE sa pièce, choisit la Box qui la totehmise, et
//       dépose : le montant du dépôt vit dans `luxury_offer` (500 €), relu ici
//       — jamais reçu de la page. Si la pièce ne peut pas être travaillée, le
//       dépôt est remboursé à la main (le « oui » de Wah, chez Stripe).
//       `price` reste : le prix de l'ŒUVRE, une fois la pièce étudiée.
// how : une fonction, quatre gestes, le compte vient TOUJOURS de la session :
//       request — le membre (THP vérifié ici, `_art_owns_thp`) ; la Box est
//                 relue en base dans SON Totehm (`_box_matter`), jamais reçue ;
//                 trois projets ouverts au plus. Le NOM du Totehm Cloth : le
//                 membre écrit {Nom}, le serveur pose le préfixe de l'année
//                 (`0.` = 2026-27) : « 0.{Nom} », celui que Decode lit. La
//                 PHOTO n'est qu'un CHEMIN (`<uid>/…` dans `luxury-pieces`),
//                 vérifié ici ; le style n'est plus demandé à l'avance.
//       photos  — un administrateur : les URL SIGNÉES des pièces à regarder.
//       price   — un administrateur (`boutique_admins`) pose le prix : c'est
//                 le « oui » de Wah sur un prix live, par construction.
//       decline — un administrateur refuse, avec un mot.
//       cancel  — le membre retire SA demande.
//       Chaque geste prévient par email (Resend) ; un email qui échoue se
//       journalise et n'annule pas le geste.
// what : { ok, id?, status? } ou { error }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_BOUT } from "../_shared/origins.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const PIECES = ["bag", "jacket", "shoes", "other"] as const;
const KINDS = ["habit", "objective", "repulsion", "wisdom", "vision"] as const;
const FROM = "TOTEHM <no-reply@higher.boutique>";
const LOGO = "https://www.higher.boutique/assets/img/totehm_logo.png";
const PAGE = SITE_BOUT + "/luxury";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
// L'année de la collection, comme `epochPrefix()` de la boutique : 0 de juin
// 2026 à mai 2027, 1 l'année suivante.
const epoch = () => { const d = new Date(), y = d.getUTCFullYear(); return Math.max((d.getUTCMonth() >= 5 ? y : y - 1) - 2026, 0); };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const money = (c: number, cur: string) =>
  (c / 100).toLocaleString("en-GB", { style: "currency", currency: cur.toUpperCase(), minimumFractionDigits: c % 100 ? 2 : 0 });

function mail(title: string, lines: string[], cta?: { href: string; label: string }) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:40px 16px;background:#000;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:460px;" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding-bottom:26px;"><img src="${LOGO}" width="70" alt="TOTEHM" style="display:block;border:0;"></td></tr>
<tr><td align="center" style="font-family:'Courier New',monospace;font-size:15px;letter-spacing:2px;color:#fff;padding-bottom:18px;">${esc(title)}</td></tr>
${lines.map((l) => `<tr><td align="center" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#b8b8c8;padding-bottom:6px;">${esc(l)}</td></tr>`).join("")}
${cta ? `<tr><td align="center" style="padding-top:18px;"><a href="${cta.href}" style="font-family:'Courier New',monospace;font-size:13px;color:#fff;background:#1f1f24;border-radius:10px;padding:12px 20px;text-decoration:none;display:inline-block;">${esc(cta.label)}</a></td></tr>` : ""}
</table></td></tr></table></body></html>`;
}

async function send(to: string[], subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key || !to.length) { console.error("[luxury-quote] email: clé ou destinataire absent"); return; }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!r.ok) console.error("[luxury-quote] email KO", r.status, (await r.text()).slice(0, 200));
  } catch (e) {
    console.error("[luxury-quote] email exception", String(e).slice(0, 200));
  }
}

async function adminEmails(): Promise<string[]> {
  const { data, error } = await admin.from("boutique_admins").select("user_id");
  if (error) { console.error("[luxury-quote] admins:", error.message); return []; }
  const out: string[] = [];
  for (const a of data ?? []) {
    const { data: u } = await admin.auth.admin.getUserById(a.user_id);
    if (u?.user?.email) out.push(u.user.email);
  }
  return out;
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"), SITE_BOUT);
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "no_session" }, 401);
  const { data: { user }, error: authErr } = await admin.auth.getUser(auth.replace("Bearer ", ""));
  if (authErr || !user?.email) return json({ error: "no_session" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { return json({ error: "bad_request" }, 400); }
  const action = String(body.action ?? "");
  const quoteId = String(body.quote_id ?? "");
  if ((action === "cancel" || action === "price" || action === "decline") && !UUID.test(quoteId)) return json({ error: "not_found" }, 404);

  // ── LA DEMANDE — le membre ─────────────────────────────────────────────
  if (action === "request") {
    const { data: o } = await admin.from("luxury_offer")
      .select("active, price_cents, currency").eq("slug", "launch").maybeSingle();
    if (!o?.active) return json({ error: "closed" }, 409);
    // ⚠️ LE MONTANT DU DÉPÔT VIENT DE LA BASE. La page ne l'envoie pas et ne le
    //    choisit pas : elle l'affiche (`luxury_access`).
    const depot = Number(o.price_cents);
    if (!Number.isFinite(depot) || depot < 50) { console.error("[luxury-quote] dépôt:", o.price_cents); return json({ error: "closed" }, 409); }
    const { data: thp, error: thpErr } = await admin.rpc("_art_owns_thp", { p_user: user.id });
    if (thpErr) { console.error("[luxury-quote] thp:", thpErr.message); return json({ error: "unavailable" }, 503); }
    if (thp !== true) return json({ error: "thp_required" }, 402);

    const box = (body.box ?? {}) as { kind?: string; ref?: string };
    if (!box.kind || !KINDS.includes(box.kind as typeof KINDS[number]) || !box.ref) return json({ error: "choose_a_box" }, 422);
    const { data: snap, error: sErr } = await admin.rpc("_box_matter", { p_user: user.id, p_kind: box.kind, p_ref: String(box.ref) });
    if (sErr) { console.error("[luxury-quote] box:", sErr.message); return json({ error: "unavailable" }, 503); }
    if (!snap?.text) return json({ error: "box_not_found" }, 404);

    // 24/10 : des SOUS-BOX ÉTEINTES, comme sur /streetwear — la page n'envoie
    // que des RÉFÉRENCES, on filtre la matière qu'on vient de relire en base.
    const hide = Array.isArray(body.hide) ? (body.hide as { kind?: unknown; text?: unknown }[]).slice(0, 40) : [];
    const off = new Set(hide.filter((h) => h && typeof h.kind === "string" && typeof h.text === "string")
      .map((h) => h.kind + "\u0000" + h.text));
    if (off.size && snap.matter && typeof snap.matter === "object") {
      const m = snap.matter as Record<string, { text?: unknown }[]>;
      for (const k of Object.keys(m)) m[k] = (m[k] ?? []).filter((x) => !off.has(k + "\u0000" + String(x?.text ?? "")));
    }

    const { count, error: cErr } = await admin.from("luxury_quotes").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).in("status", ["requested", "quoted"]);
    if (cErr) { console.error("[luxury-quote] count:", cErr.message); return json({ error: "unavailable" }, 503); }
    if ((count ?? 0) >= 3) return json({ error: "too_many" }, 429);

    // ── LA PHOTO : un CHEMIN dans le dossier du membre, et il doit exister.
    //    On ne reçoit jamais une image ici : elle est déjà dans `luxury-pieces`,
    //    déposée sous RLS par son propriétaire. On vérifie le dossier ET l'objet.
    const photo = clean(body.photo, 200);
    if (!photo.startsWith(user.id + "/") || !/^[\w./-]{1,200}$/.test(photo)) return json({ error: "photo" }, 422);
    const { error: phErr } = await admin.storage.from("luxury-pieces").createSignedUrl(photo, 60);
    if (phErr) { console.error("[luxury-quote] photo:", phErr.message); return json({ error: "photo" }, 422); }

    // Le style ne se choisit plus à l'avance (24/10) : il se décide avec Wah.
    // S'il arrive quand même, il est relu comme avant — curaté et ouvert.
    const styleId = String(body.style ?? "");
    let style_id: string | null = null;
    if (UUID.test(styleId)) {
      const { data: st, error: stErr } = await admin.from("artistic_styles").select("id, active, status").eq("id", styleId).maybeSingle();
      if (stErr) { console.error("[luxury-quote] style:", stErr.message); return json({ error: "unavailable" }, 503); }
      if (!st?.active || (st.status && st.status !== "active")) return json({ error: "choose_a_style" }, 422);
      style_id = st.id;
    }
    const bare = clean(body.name, 40).replace(/^\d+\./, "").trim();
    if (bare.length < 2) return json({ error: "name" }, 422);
    const name = `${epoch()}.${bare}`;
    const { data: free, error: nErr } = await admin.rpc("name_available", { candidate: name });
    if (nErr) { console.error("[luxury-quote] name:", nErr.message); return json({ error: "unavailable" }, 503); }
    if (free !== true) return json({ error: "name_taken" }, 409);

    const piece = PIECES.includes(body.piece as typeof PIECES[number]) ? String(body.piece) : "other";
    const brand = clean(body.brand, 40) || "Other";
    const note = clean(body.note, 280) || null;
    const email = user.email.trim().toLowerCase();
    const { data: q, error } = await admin.from("luxury_quotes").insert({
      user_id: user.id, email, piece, brand, note, box_kind: box.kind, box_ref: String(box.ref),
      box_snapshot: snap, palette: snap.palette ?? [], name, style_id, photo_path: photo,
      status: "quoted", quote_cents: depot, currency: String(o.currency ?? "eur"),
      quoted_at: new Date().toISOString(),
    }).select("id").single();
    if (error?.code === "23505") return json({ error: "name_taken" }, 409);   // deux demandes, un nom : l'index tranche
    if (error) { console.error("[luxury-quote] insert:", error.message); return json({ error: "db" }, 500); }

    const prix = money(depot, String(o.currency ?? "eur"));
    await send([email], "Your luxury project is deposited",
      mail("PROJECT DEPOSITED", [name, prix + " · deposit",
        "We study your piece and your element, then we tell you how far we can go.",
        "If the piece cannot take the work, the deposit is refunded."]));
    await send(await adminEmails(), `Luxury project · ${brand} · ${piece}`,
      mail("NEW LUXURY PROJECT", [name, `${brand} · ${piece}`, note ?? "", `Box: ${String(snap.text).slice(0, 140)}`],
        { href: PAGE + "#admin", label: "See the piece" }));
    return json({ ok: true, id: q.id, status: "quoted", name, cents: depot, currency: String(o.currency ?? "eur") });
  }

  // ── LE RETRAIT — le membre, sa demande seulement ────────────────────────
  if (action === "cancel") {
    const { data, error } = await admin.from("luxury_quotes").update({ status: "cancelled" })
      .eq("id", quoteId).eq("user_id", user.id).in("status", ["requested", "quoted"])
      .select("id").maybeSingle();
    if (error) { console.error("[luxury-quote] cancel:", error.message); return json({ error: "db" }, 500); }
    return data ? json({ ok: true, status: "cancelled" }) : json({ error: "not_found" }, 404);
  }

  // ── LES PHOTOS — un administrateur regarde les pièces ──────────────────
  //    Une URL SIGNÉE d'une heure, jamais une politique « les admins voient
  //    tout » (elle s'oublie, et elle finit par tout ouvrir) : c'est la clé de
  //    service qui signe, ici, après avoir vérifié qui demande.
  if (action === "photos") {
    const { data: isAdmin, error: aErr } = await admin.rpc("_boutique_admin", { p_user: user.id });
    if (aErr) { console.error("[luxury-quote] admin:", aErr.message); return json({ error: "unavailable" }, 503); }
    if (isAdmin !== true) return json({ error: "forbidden" }, 403);
    const { data: rows, error } = await admin.from("luxury_quotes")
      .select("id, photo_path").in("status", ["requested", "quoted", "paid"])
      .not("photo_path", "is", null).order("created_at", { ascending: false }).limit(40);
    if (error) { console.error("[luxury-quote] photos:", error.message); return json({ error: "db" }, 500); }
    const out: { id: string; url: string }[] = [];
    for (const r of rows ?? []) {
      const { data: s } = await admin.storage.from("luxury-pieces").createSignedUrl(String(r.photo_path), 3600);
      if (s?.signedUrl) out.push({ id: r.id, url: s.signedUrl });
    }
    return json({ ok: true, photos: out });
  }

  // ── LE PRIX ET LE REFUS — un administrateur seulement ──────────────────
  if (action === "price" || action === "decline") {
    const { data: isAdmin, error: aErr } = await admin.rpc("_boutique_admin", { p_user: user.id });
    if (aErr) { console.error("[luxury-quote] admin:", aErr.message); return json({ error: "unavailable" }, 503); }
    if (isAdmin !== true) return json({ error: "forbidden" }, 403);

    const id = quoteId;
    const word = clean(body.note, 280) || null;
    let patch: Record<string, unknown>;
    if (action === "price") {
      const cents = Math.round(Number(body.cents));
      if (!Number.isFinite(cents) || cents < 50 || cents > 5_000_000) return json({ error: "price" }, 422);
      patch = { status: "quoted", quote_cents: cents, quote_note: word, quoted_at: new Date().toISOString() };
    } else {
      patch = { status: "declined", quote_note: word };
    }
    const { data: q, error } = await admin.from("luxury_quotes").update(patch)
      .eq("id", id).in("status", ["requested", "quoted"]).select("email,brand,piece,quote_cents,currency").maybeSingle();
    if (error) { console.error("[luxury-quote] " + action + ":", error.message); return json({ error: "db" }, 500); }
    if (!q) return json({ error: "not_found" }, 404);

    if (action === "price") {
      await send([q.email], "Your luxury quote is ready",
        mail("YOUR QUOTE", [`${q.brand} · ${q.piece}`, money(q.quote_cents, q.currency), word ?? ""],
          { href: PAGE, label: "See my quote" }));
    } else {
      await send([q.email], "About your luxury project",
        mail("NOT THIS TIME", [`${q.brand} · ${q.piece}`, word ?? "We cannot totehmize this piece.",
          "Your deposit is refunded."]));
    }
    return json({ ok: true, status: patch.status });
  }

  return json({ error: "action" }, 400);
});
