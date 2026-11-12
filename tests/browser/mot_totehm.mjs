// 12/11 — LE MOT TOTEHM EST LE TOTEHM (Wah). On teste LA SOURCE (`tools/totehm_word.*` + la nomenclature
// `tools/totehm_name.js`), celle qui est copiée dans les pages des quatre domaines : une page minimale, des
// textes, et on vérifie ce qui ne doit JAMAIS casser — le texte du document, les adresses, ce que le membre
// a écrit, et la rotation. Zéro réseau, zéro compte.
import fs from 'node:fs';
import { launch } from './harness.mjs';
const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const lire = f => fs.readFileSync(ROOT + '/' + f, 'utf8');
let ko = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ko++; };

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#000;color:#fff;font:400 16px/1.6 sans-serif}
${lire('tools/totehm_word.css')}
</style></head><body>
<p id="p1">MY TOTEHM is the TOTEHM. Open my TOTEHM.</p>
<p id="p2">Go to www.totehm.com or totehm.space — and TOTEHMIZE it, with totehm-link.</p>
<p id="p3">A spot is your TOTEHM Habit in action: exact place, exact time, right people, your conditions.</p>
<p id="p4" contenteditable="plaintext-only">my own TOTEHM words</p>
<p id="p5"><span class="v-name">my TOTEHM habit</span></p>
<p id="p6">totehm at the end of a sentence: TOTEHM.</p>
<h1 id="p7">TOTEHM</h1>
<button class="mc is-in"><span id="member-txt">wah</span></button>
<!-- deconnecte, member-txt porte le LIBELLE du bouton : sans is-in, aucun nom n'est lu -->
<script>${lire('tools/totehm_name.js')}</script>
<script>${lire('tools/totehm_word.js')}</script>
</body></html>`;

const browser = await launch();
const pg = await (await browser.newContext({ viewport:{ width:390, height:844 } })).newPage();
const erreurs = [];
pg.on('pageerror', e => erreurs.push(String(e && e.message || e)));
pg.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
await pg.setContent(PAGE);
await pg.waitForTimeout(700);

const d = await pg.evaluate(() => {
  const t = id => document.getElementById(id).textContent;
  const n = id => document.getElementById(id).querySelectorAll('.tw').length;
  return { etat:window.__totehm_mot(),
    t1:t('p1'), n1:n('p1'), t2:t('p2'), n2:n('p2'), t3:t('p3'), n3:n('p3'),
    n4:n('p4'), n5:n('p5'), t6:t('p6'), n6:n('p6'), n7:n('p7'),
    lettres:document.querySelector('#p1 .tw .tw-b').querySelectorAll('.tn-l[data-c]').length,
    texteDos:document.querySelector('#p1 .tw .tw-b').textContent,
    mot:document.querySelector('#p1 .tw .tw-s').textContent,
    cache:getComputedStyle(document.querySelector('#p1 .tw .tw-s')).clipPath,
    cote:Math.round(document.querySelector('#p1 .tw').getBoundingClientRect().width),
    grand:Math.round(document.querySelector('#p7 .tw').getBoundingClientRect().width),
    th0:getComputedStyle(document.documentElement).getPropertyValue('--tw-th').trim() };
});

ok(d.t1 === 'MY TOTEHM is the TOTEHM. Open my TOTEHM.' && d.n1 === 3,
   'trois fois le mot = trois pièces, et le TEXTE du document est intact : « ' + d.t1 + ' »');
ok(d.n2 === 0 && d.t2.includes('www.totehm.com') && d.t2.includes('TOTEHMIZE'),
   'une ADRESSE (totehm.com, totehm.space), un mot qui continue (TOTEHMIZE) et totehm-link : jamais touchés');
ok(d.n3 === 1 && d.t3 === 'A spot is your TOTEHM Habit in action: exact place, exact time, right people, your conditions.',
   'la définition d\'un spot garde son texte au caractère près, avec sa pièce');
ok(d.n4 === 0, 'ce qu\'on ÉCRIT (contenteditable) n\'est jamais transformé');
ok(d.n5 === 0, 'ce que le membre a écrit dans une box (`.v-name`) n\'est jamais transformé');
ok(d.n6 === 2 && d.t6 === 'totehm at the end of a sentence: TOTEHM.',
   'un point de PHRASE ne fait pas une adresse : « totehm » et « TOTEHM. » deviennent la pièce');
ok(d.n7 === 1, 'un titre qui n\'est QUE le mot devient la pièce');
ok(d.lettres === 3 && d.texteDos === '' && d.mot === 'TOTEHM',
   'le verso porte le nom en ' + d.lettres + ' lettres de CSS (`data-c`), donc rien dans le textContent ; le mot est là, hors écran');
ok(/inset/.test(d.cache), 'le mot est hors écran (clip-path) : lu à la voix, trouvé au clavier, jamais vu');
ok(d.cote >= 16 && d.cote <= 20 && d.grand > d.cote * 1.6,
   'la taille suit le texte : ' + d.cote + ' px dans un paragraphe de 16 px, ' + d.grand + ' px dans le titre');
ok(d.etat.mots === 7 && d.etat.pieces === 7 && d.etat.nom === 'wah', 'diagnostic : ' + JSON.stringify(d.etat));

await pg.waitForTimeout(500);
const th1 = await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tw-th').trim());
ok(parseFloat(th1) !== parseFloat(d.th0) && /deg$/.test(th1),
   'UNE seule rotation pour toute la page : l\'angle de `:root` avance (' + d.th0 + ' → ' + th1 + ')');

/* le nom change : les versos suivent, sans refaire les pièces */
await pg.evaluate(() => { document.getElementById('member-txt').textContent = 'alexandra'; });
await pg.waitForTimeout(400);
const apres = await pg.evaluate(() => ({ nom:window.__totehm_mot().nom,
  lettres:document.querySelector('#p1 .tw .tw-b').querySelectorAll('.tn-l[data-c]').length,
  pieces:document.querySelectorAll('.tw').length,
  vides:document.querySelector('#p1 .tw .tw-b').querySelectorAll('.tn-v').length }));
ok(apres.nom === 'alexandra' && apres.lettres === 9 && apres.pieces === 7,
   'le nom change : les 7 versos se refont (9 lettres), aucune pièce de plus — ' + JSON.stringify(apres));

/* 12/11, mesuré en production : DÉCONNECTÉ, le coin membre porte « CONNECT WITH MY TOTEHM » dans le
   même `#member-txt` — ce n'est pas un nom, et le verso ne doit pas l'afficher. */
const pg3 = await (await browser.newContext({ viewport:{ width:390, height:844 } })).newPage();
await pg3.setContent(PAGE.replace('class="mc is-in"', 'class="mc"').replace('>wah<', '>CONNECT WITH MY TOTEHM<'));
await pg3.waitForTimeout(600);
const hors = await pg3.evaluate(() => ({ nom:window.__totehm_mot().nom, tourne:window.__totehm_mot().tourne,
  plat:document.querySelector('#p1 .tw').classList.contains('is-plat'),
  lettres:document.querySelectorAll('#p1 .tw .tn-l').length }));
ok(hors.nom === '' && !hors.tourne && hors.plat && !hors.lettres,
   'déconnecté : aucun nom lu (le libellé du bouton n\'en est pas un), la pièce est posée sur son logo et ne tourne pas');

/* mouvement réduit : la pièce est POSÉE sur son verso, le nom lisible */
const pg2 = await (await browser.newContext({ viewport:{ width:390, height:844 }, reducedMotion:'reduce' })).newPage();
await pg2.setContent(PAGE); await pg2.waitForTimeout(600);
const rm = await pg2.evaluate(() => ({ tourne:window.__totehm_mot().tourne,
  tf:getComputedStyle(document.querySelector('#p1 .tw .tw-p')).transform }));
ok(!rm.tourne && rm.tf !== 'none', 'mouvement réduit : aucune boucle, la pièce est posée sur son verso');

ok(!erreurs.length, 'aucune erreur' + (erreurs.length ? ' → ' + erreurs.join(' | ') : ''));
await browser.close();
console.log(ko ? '\n' + ko + ' ÉCHEC(S)' : '\nTOUT PASSE');
process.exit(ko ? 1 : 0);
