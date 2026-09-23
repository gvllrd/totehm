// TOTEHM · creator-subscribe
// ═══════════════════════════════════════════════════════════════════════
// Un membre s'abonne au Totehm d'un autre membre (MASTER §12-17).
//
//   Bob → Alice  ne donne RIEN à Alice sur Bob. À sens unique.
//
// ⚠️ LES RÈGLES VIVENT EN BASE, DANS `creator_offer` · 23/09/2026 :
//   · l'abonné est FIGHER (Totehm complet + THP + annuel)
//   · le créateur est FIGHER ET a activé « Monetize my Totehm »
//   · un prix, un endroit où virer, pas d'abonnement déjà actif
// Cette fonction ne recompose aucune règle : elle demande, et obéit.
//
// ⚠️ PAR PSEUDO, JAMAIS PAR IDENTIFIANT. La page connaît un pseudo (la
// recherche ne rend jamais d'id, règle de `search_totehms`). L'id du
// créateur est résolu ici, côté serveur. `creator_id` reste accepté
// pour ce qui l'envoyait déjà — il est retraduit en pseudo.
//
// ⚠️ LE 80/20 N'EST PAS DANS STRIPE (décision du 19/09). L'argent arrive
// entier ; `invoice.paid` écrit la part du créateur dans `member_ledger` ;
// les virements partent groupés le 1er au-dessus du seuil.
//
// ⚠️ LE PRIX VIENT DE LA BASE, JAMAIS DU CLIENT, et la metadata voyage EN
// DOUBLE (`subscription_data.metadata`) : les événements de cycle de vie
// et les factures ne portent que celle de l'abonnement.
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

  const { data: { user }, error: authErr } = await sb.auth.getUser(
    (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
  );
  if (authErr || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  let pseudo = "";
  try {
    const body = await req.json();
    pseudo = String(body?.pseudo ?? "").trim();
    if (!pseudo && body?.creator_id) {
      const { data: p } = await sb.from("profiles").select("pseudo")
        .eq("id", String(body.creator_id)).maybeSingle();
      pseudo = p?.pseudo ?? "";
    }
  } catch {
    return Response.json({ error: "bad request" }, { status: 400, headers: cors });
  }
  if (!pseudo) return Response.json({ error: "no creator" }, { status: 400, headers: cors });

  const { data: offer, error: oErr } = await sb.rpc("creator_offer",
    { p_pseudo: pseudo, p_fan: user.id });
  if (oErr) {
    console.error("[creator-subscribe] offer", oErr.message);
    return Response.json({ error: "try again" }, { status: 503, headers: cors });
  }
  if (!offer?.ok) {
    if (offer?.why === "already") return Response.json({ already: true }, { headers: cors });
    return Response.json({ error: offer?.why ?? "closed" }, { status: 409, headers: cors });
  }

  try {
    const meta = { product: "creator_sub", creator_id: offer.creator_id, fan_id: user.id };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: offer.currency ?? "eur",
          unit_amount: offer.price_cents,
          recurring: { interval: "month" },
          product_data: { name: `TOTEHM — ${pseudo} · monthly` },
        },
      }],
      // ⚠️ NI `transfer_data` NI `application_fee_percent` : l'argent
      // arrive ENTIER sur le compte de la plateforme (19/09). Le jour où
      // Connect reviendra, ces deux lignes reviendront avec lui.
      subscription_data: { metadata: meta },
      metadata: meta,
      success_url: `${SITE_CLUB}/console?subscribed=${encodeURIComponent(pseudo)}`,
      cancel_url: `${SITE_CLUB}/console?to=${encodeURIComponent(pseudo)}`,
    });
    return Response.json({ url: session.url }, { headers: cors });
  } catch (e) {
    console.error("[creator-subscribe]", e instanceof Error ? e.message : e);
    return Response.json({ error: "checkout unavailable" }, { status: 502, headers: cors });
  }
});
