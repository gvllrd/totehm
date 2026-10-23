import {createLisbonPreview} from './gallery-lisbon.mjs';

const reduced=matchMedia('(prefers-reduced-motion: reduce)'),body=document.body;
const ROOMS=[
 {title:'TotehmPaper {THP}',kind:'The Stoner Experience',path:'/get_higher',collect:'/market?art=totehmpaper'},
 {title:'Origins / Quantum',kind:'Twenty original works',path:'/origins',collect:'/market?collection=quantum'},
 {title:'Play the Lisbon Street',kind:'Neuro Street Art Digital',path:'/play_lisbon_street',collect:'/market?collection=play-the-lisbon-street'}
];
const buttons=[...document.querySelectorAll('.tour [data-room]')],info=document.getElementById('work-info');
let engine=null,room=-1,fallback=false,pending=null,listRaf=0,lastPreview=0;
const preview=createLisbonPreview({onChange:()=>engine?.invalidate()});
const lisbonCard=document.querySelector('#lisbon .artwork');lisbonCard.append(preview.canvas);lisbonCard.classList.add('has-preview');
const interact=()=>body.classList.add('exploring');
function clearInfo(){room=-1;info.hidden=true;buttons.forEach(b=>b.setAttribute('aria-current','false'));}
function choose(index,{hash=true}={}){
 const work=ROOMS[index];if(!work)return;room=index;interact();
 buttons.forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));
 document.getElementById('work-title').textContent=work.title;
 document.getElementById('work-kind').textContent=work.kind;
 const link=document.createElement('a');link.href=work.collect;link.textContent='Collect';document.getElementById('work-links').replaceChildren(link);
 info.hidden=false;
 if(hash)history.replaceState(null,'',location.pathname+location.search+'#'+['totehmpaper','origins','lisbon'][index]);
 if(fallback||body.classList.contains('list-view')){location.assign(work.path);return;}
 if(engine)engine.visit(index);else pending=index;
}
function overview(){pending=null;clearInfo();interact();engine?.overview();history.replaceState(null,'',location.pathname+location.search);}
function syncPreview(){
 if(listRaf)cancelAnimationFrame(listRaf);listRaf=0;lastPreview=0;preview.pause();
 if(!document.hidden&&!reduced.matches&&body.classList.contains('list-view'))listRaf=requestAnimationFrame(animatePreview);
}
function animatePreview(now){
 listRaf=0;if(document.hidden||reduced.matches||!body.classList.contains('list-view'))return;
 const r=lisbonCard.getBoundingClientRect();preview.update(lastPreview?Math.min((now-lastPreview)/1000,.1):0,r.bottom>100&&r.top<innerHeight-90);lastPreview=now;listRaf=requestAnimationFrame(animatePreview);
}
function setList(value){body.classList.toggle('list-view',value);clearInfo();engine?.setList(value);syncPreview();const b=document.getElementById('view-list');b.textContent=value?'Return to the temple':'Artworks';b.setAttribute('aria-pressed',String(value));}
buttons.forEach((button,index)=>button.addEventListener('click',()=>choose(index)));
document.getElementById('enter-gallery').addEventListener('click',()=>{interact();document.getElementById('space').focus({preventScroll:true});});
document.getElementById('overview').addEventListener('click',overview);
document.getElementById('enter-experience').addEventListener('click',()=>{if(room>=0){if(fallback||body.classList.contains('list-view'))location.assign(ROOMS[room].path);else engine?.enter(room);}});
document.getElementById('close-info').addEventListener('click',()=>{info.hidden=true;engine?.stop();});
document.getElementById('view-list').addEventListener('click',()=>setList(!body.classList.contains('list-view')));
document.querySelector('.skip').addEventListener('click',()=>setList(true));
const member=document.getElementById('member'),menu=document.getElementById('member-menu');
member.addEventListener('click',()=>{const open=menu.classList.toggle('is-open');member.setAttribute('aria-expanded',String(open));});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.member')){menu.classList.remove('is-open');member.setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',e=>{
 if(e.target.closest('input,textarea,select,[contenteditable=true]'))return;
 if(e.key==='Escape'){info.hidden=true;menu.classList.remove('is-open');member.setAttribute('aria-expanded','false');engine?.stop();}
 if(e.key==='Home'){e.preventDefault();overview();}
 if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();choose((room+(e.key==='PageDown'?1:-1)+3)%3);}
});
document.addEventListener('visibilitychange',syncPreview);reduced.addEventListener('change',syncPreview);
addEventListener('pagehide',()=>{if(listRaf)cancelAnimationFrame(listRaf);listRaf=0;preview.pause();});addEventListener('pageshow',syncPreview);
window.__totehm_gallery=()=>({build:'2026-10-23-space-open-ocean',rooms:3,room,list:body.classList.contains('list-view'),fallback,reduced_motion:reduced.matches,experiences:ROOMS.map(w=>w.path),lisbon:preview.diagnostics(),...engine?.diagnostics()});
function useFallback(){fallback=true;body.classList.add('no-3d','list-view');engine?.setList(true);clearInfo();syncPreview();}
try{
 const {createGallery}=await import('./gallery-3d.mjs');
 engine=await createGallery({select:choose,onOverview:clearInfo,interact,fallback:useFallback,reduced,lisbonPreview:preview});
 engine.setList(body.classList.contains('list-view'));
 const selected=pending;pending=null;
 if(selected!==null)choose(selected,{hash:false});
 else{const hash=location.hash;const index=[['#totehmpaper','#stoner'],['#origins','#quantum'],['#lisbon']].findIndex(h=>h.includes(hash));if(index>=0)choose(index,{hash:false});}
}catch(error){console.warn('[temple] Artwork list available:',error?.name||'unavailable');useFallback();}
