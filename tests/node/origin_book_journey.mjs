import assert from 'node:assert/strict';
import * as T from '../../space/vendor/three-0.180.0.mjs';
import {ORIGIN_BOOK_JOURNEY,sampleOriginBookJourney,sampleOriginBookReveal} from '../../space/origin-book-journey.mjs';
import {ORIGINS_VESSEL_LAYOUT as L,originsWalkHeight} from '../../space/gallery-origins-vessel.mjs';

const book=new T.Vector3(...L.bookPosition).add(new T.Vector3(0,3480,0));
const startTarget=new T.Vector3(0,3501.1,-24);
for(const mobile of [false,true]){
 let previous=null;
 for(let i=0;i<=120;i++){
  const progress=i/120,z=T.MathUtils.lerp(-4.2,L.bookApproach[2],progress);
  const height=originsWalkHeight(0,z);
  assert.notEqual(height,null,'The cinematic walk keeps the existing safe corridor');
  const eye=new T.Vector3(0,3480+height+1.65,z);
  const shot=sampleOriginBookJourney({eye,book,startTarget,progress,mobile,startFov:mobile?80:72});
  assert(shot.target.toArray().every(Number.isFinite)&&Number.isFinite(shot.fov));
  assert(shot.fov>=64&&shot.fov<=83,'The camera never introduces an extreme lens');
  if(i===0)assert(shot.target.distanceTo(startTarget)<1e-9,'Walking starts at the actual current gaze');
  if(i===120)assert(shot.target.distanceTo(book)<1e-9,'Walking ends on the physical book');
  if(previous)assert(shot.target.distanceTo(previous)<2,'The reveal has no target teleport');
  previous=shot.target.clone();
 }
}
for(const point of [[0,3502.37,-40.5],[2,3502.37,-41],[0,3502.37,-41.9]]){
 const from=new T.Vector3(...point);
 let previous=null;
 for(let i=0;i<=60;i++){
  const shot=sampleOriginBookReveal({from,focus:book,startTarget:book,progress:i/60,startFov:64});
  assert.equal(shot.position.y,from.y,'The book push retains the physical eye height');
  assert.notEqual(originsWalkHeight(shot.position.x,shot.position.z),null,'The book push never enters the lectern footprint');
  if(i===0)assert(shot.position.distanceTo(from)<1e-9&&shot.fov===64);
  if(previous)assert(shot.position.distanceTo(previous)<.06,'The book push stays smooth');
  previous=shot.position.clone();
 }
}
assert(ORIGIN_BOOK_JOURNEY.revealDuration<1,'The closer framing adds less than a second before reading');
console.log('PASS Origin corridor and book framing continuity');
