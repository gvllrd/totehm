import {ORIGINS} from './gallery-artworks.mjs';
const TITLES=ORIGINS.map(art=>art.title);
const STILL=n=>'/assets/gallery/book-origins/'+String(n).padStart(2,'0')+'.jpg';
const FILES=Array.from({length:20},(_,i)=>(i+1)+'.mp4');
const BUILD='2026-10-24-origins-book';

// A whole trackpad inertia burst belongs to one turn. The quiet interval is
// measured from the LAST wheel event, rather than from the accepted page turn.
export function createPageGestures({move=()=>false,busy=()=>false,quiet=240,threshold=30}={}){
 let lastWheel=-Infinity,claimed=false,accumulated=0;
 const counts={wheelBursts:0,wheelTurns:0,swipeTurns:0,keyTurns:0};
 function wheel(delta,now){
  if(!Number.isFinite(delta)||!Number.isFinite(now)||!delta)return false;
  if(now-lastWheel>quiet){claimed=false;accumulated=0;counts.wheelBursts++;}
  lastWheel=now;if(claimed)return false;
  if(busy()){claimed=true;accumulated=0;return false;}
  accumulated+=delta;if(Math.abs(accumulated)<threshold)return false;
  claimed=true;const accepted=move(accumulated>0?1:-1,'wheel');accumulated=0;if(accepted)counts.wheelTurns++;return!!accepted;
 }
 function swipe(dx,dy,duration){
  if(busy()||![dx,dy,duration].every(Number.isFinite))return false;
  const delta=Math.abs(dx)>Math.abs(dy)?dx:dy,distance=Math.abs(delta);
  if(distance<20||distance<42&&distance/Math.max(1,duration)<.35)return false;
  const accepted=move(delta<0?1:-1,'swipe');if(accepted)counts.swipeTurns++;return!!accepted;
 }
 function key(direction,repeat=false){if(repeat||busy()||![1,-1].includes(direction))return false;const accepted=move(direction,'key');if(accepted)counts.keyTurns++;return!!accepted;}
 return{wheel,swipe,key,diagnostics:()=>({...counts,wheelClaimed:claimed,quietMs:quiet})};
}

export function createOriginsReader({client,base}={}){
 const $=id=>document.getElementById(id),book=$('book'),deck=$('deck'),left=$('left-page'),right=$('right-page'),cover=$('open-book'),sheet=$('turn-sheet'),front=$('turn-front'),back=$('turn-back');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),videos=[],loaded=Array(20).fill(false),records=new Map();
 let current=0,opened=false,turning=false,turnAnimation=null,turnTimer=0,generation=0,pointer=null,hidden=document.hidden,paused=false,lastSource='initial',turns=0,mediaErrors=0;
 for(let i=0;i<20;i++){
  const n=i+1,page=document.createElement('div');page.className='work-page';page.id='work-'+n;page.hidden=true;page.setAttribute('aria-label',TITLES[i]);
  const video=document.createElement('video');video.id='vid'+i;video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='none';video.poster=STILL(n);video.setAttribute('playsinline','');video.setAttribute('aria-label',TITLES[i]);
  video.addEventListener('playing',()=>{if(!opened||current!==n||hidden||paused||turning){video.pause();return;}syncPlay();});video.addEventListener('pause',syncPlay);video.addEventListener('error',()=>{mediaErrors++;syncPlay();});page.append(video);right.append(page);videos.push(video);
  const label=document.createElement('div');label.className='book-meta gl';label.id='gl'+i;label.hidden=true;
  label.innerHTML='<div class="gl-a">Wah</div><div class="gl-t"></div><div class="gl-m">Quantum series · Digital · 2026</div><div class="gl-d"></div><div class="gl-r"><span class="gl-p">—</span><span class="gl-e">1 / 1</span></div><button class="gl-btn" type="button" disabled>Loading…</button><span class="chapter-number"></span>';
  label.querySelector('.gl-t').textContent=TITLES[i];label.querySelector('.chapter-number').textContent=String(n).padStart(2,'0')+' / 20';left.append(label);
 }
 function loadVideo(index){if(index<0||index>=20||loaded[index])return;loaded[index]=true;videos[index].src=base+FILES[index];videos[index].load();}
 function preload(){if(current<1)return;[current-2,current-1,current].forEach(loadVideo);}
 function pauseAll(){for(const video of videos)video.pause();syncPlay();}
 function syncPlay(){const playing=opened&&current>0&&!videos[current-1]?.paused;$('book-play').hidden=!opened||current===0;$('book-play').textContent=playing?'PAUSE':'PLAY';$('book-play').setAttribute('aria-pressed',String(!!playing));}
 function playCurrent(){
  if(!opened||current<1||hidden||paused||turning)return;const n=current,revision=generation;loadVideo(n-1);
  const promise=videos[n-1].play();promise?.catch(()=>{if(revision===generation&&current===n)syncPlay();});syncPlay();
 }
 function update(){
  book.classList.toggle('is-open',opened);book.classList.toggle('is-turning',turning);document.body.classList.toggle('is-turning',turning);book.querySelector('.book-spread').inert=!opened;$('book-cover').inert=opened;cover.setAttribute('aria-expanded',String(opened));
  $('intro-left').hidden=current!==0;$('intro-right').hidden=current!==0;
  for(let i=0;i<20;i++){$('work-'+(i+1)).hidden=current!==i+1;$('gl'+i).hidden=current!==i+1;$('work-'+(i+1)).classList.toggle('is-current',current===i+1);}
  $('counter').textContent=!opened?'Cover':current===0?'Introduction':String(current).padStart(2,'0')+' / 20';
  $('nav-up').disabled=!opened||current===0||turning;$('nav-down').disabled=opened&&current===20||turning;$('nav-down-label').textContent=!opened?'Open':current===0?'Begin':'Next';
  $('book-close').hidden=!opened;$('book-close').disabled=turning;$('book-begin').disabled=turning;$('book-state').textContent=!opened?'Origins. Closed book.':current===0?'Origins. Introduction.':TITLES[current-1]+'. Page '+current+' of 20.';syncPlay();
 }
 function finishTurn(revision){
  if(revision!==generation||!turning)return;clearTimeout(turnTimer);turnTimer=0;turning=false;sheet.hidden=true;const animation=turnAnimation;turnAnimation=null;animation?.cancel();update();preload();playCurrent();
 }
 function turnPage(next,{animate=true,source='button'}={}){
  if(turning||!Number.isInteger(next)||next<0||next>20||next===current)return false;
  pauseAll();const previous=current;current=next;lastSource=source;turns++;const revision=++generation;
  if(opened&&animate&&!reduced.matches&&typeof sheet.animate==='function'){
   turning=true;const forward=next>previous,shown=forward?previous:next;front.replaceChildren();
   if(shown>0){const image=document.createElement('img');image.src=STILL(shown);image.alt='';front.append(image);front.classList.remove('turn-intro');}else{front.textContent='ORIGINS';front.classList.add('turn-intro');}
   back.textContent=next===0?'ORIGINS':String(next).padStart(2,'0')+' / 20';sheet.hidden=false;update();
   turnAnimation=sheet.animate(forward?[{transform:'rotateY(0deg)',filter:'brightness(1)'},{transform:'rotateY(-178deg)',filter:'brightness(.76)'}]:[{transform:'rotateY(-178deg)',filter:'brightness(.76)'},{transform:'rotateY(0deg)',filter:'brightness(1)'}],{duration:680,easing:'cubic-bezier(.25,.65,.25,1)',fill:'forwards'});
   turnAnimation.finished.then(()=>finishTurn(revision),()=>finishTurn(revision));turnTimer=setTimeout(()=>finishTurn(revision),760);
  }else{update();preload();playCurrent();}
  return true;
 }
 function openBook(){if(opened||turning)return false;opened=true;lastSource='cover';generation++;update();preload();playCurrent();return true;}
 function closeBook(){if(!opened||turning)return false;pauseAll();opened=false;generation++;update();return true;}
 const move=(direction,source)=>{if(!opened){const accepted=direction>0?openBook():false;if(accepted)lastSource=source;return accepted;}return turnPage(current+direction,{source});};
 const gestures=createPageGestures({move,busy:()=>turning});
 cover.disabled=false;cover.addEventListener('click',openBook);$('book-begin').addEventListener('click',()=>turnPage(1));$('nav-down').addEventListener('click',()=>move(1,'button'));$('nav-up').addEventListener('click',()=>move(-1,'button'));$('book-close').addEventListener('click',closeBook);
 $('book-play').addEventListener('click',()=>{if(current<1)return;const v=videos[current-1];if(v.paused){paused=false;playCurrent();}else v.pause();syncPlay();});
 document.addEventListener('wheel',event=>{
  if(event.ctrlKey||event.target.closest('input,textarea,select,[contenteditable=true]'))return;event.preventDefault();
  const unit=event.deltaMode===1?16:event.deltaMode===2?innerHeight:1,delta=(Math.abs(event.deltaY)>=Math.abs(event.deltaX)?event.deltaY:event.deltaX)*unit;gestures.wheel(delta,performance.now());
 },{passive:false});
 deck.addEventListener('pointerdown',event=>{if(pointer||event.button!==0||event.target.closest('button,a,input,textarea,select'))return;pointer={id:event.pointerId,x:event.clientX,y:event.clientY,time:event.timeStamp};deck.setPointerCapture?.(event.pointerId);});
 deck.addEventListener('pointerup',event=>{if(!pointer||event.pointerId!==pointer.id)return;const p=pointer;pointer=null;gestures.swipe(event.clientX-p.x,event.clientY-p.y,event.timeStamp-p.time);});
 deck.addEventListener('pointercancel',()=>{pointer=null;});
 document.addEventListener('keydown',event=>{
  if(event.target.closest('input,textarea,select,[contenteditable=true]')||event.altKey||event.metaKey||event.ctrlKey)return;
  const direction=['ArrowDown','ArrowRight','PageDown'].includes(event.key)?1:['ArrowUp','ArrowLeft','PageUp'].includes(event.key)?-1:0;
  if(direction){event.preventDefault();gestures.key(direction,event.repeat);}
  if(event.key==='Escape')closeBook();
 });
 function cancelTurn(){if(!turning)return;const revision=generation;turnAnimation?.cancel();finishTurn(revision);}
 reduced.addEventListener('change',()=>{if(reduced.matches)cancelTurn();});
 document.addEventListener('visibilitychange',()=>{hidden=document.hidden;if(hidden){paused=true;pauseAll();cancelTurn();}});
 addEventListener('blur',()=>{paused=true;pauseAll();});addEventListener('focus',()=>{paused=false;});addEventListener('pagehide',()=>{paused=true;pauseAll();cancelTurn();});
 addEventListener('pageshow',event=>{if(event.persisted){hidden=document.hidden;paused=false;syncPlay();}});
 function populate(index,art){
  if(!Number.isInteger(index)||index<0||index>=20)return;records.set(index,art);const label=$('gl'+index);if(typeof art.title==='string'&&art.title)label.querySelector('.gl-t').textContent=art.title;
  const price=label.querySelector('.gl-p');price.textContent=Number.isFinite(art.price_cents)?new Intl.NumberFormat('en',{style:'currency',currency:String(art.currency||'eur').toUpperCase(),minimumFractionDigits:art.price_cents%100?2:0}).format(art.price_cents/100):'—';
  const button=label.querySelector('.gl-btn');button.disabled=art.status==='sold'||!art.slug;button.textContent=art.status==='sold'?'Sold':art.slug?'Acquire →':'Unavailable';button.onclick=button.disabled?null:()=>location.assign('/market?art='+encodeURIComponent(art.slug));
 }
 client.from('artworks').select('id,slug,title,price_cents,currency,status,sort_order').eq('series','quantum').then(({data,error})=>{
  if(error)console.warn('[origins] Artwork catalogue unavailable:',error.code||error.name||'request');
  if(data)data.forEach(art=>populate(Number(art.sort_order)-1,art));
 }).catch(error=>{console.warn('[origins] Artwork catalogue unavailable:',error?.name||'request');});
 const query=new URLSearchParams(location.search),requested=query.get('work')||'';
 if(/^[0-9]{1,2}$/.test(requested)&&Number(requested)>=1&&Number(requested)<=20){opened=true;turnPage(Number(requested),{animate:false,source:'deep-link'});}else if(query.get('open')==='1')openBook();
 update();
 window.__totehm_origins=()=>({build:BUILD,book:true,work:current,total:20,opened,turning,page:current,playing:videos.filter(v=>!v.paused).length,loaded:loaded.filter(Boolean).length,mediaErrors,reducedMotion:reduced.matches,visible:!hidden,turns,lastSource,gestures:gestures.diagnostics(),videoFiles:FILES.slice(),catalogueRecords:records.size});
 return{open:openBook,close:closeBook,goTo:turnPage,diagnostics:window.__totehm_origins};
}
