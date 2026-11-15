import {createLisbonPreview} from './gallery-lisbon.mjs';
import {LISBON_HOLOGRAM_SIGNS as LISBON_STREET_SIGNS} from './gallery-lisbon-urbex-layout.mjs';
import {OPPOSITES} from './gallery-opposites.mjs';

const reduced=matchMedia('(prefers-reduced-motion: reduce)'),body=document.body;
const place=location.pathname.replace(/\/+$/,'')==='/new-york'?'new-york':'lisbon';
body.dataset.place=place;
document.title='TOTEHM.SPACE — '+(place==='new-york'?'New York':'Lisbon');
document.getElementById('space').setAttribute('aria-label',(place==='lisbon'?'Historic Lisbon azulejo ruins joined by modern glass, with stone inside. One deep black table presents TotehmPaper and laboratory glass on both sides. A monumental hologram opens the original Play the Street Discover; a flying saucer crosses the galaxy through a black hole to Origins. ':'An airy coastal castle gallery: ancient stone ruins and modern glass. ')+'Original artworks above the storm sea. Drag to look, tap the floor to walk. WASD to walk, Space to jump.');
document.getElementById('building-levels')?.remove();
if(place==='lisbon'){document.querySelector('#origins .origins-grid')?.remove();const originLink=document.querySelector('#origins .room-actions a');if(originLink)originLink.href='/origin';const originCaption=document.querySelector('#origins .caption>p');if(originCaption)originCaption.textContent='Wah · The original volume';document.querySelector('.tour [data-room="4"]')?.remove();document.getElementById('same-but-opposite')?.remove();}
const ROOMS=[
 {title:'TotehmPaper {THP}',kind:'The Stoner Experience',path:'/get_higher',collect:'/market?art=totehmpaper',action:'Enter the experience ↗',note:'Original perforated art. Choose your TotehmPaper.'},
 {title:'Origins',kind:place==='lisbon'?'The original book':'Twenty original works',path:place==='lisbon'?'/origin':'/origins',collect:'/market?collection=quantum',action:place==='lisbon'?'Board the saucer':'Open the book',note:place==='lisbon'?'Through the galaxy. Beyond the event horizon.':'Twenty works. Turn the pages.'},
 {title:'Play the Lisbon Street',kind:'Neuro Street Art Digital',path:'/play_lisbon_street',collect:'/market?collection=play-the-lisbon-street',action:place==='lisbon'?'Discover the experience':'PLAY ↗',note:place==='lisbon'?'A TotehmPaper is your key. Get Higher through Stoner, then enter the 22 Lisbon works.':'Choose a sign. Play the street.'},
 {title:'The Stoner Experience',kind:'TotehmPaper {THP}',path:'/get_higher',collect:'/market?art=totehmpaper',action:'Enter the experience ↗',note:place==='lisbon'?'The original paper, in its small premium case on the black laboratory table.':'The original paper, in its premium case on the stone table.'},
 {title:'Same but opposite',kind:'Video artwork · Wah',path:'/same_but_opposite',action:'PLAY ↗',note:'Tap to play the artwork in its own full-screen experience.'}
];
const $=id=>document.getElementById(id),buttons=[...document.querySelectorAll('.tour [data-room]')],info=$('work-info');
let engine=null,room=-1,fallback=false,pending=null,listRaf=0,lastPreview=0,station=null,hoveredSign=null,activeSign=null;
const preview=createLisbonPreview({onChange:()=>engine?.invalidate()});
const lisbonCard=document.querySelector('#lisbon .artwork');lisbonCard.append(preview.canvas);lisbonCard.classList.add('has-preview');
if(place==='new-york'){
 $('space').setAttribute('aria-label','New York gallery. Enter to find six framed Think same but opposite artworks aligned on a white wall. Click a work to open its English Discover story. Walk around either end of the wall for TotehmPaper, Origins, Play the street and Same but opposite.');
 const exhibition=document.createElement('section');exhibition.className='opposites-list';exhibition.setAttribute('aria-label','Think same but opposite — six New York artworks');
 const heading=document.createElement('h2');heading.textContent='Think same but opposite';exhibition.append(heading);
 const grid=document.createElement('div');grid.className='opposites-list-grid';
 for(const work of OPPOSITES){
  const link=document.createElement('a');link.href='/think_same_but_opposite?work='+encodeURIComponent(work.id);link.setAttribute('aria-label','Discover '+work.title);
  const image=document.createElement('img');image.src=work.image;image.alt=work.title;image.loading='lazy';
  const label=document.createElement('span');label.textContent=work.title;link.append(image,label);grid.append(link);
 }
 exhibition.append(grid);$('gallery').prepend(exhibition);
}
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
 if(room>=0)$('work-note').textContent=arrived?ROOMS[room].note:'Walking to the '+['counter','book',place==='lisbon'?'street installation':'Lisbon screen','premium cases','Same but opposite screen'][room]+'…';
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
addEventListener('pagehide',()=>{if(listRaf)cancelAnimationFrame(listRaf);listRaf=0;preview.pause();});addEventListener('pageshow',syncPreview);
window.__totehm_gallery=()=>({build:'2026-11-15-single-connection-origin-black-hole',place,rooms:place==='lisbon'?3:4,room,hoveredSign,activeSign,list:body.classList.contains('list-view'),fallback,reduced_motion:reduced.matches,experiences:[...new Set(ROOMS.filter((w,i)=>place!=='lisbon'||i!==4).map(w=>w.path)),...(place==='new-york'?['/think_same_but_opposite']:[])],experienceNavigation:place==='lisbon'?'interior-hologram-to-discover-and-thp-gated-playback':'independent-pages',inGalleryPlayback:false,lisbon:preview.diagnostics(),...engine?.diagnostics()});
function useFallback(){fallback=true;body.classList.add('no-3d','list-view');engine?.setList(true);clearInfo();syncPreview();}
try{
 const {createGallery}=await import('./gallery-spatial.mjs');
 engine=await createGallery({place,select:choose,onOverview:clearInfo,onArtwork:showStreetSign,onSignFocus:signFocus,interact,fallback:useFallback,reduced,
  onStationState:value=>{station=value;journeyState(value.vessel);controls();}
 });
 engine.setList(body.classList.contains('list-view'));
 const selected=pending;pending=null;
 if(selected!==null)choose(selected,{hash:false});
 else{const hash=location.hash;const index=[['#totehmpaper'],['#origins','#quantum'],['#lisbon'],['#stoner'],['#same-but-opposite']].findIndex(h=>h.includes(hash));if(index>=0)choose(index,{hash:false});}
}catch(error){console.warn('[gallery] Artwork list available:',error?.name||'unavailable');useFallback();}
