// 15/11 — DISCOVER : le moteur copié (jamais importé) dans chaque page, une idée par écran noir, 60 / 30 / 10.
import { readFileSync } from 'node:fs';
import { launch, page, ok } from './harness.mjs';
const OUT = process.argv[2] || '.';
const browser = await launch();
const norm = s => s.replace(/\r/g, '');
const JS = norm(readFileSync('../../tools/discover.js', 'utf8')).trim(), CSS = norm(readFileSync('../../tools/discover.css', 'utf8')).trim();
for(const f of ['creator', 'monetize']){
  const h = norm(readFileSync('../../com/' + f + '.html', 'utf8'));
  ok(h.includes(JS), f + ' : le moteur est la copie EXACTE de tools/discover.js');
  ok(h.includes(CSS), f + ' : le style est la copie EXACTE de tools/discover.css');
}
const erreurs = log => log.errors.filter(e => !/404|Failed to load resource/i.test(e));
const couleurs = pg => pg.evaluate(() => { const s = new Set();
  document.querySelectorAll('.dc-s.is-on *').forEach(e => { if(!e.offsetWidth) return; const c = getComputedStyle(e);
    /* une COULEUR = un écart de plus de 24 entre canaux (la même règle que com_accueil_discover) : les gris légèrement bleutés
       de la marque (#9a9aa2, #bdbdc4) restent des gris */
    for(const v of [c.color, c.backgroundColor]){ const m = v.match(/\d+(\.\d+)?/g); if(!m || (m[3] !== undefined && +m[3] === 0)) continue;
      const [r, g, b] = m.map(Number); if(Math.max(r, g, b) - Math.min(r, g, b) > 24) s.add(v); } });
  return [...s]; });

/* ── /monetize : 18/11 (Wah : « ça c'est le Discover qui va dans la section [Monetize my TOTEHM] ») — SON texte, mot pour
   mot, cinq écrans ; [Set my price] sous chacun ── */
{
  const { pg, log } = await page(browser, { dir:'com', origin:'https://www.totehm.com', session:false, viewport:{ width:390, height:844 } });
  await pg.goto('https://www.totehm.com/monetize');
  await pg.waitForFunction(() => window.__totehm_monetize?.().signed_in === false);
  const d = () => pg.evaluate(() => ({ ...window.__totehm_monetize().discover, on:document.querySelectorAll('.dc-s.is-on').length,
    titre:document.querySelector('.dc-s.is-on .dc-h')?.textContent.trim(), fond:getComputedStyle(document.getElementById('dc')).backgroundColor }));
  let a = await d();
  ok(a.n === 5 && a.i === 0 && a.on === 1 && a.fond === 'rgb(0, 0, 0)' && /^Monetize your operating system\./.test(a.titre), '/monetize : 5 écrans, UN visible, noir → ' + JSON.stringify(a));
  await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(800);
  a = await d(); ok(a.i === 1 && /^Your living autobiography, fully protected\./.test(a.titre), '↓ : « Your living autobiography, fully protected. » → ' + JSON.stringify(a));
  const t = await pg.textContent('#offer');
  ok(/You set the annual price\. You keep 80%\./.test(t) && /whatever you keep private stays strictly private/.test(t)
     && /unlocks automatically when you open your system to your subscribers/.test(t) && /They pay to access your practice, not your calendar\./.test(t)
     && /Stop anytime; your system, your rules\./.test(t), '18/11 · le texte de Wah, mot pour mot');
  for(let k = 0; k < 3; k++){ await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(700); }
  a = await d(); ok(a.i === 4 && /^Predictable, clean revenue\./.test(a.titre), 'le dernier écran : « Predictable, clean revenue. » → ' + JSON.stringify(a));
  ok(await pg.locator('#cta [data-setup]').getAttribute('href') === '/console', '[Set my price] est sous CHAQUE écran, ici le dernier → /console');
  const c = await couleurs(pg); ok(c.length === 0, '60 / 30 / 10 : noir + blanc + gris, AUCUN corail sur un écran sans nom ni art → ' + JSON.stringify(c));
  ok(!erreurs(log).length, '/monetize : aucune erreur ' + erreurs(log).join(' | '));
  await pg.screenshot({ path:OUT + '/monetize_discover.png' });
}
await browser.close();
