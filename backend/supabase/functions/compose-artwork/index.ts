// compose-artwork v2 — totehm streetwear
// why : la signature du totehm cloth doit reproduire l'adn visuel du front — box navy perforée, texte quantico coral, coins pleins
// how : deno + imagescript ; mesure du texte pour largeur dynamique, cercles noirs tracés mathématiquement sur les bords, epoch calculée depuis le 1er juin 2026
// what : png 300dpi prêt pour impression dtg, uploadé dans streetwear-generations, renvoie les urls signées
import { Image, TextLayout } from 'jsr:@matmen/imagescript@1.3.1';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { streetwearServiceRequest } from '../_shared/streetwear-auth.ts';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const LOGO_URL = Deno.env.get('TOTEHM_LOGO_URL') ?? 'https://www.higher.boutique/assets/img/totehm_logo.png';
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

// why : reproduire le border-image du front — cercles centrés sur les bords, coins pleins
function perforate(box: Image, step = 140, r = 20, cornerGap = 70) {
  const w = box.width, h = box.height;
  for (let x = cornerGap + step / 2; x <= w - cornerGap; x += step) {
    punchCircle(box, Math.round(x), 1, r, BLACK);       // bord haut
    punchCircle(box, Math.round(x), h, r, BLACK);       // bord bas
  }
  for (let y = cornerGap + step / 2; y <= h - cornerGap; y += step) {
    punchCircle(box, 1, Math.round(y), r, BLACK);       // bord gauche
    punchCircle(box, w, Math.round(y), r, BLACK);       // bord droit
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
  if(cloth.test)return json({error:'test_blocked'},403);
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
  if(srcBuf.length>32*1024*1024)return json({error:'source_size'},413);
  const art = await Image.decode(srcBuf);

  // 2. canvas print 12x16" @300dpi — l'artwork tient entièrement dedans (fit, pas de débord)
  const support = cloth.totehm_cloth_support as unknown as { print_area?: {width_in?:number;height_in?:number} };
  const area=support?.print_area||{};
  const W = Math.round(Math.max(600,Math.min(6000,Number(area.width_in||12)*300)));
  const H = Math.round(Math.max(600,Math.min(6000,Number(area.height_in||16)*300)));
  const canvas = new Image(W, H);
  const scale = Math.min((W * 0.92) / art.width, (H * 0.90) / art.height);
  const scaled = art.resize(Math.round(art.width * scale), Math.round(art.height * scale));
  const artX = Math.round((W - scaled.width) / 2);
  const artY = Math.round((H * 0.94 - scaled.height) / 2);
  canvas.composite(scaled, artX, artY);

  // 3. la box signature — largeur dynamique mesurée sur {epoch}.{name}
  const fontBuf = new Uint8Array(await (await fetch(QUANTICO_URL)).arrayBuffer());
  const padX = Math.round(Math.min(84,W*.025)), padY = Math.round(Math.min(64,H*.015));
  const text = await Image.renderText(fontBuf, Math.round(Math.min(130,H*.035)), fullName, CORAL, new TextLayout({ maxWidth: W-2*padX-192 }));
  const box = new Image(text.width + padX * 2, text.height + padY * 2);
  box.fill(NAVY);
  perforate(box);
  box.composite(text, padX, padY);

  // 4. compositing : box en bas à droite, logo en bas à gauche
  const margin = Math.round(Math.min(96,W*.03,H*.03));
  canvas.composite(box, W - box.width - margin, H - box.height - margin);
  try {
    const logoBuf = new Uint8Array(await (await fetch(LOGO_URL)).arrayBuffer());
    const logo = (await Image.decode(logoBuf)).resize(340, Image.RESIZE_AUTO);
    canvas.composite(logo, margin, H - logo.height - margin);
  } catch (_) { /* logo optionnel : la pièce reste valide sans */ }

  // 5. upload + urls signées (30j pour printful, 7j pour consultation)
  const png = await canvas.encode();
  const path = `${cloth_id}/final.png`;
  const { error: upErr } = await sb.storage.from('streetwear-generations').upload(path, png, { contentType: 'image/png', upsert: true });
  if (upErr) return json({ error: 'upload failed' }, 500);

  const { data: printSig } = await sb.storage.from('streetwear-generations').createSignedUrl(path, 60 * 60 * 24 * 30);
  const { data: finalSig } = await sb.storage.from('streetwear-generations').createSignedUrl(path, 60 * 60 * 24 * 7);
  if(!printSig?.signedUrl||!finalSig?.signedUrl)return json({error:'signing'},503);
  return json({ print_url: printSig?.signedUrl, final_url: finalSig?.signedUrl, storage_path: path, name: fullName });
});
