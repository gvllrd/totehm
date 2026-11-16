// TOTEHM · _shared/creator-checkout.ts — une seule session de paiement par demi-heure. PUR (aucun réseau, aucun Deno).
// `creator-subscribe` l'importe ; `tests/fn/creator-sub.mjs` le teste sous Node.
/**
 * La clé d'idempotence d'un checkout : le même membre, le même créateur, le même prix, la même porte, dans la même
 * demi-heure → Stripe rend la MÊME session (deux onglets, un double tap : un seul paiement possible).
 * ⚠️ Stripe refuse une clé rejouée avec d'AUTRES paramètres : tout ce qui part avec elle doit être déterministe
 * dans la demi-heure — d'où `checkoutExpiresAt`, calculé sur la tranche et non sur l'instant.
 */
export const CHECKOUT_TTL_S = 30 * 60;
const tranche = (nowMs: number) => Math.floor(nowMs / (CHECKOUT_TTL_S * 1000));
export function checkoutKey(creator: string, fan: string, cents: number, from: string, nowMs: number): string {
  return ["creator_sub", creator, fan, cents, from, tranche(nowMs)].join(":");
}
/** L'expiration de la session, en secondes Unix : la fin de la tranche SUIVANTE (30 à 60 min — Stripe en exige 30). */
export function checkoutExpiresAt(nowMs: number): number {
  return (tranche(nowMs) + 2) * CHECKOUT_TTL_S + 60;
}
