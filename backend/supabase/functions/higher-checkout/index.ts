// ═══════════════════════════════════════════════════════════════
// TOTEHM · higher-checkout
// why : le prix et le palier ne vivent jamais côté client ;
//       l'email vient du JWT, jamais du body
// how : palier calculé serveur (777 premières à 17 €, puis 29 €),
//       metadata product='higher' pour que le webhook ne confonde
//       JAMAIS cet achat avec une commande Totehm Cloth
// what : renvoie l'url stripe vers laquelle rediriger
// verify_jwt = true
// ═══════════════════════════════════════════════════════════════

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "");

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const COHORT_MAX  = 777;
const PRICE_EARLY = 1700;  // 17 € — les 777 premières places
const PRICE_AFTER = 2900;  // 29 € — palier publié, jamais suggéré

const SITE = "https://www.totehm.space";
const ALLOWED = [SITE, "https://totehm.space", "http://localhost:3000"];

function cors(origin: string | null) {
  const allow = origin && ALLOWED.includes(origin) ? origin : SITE;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("origin"));
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers });

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!Deno.env.get("STRIPE_SECRET_KEY")) {
    return json({ error: "stripe key not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "no_session" }, 401);

  // L'email vient du JWT. Jamais du body : sinon n'importe qui
  // peut acheter au nom de quelqu'un d'autre.
  const asUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authErr } = await asUser.auth.getUser();
  if (authErr || !user?.email) return json({ error: "no_session" }, 401);

  const email = user.email.trim().toLowerCase();

  // Déjà membre : on ne vend pas ce qu'il possède.
  const { data: existing } = await admin
    .from("stoner_access")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (existing) return json({ already: true }, 200);

  // Le palier est calculé SERVEUR. Un prix côté client se modifie
  // en deux clics dans les devtools.
  const { count } = await admin
    .from("stoner_access")
    .select("email", { count: "exact", head: true });

  const taken  = count ?? 0;
  const amount = taken < COHORT_MAX ? PRICE_EARLY : PRICE_AFTER;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{
        price_data: {
          currency: "eur",
          unit_amount: amount,
          product_data: {
            name: "Figher Club — Higher",
            description: "Stoner Method, ten steps, for life. Numbered place.",
          },
        },
        quantity: 1,
      }],
      // LA CLÉ DE TOUT : le webhook n'accorde l'accès QUE si
      // product === 'higher'. Sans ça, chaque acheteur de Totehm
      // Cloth recevrait l'accès Higher gratuitement.
      metadata: { product: "higher", email },
      success_url: `${SITE}/stoner.html?checked=1`,
      cancel_url:  `${SITE}/get_higher.html`,
    });

    return json({ url: session.url, amount });
  } catch (e) {
    console.error("stripe:", e);
    return json({ error: "stripe" }, 502);
  }
});
