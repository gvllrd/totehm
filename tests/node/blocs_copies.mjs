// Les blocs communs de `tools/` sont COPIÉS dans les pages, jamais importés : une copie qui dérive, c'est deux sites qui
// ne se ressemblent plus (16/11 : le coin membre avait changé à la source sans suivre sur totehm.com ni figher.club).
// Ce test tient totehm.com et figher.club — la même pièce, le même code à six chiffres, le même Discover, mot pour mot.
// LANCER : node tests/node/blocs_copies.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let sortie = '', code = 0;
try { sortie = execFileSync('python3', [path.join(racine, 'tools/recopier.py'), '--check', 'com', 'club'], { encoding:'utf8' }); }
catch (e) { sortie = String(e.stdout || e.message); code = e.status || 1; }
const m = sortie.match(/^(\d+) copies dans les pages · 0 réécrites · (\d+) écart/);
console.log(sortie.trim());
if (code !== 0 || !m || +m[2] !== 0 || +m[1] < 40) { console.log('FAIL les copies de tools/ dans com/ et club/ sont exactes'); process.exit(1); }
console.log('PASS ' + m[1] + ' copies de tools/ dans com/ et club/, toutes exactes');
