import {ORIGINS} from './gallery-artworks.mjs';
import {SIGNS,PHRASES} from './gallery-spatial-data.mjs';
import {createSpatialPlayer} from './gallery-spatial-player.mjs';

const reduced=matchMedia('(prefers-reduced-motion: reduce)'),body=document.body;
const placeButtons=[...document.querySelectorAll('.tour [data-place]')];
let engine=null,selected=null,fallback=false,ready=false,pending=null,selectionSeq=0;
const interact=()=>body.classList.add('exploring');
async function services(){
 if(window.__spaceAccount)return window.__spaceAccount;
 return new Promise((resolve,reject)=>{
  const finish=()=>{clearTimeout(timer);removeEventListener('space-account-ready',finish);resolve(window.__spaceAccount);};
  const timer=setTimeout(()=>{removeEventListener('space-account-ready',finish);reject(new Error('Account service unavailable'));},7000);
  addEventListener('space-account-ready',finish,{once:true});
  if(window.__spaceAccount)finish();
 });
}
const player=createSpatialPlayer({services,
 onMedia:(video,selection)=>engine?.setMedia(video,selection),
 onClose:()=>{engine?.setMedia(null,null);engine?.invalidate();},
 onChange:()=>engine?.invalidate(),onSelect:selection=>choose(selection)
});
function sync(){
 const kind=selected?.kind,place=kind==='origin'?'origins':kind==='paper'?'paper':['sign','lisbon'].includes(kind)?'lisbon':null;
 body.dataset.focus=place||'overview';
 placeButtons.forEach(b=>b.setAttribute('aria-current',String(b.dataset.place===place)));
 const index=kind==='origin'?selected.index:null;
 document.getElementById('journey-position').textContent=index!==null?'Origins · '+String(index+1).padStart(2,'0')+' / 20':place==='paper'?'The original TotehmPaper':place==='lisbon'?'Play the Lisbon Streets':'TOTEHM · Unfolded';
 document.getElementById('previous-work').disabled=index===0||index===null;
 document.getElementById('explore-space').textContent=index===19?'Back to the paper ↗':index!==null?'Next artwork →':'Follow the story →';
 document.getElementById('world-status').textContent=index!==null?ORIGINS[index].title+' · '+(index+1)+' of 20':place==='lisbon'?'Choose a sign to play the street':place==='paper'?'TotehmPaper · The Stoner Experience':'Beginning of the journey';
}
function hashFor(selection){return selection.kind==='origin'?'origin-'+String(selection.index+1).padStart(2,'0'):selection.kind==='paper'?'totehmpaper':selection.kind==='sign'?'lisbon-'+selection.key:'lisbon';}
function valid(selection){return selection&&(selection.kind==='origin'?Number.isInteger(selection.index)&&!!ORIGINS[selection.index]:selection.kind==='sign'?Object.hasOwn(SIGNS,selection.key):['paper','lisbon'].includes(selection.kind));}
function choose(selection,{hash=true}={}){
 if(!valid(selection))return;const token=++selectionSeq;selected={...selection};interact();player.close();sync();
 if(hash)history.replaceState(null,'',location.pathname+location.search+'#'+hashFor(selection));
 document.getElementById('sign-picker').open=false;
 const finish=()=>{
  if(token!==selectionSeq)return;
  if(selection.kind!=='lisbon'){player.setVisible(true);player.setFallback(fallback||body.classList.contains('list-view'));player.open(selection);}
  else if(fallback||body.classList.contains('list-view'))document.getElementById('sign-picker').open=true;
 };
 if(!ready){pending={selection:{...selection},token};return;}
 if(fallback||body.classList.contains('list-view')){finish();return;}
 if(!engine.visit(selection,finish)){document.getElementById('world-status').textContent='Choose a clear part of the path to continue.';}
}
function advance(delta=1){
 if(delta<0&&selected?.kind!=='origin')return;
 const n=selected?.kind==='origin'?selected.index+delta:0;
 if(n>=ORIGINS.length){choose({kind:'paper'});return;}
 choose({kind:'origin',index:Math.max(0,n)});
}
function overview(){selectionSeq++;pending=null;selected=null;player.close();engine?.overview();interact();sync();history.replaceState(null,'',location.pathname+location.search);}
function setList(value){
 body.classList.toggle('list-view',value);interact();engine?.setList(value);player.setVisible(!value);
 player.setFallback(fallback||value);const button=document.getElementById('view-list');button.textContent=value?'Return to the space':'Artworks';button.setAttribute('aria-pressed',String(value));
}
function makeController(container){
 container.replaceChildren();
 for(const [key,[left,top,width]] of Object.entries(SIGNS)){
  const button=document.createElement('button');button.type='button';button.dataset.sign=key;button.style.cssText=`left:${left}%;top:${top}%;width:${width}%`;
  button.setAttribute('aria-label',key.replaceAll('_',' ')+'. '+PHRASES[key]);
  const image=document.createElement('img');image.src='/assets/signs/'+key+'.png';image.alt=key.replaceAll('_',' ');button.append(image);button.addEventListener('click',()=>{player.setVisible(true);choose({kind:'sign',key});});container.append(button);
 }
}
makeController(document.getElementById('lisbon-controller'));
const listController=document.createElement('div');listController.className='list-controller';listController.setAttribute('aria-label','Play the Lisbon street controller');
document.querySelector('#lisbon .artwork').replaceChildren(listController);makeController(listController);
placeButtons.forEach(b=>b.addEventListener('click',()=>choose(b.dataset.place==='paper'?{kind:'paper'}:b.dataset.place==='lisbon'?{kind:'lisbon'}:{kind:'origin',index:0})));
document.getElementById('enter-gallery').addEventListener('click',()=>{choose({kind:'origin',index:0});document.getElementById('space').focus({preventScroll:true});});
document.getElementById('overview').addEventListener('click',overview);
document.getElementById('explore-space').addEventListener('click',()=>advance());
document.getElementById('previous-work').addEventListener('click',()=>advance(-1));
document.getElementById('view-list').addEventListener('click',()=>setList(!body.classList.contains('list-view')));
document.querySelector('.skip').addEventListener('click',()=>setList(true));
document.querySelectorAll('#gallery a').forEach(a=>a.addEventListener('click',e=>{
 if(a.closest('#origins')){e.preventDefault();player.setVisible(true);choose({kind:'origin',index:Number(a.dataset.origin||0)});}
 else if(a.closest('#totehmpaper')){e.preventDefault();player.setVisible(true);choose({kind:'paper'});}
 else if(a.closest('#lisbon')){e.preventDefault();choose({kind:'lisbon'});}
}));
const member=document.getElementById('member'),menu=document.getElementById('member-menu');
member.addEventListener('click',()=>{const open=menu.classList.toggle('is-open');member.setAttribute('aria-expanded',String(open));});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.member')){menu.classList.remove('is-open');member.setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',e=>{
 if(e.target.closest('input,textarea,select,[contenteditable=true]'))return;
 if(e.key==='Escape'){menu.classList.remove('is-open');member.setAttribute('aria-expanded','false');document.getElementById('sign-picker').open=false;player.close();engine?.stop();}
 if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();advance(e.key==='PageDown'?1:-1);}
 if(e.key==='Home'&&!e.target.closest('#spatial-player')){e.preventDefault();overview();}
});
window.__totehm_gallery=()=>({build:'2026-10-21-space-one-journey',rooms:3,selected:selected?{...selected}:null,list:body.classList.contains('list-view'),fallback,reduced_motion:reduced.matches,player:player.diagnostics(),...engine?.diagnostics()});
function useFallback(){fallback=true;ready=true;body.classList.add('no-3d','list-view');engine?.setList(true);player.setFallback(true);sync();}
sync();
try{
 const {createGallery}=await import('./gallery-3d.mjs');
 engine=await createGallery({onPick:choose,onMove:()=>player.close(),onArrive:()=>sync(),interact,fallback:useFallback,reduced});
 ready=true;engine.setList(body.classList.contains('list-view'));
}catch(error){console.warn('[spatial] Artwork view available:',error?.name||'unavailable');useFallback();}
if(pending){const p=pending;pending=null;if(p.token===selectionSeq)choose(p.selection,{hash:false});}
else{
 let resume=null;
 if(new URLSearchParams(location.search).has('resume'))try{const saved=JSON.parse(sessionStorage.getItem('space-spatial-resume'));if(saved&&Date.now()-saved.at<86400000&&valid(saved.selection))resume=saved.selection;sessionStorage.removeItem('space-spatial-resume');}catch{}
 const hash=location.hash.slice(1),match=/^origin-(\d{1,2})$/.exec(hash);
 if(resume)choose(resume);
 else if(match&&Number(match[1])>=1&&Number(match[1])<=20)choose({kind:'origin',index:Number(match[1])-1},{hash:false});
 else if(['origins','quantum','beyond'].includes(hash))choose({kind:'origin',index:0});
 else if(['totehmpaper','stoner'].includes(hash))choose({kind:'paper'},{hash:false});
 else if(hash.startsWith('lisbon-')&&Object.hasOwn(SIGNS,hash.slice(7)))choose({kind:'sign',key:hash.slice(7)},{hash:false});
 else if(hash==='lisbon')choose({kind:'lisbon'},{hash:false});
}
