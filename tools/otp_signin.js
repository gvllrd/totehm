/* ══ LE CODE À SIX CHIFFRES — copié de tools/otp_signin.js dans chaque page (jamais importé) ══
   Wah (14/11) : « encore des problèmes de connexion : je suis quelques fois obligé de rentrer DEUX FOIS
   l'email et le code pour accéder. Bug à vérifier et corriger sur toutes les plateformes. »

   DEUX CAUSES, mesurées dans le code de toutes les pages de connexion :

   1 · L'EMAIL NE VIVAIT QU'EN MÉMOIRE (`let mail = ''`). On demande son code, on QUITTE la page pour aller
       le lire dans sa boîte, le téléphone décharge l'onglet (iOS le fait sans prévenir), on revient : la
       page est rechargée, `mail` est vide, `verifyOtp({email:'', token})` échoue — « wrong code » sur un
       code juste. Il fallait tout refaire. Le mail en vol est donc RETENU ici (30 min, la durée d'un code),
       et une page qui redémarre retrouve l'étape du code au lieu de la perdre.

   2 · DEUX VÉRIFICATIONS POUR UNE SAISIE. Le remplissage automatique d'un code (iOS, Android, un collage)
       lève PLUSIEURS `input` d'affilée. Le premier appel consomme le code — il est à usage unique —, le
       second reçoit « invalid token » et la page affichait « wrong code » ET vidait le champ, juste après
       une connexion RÉUSSIE. Un seul essai à la fois (`enCours`), et le code qui a MARCHÉ est retenu : le
       rejouer rend `{ok:true, deja:true}`, jamais une erreur.

   Ce bloc ne connaît ni la page ni son balisage : il rend un verdict, la page écrit les mots.
     TOTEHM_OTP.envoyer(sb, email)        → null, ou l'erreur (le mail est retenu si c'est parti)
     TOTEHM_OTP.verifier(sb, code, email) → {ok} · {ok, deja} · {why:'short'|'busy'|'email'|'expired'|'wrong'}
     TOTEHM_OTP.attendu()                 → l'email d'un code en vol (ou '') — pour reprendre l'étape du code
     TOTEHM_OTP.chiffres(v)               → les 6 chiffres d'une saisie (un collage « 123 456 » compris)
     TOTEHM_OTP.oublier()                 → on repart de l'email
   `localStorage` peut lever (navigation privée, site data bloqué) : tout est en try/catch et la page
   fonctionne sans — on retombe simplement sur le comportement d'avant. Un email n'est pas un secret de
   session : il n'ouvre rien sans le code, qui n'est jamais retenu. */
window.TOTEHM_OTP = (() => {
  const CLE = 'totehm_otp_v1', VIE = 30 * 60e3;
  let enCours = false, reussi = '';
  const chiffres = v => String(v == null ? '' : v).replace(/\D/g, '').slice(0, 6);
  function retenir(m){ try{ localStorage.setItem(CLE, JSON.stringify({ m:String(m || ''), t:Date.now() })); }catch(_){} }
  function attendu(){
    try{
      const o = JSON.parse(localStorage.getItem(CLE) || 'null');
      if(o && o.m && Date.now() - (+o.t || 0) < VIE) return String(o.m);
    }catch(_){}
    return '';
  }
  /* `oublier` efface le mail RETENU : on repart de l'email. Le verdict d'un code qui a marché (`reussi`)
     ne s'efface qu'à l'envoi d'un nouveau code — sinon un second `input` le rejouerait en erreur. */
  function oublier(){ try{ localStorage.removeItem(CLE); }catch(_){} }
  async function envoyer(sb, email, options){
    const m = String(email || '').trim();
    const { error } = await sb.auth.signInWithOtp({ email:m, options:Object.assign({ shouldCreateUser:true }, options || {}) });
    if(!error){ reussi = ''; retenir(m); }
    return error || null;
  }
  async function verifier(sb, token, email){
    const t = chiffres(token);
    if(t.length !== 6) return { why:'short' };
    if(t === reussi) return { ok:true, deja:true };      /* le même code rejoué par un second `input` */
    if(enCours) return { why:'busy' };
    const m = String(email || '').trim() || attendu();
    if(!m) return { why:'email' };
    enCours = true;
    try{
      const { error } = await sb.auth.verifyOtp({ email:m, token:t, type:'email' });
      if(error){
        const msg = String(error.message || '');
        return { why:/expir/i.test(msg) ? 'expired' : 'wrong', error };
      }
      reussi = t; oublier();
      return { ok:true, email:m };
    }finally{ enCours = false; }
  }
  return { envoyer, verifier, attendu, oublier, chiffres, occupe:() => enCours };
})();
/* ══ fin LE CODE À SIX CHIFFRES ══ */
