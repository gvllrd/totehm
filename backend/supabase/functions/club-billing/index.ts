// TOTEHM · club-billing — BILLING, depuis la console FIGHER · 23/09/2026
// ═══════════════════════════════════════════════════════════════════════
// MASTER §14 : pour chaque souscription, « gestion, annulation ».
// Deux gestes, et rien d'autre :
//
//   { action: "portal" }                      → le portail Stripe de
//        l'adhésion FIGHER (carte, factures, annulation). On n'écrit pas
//        un portail de facturation : Stripe en a un, conforme, traduit.
//
//   { action: "cancel_creator", pseudo }      → l'abonnement au Totehm de
//        `pseudo` s'arrête À LA FIN DE LA PÉRIODE. Jamais tout de suite :
//        ce qui est payé est dû. Le webhook `customer.subscription.updated`
//        pose `ending` en base, la console le lit.
//
// ⚠️ LE CLIENT STRIPE ET L'ABONNEMENT VIENNENT DE LA SESSION, jamais du
// corps. Sinon n'importe qui ouvrirait le portail d'un autre, ou
// annulerait l'abonnement d'un autre en changeant un pseudo.
// ⚠️ LE PORTAIL DOIT ÊTRE ACTIVÉ UNE FOIS DANS STRIPE (Settings →
// Billing → Customer portal). Sans lui, Stripe répond une erreur que la
// page affiche telle quelle — pas « réessaie ».
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

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return Response.json({ error: "bad request" }, { status: 400, headers: cors });
  }

  switch (body.action) {
    case "portal": {
      const { data: s } = await sb.from("subscriptions").select("stripe_customer_id")
        .eq("user_id", user.id).maybeSingle();
      if (!s?.stripe_customer_id) {
        return Response.json({ error: "no billing yet" }, { status: 404, headers: cors });
      }
      try {
        const p = await stripe.billingPortal.sessions.create({
          customer: s.stripe_customer_id,
          return_url: SITE_CLUB + "/console#billing",
        });
        return Response.json({ url: p.url }, { headers: cors });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[club-billing] portal", msg);
        // Les mots de Stripe, tels quels : « réessaie » ne servirait à rien
        // si le portail n'est pas activé (règle du 18/09).
        return Response.json({ error: msg }, { status: 502, headers: cors });
      }
    }

    case "cancel_creator": {
      const pseudo = String(body.pseudo ?? "").trim();
      const { data: p } = await sb.from("profiles").select("id")
        // `ilike` sans joker : un pseudo est comparé tel quel, casse ignorée.
        .ilike("pseudo", pseudo.replace(/[%_\\]/g, (m) => "\\" + m)).maybeSingle();
      if (!p) return Response.json({ error: "nobody" }, { status: 404, headers: cors });
      const { data: cs } = await sb.from("creator_subscriptions")
        .select("stripe_subscription_id,status")
        .eq("creator_id", p.id).eq("fan_id", user.id).maybeSingle();
      if (!cs?.stripe_subscription_id || !["active", "trialing"].includes(cs.status)) {
        return Response.json({ error: "not subscribed" }, { status: 404, headers: cors });
      }
      try {
        const sub = await stripe.subscriptions.update(cs.stripe_subscription_id,
          { cancel_at_period_end: true });
        await sb.from("creator_subscriptions").update({ ending: true })
          .eq("stripe_subscription_id", cs.stripe_subscription_id);
        return Response.json({
          ok: true,
          until: new Date(sub.current_period_end * 1000).toISOString(),
        }, { headers: cors });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[club-billing] cancel", msg);
        return Response.json({ error: msg }, { status: 502, headers: cors });
      }
    }

    default:
      return Response.json({ error: "unknown action" }, { status: 400, headers: cors });
  }
});
