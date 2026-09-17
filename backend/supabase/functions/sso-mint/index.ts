// TOTEHM · sso-mint
// ═══════════════════════════════════════════════════════════════════════
// LE PONT SSO, CÔTÉ DÉPART. Le membre est connecté ici ; il part ailleurs.
//
// Quatre domaines, quatre `localStorage`, quatre sessions. Le compte est
// unique — l'email est l'identité universelle — mais la session ne l'est
// pas et ne peut pas l'être : un navigateur ne partage rien entre deux
// origines. On ne le contourne pas, on le TRAVERSE.
//
// Cette fonction frappe un CODE DE PASSAGE : soixante secondes, un seul
// usage, un seul domaine cible.
//
// ⚠️ CE N'EST PAS UN JETON DE SESSION, et c'est toute la sécurité.
// Un jeton de session vit des heures et ouvre tout ; ce code vit une
// minute, ne sert qu'une fois, ne vaut que pour un domaine, est stocké
// HACHÉ, et n'ouvre rien par lui-même — il faut l'échanger côté serveur.
// C'est un code d'autorisation. Le confondre avec une clé, ce serait
// s'interdire tout SSO.
//
// ⚠️ L'UTILISATEUR VIENT DE LA SESSION, JAMAIS DU CORPS. Sinon n'importe
// qui frapperait un code pour le compte d'un autre — et le pont
// deviendrait une porte.
// ═══════════════════════════════════════════════════════════════════════
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, CIBLES } from "../_shared/origins.ts";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

/** Soixante secondes. Le temps d'une redirection, pas celui d'un café. */
const VIE_SECONDES = 60;

/** SHA-256 en hexadécimal — `crypto.subtle` est dans le runtime, aucune
 *  dépendance à installer. */
async function hache(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { data: { user }, error: authErr } = await sb.auth.getUser(
    (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
  );
  if (authErr || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  let cible = "";
  try {
    cible = String((await req.json())?.target ?? "");
  } catch {
    return Response.json({ error: "bad request" }, { status: 400, headers: cors });
  }
  // ⚠️ UN NOM DE PRODUIT, PAS UNE URL. Accepter une URL reçue, ce serait
  // laisser n'importe quel site demander un code « pour lui-même ».
  if (!CIBLES[cible]) {
    return Response.json({ error: "unknown target" }, { status: 422, headers: cors });
  }

  // 32 octets d'aléa : le code n'est pas devinable, et il est court assez
  // pour tenir dans un fragment d'URL sans le rendre illisible.
  const brut = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  const { error } = await sb.from("sso_handoff").insert({
    code_hash: await hache(brut),
    user_id: user.id,
    target: cible,
    expires_at: new Date(Date.now() + VIE_SECONDES * 1000).toISOString(),
  });
  if (error) {
    console.error("[sso-mint]", error.message);
    return Response.json({ error: "not minted" }, { status: 500, headers: cors });
  }

  // Le ménage au passage : la table doit rester minuscule. Une ligne
  // périmée ne sert à rien et ralentit tout le monde.
  sb.rpc("sso_menage").then(() => {}, () => {});

  return Response.json({ code: brut, ttl: VIE_SECONDES }, { headers: cors });
});
