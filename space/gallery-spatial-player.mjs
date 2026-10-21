import { ORIGINS, TOTEHMPAPER } from './gallery-artworks.mjs';
import { SIGNS, PHRASES } from './gallery-spatial-data.mjs';

const STORAGE='https://abujjbkbbiumxrokozph.supabase.co';
const PUBLIC=STORAGE+'/storage/v1/object/public/';
// The eleven original sequences from stoner.html. {H} always uses the brand SVG.
const METHOD=[
 'Wassup? {H} Self-knowledge',
 'Repulse mentally that sh*t. {H} your brain.',
 'Just breathe and feel your heart. {H} your peace.',
 '{H} your breath.',
 '{H} your consciousness. Here. Now. Around. Inside.',
 'Visualize your objectives and determine your next steps. {H} your strategy.',
 'Make it Happen. {H} Performance.',
 'Step by step.',
 'Love each step. Trust the way. {H} mentality.',
 'Express your emotions through art. {H} your Self.',
 'Master your Time. Get {H} again.'
];
const checkedSelection=value=>{
 if(value?.kind==='origin'&&Number.isInteger(value.index)&&ORIGINS[value.index])return {kind:'origin',index:value.index};
 if(value?.kind==='sign'&&Object.hasOwn(SIGNS,value.key))return {kind:'sign',key:value.key};
 if(value?.kind==='paper')return {kind:'paper'};
 return null;
};
const money=(c,currency)=>{
 if(!Number.isFinite(c)||typeof currency!=='string')return '—';
 try{return new Intl.NumberFormat('en',{style:'currency',currency:currency.toUpperCase(),minimumFractionDigits:c%100?2:0}).format(c/100);}catch{return '—';}
};
const errorText={thp_required:'A TotehmPaper and one Habit Box open collecting.',thp_door:'Collect your TotehmPaper here first.',sold_out:'Every studio edition is owned.',reserved:'This edition is being collected. Please try again later.',held:'This edition is being collected. Please try again later.',own:'This edition is already yours.',mine:'This edition is already yours.',no_session:'Connect again to continue.',unavailable:'This edition is no longer available.',waiver_required:'Please confirm immediate access to continue.'};

export function createSpatialPlayer({services,onMedia=()=>{},onClose=()=>{},onChange=()=>{},onSelect=()=>{}}={}){
 const root=document.createElement('aside');root.id='spatial-player';root.hidden=true;
 root.setAttribute('aria-label','Artwork in the space');
 root.innerHTML=`<div class="sp-player-head"><p id="sp-player-kind"></p><button type="button" id="sp-player-close" aria-label="Close artwork">×</button></div>
 <h2 id="sp-player-title"></h2><p id="sp-player-phrase"></p>
 <div class="sp-player-media"><img id="sp-player-poster" alt=""><video id="sp-player-video" playsinline muted preload="none"></video></div>
 <div id="sp-player-transport"><button type="button" id="sp-player-play">Play</button><button type="button" id="sp-player-sound" aria-pressed="false">Sound off</button></div>
 <div id="sp-player-method" hidden><p id="sp-player-step"></p><div id="sp-player-choice" hidden><button type="button" id="sp-player-low">Low</button><button type="button" id="sp-player-high">High</button></div><div id="sp-player-step-nav"><button type="button" id="sp-player-prev">Previous</button><button type="button" id="sp-player-next">Next</button></div></div>
 <div class="sp-player-actions"><button type="button" id="sp-player-enter-method" hidden>Enter the experience</button><button type="button" id="sp-player-collect" aria-expanded="false" aria-controls="sp-player-offer">Collect</button></div>
 <div id="sp-player-offer" hidden><div class="sp-player-price"><strong id="sp-player-price">—</strong><span id="sp-player-edition"></span></div><p id="sp-player-owned" hidden></p><p id="sp-player-gate" hidden></p><button type="button" id="sp-player-gate-action" hidden></button><label id="sp-player-waiver" hidden><input type="checkbox" id="sp-player-consent"> <span>I ask for immediate access to this digital work and give up my 14-day withdrawal right.</span></label><button type="button" id="sp-player-buy" hidden>Collect this work</button><div id="sp-player-resales"></div></div>
 <p id="sp-player-note" role="status" aria-live="polite"></p><button type="button" id="sp-player-retry" hidden>Try again</button>`;
 document.body.append(root);
 const el=id=>root.querySelector('#sp-player-'+id),video=el('video');
 video.muted=true;video.playsInline=true;video.loop=true;
 const listeners=[];
 const listen=(target,event,fn,options)=>{target.addEventListener(event,fn,options);listeners.push(()=>target.removeEventListener(event,fn,options));};
 let selection=null,opened=false,visible=true,fallback=false,disposed=false,ready=false,wantPlay=false;
 let seq=0,detailSeq=0,mediaSeq=0,methodSeq=0,paymentSeq=0,loadCancel=null,abort=null,blobURL=null,detail=null,market=null,loading=false,paying=false,error=null;
 let methodStep=-1,methodMode=null,grant=null,grantAt=0,grantTTL=900,methodLoading=false,methodEnded=false;
 let cachedServices=null,cataloguePromise=null,authSubscription=null,authUser=undefined,previousFocus=null,retryAction=null;
 const active=token=>!disposed&&opened&&token===seq;
 const mayPlay=()=>opened&&visible&&!document.hidden&&!disposed&&wantPlay&&ready;
 const changed=()=>{if(!disposed)onChange();};
 const report=(where,err)=>console.error('[spatial-player] '+where,err?.code||err?.name||'unavailable');
 function note(text='',kind=null){el('note').textContent=text;error=kind;changed();}
 function branded(target,text){
  target.replaceChildren();for(const bit of String(text||'').split(/(\{H\}|\bHigher\b)/g)){
   if(bit==='{H}'||bit==='Higher'){const img=document.createElement('img');img.src='/assets/gallery/higher.svg';img.alt='Higher';img.className='sp-player-higher';target.append(img);}
   else target.append(document.createTextNode(bit));
  }
 }
 async function getServices(){
  if(!cachedServices)cachedServices=Promise.resolve().then(()=>services()).then(value=>{
   if(!value?.sb)throw new Error('Account service unavailable');
   if(!authSubscription&&!disposed){
    const result=value.sb.auth.onAuthStateChange?.((event,nextSession)=>{
     const user=nextSession?.user?.id||null,changedUser=authUser!==undefined&&authUser!==user;
     authUser=user;
     if(event==='SIGNED_OUT'||changedUser){
      grant=null;grantAt=0;
      // A private request already in flight must not restore playback after
      // its account has changed, even if the response arrived before abort().
      if(opened&&(methodStep>=0||methodLoading)){clearMedia();methodStep=-1;methodLoading=false;paintMethod();note('Connect with your Totehm to enter the experience.','signin');}
     }
     if(event==='SIGNED_IN'||event==='SIGNED_OUT'){
      cataloguePromise=null;detailSeq++;
      if(opened)setTimeout(()=>{if(opened&&!disposed)loadDetail(seq);},0);
     }
    });
    authSubscription=result?.data?.subscription||null;
   }
   return value;
  }).catch(err=>{cachedServices=null;throw err;});
  return cachedServices;
 }
 async function session(){const {sb}=await getServices();const {data,error}=await sb.auth.getSession();if(error)throw error;return data?.session||null;}
 function remember(key){try{sessionStorage.setItem(key,JSON.stringify({selection,at:Date.now()}));}catch{}}
 async function login(){
  remember('space-spatial-resume');
  try{const account=await getServices();await account.login();}catch(err){report('sign in',err);note('Connection is unavailable. Please try again.','signin');}
 }
 function transport(){
  el('transport').hidden=!ready;
  el('play').textContent=video.paused?'Play':'Pause';el('play').setAttribute('aria-label',video.paused?'Play artwork':'Pause artwork');
  el('sound').textContent=video.muted?'Sound off':'Sound on';el('sound').setAttribute('aria-pressed',String(!video.muted));changed();
 }
 async function play(){
  if(!mayPlay()){video.pause();transport();return;}
  const token=mediaSeq;
  try{await video.play();if(token===mediaSeq&&!mayPlay())video.pause();}
  catch(err){if(token===mediaSeq&&opened&&visible&&err?.name!=='AbortError')note('Press Play to start the artwork.');}
  transport();
 }
 function clearMedia(){
  mediaSeq++;methodSeq++;loadCancel?.();loadCancel=null;abort?.abort();abort=null;
  wantPlay=false;ready=false;video.pause();video.removeAttribute('src');video.load();
  if(blobURL){URL.revokeObjectURL(blobURL);blobURL=null;}
  onMedia(null,null);transport();
 }
 function videoSource(url,mediaSelection,token,{privateBlob=false,loop=true}={}){
  if(!active(token))return Promise.resolve(false);
  const current=++mediaSeq;loadCancel?.();loadCancel=null;
  video.pause();ready=false;video.loop=loop;wantPlay=true;
  if(privateBlob)video.removeAttribute('crossorigin');else video.crossOrigin='anonymous';
  video.src=url;video.load();transport();
  return new Promise(resolve=>{
   let settled=false,timer;
   const cleanup=()=>{clearTimeout(timer);video.removeEventListener('loadeddata',finish);video.removeEventListener('canplay',finish);video.removeEventListener('error',failed);if(loadCancel===cancel)loadCancel=null;};
   const settle=value=>{if(settled)return;settled=true;cleanup();resolve(value);};
   const cancel=()=>settle(false);loadCancel=cancel;
   function finish(){
    if(!active(token)||current!==mediaSeq)return settle(false);
    if(video.readyState<2)return;
    ready=true;el('poster').hidden=true;onMedia(video,mediaSelection);play();transport();settle(true);
   }
   function failed(){
    if(!active(token)||current!==mediaSeq)return settle(false);
    ready=false;wantPlay=false;video.pause();onMedia(null,null);el('poster').hidden=false;
    note('This artwork could not load. Please try again.','media');retryAction=()=>selection?.kind==='paper'&&methodStep>=0?loadMethod(methodStep):open(selection);el('retry').hidden=false;transport();settle(false);
   }
   video.addEventListener('loadeddata',finish);video.addEventListener('canplay',finish);video.addEventListener('error',failed);
   timer=setTimeout(failed,20000);if(video.readyState>=2)finish();
  });
 }
 async function catalogue(){
  if(!cataloguePromise){
   const request=getServices().then(async({sb})=>{
    const {data,error}=await sb.rpc('market_view',{p_collection:null,p_slug:null});
    if(error)throw error;if(!data||!Array.isArray(data.works))throw new Error('Catalogue unavailable');return data;
   }).catch(err=>{if(cataloguePromise===request)cataloguePromise=null;throw err;});
   cataloguePromise=request;
  }
  return cataloguePromise;
 }
 function targetMedia(){return selection?.kind==='origin'?ORIGINS[selection.index].media:selection?.kind==='sign'?'play-signals/'+selection.key+'.mp4':null;}
 function drawOffer(){
  const d=detail,thp=d?.slug==='totehmpaper',mine=d?.owners?.filter(o=>o.mine)||[];
  el('collect').hidden=!d;el('collect').textContent=mine.length?'Your edition':'Collect';
  root.querySelector('.sp-player-price').hidden=!d;
  el('price').textContent=d?money(d.price_cents,d.currency):'—';
  el('edition').textContent=d?`${d.available} / ${d.edition_total} available`:'';
  el('owned').hidden=!mine.length;el('owned').textContent=mine.length?'Yours · № '+mine.map(o=>o.edition).join(', '):'';
  el('gate').hidden=true;el('gate-action').hidden=true;el('waiver').hidden=true;el('buy').hidden=true;el('buy').disabled=paying;el('resales').replaceChildren();
  if(!d)return;
  if(d.available>0&&!(thp&&mine.length)){
   if(market?.signed_in&&!thp&&!market.can_buy_art){
    const needPaper=!market.door?.thp;el('gate').hidden=false;el('gate').textContent=needPaper?'A TotehmPaper opens collecting.':'Add one Habit Box to your Totehm to collect.';
    el('gate-action').hidden=false;el('gate-action').textContent=needPaper?'Discover TotehmPaper':'Open my Totehm';el('gate-action').dataset.action=needPaper?'paper':'habit';
   }else{
    el('waiver').hidden=!market?.signed_in;el('buy').hidden=false;
    el('buy').textContent=market?.signed_in?'Collect · '+money(d.price_cents,d.currency):'CONNECT WITH MY TOTEHM';
   }
  }else if(!mine.length){el('gate').hidden=false;el('gate').textContent='Every studio edition is owned.';}
  for(const owner of d.owners||[]){
   if(owner.mine||!Number.isFinite(owner.price_cents))continue;
   const row=document.createElement('div');row.className='sp-player-resale';const caption=document.createElement('span');caption.textContent='Edition № '+owner.edition;
   const button=document.createElement('button');button.type='button';button.textContent=owner.reserved?'Held':'Collect · '+money(owner.price_cents,owner.currency);button.disabled=!!owner.reserved||paying;
   button.dataset.resale=owner.edition_id;row.append(caption,button);el('resales').append(row);
  }
 }
 async function loadDetail(token){
  const request=++detailSeq,current=()=>active(token)&&request===detailSeq;
  loading=true;changed();
  try{
   const list=await catalogue();if(!current())return;
   const work=selection.kind==='paper'?list.works.find(w=>w.slug==='totehmpaper'):list.works.find(w=>w.media===targetMedia());
   if(!work){
    detail=null;market=list;drawOffer();
    if(selection.kind==='sign'){
     el('gate-action').hidden=false;el('gate-action').dataset.action='paper';el('gate-action').textContent='Discover TotehmPaper';el('offer').hidden=false;
    }
    if(error==='catalogue'){note();el('retry').hidden=true;}
    return;
   }
   const {sb}=await getServices();if(!current())return;
   const {data,error:rpcError}=await sb.rpc('market_view',{p_collection:null,p_slug:work.slug});
   if(!current())return;if(rpcError)throw rpcError;if(!data?.detail)throw new Error('Artwork unavailable');
   detail=data.detail;market=data;
   if(selection.kind!=='paper')branded(el('title'),detail.title);
   drawOffer();
   if(error==='catalogue'){note();el('retry').hidden=true;}
  }catch(err){
   if(!current())return;report('market_view',err);detail=null;market=null;drawOffer();
   note('Collecting is temporarily unavailable. You can still explore.','catalogue');
   retryAction=()=>loadDetail(seq);el('retry').hidden=false;
  }finally{if(current()){loading=false;changed();}}
 }
 async function fetchGate(token,request,signal){
  const current=()=>active(token)&&request===methodSeq&&!signal.aborted;
  const member=await session();if(!current())return false;
  if(!member){grant=null;note('Connect with your Totehm to enter the experience.','signin');el('gate-action').dataset.action='login';el('gate-action').textContent='CONNECT WITH MY TOTEHM';el('gate-action').hidden=false;el('offer').hidden=false;return false;}
  const response=await fetch(STORAGE+'/functions/v1/stoner-gate',{method:'POST',headers:{Authorization:'Bearer '+member.access_token,'Content-Type':'application/json'},signal});
  const data=await response.json();if(!current())return false;
  if(!response.ok)throw new Error('Gate unavailable');
  if(data.access!==true){grant=null;note('Collect a TotehmPaper to enter The Stoner Experience.','locked');el('offer').hidden=false;el('collect').setAttribute('aria-expanded','true');return false;}
  grant=data.urls||{};grantAt=Date.now();grantTTL=Number.isFinite(data.expires_in)?Math.max(30,data.expires_in):900;return true;
 }
 function safePrivateURL(value){
  const url=new URL(value);if(url.origin!==STORAGE||!url.pathname.startsWith('/storage/v1/object/sign/stoner-method/'))throw new Error('Invalid private media');return url.href;
 }
 function paintMethod(){
  const inMethod=selection?.kind==='paper'&&methodStep>=0;
  el('method').hidden=!inMethod;el('enter-method').hidden=selection?.kind!=='paper'||inMethod;
  el('enter-method').textContent=methodEnded?'Experience again':'Enter the experience';
  el('choice').hidden=methodStep!==0;el('step-nav').hidden=methodStep===0;
  el('step').textContent=inMethod?`${methodStep} / 10`:'';
  if(inMethod)branded(el('phrase'),METHOD[methodStep]);
  else if(selection?.kind==='paper')branded(el('phrase'),methodEnded?'Make it Happen. {H} Performance.':'The Stoner Experience · Art you experience.');
  el('next').textContent=methodStep===10?'Finish':'Next';
  for(const name of ['enter-method','low','high','prev','next'])el(name).disabled=methodLoading;
 }
 async function loadMethod(step){
  if(disposed||!opened||selection?.kind!=='paper'||methodLoading||!Number.isInteger(step)||step<0||step>10)return;
  const token=seq;methodLoading=true;el('retry').hidden=true;note('Opening the experience…');paintMethod();
  clearMedia();abort=new AbortController();const controller=abort,request=methodSeq,current=()=>active(token)&&request===methodSeq&&!controller.signal.aborted;
  try{
   if(!grant||Date.now()-grantAt>(grantTTL-30)*1000){if(!await fetchGate(token,request,controller.signal))return;}
   if(!current())return;
   let source=safePrivateURL(grant[step]);let response=await fetch(source,{signal:controller.signal});
   if(!response.ok){
    if(!await fetchGate(token,request,controller.signal)||!current())return;
    source=safePrivateURL(grant[step]);response=await fetch(source,{signal:controller.signal});
   }
   if(!response.ok)throw new Error('Private media unavailable');
   const blob=await response.blob();if(!current())return;
   blobURL=URL.createObjectURL(blob);methodStep=step;methodEnded=false;paintMethod();
   const shown=await videoSource(blobURL,{kind:'paper',step},token,{privateBlob:true,loop:step!==0});
   if(current()&&shown)note();
  }catch(err){
   if(!current()||err?.name==='AbortError')return;report('method',err);note('The experience could not load. Please try again.','method');
   retryAction=()=>loadMethod(step);el('retry').hidden=false;
  }finally{if(current()){methodLoading=false;paintMethod();changed();}}
 }
 async function chooseMode(mode){
  if(methodStep!==0||methodLoading)return;
  methodMode=mode;try{localStorage.setItem('totehm_entry_mode',mode);}catch{}
  // This existing RPC records only a deliberate Low/High choice, never a preview.
  getServices().then(async({sb})=>{const {error}=await sb.rpc('set_entry_mode',{p_mode:mode});if(error)report('set_entry_mode',error);}).catch(err=>report('set_entry_mode',err));
  loadMethod(mode==='high'?2:1);
 }
 async function buy(resale=null){
  if(paying||!opened||!detail)return;
  // Lock in the click handler, before getSession yields: a double click must
  // never create two checkout sessions for the same deliberate purchase.
  const token=seq,d=detail,payment=++paymentSeq;paying=true;drawOffer();
  try{
   const member=await session();if(!active(token))return;
   if(!member){await login();return;}
   if(!resale&&!el('consent').checked){note('Confirm immediate access to continue.','consent');el('consent').focus();return;}
   if(!resale&&(d.available<=0||(d.slug!=='totehmpaper'&&!market?.can_buy_art)))return;
   if(resale&&!d.owners?.some(o=>o.edition_id===resale&&!o.mine&&!o.reserved&&Number.isFinite(o.price_cents)))return;
   note('Opening secure payment…');
   const fn=resale?'market-checkout':d.slug==='totehmpaper'?'higher-checkout':'artwork-checkout';
   const body=resale?{edition_id:resale}:{...(d.slug==='totehmpaper'?{}:{slug:d.slug}),waiver:true,waiver_ts:new Date().toISOString()};
   const response=await fetch(STORAGE+'/functions/v1/'+fn,{method:'POST',headers:{Authorization:'Bearer '+member.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)});
   const data=await response.json();if(!active(token))return;
   if(data.already){note('This experience is already yours.');grant=null;await loadDetail(token);return;}
   if(!response.ok||!data.url){note(errorText[data.error]||'Payment could not open. Please try again.','checkout');return;}
   const url=new URL(data.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||url.username||url.password||url.port)throw new Error('Invalid payment destination');
   remember('space-spatial-checkout');remember('space-spatial-resume');wantPlay=false;video.pause();
   try{window.top.location.assign(url.href);}catch{location.assign(url.href);}
  }catch(err){if(active(token)){report('checkout',err);note('Payment could not open. Please try again.','checkout');}}
  finally{if(payment===paymentSeq){paying=false;drawOffer();changed();}}
 }
 async function open(value){
  const next=checkedSelection(value);if(!next||disposed)return false;
  const token=++seq;clearMedia();selection=next;opened=true;root.hidden=!visible;document.body.classList.toggle('has-spatial-player',visible);
  previousFocus=document.activeElement;methodStep=-1;methodMode=null;methodEnded=false;methodLoading=false;grant=null;grantAt=0;detail=null;market=null;loading=false;error=null;
  el('consent').checked=false;el('offer').hidden=true;el('collect').setAttribute('aria-expanded','false');el('retry').hidden=true;retryAction=null;note();
  video.muted=true;el('poster').hidden=false;
  if(next.kind==='origin'){
   const art=ORIGINS[next.index];branded(el('title'),art.title);el('kind').textContent=`Origins / Quantum · ${next.index+1} / 20`;el('phrase').textContent='Wah · Digital art';el('poster').src=art.src;el('poster').alt=art.title;
  }else if(next.kind==='sign'){
   branded(el('title'),next.key.replaceAll('_',' '));el('kind').textContent='Neuro Street Art Digital';branded(el('phrase'),PHRASES[next.key]||'');el('poster').src='/assets/signs/'+next.key+'.png';el('poster').alt=next.key.replaceAll('_',' ');
  }else{
   branded(el('title'),TOTEHMPAPER.title);el('kind').textContent='TotehmPaper · By Wah';el('poster').src='/assets/gallery/totehmpaper.png';el('poster').alt='TotehmPaper';
  }
  drawOffer();paintMethod();transport();changed();
  if(next.kind!=='paper')videoSource(PUBLIC+targetMedia(),next,token);
  await loadDetail(token);return active(token);
 }
 function close(){
  if(!opened)return;seq++;opened=false;clearMedia();selection=null;detail=null;market=null;grant=null;methodStep=-1;methodLoading=false;root.hidden=true;document.body.classList.remove('has-spatial-player');
  onClose();changed();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
 }
 function visibility(){root.hidden=!opened||!visible;document.body.classList.toggle('has-spatial-player',opened&&visible);if(mayPlay())play();else video.pause();transport();}
 listen(el('close'),'click',close);
 listen(el('play'),'click',()=>{wantPlay=video.paused;if(wantPlay)play();else video.pause();transport();});
 listen(el('sound'),'click',()=>{video.muted=!video.muted;transport();});
 listen(el('collect'),'click',()=>{el('offer').hidden=!el('offer').hidden;el('collect').setAttribute('aria-expanded',String(!el('offer').hidden));changed();});
 listen(el('buy'),'click',()=>buy());
 listen(el('resales'),'click',event=>{const button=event.target.closest('[data-resale]');if(button)buy(button.dataset.resale);});
 listen(el('gate-action'),'click',()=>{
  const action=el('gate-action').dataset.action;
  if(action==='paper'){onSelect({kind:'paper'});return;}
  if(action==='login'){login();return;}
  if(action==='habit'){remember('space-spatial-resume');location.assign('https://www.totehm.com/totehm');}
 });
 listen(el('enter-method'),'click',()=>loadMethod(0));
 listen(el('low'),'click',()=>chooseMode('low'));listen(el('high'),'click',()=>chooseMode('high'));
 listen(el('prev'),'click',()=>loadMethod(methodMode==='high'&&methodStep===2?0:Math.max(0,methodStep-1)));
 listen(el('next'),'click',()=>{
  if(methodStep<10)loadMethod(methodStep+1);
  else{clearMedia();methodStep=-1;methodEnded=true;el('poster').hidden=false;paintMethod();note();}
 });
 listen(el('retry'),'click',()=>{el('retry').hidden=true;retryAction?.();});
 listen(video,'play',transport);listen(video,'pause',transport);listen(video,'ended',()=>{wantPlay=false;transport();});
 listen(document,'visibilitychange',visibility);
 listen(window,'pagehide',()=>{wantPlay=false;video.pause();transport();});
 listen(root,'keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}});
 return {
  get video(){return video;},root,open,close,
  setVisible(value){visible=!!value;visibility();},
  setFallback(value){fallback=!!value;root.classList.toggle('sp-player-fallback',fallback);changed();},
  diagnostics:()=>({open:opened,selection:selection?{...selection}:null,visible:visible&&!document.hidden,fallback,playing:!video.paused&&!video.ended,muted:video.muted,videoReady:ready,methodStep,methodMode,access:!!grant,loadedBlobs:blobURL?1:0,loading:loading||methodLoading,detail:detail?.slug||null,available:detail?.available??null,owned:!!detail?.owners?.some(o=>o.mine),canBuy:!!market?.can_buy_art,offerOpen:!el('offer').hidden,error}),
  dispose(){if(disposed)return;close();disposed=true;listeners.splice(0).forEach(fn=>fn());authSubscription?.unsubscribe();root.remove();}
 };
}
