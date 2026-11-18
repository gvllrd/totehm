// TOTEHM · creator-cut-off
// ═══════════════════════════════════════════════════════════════════════
// Un créateur COUPE un de ses abonnés (18/11/2026). Wah : « your subscribers
// play by your rules or get cut off instantly » · « if it's marked SILENCE,
// you respect it strictly, or one report gets your subscription revoked ».
// Ses trois décisions : le CRÉATEUR coupe, depuis la liste de ses abonnés ;
// AUCUN remboursement ; un abonné coupé ne se réabonne JAMAIS à ce créateur.
//
//   1 · le créateur vient de la SESSION, jamais du corps ; le corps ne porte
//       que le NOM TOTEHM de l'abonné (`pseudo`), comme partout.
//   2 · `creator_cut_off` (serveur seul) bannit et coupe l'accès dans la même
//       transaction : dès cet instant, l'abonné ne lit plus rien.
//   3 · Stripe : l'abonnement est ARRÊTÉ (`subscriptions.cancel`, sans
//       prorata ni facture) — il ne se renouvellera jamais. Aucun argent ne
//       part : un remboursement reste un geste à la main, dans Stripe.
//   4 · Stripe refuse ? L'accès est déjà coupé, et un incident
//       `creator_cut_off_stripe` dit d'arrêter l'abonnement à la main. La
//       garde de la base (`_creator_ban_guard`) empêche quoi qu'il arrive un
//       banni de redevenir actif.
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

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"), SITE_COM);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "method" }, { status: 405, headers: cors });

  const { data: { user }, error: authErr } = await sb.auth.getUser(
    (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
  );
  if (authErr || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  let pseudo = "";
  try {
    const body = await req.json();
    pseudo = String(body?.pseudo ?? "").trim().slice(0, 32);
  } catch {
    return Response.json({ error: "bad request" }, { status: 400, headers: cors });
  }
  if (!pseudo) return Response.json({ error: "no subscriber" }, { status: 400, headers: cors });

  const { data: cut, error: cErr } = await sb.rpc("creator_cut_off", { p_creator: user.id, p_pseudo: pseudo });
  if (cErr) {
    console.error("[creator-cut-off] base", cErr.message);
    return Response.json({ error: "try again" }, { status: 503, headers: cors });
  }
  if (!cut?.ok) return Response.json({ error: cut?.why ?? "refused" }, { status: 409, headers: cors });

  // Stripe : l'abonnement ne se renouvellera jamais. Ni prorata, ni facture — aucun argent ne part d'ici.
  let stripeArrete: boolean | null = null;
  const subId = typeof cut.stripe_subscription_id === "string" ? cut.stripe_subscription_id : "";
  if (subId) {
    try {
      await stripe.subscriptions.cancel(subId, { prorate: false, invoice_now: false });
      stripeArrete = true;
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "";
      // déjà arrêté chez Stripe : rien à faire
      if (code === "resource_missing") stripeArrete = true;
      else {
        stripeArrete = false;
        console.error("[creator-cut-off] stripe", e instanceof Error ? e.message : e);
        const { error: iErr } = await sb.from("market_incidents").insert({
          kind: "creator_cut_off_stripe",
          detail: { creator_id: user.id, stripe_subscription_id: subId,
                    note: "the subscriber is cut off here, but Stripe refused to cancel: cancel this subscription by hand" },
        });
        if (iErr) console.error("[creator-cut-off] incident", iErr.message);
      }
    }
  }
  return Response.json({ ok: true, pseudo: cut.pseudo, stripe: stripeArrete }, { headers: cors });
});
