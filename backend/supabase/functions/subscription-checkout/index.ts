// TOTEHM · subscription-checkout
// ═══════════════════════════════════════════════════════════════════════
// L'ADHÉSION FIGHER CLUB — annuelle, 7 jours d'essai, prix verrouillé.
// verify_jwt = true.
//
// ⚠️ THE VELVET ROPE · 23/09/2026 (MASTER §1, §11). Le Club n'est pas la
// première étape : on n'achète l'annuel qu'avec un TOTEHM COMPLET et un
// THP. Vérifié ICI, côté serveur, par `_figher` — la même fonction que
// l'Espace, la Boutique et le bot. Une page peut mentir sur ce qu'elle a
// affiché ; cette fonction, non.
//
// ⚠️ LE PRIX VIENT DE STRIPE, ET DE LUI SEUL. `{ preview: true }` rend le
// prix du `PRICE_FIGHER_YEAR` SANS session : la page de vente l'affiche
// sans jamais l'écrire en dur. Le jour où le palier change dans Stripe,
// la page change avec lui (SYSTEM.md §3 : « jamais dans le frontend »).
// ═══════════════════════════════════════════════════════════════════════
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_CLUB } from "../_shared/origins.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"), SITE_CLUB);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* corps vide : un checkout */ }

  const priceId = Deno.env.get("PRICE_FIGHER_YEAR");
  if (!priceId) {
    return Response.json({ error: "price not configured" }, { status: 500, headers: cors });
  }

  // ── LE PRIX, POUR LA PAGE DE VENTE — sans session, sans rien créer.
  if (body.preview === true) {
    try {
      const p = await stripe.prices.retrieve(priceId);
      return Response.json({
        price_cents: p.unit_amount ?? null,
        currency: p.currency ?? "eur",
        interval: p.recurring?.interval ?? "year",
        trial_days: 7,
      }, { headers: cors });
    } catch (e) {
      console.error("[subscription-checkout] preview", e instanceof Error ? e.message : e);
      return Response.json({ error: "price unavailable" }, { status: 502, headers: cors });
    }
  }

  const { data: { user }, error: authErr } = await sb.auth.getUser(
    (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
  );
  if (authErr || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  // ── THE VELVET ROPE — TOTEHM complet + THP avant l'annuel.
  const { data: f, error: fErr } = await sb.rpc("_figher", { p_user: user.id });
  if (fErr) {
    // ⚠️ UNE RPC QUI ÉCHOUE SE DIT. Laisser passer sur une erreur, ce
    // serait vendre l'annuel à quelqu'un que la règle refuse.
    console.error("[subscription-checkout] _figher", fErr.message);
    return Response.json({ error: "rope unavailable" }, { status: 503, headers: cors });
  }
  if (!f?.complete || !f?.thp) {
    return Response.json({
      error: "velvet",
      complete: !!f?.complete, remplies: f?.remplies ?? 0, thp: !!f?.thp,
    }, { status: 409, headers: cors });
  }

  // Déjà membre actif ou en essai
  const { data: existing } = await sb
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  if (existing) return Response.json({ already: true }, { headers: cors });

  // Prix figé côté serveur — jamais côté client
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
    // ⚠️ CHEMINS ABSOLUS, ET SUR LE CLUB. L'ancienne URL visait
    // `totehm.space/totehm.html` — qui redirige vers la carte depuis le
    // swap : le nouveau membre atterrissait loin de sa console.
    success_url: SITE_CLUB + "/console?joined=1",
    cancel_url:  SITE_CLUB + "/?cancel=1",
  });

  return Response.json({ url: session.url }, { headers: cors });
});
