// TOTEHM · luxury-quote — LE LUXE, UN PROJET QUE L'ON DÉPOSE · 05/10 → 11/11/2026
// why : Wah, 11/11 — « avant tout règlement de l'acompte de 770 €, l'utilisateur
//       doit obligatoirement fournir : le nom exact du produit (parmi les 3
//       marques d'exception), une photo ou une vidéo haute définition de sa
//       pièce, sa ville, une Box de son Totehm, un style artistique (liste ou
//       photo d'un artiste) et son budget ». TOUT est donc exigé ICI, avant le
//       moindre paiement. Le montant de l'acompte vit dans `luxury_offer`
//       (770 €), relu ici — jamais reçu de la page. L'artiste est LOCAL (la
//       ville), la mise en relation passe par une galerie partenaire, et nous
//       avons 30 JOURS pour le sécuriser : sans artiste, remboursement intégral
//       à la main (le « oui » de Wah, chez Stripe). `price` reste : le prix de
//       l'ŒUVRE, une fois la pièce étudiée, avec l'artiste et sa galerie.
// how : une fonction, quatre gestes, le compte vient TOUJOURS de la session :
//       request — le membre (THP vérifié ici, `_art_owns_thp`) ; la Box est
//                 relue en base dans SON Totehm (`_box_matter`), jamais reçue ;
//                 trois projets ouverts au plus. Le NOM du Totehm Cloth : le
//                 membre écrit {Nom}, le serveur pose le préfixe de l'année
//                 (`0.` = 2026-27) : « 0.{Nom} », celui que Decode lit. La
//                 PHOTO n'est qu'un CHEMIN (`<uid>/…` dans `luxury-pieces`),
//                 vérifié ici — et c'est TOUJOURS une image, même quand le
//                 membre envoie une vidéo (la page en tire une image fixe) :
//                 c'est elle que le modèle de vision étudiera (n8n, `material`).
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
// 11/11 (Wah) : « le nom exact du produit, parmi les 3 marques d'exception avec
// lesquelles nous travaillons ». Trois, pas une de plus : la page les propose,
// le serveur les VÉRIFIE — une marque reçue qui n'est pas là est refusée.
const BRANDS = ["Hermès", "Louis Vuitton", "Gucci"] as const;
const MEDIA = ["photo", "video"] as const;
// Le budget de l'ŒUVRE (pas l'acompte) : il décide du rang de l'artiste qu'on
// se permet d'aller chercher. Des bornes larges, et rien d'autre : le prix
// définitif vient toujours du serveur, après l'étude.
const BUDGET_MIN = 100_000;        //   1 000 €
const BUDGET_MAX = 100_000_000;    // 1 000 000 €
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

    // 26/10 : CE QUI EST ALLUMÉ, comme sur /streetwear — la page n'envoie que des
    // RÉFÉRENCES et on GARDE, dans ce qu'on vient de relire en base, ce qui
    // correspond. Rien n'est coché au départ : une page muette donne la box seule.
    const pick = (body.pick ?? {}) as { matter?: unknown; shots?: unknown };
    const on = new Set((Array.isArray(pick.matter) ? pick.matter as { kind?: unknown; text?: unknown }[] : [])
      .slice(0, 60).filter((h) => h && typeof h.kind === "string" && typeof h.text === "string")
      .map((h) => h.kind + "\u0000" + h.text));
    if (snap.matter && typeof snap.matter === "object") {
      const m = snap.matter as Record<string, { text?: unknown }[]>;
      for (const k of Object.keys(m)) m[k] = (m[k] ?? []).filter((x) => on.has(k + "\u0000" + String(x?.text ?? "")));
    }
    // Les photos de la box, relues elles aussi (`_box_shots` : mes lignes seules).
    const ids = new Set((Array.isArray(pick.shots) ? pick.shots as unknown[] : [])
      .slice(0, 24).map((x) => String(x ?? "")).filter(Boolean));
    let shots: unknown[] = [];
    if (ids.size) {
      const { data: all, error: shErr } = await admin.rpc("_box_shots",
        { p_user: user.id, p_kind: box.kind, p_ref: String(box.ref) });
      if (shErr) console.error("[luxury-quote] shots:", shErr.message);
      shots = (Array.isArray(all) ? all : []).filter((x) => ids.has(String((x as { id?: unknown })?.id ?? "")));
    }
    (snap as Record<string, unknown>).shots = shots;

    const { count, error: cErr } = await admin.from("luxury_quotes").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).in("status", ["requested", "quoted"]);
    if (cErr) { console.error("[luxury-quote] count:", cErr.message); return json({ error: "unavailable" }, 503); }
    if ((count ?? 0) >= 3) return json({ error: "too_many" }, 429);

    // ── LA PHOTO : un CHEMIN dans le dossier du membre, et il doit exister.
    //    On ne reçoit jamais une image ici : elle est déjà dans `luxury-pieces`,
    //    déposée sous RLS par son propriétaire. On vérifie le dossier ET l'objet.
    //    11/11 : `photo` reste L'IMAGE À ÉTUDIER — même quand le membre envoie
    //    une VIDÉO, la page en tire une image fixe et dépose les deux. Le modèle
    //    de vision lit toujours une image ; l'atelier regarde la vidéo.
    const aMoi = async (p: string, quoi: string) => {
      if (!p.startsWith(user.id + "/") || !/^[\w./-]{1,200}$/.test(p)) return false;
      const { error } = await admin.storage.from("luxury-pieces").createSignedUrl(p, 60);
      if (error) { console.error("[luxury-quote] " + quoi + ":", error.message); return false; }
      return true;
    };
    const photo = clean(body.photo, 200);
    if (!await aMoi(photo, "photo")) return json({ error: "photo" }, 422);
    // Ce que le membre a VRAIMENT envoyé : la photo elle-même, ou la vidéo HD.
    const media_kind = MEDIA.includes(body.media_kind as typeof MEDIA[number]) ? String(body.media_kind) : "photo";
    const media = clean(body.media, 200) || photo;
    if (media !== photo && !await aMoi(media, "media")) return json({ error: "photo" }, 422);

    // ── LE STYLE — l'un ou l'autre, jamais rien (11/11, Wah) : un style de la
    //    liste proposée, OU la photo du style d'un artiste qu'il aime.
    const styleId = String(body.style ?? "");
    let style_id: string | null = null;
    if (UUID.test(styleId)) {
      const { data: st, error: stErr } = await admin.from("artistic_styles").select("id, active, status").eq("id", styleId).maybeSingle();
      if (stErr) { console.error("[luxury-quote] style:", stErr.message); return json({ error: "unavailable" }, 503); }
      if (!st?.active || (st.status && st.status !== "active")) return json({ error: "choose_a_style" }, 422);
      style_id = st.id;
    }
    const styleRef = clean(body.style_ref, 200);
    if (styleRef && !await aMoi(styleRef, "style_ref")) return json({ error: "style_ref" }, 422);
    if (!style_id && !styleRef) return json({ error: "choose_a_style" }, 422);

    // ── LA MARQUE, LE PRODUIT, LA VILLE, LE BUDGET — tout avant de payer.
    const brand = BRANDS.includes(body.brand as typeof BRANDS[number]) ? String(body.brand) : "";
    if (!brand) return json({ error: "brand" }, 422);
    const product = clean(body.product, 60);
    if (product.length < 2) return json({ error: "product" }, 422);
    const city = clean(body.city, 60);
    if (city.length < 2) return json({ error: "city" }, 422);
    const budget = Math.round(Number(body.budget_cents));
    if (!Number.isFinite(budget) || budget < BUDGET_MIN || budget > BUDGET_MAX) return json({ error: "budget" }, 422);
    const bare = clean(body.name, 40).replace(/^\d+\./, "").trim();
    if (bare.length < 2) return json({ error: "name" }, 422);
    const name = `${epoch()}.${bare}`;
    const { data: free, error: nErr } = await admin.rpc("name_available", { candidate: name });
    if (nErr) { console.error("[luxury-quote] name:", nErr.message); return json({ error: "unavailable" }, 503); }
    if (free !== true) return json({ error: "name_taken" }, 409);

    const piece = PIECES.includes(body.piece as typeof PIECES[number]) ? String(body.piece) : "other";
    const note = clean(body.note, 280) || null;
    const email = user.email.trim().toLowerCase();
    const { data: q, error } = await admin.from("luxury_quotes").insert({
      user_id: user.id, email, piece, brand, product, city, note,
      box_kind: box.kind, box_ref: String(box.ref),
      box_snapshot: snap, palette: snap.palette ?? [], name, style_id, photo_path: photo,
      media_path: media, media_kind, style_ref_path: styleRef || null, budget_cents: budget,
      status: "quoted", quote_cents: depot, currency: String(o.currency ?? "eur"),
      quoted_at: new Date().toISOString(),
    }).select("id").single();
    if (error?.code === "23505") return json({ error: "name_taken" }, 409);   // deux demandes, un nom : l'index tranche
    if (error) { console.error("[luxury-quote] insert:", error.message); return json({ error: "db" }, 500); }

    const prix = money(depot, String(o.currency ?? "eur"));
    await send([email], "Your luxury project is deposited",
      mail("PROJECT DEPOSITED", [name, `${brand} ${product}`, prix + " · deposit",
        "We study the material of your piece, then we look for an artist in " + city + ".",
        "We give ourselves 30 days to secure the right one. If we cannot, the deposit is refunded in full.",
        "Once the artist is secured, the work is in the partner gallery within two weeks."]));
    await send(await adminEmails(), `Luxury project · ${brand} ${product} · ${city}`,
      mail("NEW LUXURY PROJECT", [name, `${brand} ${product} · ${piece}`, `City: ${city}`,
        `Budget: ${money(budget, String(o.currency ?? "eur"))}`, note ?? "",
        `Box: ${String(snap.text).slice(0, 140)}`],
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
      .select("id, photo_path, media_path, media_kind, style_ref_path").in("status", ["requested", "quoted", "paid"])
      .not("photo_path", "is", null).order("created_at", { ascending: false }).limit(40);
    if (error) { console.error("[luxury-quote] photos:", error.message); return json({ error: "db" }, 500); }
    const signer = async (p: unknown) => {
      if (!p) return null;
      const { data: s } = await admin.storage.from("luxury-pieces").createSignedUrl(String(p), 3600);
      return s?.signedUrl ?? null;
    };
    const out: { id: string; url: string; media?: string; kind?: string; style?: string }[] = [];
    for (const r of rows ?? []) {
      const url = await signer(r.photo_path);
      if (!url) continue;
      // La vidéo et la référence de style suivent la photo : c'est le même
      // dossier privé, et c'est la clé de service qui signe, ici, après avoir
      // vérifié qui demande.
      const media = r.media_path && r.media_path !== r.photo_path ? await signer(r.media_path) : null;
      const style = await signer(r.style_ref_path);
      out.push({ id: r.id, url, ...(media ? { media, kind: String(r.media_kind ?? "video") } : {}), ...(style ? { style } : {}) });
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
      // 11/11 — L'ARTISTE LOCAL ET SA GALERIE, posés au même geste : c'est à
      // partir de là que courent les DEUX SEMAINES de l'œuvre.
      const artist = clean(body.artist, 80), gallery = clean(body.gallery, 80);
      if (artist) { patch.artist = artist; patch.artist_at = new Date().toISOString(); }
      if (gallery) patch.gallery = gallery;
    } else {
      patch = { status: "declined", quote_note: word };
    }
    const { data: q, error } = await admin.from("luxury_quotes").update(patch)
      .eq("id", id).in("status", ["requested", "quoted"]).select("email,brand,piece,quote_cents,currency").maybeSingle();
    if (error) { console.error("[luxury-quote] " + action + ":", error.message); return json({ error: "db" }, 500); }
    if (!q) return json({ error: "not_found" }, 404);

    if (action === "price") {
      await send([q.email], "Your luxury quote is ready",
        mail("YOUR QUOTE", [`${q.brand} · ${q.piece}`, money(q.quote_cents, q.currency),
          patch.artist ? `Artist: ${patch.artist}` : "", patch.gallery ? `Gallery: ${patch.gallery}` : "",
          patch.artist ? "The work is in the gallery within two weeks." : "", word ?? ""].filter(Boolean),
          { href: PAGE, label: "See my quote" }));
    } else {
      await send([q.email], "About your luxury project",
        mail("NOT THIS TIME", [`${q.brand} · ${q.piece}`, word ?? "We cannot totehmize this piece.",
          "Your deposit is refunded in full."]));
    }
    return json({ ok: true, status: patch.status });
  }

  return json({ error: "action" }, 400);
});
