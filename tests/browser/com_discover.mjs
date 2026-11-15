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
    for(const v of [c.color, c.backgroundColor]) if(!/^rgba?\(0, 0, 0(, 0)?\)$/.test(v) && !/^rgba?\((\d+), \1, \1(, 1)?\)$/.test(v)) s.add(v); });
  return [...s]; });

/* ── /monetize : 8 écrans, le curseur COMPTE, le dernier agit ── */
{
  const { pg, log } = await page(browser, { dir:'com', origin:'https://www.totehm.com', session:false, viewport:{ width:390, height:844 } });
  await pg.goto('https://www.totehm.com/monetize');
  await pg.waitForFunction(() => window.__totehm_monetize?.().signed_in === false);
  const d = () => pg.evaluate(() => ({ ...window.__totehm_monetize().discover, on:document.querySelectorAll('.dc-s.is-on').length,
    titre:document.querySelector('.dc-s.is-on .dc-h')?.innerText.trim(), fond:getComputedStyle(document.getElementById('dc')).backgroundColor }));
  let a = await d();
  ok(a.n === 8 && a.i === 0 && a.on === 1 && a.fond === 'rgb(0, 0, 0)' && /^They pay to read how you build\./.test(a.titre), '/monetize : 8 écrans, UN visible, noir → ' + JSON.stringify(a));
  await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(800);
  a = await d(); ok(a.i === 1 && /^You set the price\./.test(a.titre), '↓ : « You set the price. » → ' + JSON.stringify(a));
  await pg.locator('#mz-p').evaluate(e => { e.value = 10000; e.dispatchEvent(new Event('input', { bubbles:true })); });
  ok(/€100\b/.test(await pg.textContent('#mz-price')) && (await d()).i === 1, 'le curseur MET À JOUR le prix et ne change pas d\'écran');
  await pg.locator('#mz-p').focus(); await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(700);
  ok((await d()).i === 1, 'dans le curseur, ↓ reste au curseur (le moteur ne vole pas les touches d\'un champ)');
  await pg.evaluate(() => document.activeElement.blur()); await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(800);
  { const c = +await pg.locator('#mz-p').inputValue(), part = Math.floor(c * 0.8), t = await pg.textContent('#mz-say'), f = n => '€' + (n / 100).toLocaleString('en', { minimumFractionDigits:n % 100 ? 2 : 0, maximumFractionDigits:n % 100 ? 2 : 0 });
    ok(t.includes(f(part)) && t.includes(f(part * 100)) && c < 10000, '« You keep 80%. » : le curseur a bougé d\'un pas (' + f(c) + ') → ' + f(part) + ', 100 lecteurs = ' + f(part * 100) + ' — le calcul, jamais une promesse'); }
  for(let k = 0; k < 6; k++){ await pg.keyboard.press('ArrowDown'); await pg.waitForTimeout(700); }
  a = await d(); ok(a.i === 7 && /Your price\.$/.test(a.titre), 'le dernier écran : « Your TOTEHM. Your readers. Your price. » → ' + JSON.stringify(a));
  ok(await pg.locator('#cta [data-setup]').getAttribute('href') === '/console', '[Set my price] est sous CHAQUE écran, ici le dernier → /console');
  const c = await couleurs(pg); ok(c.length === 0, '60 / 30 / 10 : noir + blanc + gris, AUCUN corail sur un écran sans nom ni art → ' + JSON.stringify(c));
  ok(!erreurs(log).length, '/monetize : aucune erreur ' + erreurs(log).join(' | '));
  await pg.screenshot({ path:OUT + '/monetize_discover.png' });
}
await browser.close();
