// TOTEHM · luxury-checkout — PAYER UN DEVIS LUXE · 05/10/2026
// why : Wah, 05/10 — « le luxe en mode devis ». Le prix n'est plus un
//       lancement fixe : c'est le devis que Wah a posé sur la demande du
//       membre (`luxury_quotes.quote_cents`, via luxury-quote). Le membre
//       accepte et paie CE prix.
// how : le devis est relu ICI : il doit être au membre de la session, en
//       statut `quoted`, avec un prix. Le THP se vérifie ICI (`_art_owns_thp`).
//       Un compte du banc d'essai (`boutique_testers`, actif) paie son prix
//       d'essai à la place — `metadata.test = '1'`, la commande porte `test`.
//       `metadata.product = 'luxury'` + `quote_id` : le webhook écrit
//       `luxury_orders` (`luxury_settle`) puis ferme le devis
//       (`luxury_quote_paid`). Retour sur la boutique, chemin ABSOLU fixe.
// what : { url } — ou { price_cents, currency, open } si body.quote
//       (sans session : le « à partir de », pas un achat)

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_BOUT } from "../_shared/origins.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin, SITE_BOUT);
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers });

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { /* body vide accepté */ }

  const { data: o, error: oErr } = await admin.from("luxury_offer")
    .select("price_cents, currency, active").eq("slug", "launch").maybeSingle();
  if (oErr || !o) {
    console.error("[luxury-checkout] offre:", oErr?.message ?? "absente");
    return json({ error: "price_unavailable" }, 503);
  }
  if (body?.quote === true) return json({ price_cents: o.price_cents, currency: o.currency, open: o.active });
  if (!o.active) return json({ error: "closed" }, 409);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "no_session" }, 401);
  const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authErr || !user?.email) return json({ error: "no_session" }, 401);

  // Le TotehmPaper est la condition — vérifiée ici, jamais par la page.
  const { data: thp, error: thpErr } = await admin.rpc("_art_owns_thp", { p_user: user.id });
  if (thpErr) {
    console.error("[luxury-checkout] _art_owns_thp:", thpErr.message);
    return json({ error: "unavailable" }, 503);
  }
  if (thp !== true) return json({ error: "thp_required" }, 402);

  // Le devis : à ce membre, posé par Wah, pas encore payé.
  const quoteId = String(body?.quote_id ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quoteId)) return json({ error: "no_quote" }, 409);
  const { data: q, error: qErr } = await admin.from("luxury_quotes")
    .select("id, piece, brand, note, status, quote_cents, currency")
    .eq("id", quoteId).eq("user_id", user.id).maybeSingle();
  if (qErr) {
    console.error("[luxury-checkout] devis:", qErr.message);
    return json({ error: "unavailable" }, 503);
  }
  if (!q || q.status !== "quoted" || !q.quote_cents) return json({ error: "no_quote" }, 409);

  // Le banc d'essai : un prix d'essai pour CE compte, ou rien.
  const { data: testCents, error: tErr } = await admin.rpc("_boutique_test_price", { p_user: user.id });
  if (tErr) console.error("[luxury-checkout] test price:", tErr.message);
  const test = Number.isInteger(testCents) && testCents >= 50;
  const amount = test ? testCents as number : q.quote_cents;
  const email = user.email.trim().toLowerCase();
  const note = String(q.note ?? "").slice(0, 280);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: q.currency || o.currency,
          unit_amount: amount,
          product_data: {
            name: (test ? "TEST · " : "") + `Luxury totehmization · ${q.brand}`,
            description: `Your ${q.piece}, totehmized from one Box of your TOTEHM.`,
          },
        },
        quantity: 1,
      }],
      metadata: { product: "luxury", user_id: user.id, email, piece: q.piece, note, quote_id: q.id, test: test ? "1" : "0" },
      payment_intent_data: { metadata: { product: "luxury", user_id: user.id, piece: q.piece, quote_id: q.id, test: test ? "1" : "0" } },
      success_url: `${SITE_BOUT}/luxury?paid=1`,
      cancel_url:  `${SITE_BOUT}/luxury`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error("[luxury-checkout] stripe:", e);
    return json({ error: "stripe" }, 502);
  }
});
