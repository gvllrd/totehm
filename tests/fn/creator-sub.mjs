// L'abonnement créateur côté webhook : les VRAIES fonctions, de fausses frontières (base, Stripe). Aucun argent.
// 16/11/2026 — audit de lancement : un événement arrive au format de l'ENDPOINT (API 2025+), pas à celui du SDK.
import assert from 'node:assert/strict';
import { invoiceSubscriptionId, invoiceMetadata, periodEndOf, subscriptionState, creatorCheckoutCompleted,
  creatorSubscriptionChanged, creatorInvoicePaid } from '../../backend/supabase/functions/_shared/creator-sub.ts';
import { checkoutKey, checkoutExpiresAt, CHECKOUT_TTL_S } from '../../backend/supabase/functions/_shared/creator-checkout.ts';
let checks = 0; const check = (v, m) => { assert(v, m); checks++; };

const FIN = 1830000000, ISO = new Date(FIN * 1000).toISOString();
const META = { product:'creator_sub', creator_id:'alice', fan_id:'bob' };
/* les DEUX formes d'un même abonnement et d'une même facture */
const SUB_OLD = { id:'sub_1', status:'active', current_period_end:FIN, cancel_at_period_end:false, metadata:META };
const SUB_NEW = { id:'sub_1', status:'active', cancel_at_period_end:false, cancel_at:null, metadata:META, items:{ data:[{ current_period_end:FIN }] } };
const INV_OLD = { id:'in_1', subscription:'sub_1', subscription_details:{ metadata:META }, amount_paid:2400, currency:'eur' };
const INV_NEW = { id:'in_1', parent:{ type:'subscription_details', subscription_details:{ subscription:'sub_1', metadata:META } }, amount_paid:2400, currency:'eur' };

/* ── les lecteurs : deux formes, une réponse ── */
check(invoiceSubscriptionId(INV_OLD) === 'sub_1' && invoiceSubscriptionId(INV_NEW) === 'sub_1', 'la facture rend son abonnement, ancienne ET nouvelle forme');
check(invoiceSubscriptionId({ id:'in_x', subscription:{ id:'sub_9' } }) === 'sub_9' && invoiceSubscriptionId({ id:'in_y' }) === null, 'un objet développé se lit ; un paiement unique rend null');
check(invoiceMetadata(INV_OLD).creator_id === 'alice' && invoiceMetadata(INV_NEW).creator_id === 'alice' && Object.keys(invoiceMetadata({})).length === 0, 'la metadata se lit dans les deux formes');
check(periodEndOf(SUB_OLD) === ISO && periodEndOf(SUB_NEW) === ISO, 'la fin de période se lit dans les deux formes');
check(periodEndOf({ id:'sub_x', status:'active' }) === null && periodEndOf(null) === null, 'sans date : null, JAMAIS une exception (l\'ancien code levait « Invalid time value »)');
check(JSON.stringify(subscriptionState(SUB_NEW)) === JSON.stringify({ status:'active', ending:false, current_period_end:ISO }), 'un abonnement actif');
check(subscriptionState({ ...SUB_NEW, cancel_at_period_end:true }).ending === true && subscriptionState({ ...SUB_NEW, cancel_at:FIN }).ending === true, 'un arrêt DEMANDÉ : ending, l\'accès court encore');
check(subscriptionState({ ...SUB_OLD, status:'canceled', cancel_at_period_end:true }).ending === false, 'un abonnement terminé ne « finit » plus');
check(!('current_period_end' in subscriptionState({ id:'sub_x', status:'past_due' })), 'sans date, la base garde celle qu\'elle a (le champ n\'est pas écrit)');

/* ── une fausse base, un faux Stripe ── */
function monde(init = {}) {
  const w = { rows:new Map(), ledger:[], incidents:[], cancelled:[], reads:[], subs:init.subs ?? { sub_1:SUB_NEW }, failRead:false };
  const key = (c, f) => c + '|' + f;
  w.deps = {
    subscription: async id => { w.reads.push(id); if (w.failRead) throw new Error('stripe down'); return w.subs[id] ?? { id, status:'active', metadata:{} }; },
    row: async (c, f) => w.rows.get(key(c, f)) ?? null,
    upsert: async r => { w.rows.set(key(r.creator_id, r.fan_id), { ...(w.rows.get(key(r.creator_id, r.fan_id)) ?? {}), ...r }); },
    update: async (id, patch) => { for (const [k, r] of w.rows) if (r.stripe_subscription_id === id) w.rows.set(k, { ...r, ...patch }); },
    ledger: async a => { if (w.ledger.some(l => l.p_invoice === a.p_invoice)) return { ok:true, new:false }; w.ledger.push(a); return { ok:true, new:true, member_cents:Math.floor(a.p_gross * 80 / 100) }; },
    cancelNow: async id => { w.cancelled.push(id); },
    incident: async (kind, session, detail) => { w.incidents.push({ kind, session, detail }); },
  };
  return w;
}
const SESSION = { id:'cs_1', subscription:'sub_1', metadata:META, amount_total:2400, currency:'eur', payment_status:'paid' };

/* ── le parcours réel : invoice.paid AVANT checkout.session.completed, au format récent ── */
{
  const w = monde();
  await creatorSubscriptionChanged(w.deps, SUB_NEW);                       /* arrive avant la ligne : ne touche rien, ne lève rien */
  check(w.rows.size === 0, 'un changement d\'état avant la ligne ne crée rien et ne lève rien');
  let r = await creatorInvoicePaid(w.deps, INV_NEW);
  check(r.ok && w.ledger.length === 1 && w.ledger[0].p_creator === 'alice' && w.ledger[0].p_fan === 'bob' && w.ledger[0].p_gross === 2400 && w.ledger[0].p_subscription === 'sub_1',
    'invoice.paid (forme 2025+) crédite le créateur — l\'ancien code sortait sans rien écrire');
  check(r.ledger.member_cents === 1920, '80 % de 24,00 € = 19,20 €');
  r = await creatorCheckoutCompleted(w.deps, SESSION);
  const row = w.rows.get('alice|bob');
  check(r.ok && !r.duplicate && row.status === 'active' && row.current_period_end === ISO && row.ending === false && row.amount_cents === 2400 && row.stripe_subscription_id === 'sub_1',
    'la ligne naît avec son état VRAI et sa fin de période (elle restait vide un an)');
  await creatorInvoicePaid(w.deps, INV_NEW);
  check(w.ledger.length === 1, 'la même facture livrée deux fois : une seule ligne');
  await creatorInvoicePaid(w.deps, INV_OLD);
  check(w.ledger.length === 1, 'la même facture, ancienne forme : toujours une seule ligne');
  /* l'abonné arrête : ending, puis la fin */
  await creatorSubscriptionChanged(w.deps, { ...SUB_NEW, cancel_at_period_end:true });
  check(w.rows.get('alice|bob').ending === true && w.rows.get('alice|bob').status === 'active', 'arrêt demandé : ending, accès gardé');
  await creatorSubscriptionChanged(w.deps, { id:'sub_1', status:'canceled', cancel_at_period_end:true });
  check(w.rows.get('alice|bob').status === 'canceled' && w.rows.get('alice|bob').ending === false && w.rows.get('alice|bob').current_period_end === ISO,
    'fin : canceled, et la dernière date connue reste (un événement sans date ne l\'efface pas)');
  /* il revient : la ligne repart sur le nouvel abonnement, sans incident */
  w.subs.sub_2 = { ...SUB_NEW, id:'sub_2' };
  r = await creatorCheckoutCompleted(w.deps, { ...SESSION, id:'cs_2', subscription:'sub_2' });
  check(!r.duplicate && w.rows.get('alice|bob').stripe_subscription_id === 'sub_2' && w.incidents.length === 0 && w.cancelled.length === 0, 'un retour après la fin n\'est pas un doublon');
  const inv2 = { ...INV_NEW, id:'in_2', parent:{ subscription_details:{ subscription:'sub_2', metadata:META } } };
  await creatorInvoicePaid(w.deps, inv2);
  check(w.ledger.length === 2, 'sa nouvelle facture est créditée');
}

/* ── le DOUBLON : deux paiements vivants pour le même créateur ── */
{
  const w = monde({ subs:{ sub_1:SUB_NEW, sub_dup:{ ...SUB_NEW, id:'sub_dup' } } });
  await creatorCheckoutCompleted(w.deps, SESSION);
  const r = await creatorCheckoutCompleted(w.deps, { ...SESSION, id:'cs_dup', subscription:'sub_dup' });
  check(r.duplicate === true && w.cancelled.join() === 'sub_dup' && w.rows.get('alice|bob').stripe_subscription_id === 'sub_1',
    'le second abonnement est ARRÊTÉ tout de suite et le premier reste la ligne (il n\'est plus orphelin)');
  check(w.incidents.length === 1 && w.incidents[0].kind === 'creator_sub_duplicate' && w.incidents[0].session === 'cs_dup' && w.incidents[0].detail.kept === 'sub_1' && w.incidents[0].detail.amount_cents === 2400,
    'l\'incident est noté pour un remboursement À LA MAIN — jamais automatique');
  const dupInv = { id:'in_dup', parent:{ subscription_details:{ subscription:'sub_dup', metadata:META } }, amount_paid:2400, currency:'eur' };
  const r2 = await creatorInvoicePaid(w.deps, dupInv);
  check(r2.skipped === 'duplicate' && w.ledger.length === 0 && w.incidents.length === 2 && w.incidents[1].detail.invoice === 'in_dup', 'la facture du doublon n\'est PAS créditée au créateur');
  await creatorSubscriptionChanged(w.deps, { id:'sub_dup', status:'canceled' });
  check(w.rows.get('alice|bob').status === 'active', 'la fin du doublon ne touche pas le vrai abonnement');
  const r3 = await creatorCheckoutCompleted(w.deps, SESSION);
  check(!r3.duplicate && w.cancelled.length === 1, 'la même session relivrée n\'est pas un doublon');
}

/* ── les bords ── */
{
  const w = monde(); w.failRead = true;
  const r = await creatorCheckoutCompleted(w.deps, SESSION);
  check(r.ok && w.rows.get('alice|bob').status === 'active' && !('current_period_end' in w.rows.get('alice|bob')), 'Stripe illisible : l\'accès payé s\'ouvre quand même, la date viendra');
  check((await creatorCheckoutCompleted(w.deps, { id:'cs_x', subscription:'sub_x', metadata:{ product:'creator_sub' } })).why === 'metadata', 'sans créateur ni abonné : rien');
  check((await creatorCheckoutCompleted(w.deps, { ...SESSION, metadata:{ ...META, fan_id:'alice' } })).why === 'self', 'on ne s\'abonne pas à soi-même');
  check((await creatorInvoicePaid(w.deps, { id:'in_thp', amount_paid:500 })).skipped === 'no_subscription', 'un paiement unique n\'a rien à faire ici');
  const w2 = monde({ subs:{ sub_h:{ id:'sub_h', status:'active', metadata:{ product:'higher_sub' } } } });
  check((await creatorInvoicePaid(w2.deps, { id:'in_h', subscription:'sub_h', amount_paid:900 })).skipped === 'higher_sub' && w2.reads.join() === 'sub_h' && w2.ledger.length === 0,
    'une facture sans metadata relit l\'abonnement ; un autre produit n\'écrit rien au grand livre');
  let leve = false; const w3 = monde(); w3.deps.ledger = async () => { throw new Error('ledger: down'); };
  try { await creatorInvoicePaid(w3.deps, INV_NEW); } catch { leve = true; }
  check(leve, 'un refus du grand livre REMONTE (Stripe relivre) : jamais un gain perdu en silence');
  check((await creatorSubscriptionChanged(w.deps, {})).why === 'id', 'un objet sans identifiant ne touche rien');
}

/* ── la clé du checkout : la même demi-heure rend la même session ── */
{
  const t = 1794830000000, k = checkoutKey('alice', 'bob', 2400, 'page', t);
  check(CHECKOUT_TTL_S === 1800 && k === checkoutKey('alice', 'bob', 2400, 'page', t + 60_000), 'deux taps à une minute : la même clé, donc la même session Stripe');
  check(k !== checkoutKey('alice', 'bob', 2500, 'page', t) && k !== checkoutKey('alice', 'carl', 2400, 'page', t) && k !== checkoutKey('alice', 'bob', 2400, 'console', t),
    'un autre prix, un autre abonné, une autre porte : une autre clé (Stripe refuse une clé rejouée avec d\'autres paramètres)');
  check(k !== checkoutKey('alice', 'bob', 2400, 'page', t + CHECKOUT_TTL_S * 1000), 'la demi-heure suivante : une session neuve');
  const e0 = checkoutExpiresAt(t), debut = Math.floor(t / 1800000) * 1800000, fin = debut + 1800000 - 1;
  check(e0 === checkoutExpiresAt(t + 60_000) && e0 === checkoutExpiresAt(debut) && e0 === checkoutExpiresAt(fin), 'l\'expiration est la MÊME dans toute la demi-heure (sinon Stripe refuse la clé rejouée)');
  check(e0 - debut / 1000 <= 3660 && e0 - fin / 1000 >= 1800, 'elle tombe 30 à 61 minutes plus tard, jamais moins que les 30 minutes que Stripe exige');
}
console.log(JSON.stringify({ checks, passed:checks }));
