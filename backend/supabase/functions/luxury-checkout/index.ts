// TOTEHM · luxury-checkout — LANCER UNE TOTEHMISATION LUXE · 02/10/2026
// why : Wah, 02/10 — « la totehmisation luxe : 500 € pour la lancer, et
//       devoir posséder un TotehmPaper ». Le membre apporte SA pièce
//       (sac, veste, chaussures…) ; ce paiement lance le projet.
// how : le prix vit dans `luxury_offer` (slug `launch`), jamais dans la
//       page. Le THP se vérifie ICI, côté serveur (`_art_owns_thp`) — la
//       page ne fait que le dire. `metadata.product = 'luxury'` : le
//       webhook écrit `luxury_orders` (`luxury_settle`, idempotent sur la
//       session). Retour sur la boutique, chemin ABSOLU fixe.
// what : { url } — ou { price_cents, currency, open } si body.quote
//       (sans session : un prix affiché, pas un achat)

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_BOUT } from "../_shared/origins.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const PIECES = ["bag", "jacket", "shoes", "other"] as const;

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

  const piece = PIECES.includes(body?.piece as typeof PIECES[number]) ? String(body.piece) : "other";
  const note = String(body?.note ?? "").replace(/\s+/g, " ").trim().slice(0, 280);
  const email = user.email.trim().toLowerCase();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: o.currency,
          unit_amount: o.price_cents,
          product_data: {
            name: "Luxury totehmization · launch",
            description: "Your own piece, totehmized from one Box of your TOTEHM.",
          },
        },
        quantity: 1,
      }],
      metadata: { product: "luxury", user_id: user.id, email, piece, note },
      payment_intent_data: { metadata: { product: "luxury", user_id: user.id, piece } },
      success_url: `${SITE_BOUT}/luxury?launched=1`,
      cancel_url:  `${SITE_BOUT}/luxury`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error("[luxury-checkout] stripe:", e);
    return json({ error: "stripe" }, 502);
  }
});
