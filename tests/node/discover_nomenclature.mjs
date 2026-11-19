// LA NOMENCLATURE DISCOVER — Wah, 19/11 : « une nomenclature discovery : dès que je change le design de la
// nomenclature, ça change sur tous les discovery ». Tout le dessin d'un Discover vit dans `tools/discover.css` et
// `tools/discover.js`, recopiés tels quels dans chaque page (`python3 tools/recopier.py`). Ce test REFUSE :
//   1 · une page qui monte un Discover (`TOTEHM_DISCOVER.monter`, des écrans `.dc-s`) sans porter le bloc EXACT ;
//   2 · une page qui REDESSINE une classe de la nomenclature : une règle dont le DERNIER sélecteur n'est fait que de
//       classes du bloc (`.dc-h`, `.dc-btn`, `.dc-s`, `.dc-ill-in`… — la liste se lit dans le bloc lui-même), seules ou
//       avec un état (`.is-…`, `:hover`). Habiller son CONTENU reste permis : `.dc .paper`, `.dc-slot .u-grid`,
//       `#lvd .dc-ill-in:has(.dc-slogan)`.
// Une variante utile à plusieurs pages ENTRE dans le bloc (comme `is-illustre`, `is-libre`, `.dc-who`) ; elle ne vit
// jamais dans une page.
// LANCER : node tests/node/discover_nomenclature.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lire = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const CSS = lire('tools/discover.css').replace(/\n+$/, ''), JS = lire('tools/discover.js').replace(/\n+$/, '');
const sansCommentaires = t => t.replace(/\/\*[\s\S]*?\*\//g, '');
// LE CŒUR : toutes les classes que le bloc définit.
const COEUR = new Set(sansCommentaires(CSS).match(/\.dc(?:-[\w-]+)?\b/g));
// Un homonyme ancien : le point de connexion du coin membre s'appelle aussi `.dc` (il n'est pas un Discover).
const HOMONYMES = [/#conn-bar\s*>?\s*\.dc\b/];
// Les autres blocs copiés de `tools/` et le survol généré ne sont pas la page : on les retire avant de lire.
const BLOCS = fs.readdirSync(path.join(ROOT, 'tools')).filter(f => /\.(css|js)$/.test(f))
  .map(f => lire('tools/' + f).replace(/\n+$/, ''));
const SURVOL = /\/\* ══ SURVOL — BLOC GÉNÉRÉ[\s\S]*?\/\* ══ FIN DU BLOC GÉNÉRÉ ══ \*\//g;

function dernierCompose(sel){
  let prof = 0, debut = 0;
  for(let i = 0; i < sel.length; i++){
    const c = sel[i];
    if(c === '(') prof++; else if(c === ')') prof--;
    else if(prof === 0 && /[\s>+~]/.test(c)) debut = i + 1;
  }
  return sel.slice(debut).trim();
}
function redessine(sel){
  if(HOMONYMES.some(r => r.test(sel))) return false;
  const c = dernierCompose(sel);
  if(!c || /:has\(/.test(c)) return false;                       // un :has(…) dit un CONTENU
  const nu = c.replace(/::?[\w-]+(\([^)]*\))?/g, '');             // les états et pseudo-éléments ne changent rien
  const classes = nu.match(/\.[\w-]+/g) || [];
  if(!classes.some(k => COEUR.has(k))) return false;
  return classes.every(k => COEUR.has(k) || /^\.is-/.test(k));
}

const fautes = [], porteurs = [];
for(const site of ['com', 'club', 'boutique', 'space']){
  for(const f of fs.readdirSync(path.join(ROOT, site)).filter(f => f.endsWith('.html'))){
    const rel = site + '/' + f, html = lire(rel);
    if(!/TOTEHM_DISCOVER\.monter|class="[^"]*\bdc-s\b/.test(html)) continue;
    porteurs.push(rel);
    if(!html.includes(CSS)) fautes.push(`${rel} : le bloc tools/discover.css n'y est pas EXACT (python3 tools/recopier.py)`);
    if(!html.includes(JS)) fautes.push(`${rel} : le bloc tools/discover.js n'y est pas EXACT (python3 tools/recopier.py)`);
    let page = html;
    for(const b of BLOCS) page = page.split(b).join('');
    page = page.replace(SURVOL, '');
    const css = sansCommentaires([...page.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n'))
      .replace(/@media[^{]*\{/g, '');                              // une règle sous @media reste une règle
    for(const m of css.matchAll(/([^{}]+)\{[^{}]*\}/g)){
      for(const sel of m[1].split(/,(?![^(]*\))/).map(s => s.trim()).filter(Boolean)){
        if(redessine(sel)) fautes.push(`${rel} : « ${sel} » redessine la nomenclature — le changer dans tools/discover.css`);
      }
    }
  }
}
for(const l of fautes) console.log('FAIL ' + l);
console.log(`NOMENCLATURE DISCOVER · ${porteurs.length} pages (${porteurs.join(', ')}) · ${COEUR.size} classes · FAIL=${fautes.length ? '{' + fautes.length + '}' : '{}'}`);
process.exitCode = fautes.length ? 1 : 0;
