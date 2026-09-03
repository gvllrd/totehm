// TOTEHM · embed-places
// why  : les 60 lignes preexistantes de `places` n'ont pas d'embedding —
//        higher-map n'embed que les NOUVEAUX lieux qu'il ingere. Sans
//        backfill, le radar ne matche rien tant qu'aucun nouveau sweep
//        n'est declenche.
// how  : one-shot. Iterate sur places.embedding IS NULL, compose le texte
//        (name + primaryType + description.values()), appelle OpenAI en
//        batch, ecrit le vecteur. Idempotent — relancable a l'infini.
// what : { embedded, skipped, cost_estimate_usd }
//
// verify_jwt = false (utilise SUPABASE_SERVICE_ROLE_KEY, appele manuellement)
// A supprimer une fois le backfill valide.

import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const EMBED_MODEL = "text-embedding-3-small";
const BATCH_SIZE  = 50; // OpenAI accepte jusqu'a 2048 items par requete

function placeToText(p: Record<string, unknown>): string {
  const name    = String(p.name ?? "");
  const type    = String(p.lieu_type ?? "");
  const descs   = (p.descriptions ?? {}) as Record<string, string>;
  const descTxt = Object.entries(descs)
    .map(([intent, d]) => `${intent}: ${d}`)
    .join(" · ");
  return [name, type, descTxt].filter(Boolean).join(" — ");
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const key = Deno.env.get("OPENAI_API_KEY")!;
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`openai embeddings ${r.status}: ${t.slice(0, 300)}`);
  }
  const j = await r.json();
  return (j.data ?? []).map((d: { embedding: number[] }) => d.embedding);
}

Deno.serve(async () => {
  const { data: rows, error } = await sb
    .from("places")
    .select("place_id, name, lieu_type, descriptions")
    .is("embedding", null)
    .limit(500);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return Response.json({ embedded: 0, skipped: 0, done: true });

  let embedded = 0;
  let skipped  = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const texts = chunk.map(placeToText);

    try {
      const vectors = await embedBatch(texts);
      for (let k = 0; k < chunk.length; k++) {
        const vec = vectors[k];
        if (!vec) { skipped++; continue; }
        const { error: uErr } = await sb
          .from("places")
          .update({ embedding: JSON.stringify(vec) })
          .eq("place_id", chunk[k].place_id);
        if (uErr) { skipped++; errors.push(`${chunk[k].place_id}: ${uErr.message}`); }
        else embedded++;
      }
    } catch (e) {
      skipped += chunk.length;
      errors.push((e as Error).message);
    }
  }

  // Ordre de grandeur : ~30 tokens par lieu, $0.02/1M tokens
  const cost = (embedded * 30 * 0.02) / 1_000_000;

  return Response.json({
    embedded,
    skipped,
    cost_estimate_usd: Number(cost.toFixed(6)),
    errors: errors.slice(0, 5),
  });
});
