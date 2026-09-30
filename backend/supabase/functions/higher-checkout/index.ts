// TOTEHM · higher-checkout — LE TOTEHMPAPER {THP}
// why : le prix ne vit jamais côté client ; l'email vient du JWT
// how : ⚠️ 30/09/2026 — LE PRIX VIENT DE LA BASE, À UN SEUL ENDROIT :
//       la ligne `artworks` du THP (`slug = 'totehmpaper'`, 777 000
//       exemplaires, brief du 30/09 : « $17 initial »). Les paliers en
//       nombre d'or et le forfait international (€11 → €77) sont retirés :
//       le THP est désormais une œuvre de collection FIGHER, son prix
//       initial est un seul chiffre, et les pages le lisent au même
//       endroit que cette fonction. `metadata.product = 'higher'` reste :
//       le webhook écrit `stoner_access`, la base frappe l'exemplaire n.
// what : { url, amount, currency } — ou { amount, currency, left } si
//       body.quote (ouvert SANS session : c'est un prix affiché, pas un
//       achat)

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, origineDe, SITE_BOUT, SITE_CLUB } from "../_shared/origins.ts";

// Pas de fallback `?? ""` : Stripe accepterait la clé vide, échouerait
// silencieusement au premier appel. Le `!` fait planter le module au
// démarrage — la fonction ne démarre pas tant que le secret n'est pas
// là. C'est mieux qu'un paiement fantôme.
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

/** Le prix du THP, lu dans la source unique. */
async function prixTHP() {
  const { data, error } = await admin.from("artworks")
    .select("price_cents, currency, edition_total, edition_sold")
    .eq("slug", "totehmpaper").maybeSingle();
  if (error || !data) throw new Error("THP price missing: " + (error?.message ?? "no row"));
  return data as { price_cents: number; currency: string; edition_total: number; edition_sold: number };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin, SITE_BOUT);
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers });

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { /* body vide accepté */ }

  let p;
  try { p = await prixTHP(); } catch (e) {
    console.error("[higher-checkout]", e instanceof Error ? e.message : e);
    return json({ error: "price_unavailable" }, 503);
  }
  const left = Math.max(0, p.edition_total - p.edition_sold);

  // ?quote : le prix à afficher, sans session Stripe, et sans session
  // membre — une page publique annonce le prix que cette fonction
  // facturera, jamais un autre.
  if (body?.quote === true) {
    return json({ amount: p.price_cents, currency: p.currency, left }, 200);
  }
  if (left <= 0) return json({ error: "sold_out" }, 409);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "no_session" }, 401);
  const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authErr || !user?.email) return json({ error: "no_session" }, 401);
  const email = user.email.trim().toLowerCase();

  const { data: existing } = await admin
    .from("stoner_access")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (existing) return json({ already: true }, 200);

  // La renonciation au droit de rétractation est obligatoire (EU).
  if (body?.waiver !== true) {
    return json({ error: "waiver_required" }, 400);
  }

  // D'où vient l'achat, là il revient : le marché FIGHER (l'exemplaire
  // apparaît dans My collection) ou la boutique (la méthode s'ouvre).
  // Chemins ABSOLUS sur des origines fixes — jamais une URL reçue.
  const duClub = origineDe("club", origin);
  const retour = duClub ? `${SITE_CLUB}/market?owned=totehmpaper` : `${SITE_BOUT}/stoner.html?checked=1`;
  const annule = duClub ? `${SITE_CLUB}/market?art=totehmpaper` : `${SITE_BOUT}/get_higher.html`;

  try {
    // payment_method_types explicite : Stripe refuse une devise sans
    // moyens de paiement activés dans le dashboard (même raison que
    // artwork-checkout).
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: p.currency,
          unit_amount: p.price_cents,
          product_data: {
            name: "TotehmPaper {THP}",
            description: `Stoner Method, ten steps, for life. Edition of ${p.edition_total.toLocaleString("en-US")}.`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        product: "higher",
        email,
        geo: String(body?.geo ?? ""),
        waiver: "true",
        waiver_ts: String(body?.waiver_ts ?? new Date().toISOString()),
      },
      success_url: retour,
      cancel_url:  annule,
    });

    return json({ url: session.url, amount: p.price_cents, currency: p.currency });
  } catch (e) {
    console.error("stripe:", e);
    return json({ error: "stripe" }, 502);
  }
});
