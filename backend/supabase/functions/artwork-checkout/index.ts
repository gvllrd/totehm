// TOTEHM · artwork-checkout
// Vérifie stoner_access → réserve l'œuvre → génère le lien Stripe
// Le prix vit en base, JAMAIS côté client

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

// Pas de fallback vide : Stripe accepterait "", échouerait au premier appel,
// et un checkout partirait en fantôme. Le `!` fait planter le module au démarrage
// si le secret manque — même règle que higher-checkout.
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const SITE_COM = "https://www.totehm.com";
const ALLOWED_ORIGINS = [
  SITE_COM, "https://totehm.com",
  "https://www.totehm.space", "https://totehm.space",
  "https://www.higher.boutique", "https://higher.boutique",
  "http://localhost:3000",
];

function resolveOrigin(origin: string | null): string {
  return origin && ALLOWED_ORIGINS.includes(origin) ? origin : SITE_COM;
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveOrigin(origin),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

const RESERVE_MS = 10 * 60 * 1000;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers });

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  // 1. Auth JWT
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

  // 2. Body
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { /* body vide */ }

  const artworkId = body?.artwork_id as string;
  if (!artworkId) return json({ error: "artwork_id_required" }, 400);

  // 3. Vérif stoner_access — gate THP
  const { data: access } = await admin
    .from("stoner_access")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (!access) {
    return json({ error: "thp_required", redirect: "/get_higher.html" }, 402);
  }

  // 4. Charger l'œuvre
  const { data: artwork, error: artErr } = await admin
    .from("artworks")
    .select("*")
    .eq("id", artworkId)
    .maybeSingle();

  if (artErr || !artwork) return json({ error: "not_found" }, 404);

  // 5. Vérif disponibilité
  if (artwork.series === "quantum") {
    const lockExpired =
      artwork.status === "reserved" &&
      artwork.reserved_until &&
      new Date(artwork.reserved_until) < new Date();
    if (artwork.status !== "available" && !lockExpired) {
      return json({ error: "unavailable" }, 409);
    }
  } else {
    if (artwork.edition_sold >= artwork.edition_total) {
      return json({ error: "sold_out" }, 409);
    }
  }

  // 6. Lock quantum uniquement
  if (artwork.series === "quantum") {
    const { error: lockErr } = await admin
      .from("artworks")
      .update({
        status: "reserved",
        reserved_for: user.id,
        reserved_until: new Date(Date.now() + RESERVE_MS).toISOString(),
      })
      .eq("id", artworkId)
      .in("status", ["available", "reserved"]);

    if (lockErr) {
      console.error("lock artwork:", lockErr.message);
      return json({ error: "unavailable" }, 409);
    }
  }

  // 7. Stripe Checkout — prix depuis la DB
  const site = resolveOrigin(origin);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{
        price_data: {
          currency: artwork.currency,
          unit_amount: artwork.price_cents,
          product_data: {
            name: artwork.title,
            description: artwork.series === "quantum"
              ? "Quantum Series — 1/1 unique digital artwork by Wavywah"
              : `22 Signaux de Lisbonne — Edition ${artwork.edition_sold + 1}/${artwork.edition_total}`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        product: "artwork",
        artwork_id: artwork.id,
        artwork_slug: artwork.slug,
        series: artwork.series,
        user_id: user.id,
        email,
      },
      success_url: `${site}/merci.html?artwork=${artwork.slug}`,
      cancel_url:  `${site}/galerie.html`,
    });

    return json({ url: session.url, amount: artwork.price_cents, title: artwork.title });
  } catch (e) {
    console.error("stripe:", e);
    if (artwork.series === "quantum") {
      await admin.from("artworks")
        .update({ status: "available", reserved_for: null, reserved_until: null })
        .eq("id", artworkId);
    }
    return json({ error: "stripe" }, 502);
  }
});
