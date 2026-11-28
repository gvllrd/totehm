/* ══ LA PRISE DE SPOT — copié de tools/spot_take.js ══ */
/* La prise de spot suit un rail d'étapes depuis la capture facultative jusqu'à la publication.
   Now relève ma position. Later donne accès à la date, à l'adresse et à la carte.
   La visibilité de la box limite le choix d'accès et le serveur valide la publication. */
function creerPriseSpot({sb,VID,CAP,villeDe,vignette,position,habits,carte,session,autorise,
  audienceFixe='',connexion,avantOuvrir,apresPublier}){
  const DURS=[15,30,45,60,90,120,180];
  const CLUB='a habit, its why, its repulsions — the closest thing to public.';
  const PARTAGE_BOX='Opening this Habit to my subscribers also opens its media and sub-boxes in my TOTEHM.';
  const AUD=[['private','private','me only'],['subscribers','my subscribers','only them'],['figher','figher club','every member']];
  const POURQUOI={signin:'sign in again', habit:'save this Habit first', location:'where', mode:'silent or social',
    duration:'the duration', video:'the photo or the video', position:'allow my location', too_many:'enough spots for now',
    city:'no city near me', audience:'who sees it', when:'a future date and time', place:'where',
    box_private:'this Habit box is private · open it to my subscribers first'};
  let R={clip_seconds:33, clip_max_bytes:48e6, duration_min:5, duration_max:720, horizon_days:90}, regles=false, seqPos=0;
  const diag={ouverts:0, publies:0, refus:0, medias:0, cartes:0, adresses:0};
  const ETAPES=[['media','Media'],['habit','Habit'],['when','When'],['where','Where'],
    ['access','Access'],['together','Together'],['duration','Duration'],['publish','Publish']];
  let N, retour=null;
  const pan=()=>$('rdr-new');
  const pad=n=>String(n).padStart(2,'0');
  const dureeTxt=d=>d<60?d+' min':d%60?Math.floor(d/60)+' h '+(d%60):(d/60)+' h';
  function lacher(){ if(N?.media) URL.revokeObjectURL(N.media.url); if(N){ N.media=null; N.path=''; } }
  function neuf(){
    N?.adrReq?.abort();
    lacher(); seqPos++;
    const d=new Date(Date.now()+864e5);
    N={etape:'media', mediaOk:false, mediaSeq:0, h:null, quand:'', media:null, path:'', aud:audienceFixe, boxBusy:false, confirmerBox:'', mode:'', ou:'',
      pt:null, ptSrc:'', ptVille:'', ptNom:'', posErr:false, posBusy:false,
      adr:'', hits:[], hit:-1, adrBusy:false, adrErr:'', adrSeq:0, adrReq:null,
      dur:0, mot:'', date:d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()),
      time:pad(d.getHours())+':'+pad(d.getMinutes()), place:'', occupe:false, note:''};
  }
  neuf();
  async function lireRegles(){
    if(regles) return; regles=true;
    try{
      const {data,error}=await sb.rpc('spot_rules');
      if(error) throw error;
      if(data&&typeof data==='object') R=Object.assign({},R,data);
      actualiserSuite();
    }catch(e){ console.error('[spot_rules]',e?.message||e); regles=false; }
  }
  const dateOk=()=>{ const t=new Date(N.date+'T'+N.time).getTime();
    return Number.isFinite(t)&&t>Date.now()&&t<=Date.now()+(R.horizon_days||90)*864e5; };
  const durOk=()=>Number.isInteger(N.dur)&&N.dur>=(R.duration_min||5)&&N.dur<=(R.duration_max||720);
  function termine(k){
    switch(k){
      case 'media': return N.mediaOk;
      case 'habit': return !!N.h;
      case 'when': return N.quand==='now'||(N.quand==='later'&&dateOk());
      case 'where': return !!N.pt;
      case 'access': return !!N.aud&&!N.boxBusy&&(!boxPrivee()||N.aud==='private');
      case 'together': return !!N.mode;
      case 'duration': return durOk();
    }
  }
  function accessible(k){
    const i=ETAPES.findIndex(([id])=>id===k);
    return i>=0&&ETAPES.slice(0,i).every(([id])=>termine(id));
  }
  function aller(k){
    if(N.occupe||!accessible(k)) return;
    N.etape=k; N.note=''; peindre();
  }
  function actualiserSuite(){
    const b=pan()?.querySelector('[data-ns="continue"]');
    if(b) b.disabled=!termine(N.etape);
    pan()?.querySelectorAll('.take-rail [data-v]').forEach(b=>{ b.disabled=N.occupe||!accessible(b.dataset.v); });
  }
  /* le fichier choisi : GARDÉ ici (rien ne part avant la publication) ; une photo est réduite en JPEG, une vidéo bornée */
  const duree=f=>new Promise(ok=>{ const v=document.createElement('video'), u=URL.createObjectURL(f); let fini=false;
    const fin=s=>{ if(fini) return; fini=true; URL.revokeObjectURL(u); ok(s); };
    v.preload='metadata'; v.muted=true; v.onloadedmetadata=()=>fin(Number.isFinite(v.duration)?v.duration:0);
    v.onerror=()=>fin(0); setTimeout(()=>fin(0),6000); v.src=u; });
  async function prendre(f){
    const t=String(f&&f.type||'').toLowerCase().split(';')[0], photo=/^image\//.test(t), video=/^video\//.test(t);
    if(!photo&&!video) return {ok:false, why:'media'};
    const draft=N, seq=++N.mediaSeq, uid=session();
    let blob=f, secs=0;
    if(photo){ blob=await emReduire(f); if(!blob) return {ok:false, why:'media'}; }
    else{ if(f.size>(R.clip_max_bytes||48e6)) return {ok:false, why:'lourd'};
      secs=await duree(f); if(secs>(R.clip_seconds||33)+.5) return {ok:false, why:'long'}; }
    if(draft!==N||seq!==N.mediaSeq||uid!==session()) return {ok:false};
    lacher(); diag.medias++;
    N.media={blob, url:URL.createObjectURL(blob), photo, secs, type:photo?'image/jpeg':t};
    return {ok:true};
  }
  async function envoyerMedia(m,uid,suivi){
    /* la vidéo chez Bunny (cinq qualités, le CDN le plus proche : elle démarre tout de suite) ; refusée → `moments` */
    if(!m.photo&&await VID.dispo()){
      if(uid!==session()) return '';
      try{ return await VID.envoyer(m.blob,m.secs,p=>suivi('sending… '+p+' %')); }
      catch(e){ console.error('[bunny upload]',e&&e.message||e); }
    }
    const ext=m.photo?'jpg':m.type.includes('mp4')?'mp4':m.type.includes('quicktime')?'mov':'webm';
    if(uid!==session()) return '';
    const path=uid+'/'+crypto.randomUUID()+'.'+ext;
    const {error}=await sb.storage.from('moments').upload(path,m.blob,{contentType:m.photo?'image/jpeg':(m.type||'video/'+ext),upsert:false});
    if(error){ console.error('[moments upload]',error.message); return ''; }
    if(m.photo) vignette(path,m.blob);                          /* 15/11 : sa vignette, sans attendre */
    return path;
  }
  /* ── LE LIEU : UN SEUL POINT (`N.pt`), d'où qu'il vienne ── La ville se déduit TOUJOURS de `cities.json`
     (`villeDe`), jamais du géocodeur : c'est le même vocabulaire que le filtre `city` et que la carte. */
  function poser(ll,src,nom){
    const s=++seqPos;
    N.pt={lat:ll.lat, lng:ll.lng}; N.ptSrc=src; N.ptNom=nom||''; N.ptVille=''; N.posErr=false; N.posBusy=false;
    carte.moteur.epingler(N.pt);
    villeDe(ll.lat,ll.lng).then(v=>{
      if(s!==seqPos) return;
      N.ptVille=v||'';
      if(!N.occupe&&(N.etape==='where'||N.etape==='publish')) peindre();
    });
    peindre();
  }
  function localiser(){
    const s=++seqPos, frais=N.posErr; N.posErr=false; N.posBusy=true;
    position({frais,precis:true}).then(pt=>{
      if(s!==seqPos) return;
      if(pt) poser(pt,'ici','');
      else{ N.posBusy=false; N.posErr=true; peindre(); }
    });
  }
  /* ── L'ADRESSE → UN POINT ── Nominatim (OpenStreetMap : le même fonds que les tuiles du Club). UNE requête
     par GESTE, jamais à la frappe (leur règle, et la nôtre : rien de systématique) ; chaque réponse est gardée.
     Injoignable, le refus se VOIT et le membre garde [here] ou la carte. */
  const ADR=new Map();
  function oublierRecherche(){
    N.adrSeq++;
    N.adrReq?.abort();
    N.adrReq=null;
    N.adrBusy=false; N.hits=[]; N.hit=-1; N.adrErr='';
  }
  async function chercherAdresse(){
    const q=N.adr.trim();
    if(q.length<3){ N.adrErr='write the address first'; return peindre(); }
    if(N.adrBusy) return;
    const draft=N, s=++N.adrSeq, k=q.toLowerCase();
    N.adrBusy=true; N.adrErr=''; N.hits=[]; N.hit=-1; peindre();
    let l=ADR.get(k);
    if(!l){
      const actif=new AbortController();
      N.adrReq=actif;
      const delai=setTimeout(()=>actif.abort(),8000);
      try{
        const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q='+encodeURIComponent(q),
          {headers:{Accept:'application/json'}, referrerPolicy:'strict-origin-when-cross-origin',signal:actif.signal});
        if(!r.ok) throw new Error('http '+r.status);
        const d=await r.json();
        l=(Array.isArray(d)?d:[]).map(x=>({lat:+x.lat, lng:+x.lon, nom:String(x.display_name||'').slice(0,160)}))
          .filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng)&&x.lat>=-90&&x.lat<=90&&x.lng>=-180&&x.lng<=180);
        ADR.set(k,l); if(ADR.size>40) ADR.delete(ADR.keys().next().value);
      }catch(e){
        if(draft===N&&s===N.adrSeq){
          console.error('[adresse]',e?.message||e);
          N.adrBusy=false; N.adrErr='addresses are unreachable · use here or the map'; peindre();
        }
        return;
      }finally{
        clearTimeout(delai);
        if(N.adrReq===actif) N.adrReq=null;
      }
    }
    if(draft!==N||s!==N.adrSeq) return;
    diag.adresses++;
    N.adrBusy=false; N.hits=l; N.adrErr=l.length?'':'no place with this address';
    peindre();
  }
  /* LATER — un point posé sur la Terre : le panneau s'efface, un tap sur le globe le donne */
  function surLaCarte(){
    const p=pan(); if(!p) return;
    carte.ouvrir();
    const draft=N;
    p.hidden=true; document.body.classList.add('rdr-pique'); diag.cartes++;
    $('rdr-pique')?.focus({preventScroll:true});
    carte.moteur.piquer(ll=>{
      const revenir=()=>{
        if(draft!==N||!document.body.classList.contains('is-nspot')) return;
        document.body.classList.remove('rdr-pique');
        carte.fermer?.();
        p.hidden=false;
        peindre();
        p.querySelector('[data-ns="carte"]')?.focus({preventScroll:true});
      };
      if(!ll){ revenir(); return; }
      poser(ll,'carte','');
      // Le clic généré après le toucher doit finir sur la carte.
      requestAnimationFrame(()=>requestAnimationFrame(revenir));
    });
  }
  /* Une question par étape, les réponses précédentes restent accessibles sur le rail. */
  const chip=(a,mot,on,sous)=>'<button type="button" class="sfc ns-c'+(on?' is-on':'')+'" '+a+' aria-pressed="'+!!on+'">'
    +esc(mot)+(sous?'<small>'+esc(sous)+'</small>':'')+'</button>';
  const grp=(mot,corps)=>'<div class="sfg"><div class="sfl">'+esc(mot)+'</div><div class="sfr">'+corps+'</div></div>';
  const tag=t=>'<span class="ns-tag">'+esc(t)+'</span>';
  const note=t=>'<p class="ns-def ns-note-g">'+esc(t)+'</p>';
  function habitHTML(){
    if(N.h) return '<div class="sfg"><div class="sfl">my habit</div><div class="sfbx"><div class="sfb is-on" role="button" tabindex="0" data-ns="reh"'
      +' aria-label="Change the Habit">'+habits.box(N.h)+'</div></div></div>';
    const liste=habits.liste(), hs=(liste||[]).filter(h=>String(habits.ref(h)||'').trim());
    return '<div class="sfg"><div class="sfl">which habit?</div><div class="sfbx">'+(hs.length
      ?hs.map(h=>{
        const cle=String(habits.id(h)), id=esc(cle);
        if(audienceFixe&&habits.privee(h)){
          const verrou=N.boxBusy?' disabled':'';
          const ouvrir=N.confirmerBox===cle;
          return '<div class="sfb is-off">'+habits.box(h)+'<div class="sfb-act">'
            +(ouvrir?note(PARTAGE_BOX):'')+'<div class="sfr">'
            +(ouvrir?chip('data-ns="ouvrirbox" data-v="'+id+'"'+verrou,'confirm',false)
              +chip('data-ns="demanderbox"'+verrou,'cancel',false)
              :chip('data-ns="demanderbox" data-v="'+id+'"'+verrou,'open the Habit box to my subscribers',false))
            +'</div></div></div>';
        }
        return '<div class="sfb" role="button" tabindex="0" data-ns="h" data-v="'+id+'">'+habits.box(h)+'</div>';
      }).join('')
      :'<p class="lv-note">'+(liste?'write a Habit in my TOTEHM first':'reading my TOTEHM…')+'</p>')+'</div></div>';
  }
  const titre=mot=>'<h2>'+esc(mot)+'</h2>';
  const actions=html=>'<div class="take-actions">'+html+'</div>';
  const suite=()=>actions(actionPrise('data-ns="continue"','Continue',false,!termine(N.etape)));
  function mediaHTML(){
    const m=N.media;
    if(m) return apercuPrise(m.url,m.type)+actions(actionPrise('data-ns="media-next"','Continue')
      +actionPrise('data-ns="replace"','Retake',true)+actionPrise('data-ns="skip"','Continue without media',true));
    return '<div class="sfg"><p class="sfl">Photo or video · up to '+(R.clip_seconds||33)
      +' s</p><div class="ns-cap"></div></div>'+actions(actionPrise('data-ns="skip"','Continue without media',true));
  }
  /* WHEN : deux réponses, et la date SEULEMENT si c'est « later ». */
  const quandHTML=()=>grp('when',chip('data-ns="quand" data-v="now"','now',N.quand==='now','I am here')
    +chip('data-ns="quand" data-v="later"','later',N.quand==='later','I will be here'));
  const dateHTML=()=>grp('the day and the hour','<input class="sfc ns-in" type="date" aria-label="Date" data-nsi="date" value="'+esc(N.date)+'">'
    +'<input class="sfc ns-in" type="time" aria-label="Time" data-nsi="time" value="'+esc(N.time)+'">'
    +tag('within '+(R.horizon_days||90)+' days'));
  /* WHERE : [here] ou [elsewhere]. NOW n'a pas le choix — maintenant, c'est ici. */
  function ouHTML(){
    const now=N.quand==='now';
    let c=now?'<span class="sfc ns-c is-on">here<small>my position</small></span>'
      :chip('data-ns="ou" data-v="ici"','here',N.ou==='ici','my position')
       +chip('data-ns="ou" data-v="ailleurs"','elsewhere',N.ou==='ailleurs','an address');
    if(N.pt) c+='<span class="ns-tag" data-ns-point>'+esc(N.ptVille||N.ptNom.split(',')[0].trim()||'the exact point')+'</span>';
    else if(N.ou==='ici'||now) c+=N.posErr?tag('allow my location')+chip('data-ns="retry"','try again',false):tag('finding my place…');
    let h=grp(now?'my position':'choose a place',c);
    if(N.ou==='ailleurs') h+=adresseHTML();
    if(N.pt&&!now) h+='<div class="sfg"><input class="sfc ns-in ns-place" type="text" maxlength="120" autocomplete="off"'
      +' placeholder="the place · optional" aria-label="The place" data-nsi="place" value="'+esc(N.place)+'"></div>';
    return h;
  }
  function adresseHTML(){
    let h='<div class="sfg"><div class="sfl">the address</div><div class="ns-adr">'
      +'<input class="sfc ns-in ns-adrin" type="text" maxlength="160" autocomplete="off" enterkeyhint="search"'
      +' placeholder="street, number, city" aria-label="The address" data-nsi="adr" value="'+esc(N.adr)+'">'
      +'<button type="button" class="sfc" data-ns="find"'+(N.adrBusy?' disabled':'')+'>'+(N.adrBusy?'reading…':'read it')+'</button>'
      +'</div>';
    if(N.adrErr) h+='<p class="lv-note" data-ns-address-error role="status">'+esc(N.adrErr)+'</p>';
    if(N.hits.length) h+='<div class="ns-hits">'+N.hits.map((x,i)=>'<button type="button" class="ns-hit'+(N.hit===i?' is-on':'')
      +'" data-ns="hit" data-v="'+i+'">'+esc(x.nom)+'</button>').join('')+'</div>';
    h+='</div>';
    h+=grp('or',chip('data-ns="carte"','on the map',N.ptSrc==='carte',N.ptSrc==='carte'?'the point is set':'tap the place'));
    return h;
  }
  /* ⚠️ 14/11 — LES TROIS NIVEAUX SONT TOUJOURS LÀ, ET LA BOX EST LE PLAFOND (Wah) : « Box Private → Spot
     forcément Private ; Box Visible to subscribers → Spot Private / My subscribers / Figher club, au choix,
     sans changer la box. Si la box Habit est Private et que l'utilisateur choisit My subscribers ou Figher
     club, demander confirmation avant de passer la box Habit en Visible to subscribers dans le TOTEHM. »
     Donc : on montre les trois, on n'en cache aucun, et le choix au-dessus du plafond ARME une confirmation
     qui dit ce qu'elle ouvre. Le serveur refuse de toute façon (`why:'box_private'`). */
  const boxPrivee=()=>!!N.h&&habits.privee(N.h);
  const audHTML=()=>{
    const haut=N.aud==='subscribers'||N.aud==='figher';
    const choix=audienceFixe?'<span class="sfc ns-c is-on">figher club<small>every member</small></span>'
      :AUD.map(([v,m,s])=>chip('data-ns="aud" data-v="'+v+'"',m,N.aud===v,s)).join('');
    let h=grp('who sees it',choix);
    if(boxPrivee()&&haut) h+=note('This Habit box is private. '+PARTAGE_BOX)
      +'<div class="sfg"><div class="sfr">'+chip('data-ns="ouvrirbox"'+(N.boxBusy?' disabled':''),N.boxBusy?'opening…':'open the box to my subscribers',false)+'</div></div>';
    else if(N.aud==='figher'&&!audienceFixe) h+=note(CLUB);
    return h;
  };
  const ensHTML=()=>grp('together',chip('data-ns="mode" data-v="silent"','silent',N.mode==='silent','nobody disturb me')
    +chip('data-ns="mode" data-v="social"','social',N.mode==='social','we can talk'));
  const durHTML=()=>grp('how long?',DURS.filter(d=>d>=(R.duration_min||5)&&d<=(R.duration_max||720))
    .map(d=>chip('data-ns="dur" data-v="'+d+'"',dureeTxt(d),N.dur===d)).join(''))
    +grp('or set the minutes','<input class="sfc ns-in ns-min" type="number" inputmode="numeric" min="'+(R.duration_min||5)
    +'" max="'+(R.duration_max||720)+'" placeholder="min" aria-label="Duration in minutes" data-nsi="dur" value="'
    +esc(N.dur&&!DURS.includes(N.dur)?String(N.dur):'')+'">');
  const motHTML=()=>'<div class="sfg"><div class="sfl">a word · optional</div><textarea class="sfc ns-in ns-mot" maxlength="400" rows="3"'
    +' placeholder="A word" aria-label="A word" enterkeyhint="enter" data-nsi="mot">\n'+esc(N.mot)+'</textarea></div>';
  function publierHTML(){
    const plan=N.quand==='later';
    const date=plan?new Date(N.date+'T'+N.time).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'Now';
    const infos=[date,N.place.trim()||N.ptVille||N.ptNom.split(',')[0].trim()||'Exact location',
      (AUD.find(([v])=>v===N.aud)||[])[1],N.mode,dureeTxt(N.dur)];
    return titre('Review spot')+'<div class="take-summary">'+(N.media?apercuPrise(N.media.url,N.media.type):'')
      +'<div class="sfbx">'+habits.box(N.h)+'</div><div class="sfr">'+infos.map(tag).join('')+'</div></div>'+motHTML()
      +actions(actionPrise('data-ns="go"',plan?'I will be here':'I am here',false,N.occupe||!accessible('publish')));
  }
  function peindre(){
    const p=pan(); if(!p||p.hidden) return;
    // Un retour de géolocalisation ou d'adresse ne doit pas interrompre la capture en cours.
    if(N.etape==='media'&&!N.media&&CAP.dans(p)) return;
    if(CAP.dans(p)) CAP.fermer();
    let h;
    switch(N.etape){
      case 'media': h=mediaHTML(); break;
      case 'habit': h=habitHTML()+(N.h?suite():''); break;
      case 'when': h=quandHTML()+(N.quand==='later'?dateHTML()+suite():''); break;
      case 'where': h=ouHTML()+suite(); break;
      case 'access': h=audHTML()+suite(); break;
      case 'together': h=ensHTML(); break;
      case 'duration': h=durHTML()+suite(); break;
      case 'publish': h=publierHTML(); break;
    }
    if(N.etape!=='media'||N.note) h+='<p class="lv-note ns-note" role="status">'+esc(N.note)+'</p>';
    const stage=rendrePrise(p,'data-ns="close"',railPrise('Spot',ETAPES,N.etape,'data-ns="stage"',accessible,N.occupe),N.etape,h);
    p.querySelector('[data-ns="close"]').disabled=N.occupe;
    const ho=stage.querySelector('.ns-cap');
    if(ho) CAP.ouvrir({hote:ho, prendre, max:R.clip_seconds||33, fini:peindre});
  }
  function dire(t){ N.note=t||''; const n=pan()&&pan().querySelector('.ns-note'); if(n) n.textContent=N.note; }
  /* ── OUVRIR LA BOX DEPUIS ICI (14/11, Wah) ── « On doit pouvoir changer la confidentialité d'une box
     aisément dans tous les endroits où elle apparaît, pas seulement dans le TOTEHM. » Le questionnaire est
     l'un de ces endroits : la confirmation est le tap sur CE bouton, et la note au-dessus dit que les médias
     et les sous-box suivent. Jamais l'inverse : rien ici ne fait REDESCENDRE une box. */
  async function ouvrirLaBox(h){
    if(N.boxBusy||!h||!autorise()) return;
    const draft=N;
    N.boxBusy=true; dire(''); peindre();
    const ok=await habits.ouvrir(h).catch(e=>{ console.error('[spot box]',e?.message||e); return false; });
    if(draft!==N) return;
    N.boxBusy=false;
    if(ok) N.confirmerBox='';
    else N.note='the box did not open · try again';
    peindre();
  }
  /* ── LA PUBLICATION : le serveur dit oui ou pourquoi ── Le point est TOUJOURS exact (`p_location:'on'`), donc
     `p_mode` est toujours rempli : c'est ce que le serveur exige d'un spot dont le lieu est précis. */
  async function publier(){
    if(N.occupe||!autorise()||N.etape!=='publish') return;
    const manque=ETAPES.slice(0,-1).find(([id])=>!termine(id));
    if(manque){ aller(manque[0]); return; }
    const draft=N, plan=N.quand==='later', uid=session();
    const courant=()=>draft===N&&uid===session();
    const suivre=t=>{ if(courant()) dire(t); };
    const fin=t=>{ if(courant()){ N.occupe=false; diag.refus++; dire(t); peindre(); } };
    let id;
    N.occupe=true; dire(plan?'announcing…':'sending…'); peindre();
    try{
      if(!plan&&N.media&&!N.path){
        const path=await envoyerMedia(N.media,uid,suivre);
        if(!courant()) return;
        if(!path) return fin('media unavailable · try again');
        N.path=path;
      }
      const commun={p_habit:habits.ref(N.h), p_duration_min:N.dur, p_lat:N.pt.lat, p_lng:N.pt.lng, p_city:N.ptVille||null,
        p_comment:N.mot.trim()||null, p_mode:N.mode, p_location:'on', p_audience:N.aud};
      const corps=plan
        ?Object.assign({}, commun, {p_starts_at:new Date(N.date+'T'+N.time).toISOString(),
          p_place:(N.place.trim()||N.ptNom.split(',')[0].trim()||N.ptVille||'the planned place').slice(0,120)})
        :Object.assign({}, commun, {p_video:N.path||null});
      const fn=plan?'spot_schedule_audience':'spot_create_audience';
      let {data,error}=await sb.rpc(fn,corps);
      if(!courant()) return;
      /* Une Habit toute neuve peut attendre son enregistrement. */
      if(habits.sauver&&!error&&data?.why==='habit'){
        await habits.sauver();
        if(!courant()) return;
        ({data,error}=await sb.rpc(fn,corps));
      }
      if(!courant()) return;
      if(error) throw error;
      if(!data?.ok) return fin(POURQUOI[data?.why]||'not saved · try again');
      id=data.id;
    }catch(e){ console.error('[spot publish]',e?.message||e); return fin('not saved · try again'); }

    let pasMedia=false;
    if(plan&&draft.media){
      try{
        const path=await envoyerMedia(draft.media,uid,suivre);
        if(!courant()) return;
        if(path){
          const {data,error}=await sb.rpc('spot_video_attach',{p_spot:id,p_video:path});
          if(error) throw error;
          pasMedia=!data?.ok;
        }else pasMedia=true;
      }catch(e){ console.error('[spot_video_attach]',e?.message||e); pasMedia=true; }
    }
    if(!courant()) return;
    try{
      const {error}=await sb.rpc('spot_box_set',{p_spot:id, p_hide:{objectives:[], repulsions:[], freq:false}});
      if(error) console.error('[spot_box_set]',error.message);
    }catch(e){ console.error('[spot_box_set]',e?.message||e); }
    if(!courant()) return;
    diag.publies++;
    fermer();
    apresPublier(plan?'future':'now',pasMedia);
  }
  function ouvrir(x,dejaPris=false){
    const p=pan(); if(!p||N.occupe) return false;
    if(!autorise()){ connexion?.(); return false; }
    if(p.hidden&&!carte.moteur.pique()) retour=document.activeElement;
    if(CAP.dans(p)) CAP.fermer();
    if(carte.moteur.pique()) carte.moteur.piquer(null);
    neuf(); lireRegles(); VID.dispo();
    const draft=N;
    const choisir=()=>habits.trouver?.(String(x))||(habits.liste()||[])
      .find(h=>String(habits.ref(h)).trim()===String(x).trim())||null;
    if(x) N.h=choisir();
    habits.charger?.().then(()=>{
      if(draft!==N) return;
      if(x&&!N.h&&(N.etape==='media'||N.etape==='habit')) N.h=choisir();
      if(N.etape==='habit') peindre();
    });
    avantOuvrir();
    p.hidden=false; document.body.classList.add('is-nspot'); diag.ouverts++;
    delete p.dataset.etapePrise;
    if(!dejaPris) peindre();
    return true;
  }
  function fermer(){
    const p=pan(); if(!p) return;
    document.body.classList.remove('is-nspot','rdr-pique');
    if(carte.moteur.pique()) carte.moteur.piquer(null);
    carte.fermer?.();
    if(CAP.dans(p)) CAP.fermer();
    p.hidden=true; p.innerHTML=''; carte.moteur.epingler(null); neuf();
    if(retour!==document.body&&retour?.getClientRects().length) retour.focus({preventScroll:true});
    retour=null;
  }
  /* Changer de temps ou de lieu REND le lieu : « now » reprend ma position, « elsewhere » repart de l'adresse. */
  function effacerPoint(){
    seqPos++; N.pt=null; N.ptSrc=''; N.ptVille=''; N.ptNom=''; N.place='';
    carte.moteur.epingler(null);
  }
  function oublierLieu(){
    effacerPoint(); oublierRecherche(); N.posErr=false; N.posBusy=false;
  }
  function modifierAdresse(p,valeur){
    const change=N.adr.trim()!==valeur.trim();
    N.adr=valeur;
    if(!change) return;
    oublierRecherche();
    p.querySelector('.ns-hits')?.remove();
    p.querySelector('[data-ns-address-error]')?.remove();
    const lire=p.querySelector('[data-ns="find"]');
    lire.disabled=false; lire.textContent='read it';
    // Le clavier doit rester sur l'adresse pendant la frappe.
    if(N.ptSrc==='adresse'){
      effacerPoint();
      p.querySelector('[data-ns-point]')?.remove();
      p.querySelector('[data-nsi="place"]')?.parentElement.remove();
      actualiserSuite();
    }
  }
  { const p=pan(); if(p){
    p.addEventListener('click',e=>{
      const t=e.target.closest('[data-ns]'); if(!t) return;
      const c=t.dataset.ns, v=t.dataset.v;
      if(N.occupe||t.disabled) return;
      if(c==='close') return fermer();
      if(c==='go') return void publier();
      if(c==='stage'){ if(N.etape!==v) aller(v); return; }
      if(c==='skip'||c==='media-next'){
        if(c==='skip'){
          if(CAP.dans(p)) CAP.fermer();
          ++N.mediaSeq; lacher();
        }
        N.mediaOk=true;
        return aller(N.h?'when':'habit');
      }
      if(c==='continue'){
        const suite={habit:'when',when:'where',where:'access',access:'together',duration:'publish'}[N.etape];
        if(suite) aller(suite);
        return;
      }
      if(c==='h'){
        N.h=(habits.liste()||[]).find(h=>String(habits.id(h))===String(v))||null;
        N.confirmerBox='';
        if(N.h) aller('when');
        return;
      }
      if(c==='reh'){ N.h=null; N.aud=audienceFixe; }
      else if(c==='quand'){
        if(N.quand!==v){ N.quand=v; oublierLieu(); N.ou=''; }
        if(v==='now'){
          N.ou='ici'; if(!N.pt&&!N.posBusy) localiser();
          return aller('where');
        }
      }
      else if(c==='ou'){ if(N.ou===v) return; N.ou=v; oublierLieu(); if(v==='ici') localiser(); }
      else if(c==='retry') localiser();
      else if(c==='find') return void chercherAdresse();
      else if(c==='hit'){ const x=N.hits[+v]; if(!x) return; N.hit=+v; return poser(x,'adresse',x.nom); }
      else if(c==='carte') return surLaCarte();
      else if(c==='replace'){ ++N.mediaSeq; N.mediaOk=false; lacher(); }
      /* le plafond de la box : un tap de plus, et il DIT ce qu'il ouvre (`audHTML`) */
      else if(c==='demanderbox'){ N.confirmerBox=v||''; N.note=''; }
      else if(c==='ouvrirbox') return void ouvrirLaBox(v
        ?(habits.liste()||[]).find(h=>String(habits.id(h))===v):N.h);
      else if(c==='aud'){ N.aud=v; N.note=''; }
      else if(c==='mode'){ N.mode=v; return aller('duration'); }
      else if(c==='dur'){ N.dur=+v; return aller('publish'); }
      else return;
      peindre();
    });
    p.addEventListener('keydown',e=>{ const t=e.target.closest&&e.target.closest('.sfb[data-ns]');
      if(t&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); t.click(); } });
    p.addEventListener('input',e=>{
      const f=e.target.closest('[data-nsi]'); if(!f||N.occupe) return;
      const k=f.dataset.nsi;
      if(k==='mot') N.mot=f.value;
      else if(k==='place') N.place=f.value;
      else if(k==='adr') modifierAdresse(p,f.value);
      else if(k==='date'||k==='time'||k==='dur'){
        N[k]=k==='dur'?(f.valueAsNumber||0):f.value;
        if(k==='dur') p.querySelectorAll('[data-ns="dur"]').forEach(b=>{
          const on=+b.dataset.v===N.dur; b.classList.toggle('is-on',on); b.setAttribute('aria-pressed',on);
        });
        actualiserSuite();
      }
    });
    p.addEventListener('keydown',e=>{
      if(e.key!=='Enter') return;
      const k=e.target.dataset.nsi;
      if(k==='adr'){ e.preventDefault(); e.target.blur(); chercherAdresse(); }
      else if(k==='date'||k==='time'||k==='dur') p.querySelector('[data-ns="continue"]')?.click();
    });
  } }
  { const b=$('rdr-pique'); if(b) b.addEventListener('click',()=>carte.moteur.piquer(null)); }
  window.addEventListener('keydown',e=>{
    const p=pan(), pique=carte.moteur.pique();
    if(e.key==='Tab'&&(pique||(p&&!p.hidden))){
      const h=pique?$('rdr-choix-carte'):p;
      const touches=(h?[...h.querySelectorAll('button,input,textarea,video[controls],[tabindex="0"]')]:[$('rdr-pique')])
        .filter(b=>b?.tabIndex>=0&&!b.disabled&&b.getClientRects().length&&getComputedStyle(b).visibility!=='hidden');
      const i=touches.indexOf(document.activeElement);
      if(i<0||(e.shiftKey?i===0:i===touches.length-1)){
        e.preventDefault();
        (touches[e.shiftKey?touches.length-1:0]||p.querySelector('.take-stage'))?.focus({preventScroll:true});
      }
      return;
    }
    if(e.key!=='Escape') return;
    if(pique){ e.preventDefault(); e.stopImmediatePropagation(); carte.moteur.piquer(null); return; }
    if(p&&!p.hidden){ e.preventDefault(); e.stopImmediatePropagation(); if(!N.occupe) fermer(); }
  },{capture:true});
  /* 25/11 — la PRISE RAPIDE : le média est déjà pris, le questionnaire s'ouvre dessus */
  async function prise(f){
    if(!ouvrir(null,true)) return {ok:false};
    const draft=N;
    rendrePrise(pan(),'data-ns="close"',railPrise('Spot',ETAPES,'media','data-ns="stage"',accessible),
      'media','<p class="lv-note" role="status">Preparing media…</p>');
    const r=await prendre(f).catch(e=>{ console.error('[spot media]',e?.message||e); return {ok:false}; });
    if(draft!==N) return r;
    if(r.ok){ N.mediaOk=true; aller('habit'); }
    else{ dire(({long:(R.clip_seconds||33)+' s at most',lourd:'48 MB at most'})[r.why]||'choose a photo or video'); peindre(); }
    return r;
  }
  return {ouvrir, fermer, prise, ouvert:()=>document.body.classList.contains('is-nspot'),
          etat:()=>Object.assign({ouvert:document.body.classList.contains('is-nspot'), habit:!!N.h, etape:N.etape, quand:N.quand, media:!!N.media,
            aud:N.aud, ou:N.ou, mode:N.mode, pt:!!N.pt, ptSrc:N.ptSrc, hits:N.hits.length, dur:N.dur}, diag)};
}
/* ══ fin LA PRISE DE SPOT ══ */
