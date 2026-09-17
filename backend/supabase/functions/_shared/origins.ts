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
/** Le quatrième domaine — le radar et les shorts. 17/09/2026. */
export const SITE_CLUB  = "https://www.figher.club";

/** Apex + www pour chacun des quatre domaines, plus le dev local. */
export const ALLOWED_ORIGINS: readonly string[] = [
  SITE_COM,   "https://totehm.com",
  SITE_SPACE, "https://totehm.space",
  SITE_BOUT,  "https://higher.boutique",
  SITE_CLUB,  "https://figher.club",
  "http://localhost:3000",
];

/**
 * ⚠️ LA CIBLE D'UN PASSAGE SSO EST UN NOM DE PRODUIT, JAMAIS UNE URL
 * REÇUE. Un code émis pour `space` ne doit pas pouvoir être brûlé sur
 * `boutique` : si la page choisissait librement sa destination, un site
 * tiers n'aurait qu'à demander un code « pour lui-même ».
 * Quatre noms, quatre origines, et rien d'autre ne passe.
 */
export const CIBLES: Record<string, readonly string[]> = {
  com:      [SITE_COM,   "https://totehm.com"],
  space:    [SITE_SPACE, "https://totehm.space"],
  boutique: [SITE_BOUT,  "https://higher.boutique"],
  club:     [SITE_CLUB,  "https://figher.club"],
};

/** L'origine appelante appartient-elle bien à la cible annoncée ? */
export function origineDe(cible: string, origin: string | null): boolean {
  const l = CIBLES[cible];
  if (!l) return false;
  if (origin === "http://localhost:3000") return true;
  return !!origin && l.includes(origin);
}

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
