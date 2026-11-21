// LE VOCABULAIRE — Wah, 19/11/2026 : « Il faut simplement que les mots que j'utilise (le frontend actuel)
// reflètent le backend… le code et le backend. » UN MOT = UNE CHOSE, à l'écran, dans le code, dans la base :
//
//     habit · objective · repulsion · vision · story      (et TOTEHM, media, spot, deadline)
//
// Les anciens noms partent lot par lot : `wisdom`/`teaching` (→ story), `trip` (→ objective), `steps`
// (→ habits), `reps` (→ repulsions). Ce test est un CLIQUET : pour chaque fichier, le nombre d'anciens
// mots ne peut que BAISSER. Un lot qui en retire abaisse son plafond ici ; un lot qui en ajoute ÉCHOUE —
// on écrit le mot de Wah, jamais l'ancien. Un PONT (l'ancien nom gardé le temps qu'un lecteur suive, marqué
// « pont » dans le code) compte aussi : il disparaît avec le pont, et le plafond descend.
// LANCER : node tests/node/vocabulaire.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ANCIENS = {
  story:     /\b(wisdom\w*|teach|teaching|teachings|TEACH|teachOf\w*|repsOfTeach|vueTeaching|repulsion_teaching\w*|teaching_\w+)\b/g,
  objective: /\b(trip|trips|TRIPS|tripOf|tripsLoaded|loadTrips|tripsOfHab|habsOfTrip|my_trips)\b/g,
  habit:     /\bsteps\b/g,
  repulsion: /\b(REPS|reps)\b/g,
};
const DOSSIERS = ['com', 'club', 'boutique', 'tools', 'backend/supabase/functions'];
const CODE = /\.(html|mjs|js|ts|css)$/;

// Les plafonds du 19/11, après les lots STORY, OBJECTIVE, HABITS de com/ et le lot de la boutique (le reste attend son
// lot : fonctions d'argent, connecteur, bot). Ils ne remontent JAMAIS.
const PLAFONDS = {
  'com/console.html': { habit: 1 },
  'com/totehm-link.mjs': { story: 2 },                       // pont : les liens `wisdom` déjà envoyés
  'com/totehm.html': { story: 15 },                           // objective, repulsion, habit : 0 depuis le 19/11
  'boutique/index.html': { story: 2 },                        // ponts : la base dit encore `wisdom`
  'boutique/luxury.html': { story: 6 },                        // ponts : luxury-quote, _box_matter, projets déposés
  'boutique/streetwear.html': { story: 7 },                    // ponts : create-checkout, _box_matter, liens d'avant
  'backend/supabase/functions/_shared/chatgpt-boutique.ts': { objective: 1 },
  'backend/supabase/functions/_shared/chatgpt-context.ts': { story: 29, habit: 11 },
  'backend/supabase/functions/_shared/chatgpt-ecosystem.ts': { story: 11, objective: 1, habit: 2, repulsion: 5 },
  'backend/supabase/functions/_shared/chatgpt-server.ts': { story: 1 },
  'backend/supabase/functions/_shared/higher-gpt.ts': { story: 1, habit: 1 },
  'backend/supabase/functions/_shared/tracking-tick.ts': { habit: 5 },
  'backend/supabase/functions/bot-reply/index.ts': { story: 5, habit: 5 },
  'backend/supabase/functions/create-checkout/index.ts': { story: 1 },
  'backend/supabase/functions/higher-checkout/index.ts': { habit: 1 },
  'backend/supabase/functions/higher-map/index.ts': { habit: 4 },
  'backend/supabase/functions/luxury-quote/index.ts': { story: 1 },
  'backend/supabase/functions/stoner-gate/index.ts': { habit: 1 },
  'backend/supabase/functions/stripe-webhook/index.ts': { habit: 1 },
};

const trop = [], plusBas = [];
let fichiers = 0;
for (const dossier of DOSSIERS) {
  for (const f of fs.readdirSync(path.join(ROOT, dossier), { recursive: true })) {
    const rel = path.join(dossier, String(f)).split(path.sep).join('/');
    if (!CODE.test(rel) || rel.includes('/vendor/') || rel.includes('node_modules')) continue;
    fichiers++;
    const texte = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const [mot, re] of Object.entries(ANCIENS)) {
      const n = (texte.match(re) || []).length, max = PLAFONDS[rel]?.[mot] ?? 0;
      if (n > max) trop.push(`${rel} : ${n} ancien(s) nom(s) de « ${mot} » (plafond ${max}) → ${[...new Set(texte.match(re))].join(', ')}`);
      else if (n < max) plusBas.push(`${rel} · ${mot} : ${n} (plafond ${max}) — abaisser le plafond dans tests/node/vocabulaire.mjs`);
    }
  }
}
for (const l of plusBas) console.log('PLUS BAS ' + l);
for (const l of trop) console.log('FAIL ' + l);
console.log(`VOCABULAIRE · ${fichiers} fichiers · FAIL=${trop.length ? '{' + trop.length + '}' : '{}'}`);
process.exitCode = trop.length ? 1 : 0;
