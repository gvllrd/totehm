// TOTEHM · subscription-checkout
// Crée une session Stripe Checkout mode subscription pour le Figher Club.
// 7 jours d'essai · prix verrouillé au moment de l'adhésion · verify_jwt=true

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_SPACE } from "../_shared/origins.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"), SITE_SPACE);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { data: { user }, error: authErr } = await sb.auth.getUser(
    (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
  );
  if (authErr || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  // Déjà membre actif ou en trial
  const { data: existing } = await sb
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  if (existing) return Response.json({ already: true }, { headers: cors });

  // Prix figé côté serveur — jamais côté client
  const priceId = Deno.env.get("PRICE_FIGHER_YEAR");
  if (!priceId) {
    return Response.json({ error: "price not configured" }, { status: 500, headers: cors });
  }
  const stripePrice = await stripe.prices.retrieve(priceId);
  const lockedPriceCents = stripePrice.unit_amount ?? 7700;

  // Réutiliser le customer Stripe si déjà créé
  const { data: prevSub } = await sb
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .not("stripe_customer_id", "is", null)
    .maybeSingle();

  let customerId: string;
  if (prevSub?.stripe_customer_id) {
    customerId = prevSub.stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({
      email: user.email!,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,
      // Metadata posée ici ET sur la session :
      // les événements de cycle de vie (updated/deleted) ne portent pas
      // la metadata de la session — ils portent celle de la subscription.
      metadata: {
        product:             "subscription",
        supabase_user_id:    user.id,
        member_locked_price: String(lockedPriceCents),
      },
    },
    metadata: {
      product:             "subscription",
      supabase_user_id:    user.id,
      member_locked_price: String(lockedPriceCents),
    },
    success_url: SITE_SPACE + "/totehm.html?club=joined",
    cancel_url:  SITE_SPACE + "/totehm.html?club=cancel",
  });

  return Response.json({ url: session.url }, { headers: cors });
});
