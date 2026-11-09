import {createLisbonPreview} from './gallery-lisbon.mjs';
import {LISBON_STREET_SIGNS} from './gallery-lisbon-signs-layout.mjs';

const reduced=matchMedia('(prefers-reduced-motion: reduce)'),body=document.body;
const place=location.pathname.replace(/\/+$/,'')==='/new-york'?'new-york':'lisbon';
body.dataset.place=place;
document.title='TOTEHM.SPACE — '+(place==='new-york'?'New York':'Lisbon');
document.getElementById('space').setAttribute('aria-label','An airy coastal castle gallery: ancient stone ruins, modern glass and original artworks above the storm sea. Drag to look, tap the stone floor to walk. WASD to walk, Space to jump.');
document.getElementById('building-levels')?.remove();
const ROOMS=[
 {title:'TotehmPaper {THP}',kind:'The Stoner Experience',path:'/get_higher',collect:'/market?art=totehmpaper',action:'Enter the experience ↗',note:'Original perforated art. Choose your TotehmPaper.'},
 {title:'Origins / Quantum',kind:'Twenty original works',path:'/origins',collect:'/market?collection=quantum',action:'Open the book',note:'Twenty works. Turn the pages.'},
 {title:'Play the Lisbon Street',kind:'Neuro Street Art Digital',path:'/play_lisbon_street',collect:'/market?collection=play-the-lisbon-street',action:'PLAY ↗',note:'Choose a sign. Play the street.'},
 {title:'The Stoner Experience',kind:'TotehmPaper {THP}',path:'/get_higher',collect:'/market?art=totehmpaper',action:'Enter the experience ↗',note:'The original paper, in its premium case on the stone table.'},
 {title:'Same but opposite',kind:'Video artwork · Wah',path:'/same_but_opposite',action:'PLAY ↗',note:'Tap to play the artwork in its own full-screen experience.'}
];
const $=id=>document.getElementById(id),buttons=[...document.querySelectorAll('.tour [data-room]')],info=$('work-info');
let engine=null,room=-1,fallback=false,pending=null,listRaf=0,lastPreview=0,station=null,hoveredSign=null;
const preview=createLisbonPreview({onChange:()=>engine?.invalidate()});
const lisbonCard=document.querySelector('#lisbon .artwork');lisbonCard.append(preview.canvas);lisbonCard.classList.add('has-preview');
const interact=()=>body.classList.add('exploring');
function higherWord(){
 const word=document.createElement('span'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS('http://www.w3.org/2000/svg','use');
 word.className='higher-word';svg.setAttribute('viewBox','0 0 600 200');svg.setAttribute('aria-hidden','true');use.setAttribute('href','#higher-slogan');svg.append(use);word.append(svg);return word;
}
function experienceLabel(element,kind){
 const get=kind==='get';element.setAttribute('aria-label',get?'Get Higher to get it':'Higher the Lisbon Streets');
 element.replaceChildren(...(get?['Get ',higherWord(),' to get it']:[higherWord(),' the Lisbon Streets']));
}
function streetExperienceLink(kind){const link=document.createElement('a');link.href=kind==='get'?'/get_higher':'/play_lisbon_street';experienceLabel(link,kind);return link;}
const signHref=id=>'/play_lisbon_street?sign='+encodeURIComponent(id)+'&play=1&from=space';
const signIds=new Set(LISBON_STREET_SIGNS.map(sign=>sign.id));
let signHint=null;
if(place==='lisbon'){
 const caption=document.querySelector('#lisbon .caption'),note=document.createElement('p');
 note.textContent='Get a Totehmpaper. Experience Stoner. See the Lisbon streets differently.';
 caption.querySelector('.room-actions').before(note);
 caption.querySelector('.room-actions').replaceChildren(streetExperienceLink('get'),streetExperienceLink('street'));
 const signs=document.createElement('div');signs.className='street-sign-links';
 signs.setAttribute('aria-label','Make the 22 Lisbon signs useful');
 for(const sign of LISBON_STREET_SIGNS){
  const link=document.createElement('a');link.href=signHref(sign.id);link.setAttribute('aria-label',sign.title+' — Make it useful');
  const image=document.createElement('img');image.src=sign.src;image.alt='';image.loading='lazy';
  const label=document.createElement('span');label.textContent=sign.title;
  const action=document.createElement('small');action.textContent='Make it useful';link.append(image,label,action);signs.append(link);
 }
 caption.append(signs);
 signHint=document.createElement('div');signHint.id='street-sign-hint';signHint.className='street-sign-hint';signHint.hidden=true;
 signHint.setAttribute('role','status');signHint.setAttribute('aria-live','polite');signHint.textContent='Make it useful';document.body.append(signHint);
}
function signFocus(work){
 const valid=place==='lisbon'&&work&&signIds.has(work.id);hoveredSign=valid?work.id:null;
 if(signHint){signHint.hidden=!valid;signHint.textContent=valid?'Make it useful · '+work.title:'Make it useful';}
}
function clearInfo(){room=-1;station=null;signFocus(null);delete info.dataset.artwork;info.hidden=true;body.classList.remove('station-focused');buttons.forEach(b=>b.setAttribute('aria-current','false'));}
function showStreetSign(work){
 if(place!=='lisbon'||work?.kind!=='lisbon-street-sign'||!signIds.has(work.id))return;
 engine?.stop();clearInfo();pending=null;interact();location.assign(signHref(work.id));
}
function links(work){
 const independent=document.createElement('a');independent.href=work.path;independent.textContent='Full experience ↗';
 const links=[];if(work.collect){const collect=document.createElement('a');collect.href=work.collect;collect.textContent='Collect';links.push(collect);}
 $('work-links').replaceChildren(...links,independent);
}
function controls(){
 const arrived=station?.focused===room&&room>=0;
 body.classList.toggle('station-focused',arrived);info.dataset.station=String(room);
 $('leave-station').hidden=!arrived;
 $('enter-experience').disabled=(!arrived&&!fallback)||(room===1&&!!station?.book?.opening);
 if(room===1)$('enter-experience').textContent=station?.book?.opening?'Opening…':ROOMS[1].action;
 if(room>=0)$('work-note').textContent=arrived?ROOMS[room].note:'Walking to the '+['counter','book','Lisbon screen','premium cases','Same but opposite screen'][room]+'…';
}
function choose(index,{hash=true}={}){
 if(index===3)index=0;
 const work=ROOMS[index];if(!work)return;clearInfo();room=index;interact();
 buttons.forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.room)===(index===3?0:index))));
 $('work-title').textContent=work.title;$('work-kind').textContent=work.kind;$('enter-experience').removeAttribute('aria-label');$('enter-experience').textContent=work.action;links(work);info.hidden=false;
 if(hash)history.replaceState(null,'',location.pathname+location.search+'#'+['totehmpaper','origins','lisbon','stoner','same-but-opposite'][index]);
 if(fallback||body.classList.contains('list-view')){location.assign(work.path);return;}
 station=null;controls();if(engine)engine.visit(index);else pending=index;
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
function setList(value){pending=null;body.classList.toggle('list-view',value);clearInfo();engine?.setList(value);syncPreview();$('view-list').textContent=value?'Return to the gallery':'Artworks';$('view-list').setAttribute('aria-pressed',String(value));}
buttons.forEach(button=>button.addEventListener('click',()=>choose(Number(button.dataset.room))));
$('overview').addEventListener('click',overview);
$('enter-experience').addEventListener('click',()=>{if(room>=0){if(fallback||body.classList.contains('list-view'))location.assign(ROOMS[room].path);else engine?.enter(room);}});
$('close-info').addEventListener('click',()=>{clearInfo();engine?.stop();});
$('leave-station').addEventListener('click',()=>{engine?.leaveStation();clearInfo();$('space').focus({preventScroll:true});});
$('view-list').addEventListener('click',()=>setList(!body.classList.contains('list-view')));
document.querySelector('.skip').addEventListener('click',()=>setList(true));
document.addEventListener('keydown',e=>{
 if(e.target.closest('input,textarea,select,[contenteditable=true]'))return;
 if(e.key==='Escape'){clearInfo();engine?.stop();}
 if(e.key==='Home'){e.preventDefault();overview();}
 if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();const choices=buttons.map(b=>Number(b.dataset.room)),current=choices.indexOf(room===3?0:room);choose(choices[(current+(e.key==='PageDown'?1:-1)+choices.length)%choices.length]);}
});
document.addEventListener('visibilitychange',syncPreview);reduced.addEventListener('change',syncPreview);
addEventListener('pagehide',()=>{if(listRaf)cancelAnimationFrame(listRaf);listRaf=0;preview.pause();});addEventListener('pageshow',syncPreview);
window.__totehm_gallery=()=>({build:'2026-11-09-lisbon-useful-objects',place,rooms:4,room,hoveredSign,list:body.classList.contains('list-view'),fallback,reduced_motion:reduced.matches,experiences:[...new Set(ROOMS.map(w=>w.path))],experienceNavigation:'independent-pages',inGalleryPlayback:false,lisbon:preview.diagnostics(),...engine?.diagnostics()});
function useFallback(){fallback=true;body.classList.add('no-3d','list-view');engine?.setList(true);clearInfo();syncPreview();}
try{
 const {createGallery}=await import('./gallery-spatial.mjs');
 engine=await createGallery({place,select:choose,onOverview:clearInfo,onArtwork:showStreetSign,onSignFocus:signFocus,interact,fallback:useFallback,reduced,
  onStationState:value=>{station=value;controls();}
 });
 engine.setList(body.classList.contains('list-view'));
 const selected=pending;pending=null;
 if(selected!==null)choose(selected,{hash:false});
 else{const hash=location.hash;const index=[['#totehmpaper'],['#origins','#quantum'],['#lisbon'],['#stoner'],['#same-but-opposite']].findIndex(h=>h.includes(hash));if(index>=0)choose(index,{hash:false});}
}catch(error){console.warn('[gallery] Artwork list available:',error?.name||'unavailable');useFallback();}
