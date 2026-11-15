import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {createModernGallery} from '../../space/gallery-modern.mjs';
import {createNewYorkGallery} from '../../space/gallery-new-york.mjs';
import {createModernPhysics,createModernWalkway} from '../../space/gallery-modern-navigation.mjs';
import {DOME,INTENTIONS} from '../../space/gallery-lisbon-dome-layout.mjs';
import {createOriginsVessel} from '../../space/gallery-origins-vessel.mjs';
import {checkLisbonStreetAccess,requestLisbonStreetMedia} from '../../space/lisbon-street-access.mjs';

let checks=0;const check=(condition,message)=>{assert(condition,message);checks++;};
const meshes=root=>{const result=[];root.traverse(o=>{if(o.isMesh)result.push(o);});return result;};
const opaque=object=>!(Array.isArray(object.material)?object.material:[object.material]).every(m=>m?.transparent);
const contains=(box,point)=>point.x>=box.min.x&&point.x<=box.max.x&&point.z>=box.min.z&&point.z<=box.max.z;
for(const mobile of [false,true]){
 const label=mobile?'mobile':'desktop',scene=new T.Scene(),gallery=createModernGallery(scene,null,{mobile});scene.updateMatrixWorld(true);
 const d=gallery.diagnostics(),all=meshes(gallery.root),physical=[];gallery.root.traverse(o=>{if(o.userData.lisbonStreetSign)physical.push(o);});
 check(d.facade?.cityHallOnly&&d.facade.collaboration&&d.facade.heading==='MAKE THE LISBON STREETS HIGHER','Lisbon has the collaboration facade and its full entrance headline on '+label);
 const emblem=gallery.root.getObjectByName('Lisbon municipal emblem relief'),logo=gallery.root.getObjectByName('TOTEHM native collaboration piece'),cross=gallery.root.getObjectByName('Collaboration multiplication X');
 check(emblem?.isMesh&&logo?.isMesh&&cross,'The emblem, native TOTEHM and collaboration X are actual objects on '+label);
 emblem.geometry.computeBoundingBox();logo.geometry.computeBoundingBox();
 check(emblem.geometry.boundingBox.getSize(new T.Vector3()).z>.05,'The municipal emblem keeps measurable physical relief on '+label);
 check(logo.geometry.userData.perforations===12&&logo.geometry.boundingBox.getSize(new T.Vector3()).z>.015,'The native twelve-notch TOTEHM is extruded rather than painted on '+label);
 check(physical.every(o=>o.userData.signId==='lisboa_city_hall'),'Only the Lisbon municipal emblem remains as a physical facade sign on '+label);
 check(!all.some(o=>/Helipad ground marking|Crosswalk painted stripe|galvanized street post|Motorway galvanized support|pedestrian crossing shared/i.test(o.name)),'No former roadside pole or ground marking remains outside on '+label);
 check(!gallery.root.getObjectByName('The original mouth — sculpted tongue and dimensional THP'),'The previous exterior tongue is removed from the collaboration facade on '+label);
 const boat=d.pavement.boatCentre;check(boat[0]===0&&boat[1]===4&&boat[1]-d.pavement.medallionDiameter/2>DOME.centerZ+DOME.radiusZ,'The full central Lisbon caravel is visible in front of the rebuilt dome on '+label);
 const leaves=['left','right'].map(side=>gallery.root.getObjectByName('Tinted glass entrance — '+side+' leaf'));
 check(leaves.every(o=>o?.isMesh&&o.material.transparent&&o.material.opacity>.1&&o.material.opacity<.7),'Two physically tinted, transparent glass leaves reveal the interior on '+label);
 const body=createModernPhysics({x:0,z:2},gallery.obstacles,gallery.roofProfile);for(let i=0;i<120;i++)body.step(.025,{dz:-.065});
 check(body.position.z>-.3&&body.position.z<.2,'The real visitor body stops at the closed glass door on '+label);
 const panorama=gallery.installation||gallery.performance,patches=all.filter(o=>o.userData.curvedStreetSign),pd=panorama.diagnostics();
 check(patches.length===22&&new Set(patches.map(o=>o.userData.id)).size===22,'All twenty-two original signs inhabit the curved interior on '+label);
 check(pd.curved&&pd.compoundCurvature&&pd.matchingStandaloneDrift&&pd.videoDecoders===0,'The interior uses the original floating composition without decoding public clips on '+label);
 for(const patch of patches){
  const normals=patch.geometry.attributes.normal,positions=patch.geometry.attributes.position;
  check(normals&&positions.count>12,'The '+patch.userData.id+' sign is an actual tessellated surface on '+label);
  const first=new T.Vector3().fromBufferAttribute(normals,0).normalize();let change=0;
  for(let i=1;i<normals.count;i++)change=Math.max(change,1-first.dot(new T.Vector3().fromBufferAttribute(normals,i).normalize()));
  check(change>.000001,'The '+patch.userData.id+' sign bends with the dome on '+label);
 }
 const backdrop=gallery.root.getObjectByName('Lisbon curved street panorama');backdrop.geometry.computeBoundingBox();
 const size=backdrop.geometry.boundingBox.getSize(new T.Vector3());check(size.x>12&&size.z>2,'The full installation wraps a broad interior arc on '+label);
 const shelter=gallery.root.getObjectByName('Sheltered exterior THP and Discover portico'),cases=[];gallery.root.traverse(o=>{if(o.userData.premiumPackaging)cases.push(o);});
 check(shelter&&cases.length===6,'Six native premium cases are presented beneath an exterior portico on '+label);
 const roofMeshes=meshes(shelter).filter(o=>/roof|canopy|shelter|portico/i.test(o.name));
 for(const item of cases){const box=new T.Box3().setFromObject(item),centre=box.getCenter(new T.Vector3());
  check(centre.z>DOME.centerZ+DOME.radiusZ&&item.userData.dimensions[0]<.13,'A small premium THP is genuinely outside the dome on '+label);
  check(roofMeshes.some(o=>{const bounds=new T.Box3().setFromObject(o);return contains(bounds,centre)&&bounds.min.y>box.max.y;}),'The THP display has a real overhead shelter on '+label);
 }
 check(gallery.pickables.some(o=>o.userData.kind==='lisbon-discover'),'The external Discover monolith is an accessible scene target on '+label);
 check(!all.some(o=>o.name==='Black backing for the secondary artwork'||o.name==='Origins black reading slab'),'Origins and Same but opposite no longer occupy the main dome on '+label);
 const nav=createModernWalkway(gallery.obstacles);
 for(const station of gallery.stations.filter(s=>s&&['thp','play'].includes(s.id))){
  const route=nav.route({x:0,z:16},{x:station.approach[0],z:station.approach[2]});check(route?.length>=2,'The '+station.id+' entrance station remains physically reachable on '+label);
 }
 gallery.dispose();gallery.dispose();check(scene.children.length===0,'The rebuilt entrance disposes repeatably on '+label);

 const vessel=createOriginsVessel(scene,{mobile});scene.updateMatrixWorld(true);const va=meshes(vessel.root),vd=vessel.diagnostics();
 const saucer=vessel.root.getObjectByName('ORIGINS — hovering saucer'),corridor=vessel.root.getObjectByName('ORIGINS — transparent dark glass corridor'),hall=vessel.root.getObjectByName('ORIGINS — enclosed chamber');
 check(saucer&&corridor&&hall,'The saucer, glass corridor and enclosed Origins hall are real three-dimensional spaces on '+label);
 const saucerBounds=new T.Box3().setFromObject(saucer);check(saucerBounds.min.y>DOME.height&&saucerBounds.getSize(new T.Vector3()).x>10,'The flying disk floats above the dome at monumental scale on '+label);
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
 check(!(await checkLisbonStreetAccess({client,signal:abort.signal})).owned,'An aborted, late grant cannot unlock the dome');
}finally{globalThis.fetch=originalFetch;}
console.log('PASS '+checks+' Lisbon street portal and Origins vessel checks');
