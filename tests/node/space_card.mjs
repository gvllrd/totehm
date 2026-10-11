// totehm.space · /s/:id — 11/10/2026 (bis). The share card: Open Graph tags for a SHARED space only,
// a generic card for everything else, the image proxied with a fresh signature, HTML escaped.
// fetch is mocked; nothing reaches production. Run: node tests/node/space_card.mjs
import handler from '../../space/api/card.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if(!c) fails++; };
const ID = '5b8e2f1a-1c2d-4e3f-8a9b-0c1d2e3f4a5b', SB = 'https://abujjbkbbiumxrokozph.supabase.co';
let spots = {}, seen = [];
globalThis.fetch = async (url, init = {}) => {
  url = String(url); seen.push({ url, init });
  const json = (b, s = 200) => new Response(JSON.stringify(b), { status:s, headers:{ 'content-type':'application/json' } });
  if(url === SB + '/rest/v1/rpc/spot_get'){ const id = JSON.parse(init.body).p_id; return json(spots[id] ? { ok:true, spot:spots[id] } : { ok:false }); }
  if(url.startsWith(SB + '/storage/v1/object/sign/moments/') && init.method === 'POST') return json({ signedURL:'/object/sign/moments/u/p.jpg?token=t' });
  if(url === SB + '/storage/v1/object/sign/moments/u/p.jpg?token=t') return new Response(new Uint8Array([255,216,255]), { headers:{ 'content-type':'image/jpeg' } });
  if(url === SB + '/functions/v1/bunny-video') return json({ status:'ready', url:'https://cdn.example/bcdn_token=x&expires=1&token_path=%2Fg%2F/g/playlist.m3u8', expires:1 });
  if(url === 'https://cdn.example/bcdn_token=x&expires=1&token_path=%2Fg%2F/g/thumbnail.jpg') return new Response(new Uint8Array([1,2,3,4]), { headers:{ 'content-type':'image/jpeg' } });
  return new Response('nope', { status:404 });
};
const run = async query => { const res = { h:{}, code:0, body:null, loc:null,
  setHeader(k,v){ this.h[k.toLowerCase()] = v; }, status(c){ this.code = c; return this; }, send(b){ this.body = b; return this; },
  redirect(c,l){ this.code = c; this.loc = l; return this; } }; await handler({ query }, res); return res; };

spots[ID] = { id:ID, format:'space', visibility:'shared', habit:'Run <the> "hill"', creator:'nia', city:'Lisbon', photo:'u/p.jpg', clip:null };
let r = await run({ id:ID });
ok(r.code === 200 && /text\/html/.test(r.h['content-type']), 'a shared space: an HTML card');
ok(r.body.includes('<meta property="og:title" content="Run &lt;the&gt; &quot;hill&quot;">') && !r.body.includes('<the>'), 'its Habit is the title, escaped');
ok(r.body.includes('og:image" content="https://www.totehm.space/s/' + ID + '/i"') && r.body.includes('summary_large_image'), 'its image is served by /s/<id>/i, large card');
ok(r.body.includes('by nia · Lisbon') && r.body.includes('location.replace("/?spot=' + ID + '")'), 'description: by + city; the visitor lands on the space at once');
ok(seen.every(x => !x.init.headers || x.init.headers.authorization === 'Bearer ' + x.init.headers.apikey), 'read with the public anon key only (a visitor\'s rights)');
seen = []; r = await run({ id:ID, img:'1' });
ok(r.code === 200 && r.h['content-type'] === 'image/jpeg' && r.body.length === 3 && /s-maxage=3600/.test(r.h['cache-control']), 'the photo is proxied with a fresh signature, cached 1 h');
spots[ID] = { ...spots[ID], photo:null, clip:{ id:'c1', status:'ready' } };
r = await run({ id:ID, img:'1' });
ok(r.code === 200 && r.body.length === 4, 'a Bunny video gives its thumbnail');
spots[ID] = { ...spots[ID], visibility:'private' };
r = await run({ id:ID });
ok(r.body.includes('<meta property="og:title" content="TOTEHM.SPACE">') && !r.body.includes('hill') && r.body.includes('location.replace("/")'), 'a private space: the generic card, nothing of it');
r = await run({ id:ID, img:'1' });
ok(r.code === 302 && r.loc === '/assets/img/totehm_logo.png', 'no image of a private space: the logo');
spots[ID] = { ...spots[ID], visibility:'shared', format:'spot' };
r = await run({ id:ID });
ok(!r.body.includes('hill'), 'a spot (figher.club) is not carded as a space');
r = await run({ id:'../etc' });
ok(r.code === 200 && r.body.includes('TOTEHM.SPACE') && seen.every(x => !x.url.includes('../etc')), 'a malformed id never reaches the base');
if(fails){ console.log(fails + ' FAIL'); process.exit(1); }
