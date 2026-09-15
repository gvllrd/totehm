// TOTEHM · creator-price
// ═══════════════════════════════════════════════════════════════════════
// Le créateur fixe le prix de son abonnement. C'est SA décision — et
// c'est exactement pour ça qu'elle se valide côté serveur.
//
// ⚠️ LE PRIX ET L'ACCÈS VIENNENT DU SERVEUR. Un prix posé côté client se
// modifie en deux clics dans l'inspecteur : quelqu'un s'abonnerait à
// 0,01 € et le créateur verrait un fan de plus pour rien. Les bornes
// vivent ici ET dans la contrainte SQL — deux verrous, parce que celui
// qui saute n'est jamais celui qu'on surveille.
// ═══════════════════════════════════════════════════════════════════════
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_COM } from "../_shared/origins.ts";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const MIN = 300;    //  3 € — sous ce seuil les frais Stripe mangent la part
const MAX = 50000;  // 500 € — au-delà, c'est une erreur de frappe

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"), SITE_COM);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { data: { user }, error: authErr } = await sb.auth.getUser(
    (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
  );
  if (authErr || !user) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  let cents = 0;
  try {
    const body = await req.json();
    cents = Math.round(Number(body?.cents));
  } catch {
    return Response.json({ error: "bad request" }, { status: 400, headers: cors });
  }

  if (!Number.isFinite(cents) || cents < MIN || cents > MAX) {
    return Response.json(
      { error: "price out of range", min: MIN, max: MAX },
      { status: 422, headers: cors },
    );
  }

  const { error } = await sb
    .from("creator_profiles")
    .update({ custom_sub_price: cents })
    .eq("user_id", user.id);

  if (error) {
    console.error("[creator-price]", error.message);
    return Response.json({ error: "not saved" }, { status: 500, headers: cors });
  }
  return Response.json({ ok: true, cents }, { headers: cors });
});
