// ═══════════════════════════════════════════════════════════════
// TOTEHM · _shared/origins.ts
// why : trois domaines, quatre Edge Functions. Une liste dupliquée
//       quatre fois finit toujours par diverger, et la divergence
//       se voit le jour où un achat échoue sans message.
// how : une seule source. Toute fonction l'importe, aucune ne
//       redéclare sa propre liste.
// ═══════════════════════════════════════════════════════════════

/** Origine canonique par produit — sert de fallback et de base aux URLs Stripe. */
export const SITE_COM   = "https://www.totehm.com";
export const SITE_SPACE = "https://www.totehm.space";
export const SITE_BOUT  = "https://www.higher.boutique";

/** Apex + www pour chacun des trois domaines, plus le dev local. */
export const ALLOWED_ORIGINS: readonly string[] = [
  SITE_COM,   "https://totehm.com",
  SITE_SPACE, "https://totehm.space",
  SITE_BOUT,  "https://higher.boutique",
  "http://localhost:3000",
];

/**
 * Renvoie l'origine si elle est autorisée, sinon le fallback.
 * Ne renvoie JAMAIS '*' : ces fonctions touchent au paiement.
 */
export function resolveOrigin(
  origin: string | null,
  fallback: string = SITE_COM,
): string {
  return origin && ALLOWED_ORIGINS.includes(origin) ? origin : fallback;
}

/** En-têtes CORS complets pour une réponse JSON. */
export function corsHeaders(
  origin: string | null,
  fallback: string = SITE_COM,
): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveOrigin(origin, fallback),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}
