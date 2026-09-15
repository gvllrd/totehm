// TOTEHM · creator-dashboard
// ═══════════════════════════════════════════════════════════════════════
// Ce que le créateur voit : ce qu'il a gagné, ce qui arrive, combien de
// gens le suivent. Trois chiffres, et ils doivent être VRAIS.
//
// ⚠️ POURQUOI CETTE FONCTION EXISTE AU LIEU D'UN APPEL DEPUIS LA PAGE.
// Lire une balance Stripe demande la clé SECRÈTE. Une clé secrète dans un
// fichier HTML servi, c'est le compte Stripe entier — tous les créateurs,
// tous les paiements — offert à qui ouvre l'inspecteur. Ce n'est pas une
// précaution d'ingénieur : c'est la différence entre une plateforme et un
// incident. La clé ne quitte jamais le serveur, et la page ne reçoit que
// des NOMBRES DÉJÀ CALCULÉS.
//
// ⚠️ ET LA LECTURE EST TOUJOURS CELLE DU DEMANDEUR. Le compte connecté
// vient de la session, jamais du corps de la requête : sinon un créateur
// lirait la balance d'un autre en changeant un identifiant.
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

/** La part qui revient au créateur. Elle vit ICI et nulle part ailleurs :
 *  un taux écrit à deux endroits finit toujours par diverger, et la
 *  divergence se verrait sur un virement. */
const PART_CREATEUR = 0.80;

/** Additionne un tableau de soldes Stripe, devise par devise. Stripe rend
 *  une LIGNE PAR DEVISE : prendre `[0]` marche jusqu'au premier fan qui
 *  paie en livres, puis affiche un chiffre faux sans prévenir. */
function parDevise(lignes: Array<{ amount: number; currency: string }> = []) {
  const m: Record<string, number> = {};
  for (const l of lignes) m[l.currency] = (m[l.currency] ?? 0) + l.amount;
  return m;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"), SITE_COM);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { data: { user }, error: authErr } = await sb.auth.getUser(
    (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
  );
  if (authErr || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  const { data: fiche } = await sb
    .from("creator_profiles")
    .select("stripe_account_id,charges_enabled,payouts_enabled,details_submitted,custom_sub_price,currency")
    .eq("user_id", user.id)
    .maybeSingle();

  // Pas encore de compte : ce n'est pas une erreur, c'est un état. La page
  // doit pouvoir afficher « commence ici » sans traiter un 404.
  if (!fiche?.stripe_account_id) {
    return Response.json({ etat: "aucun" }, { headers: cors });
  }

  // Les abonnés viennent de NOTRE base, pas de Stripe : c'est notre
  // jointure qui décide qui a accès, et elle doit rester la référence.
  const { data: abos } = await sb
    .from("creator_subscriptions")
    .select("status,amount_cents,currency")
    .eq("creator_id", user.id);

  const vivants = (abos ?? []).filter((a) => a.status === "active" || a.status === "trialing");
  const mrrBrut = vivants.reduce((n, a) => n + (a.amount_cents ?? 0), 0);

  let dispo: Record<string, number> = {};
  let attente: Record<string, number> = {};
  let compte = {
    charges_enabled: fiche.charges_enabled,
    payouts_enabled: fiche.payouts_enabled,
    details_submitted: fiche.details_submitted,
  };

  try {
    // ⚠️ `stripeAccount` — on lit LE COMPTE DU CRÉATEUR, pas le nôtre.
    // Sans cet en-tête on renverrait la balance de la plateforme à
    // chaque influenceur : le pire chiffre faux imaginable.
    const bal = await stripe.balance.retrieve(
      undefined,
      { stripeAccount: fiche.stripe_account_id },
    );
    dispo = parDevise(bal.available as Array<{ amount: number; currency: string }>);
    attente = parDevise(bal.pending as Array<{ amount: number; currency: string }>);

    // L'état réel du compte vient de Stripe, jamais de notre miroir : le
    // miroir est écrit par un webhook, et un webhook peut être en retard.
    // On en profite pour remettre le miroir d'aplomb.
    const acc = await stripe.accounts.retrieve(fiche.stripe_account_id);
    compte = {
      charges_enabled: !!acc.charges_enabled,
      payouts_enabled: !!acc.payouts_enabled,
      details_submitted: !!acc.details_submitted,
    };
    await sb.from("creator_profiles").update(compte).eq("user_id", user.id);
  } catch (e) {
    // Stripe indisponible n'est pas une page blanche : on rend ce qu'on
    // sait, et la page dit que les soldes n'ont pas pu être lus.
    console.error("[creator-dashboard]", e instanceof Error ? e.message : e);
    return Response.json({
      etat: "partiel",
      compte,
      prix: fiche.custom_sub_price,
      devise: fiche.currency,
      abonnes: vivants.length,
      mrr_createur: Math.round(mrrBrut * PART_CREATEUR),
      part: PART_CREATEUR,
    }, { headers: cors });
  }

  return Response.json({
    etat: "ok",
    compte,
    prix: fiche.custom_sub_price,
    devise: fiche.currency,
    abonnes: vivants.length,
    // On montre SA part, pas le brut : un créateur qui lit 1 000 € et
    // reçoit 800 € se sent floué, même si le taux était écrit ailleurs.
    mrr_createur: Math.round(mrrBrut * PART_CREATEUR),
    part: PART_CREATEUR,
    disponible: dispo,
    en_attente: attente,
  }, { headers: cors });
});
