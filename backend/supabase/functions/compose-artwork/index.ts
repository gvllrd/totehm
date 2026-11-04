// compose-artwork v2 — totehm streetwear
// why : la signature du totehm cloth doit reproduire l'adn visuel du front — box navy perforée, texte quantico coral, coins pleins
// how : deno + imagescript ; mesure du texte pour largeur dynamique, cercles noirs tracés mathématiquement sur les bords, epoch calculée depuis le 1er juin 2026
// what : png 300dpi prêt pour impression dtg, uploadé dans streetwear-generations, renvoie les urls signées
import { Image, TextLayout } from 'jsr:@matmen/imagescript@1.3.1';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { streetwearServiceRequest } from '../_shared/streetwear-auth.ts';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const QUANTICO_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/quantico/Quantico-Regular.ttf';

// palette de marque — rgba 32 bits
const NAVY = 0x333366ff;
const CORAL = 0xfbd5caff;
const BLACK = 0x000000ff;

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

// why : epoch 0 = 1er juin 2026 -> 31 mai 2027, +1 chaque 1er juin
function epochPrefix(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const ey = d.getUTCMonth() >= 5 ? y : y - 1; // juin = mois 5
  return Math.max(ey - 2026, 0) + '.';
}

// why : imagescript n'a pas de cercle rempli fiable — tracé pixel par pixel avec clipping aux bords
function punchCircle(img: Image, cx: number, cy: number, r: number, color: number) {
  const r2 = r * r;
  for (let dy = -r; dy <= r; dy++) {
    const y = cy + dy;
    if (y < 1 || y > img.height) continue;
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx;
      if (x < 1 || x > img.width) continue;
      if (dx * dx + dy * dy <= r2) img.setPixelAt(x, y, color);
    }
  }
}

// 04/11 (Wah) : « la boite perforee ne correspond pas a la vraie ». Les mesures viennent
// du masque du front (`#hmask`, 600x200, DIX-HUIT trous de rayon 14) : sept cercles en
// haut, sept en bas, deux sur chaque cote. Elles etaient codees en pixels absolus
// (step 140, rayon 20), calibres pour un canvas deux fois plus grand : en reduisant le
// canvas a la zone reelle de l'imprimeur, les trous sont devenus enormes et clairsemes.
// On les pose en PROPORTION, pour que la box garde le MEME dessin a toute taille.
const TROUS_X = [60, 140, 220, 300, 380, 460, 540].map(x => x / 600);
const TROUS_Y = [70, 130].map(y => y / 200);
const RAYON_RELATIF = 14 / 200;
function perforate(box: Image) {
  const w = box.width, h = box.height;
  const r = Math.max(2, Math.round(h * RAYON_RELATIF));
  for (const t of TROUS_X) {
    const x = Math.round(t * w);
    punchCircle(box, x, 1, r, BLACK);                   // bord haut
    punchCircle(box, x, h, r, BLACK);                   // bord bas
  }
  for (const t of TROUS_Y) {
    const y = Math.round(t * h);
    punchCircle(box, 1, y, r, BLACK);                   // bord gauche
    punchCircle(box, w, y, r, BLACK);                   // bord droit
  }
}

Deno.serve(async (req) => {
  // gate : seul n8n (service key) peut appeler
  if(req.method !== 'POST')return json({error:'method'},405);
  if (!await streetwearServiceRequest(req)) return json({ error: 'unauthorized' }, 401);

  let body:Record<string,unknown>;
  try { body = await req.json(); } catch { return json({error:'json'},400); }
  const { cloth_id, source_url } = body;
  if (!cloth_id || !source_url) return json({ error: 'missing fields' }, 400);

  const { data: cloth } = await sb.from('totehm_clothes').select('name,test,status,selected_concept_id,totehm_cloth_support(print_area)').eq('id', cloth_id).single();
  if (!cloth) return json({ error: 'cloth not found' }, 404);
  // 03/11 : une piece d'essai va JUSQU'A l'oeuvre composee — c'est tout l'objet de
  // l'essai visuel. Refuser ici rendait la curation d'un essai impossible, juste apres
  // l'upscale. Printful et le suivi restent barres en base par `streetwear_claim`.
  if(cloth.status !== 'curation' || !cloth.selected_concept_id)return json({error:'not_selected'},409);
  let source:URL;
  try{source=new URL(String(source_url));}catch{return json({error:'source'},400);}
  if(source.protocol!=='https:' || !(source.hostname==='replicate.delivery'||source.hostname.endsWith('.replicate.delivery')))
    return json({error:'source'},400);

  // nom complet : si le préfixe d'epoch manque, on le calcule
  const fullName = /^\d+\./.test(cloth.name) ? cloth.name : epochPrefix() + cloth.name;

  // 1. artwork sélectionné (upscalé)
  const sourceResponse=await fetch(source.href,{signal:AbortSignal.timeout(30000)});
  if(!sourceResponse.ok)return json({error:'source_download'},502);
  const srcBuf = new Uint8Array(await sourceResponse.arrayBuffer());
  // 04/11 : un upscale x4 d'un concept 1024x1536 rend un PNG de plusieurs dizaines de
  // Mo — 32 Mo refusait l'oeuvre juste avant la composition. La borne protege la memoire
  // de la fonction, pas le format : elle dit desormais le poids qu'elle a vu.
  if(srcBuf.length>80*1024*1024)return json({error:'source_size',octets:srcBuf.length},413);
  let art: Image | null = await Image.decode(srcBuf);

  // 2. canvas print 12x16" @300dpi — l'artwork tient entièrement dedans (fit, pas de débord)
  const support = cloth.totehm_cloth_support as unknown as { print_area?: {width_in?:number;height_in?:number;width_px?:number;height_px?:number} };
  const area=support?.print_area||{};
  // 04/11 : la zone d'impression REELLE vient de Printful (`width_px`/`height_px`, mesures
  // relevees par n8n F — 1800x2400 a 150 dpi pour le Champion). On recalculait 12x300,
  // soit un fichier QUATRE fois plus lourd que ce que l'imprimeur exploite ; la fonction
  // n'avait plus assez de memoire pour le composer. On suit l'imprimeur.
  const W = Math.round(Math.max(600,Math.min(6000,Number(area.width_px)||Number(area.width_in||12)*300)));
  const H = Math.round(Math.max(600,Math.min(6000,Number(area.height_px)||Number(area.height_in||16)*300)));
  // 04/11 : la fonction a rendu `not having enough compute resources`. On met l'artwork
  // a sa taille finale AVANT d'allouer le canvas, et on lache la source decodee : trois
  // images pleine taille en memoire en meme temps ne passent pas.
  const scale = Math.min((W * 0.92) / art.width, (H * 0.90) / art.height);
  const scaled = art.resize(Math.round(art.width * scale), Math.round(art.height * scale));
  art = null;
  const canvas = new Image(W, H);
  const artX = Math.round((W - scaled.width) / 2);
  const artY = Math.round((H * 0.94 - scaled.height) / 2);
  canvas.composite(scaled, artX, artY);

  // 3. la box signature — largeur dynamique mesurée sur {epoch}.{name}
  const fontBuf = new Uint8Array(await (await fetch(QUANTICO_URL)).arrayBuffer());
  const padX = Math.round(Math.min(84,W*.025)), padY = Math.round(Math.min(64,H*.015));
  // 03/11 (Wah) : la signature se LIT. Elle porte le nom du cloth dans le format EXACT
  // du streetwear — Quantico coral sur la box navy perforee, le `0.` pose par le serveur.
  const text = await Image.renderText(fontBuf, Math.round(Math.min(200,H*.05)), fullName, CORAL, new TextLayout({ maxWidth: W-2*padX-192 }));
  const box = new Image(text.width + padX * 2, text.height + padY * 2);
  box.fill(NAVY);
  perforate(box);
  box.composite(text, padX, padY);

  // 4. compositing : la signature, CENTREE en bas. Rien d'autre (03/11, Wah : « juste le
  //    nom du TOTEHM cloth sous son fond perfore bleu navy. Point. ») — le logo posé en
  //    bas a gauche encombrait l'oeuvre.
  const margin = Math.round(Math.min(96,W*.03,H*.03));
  canvas.composite(box, Math.round((W - box.width) / 2), H - box.height - margin);

  // 5. upload + urls signées (30j pour printful, 7j pour consultation)
  const png = await canvas.encode();
  const path = `${cloth_id}/final.png`;
  const { error: upErr } = await sb.storage.from('streetwear-generations').upload(path, png, { contentType: 'image/png', upsert: true });
  if (upErr) return json({ error: 'upload failed' }, 500);

  // 03/11 (Wah) : « a quel moment je peux verifier la composition reelle ? ». Le PNG
  // d'impression pese trop lourd pour une messagerie ; on ecrit un APERCU leger a cote,
  // seul moyen de VOIR l'oeuvre signee avant l'expedition — et le seul, pour un essai.
  let previewUrl: string | null = null;
  try {
    // Pas de `clone()` : le canvas a deja ete encode et televerse, on peut le reduire
    // en place. Le cloner doublait la plus grosse image en memoire, pour rien.
    const preview = canvas.resize(1400, Image.RESIZE_AUTO);
    const jpg = await preview.encodeJPEG(85);
    const previewPath = `${cloth_id}/preview.jpg`;
    const { error: prevErr } = await sb.storage.from('streetwear-generations')
      .upload(previewPath, jpg, { contentType: 'image/jpeg', upsert: true });
    if (!prevErr) {
      const { data: prevSig } = await sb.storage.from('streetwear-generations').createSignedUrl(previewPath, 60 * 60 * 24 * 7);
      previewUrl = prevSig?.signedUrl ?? null;
    }
  } catch (_) { /* l'apercu est un confort : la piece reste valide sans */ }

  const { data: printSig } = await sb.storage.from('streetwear-generations').createSignedUrl(path, 60 * 60 * 24 * 30);
  const { data: finalSig } = await sb.storage.from('streetwear-generations').createSignedUrl(path, 60 * 60 * 24 * 7);
  if(!printSig?.signedUrl||!finalSig?.signedUrl)return json({error:'signing'},503);
  return json({ print_url: printSig?.signedUrl, final_url: finalSig?.signedUrl, preview_url: previewUrl, storage_path: path, name: fullName });
});
