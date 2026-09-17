// TOTEHM · sso-redeem
// ═══════════════════════════════════════════════════════════════════════
// LE PONT SSO, CÔTÉ ARRIVÉE. Le membre arrive avec un code de passage ;
// il repart avec une vraie session Supabase sur CE domaine.
//
// POURQUOI ON PASSE PAR `generateLink` ET PAS PAR UN JETON MAISON.
// Signer soi-même un JWT Supabase, c'est mettre le secret JWT dans une
// fonction, réimplémenter l'expiration, le rafraîchissement et la
// révocation — et se tromper quelque part. `auth.admin.generateLink`
// fabrique un jeton que Supabase sait déjà vérifier, et `verifyOtp` côté
// page ouvre une session normale, avec son refresh token et sa
// déconnexion. Zéro cryptographie écrite à la main.
// ⚠️ `generateLink` N'ENVOIE AUCUN EMAIL : elle GÉNÈRE. C'est sa raison
// d'être. Le membre ne reçoit rien, il est juste connecté.
//
// ⚠️ LE CODE EST BRÛLÉ AVANT D'ÊTRE HONORÉ. On marque `used_at` par un
// `update ... where used_at is null` qui ne rend une ligne QUE s'il était
// encore neuf : deux onglets qui échangent le même code en même temps,
// et un seul gagne. Vérifier puis marquer laisserait la fenêtre ouverte.
// ═══════════════════════════════════════════════════════════════════════
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, origineDe } from "../_shared/origins.ts";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

async function hache(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  let code = "";
  try {
    code = String((await req.json())?.code ?? "");
  } catch {
    return Response.json({ error: "bad request" }, { status: 400, headers: cors });
  }
  if (code.length < 32) {
    return Response.json({ error: "bad code" }, { status: 400, headers: cors });
  }

  // On BRÛLE d'abord. `used_at is null` et `expires_at > now()` sont dans
  // le même UPDATE : la ligne ne revient que si elle était encore bonne,
  // et elle ne peut revenir qu'une fois.
  const { data: lignes, error } = await sb
    .from("sso_handoff")
    .update({ used_at: new Date().toISOString() })
    .eq("code_hash", await hache(code))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("user_id,target");

  if (error) {
    console.error("[sso-redeem]", error.message);
    return Response.json({ error: "not redeemed" }, { status: 500, headers: cors });
  }
  const ligne = lignes?.[0];
  // Périmé, déjà servi, ou inventé : une seule réponse pour les trois.
  // Distinguer, ce serait dire à qui essaie où il en est.
  if (!ligne) {
    return Response.json({ error: "expired" }, { status: 401, headers: cors });
  }

  // ⚠️ LA CIBLE DOIT CORRESPONDRE À QUI APPELLE. Un code frappé pour
  // `space` ne s'échange pas sur `boutique` : sinon un domaine
  // compromis récupérerait les passages destinés aux autres.
  if (!origineDe(ligne.target, origin)) {
    return Response.json({ error: "wrong door" }, { status: 403, headers: cors });
  }

  const { data: u, error: uErr } = await sb.auth.admin.getUserById(ligne.user_id);
  if (uErr || !u?.user?.email) {
    console.error("[sso-redeem] user", uErr?.message);
    return Response.json({ error: "no user" }, { status: 404, headers: cors });
  }

  const { data: lien, error: lErr } = await sb.auth.admin.generateLink({
    type: "magiclink",
    email: u.user.email,
  });
  if (lErr || !lien?.properties?.hashed_token) {
    console.error("[sso-redeem] link", lErr?.message);
    return Response.json({ error: "no token" }, { status: 502, headers: cors });
  }

  // La page appellera `verifyOtp({type:'email', token_hash})` : c'est elle
  // qui ouvre la session, dans SON `localStorage`. Le serveur ne stocke
  // rien de plus.
  return Response.json(
    { token_hash: lien.properties.hashed_token, email: u.user.email },
    { headers: cors },
  );
});
