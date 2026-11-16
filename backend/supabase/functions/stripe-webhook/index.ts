// TOTEHM · stripe-webhook
// Six flux sur le même compte — routage sur metadata.product :
//   higher       → stoner_access + email Resend (le TotehmPaper {THP}) ;
//                  la base frappe l'exemplaire n du THP (30/09/2026)
//   cloth        → la pièce passe `paid` (la base consomme le stock), la
//                  génération n8n part, le membre reçoit son email (05/10/2026 —
//                  avant : « géré ailleurs », et l'ailleurs n'était pas branché)
//   subscription → subscriptions (FIGHER CLUB, l'adhésion annuelle)
//   creator_sub  → creator_subscriptions (Bob s'abonne au Totehm d'Alice)
//                  + member_ledger à CHAQUE facture payée (23/09/2026)
//   artwork      → art_settle : l'exemplaire n d'une œuvre (30/09/2026)
//   resale       → art_settle : l'exemplaire change de main, 93 % au
//                  grand livre du vendeur, 7 % à TOTEHM (30/09/2026)
//   luxury       → luxury_settle : une totehmisation luxe payée (02/10/2026) ;
//                  depuis le 05/10, sur devis : luxury_quote_paid ferme le devis
//   higher_sub   → bot_subscriptions par higher_sub_sync : l'abonnement Higher
//                  (TotehmSM, mensuel) — checkout ET cycle de vie (07/10/2026)
//
// Events traités :
//   checkout.session.completed
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.paid            ← 23/09 : le grand livre du membre
//   invoice.payment_failed
//
// ⚠️ ACTIVER `invoice.paid` DANS LE DASHBOARD STRIPE (Developers →
// Webhooks → cet endpoint → événements). Sans lui, un abonné paie et le
// créateur ne voit jamais son gain : l'accès s'ouvre, l'argent ne se
// compte pas.
//
// verify_jwt = false (Stripe n'a pas de JWT Supabase)

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { creatorCheckoutCompleted, creatorInvoicePaid, creatorSubscriptionChanged, invoiceSubscriptionId, periodEndOf,
  type CreatorSubDeps } from "../_shared/creator-sub.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const FROM   = "TOTEHM <no-reply@higher.boutique>";
// La méthode reste attachée aux droits acquis ; seule son adresse change.
const METHOD = "https://www.totehm.space/stoner";
const LOGO   = "https://www.higher.boutique/assets/img/totehm_logo.png";

function welcomeHtml(num: number, amount: string) {
  const n = String(num).padStart(3, "0");
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#000;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 16px;">
<tr><td align="center">
  <table role="presentation" width="100%" style="max-width:460px;" cellpadding="0" cellspacing="0">

    <tr><td align="center" style="padding-bottom:26px;">
      <img src="${LOGO}"
           width="70" alt="TOTEHM" style="display:block;border:0;">
    </td></tr>

    <tr><td align="center" style="font-family:Arial,sans-serif;font-size:11px;
        letter-spacing:3px;color:#8f8fae;padding-bottom:18px;">TOTEHMPAPER</td></tr>

    <tr><td align="center" style="font-family:'Courier New',monospace;font-size:38px;
        letter-spacing:2px;color:#fbd5ca;padding-bottom:6px;">#${n}</td></tr>

    <tr><td align="center" style="font-family:Arial,sans-serif;font-size:11px;
        letter-spacing:2px;color:#606060;padding-bottom:30px;">
      YOUR EDITION &middot; YOURS FOR LIFE</td></tr>

    <tr><td align="center" style="font-family:Arial,sans-serif;font-size:15px;
        line-height:1.8;color:#fbd5ca;padding-bottom:30px;">
      Ten steps.<br>An artistic and neurological<br>experience of the mark.</td></tr>

    <tr><td align="center" style="padding-bottom:30px;">
      <a href="${METHOD}" style="display:inline-block;background:#36498c;color:#fbd5ca;
         font-family:'Courier New',monospace;font-size:15px;text-decoration:none;
         padding:13px 30px;">Run the method</a></td></tr>

    <tr><td align="center" style="font-family:Arial,sans-serif;font-size:11px;
        letter-spacing:1px;color:#505050;line-height:1.8;padding-top:22px;
        border-top:1px solid #222;">
      ${amount} &middot; ONE TIME &middot; NO SUBSCRIPTION<br>
      Run it whenever you want, for the rest of your life.</td></tr>

  </table>
</td></tr>
</table>
</body></html>`;
}

async function sendWelcome(email: string, num: number, amount: string): Promise<string> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return "KO: RESEND_API_KEY absente des secrets";

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: `You're Figher #${String(num).padStart(3, "0")}`,
        html: welcomeHtml(num, amount),
      }),
    });
    const body = await r.text();
    if (!r.ok) return `KO ${r.status}: ${body.slice(0, 260)}`;
    return `OK: ${body.slice(0, 120)}`;
  } catch (e) {
    return `KO exception: ${String(e).slice(0, 220)}`;
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleHigherCheckout(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const email = (session.customer_details?.email ?? session.customer_email ?? "")
    .trim().toLowerCase();

  if (!email) {
    console.error("session payée sans email:", session.id);
    return;
  }

  const amount = `${(session.amount_total ?? 0) / 100} ${session.currency?.toUpperCase()}`;

  const { error } = await admin
    .from("stoner_access")
    .upsert(
      { email, source: "stripe", stripe_session_id: session.id, note: amount },
      { onConflict: "email", ignoreDuplicates: true },
    );

  if (error) {
    console.error("écriture stoner_access échouée:", error.message);
    throw new Error(error.message);
  }

  console.log("accès higher accordé:", email);

  // ⚠️ LE NUMÉRO EST CELUI DE L'EXEMPLAIRE · 30/09/2026. L'insertion dans
  // `stoner_access` frappe l'exemplaire n du THP (déclencheur en base) ;
  // « Figher #n » est son numéro — il ne bouge plus quand un autre
  // porteur revend le sien (le rang par date, lui, aurait bougé).
  let status = "KO: numéro introuvable";
  try {
    const { data: ed } = await admin
      .from("art_editions")
      .select("edition_no, artworks!inner(slug)")
      .eq("artworks.slug", "totehmpaper")
      .ilike("owner_email", email)
      .order("edition_no", { ascending: true })
      .limit(1)
      .maybeSingle();

    const num = Number((ed as { edition_no?: number } | null)?.edition_no ?? 0);
    if (num > 0) status = await sendWelcome(email, num, amount);
  } catch (e) {
    status = `KO exception: ${String(e).slice(0, 220)}`;
  }

  console.log("email:", status);
  await admin.from("stoner_access")
    .update({ email_status: status })
    .eq("email", email);
}

async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  const lockedPrice = parseInt(session.metadata?.member_locked_price ?? "0", 10);
  const customerId = session.customer as string;
  const subId = session.subscription as string;

  if (!userId || !subId) {
    console.error("metadata manquante dans subscription checkout:", session.id);
    return;
  }

  const sub = await stripe.subscriptions.retrieve(subId);

  const now = new Date().toISOString();
  const trialEnd = sub.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : null;
  const periodEnd = periodEndOf(sub);   // les deux formes de l'API ; null plutôt qu'un RangeError

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id:              userId,
      stripe_customer_id:   customerId,
      stripe_subscription_id: subId,
      status:               sub.status,
      member_locked_price:  lockedPrice,
      trial_started_at:     now,
      trial_ends_at:        trialEnd,
      ...(periodEnd ? { current_period_end: periodEnd } : {}),
      started_at:           now,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("subscriptions upsert échoué:", error.message);
    throw new Error(error.message);
  }

  console.log("abonnement créé — user:", userId, "sub:", subId, "status:", sub.status);
}

// ══ LES CRÉATEURS · 15/09/2026 · MAJ 23/09/2026 ══════════════════════
// ⚠️ PLUS DE SPLIT CHEZ STRIPE depuis le 19/09 : l'argent arrive ENTIER
// sur le compte de la plateforme. Ces fonctions ouvrent et ferment
// l'ACCÈS ; le MONTANT dû au créateur s'écrit dans le grand livre, par
// `handleInvoicePaid`, une ligne par facture — jamais ici.

// ⚠️ 16/11/2026 (audit de lancement) : la logique vit dans `_shared/creator-sub.ts`, testée sous Node
// (`tests/fn/creator-sub.mjs`). Elle lit les DEUX formes d'un objet Stripe (un événement arrive au format de
// l'endpoint, pas du SDK), écrit la fin de période dès le checkout, et arrête un abonnement en DOUBLE au lieu
// de laisser le premier orphelin. Ici : seulement les vraies frontières (la base, Stripe).
const creatorDeps: CreatorSubDeps = {
  subscription: (id) => stripe.subscriptions.retrieve(id),
  row: async (creator, fan) => {
    const { data, error } = await admin.from("creator_subscriptions")
      .select("stripe_subscription_id,status").eq("creator_id", creator).eq("fan_id", fan).maybeSingle();
    if (error) throw new Error("creator_subscriptions: " + error.message);
    return data;
  },
  upsert: async (row) => {
    const { error } = await admin.from("creator_subscriptions").upsert(row, { onConflict: "creator_id,fan_id" });
    if (error) throw new Error("creator_subscriptions: " + error.message);
  },
  update: async (id, patch) => {
    const { error } = await admin.from("creator_subscriptions").update(patch).eq("stripe_subscription_id", id);
    if (error) throw new Error("creator_subscriptions: " + error.message);
  },
  ledger: async (a) => {
    const { data, error } = await admin.rpc("ledger_creator_invoice", a);
    // ⚠️ UNE ERREUR DE RPC SE JOURNALISE ET SE REJOUE. Sans le `throw`,
    // Stripe reçoit 200 et ne relivre jamais : un gain perdu en silence.
    if (error) throw new Error("ledger: " + error.message);
    return data;
  },
  cancelNow: async (id) => { await stripe.subscriptions.cancel(id); },
  // Un incident non noté ne doit pas faire rejouer l'événement (l'arrêt du doublon est déjà fait) : on le crie.
  incident: async (kind, session, detail) => {
    const { error } = await admin.from("market_incidents").insert({ stripe_session: session, kind, detail });
    if (error) console.error("INCIDENT NON NOTÉ:", kind, JSON.stringify(detail), error.message);
  },
};

async function handleCreatorSub(session: Stripe.Checkout.Session) {
  const r = await creatorCheckoutCompleted(creatorDeps, session);
  if (!r.ok) console.error("creator_sub refusé:", session.id, JSON.stringify(r));
  else console.log("creator_sub:", session.id, JSON.stringify(r));
}

async function handleCreatorSubState(sub: Stripe.Subscription) {
  await creatorSubscriptionChanged(creatorDeps, sub);
}

// ══ LE GRAND LIVRE — une facture payée = une ligne · 23/09/2026 ═══════
// MASTER §18-22 : 80 % au membre, 20 % à TOTEHM, accumulés dans un
// solde, virés en groupe le 1er au-dessus du seuil. Jamais un virement
// par abonnement.
//
// ⚠️ LE CRÉATEUR VIENT DE LA METADATA DE L'ABONNEMENT, pas de
// `creator_subscriptions` : `invoice.paid` arrive souvent AVANT
// `checkout.session.completed`. À cet instant la ligne d'abonnement
// n'existe pas encore — l'argent, lui, est déjà là.
//
// ⚠️ L'IDEMPOTENCE EST EN BASE (`unique (source, kind)`). Deux livraisons
// de la même facture n'écrivent qu'une ligne, même en parallèle.
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Un paiement unique (THP, Cloth), l'adhésion FIGHER et l'ancien abonnement Higher n'ont rien à écrire au
  // grand livre : `creatorInvoicePaid` les rend `skipped`. Seul `creator_sub` crédite — 80 % au créateur.
  const r = await creatorInvoicePaid(creatorDeps, invoice);
  if (!r.ok) console.error("invoice.paid creator_sub refusé:", invoice.id, JSON.stringify(r));
  else console.log("invoice.paid:", invoice.id, JSON.stringify(r));
}

// ══ LE MARCHÉ FIGHER — une vente payée devient une propriété · 30/09/2026 ══
// `artwork` (premier achat d'une œuvre) et `resale` (un exemplaire qui
// change de main) se règlent par UNE fonction en base, `art_settle`,
// idempotente sur la session Stripe. Avant ce lot, `artwork-checkout`
// posait `product: "artwork"` et ce webhook n'avait AUCUN cas pour lui :
// l'acheteur payait et ne possédait rien, et une Quantum 1/1 réservée
// retournait en vente dix minutes plus tard.
//
// ⚠️ UN ÉTAT IMPOSSIBLE N'EST PAS UNE ERREUR À REJOUER. Réservation
// perdue, montant différent : `art_settle` l'écrit dans `market_incidents`
// (remboursement à la main) et répond `ok:false` — Stripe reçoit 200, car
// le rejouer trois jours ne le rendrait pas possible. Seule une panne de
// la base (`error`) déclenche le 500 et le rejeu.
async function handleArtSettle(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") {
    console.log("art: session non payée (asynchrone ?) —", session.id, session.payment_status);
    return;
  }
  const m = session.metadata ?? {};
  const email = (session.customer_details?.email ?? session.customer_email ?? m.email ?? "")
    .trim().toLowerCase();
  const { data, error } = await admin.rpc("art_settle", {
    p_session: session.id,
    p_payment_intent: typeof session.payment_intent === "string"
      ? session.payment_intent : session.payment_intent?.id ?? null,
    p_reservation: m.reservation ?? null,
    p_buyer: m.user_id ?? null,
    p_email: email,
    p_amount: session.amount_total ?? 0,
    p_currency: session.currency ?? "",
  });
  if (error) throw new Error("art_settle: " + error.message);
  if (!data?.ok) {
    console.error("MARKET INCIDENT —", session.id, JSON.stringify(data));
    return;
  }
  console.log("marché:", session.id, JSON.stringify(data));
}

// ══ LA TOTEHMISATION LUXE — un lancement payé · 02/10/2026 ═══════════
// `luxury-checkout` a vérifié le TotehmPaper et lu le prix en base ; ici on
// écrit la commande (`luxury_settle`, idempotent sur la session) et on
// confirme au membre par email. Stripe prévient Wah du paiement lui-même.
// Une panne de la base → 500 → Stripe rejoue ; un email raté ne rejoue pas.
// ─── Streetwear : une pièce payée ─────────────────────────────────────────────
// ⚠️ 05/10/2026 — AVANT, CE CAS ÉTAIT « GÉRÉ AILLEURS » ET L'AILLEURS N'EXISTAIT
// PAS : Stripe n'a qu'un endpoint (celui-ci) et le workflow n8n A n'y était pas
// abonné. Une pièce payée restait `draft`, sans génération, sans email.
// Idempotent : on ne passe `paid` qu'une pièce encore `draft` ; le trigger
// `trg_consume_capacities` compte la pièce et le style une seule fois.
const N8N_GENERATE = "https://n8n.higher.boutique/webhook/streetwear-generate";

async function handleCloth(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") {
    console.log("cloth: session non payée —", session.id, session.payment_status);
    return;
  }
  const m = session.metadata ?? {};
  const id = m.cloth_id;
  if (!id) { console.warn("cloth: pas de cloth_id —", session.id); return; }
  // La forme de l'adresse dépend de la version d'API de l'endpoint (2026 :
  // collected_information) — on lit les deux.
  const s = session as unknown as Record<string, any>;
  const shipping = s.collected_information?.shipping_details ?? s.shipping_details ?? s.customer_details ?? null;
  const email = (session.customer_details?.email ?? session.customer_email ?? "").trim().toLowerCase();
  const { data, error } = await admin.from("totehm_clothes").update({
    status: "paid",
    paid_at: new Date().toISOString(),
    stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
    stripe_session_id: session.id,
    shipping,
    test: m.test === "1",
    ...(email ? { email } : {}),
  }).eq("id", id).eq("status", "draft").select("id, name, size, email").maybeSingle();
  if (error) throw new Error("cloth paid: " + error.message);
  if (!data) { console.log("cloth déjà payée ou inconnue:", id); return; }
  console.log("cloth payée:", id, m.test === "1" ? "(test)" : "");

  // La génération : n8n B. Une panne ici ne rend pas 500 — la pièce EST
  // payée ; on relance la génération à la main (backend/README.md).
  // Une pièce de TEST passe par le MÊME chemin : Wah juge les visuels avant
  // qu'un vêtement parte tout seul. Ce sont les fonctions en base qui la
  // retiennent — `test_stop` ferme Printful et le suivi, `test_budget` limite
  // les générations d'essai (3 par 7 jours) ; rien ici ne doit la filtrer.
  try {
    // 22/10 : le brouillon sécurisé de B authentifie son appelant
    // (`serviceAuth` → `streetwear_service_ready`). La clé de service part en
    // EN-TÊTE, jamais dans le corps ni dans l'URL ; l'ancienne version publiée
    // de B l'ignore, la nouvelle l'exige — l'ordre de publication est libre.
    const r = await fetch(N8N_GENERATE, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      },
      body: JSON.stringify({ cloth_id: id }),
    });
    if (!r.ok) console.error("cloth: génération n8n KO", r.status);
  } catch (e) {
    console.error("cloth: génération n8n exception", String(e).slice(0, 200));
  }

  const to = data.email || email;
  const key = Deno.env.get("RESEND_API_KEY");
  if (!to || !key) { console.error("cloth: email impossible (destinataire ou clé)"); return; }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: (m.test === "1" ? "[TEST] " : "") + "Your Totehm Cloth is born",
        html: `<!DOCTYPE html><html><body style="margin:0;padding:40px 16px;background:#000;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:460px;" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding-bottom:26px;"><img src="${LOGO}" width="70" alt="TOTEHM" style="display:block;border:0;"></td></tr>
<tr><td align="center" style="font-family:'Courier New',monospace;font-size:15px;letter-spacing:2px;color:#fff;padding-bottom:18px;">${String(data.name).replace(/[<>&"]/g, "")}</td></tr>
<tr><td align="center" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#b8b8c8;">
Your box becomes an original artwork. You will not see it before it lands. That is the point.</td></tr>
</table></td></tr></table></body></html>`,
      }),
    });
    if (!r.ok) console.error("cloth email KO", r.status, (await r.text()).slice(0, 200));
  } catch (e) {
    console.error("cloth email exception", String(e).slice(0, 200));
  }
}

async function handleLuxury(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") {
    console.log("luxury: session non payée —", session.id, session.payment_status);
    return;
  }
  const m = session.metadata ?? {};
  const email = (session.customer_details?.email ?? session.customer_email ?? m.email ?? "")
    .trim().toLowerCase();
  const { data, error } = await admin.rpc("luxury_settle", {
    p_session: session.id,
    p_user: m.user_id ?? null,
    p_email: email,
    p_piece: m.piece ?? "other",
    p_note: m.note ?? null,
    p_amount: session.amount_total ?? 0,
    p_currency: session.currency ?? "eur",
  });
  if (error) throw new Error("luxury_settle: " + error.message);
  console.log("luxe:", session.id, JSON.stringify(data));
  // 05/10 : le luxe se paie sur devis — la commande ferme son devis.
  if (m.quote_id) {
    const { error: qErr } = await admin.rpc("luxury_quote_paid", {
      p_quote: m.quote_id, p_session: session.id, p_test: m.test === "1",
    });
    if (qErr) throw new Error("luxury_quote_paid: " + qErr.message);
  }
  if (!data?.new || !email) return;

  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) { console.error("luxe: RESEND_API_KEY absente"); return; }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: (m.test === "1" ? "[TEST] " : "") + "Your luxury totehmization is paid",
        html: `<!DOCTYPE html><html><body style="margin:0;padding:40px 16px;background:#000;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:460px;" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding-bottom:26px;"><img src="${LOGO}" width="70" alt="TOTEHM" style="display:block;border:0;"></td></tr>
<tr><td align="center" style="font-family:'Courier New',monospace;font-size:15px;letter-spacing:2px;color:#fff;padding-bottom:18px;">PAID</td></tr>
<tr><td align="center" style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#b8b8c8;">
We write to you by email to organize the sending of your piece.</td></tr>
</table></td></tr></table></body></html>`,
      }),
    });
    if (!r.ok) console.error("luxe email KO", r.status, (await r.text()).slice(0, 200));
  } catch (e) {
    console.error("luxe email exception", String(e).slice(0, 200));
  }
}

// ══ L'ABONNEMENT HIGHER (TotehmSM) · 07/10/2026 ═══════════════════════
// `higher-sub` ouvre le Checkout avec `metadata.product = 'higher_sub'` et
// `user_id`, EN DOUBLE sur l'abonnement : le checkout ET chaque changement
// d'état (`customer.subscription.updated|deleted`) réécrivent la ligne de
// `bot_subscriptions` — l'accès (`totehmbot_access`) la lit. Rien au grand
// livre : c'est un revenu de la plateforme, pas une part de membre.
async function higherSubSync(userId: string, sub: Stripe.Subscription) {
  const status = sub.status === "incomplete_expired" ? "canceled" : sub.status;
  // ⚠️ La fin de période vit sur l'abonnement (API 2024-06-20, celle du SDK)
  // OU sur ses lignes (versions 2025+ de l'endpoint, qui signe les événements) :
  // on lit les deux, jamais `new Date(NaN)` (un RangeError ferait rejouer Stripe).
  const s = sub as unknown as { current_period_end?: number; items?: { data?: { current_period_end?: number }[] } };
  const fin = s.current_period_end ?? s.items?.data?.[0]?.current_period_end ?? null;
  const { data, error } = await admin.rpc("higher_sub_sync", {
    p_user: userId,
    p_sub: sub.id,
    p_status: status,
    p_period_end: fin ? new Date(fin * 1000).toISOString() : null,
    p_ending: !!sub.cancel_at_period_end,
    p_price: sub.items?.data?.[0]?.price?.unit_amount ?? null,
    p_currency: sub.currency ?? "eur",
  });
  if (error) throw new Error("higher_sub_sync: " + error.message);
  if (!data?.ok) console.error("higher_sub_sync refusé:", sub.id, JSON.stringify(data));
  else console.log("abonnement Higher:", sub.id, "→", status);
}

async function handleHigherSub(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!userId || !subId) { console.error("higher_sub sans metadata:", session.id); return; }
  await higherSubSync(userId, await stripe.subscriptions.retrieve(subId));
}

async function handleHigherSubState(sub: Stripe.Subscription) {
  const userId = sub.metadata?.user_id;
  if (!userId) { console.error("higher_sub sans user_id:", sub.id); return; }
  await higherSubSync(userId, sub);
}

async function handleAccountUpdated(acc: Stripe.Account) {
  if (!acc.id) return;
  const { error } = await admin.from("creator_profiles")
    .update({
      charges_enabled: !!acc.charges_enabled,
      payouts_enabled: !!acc.payouts_enabled,
      details_submitted: !!acc.details_submitted,
    })
    .eq("stripe_account_id", acc.id);
  // Un compte inconnu n'est pas une erreur : ce peut être un compte créé
  // à la main dans le dashboard Stripe. On logue, on ne rejoue pas.
  if (error) console.warn("account.updated sans fiche:", acc.id, error.message);
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  if (sub.metadata?.product !== "subscription") {
    console.log("subscription.updated ignoré — produit inconnu:", sub.id);
    return;
  }

  const trialEnd = sub.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : null;
  const periodEnd = periodEndOf(sub);   // les deux formes de l'API ; null plutôt qu'un RangeError

  const { error } = await admin.from("subscriptions")
    .update({
      status:              sub.status,
      ...(periodEnd ? { current_period_end: periodEnd } : {}),
      cancel_at_period_end: sub.cancel_at_period_end,
      trial_ends_at:       trialEnd,
    })
    .eq("stripe_subscription_id", sub.id);

  if (error) {
    console.error("subscriptions update échoué:", error.message);
    throw new Error(error.message);
  }

  console.log("abonnement mis à jour:", sub.id, "→", sub.status);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  if (sub.metadata?.product !== "subscription") {
    console.log("subscription.deleted ignoré — produit inconnu:", sub.id);
    return;
  }

  const { error } = await admin.from("subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", sub.id);

  if (error) {
    console.error("subscriptions canceled update échoué:", error.message);
    throw new Error(error.message);
  }

  console.log("abonnement annulé:", sub.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subId = invoiceSubscriptionId(invoice);

  if (!subId) {
    console.log("invoice.payment_failed sans subscription — ignoré:", invoice.id);
    return;
  }

  const { error } = await admin.from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subId);

  if (error) {
    console.error("past_due update échoué:", error.message);
    throw new Error(error.message);
  }

  console.log("paiement échoué — abonnement en past_due:", subId);
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("no signature", { status: 400 });

  const raw = await req.text();

  // 05/10 (soir) : deux secrets possibles — l'endpoint LIVE et l'endpoint
  // TEST (mode test Stripe, pour les essais de la boutique). Une signature
  // valide pour l'un ou l'autre ; rien d'autre ne passe.
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw, signature, Deno.env.get("STRIPE_WEBHOOK_SECRET")!, undefined, cryptoProvider,
    );
  } catch (err) {
    const testSecret = Deno.env.get("STRIPE_TEST_WEBHOOK_SECRET");
    try {
      if (!testSecret) throw err;
      event = await stripe.webhooks.constructEventAsync(raw, signature, testSecret, undefined, cryptoProvider);
    } catch (_) {
      console.error("signature invalide:", err.message);
      return new Response("invalid signature", { status: 400 });
    }
  }

  // ⚠️ UN ÉVÉNEMENT DE TEST N'OUVRE RIEN DE RÉEL. En mode test, seuls les
  // essais de la boutique (`cloth`, `luxury`) s'écrivent — marqués `test`.
  // Jamais un THP, un abonnement, une œuvre ou une ligne du grand livre.
  if (!event.livemode) {
    const obj = event.data.object as { metadata?: Record<string, string> };
    const product = obj.metadata?.product;
    if (event.type !== "checkout.session.completed" || !["cloth", "luxury"].includes(product ?? "")) {
      console.log("test ignoré:", event.type, product, event.id);
      return new Response("test ignored", { status: 200 });
    }
    obj.metadata = { ...obj.metadata, test: "1" };
  }

  // Idempotence — PK conflict = déjà traité
  const { error: idempErr } = await admin
    .from("stripe_events")
    .insert({ event_id: event.id, type: event.type });

  if (idempErr) {
    if (idempErr.code === "23505") {
      console.log("event déjà traité:", event.id);
      return new Response("already processed", { status: 200 });
    }
    // Table absente ou autre erreur : on logue et on continue
    console.warn("stripe_events insert échoué (non bloquant):", idempErr.message);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        switch (session.metadata?.product) {
          case "higher":
            await handleHigherCheckout(session);
            break;
          case "cloth":
            await handleCloth(session);
            break;
          case "subscription":
            await handleSubscriptionCheckout(session);
            break;
          // L'abonnement d'un membre au Totehm d'un autre : ici on
          // n'ouvre que l'ACCÈS. L'argent s'écrit sur `invoice.paid`.
          case "creator_sub":
            await handleCreatorSub(session);
            break;
          // Le marché FIGHER : un premier achat d'œuvre, ou une revente.
          case "artwork":
          case "resale":
            await handleArtSettle(session);
            break;
          // La totehmisation luxe : un lancement payé devient une commande.
          case "luxury":
            await handleLuxury(session);
            break;
          // L'abonnement Higher (TotehmSM) : l'accès, par `bot_subscriptions`.
          case "higher_sub":
            await handleHigherSub(session);
            break;
          default:
            console.warn("product inconnu dans metadata:", session.metadata?.product, "session:", session.id);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        // Deux produits, deux tables. Le `switch` est explicite : un `if`
        // finit toujours par oublier le troisième.
        switch (sub.metadata?.product) {
          case "creator_sub": await handleCreatorSubState(sub); break;
          case "higher_sub":  await handleHigherSubState(sub); break;
          default:            await handleSubscriptionUpdated(sub);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        switch (sub.metadata?.product) {
          case "creator_sub": await handleCreatorSubState(sub); break;
          case "higher_sub":  await handleHigherSubState(sub); break;
          default:            await handleSubscriptionDeleted(sub);
        }
        break;
      }

      // ⚠️ L'ÉTAT DU COMPTE CONNECTÉ SE MET À JOUR TOUT SEUL. Sans cet
      // événement, un créateur qui finit son KYC chez Stripe resterait
      // « en attente » chez nous jusqu'à ce qu'il rouvre la page — et il
      // croirait que ça n'a pas marché.
      case "account.updated": {
        const acc = event.data.object as Stripe.Account;
        await handleAccountUpdated(acc);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log("event ignoré:", event.type);
    }
  } catch (err) {
    // 500 → Stripe rejoue : utilisé pour les erreurs DB critiques uniquement
    console.error("erreur handler:", event.type, err.message);
    // ⚠️ LE REJEU DOIT POUVOIR PASSER · 23/09/2026. L'événement était
    // inscrit dans `stripe_events` AVANT d'être traité : quand le handler
    // échouait, Stripe rejouait… et tombait sur « already processed ».
    // Un 500 ne servait donc à rien — l'événement était perdu. On retire
    // la marque pour que la relivraison soit réellement traitée.
    await admin.from("stripe_events").delete().eq("event_id", event.id);
    return new Response("handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
