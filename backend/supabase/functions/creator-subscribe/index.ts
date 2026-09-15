// TOTEHM · creator-subscribe
// ═══════════════════════════════════════════════════════════════════════
// Un fan s'abonne au HigherSelf d'un créateur. C'est ICI que le 80/20
// devient automatique — et c'est Stripe qui le fait, pas nous.
//
//   transfer_data.destination = le compte connecté du créateur
//   application_fee_percent   = 20
//
// À chaque renouvellement, Stripe verse 80 % au créateur et 20 % à la
// plateforme, sans virement manuel, sans réconciliation, sans personne au
// milieu. C'est exactement ce qu'on promet aux influenceurs, et c'est une
// ligne de configuration, pas un système à construire.
//
// ⚠️ LE PRIX VIENT DE LA BASE, JAMAIS DU CLIENT. Un montant posté par le
// navigateur se change en deux clics dans l'inspecteur : quelqu'un
// s'abonnerait à 0,01 € et le créateur verrait un fan de plus pour rien.
//
// ⚠️ ET LA METADATA VOYAGE EN DOUBLE. Les événements de cycle de vie d'un
// abonnement (renouvellement, échec, annulation) ne portent PAS la
// metadata de la session Checkout — or ce sont eux qui coupent l'accès.
// Elle est donc posée AUSSI dans `subscription_data.metadata`.
// Irrattrapable après coup : un abonnement créé sans elle ne sait plus à
// qui il appartient.
// ═══════════════════════════════════════════════════════════════════════
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_COM } from "../_shared/origins.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

/** La part de la plateforme. Elle vit ici et dans `creator-dashboard`,
 *  nulle part ailleurs — et les deux doivent dire la même chose. */
const PART_TOTEHM = 20;

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"), SITE_COM);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { data: { user }, error: authErr } = await sb.auth.getUser(
    (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
  );
  if (authErr || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  let creatorId = "";
  try {
    creatorId = String((await req.json())?.creator_id ?? "");
  } catch {
    return Response.json({ error: "bad request" }, { status: 400, headers: cors });
  }
  if (!creatorId) {
    return Response.json({ error: "no creator" }, { status: 400, headers: cors });
  }
  if (creatorId === user.id) {
    return Response.json({ error: "that is you" }, { status: 422, headers: cors });
  }

  // Le prix ET le compte viennent de la base, sous service_role : c'est la
  // seule lecture qui fasse autorité.
  const { data: c } = await sb
    .from("creator_profiles")
    .select("stripe_account_id,custom_sub_price,currency,charges_enabled")
    .eq("user_id", creatorId)
    .maybeSingle();

  if (!c?.stripe_account_id || !c.charges_enabled || !c.custom_sub_price) {
    return Response.json(
      { error: "this creator is not open yet" },
      { status: 409, headers: cors },
    );
  }

  // Déjà abonné : on ne vend pas deux fois la même chose.
  const { data: deja } = await sb
    .from("creator_subscriptions")
    .select("status")
    .eq("creator_id", creatorId)
    .eq("fan_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  if (deja) return Response.json({ already: true }, { headers: cors });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: c.currency ?? "eur",
          unit_amount: c.custom_sub_price,
          recurring: { interval: "month" },
          product_data: { name: "HigherSelf — monthly" },
        },
      }],
      subscription_data: {
        application_fee_percent: PART_TOTEHM,
        transfer_data: { destination: c.stripe_account_id },
        // ⚠️ LA METADATA EN DOUBLE — voir l'en-tête. Sans celle-ci, un
        // renouvellement ou une annulation arrive orphelin.
        metadata: {
          product: "creator_sub",
          creator_id: creatorId,
          fan_id: user.id,
        },
      },
      metadata: {
        product: "creator_sub",
        creator_id: creatorId,
        fan_id: user.id,
      },
      success_url: `${SITE_COM}/club?joined=1`,
      cancel_url: `${SITE_COM}/club`,
    });

    return Response.json({ url: session.url }, { headers: cors });
  } catch (e) {
    console.error("[creator-subscribe]", e instanceof Error ? e.message : e);
    return Response.json(
      { error: "checkout unavailable" },
      { status: 502, headers: cors },
    );
  }
});
