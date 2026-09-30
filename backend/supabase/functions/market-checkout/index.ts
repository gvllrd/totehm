// TOTEHM · market-checkout — LA REVENTE D'UN EXEMPLAIRE · 30/09/2026
// ═══════════════════════════════════════════════════════════════════════
// why : un propriétaire met son exemplaire en vente sur FIGHER ; un autre
//       membre l'achète. Même mécanique que le premier achat — une seule
//       vérité en base, un seul règlement par le webhook.
// how : 1 · `art_resale_reserve` tient l'exemplaire 31 minutes pour CET
//           acheteur, au prix AFFICHÉ (verrou sur la ligne, index unique :
//           un seul acheteur à la fois ; le vendeur ne peut plus retirer
//           l'annonce tant qu'elle est tenue) ;
//       2 · Stripe Checkout, session de 30 minutes ;
//       3 · le webhook (`product: resale`) appelle `art_settle` : la
//           propriété change de main, 7 % de redevance à TOTEHM, 93 % au
//           grand livre du vendeur (`member_ledger`), versés par le
//           virement mensuel existant. Pas de Stripe Connect.
// what : { url, amount, currency } | { error }
// ═══════════════════════════════════════════════════════════════════════

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_CLUB } from "../_shared/origins.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const SESSION_MIN = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"), SITE_CLUB);
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers });

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const { data: { user }, error: authErr } = await admin.auth.getUser(
    (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
  );
  if (authErr || !user?.email) return json({ error: "no_session" }, 401);
  const email = user.email.trim().toLowerCase();

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { /* body vide */ }
  const edition = typeof body.edition_id === "string" ? body.edition_id : "";
  if (!UUID.test(edition)) return json({ error: "edition_required" }, 400);

  const { data: r, error: rErr } = await admin.rpc("art_resale_reserve", { p_edition: edition, p_buyer: user.id });
  if (rErr) {
    console.error("[market-checkout] reserve", rErr.message);
    return json({ error: "try_again" }, 503);
  }
  if (!r?.ok) return json({ error: r?.why ?? "unavailable" }, r?.why === "thp_required" ? 402 : 409);

  try {
    const meta = { product: "resale", reservation: String(r.reservation), edition_id: edition,
                   artwork_slug: String(r.slug), user_id: user.id, email };
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
            description: `Edition ${r.edition}/${r.edition_total} · resale · owned on FIGHER.CLUB`,
          },
        },
      }],
      metadata: meta,
      payment_intent_data: { metadata: meta },
      success_url: `${SITE_CLUB}/market?owned=${encodeURIComponent(String(r.slug))}`,
      cancel_url: `${SITE_CLUB}/market?art=${encodeURIComponent(String(r.slug))}`,
    });
    await admin.rpc("art_reservation_session", { p_reservation: r.reservation, p_session: session.id });
    return json({ url: session.url, amount: r.price_cents, currency: r.currency });
  } catch (e) {
    console.error("[market-checkout] stripe", e instanceof Error ? e.message : e);
    await admin.rpc("art_release", { p_reservation: r.reservation });
    return json({ error: "stripe" }, 502);
  }
});
