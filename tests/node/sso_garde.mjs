// Le passage SSO garde ses trois verrous de configuration.
// 1. Aucune origine localhost dans la liste de production.
// 2. /auth (la page qui délivre les codes) porte une CSP stricte.
// 3. L'empreinte du script de com/auth.html est celle que la CSP autorise :
//    toucher au script sans mettre la CSP à jour tuerait la connexion.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const R = new URL('../../', import.meta.url);
const lire = p => readFileSync(new URL(p, R), 'utf8');
let ko = 0;
const ok = (c, m) => { console.log((c ? 'ok  ' : 'KO  ') + m); if (!c) ko++; };

ok(!/localhost/.test(lire('backend/supabase/functions/_shared/origins.ts')), 'origins.ts : aucun localhost');

const html = lire('com/auth.html');
const scripts = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
ok(scripts.length === 1, 'auth.html : un seul script en ligne');
const h = "'sha256-" + createHash('sha256').update(scripts[0][1]).digest('base64') + "'";
const vj = JSON.parse(lire('com/vercel.json'));
for (const src of ['/auth', '/auth.html']) {
  const csp = vj.headers.find(x => x.source === src)?.headers.find(x => x.key === 'Content-Security-Policy')?.value || '';
  ok(csp.includes(h), src + ' : la CSP autorise l\'empreinte du script (' + h + ')');
  for (const d of ["default-src 'none'", "frame-ancestors 'none'", "base-uri 'none'", "object-src 'none'"])
    ok(csp.includes(d), src + ' : ' + d);
  ok(!/unsafe-inline[^;]*;?/.test(csp.split(';').find(x => x.includes('script-src')) || ''), src + ' : pas de unsafe-inline pour les scripts');
}
process.exit(ko ? 1 : 0);
