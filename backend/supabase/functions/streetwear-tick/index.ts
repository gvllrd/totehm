// streetwear-tick v1 — totehm streetwear
// why : rien ne reprenait un job en attente. Un upscale plus long que l'appel laissait la
//       piece en `waiting` jusqu'a ce que Replicate purge son fichier, et il fallait la
//       relancer a la main. En production, le premier acheteur serait reste en plan.
// how  : pg_cron arme la fonction toutes les cinq minutes avec un jeton a usage unique
//        (`streetwear_tick_arm`). Elle requalifie les executions abandonnees, prend ce qui
//        est pret (`streetwear_due`, qui reserve) et rappelle le bon webhook n8n.
// what : un compte par etape ; aucun appel payant ici — n8n reclame le bail, lui seul decide.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE);
const N8N = 'https://n8n.higher.boutique/webhook/';

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

// Quel flux reprend quelle etape. `tracking` n'est pas ici : c'est Printful qui pousse.
function route(stage: string, cloth: string): { path: string; body: Record<string, unknown> } | null {
  if (stage === 'generation') return { path: 'streetwear-generate', body: { cloth_id: cloth } };
  if (stage === 'notify') return { path: 'streetwear-generate', body: { cloth_id: cloth, stage: 'notify' } };
  if (stage === 'curation') return { path: 'curation', body: { resume_cloth_id: cloth } };
  if (stage === 'printful') return { path: 'streetwear-printful', body: { cloth_id: cloth } };
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  // Le jeton du cron, ou la cle de service pour un declenchement a la main.
  const token = req.headers.get('x-tick-token');
  let allowed = false;
  if (token) {
    const { data } = await sb.rpc('streetwear_tick_consume', { p_token: token });
    allowed = data === true;
  } else {
    const key = req.headers.get('apikey') || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    allowed = !!key && key === SERVICE;
  }
  if (!allowed) return json({ error: 'unauthorized' }, 401);

  // 1. les executions abandonnees redeviennent reprenables (ou s'arretent franchement)
  let requalifies = 0;
  const { data: rec, error: recErr } = await sb.rpc('streetwear_recover_stalled');
  if (!recErr && typeof rec === 'number') requalifies = rec;

  // 2. ce qui est pret, deja reserve par la base
  const { data: due, error: dueErr } = await sb.rpc('streetwear_due', { p_limit: 20 });
  if (dueErr) return json({ error: 'due', detail: dueErr.message }, 500);
  const jobs = Array.isArray(due) ? due : [];

  // 3. on rappelle le flux. Une piece qui ne repart pas reste reservee trois minutes : le
  //    tic suivant la reprendra. On ne touche a aucun etat ici — n8n reclame, ou renonce.
  const par_etape: Record<string, number> = {};
  const refuses: string[] = [];
  for (const job of jobs) {
    const r = route(String(job.stage), String(job.cloth_id));
    if (!r) continue;
    try {
      const rep = await fetch(N8N + r.path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: SERVICE },
        body: JSON.stringify(r.body),
        signal: AbortSignal.timeout(10000),
      });
      if (rep.ok) par_etape[job.stage] = (par_etape[job.stage] || 0) + 1;
      else refuses.push(`${job.stage}:${rep.status}`);
    } catch (e) {
      refuses.push(`${job.stage}:${(e as Error)?.name === 'TimeoutError' ? 'timeout' : 'transport'}`);
    }
  }

  return json({ ok: true, requalifies, prets: jobs.length, relances: par_etape, refuses: refuses.slice(0, 10) });
});
