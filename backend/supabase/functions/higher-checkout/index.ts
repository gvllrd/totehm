// TOTEHM · higher-checkout
// why : le prix ne vit jamais côté client ; l'email vient du JWT
// how : palier calculé SERVEUR sur le nombre réel de membres,
//       metadata product='higher' pour que le webhook ne confonde
//       jamais cet achat avec une commande Totehm Cloth
// what : { url, amount, tier } — ou { amount, tier } si body.quote

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, resolveOrigin, SITE_COM } from "../_shared/origins.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// Paliers en nombre d'or, arrêtés à 5.
// MIROIR de goldenTiers dans higher.html — modifier les deux ensemble.
// Le front AFFICHE, ce fichier APPLIQUE.
const TIERS = [
  { tier: 1, limit:   77, cents: 1100 },
  { tier: 2, limit:  202, cents: 1800 },
  { tier: 3, limit:  404, cents: 2900 },
  { tier: 4, limit:  731, cents: 4700 },
  { tier: 5, limit: 1260, cents: 7600 },
];
const BEYOND = { tier: 6, cents: 12300 };  // au-delà de 1260, on décidera

function tierFor(taken: number) {
  for (const t of TIERS) if (taken < t.limit) return t;
  return BEYOND;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin, SITE_COM);
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers });

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!Deno.env.get("STRIPE_SECRET_KEY")) {
    return json({ error: "stripe key not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "no_session" }, 401);

  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authErr } = await asUser.auth.getUser();
  if (authErr || !user?.email) return json({ error: "no_session" }, 401);

  const email = user.email.trim().toLowerCase();

  const { data: existing } = await admin
    .from("stoner_access")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (existing) return json({ already: true }, 200);

  const { count } = await admin
    .from("stoner_access")
    .select("email", { count: "exact", head: true });

  const taken = count ?? 0;
  const t = tierFor(taken);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { /* body vide accepté */ }

  // ?quote : le front demande juste le prix à afficher, sans créer
  // de session Stripe. Évite d'annoncer un prix et d'en facturer un autre.
  if (body?.quote === true) {
    return json({ amount: t.cents, tier: t.tier, taken }, 200);
  }

  // La renonciation au droit de rétractation est obligatoire (EU).
  if (body?.waiver !== true) {
    return json({ error: "waiver_required" }, 400);
  }

  const site = resolveOrigin(origin, SITE_COM);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{
        price_data: {
          currency: "eur",
          unit_amount: t.cents,
          product_data: {
            name: `Figher Club — Higher · Tier ${t.tier}`,
            description: "Stoner Method, ten steps, for life. Numbered place.",
          },
        },
        quantity: 1,
      }],
      metadata: {
        product: "higher",
        email,
        tier: String(t.tier),
        waiver: "true",
        waiver_ts: String(body?.waiver_ts ?? new Date().toISOString()),
      },
      success_url: `${site}/stoner.html?checked=1`,
      cancel_url:  `${site}/get_higher.html`,
    });

    return json({ url: session.url, amount: t.cents, tier: t.tier });
  } catch (e) {
    console.error("stripe:", e);
    return json({ error: "stripe" }, 502);
  }
});
