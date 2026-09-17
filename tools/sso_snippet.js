/* ══ LE PONT SSO — LE BLOC À COPIER · 17/09/2026 ══════════════════════
   Quatre domaines, quatre `localStorage`, quatre sessions. Le compte est
   unique — l'email est l'identité universelle — mais la session ne l'est
   pas et ne peut pas l'être : un navigateur ne partage rien entre deux
   origines. On ne le contourne pas, on le TRAVERSE.

   ⚠️ CE BLOC SE COPIE, IL NE S'IMPORTE PAS. Règle du projet : produits
   indépendants = fichiers indépendants. Un `<script src>` partagé ferait
   qu'une panne sur un domaine éteindrait les quatre.

   OÙ LE POSER : dans le module ES de chaque page qui a un `sb`
   (`createClient`), juste après sa création. La partie ARRIVÉE doit
   s'exécuter AVANT toute lecture de session.

   CE QUI VOYAGE DANS L'URL N'EST PAS UN JETON DE SESSION. C'est un code
   d'autorisation : soixante secondes, un seul usage, un seul domaine
   cible, stocké haché côté serveur, et il n'ouvre rien par lui-même —
   il faut l'échanger. La règle « jamais un jeton de session dans une
   URL » vise un jeton qui vit des heures et ouvre tout ; ce n'est pas
   ce qui passe ici.
   ═══════════════════════════════════════════════════════════════════ */

const SSO_FN = 'https://abujjbkbbiumxrokozph.supabase.co/functions/v1/';

/* ── ARRIVÉE ────────────────────────────────────────────────────────
   ⚠️ LE CODE SORT DE L'URL AVANT TOUT AUTRE GESTE. Un code laissé dans
   la barre d'adresse se retrouve dans un signet, un partage, un
   historique — et même brûlé, il n'a rien à y faire.
   On renvoie une promesse : la page doit l'attendre avant de décider si
   quelqu'un est connecté, sinon elle affiche « déconnecté » une demi-
   seconde et le membre voit un clignotement de porte fermée. */
async function ssoArrivee(sb){
  const m = /[#&?]sso=([a-f0-9]{64})/.exec(location.hash) ||
            /[#&?]sso=([a-f0-9]{64})/.exec(location.search);
  if(!m) return false;
  const code = m[1];
  history.replaceState(null, '', location.pathname + location.search.replace(/[?&]sso=[a-f0-9]{64}/, ''));
  try{
    const r = await fetch(SSO_FN + 'sso-redeem', {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ code })
    });
    if(!r.ok){ console.error('[sso] redeem', r.status); return false; }
    const { token_hash, email } = await r.json();
    if(!token_hash) return false;
    /* `verifyOtp` ouvre une session NORMALE dans ce `localStorage` :
       avec son refresh token, sa déconnexion, sa durée de vie. On ne
       fabrique aucun jeton à la main. */
    const { error } = await sb.auth.verifyOtp({ type:'email', token_hash, email });
    if(error){ console.error('[sso] verify', error.message); return false; }
    return true;
  }catch(e){ console.error('[sso]', e && e.message || e); return false; }
}

/* ── DÉPART ─────────────────────────────────────────────────────────
   `cible` est un NOM DE PRODUIT — 'com' | 'space' | 'boutique' | 'club' —
   jamais une URL. Le serveur seul sait à quelle origine chaque nom
   correspond : une page qui choisirait librement sa destination
   laisserait n'importe quel site demander un code pour lui-même.

   ⚠️ SI LE PONT ÉCHOUE, ON PART QUAND MÊME. Le membre arrivera
   déconnecté et se connectera par email — c'est dégradé, ce n'est pas
   cassé. Bloquer la porte parce que le pont tousse serait pire que le
   problème qu'on résout. */
async function ssoVersDomaine(sb, cible, url){
  try{
    const { data:{ session } } = await sb.auth.getSession();
    if(session){
      const r = await fetch(SSO_FN + 'sso-mint', {
        method:'POST',
        headers:{ 'authorization':'Bearer '+session.access_token,
                  'content-type':'application/json' },
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

/* ── LE DÉMARRAGE — ET POURQUOI IL EST BLOQUANT ─────────────────────
   `await` au NIVEAU DU MODULE : tout ce qui suit dans le fichier attend.
   C'est voulu, et c'est la seule forme qui marche partout sans recâbler
   sept pages différentes. Chacune a son propre démarrage ; leur demander
   à toutes d'appeler la bonne fonction au bon moment, c'est sept
   occasions de se tromper — et la première oubliée donnerait un membre
   qui arrive déconnecté sans que rien ne le signale.
   Ici, quand la page lit sa session, la session est déjà là.

   ⚠️ ET ÇA NE BLOQUE JAMAIS PLUS DE 2,5 SECONDES. Si le pont ne répond
   pas, on continue SANS session : le membre se connectera par email.
   Dégradé, pas cassé. Une page qui ne s'affiche pas parce qu'un pont
   tousse serait bien pire que le problème qu'on résout.
   Et quand il n'y a pas de code dans l'URL — le cas de loin le plus
   fréquent — `ssoArrivee` rend `false` immédiatement, sans un octet de
   réseau. */
await Promise.race([
  ssoArrivee(sb),
  new Promise(r => setTimeout(() => r(false), 2500)),
]);
