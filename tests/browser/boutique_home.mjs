// higher.boutique — la page d'atterrissage et la page d'un Cloth décodé (08/10/2026). Zéro réseau.
// LANCER : node boutique_home.mjs /tmp
import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '.';
const browser = await launch();
const CLOTHS = {
  '0.hill': { found:true, name:'0.Hill', legacy:false, level:'member', line:'streetwear', view:'habits', created_at:'2026-10-05', palette:['#E24B4A'], text:'Run the hill',
              is:['fight'], owner:'nia', matter:null, garment:'Higher Champion Sweatshirt', size:'L', style:'Ink Realism', stage:'making', edition:3, edition_of:177, art:false },
  '0.lock': { found:true, name:'0.Lock', legacy:false, level:'locked', line:'streetwear', view:'wisdom', created_at:'2026-10-05', palette:null, text:null, is:null, owner:null, matter:null,
              garment:'Higher Champion Sweatshirt', size:null, style:'Ink Realism', stage:'production', edition:1, edition_of:177, art:false },
  '0.old':  { found:true, name:'0.Old', legacy:true, level:'full', message:'I stay higher', created_at:'2026-09-01' },
  '0.sea':  { found:true, name:'0.Sea', legacy:false, level:'full', line:'streetwear', view:'visions', created_at:'2026-10-06', palette:['#1D9E75'], text:'A studio by the sea',
              is:['express'], owner:'wah', matter:{ objectives:[{ text:'Save 10k' }] }, garment:'Higher Champion Sweatshirt', size:'M', style:'Analog Grain', stage:'shipped', edition:2, edition_of:177, art:true, mine:true },
};
const rpc = { reveal_cloth: b => CLOTHS[String(b.p_name).toLowerCase()] || { found:false } };
const tables = { totehm_cloth_support: [{ max_pieces:50, claimed:3 }], profiles: [{ pseudo:'Vallerand' }], subscribers: [] };
const ART = [];
const functions = { 'cloth-art': b => { ART.push(b.name); return { url:'https://abujjbkbbiumxrokozph.supabase.co/storage/v1/object/sign/streetwear-generations/x/final.png?token=t' }; } };
const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, functions, session:false });
await pg.goto('https://www.higher.boutique/');
await pg.waitForFunction(() => window.__totehm_boutique && /47 pieces left/.test(document.querySelector('#sw-col-sold').textContent));
const d = await pg.evaluate(() => window.__totehm_boutique());
ok(d.build === '2026-10-08-decode' && !d.joystick, 'the landing page, no joystick');
ok(d.collab && d.logos === 0 && d.luxury_link, 'Totehm x Champion 2026 under Create, written, no logo');
ok(d.branding_com && d.club_links === 0, 'Experience our dope branding → totehm.com');
const order = await pg.evaluate(() => { const a = document.querySelector('a[href="streetwear.html"]').getBoundingClientRect().top, c = document.querySelector('#collab').getBoundingClientRect().top, l = document.querySelector('a[href="/luxury"]').getBoundingClientRect().top; return a < c && c < l; });
ok(order, 'the collection sits under [Create my Totehm Streetwear Cloth], above Luxury');
await pg.screenshot({ path: OUT + '/bq_landing.png' });
await pg.click('#decode-btn');
for(const [name, re, lvl] of [['0.hill', /Run the hill/, 'member'], ['0.lock', /FIGHER/, 'locked'], ['0.old', /I stay higher/, 'full']]){
  await pg.fill('#decode-input', name); await pg.press('#decode-input', 'Enter');
  await pg.waitForFunction(n => document.querySelector('#decode-fs').classList.contains('show') && window.__totehm_boutique().decode, name);
  ok(re.test(await pg.textContent('#decode-msg')) && (await pg.evaluate(() => window.__totehm_boutique().decode.level)) === lvl, 'decode ' + lvl + ': reveal_cloth');
  if(lvl === 'member'){
    const t = await pg.evaluate(() => { const k = [...document.querySelector('#decode-msg').children].map(e => e.className);
      const el = document.querySelector('.dc-el').getBoundingClientRect(), nm = document.querySelector('.dc-name').getBoundingClientRect();
      return { order:k.join(','), wide: el.width >= nm.width, bg: getComputedStyle(document.querySelector('.dc-el')).backgroundColor }; });
    ok(t.order.startsWith('dc-name,dc-meta,dc-el') && t.wide && /51, 51, 102/.test(t.bg), 'the element comes first, full width, in its view colour (habit navy)');
    const txt = await pg.textContent('#decode-msg');
    ok(/No\. 3 \/ 177/.test(txt) && /Higher Champion Sweatshirt · L/.test(txt) && /Ink Realism/.test(txt) && /in the making/i.test(txt) && /nia/.test(txt), 'every detail: edition, cloth, size, style, owner, stage');
    ok(/lands with the cloth/.test(txt) && !ART.length, 'not shipped: the artwork stays a surprise, cloth-art not called');
    ok(/decode=0\.Hill/.test(pg.url()), 'the address follows the decoded cloth (shareable)');
    ok(!/\bbox\b/i.test(txt), 'on screen: "element", never "box"');
    await pg.screenshot({ path: OUT + '/bq_decode_member.png' });
  }
  if(lvl === 'locked'){
    ok(!/Run the hill/.test(await pg.textContent('#decode-msg')) && await pg.isVisible('#decode-msg [data-eco-connect]'), 'decode locked: no element text, CONNECT WITH MY TOTEHM');
    ok(/in production/i.test(await pg.textContent('#decode-msg')) && /my wisdom/i.test(await pg.textContent('.dc-el')), 'locked still says the view, the cloth and the stage');
  }
  await pg.click('#decode-back');
  ok(!/decode=/.test(pg.url()), 'Back in Time clears the address');
}
await pg.fill('#decode-input', '0.none'); await pg.press('#decode-input', 'Enter');
await pg.waitForFunction(() => /no Totehm Cloth/.test(document.querySelector('#decode-note').textContent));
ok(true, 'decode unknown: said');
ok(!log.errors.length, 'no page error: ' + log.errors.join(' | '));

// Le lien direct d'une pièce expédiée : la page s'ouvre, l'œuvre se montre.
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables, functions, session:false });
  await pg.goto('https://www.higher.boutique/?decode=0.sea');
  await pg.waitForFunction(() => document.querySelector('#decode-fs').classList.contains('show') && document.querySelector('#dc-art img'));
  const txt = await pg.textContent('#decode-msg');
  ok(ART.includes('0.Sea') && /A studio by the sea/.test(txt) && /Save 10k/.test(txt) && /shipped/i.test(txt), 'shipped: the artwork shows (cloth-art), with the element, its matter and the stage');
  ok(/36, 49, 140|54, 73, 140/.test(await pg.evaluate(() => getComputedStyle(document.querySelector('.dc-el')).backgroundColor)), 'a vision wears light blue');
  ok(!log.errors.length, 'deep link: no page error ' + log.errors.join(' | '));
  await pg.screenshot({ path: OUT + '/bq_decode_shipped.png', fullPage:true });
}
await browser.close();
