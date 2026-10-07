// TOTEHM · higher-sub — L'ABONNEMENT HIGHER (TotehmSM) · 07/10/2026
// why : Wah, 07/10 — TotehmSM est « accessible seulement aux membres payants
//       ayant un abonnement Higher ». L'abonnement existait en base
//       (`bot_subscriptions`, 7 €/mois, `totehmbot_access`) sans aucun chemin
//       de paiement.
// how : trois gestes, le compte vient TOUJOURS de la session :
//       checkout — Stripe Checkout, mode abonnement, le prix lu CHEZ STRIPE
//                  par sa clé de recherche `higher_month` (jamais un montant
//                  dans la page ni ici). Prix absent → `not_ready` : le créer
//                  en live est le « oui » de Wah. La metadata voyage EN DOUBLE
//                  (`product: higher_sub`, `user_id`) ; le webhook écrit
//                  `bot_subscriptions` par `higher_sub_sync`.
//       cancel   — s'arrête À LA FIN de la période (ce qui est payé est dû).
//       resume   — annule l'arrêt demandé.
// what : { url } · { ok, until } · { error }

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_COM } from "../_shared/origins.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const LOOKUP = "higher_month";

Deno.serve(async (req) => {
  const headers = { ...corsHeaders(req.headers.get("origin"), SITE_COM), "Cache-Control": "no-store" };
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const { data: { user }, error: authErr } = await admin.auth.getUser((req.headers.get("Authorization") ?? "").replace("Bearer ", ""));
  if (authErr || !user?.email) return json({ error: "no_session" }, 401);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_) { return json({ error: "bad_request" }, 400); }

  const { data: bs, error: bErr } = await admin.from("bot_subscriptions")
    .select("stripe_subscription_id, status, ending").eq("user_id", user.id).maybeSingle();
  if (bErr) { console.error("[higher-sub] read", bErr.message); return json({ error: "unavailable" }, 503); }
  const vivant = !!bs && ["active", "trialing", "past_due"].includes(bs.status);

  if (body.action === "checkout") {
    if (vivant) return json({ error: "active" }, 409);
    let price: Stripe.Price | undefined;
    try { price = (await stripe.prices.list({ lookup_keys: [LOOKUP], active: true, limit: 1 })).data[0]; }
    catch (e) { console.error("[higher-sub] price", String(e).slice(0, 200)); return json({ error: "unavailable" }, 503); }
    if (!price) return json({ error: "not_ready" }, 503);
    const { data: s } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    const meta = { product: "higher_sub", user_id: user.id };
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: price.id, quantity: 1 }],
        ...(s?.stripe_customer_id ? { customer: s.stripe_customer_id } : { customer_email: user.email }),
        metadata: meta,
        subscription_data: { metadata: meta },
        success_url: SITE_COM + "/totehm?higher=paid",
        cancel_url: SITE_COM + "/totehm",
      });
      return json({ url: session.url });
    } catch (e) {
      console.error("[higher-sub] checkout", String(e).slice(0, 240));
      return json({ error: "unavailable" }, 502);
    }
  }

  if (body.action === "cancel" || body.action === "resume") {
    if (!vivant || !bs?.stripe_subscription_id) return json({ error: "not_subscribed" }, 404);
    try {
      const sub = await stripe.subscriptions.update(bs.stripe_subscription_id, { cancel_at_period_end: body.action === "cancel" });
      return json({ ok: true, ending: sub.cancel_at_period_end, until: new Date(sub.current_period_end * 1000).toISOString() });
    } catch (e) {
      console.error("[higher-sub] " + body.action, String(e).slice(0, 240));
      return json({ error: "unavailable" }, 502);
    }
  }

  return json({ error: "action" }, 400);
});
