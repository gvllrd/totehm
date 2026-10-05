// higher.boutique — la manette (05/10/2026). Zéro réseau.
// LANCER : node boutique_home.mjs /tmp
import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '.';
const browser = await launch();

const CLOTHS = {
  '0.hill':  { found:true, name:'0.Hill', legacy:false, level:'member', view:'habits', created_at:'2026-10-05', palette:['#E24B4A','#378ADD'], text:'Run the hill', is:['fight','focus'], owner:'nia', matter:null },
  '0.full':  { found:true, name:'0.Full', legacy:false, level:'full', view:'objectives', created_at:'2026-10-05', palette:['#639922'], text:'Marathon', is:['love'], owner:'nia', matter:{ habits:[{ text:'Run the hill' }] } },
  '0.lock':  { found:true, name:'0.Lock', legacy:false, level:'locked', view:'wisdom', created_at:'2026-10-05', palette:null, text:null, is:null, owner:null, matter:null },
  '0.old':   { found:true, name:'0.Old', legacy:true, level:'full', message:'I stay higher', created_at:'2026-09-01' },
};
const rpc = {
  luxury_access: { mode:'quote', signed_in:true, thp:true, open:true, price_cents:50000, currency:'eur', admin:false, test_price_cents:null, quotes:[] },
  reveal_cloth: b => CLOTHS[String(b.p_name).toLowerCase()] || { found:false },
};
const tables = { totehm_cloth_support: [{ max_pieces:50, claimed:3 }], profiles: [{ pseudo:'Vallerand' }], subscribers: [] };

// ── 1. Mobile : la croix, le manche, les portes
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc, tables });
  await pg.goto('https://www.higher.boutique/');
  await pg.waitForFunction(() => window.__totehm_boutique && document.querySelector('#member').textContent === 'Vallerand');
  const d0 = await pg.evaluate(() => window.__totehm_boutique());
  ok(d0.build === '2026-10-05-joystick' && d0.view === 'home' && d0.joystick, 'home: joystick, view home');
  ok(d0.luxury_link && d0.streetwear_link && d0.club_links === 2 && d0.logos === 0, 'home: /luxury, /streetwear, 2 club links, 0 logo');
  ok(d0.collab, 'the collaboration in progress is written: Totehm x Champion');
  ok((await pg.textContent('#nav-say')) === 'Play' && /is-dead/.test(await pg.getAttribute('#nav-h','class')) === false, 'center says PLAY, the four arrows live');
  const lay = await pg.evaluate(() => { const j = document.querySelector('#nav').getBoundingClientRect(); return { c: Math.abs((j.left + j.right) / 2 - innerWidth / 2), scroll: document.documentElement.scrollWidth - innerWidth, bottom: innerHeight - j.bottom }; });
  ok(lay.c < 1 && lay.scroll <= 0 && lay.bottom >= 10, 'joystick centered at the bottom, no horizontal scroll');
  await pg.screenshot({ path: OUT + '/bq_home.png' });

  // pousser le manche vers le haut : la porte s'allume avant d'y aller
  const box = await pg.$('#nav-box'); const bb = await box.boundingBox();
  const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
  await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.mouse.move(cx, cy - 30, { steps: 4 });
  ok((await pg.textContent('#nav-say')) === 'Streetwear' && /is-preview/.test(await pg.getAttribute('#door-h','class')), 'drag up: the joystick names STREETWEAR and lights its door');
  await pg.mouse.up();
  await pg.waitForFunction(() => window.__totehm_boutique().view === 'streetwear');
  ok(/50|47 pieces left/.test(await pg.textContent('#sw-stock')) && (await pg.textContent('#nav-say')) === 'Go', 'STREETWEAR: stock from the cloths (47 left), center says GO');
  ok(/Totehm x Champion/.test(await pg.textContent('#v-streetwear')) && /Limited collection/.test(await pg.textContent('#v-streetwear')), 'STREETWEAR: Totehm x Champion · Limited collection');
  await pg.screenshot({ path: OUT + '/bq_streetwear.png' });

  // flèche droite : LUXURY (voisine), le « à partir de » du serveur
  await pg.click('#nav-d');
  await pg.waitForFunction(() => window.__totehm_boutique().view === 'luxury' && /€500/.test(document.querySelector('#lx-from').textContent));
  ok(/on quote · from €500/.test(await pg.textContent('#lx-from')) && /Hermès · Louis Vuitton · Gucci/.test(await pg.textContent('#v-luxury')), 'LUXURY: on quote, from €500 (server), brand names');
  await pg.screenshot({ path: OUT + '/bq_luxury.png' });

  // clavier : bas → DECODE
  await pg.keyboard.press('ArrowDown');
  await pg.waitForFunction(() => window.__totehm_boutique().view === 'decode');
  await pg.fill('#dc-in', '0.hill'); await pg.keyboard.press('Enter');
  await pg.waitForSelector('#dc-card:not(.hide)');
  const d1 = await pg.evaluate(() => window.__totehm_boutique());
  ok(d1.decode.level === 'member' && /Run the hill/.test(await pg.textContent('#dc-card')) && /Fight/.test(await pg.textContent('#dc-card')), 'DECODE member: the box text and its intentions');
  await pg.waitForTimeout(600);
  const dot = await pg.evaluate(() => getComputedStyle(document.querySelector('#nav-stack .o')).backgroundColor);
  ok(dot === 'rgb(226, 75, 74)', 'the joystick takes the palette of the decoded cloth (' + dot + ')');
  await pg.screenshot({ path: OUT + '/bq_decode.png' });
  await pg.fill('#dc-in', '0.lock'); await pg.click('#nav-box');
  await pg.waitForFunction(() => window.__totehm_boutique().decode?.level === 'locked');
  ok(!/Run the hill|Marathon/.test(await pg.textContent('#dc-card')) && /FIGHER/.test(await pg.textContent('#dc-card')), 'DECODE locked: view and date only, the door to FIGHER (center tap decodes)');
  await pg.fill('#dc-in', '0.full'); await pg.keyboard.press('Enter');
  await pg.waitForFunction(() => window.__totehm_boutique().decode?.level === 'full');
  ok(/Marathon/.test(await pg.textContent('#dc-card')) && /Run the hill/.test(await pg.textContent('#dc-card')), 'DECODE full: + the matter');
  await pg.fill('#dc-in', '0.old'); await pg.keyboard.press('Enter');
  await pg.waitForFunction(() => /I stay higher/.test(document.querySelector('#dc-card').textContent));
  ok(true, 'DECODE legacy: the public message stays');
  await pg.fill('#dc-in', '0.none'); await pg.keyboard.press('Enter');
  await pg.waitForFunction(() => /no Totehm Cloth/.test(document.querySelector('#dc-note').textContent));
  ok(await pg.isHidden('#dc-card'), 'DECODE unknown: said, no card');

  // gauche : NEWS
  await pg.click('#nav-g');
  await pg.waitForFunction(() => window.__totehm_boutique().view === 'news');
  await pg.click('#nav-box');
  ok(/your email first/.test(await pg.textContent('#nw-note')), 'NEWS: center tap without email asks for it');
  await pg.fill('#nw-in', 'Fan@Example.test'); await pg.keyboard.press('Enter');
  await pg.waitForFunction(() => window.__totehm_boutique().news);
  ok(/you're in/.test(await pg.textContent('#nw-note')), 'NEWS: one line in subscribers');
  // retour au centre : la direction opposée
  await pg.click('#nav-d');
  await pg.waitForFunction(() => window.__totehm_boutique().view === 'home');
  ok(true, 'NEWS → right → back to HIGHER');
  const subs = log.other.filter(x => /^rpc:/.test(x));
  ok(!subs.length, 'no unknown RPC: ' + subs.join(','));
  ok(!log.errors.length, 'no page error: ' + log.errors.join(' | '));
  await pg.context().close();
}

// ── 2. Arrivée sur /#luxury, invité, ordinateur
{
  const { pg, log } = await page(browser, { dir:'boutique', origin:'https://www.higher.boutique', rpc:{ ...rpc, luxury_access:{ ...rpc.luxury_access, signed_in:false, thp:false } }, tables, session:false, viewport:{ width:1280, height:800 } });
  await pg.goto('https://www.higher.boutique/#luxury');
  await pg.waitForFunction(() => window.__totehm_boutique && window.__totehm_boutique().view === 'luxury');
  ok((await pg.textContent('#member')) === 'CONNECT WITH MY TOTEHM', 'guest: CONNECT WITH MY TOTEHM, the doors still open');
  await pg.click('#member');
  await pg.waitForTimeout(400);
  ok(await pg.isVisible('#m-signin') && /Simple terms of use/.test(await pg.evaluate(() => document.querySelector('#menu').lastElementChild.textContent)), 'menu: Sign in with TOTEHM, terms last');
  await pg.keyboard.press('Escape');
  await pg.screenshot({ path: OUT + '/bq_desktop_luxury.png' });
  ok(!log.errors.length, 'desktop: no page error ' + log.errors.join(' | '));
  await pg.context().close();
}
await browser.close();
