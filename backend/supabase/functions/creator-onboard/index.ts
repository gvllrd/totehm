// TOTEHM · creator-onboard
// ═══════════════════════════════════════════════════════════════════════
// L'influenceur ouvre son HigherSelf à l'abonnement. Un bouton chez nous,
// la paperasse chez Stripe, le retour chez nous.
//
// POURQUOI EXPRESS ET PAS CUSTOM : avec Express, l'identité, les pièces,
// la conformité fiscale et les virements sont HÉBERGÉS PAR STRIPE. On ne
// voit jamais un IBAN ni une pièce d'identité, donc on n'a rien à
// sécuriser, rien à conserver, rien à justifier. C'est la seule forme de
// Connect qui tienne dans une timeline de 75 jours.
//
// ⚠️ LE COMPTE CONNECTÉ EST TOUJOURS DÉDUIT DE LA SESSION, jamais du
// corps de la requête. Sinon n'importe qui relierait le compte Stripe
// d'un autre au sien et détournerait ses virements.
// ═══════════════════════════════════════════════════════════════════════
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_COM } from "../_shared/origins.ts";

// Le `!` fait planter le module au démarrage si le secret manque. Jamais
// `?? ""` : Stripe accepterait la clé vide et échouerait en silence au
// premier appel — un onboarding parti en fantôme.
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const RETOUR = `${SITE_COM}/club/creator`;
const REPRISE = `${SITE_COM}/club/creator?refresh=1`;

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"), SITE_COM);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { data: { user }, error: authErr } = await sb.auth.getUser(
    (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
  );
  if (authErr || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  try {
    // La fiche existe-t-elle déjà ? On ne recrée JAMAIS un compte connecté
    // pour quelqu'un qui en a un : ce serait deux comptes Stripe pour une
    // personne, et des virements qui partent sur le mauvais.
    const { data: fiche } = await sb
      .from("creator_profiles")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let accountId = fiche?.stripe_account_id ?? null;

    if (!accountId) {
      const compte = await stripe.accounts.create({
        type: "express",
        email: user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        // On dit à Stripe qui on est : c'est ce qui fait que l'écran
        // d'onboarding porte notre nom et pas un formulaire anonyme.
        business_profile: { product_description: "TOTEHM — HigherSelf subscription" },
        metadata: { product: "creator", totehm_user: user.id },
      });
      accountId = compte.id;

      const { error: upErr } = await sb.from("creator_profiles").upsert({
        user_id: user.id,
        stripe_account_id: accountId,
      }, { onConflict: "user_id" });
      if (upErr) throw upErr;
    }

    // Un AccountLink est À USAGE UNIQUE et expire en quelques minutes. On
    // en fabrique un à chaque clic — jamais un lien stocké, jamais un lien
    // partagé : il ouvre l'onboarding d'UN compte précis.
    const lien = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: REPRISE,
      return_url: RETOUR,
      type: "account_onboarding",
    });

    return Response.json({ url: lien.url }, { headers: cors });
  } catch (e) {
    // Une erreur Stripe se JOURNALISE, toujours : sans ce log, un
    // onboarding qui échoue ressemble à un bouton mort.
    console.error("[creator-onboard]", e instanceof Error ? e.message : e);
    return Response.json(
      { error: "onboarding unavailable" },
      { status: 502, headers: cors },
    );
  }
});
