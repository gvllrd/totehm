/* ══ LA CAPTURE DE MÉDIA — copié de tools/spot_capture.js ══ */
/* Une photo n'a pas besoin de plus de 1 600 px dans un TOTEHM : JPEG, rien d'autre ne sort de l'appareil. */
async function emReduire(f){
  const url=URL.createObjectURL(f);
  try{
    const img=await new Promise((ok,ko)=>{ const i=new Image(); i.onload=()=>ok(i); i.onerror=ko; i.src=url; });
    const k=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight)), c=document.createElement('canvas');
    c.width=Math.round(img.naturalWidth*k); c.height=Math.round(img.naturalHeight*k);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    return await new Promise(ok=>c.toBlob(ok,'image/jpeg',.86));
  }catch(_){ return null; }
  finally{ URL.revokeObjectURL(url); }
}

function apercuPrise(url,type,nom=''){
  const src=esc(url), visuel=/^image\//.test(type)?'<img src="'+src+'" alt="Selected photo">'
    :/^video\//.test(type)?'<video src="'+src+'" controls playsinline preload="metadata" aria-label="Selected video"></video>'
    :/^audio\//.test(type)?'<audio src="'+src+'" controls preload="metadata" aria-label="Selected audio"></audio>':'';
  return '<figure class="take-preview">'+visuel+(nom?'<figcaption>'+esc(nom)+'</figcaption>':'')+'</figure>';
}
function railPrise(nom,etapes,actif,action,accessible,occupe=false){
  const a=etapes.findIndex(([k])=>k===actif);
  return '<nav class="sf-nav take-rail'+(etapes.length>4?' is-spot':'')+'" aria-label="'+nom+'">'
    +etapes.map(([k,mot],i)=>'<button type="button" '+action+' data-v="'+k+'"'
      +(i===a?' aria-current="step"':i<a?' class="is-done"':'')
      +(occupe||!accessible(k)?' disabled':'')+'>'+mot+'</button>').join('')+'</nav>';
}
function actionPrise(attribut,nom,secondaire=false,inactive=false){
  return '<button type="button" '+attribut+' class="'+(secondaire?'take-secondary':'take-primary')+'"'
    +(inactive?' disabled':'')+'>'+esc(nom)+'</button>';
}
function rendrePrise(p,croix,rail,etape,contenu){
  const phase=p.dataset.etapePrise!==etape;
  const actif=p.contains(document.activeElement)?document.activeElement:null;
  const cible=actif&&actif.dataset;
  p.dataset.etapePrise=etape;
  p.innerHTML=toucheFermer(croix)+rail+'<div class="take-stage'+(phase?' is-entering':'')
    +'" role="group" tabindex="-1">'+contenu+'</div>';
  const stage=p.querySelector('.take-stage');
  const onglet=p.querySelector('.take-rail [aria-current="step"]');
  if(onglet){
    onglet.id=p.id+'-current-step';
    stage.setAttribute('aria-labelledby',onglet.id);
  }
  if(phase){ p.scrollTop=0; stage.focus({preventScroll:true}); }
  else if(cible){
    const k=cible.nsi||cible.ns||cible.sf;
    if(k){
      const remplaçant=[...p.querySelectorAll('[data-nsi],[data-ns],[data-sf]')]
        .find(n=>(n.dataset.nsi||n.dataset.ns||n.dataset.sf)===k&&n.dataset.v===cible.v&&!n.disabled);
      remplaçant?.focus({preventScroll:true});
      if(remplaçant?.tagName==='TEXTAREA'||(remplaçant?.tagName==='INPUT'&&remplaçant.type==='text')){
        if(actif.selectionStart!=null) remplaçant.setSelectionRange(actif.selectionStart,actif.selectionEnd);
      }
    }
  }
  return stage;
}

/* ══ LA CAPTURE (PHOTO · VIDEO · IMPORT) · 15/10/2026 ═══════════════════════════════════════════════════
   Elle naît de l'élément touché et y retourne ; elle n'est plus une vue de l'atterrissage. Au doigt, l'appareil
   photo du téléphone (`capture`) ; sur ordinateur, la caméra (getUserMedia : une photo, ou une vidéo ≤ 60 s) ;
   IMPORT, un fichier (photo, vidéo, PDF, son, texte ; 50 Mo au plus). Rien n'est publié. */
function creerCapture(autorisee){
  const root=$('cap'), inn=$('cap-in'), note=$('cap-note'), cam=$('cap-cam'), vid=$('cap-v'), shot=$('cap-shot'), tt=$('cap-t');
  const choix=$('cap-row'), revenir=$('cap-back');
  const fP=$('cap-f-photo'), fV=$('cap-f-video'), fF=$('cap-f-file');
  const diagC={ouvertures:0, envois:0};
  const vide={ouvrir(){}, fermer(){}, ouvert:()=>false, etat:()=>diagC};
  if(!root) return vide;
  let opt=null, flux=null, rec=null, morceaux=[], mode='', t0=0, tick=0, occupe=false, retour=null, hote=null;
  let depuisCam=0;
  const fichiers=new Map();
  const ACCEPT=fF.accept, ACCEPT_SPOT='image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime';
  const MAX=()=>opt&&opt.max||60;
  const doigt=()=>!window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const peutCam=()=>!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)&&!doigt();
  const dire=t=>{ note.textContent=t||''; };
  function arreterCam(){
    depuisCam++;
    clearInterval(tick); tick=0; tt.textContent=''; shot.classList.remove('is-rec');
    if(rec){
      rec.onstop=null; rec.ondataavailable=null;
      if(rec.state!=='inactive'){ try{ rec.stop(); }catch(_){} }
    }
    rec=null; morceaux=[];
    if(flux){ flux.getTracks().forEach(t=>t.stop()); flux=null; }
    vid.srcObject=null; cam.classList.add('hide'); mode=''; choix.hidden=false; revenir.hidden=true;
  }
  /* En ligne, la feuille se monte dans l'étape qui demande le média. La prise rapide la montre en modale. */
  function rendre(){
    if(!hote) return;
    hote=null; inn.classList.remove('is-inline'); root.insertBefore(inn,root.firstChild); fF.accept=ACCEPT;
  }
  function ouvrir(o){
    if(!autorisee()) return;
    fermer(); opt=o; dire(''); occupe=false; arreterCam();
    if(!opt.tout) fF.accept=ACCEPT_SPOT;
    if(opt.hote){
      hote=opt.hote; hote.appendChild(inn); inn.classList.add('is-inline'); diagC.ouvertures++; return;
    }
    retour=document.activeElement; diagC.ouvertures++;
    root.classList.add('is-on'); root.setAttribute('aria-hidden','false');
    setTimeout(()=>{ if(opt===o) root.querySelector('.cap-b')?.focus({preventScroll:true}); },60);
  }
  function fermer(){
    if(hote){ arreterCam(); rendre(); opt=null; return; }
    if(!root.classList.contains('is-on')) return;
    arreterCam(); root.classList.remove('is-on'); root.setAttribute('aria-hidden','true'); opt=null; fF.accept=ACCEPT;
    if(retour?.isConnected) retour.focus({preventScroll:true});
    retour=null;
  }
  async function camera(m){
    const s=depuisCam;
    let nouveau;
    dire('opening camera…');
    try{ nouveau=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:1280}},audio:m==='video'}); }
    catch(e){ if(s===depuisCam){ console.error('[capture] camera',e&&e.name||e); dire('no camera · import a file'); } return; }
    if(!opt||s!==depuisCam){ nouveau.getTracks().forEach(t=>t.stop()); return; }
    flux=nouveau; mode=m; vid.srcObject=flux; cam.classList.remove('hide'); choix.hidden=true; revenir.hidden=false; dire('');
    shot.setAttribute('aria-label',m==='photo'?'Take the photo':'Record');
    shot.focus({preventScroll:true});
    try{ await vid.play(); }catch(_){}
  }
  async function envoyer(f,nom){
    if(!opt||occupe) return; occupe=true;
    const o=opt; dire('preparing…');
    let r;
    try{ r=await o.prendre(f,nom); }
    catch(e){ console.error('[capture]',e?.message||e); }
    if(o!==opt) return;
    occupe=false;
    if(r?.ok){ diagC.envois++; dire(''); fermer(); o.fini?.(); return; }
    dire(({type:'choose a supported file',size:'50 MB at most',media:'choose a photo or video',
      long:MAX()+' s at most',lourd:'48 MB at most'})[r?.why]||'could not prepare · try again');
  }
  root.addEventListener('click',e=>{ if(e.target===root) fermer(); });
  inn.addEventListener('click',async e=>{
    const b=e.target.closest('[data-capk]'); if(!b) return;
    const k=b.dataset.capk;
    if(occupe) return;
    if(k==='file'){ arreterCam(); dire(''); fichiers.set(fF,opt); fF.value=''; fF.click(); return; }
    if(peutCam()){ arreterCam(); await camera(k); return; }
    const f=k==='photo'?fP:fV; fichiers.set(f,opt); f.value=''; f.click();
  });
  [fP,fV,fF].forEach(f=>f.addEventListener('change',()=>{
    const actif=fichiers.get(f), x=f.files?.[0]; fichiers.delete(f);
    if(x&&(!actif||actif===opt)) envoyer(x,x.name);
  }));
  revenir.onclick=()=>{ if(!occupe){ arreterCam(); dire(''); choix.querySelector('.cap-b')?.focus({preventScroll:true}); } };
  shot.addEventListener('click',()=>{
    if(!flux||occupe) return;
    if(mode==='photo'){
      const c=document.createElement('canvas'), w=vid.videoWidth||1280, h=vid.videoHeight||960;
      c.width=w; c.height=h; c.getContext('2d').drawImage(vid,0,0,w,h);
      const s=depuisCam;
      c.toBlob(b=>{ if(b&&s===depuisCam) envoyer(new File([b],'photo.jpg',{type:'image/jpeg'}),'photo.jpg'); },'image/jpeg',.9); return;
    }
    if(rec&&rec.state==='recording'){ rec.stop(); return; }
    const t=['video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(x=>window.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(x))||'';
    try{ rec=new MediaRecorder(flux,t?{mimeType:t}:undefined); }catch(e){ console.error('[capture] recorder',e&&e.message||e); dire('try again'); return; }
    morceaux=[]; rec.ondataavailable=ev=>{ if(ev.data&&ev.data.size) morceaux.push(ev.data); };
    rec.onstop=()=>{ const ty=((rec&&rec.mimeType)||t||'video/webm').split(';')[0], b=new Blob(morceaux,{type:ty}), n='video.'+(ty==='video/mp4'?'mp4':'webm');
      clearInterval(tick); tick=0; tt.textContent=''; shot.classList.remove('is-rec'); shot.setAttribute('aria-label','Record');
      if(b.size) envoyer(new File([b],n,{type:ty}),n); };
    try{ rec.start(1000); }catch(e){ console.error('[capture] recorder',e?.message||e); dire('try again'); return; }
    t0=Date.now(); shot.classList.add('is-rec'); shot.setAttribute('aria-label','Stop recording');
    tt.textContent='0:00';
    tick=setInterval(()=>{ const s=Math.floor((Date.now()-t0)/1000); tt.textContent='0:'+String(s).padStart(2,'0'); if(s>=MAX()&&rec&&rec.state==='recording') rec.stop(); },250);
  });
  $('cap-x').onclick=fermer;
  /* Onglet caché : la caméra s'éteint (pas pendant un enregistrement, il finirait coupé). */
  document.addEventListener('visibilitychange',()=>{ if(document.hidden&&flux&&!(rec&&rec.state==='recording')){ arreterCam(); dire(''); } });
  window.addEventListener('keydown',e=>{
    if(!root.classList.contains('is-on')) return;
    if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); fermer(); return; }
    if(e.key==='Tab'){ const f=[...root.querySelectorAll('button:not(:disabled)')].filter(x=>x.getClientRects().length); if(!f.length) return;
      const i=f.indexOf(document.activeElement), j=e.shiftKey?(i<=0?f.length-1:i-1):(i<0||i===f.length-1?0:i+1); e.preventDefault(); f[j].focus(); return; }
    e.stopImmediatePropagation();                           /* la feuille est modale : rien ne navigue dessous */
  },{capture:true});
  return {ouvrir, fermer, ouvert:()=>root.classList.contains('is-on'), inline:()=>!!hote, dans:el=>!!(hote&&el&&el.contains(hote)),
          etat:()=>Object.assign({ouvert:root.classList.contains('is-on'), inline:!!hote, camera:!!flux}, diagC)};
}
/* ══ fin LA CAPTURE DE MÉDIA ══ */
