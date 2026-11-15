import './lisbon_urbex_hologram.mjs';
import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createNewYorkGallery} from '../../space/gallery-new-york.mjs';
import {INTENTIONS} from '../../space/gallery-lisbon-urbex-layout.mjs';
import {createOriginsVessel} from '../../space/gallery-origins-vessel.mjs';
import {checkLisbonStreetAccess,requestLisbonStreetMedia} from '../../space/lisbon-street-access.mjs';

let checks=0;const check=(condition,message)=>{assert(condition,message);checks++;};
const meshes=root=>{const result=[];root.traverse(o=>{if(o.isMesh)result.push(o);});return result;};
const opaque=object=>!(Array.isArray(object.material)?object.material:[object.material]).every(m=>m?.transparent);
for(const mobile of [false,true]){const label=mobile?'mobile':'desktop',scene=new T.Scene();
 const vessel=createOriginsVessel(scene,{mobile});scene.updateMatrixWorld(true);const va=meshes(vessel.root),vd=vessel.diagnostics();
 const saucer=vessel.root.getObjectByName('ORIGINS — hovering saucer'),corridor=vessel.root.getObjectByName('ORIGINS — transparent dark glass corridor'),hall=vessel.root.getObjectByName('ORIGINS — enclosed chamber');
 check(saucer&&corridor&&hall,'The saucer, glass corridor and enclosed Origins hall are real three-dimensional spaces on '+label);
 const saucerBounds=new T.Box3().setFromObject(saucer);check(saucerBounds.min.y>7.65&&saucerBounds.getSize(new T.Vector3()).x>10,'The flying disk floats above the building at monumental scale on '+label);
 const glassMeshes=meshes(corridor).filter(o=>(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.transparent&&m.opacity>0&&m.opacity<.6));
 check(glassMeshes.length>=3,'The corridor actually uses transparent glass walls and ceiling on '+label);
 const intentColors=new Set(va.flatMap(o=>(Array.isArray(o.material)?o.material:[o.material]).map(m=>m.color?.getHexString()).filter(Boolean)));
 check(INTENTIONS.every(i=>intentColors.has(i.color.replace('#','').toLowerCase())),'All seven exact intention colours really render in the futuristic journey on '+label);
 const workIds=new Set(vessel.pickables.filter(o=>o.userData.kind==='origins-vessel-work').map(o=>o.userData.workId));
 check(workIds.size===20&&vessel.pickables.some(o=>o.userData.kind==='origins-vessel-book'),'Twenty original works and the ceremonial book are genuinely selectable on '+label);
 const book=new T.Vector3(...vessel.journey.bookPosition),rays=va.filter(opaque);
 for(const direction of [new T.Vector3(1,0,0),new T.Vector3(-1,0,0),new T.Vector3(0,0,-1),new T.Vector3(0,1,0)])check(new T.Raycaster(book.clone(),direction,.2,30).intersectObjects(rays).length>0,'The Origins chamber is physically enclosed toward '+direction.toArray()+' on '+label);
 check(vessel.journey.outbound.length>=3&&vessel.journey.targets.length===vessel.journey.outbound.length,'The saucer and tunnel form a complete camera journey on '+label);
 vessel.dispose();vessel.dispose();check(scene.children.length===0,'The Origins vessel and its assets dispose repeatably on '+label);
 const ny=createNewYorkGallery(scene,null,{mobile});check(ny.diagnostics().kind==='coastal-castle-glass-museum'&&ny.diagnostics().opposites?.count===6,'New York keeps its six existing independent opposites on '+label);ny.dispose();
}
// Verify the authority and signed-media protocol independently from any UI.
const originalFetch=globalThis.fetch,client={auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}}})}},guest={auth:{getSession:async()=>({data:{session:null}})}};
let requests=0;
const respond=(payload,status=200)=>{globalThis.fetch=async()=>{requests++;return new Response(JSON.stringify(payload),{status,headers:{'Content-Type':'application/json'}});};};
try{
 respond({access:true});const anonymous=await checkLisbonStreetAccess({client:guest});
 check(anonymous.state==='guest'&&!anonymous.owned&&requests===0,'An anonymous visitor cannot request an entitlement without a session');
 respond({access:true});check((await checkLisbonStreetAccess({client})).owned,'The actual server grant is the source of access');
 respond({access:false,reason:'locked'});check((await checkLisbonStreetAccess({client})).state==='missing','A member without the entitlement remains outside');
 respond({access:false,reason:'error'},503);check((await checkLisbonStreetAccess({client})).state==='error','Server errors fail closed');
 globalThis.fetch=async()=>{throw new Error('offline');};check(!(await checkLisbonStreetAccess({client})).owned,'An offline response cannot become access');
 const signed='https://abujjbkbbiumxrokozph.supabase.co/storage/v1/object/sign/play-signals/priority.mp4?token=fixture';
 respond({access:true,url:signed,expires_in:300});const media=await requestLisbonStreetMedia('priority',{client});
 check(media.owned&&media.url===signed&&media.expiresIn===300,'An entitled member receives the signed canonical original clip');
 for(const url of ['https://evil.test/storage/v1/object/sign/play-signals/priority.mp4?token=x',signed.replace('priority.mp4','stop.mp4'),signed.split('?')[0],signed.replace('/sign/','/public/')]){
  respond({access:true,url});const denied=await requestLisbonStreetMedia('priority',{client});check(!denied.owned&&!denied.url,'A foreign, wrong, unsigned or public media URL is rejected');
 }
 const before=requests;check(!(await requestLisbonStreetMedia('../priority',{client})).owned&&requests===before,'An invalid sign identifier never reaches the media endpoint');
 respond({access:false,url:signed},403);check(!(await requestLisbonStreetMedia('priority',{client})).owned,'A URL in an unentitled response does not grant playback');
 const abort=new AbortController();globalThis.fetch=async()=>{abort.abort();return new Response(JSON.stringify({access:true}),{status:200});};
 check(!(await checkLisbonStreetAccess({client,signal:abort.signal})).owned,'An aborted, late grant cannot unlock the experience');
}finally{globalThis.fetch=originalFetch;}
console.log('PASS '+checks+' Lisbon street portal and Origins vessel checks');
