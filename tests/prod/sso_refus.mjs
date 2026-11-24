// Le passage SSO refuse ce qu'il doit refuser — en PRODUCTION.
// Jamais un jeton n'est délivré : chaque essai doit échouer.
//   node tests/prod/sso_refus.mjs seed  → imprime l'INSERT à passer (execute_sql)
//   node tests/prod/sso_refus.mjs run   → les cinq refus attendus
// Le code de test vise `space`, porte un défi PKCE, et vit 5 minutes.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
const R = new URL('../../', import.meta.url);
const ETAT = '/tmp/totehm_sso_refus.json';
const b64u = b => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const mode = process.argv[2];

if (mode === 'seed') {
  const verifier = b64u(randomBytes(32));
  const codes = [randomBytes(32).toString('hex'), randomBytes(32).toString('hex')];
  writeFileSync(ETAT, JSON.stringify({ code: codes[0], code2: codes[1], verifier }));
  const defi = b64u(createHash('sha256').update(verifier).digest());
  for (const c of codes) console.log(`insert into sso_handoff (code_hash,user_id,target,code_challenge,expires_at)
select '${createHash('sha256').update(c).digest('hex')}', id, 'space', '${defi}', now() + interval '5 minutes' from auth.users order by created_at limit 1;`);
  process.exit(0);
}

const { code, code2, verifier } = JSON.parse(readFileSync(ETAT, 'utf8'));
const anon = readFileSync(new URL('tools/sso_snippet.js', R), 'utf8').match(/SB_ANON = '([^']+)'/)[1];
const FN = 'https://abujjbkbbiumxrokozph.supabase.co/functions/v1/sso-redeem';
const SPACE = 'https://www.totehm.space';
const essai = async (origin, corps) => {
  const r = await fetch(FN, { method: 'POST', headers: { origin, 'content-type': 'application/json', apikey: anon, authorization: 'Bearer ' + anon }, body: JSON.stringify(corps) });
  const j = await r.json().catch(() => ({}));
  if (j.token_hash) throw new Error('JETON DÉLIVRÉ — faille');
  return r.status;
};
let ko = 0;
const attend = (nom, eu, voulu) => { console.log(`${eu === voulu ? 'ok  ' : 'KO  '}${nom} : ${eu} (attendu ${voulu})`); if (eu !== voulu) ko++; };
attend('code inventé', await essai(SPACE, { code: randomBytes(32).toString('hex'), verifier }), 401);
attend('mauvais verifier', await essai(SPACE, { code, verifier: b64u(randomBytes(32)) }), 401);
attend('bon verifier, autre domaine (boutique)', await essai('https://www.higher.boutique', { code, verifier }), 403);
attend('bon verifier, machine locale (localhost)', await essai('http://localhost:3000', { code: code2, verifier }), 403);
attend('rejeu du même code, bon domaine', await essai(SPACE, { code, verifier }), 401);
process.exit(ko ? 1 : 0);
