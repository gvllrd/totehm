import {createLisbonPreview} from './gallery-lisbon.mjs';
import {PLAY_SIGNS} from './gallery-play-installation.mjs';

const reduced=matchMedia('(prefers-reduced-motion: reduce)'),body=document.body;
const ROOMS=[
 {title:'TotehmPaper {THP}',kind:'The Stoner Experience',path:'/get_higher',collect:'/market?art=totehmpaper',action:'Collect ↗',note:'Original perforated art. Choose your TotehmPaper.'},
 {title:'Origins / Quantum',kind:'Twenty original works',path:'/origins',collect:'/market?collection=quantum',action:'Open the book',note:'Twenty works. Turn the pages.'},
 {title:'Play the Lisbon Street',kind:'Neuro Street Art Digital',path:'/play_lisbon_street',collect:'/market?collection=play-the-lisbon-street',action:'PLAY',note:'Choose a sign. Play the street.'}
];
const $=id=>document.getElementById(id),buttons=[...document.querySelectorAll('.tour [data-room]')],info=$('work-info');
let engine=null,room=-1,fallback=false,pending=null,pendingEntry=false,listRaf=0,lastPreview=0,station=null;
const preview=createLisbonPreview({onChange:()=>engine?.invalidate()});
const lisbonCard=document.querySelector('#lisbon .artwork');lisbonCard.append(preview.canvas);lisbonCard.classList.add('has-preview');
const interact=()=>body.classList.add('exploring');
function clearInfo(){room=-1;station=null;info.hidden=true;body.classList.remove('station-focused');buttons.forEach(b=>b.setAttribute('aria-current','false'));}
function links(work){const collect=document.createElement('a'),independent=document.createElement('a');collect.href=work.collect;collect.textContent='Collect';independent.href=work.path;independent.textContent='Full experience ↗';$('work-links').replaceChildren(collect,independent);}
function controls(){
 const arrived=station?.focused===room&&room>=0;
 body.classList.toggle('station-focused',arrived);info.dataset.station=String(room);
 $('play-controls').hidden=room!==2||!arrived;$('leave-station').hidden=!arrived;
 $('enter-experience').hidden=arrived&&room===2;
 $('enter-experience').disabled=(!arrived&&!fallback)||(room===1&&!!station?.book?.opening);
 if(room===1)$('enter-experience').textContent=station?.book?.opening?'Opening…':ROOMS[1].action;
 if(room>=0)$('work-note').textContent=arrived?ROOMS[room].note:'Walking to the '+['counter','book','screen'][room]+'…';
 if(station?.play){const p=station.play;$('play-toggle').textContent=p.playing?'PAUSE':p.mediaState==='loading'?'Loading…':'PLAY';$('play-cover').hidden=p.view==='cover';$('play-controller').hidden=p.view==='cover';$('play-status').classList.toggle('is-error',p.mediaState==='error');$('play-toggle').setAttribute('aria-pressed',String(p.playing));
  for(const b of $('play-signs').querySelectorAll('[data-sign]'))b.setAttribute('aria-pressed',String(b.dataset.sign===p.selectedSign));
  $('play-status').textContent=p.mediaState==='error'?'This artwork could not load. Try another sign.':p.mediaState==='loading'?'Loading…':(p.selectedSign==='destination'?'Lisboa':PLAY_SIGNS.find(s=>s.id===p.selectedSign)?.title)||'';
 }
}
function choose(index,{hash=true}={}){
 const work=ROOMS[index];if(!work)return;pendingEntry=false;room=index;interact();
 buttons.forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));
 $('work-title').textContent=work.title;$('work-kind').textContent=work.kind;$('enter-experience').textContent=work.action;links(work);info.hidden=false;
 if(hash)history.replaceState(null,'',location.pathname+location.search+'#'+['totehmpaper','origins','lisbon'][index]);
 if(fallback||body.classList.contains('list-view')){location.assign(work.path);return;}
 station=null;controls();if(engine)engine.visit(index);else pending=index;
}
function overview(){pending=null;pendingEntry=false;clearInfo();interact();engine?.overview();history.replaceState(null,'',location.pathname+location.search);}
function syncPreview(){
 if(listRaf)cancelAnimationFrame(listRaf);listRaf=0;lastPreview=0;preview.pause();
 if(!document.hidden&&!reduced.matches&&body.classList.contains('list-view'))listRaf=requestAnimationFrame(animatePreview);
}
function animatePreview(now){
 listRaf=0;if(document.hidden||reduced.matches||!body.classList.contains('list-view'))return;
 const r=lisbonCard.getBoundingClientRect();preview.update(lastPreview?Math.min((now-lastPreview)/1000,.1):0,r.bottom>100&&r.top<innerHeight-90);lastPreview=now;listRaf=requestAnimationFrame(animatePreview);
}
function setList(value){pending=null;pendingEntry=false;body.classList.toggle('list-view',value);clearInfo();engine?.setList(value);syncPreview();$('view-list').textContent=value?'Return to the gallery':'Artworks';$('view-list').setAttribute('aria-pressed',String(value));}
buttons.forEach((button,index)=>button.addEventListener('click',()=>choose(index)));
$('enter-gallery').addEventListener('click',()=>{interact();if(engine)engine.enterGallery();else pendingEntry=true;$('space').focus({preventScroll:true});});
$('overview').addEventListener('click',overview);
$('enter-experience').addEventListener('click',()=>{if(room>=0){if(fallback||body.classList.contains('list-view'))location.assign(ROOMS[room].path);else if(room===0)location.assign(ROOMS[room].collect);else engine?.enter(room);}});
$('close-info').addEventListener('click',()=>{clearInfo();engine?.stop();});
$('leave-station').addEventListener('click',()=>{engine?.leaveStation();clearInfo();$('space').focus({preventScroll:true});});
$('play-prev').addEventListener('click',()=>engine?.stationAction(2,'previous'));
$('play-next').addEventListener('click',()=>engine?.stationAction(2,'next'));
$('play-toggle').addEventListener('click',()=>engine?.stationAction(2,'toggle'));
$('play-cover').addEventListener('click',()=>engine?.stationAction(2,'cover'));
for(const sign of PLAY_SIGNS){const button=document.createElement('button'),img=document.createElement('img');button.type='button';button.dataset.sign=sign.id;button.setAttribute('aria-label',sign.title);button.setAttribute('aria-pressed','false');img.src=sign.src;img.alt='';img.width=40;img.height=40;button.append(img);button.addEventListener('click',()=>engine?.stationAction(2,'sign',sign.id));$('play-signs').append(button);}
$('view-list').addEventListener('click',()=>setList(!body.classList.contains('list-view')));
document.querySelector('.skip').addEventListener('click',()=>setList(true));
const member=$('member'),menu=$('member-menu');
member.addEventListener('click',()=>{const open=menu.classList.toggle('is-open');member.setAttribute('aria-expanded',String(open));});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.member')){menu.classList.remove('is-open');member.setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',e=>{
 if(e.target.closest('input,textarea,select,[contenteditable=true]'))return;
 if(e.key==='Escape'){clearInfo();menu.classList.remove('is-open');member.setAttribute('aria-expanded','false');engine?.stop();}
 if(e.key==='Home'){e.preventDefault();overview();}
 if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();choose((room+(e.key==='PageDown'?1:-1)+3)%3);}
});
document.addEventListener('visibilitychange',syncPreview);reduced.addEventListener('change',syncPreview);
addEventListener('pagehide',()=>{if(listRaf)cancelAnimationFrame(listRaf);listRaf=0;preview.pause();});addEventListener('pageshow',syncPreview);
window.__totehm_gallery=()=>({build:'2026-10-25-space-calcada-courtyard',rooms:3,room,list:body.classList.contains('list-view'),fallback,reduced_motion:reduced.matches,experiences:ROOMS.map(w=>w.path),lisbon:preview.diagnostics(),...engine?.diagnostics()});
function useFallback(){fallback=true;body.classList.add('no-3d','list-view');engine?.setList(true);clearInfo();syncPreview();}
try{
 const {createGallery}=await import('./gallery-spatial.mjs');
 engine=await createGallery({select:choose,onOverview:clearInfo,interact,fallback:useFallback,reduced,
  onStationState:value=>{station=value;controls();}
 });
 engine.setList(body.classList.contains('list-view'));
 const selected=pending;pending=null;
 if(selected!==null)choose(selected,{hash:false});
 else if(pendingEntry){pendingEntry=false;engine.enterGallery();}
 else{const hash=location.hash;const index=[['#totehmpaper','#stoner'],['#origins','#quantum'],['#lisbon']].findIndex(h=>h.includes(hash));if(index>=0)choose(index,{hash:false});}
}catch(error){console.warn('[gallery] Artwork list available:',error?.name||'unavailable');useFallback();}
