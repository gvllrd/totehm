/* ══ LE PASS DU SPOT — tools/spot_pass.js ══ */
/* ══ LE PASS D'INVITATION D'UN SPOT · 23/11 ══ Wah : « pour que le membre puisse cut off facilement, il faut créer à chaque
   fois un pass invitation automatique au spot pour vérification, et qu'un membre puisse [Cut off] la personne ».
   L'abonné : son pass, créé au premier regard (`spot_pass_mine`) — son nom, le spot, un code à montrer sur place.
   Le créateur : les passes de SON spot (`spot_passes_for`), un code vérifié (`spot_pass_check`) et [Cut off] en deux gestes
   (`creator-cut-off` : l'abonnement s'arrête, le pass ne se vérifie plus). Le serveur décide de tout. */
function creerPassSpot({sb,couperAcces,session}){
  const diag={mien:0, listes:0, verifs:0, coupes:0};
  let arme=null, armeT=0, sequence=0, retour=null;
  const ouvert=()=>!!($('spass')&&!$('spass').hidden);
  function suivre(){
    const s=++sequence, uid=session();
    return ()=>s===sequence&&!!uid&&uid===session()&&ouvert();
  }
  function feuille(){ let f=$('spass'); if(f) return f;
    f=document.createElement('div'); f.id='spass'; f.hidden=true; f.setAttribute('role','dialog'); f.setAttribute('aria-modal','true'); f.setAttribute('aria-label','Spot passes');
    f.innerHTML='<div class="sp-c"></div>'; document.body.appendChild(f);
    f.addEventListener('click',e=>{ if(e.target===f||e.target.closest('[data-sp="x"]')) fermer(); });
    window.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!f.hidden){ e.preventDefault(); e.stopImmediatePropagation(); fermer(); } },{capture:true});
    return f; }
  const carte=()=>feuille().querySelector('.sp-c');
  function ouvrir(h){ const f=feuille(); if(f.hidden) retour=document.activeElement; carte().innerHTML=toucheFermer('data-sp="x"')+h; f.hidden=false;
    const cible=f.querySelector('button:not(.side-close),input')||f.querySelector('.side-close');
    cible?.focus({preventScroll:true}); }
  function fermer(){
    const f=$('spass'); if(f) f.hidden=true;
    sequence++; arme=null; clearTimeout(armeT);
    if(retour?.isConnected) retour.focus({preventScroll:true});
    retour=null;
  }
  const quand=z=>{ try{ const d=new Date(z.starts_at); return isNaN(d)?'':d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' · '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }catch(_){ return ''; } };
  async function mien(z){
    const courant=suivre(); diag.mien++; ouvrir('<p class="sp-k">pass</p><p class="sp-p">…</p>');
    const {data,error}=await sb.rpc('spot_pass_mine',{p_spot:String(z.id)});
    if(!courant()) return;
    if(error){ console.error('[spot_pass_mine]',error.message); ouvrir('<p class="sp-k">pass</p><p class="sp-p">try again</p>'); return; }
    if(!data||!data.ok){ const w=data&&data.why;
      ouvrir('<p class="sp-k">pass</p><p class="sp-p">'+esc(({not_subscriber:'Subscribe to '+(z.creator||'this member')+' to get your pass to this spot.',banned:'This ecosystem is closed to you.',self:'This is your own spot.'})[w]||'This pass is not available.')+'</p>'); return; }
    ouvrir('<p class="sp-k">invited by '+esc(data.creator||'')+'</p><p class="sp-n">'+esc(data.pseudo||'')+'</p>'
      +'<p class="sp-h">'+esc(data.habit||'')+(quand(data)?' · '+esc(quand(data)):'')+'</p>'
      +'<p class="sp-code" aria-label="pass code">'+esc(data.code||'')+'</p>'
      +'<p class="sp-p">Show this pass at the spot. '+esc(data.creator||'The member')+' checks it — and can cut off anyone who does not respect the spot.</p>');
  }
  function lignes(l){ return l.length?l.map(x=>'<div class="sp-r"><span><b>'+esc(x.pseudo)+'</b> <i>'+esc(x.code)+'</i></span>'
      +'<button type="button" data-cut="'+esc(x.pseudo)+'"'+(arme===x.pseudo?' class="is-sur"':'')+'>'+(arme===x.pseudo?'cut off?':'cut off')+'</button></div>').join('')
      :'<p class="sp-p">No pass yet. A pass is created when one of your subscribers opens this spot.</p>'; }
  async function liste(z){
    const courant=suivre(); arme=null; clearTimeout(armeT); diag.listes++; ouvrir('<p class="sp-k">passes</p><p class="sp-p">…</p>');
    const {data,error}=await sb.rpc('spot_passes_for',{p_spot:String(z.id)});
    if(!courant()) return;
    if(error||!data||!data.ok){ if(error) console.error('[spot_passes_for]',error.message); ouvrir('<p class="sp-k">passes</p><p class="sp-p">try again</p>'); return; }
    peindre(z,data.items||[]);
  }
  function peindre(z,l){
    ouvrir('<p class="sp-k">passes · '+esc(z.habit||'')+'</p>'
      +'<div class="sp-f"><input data-sp="code" maxlength="6" autocomplete="off" spellcheck="false" placeholder="code" aria-label="A pass code"><button type="button" data-sp="check">check</button></div>'
      +'<p class="sp-p" data-sp="dit" role="status"></p><div class="sp-l">'+lignes(l)+'</div>');
    const c=carte();
    c.querySelector('[data-sp="check"]').onclick=()=>verifier(z);
    c.querySelector('[data-sp="code"]').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); verifier(z); } });
    c.querySelector('.sp-l').onclick=e=>{ const b=e.target.closest('[data-cut]'); if(b) couper(z,b,l); };
  }
  const dit=t=>{ const n=carte().querySelector('[data-sp="dit"]'); if(n) n.textContent=t||''; };
  async function verifier(z){
    const v=String(carte().querySelector('[data-sp="code"]').value||'').trim().toUpperCase(); if(!v) return;
    const courant=suivre(); diag.verifs++; dit('…');
    const {data,error}=await sb.rpc('spot_pass_check',{p_spot:String(z.id),p_code:v});
    if(!courant()) return;
    if(error){ console.error('[spot_pass_check]',error.message); dit('try again'); return; }
    dit(data&&data.ok?'✓ '+data.pseudo+' · valid pass':({unknown:'unknown code',cut_off:'cut off · no longer subscribed'})[data&&data.why]||'not valid');
  }
  async function couper(z,b,l){
    const n=b.dataset.cut;
    if(arme!==n){ arme=n; clearTimeout(armeT); armeT=setTimeout(()=>{ arme=null; peindre(z,l); },6000); peindre(z,l);
      dit(n+' loses access now, with no refund, and can never subscribe to you again.'); return; }
    clearTimeout(armeT); arme=null; b.disabled=true; dit('…');
    const courant=suivre(), ok=await couperAcces(n);
    if(!courant()) return;
    if(!ok){ dit('try again'); b.disabled=false; return; }
    diag.coupes++; await liste(z); if(ouvert()) dit(n+' is cut off.');
  }
  return {mien,liste,fermer,ouvert,etat:()=>({...diag,ouvert:ouvert()})};
}
/* ══ fin LE PASS DU SPOT ══ */
