// TOTEHM · spot-video — LE MÉDIA D'UN SPOT, SANS JAMAIS EXPOSER LE BOT
//
// POURQUOI CETTE FONCTION EXISTE
//   Telegram héberge la vidéo d'un membre gratuitement et pour toujours :
//   `file_id` est permanent. Mais le lien de téléchargement rendu par
//   `getFile` EXPIRE au bout d'environ une heure. La carte ne peut donc pas
//   stocker une URL une fois pour toutes, et elle ne doit surtout pas
//   appeler Telegram elle-même — ça exposerait le token du bot à quiconque
//   ouvre le radar.
//
//   Cette fonction est le seul pont. Elle rend une URL fraîche, et elle
//   met en cache ce qu'elle vient de résoudre pour ne pas rappeler
//   Telegram à chaque vue : au plus un appel par heure et par vidéo.
//
// LE CALCUL QUI A DÉCIDÉ DE TOUT ÇA
//   Photo Google : 7 $/1 000 requêtes, conservation interdite — on paierait
//   à chaque vue, à vie. ≈ 1 050 $/mois à 10 000 ouvertures de carte.
//   Vidéo membre : le membre paie la capture, Telegram paie le stockage,
//   on paie ~2,70 $/mois de transport. Et c'est du contenu que Google n'a
//   pas : une salle vue par quelqu'un qui s'y entraîne à 7 h du matin,
//   ce n'est pas la photo du hall d'entrée.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/origins.ts";

const TG = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Un uuid, et rien d'autre. Un paramètre qui part vers une URL externe se
// valide AVANT de partir, jamais après.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  // ⚠️ Jamais de wildcard ici : cette fonction lit le token du bot. Un
  // `Access-Control-Allow-Origin: *` sur une fonction qui touche un secret,
  // c'est une facture — ou une fuite — signée par n'importe quel site.
  const cors = corsHeaders(origin, "https://www.totehm.space");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // GET ou POST : la carte appelle en GET (requête simple, pas de
    // préflight), le bot en POST comme le reste du backend. Un seul point
    // d'entrée, deux façons de le joindre.
    const id = req.method === "POST"
      ? ((await req.json().catch(() => ({})))?.spot ?? "")
      : (new URL(req.url).searchParams.get("spot") ?? "");
    if (!UUID.test(id)) {
      return Response.json({ error: "bad_spot" }, { status: 400, headers: cors });
    }

    const { data, error } = await sb.rpc("spot_video", { p_spot: id });
    // Une erreur de RPC se JOURNALISE, toujours : sans ce log, une vidéo
    // absente ne dit pas si le spot n'en a pas ou si l'appel casse.
    if (error) {
      console.error("spot_video:", error.message);
      return Response.json({ error: "lookup_failed" }, { status: 500, headers: cors });
    }
    const row = (data ?? [])[0];
    if (!row?.file_id) {
      return Response.json({ video: null }, { headers: cors });
    }

    // Le cache est encore frais : on ne dérange pas Telegram.
    if (row.fresh && row.url) {
      return Response.json(
        { video: row.url, kind: row.kind, secs: row.secs, cached: true },
        { headers: cors },
      );
    }

    const r = await fetch(
      `https://api.telegram.org/bot${TG}/getFile?file_id=${encodeURIComponent(row.file_id)}`,
    );
    const j = await r.json();
    if (!j?.ok || !j?.result?.file_path) {
      // Telegram peut avoir perdu le fichier (bot recréé, média supprimé).
      // On le dit, on ne rend pas une URL cassée que le lecteur avalerait
      // en silence.
      console.error("getFile:", JSON.stringify(j?.description ?? j));
      return Response.json({ video: null, reason: "gone" }, { headers: cors });
    }

    const url = `https://api.telegram.org/file/bot${TG}/${j.result.file_path}`;
    // On repose le cache sans attendre : la réponse ne doit pas dépendre de
    // l'écriture, et un cache qui rate n'est qu'un appel Telegram de plus.
    sb.rpc("spot_video_cache", { p_spot: id, p_url: url })
      .then(({ error }) => { if (error) console.error("spot_video_cache:", error.message); });

    return Response.json(
      { video: url, kind: row.kind, secs: row.secs, cached: false },
      { headers: cors },
    );
  } catch (e) {
    console.error("spot-video:", e);
    return Response.json({ error: "failed" }, { status: 500, headers: cors });
  }
});
