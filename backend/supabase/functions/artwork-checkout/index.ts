// TOTEHM · artwork-checkout — LE PREMIER ACHAT D'UNE ŒUVRE · 30/09/2026
// ═══════════════════════════════════════════════════════════════════════
// why : une œuvre (Quantum 1/1, Play the Lisbon Street en édition) se
//       collectionne sur FIGHER. Le prix, la disponibilité et le droit
//       d'acheter (le THP) sont décidés EN BASE, jamais ici, jamais côté
//       client.
// how : 1 · `art_primary_reserve` tient UN exemplaire 31 minutes (verrou
//           sur la ligne de l'œuvre : deux acheteurs ne paient jamais le
//           dernier) ;
//       2 · Stripe Checkout au prix de la réservation, session de 30 min ;
//       3 · le webhook (`product: artwork`) appelle `art_settle` : c'est LÀ
//           que l'exemplaire est frappé et devient la propriété de
//           l'acheteur. Une page ne fabrique jamais une propriété.
// what : { url, amount, currency, title } | { error }
//
// ⚠️ AVANT LE 30/09, ce paiement n'était JAMAIS enregistré : le webhook
// n'avait pas de cas `artwork`. Et les pages de retour (`/merci.html`,
// `/galerie.html`) n'existaient pas. Le retour se fait maintenant sur
// FIGHER, là où l'œuvre se possède.
// ═══════════════════════════════════════════════════════════════════════

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_CLUB } from "../_shared/origins.ts";

// Pas de fallback vide : Stripe accepterait "", échouerait au premier appel,
// et un checkout partirait en fantôme. Le `!` fait planter le module au
// démarrage si le secret manque — même règle que higher-checkout.
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

/** Stripe impose au moins 30 minutes ; la réservation en tient 31. */
const SESSION_MIN = 30;

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"), SITE_CLUB);
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers });

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  // L'acheteur vient de la SESSION, jamais du corps.
  const { data: { user }, error: authErr } = await admin.auth.getUser(
    (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
  );
  if (authErr || !user?.email) return json({ error: "no_session" }, 401);
  const email = user.email.trim().toLowerCase();

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { /* body vide */ }
  // Un slug (FIGHER) ou l'ancien identifiant (pages de la boutique d'avant).
  let slug = typeof body.slug === "string" ? body.slug : "";
  if (!slug && typeof body.artwork_id === "string") {
    const { data: a } = await admin.from("artworks").select("slug").eq("id", body.artwork_id).maybeSingle();
    slug = a?.slug ?? "";
  }
  if (!slug) return json({ error: "artwork_required" }, 400);

  const { data: r, error: rErr } = await admin.rpc("art_primary_reserve", { p_slug: slug, p_buyer: user.id });
  if (rErr) {
    console.error("[artwork-checkout] reserve", rErr.message);
    return json({ error: "try_again" }, 503);
  }
  if (!r?.ok) {
    const st = r?.why === "thp_required" ? 402 : r?.why === "not_found" ? 404 : 409;
    return json({ error: r?.why ?? "unavailable" }, st);
  }

  try {
    const meta = { product: "artwork", reservation: String(r.reservation), artwork_slug: slug,
                   collection: String(r.collection), user_id: user.id, email };
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      expires_at: Math.floor(Date.now() / 1000) + SESSION_MIN * 60,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: r.currency,
          unit_amount: r.price_cents,
          product_data: {
            name: r.title,
            description: r.edition_total === 1
              ? "Unique digital artwork · 1/1 · owned on FIGHER.CLUB"
              : `Edition ${r.edition_next}/${r.edition_total} · owned on FIGHER.CLUB`,
          },
        },
      }],
      metadata: meta,
      payment_intent_data: { metadata: meta },
      success_url: `${SITE_CLUB}/market?owned=${encodeURIComponent(slug)}`,
      cancel_url: `${SITE_CLUB}/market?art=${encodeURIComponent(slug)}`,
    });
    await admin.rpc("art_reservation_session", { p_reservation: r.reservation, p_session: session.id });
    return json({ url: session.url, amount: r.price_cents, currency: r.currency, title: r.title });
  } catch (e) {
    console.error("[artwork-checkout] stripe", e instanceof Error ? e.message : e);
    // La réservation ne doit pas bloquer l'exemplaire pour rien.
    await admin.rpc("art_release", { p_reservation: r.reservation });
    return json({ error: "stripe" }, 502);
  }
});
