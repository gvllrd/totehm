// TOTEHM · _shared/creator-sub.ts — l'abonnement d'un membre à un créateur, vu du webhook et du checkout.
// ═══════════════════════════════════════════════════════════════════════
// PUR : aucun réseau, aucun Deno. `stripe-webhook`, `creator-subscribe` et `club-billing` l'importent avec leurs
// vraies dépendances ; `tests/fn/creator-sub.mjs` le fait tourner sous Node avec de fausses.
//
// ⚠️ UN ÉVÉNEMENT ARRIVE AU FORMAT DE L'ENDPOINT, PAS À CELUI DU SDK (16/11/2026, audit de lancement).
//    Depuis l'API Stripe 2025-03-31, `invoice.subscription` et `invoice.subscription_details` vivent sous
//    `invoice.parent.subscription_details`, et `subscription.current_period_end` sous `items.data[0]`.
//    L'ancien code lisait les anciens champs seuls : avec un endpoint récent (celui de test est en
//    2026-06-24), `invoice.paid` sortait sans rien créditer — le créateur ne voyait jamais ses 80 % — et un
//    changement d'état levait « Invalid time value » : Stripe relivrait sans fin, l'arrêt n'était jamais écrit.
//    Tout ce qui lit un objet Stripe passe donc par les lecteurs ci-dessous, qui connaissent les DEUX formes.
// ═══════════════════════════════════════════════════════════════════════

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" ? v as Obj : {});
const idOf = (v: unknown): string | null =>
  typeof v === "string" && v ? v : (typeof obj(v).id === "string" && obj(v).id ? obj(v).id as string : null);

/** L'abonnement d'une facture, ou null (un paiement unique n'en a pas). */
export function invoiceSubscriptionId(invoice: unknown): string | null {
  const i = obj(invoice);
  return idOf(i.subscription) ?? idOf(obj(obj(i.parent).subscription_details).subscription);
}

/** La metadata de l'abonnement, telle que la facture la recopie ; {} si elle ne la porte pas. */
export function invoiceMetadata(invoice: unknown): Record<string, string> {
  const i = obj(invoice);
  const a = obj(obj(i.subscription_details).metadata), b = obj(obj(obj(i.parent).subscription_details).metadata);
  return (Object.keys(a).length ? a : b) as Record<string, string>;
}

/** La fin de la période payée, en ISO ; null si l'objet ne la dit pas (jamais une exception). */
export function periodEndOf(subscription: unknown): string | null {
  const s = obj(subscription);
  const item = obj((obj(s.items).data as unknown[] | undefined)?.[0]);
  const t = Number(s.current_period_end ?? item.current_period_end);
  return Number.isFinite(t) && t > 0 ? new Date(t * 1000).toISOString() : null;
}

/** Ce que la base retient d'un abonnement Stripe. Un arrêt DEMANDÉ n'est pas un arrêt : l'accès court jusqu'au bout. */
export function subscriptionState(subscription: unknown): { status: string; ending: boolean; current_period_end?: string } {
  const s = obj(subscription);
  const status = typeof s.status === "string" && s.status ? s.status : "active";
  const fin = periodEndOf(s);
  const ending = status !== "canceled" && (s.cancel_at_period_end === true || typeof s.cancel_at === "number");
  return fin ? { status, ending, current_period_end: fin } : { status, ending };
}

const VIVANT = ["active", "trialing", "past_due"];

export type CreatorSubDeps = {
  /** Relit l'abonnement chez Stripe. */
  subscription: (id: string) => Promise<unknown>;
  /** La ligne de ce couple créateur/abonné, ou null. */
  row: (creator: string, fan: string) => Promise<{ stripe_subscription_id: string | null; status: string } | null>;
  /** Écrit la ligne du couple (clé : creator_id + fan_id). Lève si la base refuse. */
  upsert: (row: Obj) => Promise<void>;
  /** Met à jour par identifiant Stripe. Lève si la base refuse ; zéro ligne touchée n'est pas une erreur. */
  update: (subscriptionId: string, patch: Obj) => Promise<void>;
  /** Une ligne du grand livre par facture (idempotent en base). Lève si la base refuse. */
  ledger: (a: { p_invoice: string; p_subscription: string; p_creator: string; p_fan: string | null; p_gross: number; p_currency: string }) => Promise<unknown>;
  /** Arrête tout de suite un abonnement en double (il ne se renouvellera pas). */
  cancelNow: (subscriptionId: string) => Promise<void>;
  /** Note un incident à traiter à la main (remboursement : jamais automatique). */
  incident: (kind: string, session: string | null, detail: Obj) => Promise<void>;
};

/** `checkout.session.completed` (product = creator_sub) : ouvre l'ACCÈS. L'argent s'écrit sur `invoice.paid`. */
export async function creatorCheckoutCompleted(d: CreatorSubDeps, session: unknown) {
  const s = obj(session), m = obj(s.metadata);
  const creator = String(m.creator_id ?? ""), fan = String(m.fan_id ?? ""), subId = idOf(s.subscription);
  if (!creator || !fan || !subId) return { ok: false, why: "metadata" };
  if (creator === fan) return { ok: false, why: "self" };

  // ⚠️ LE DOUBLON. Deux onglets, deux paiements pour le MÊME créateur : la clé (creator_id, fan_id) n'a qu'une
  // ligne, donc le second abonnement écraserait le premier, qui continuerait d'être prélevé chaque année sans
  // que personne puisse l'arrêter. On garde le premier, on arrête le second TOUT DE SUITE, et on note l'incident :
  // le remboursement se fait à la main dans Stripe (règle de l'argent : jamais d'un geste automatique).
  const deja = await d.row(creator, fan);
  if (deja?.stripe_subscription_id && deja.stripe_subscription_id !== subId && VIVANT.includes(deja.status)) {
    await d.cancelNow(subId);
    await d.incident("creator_sub_duplicate", typeof s.id === "string" ? s.id : null, {
      creator_id: creator, fan_id: fan, kept: deja.stripe_subscription_id, cancelled: subId,
      amount_cents: Number(s.amount_total) || null, currency: String(s.currency ?? "eur"),
    });
    return { ok: true, duplicate: true };
  }

  // L'état VRAI vient de Stripe : `customer.subscription.updated` est souvent passé AVANT cette ligne (elle
  // n'existait pas, il n'a rien touché), et la fin de période resterait vide un an. Une relecture qui échoue
  // n'empêche pas l'accès : ce qui est payé est ouvert, la date arrivera au prochain événement.
  let etat: { status: string; ending: boolean; current_period_end?: string } = { status: "active", ending: false };
  try { etat = subscriptionState(await d.subscription(subId)); } catch { /* accès ouvert, date à venir */ }
  await d.upsert({
    creator_id: creator, fan_id: fan, stripe_subscription_id: subId,
    amount_cents: Number(s.amount_total) || null, currency: String(s.currency ?? "eur"), ...etat,
  });
  return { ok: true, duplicate: false, status: etat.status };
}

/** `customer.subscription.updated|deleted` (product = creator_sub) : l'état, la fin de période, l'arrêt demandé. */
export async function creatorSubscriptionChanged(d: CreatorSubDeps, subscription: unknown) {
  const id = idOf(subscription);
  if (!id) return { ok: false, why: "id" };
  await d.update(id, subscriptionState(subscription));
  return { ok: true };
}

/**
 * `invoice.paid` : 80 % au créateur, une ligne par facture. Rend `skipped` pour tout ce qui n'est pas un abonnement
 * créateur (le webhook garde ses autres produits). Une facture d'un abonnement EN DOUBLE n'est pas créditée.
 */
export async function creatorInvoicePaid(d: CreatorSubDeps, invoice: unknown) {
  const i = obj(invoice), subId = invoiceSubscriptionId(i);
  if (!subId) return { ok: true, skipped: "no_subscription" };
  let meta = invoiceMetadata(i);
  if (!meta.product) meta = obj(obj(await d.subscription(subId)).metadata) as Record<string, string>;
  if (meta.product !== "creator_sub") return { ok: true, skipped: String(meta.product ?? "unknown") };
  if (!meta.creator_id) return { ok: false, why: "creator" };

  const deja = meta.fan_id ? await d.row(meta.creator_id, meta.fan_id) : null;
  if (deja?.stripe_subscription_id && deja.stripe_subscription_id !== subId && VIVANT.includes(deja.status)) {
    await d.incident("creator_sub_duplicate_invoice", null, {
      creator_id: meta.creator_id, fan_id: meta.fan_id, kept: deja.stripe_subscription_id, duplicate: subId,
      invoice: typeof i.id === "string" ? i.id : null, amount_cents: Number(i.amount_paid) || 0,
    });
    return { ok: true, skipped: "duplicate" };
  }
  const data = await d.ledger({
    p_invoice: String(i.id), p_subscription: subId, p_creator: meta.creator_id, p_fan: meta.fan_id ?? null,
    p_gross: Number(i.amount_paid) || 0, p_currency: String(i.currency ?? "eur"),
  });
  return { ok: true, ledger: data };
}
