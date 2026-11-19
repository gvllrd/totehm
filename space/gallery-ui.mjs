import {createLisbonFirstPage} from './lisbon-first-page.mjs';
import {createOppositesFront} from './opposites-front.mjs';
import {createOriginsCoverCanvas} from './origins-cover.mjs';
import {LISBON_HOLOGRAM_SIGNS as LISBON_STREET_SIGNS} from './gallery-lisbon-urbex-layout.mjs';
import {OPPOSITES} from './gallery-opposites.mjs';

const reduced=matchMedia('(prefers-reduced-motion: reduce)'),body=document.body;
const place=location.pathname.replace(/\/+$/,'')==='/new-york'?'new-york':'lisbon';
body.dataset.place=place;
document.title='TOTEHM.SPACE — '+(place==='new-york'?'New York':'Lisbon');
document.getElementById('space').setAttribute('aria-label',(place==='lisbon'?'An open-air Lisbon lounge on the calçada. Sit in the leather armchair. Click the suspended cinema screen to discover Lisbon Streets, the controller to play, or a TotehmPaper case to inspect it. Board the saucer to Origins. ':'An airy coastal castle gallery: ancient stone ruins and modern glass. ')+'Original artworks above the storm sea. Drag to look, tap the floor to walk. WASD to walk, Space to jump.');
document.getElementById('building-levels')?.remove();
document.querySelector('#origins .origins-grid')?.remove();const originLink=document.querySelector('#origins .room-actions a');if(originLink)originLink.href='/origin?from='+place;const originCaption=document.querySelector('#origins .caption>p');if(originCaption)originCaption.textContent='Wah · The original volume';
if(place==='lisbon'){document.querySelector('.tour [data-room="4"]')?.remove();document.getElementById('same-but-opposite')?.remove();}
else{for(const index of [0,3,4])document.querySelector('.tour [data-room="'+index+'"]')?.remove();for(const id of ['totehmpaper','stoner','same-but-opposite'])document.getElementById(id)?.remove();document.querySelector('.tour [data-room="2"]').lastChild.textContent='Think same but opposite';}
const ROOMS=[
 {title:'TotehmPaper {THP}',kind:'The Stoner Experience',path:'/get_higher?paper=1',collect:'/market?art=totehmpaper',action:'Inspect the premium case',note:'The original paper in its premium glass case.'},
 {title:'Origins',kind:'The original book',path:'/origin?from='+place,collect:'/market?collection=quantum',action:'Board the saucer',note:place==='lisbon'?'Through the galaxy. Beyond the event horizon.':'Twenty works. Turn the pages.'},
 {title:'Play the Lisbon Street',kind:'Neuro Street Art Digital',path:'/play_lisbon_street',collect:'/market?collection=play-the-lisbon-street',action:place==='lisbon'?'Discover the experience':'PLAY ↗',note:place==='lisbon'?'A TotehmPaper is your key. Get Higher through Stoner, then enter the 22 Lisbon works.':'Choose a sign. Play the street.'},
 {title:'The Stoner Experience',kind:'TotehmPaper {THP}',path:'/get_higher',collect:'/market?art=totehmpaper',action:'Enter the experience ↗',note:place==='lisbon'?'The original paper, in its premium case on the antique stone table.':'The original paper, in its premium case on the stone table.'},
 {title:'Same but opposite',kind:'Video artwork · Wah',path:'/same_but_opposite',action:'PLAY ↗',note:'Tap to play the artwork in its own full-screen experience.'}
];
const $=id=>document.getElementById(id),buttons=[...document.querySelectorAll('.tour [data-room]')],info=$('work-info');
let engine=null,room=-1,fallback=false,pending=null,listRaf=0,lastPreview=0,station=null,hoveredSign=null,activeSign=null;
const preview=(place==='lisbon'?createLisbonFirstPage:createOppositesFront)({onChange:()=>engine?.invalidate()});
const lisbonCard=document.querySelector('#lisbon .artwork');lisbonCard.append(preview.canvas);lisbonCard.classList.add('has-preview');
if(place==='new-york'){
 lisbonCard.href='/think_same_but_opposite';lisbonCard.setAttribute('aria-label','Enter Think same but opposite');
 ROOMS[2]={title:'Think same but opposite',kind:'Six original digital works',path:'/think_same_but_opposite',action:'Enter the projection',note:'The six originals. The same first page, projected from the saucer.'};
 $('space').setAttribute('aria-label','New York castle above the ocean. A flying saucer projects the six Think same but opposite originals in one black panel. Board the saucer to reach the Origins sanctuary.');
 const card=document.querySelector('#lisbon');card.querySelector('h2').textContent='Think same but opposite';const actions=card.querySelector('.room-actions');actions.replaceChildren();const link=document.createElement('a');link.href='/think_same_but_opposite';link.textContent='Enter the experience';actions.append(link);card.querySelector('.caption>p').textContent='Six original digital works';
}
const originalCover=createOriginsCoverCanvas();let originCard=document.querySelector('#origins .artwork');if(!originCard){originCard=document.createElement('a');originCard.className='artwork';originCard.href='/origin?from='+place;originCard.setAttribute('aria-label','Board the saucer to Origins');document.getElementById('origins').prepend(originCard);}if(originCard){originCard.replaceChildren(originalCover.canvas);originalCover.canvas.style.cssText='display:block;width:100%;height:100%;object-fit:contain';}
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
 const discover=document.createElement('a');discover.id='lisbon-discover-link';discover.href='/play_lisbon_street?discover=1';discover.textContent='Discover the experience';caption.querySelector('.room-actions').prepend(discover);
 signHint=document.createElement('div');signHint.id='street-sign-hint';signHint.className='street-sign-hint';signHint.hidden=true;
 signHint.setAttribute('role','status');signHint.setAttribute('aria-live','polite');signHint.textContent='Make it useful';document.body.append(signHint);
}
function signFocus(work){
 const valid=place==='lisbon'&&work&&signIds.has(work.id);hoveredSign=valid?work.id:null;
 if(signHint){signHint.hidden=!valid;signHint.textContent=valid?'Make it useful · '+work.title:'Make it useful';}
}
function clearInfo(){room=-1;station=null;activeSign=null;signFocus(null);delete info.dataset.artwork;info.hidden=true;body.classList.remove('station-focused','street-playing','entry-gated');buttons.forEach(b=>b.setAttribute('aria-current','false'));}
let entryState='idle';
function showStreetSign(work){
 if(place!=='lisbon'||work?.kind!=='lisbon-entry')return;
 clearInfo();activeSign='entry';entryState=work.state;info.hidden=false;info.dataset.artwork='lisbon-entry';body.classList.add('entry-gated');interact();
 $('work-kind').textContent='Play the Lisbon Street';$('work-title').textContent=work.owned?'Your key is ready':'A TotehmPaper is your key';
 $('work-note').textContent=work.state==='checking'?'Checking your TotehmPaper…':work.state==='error'?'Your access could not be verified. Try again.':work.owned?'Entering the Lisbon experience…':'Get a TotehmPaper and experience Stoner before entering the 22 Lisbon works.';
 const retry=work.state==='error';$('enter-experience').disabled=work.state==='checking'||work.owned;
 $('enter-experience').textContent=work.state==='checking'?'Checking…':retry?'Try again':'Get Higher to get it';if(!retry&&work.state!=='checking'&&!work.owned)experienceLabel($('enter-experience'),'get');
 $('leave-station').hidden=true;
 const get=streetExperienceLink('get');get.className='street-get-higher';const discover=document.createElement('a');discover.href='/play_lisbon_street?discover=1';discover.textContent='Read Discover';$('work-links').replaceChildren(discover,get);
}
let seatButton=null;
if(place==='lisbon'){
 seatButton=document.createElement('button');seatButton.type='button';seatButton.id='sit-lounge';seatButton.textContent='Sit';
 seatButton.addEventListener('click',()=>{if(station?.seated)engine?.stand();else engine?.sit();});
 const playButton=document.createElement('button');playButton.type='button';playButton.id='lounge-play';playButton.textContent='Play';
 playButton.addEventListener('click',()=>{if(fallback||body.classList.contains('list-view'))location.assign('/play_lisbon_street?board=1');else engine?.openController();});
 $('view-list').before(seatButton,playButton);
}
const returnIslandButton=document.createElement('button');returnIslandButton.type='button';returnIslandButton.id='return-island';returnIslandButton.textContent='Return to the island';returnIslandButton.hidden=true;returnIslandButton.addEventListener('click',()=>{clearInfo();engine?.returnIsland();});document.body.append(returnIslandButton);
function journeyState(value){returnIslandButton.hidden=!value||value==='island';body.classList.toggle('in-origins-vessel',!!value&&value!=='island');}
function links(work){
 const independent=document.createElement('a');independent.href=work.path;independent.textContent='Full experience ↗';
 const links=[];if(work.collect){const collect=document.createElement('a');collect.href=work.collect;collect.textContent='Collect';links.push(collect);}
 $('work-links').replaceChildren(...links,independent);
}
function controls(){
 if(activeSign)return;
 const arrived=station?.focused===room&&room>=0;
 body.classList.toggle('station-focused',arrived);info.dataset.station=String(room);
 $('leave-station').hidden=!arrived;
 $('enter-experience').disabled=(!arrived&&!fallback)||(room===1&&!!station?.book?.opening);
 if(room===1)$('enter-experience').textContent=station?.book?.opening?'Opening…':ROOMS[1].action;
 if(room>=0)$('work-note').textContent=arrived?ROOMS[room].note:'Walking to the '+['counter','book',place==='lisbon'?'cinema screen':'projection','premium cases','Same but opposite screen'][room]+'…';
}
function choose(index,{hash=true}={}){
 if(place==='lisbon'&&index===4)return overview();
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
 if(listRaf)cancelAnimationFrame(listRaf);listRaf=0;lastPreview=0;
 if(!document.hidden&&!reduced.matches&&body.classList.contains('list-view'))listRaf=requestAnimationFrame(animatePreview);
}
function animatePreview(now){
 listRaf=0;if(document.hidden||reduced.matches||!body.classList.contains('list-view'))return;
 const r=lisbonCard.getBoundingClientRect();preview.update(lastPreview?Math.min((now-lastPreview)/1000,.1):0,r.bottom>100&&r.top<innerHeight-90);lastPreview=now;listRaf=requestAnimationFrame(animatePreview);
}
function setList(value){pending=null;body.classList.toggle('list-view',value);clearInfo();engine?.setList(value);syncPreview();$('view-list').textContent=value?'Return to the gallery':'Artworks';$('view-list').setAttribute('aria-pressed',String(value));}
buttons.forEach(button=>button.addEventListener('click',()=>choose(Number(button.dataset.room))));
$('overview').addEventListener('click',overview);
$('enter-experience').addEventListener('click',()=>{if(activeSign==='entry'){if(entryState==='error')engine?.requestStreetEntry();else location.assign('/get_higher');return;}if(room>=0){if(fallback||body.classList.contains('list-view'))location.assign(ROOMS[room].path);else engine?.enter(room);}});
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
addEventListener('pagehide',()=>{if(listRaf)cancelAnimationFrame(listRaf);listRaf=0;});addEventListener('pageshow',syncPreview);
window.__totehm_gallery=()=>({build:'2026-11-19-lisbon-floating-signs-grip',place,rooms:place==='lisbon'?3:2,room,hoveredSign,activeSign,list:body.classList.contains('list-view'),fallback,reduced_motion:reduced.matches,experiences:place==='new-york'?['/think_same_but_opposite','/origin?from=new-york']:[...new Set(ROOMS.filter((w,i)=>i!==4).map(w=>w.path))],experienceNavigation:'suspended-cinema-and-original-objects-to-fullscreen',inGalleryPlayback:false,lisbon:preview.diagnostics(),...engine?.diagnostics()});
function useFallback(){fallback=true;body.classList.remove('is-origin-transit','in-origins-vessel');body.classList.add('no-3d','list-view');engine?.setList(true);clearInfo();syncPreview();}
try{
 const {createGallery}=await import('./gallery-spatial.mjs');
 engine=await createGallery({place,select:choose,onOverview:clearInfo,onArtwork:showStreetSign,onSignFocus:signFocus,interact,fallback:useFallback,reduced,
  onStationState:value=>{station=value;journeyState(value.vessel);if(seatButton)seatButton.textContent=value.seated?'Stand':'Sit';controls();}
 });
 engine.setList(body.classList.contains('list-view'));
 const selected=pending;pending=null;
 if(selected!==null)choose(selected,{hash:false});
 else{const hash=location.hash;const index=[['#totehmpaper'],['#origins','#quantum'],['#lisbon'],['#stoner'],['#same-but-opposite']].findIndex(h=>h.includes(hash));if(index>=0)choose(index,{hash:false});}
}catch(error){console.warn('[gallery] Artwork list available:',error?.name||'unavailable');useFallback();}
