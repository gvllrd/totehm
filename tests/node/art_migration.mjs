// Repository-only migration invariants. No credentials or production requests.
// node tests/node/art_migration.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../..', import.meta.url).pathname;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pages = ['get_higher', 'stoner', 'stoner_terms', 'play_lisbon_street', 'discover', 'discover_lisbon', 'origins'];
const sso = read('tools/sso_snippet.js')
  .replace(/^const SB_ANON = .*;\n/m, '')
  .replace("const SSO_CLIENT = 'club';", "const SSO_CLIENT = 'space';").trimEnd();
const oldSSO = /\/\* ══ LE PONT SSO[\s\S]*?await Promise\.race\(\[[\s\S]*?\]\);/;
let checks = 0;
for(const name of pages){
  const before = read(`boutique/${name}.html`);
  const after = read(`space/${name}.html`);
  // Full source equality outside the necessary copied authentication protocol:
  // includes every SVG, artwork, word, stylesheet and interaction handler.
  assert.equal(after, name === 'stoner_terms' ? before : before.replace(oldSSO, sso), name + ' only changes the SSO origin/protocol');
  checks++;
}
for(const name of ['assets/img/totehm_logo.png', ...fs.readdirSync(path.join(root, 'boutique/assets/signs')).map(n => 'assets/signs/' + n)]){
  assert.deepEqual(fs.readFileSync(path.join(root, 'space', name)), fs.readFileSync(path.join(root, 'boutique', name)), name + ' preserved');
  checks++;
}
assert.equal(read('space/api/geo.js'), read('boutique/api/geo.js'));
checks++;

const space = JSON.parse(read('space/vercel.json'));
const boutique = JSON.parse(read('boutique/vercel.json'));
const art = [...pages, 'market'];
const excluded = read('boutique/.vercelignore').split(/\r?\n/);
for(const name of art){
  assert(excluded.includes('/' + name + '.html'), name + ' baseline is excluded from production so filesystem precedence cannot bypass the bridge');
  for(const suffix of ['', '.html']){
    const source = '/' + name + suffix;
    assert(!space.redirects.some(r => r.source === source), 'SPACE serves ' + source + ' directly');
    if(suffix){
      const canonical = boutique.redirects.find(r => r.source === source);
      assert.equal(canonical?.destination, '/' + name, source + ' keeps its origin and slug before the SSO bridge');
      assert.equal(canonical?.permanent, false);
    }else{
      assert.equal(boutique.rewrites.find(r => r.source === source)?.destination, '/art-bridge', source + ' uses an extensionless destination with cleanUrls');
      assert(!boutique.redirects?.some(r => r.source === source), 'no reverse cached redirect loop for ' + source);
    }
    checks++;
  }
}
const club = JSON.parse(read('club/vercel.json'));
for(const config of [boutique, club]){
  assert(config.cleanUrls);
  assert(config.rewrites.every(r => !r.source.endsWith('.html') && r.destination === '/art-bridge'));
}
for(const key of ['spot', 'v', 'habit', 'u', 'embed']){
  for(const source of ['/', '/index.html']){
    const redirect = space.redirects.find(r => r.source === source && r.has?.some(h => h.type === 'query' && h.key === key));
    assert.equal(redirect?.destination, '/social', key + ' keeps the social app');
    assert.equal(redirect.permanent, false);
    checks++;
  }
}
assert(fs.existsSync(path.join(root, 'space/social.html')), 'the social app remains accessible');
assert(space.rewrites.some(r => r.source === '/s/:id' && r.destination.includes('/api/card')), 'shared social cards retained');
for(const physical of ['/streetwear', '/luxury', '/totehm', '/terms_of_sale']){
  assert(!boutique.rewrites.some(r => r.source === physical), physical + ' stays physical');
  checks++;
}
const bridge = read('boutique/art-bridge.html');
assert(bridge.includes("ssoVersDomaine(sb, 'space', window.__artMigrationTarget)"));
assert(bridge.includes("const SSO_CLIENT = 'boutique'"));
assert(bridge.includes("['sso','state','sso_error']"));
assert(bridge.includes("target.searchParams.set('migration', 'gallery-v1')"));
assert(!bridge.includes('verifyOtp({ email, token_hash'), 'token_hash verification never mixes email');
checks += 7;
console.log(`${checks} art migration invariants passed`);
