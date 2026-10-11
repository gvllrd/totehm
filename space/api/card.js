// TOTEHM · totehm.space · /s/:id (et /s/:id/i) — 11/10/2026
// why : un space partagé (WhatsApp, Instagram, X, iMessage) doit se montrer : son Habit, son auteur,
//       sa photo ou la première image de sa vidéo. La page est une app : les robots d'aperçu ne
//       lisent que le HTML servi, d'où cette petite page d'en-têtes qui renvoie aussitôt au space.
// how : `spot_get` sous la clé ANON publique (les droits d'un visiteur, jamais plus) ; seul un space
//       PARTAGÉ et publié s'affiche, tout le reste reçoit l'aperçu générique de SPACE. L'image passe
//       par ici (`/s/:id/i`) : une URL stable, une signature fraîche à chaque lecture, 1 h de cache.
// what : GET /api/card?id=<uuid>[&img=1] → HTML (og:*) ou image/jpeg ; jamais un point exact, jamais
//        un objectif ou une répulsion que l'auteur n'a pas montrés (on ne lit que `habit`, `creator`, `city`).
const SB = 'https://abujjbkbbiumxrokozph.supabase.co';
// Clé publique (rôle anon), déjà servie dans chaque page : pas un secret.
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidWpqYmtiYml1bXhyb2tvenBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTUyODIsImV4cCI6MjA5MDUzMTI4Mn0.1baPwPzAeT91Re9xj6afBrNso-Ri46fvIIwvATZL2us';
const SITE = 'https://www.totehm.space';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const H = { apikey: ANON, authorization: 'Bearer ' + ANON, 'content-type': 'application/json' };
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);

async function readSpace(id){
  const r = await fetch(SB + '/rest/v1/rpc/spot_get', { method:'POST', headers:H, body: JSON.stringify({ p_id:id }) });
  if(!r.ok) return null;
  const d = await r.json();
  const s = d?.ok ? d.spot : null;
  return s && s.format === 'space' && s.visibility === 'shared' ? s : null;
}
async function imageURL(s){
  if(s.photo){
    const r = await fetch(SB + '/storage/v1/object/sign/moments/' + s.photo.split('/').map(encodeURIComponent).join('/'), { method:'POST', headers:H, body: JSON.stringify({ expiresIn:300 }) });
    const d = r.ok ? await r.json() : null;
    return d?.signedURL ? SB + '/storage/v1' + d.signedURL : null;
  }
  if(s.clip?.id && s.clip.status === 'ready'){
    const r = await fetch(SB + '/functions/v1/bunny-video', { method:'POST', headers:H, body: JSON.stringify({ id:s.clip.id, spot:s.id }) });
    const d = r.ok ? await r.json() : null;
    return typeof d?.url === 'string' && d.url.endsWith('/playlist.m3u8') ? d.url.replace(/playlist\.m3u8$/, 'thumbnail.jpg') : null;
  }
  return null;
}
function page(res, s, id, hasImage){
  const target = s ? '/?spot=' + encodeURIComponent(id) : '/';
  const title = s ? s.habit : 'TOTEHM.SPACE';
  const desc = s ? [s.creator && 'by ' + s.creator, s.city, 'a strategic habit, lived'].filter(Boolean).join(' · ') : 'Strategic habits, lived. No selfie, no music: the place and its sound.';
  const img = s && hasImage ? SITE + '/s/' + id + '/i' : SITE + '/assets/img/totehm_logo.png';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
  res.status(200).send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(title) + ' · TOTEHM.SPACE</title><meta name="description" content="' + esc(desc) + '">' +
    '<meta property="og:site_name" content="TOTEHM.SPACE"><meta property="og:type" content="website">' +
    '<meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(desc) + '">' +
    '<meta property="og:url" content="' + esc(SITE + (s ? '/s/' + id : '/')) + '"><meta property="og:image" content="' + esc(img) + '">' +
    '<meta name="twitter:card" content="' + (s && hasImage ? 'summary_large_image' : 'summary') + '">' +
    '<link rel="canonical" href="' + esc(SITE + target) + '"><meta http-equiv="refresh" content="0;url=' + esc(target) + '">' +
    '<style>html,body{margin:0;background:#000}</style></head><body><script>location.replace(' + JSON.stringify(target) + ')</script></body></html>');
}
export default async function handler(req, res){
  const id = String(req.query.id || '');
  if(!UUID.test(id)) return page(res, null, '', false);
  let s = null;
  try{ s = await readSpace(id); }catch(e){ console.error('[card] read', e?.message || e); }
  if(req.query.img){
    try{
      const u = s ? await imageURL(s) : null;
      const r = u ? await fetch(u) : null;
      if(r?.ok){
        res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        return res.status(200).send(Buffer.from(await r.arrayBuffer()));
      }
    }catch(e){ console.error('[card] image', e?.message || e); }
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.redirect(302, '/assets/img/totehm_logo.png');
  }
  const hasImage = !!(s && (s.photo || (s.clip?.id && s.clip.status === 'ready')));
  return page(res, s, id, hasImage);
}
