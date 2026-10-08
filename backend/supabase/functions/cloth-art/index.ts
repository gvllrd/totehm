// TOTEHM · cloth-art — l'œuvre d'un Totehm Cloth, par son nom · 08/10/2026
// why : Wah, 08/10 — « c'est ce nom du totehm cloth que l'on peut accéder au
//       design généré automatiquement ». Decode montre l'œuvre. La promesse
//       tient : « You will not see it before it lands » — l'œuvre ne se montre
//       qu'une fois la pièce EXPÉDIÉE (`reveal_cloth.art`).
// how : le nom → `_cloth_art_path` (service_role) : pièce payée, `shipped`,
//       jamais un test, chemin durable `<cloth_id>/final.png` du seau PRIVÉ
//       `streetwear-generations` → URL signée 1 h. Rien d'autre ne sort : ni
//       l'identifiant, ni le chemin, ni l'acheteur.
// what : POST { name } → { url } | { error }   (verify_jwt = false : Decode est public)

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, SITE_BOUT } from "../_shared/origins.ts";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"), SITE_BOUT);
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "json" }, 400); }
  const name = String(body.name ?? "").trim();
  if (!/^\d+\..{2,40}$/.test(name)) return json({ error: "name" }, 400);

  const { data: path, error } = await sb.rpc("_cloth_art_path", { p_name: name });
  if (error) {
    console.error("[cloth-art] path", error.message);
    return json({ error: "unavailable" }, 503);
  }
  if (!path) return json({ error: "not_yet" }, 404);

  const { data: signed, error: sErr } = await sb.storage.from("streetwear-generations").createSignedUrl(String(path), 3600);
  if (sErr || !signed?.signedUrl) {
    console.error("[cloth-art] sign", sErr?.message ?? "no url");
    return json({ error: "unavailable" }, 503);
  }
  return json({ url: signed.signedUrl });
});
