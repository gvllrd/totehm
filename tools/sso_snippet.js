/* ══ LE PONT SSO — LE BLOC À COPIER · v2 · 30/09/2026 ═════════════════
   Quatre domaines, quatre `localStorage`, quatre sessions. Le compte est
   unique — l'email est l'identité universelle — mais la session ne l'est
   pas et ne peut pas l'être : un navigateur ne partage rien entre deux
   origines. On ne le contourne pas, on le TRAVERSE.

   ⚠️ v2 — TOTEHM.COM EST L'AUTORITÉ (MASTER BRIEF du 30/09, §6). Deux
   façons de traverser, un seul échange côté serveur (`sso-redeem`) :

   1 · LE LIEN (le pont d'avant, inchangé) : un domaine connecté frappe un
       code pour un autre (`ssoVersDomaine`) et y envoie le membre.
   2 · LA CONNEXION CENTRALE (nouveau) : un satellite (space · club ·
       boutique) ne demande plus l'email lui-même. `ssoLogin()` crée un
       `verifier` PKCE et un `state`, les garde dans SON `sessionStorage`,
       et envoie le navigateur à `totehm.com/auth` avec le DÉFI. totehm.com
       (sa session, ou email → code une fois) frappe un code LIÉ à ce défi
       et renvoie ici, dans le fragment. Ce satellite seul peut l'échanger :
       il faut le `verifier`, qui n'a jamais quitté cette page.
       SILENCIEUX : un navigateur qui s'est déjà connecté ici (un repère
       local) et qui revient sans session repasse UNE fois par onglet par
       totehm.com (`prompt=none`) ; il revient connecté, ou invité.

   ⚠️ CE BLOC SE COPIE, IL NE S'IMPORTE PAS. Règle du projet : produits
   indépendants = fichiers indépendants. Un `<script src>` partagé ferait
   qu'une panne sur un domaine éteindrait les quatre.

   OÙ LE POSER : dans le module ES de chaque page qui a un `sb`
   (`createClient`), juste après sa création, avec `SSO_CLIENT` réglé sur
   le nom du domaine de la page. La partie ARRIVÉE doit s'exécuter AVANT
   toute lecture de session.

   CE QUI VOYAGE DANS L'URL N'EST PAS UN JETON DE SESSION. C'est un code
   d'autorisation : soixante secondes, un seul usage, un seul domaine
   cible, stocké haché côté serveur, lié à un défi PKCE pour la connexion
   centrale, et il n'ouvre rien par lui-même — il faut l'échanger.
   ═══════════════════════════════════════════════════════════════════ */

const SSO_FN = 'https://abujjbkbbiumxrokozph.supabase.co/functions/v1/';
/* ⚠️ LA CLÉ ANONYME EST OBLIGATOIRE : les Edge Functions sont déployées
   avec `verify_jwt` ; sans en-tête, 401 avant notre code. Elle est
   publique — déjà en clair au `createClient`. */
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidWpqYmtiYml1bXhyb2tvenBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTUyODIsImV4cCI6MjA5MDUzMTI4Mn0.1baPwPzAeT91Re9xj6afBrNso-Ri46fvIIwvATZL2us';
/* LE NOM DE CE DOMAINE — 'space' | 'club' | 'boutique'. Jamais une URL. */
const SSO_CLIENT = 'club';
const SSO_AUTH = 'https://www.totehm.com/auth';
const SSO_KNOWN = 'totehm_sso_known';   // localStorage : ce navigateur s'est déjà connecté ici
const SSO_TRIED = 'totehm_sso_tried';   // sessionStorage : l'aller-retour silencieux a eu lieu
const SSO_PKCE  = 'totehm_sso_pkce';    // sessionStorage : { verifier, state } le temps du voyage

const ssoB64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ssoStore = (s, k, v) => { try{ v === null ? s.removeItem(k) : s.setItem(k, v); }catch(_){} };
const ssoRead = (s, k) => { try{ return s.getItem(k); }catch(_){ return null; } };

/* ── ARRIVÉE ────────────────────────────────────────────────────────
   ⚠️ LE CODE SORT DE L'URL AVANT TOUT AUTRE GESTE — et SEULEMENT lui :
   le reste du fragment (#create, #reveal…) reste à la page. Un code
   laissé dans la barre d'adresse se retrouve dans un signet, un partage,
   un historique. Avec un `state`, c'est une connexion centrale : il doit
   être celui que CE navigateur a envoyé (sinon quelqu'un essaie de nous
   connecter à SON compte) et le `verifier` part avec le code. */
async function ssoArrivee(sb){
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  const q = new URLSearchParams(location.search);
  const code = h.get('sso') || q.get('sso'), st = h.get('state'), err = h.get('sso_error');
  if(!code && !err) return false;
  ['sso','state','sso_error'].forEach(k => { h.delete(k); q.delete(k); });
  const reste = [...h.keys()].length ? '#' + h.toString().replace(/=(&|$)/g, '$1') : '';
  history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + reste);
  const pk = (() => { try{ return JSON.parse(ssoRead(sessionStorage, SSO_PKCE) || 'null'); }catch(_){ return null; } })();
  ssoStore(sessionStorage, SSO_PKCE, null);
  if(err || !/^[a-f0-9]{64}$/.test(code || '')) return false;
  let verifier;
  if(st){
    if(!pk || pk.state !== st){ console.error('[sso] state'); return false; }
    verifier = pk.verifier;
  }
  try{
    const r = await fetch(SSO_FN + 'sso-redeem', {
      method:'POST',
      headers:{'content-type':'application/json', 'apikey':SB_ANON, 'authorization':'Bearer '+SB_ANON},
      body: JSON.stringify(verifier ? { code, verifier } : { code })
    });
    if(!r.ok){ console.error('[sso] redeem', r.status); return false; }
    const { token_hash, email } = await r.json();
    if(!token_hash) return false;
    /* `verifyOtp` ouvre une session NORMALE dans ce `localStorage`. */
    const { error } = await sb.auth.verifyOtp({ type:'email', token_hash, email });
    if(error){ console.error('[sso] verify', error.message); return false; }
    return true;
  }catch(e){ console.error('[sso]', e && e.message || e); return false; }
}

/* ── SE CONNECTER — PAR TOTEHM.COM ──────────────────────────────────
   `silent` : `prompt=none` — totehm.com ne montre rien, il rend un code
   ou `login_required`. `retour` : un CHEMIN de ce domaine (jamais une
   URL) ; totehm.com refuse tout le reste. */
async function ssoLogin(silent, retour){
  const v = ssoB64(crypto.getRandomValues(new Uint8Array(32)));
  const c = ssoB64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))));
  const st = ssoB64(crypto.getRandomValues(new Uint8Array(16)));
  ssoStore(sessionStorage, SSO_PKCE, JSON.stringify({ verifier: v, state: st }));
  const ret = retour || (location.pathname + location.search);
  location.href = SSO_AUTH + '?client=' + SSO_CLIENT + '&challenge=' + c + '&state=' + st +
                  '&return=' + encodeURIComponent(ret) + (silent ? '&prompt=none' : '');
}

/* ── DÉPART ─────────────────────────────────────────────────────────
   `cible` est un NOM DE PRODUIT — 'com' | 'space' | 'boutique' | 'club'.
   ⚠️ SI LE PONT ÉCHOUE, ON PART QUAND MÊME : dégradé, pas cassé. */
async function ssoVersDomaine(sb, cible, url){
  try{
    const { data:{ session } } = await sb.auth.getSession();
    if(session){
      const r = await fetch(SSO_FN + 'sso-mint', {
        method:'POST',
        headers:{ 'authorization':'Bearer '+session.access_token, 'apikey':SB_ANON, 'content-type':'application/json' },
        body: JSON.stringify({ target: cible })
      });
      if(r.ok){
        const { code } = await r.json();
        if(code){ location.href = url + (url.includes('#') ? '&' : '#') + 'sso=' + code; return; }
      } else console.error('[sso] mint', r.status);
    }
  }catch(e){ console.error('[sso]', e && e.message || e); }
  location.href = url;
}

/* ── LE DÉMARRAGE — BLOQUANT, ET JAMAIS PLUS DE 2,5 S ───────────────
   `await` au niveau du module : quand la page lit sa session, la session
   est déjà là. Puis, sans session et si ce navigateur s'est déjà
   connecté ici : UN aller-retour silencieux par onglet vers totehm.com.
   La page ne se dessine pas pendant qu'elle part (promesse qui ne se
   résout pas) : pas de clignotement de porte fermée. Le repère se pose à
   la connexion et s'efface à la déconnexion — sortir d'ici ne vous y
   reconnecte pas en silence. */
await Promise.race([ ssoArrivee(sb), new Promise(r => setTimeout(() => r(false), 2500)) ]);
sb.auth.onAuthStateChange(ev => {
  if(ev === 'SIGNED_IN') ssoStore(localStorage, SSO_KNOWN, '1');
  if(ev === 'SIGNED_OUT') ssoStore(localStorage, SSO_KNOWN, null);
});
{
  const { data:{ session } } = await sb.auth.getSession();
  if(session) ssoStore(localStorage, SSO_KNOWN, '1');
  else if(ssoRead(localStorage, SSO_KNOWN) && !ssoRead(sessionStorage, SSO_TRIED)){
    ssoStore(sessionStorage, SSO_TRIED, '1');
    await ssoLogin(true);
    await new Promise(() => {});
  }
}
