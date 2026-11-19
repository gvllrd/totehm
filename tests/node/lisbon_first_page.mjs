import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LISBON_FRONT_NAMES,LISBON_FRONT_SIZE,LISBON_FRONT_COPY,lisbonFrontSigns} from '../../space/lisbon-first-page.mjs';

let checks=0;
const check=(value,message)=>{assert(value,message);checks++;};
check(LISBON_FRONT_SIZE.width/LISBON_FRONT_SIZE.height===16/9,'The original artwork preserves its projected widescreen ratio');
check(LISBON_FRONT_COPY.headline==='Make them useful for your brain','The opening headline uses the requested wording');
check(LISBON_FRONT_COPY.subtitle==='Neurological & Digital Street Art','The smaller caption identifies the street-art experience');
check(LISBON_FRONT_NAMES.length===22&&new Set(LISBON_FRONT_NAMES).size===22,'All twenty-two authored signs occur exactly once');
for(const name of LISBON_FRONT_NAMES)check(fs.existsSync(new URL('../../space/assets/signs/'+name+'.png',import.meta.url)),name+' retains its original local PNG');
const first=lisbonFrontSigns(19),again=lisbonFrontSigns(19),later=lisbonFrontSigns(20);
check(JSON.stringify(first)===JSON.stringify(again),'An exhibition time reproduces exactly the same original frame');
check(first.every((pose,i)=>pose.x!==later[i].x||pose.y!==later[i].y),'Every sign moves continuously over the shared timeline');
check(first.every(pose=>pose.size>=138&&pose.size<=310),'Signs are substantially larger than the old 28–56 pixel sprites');
for(let time=0;time<=600;time+=.7){
 const poses=lisbonFrontSigns(time);
 assert.deepEqual(poses.map(pose=>pose.name),LISBON_FRONT_NAMES,'The transition retains the original sign order');
 const bounds=poses.map(pose=>{
  const extent=pose.size*(Math.abs(Math.cos(pose.rotation))+Math.abs(Math.sin(pose.rotation)))/2;
  assert.ok(pose.x-extent>=20-1e-8&&pose.x+extent<=LISBON_FRONT_SIZE.width-20+1e-8&&pose.y-extent>=20-1e-8&&pose.y+extent<=LISBON_FRONT_SIZE.height-20+1e-8,pose.name+' remains fully inside the moving screen');
  return {...pose,extent};
 });
 for(const [i,left] of bounds.entries()){
  for(const right of bounds.slice(i+1)){
   const distance=left.extent+right.extent;
   assert.ok(Math.abs(left.x-right.x)>=distance||Math.abs(left.y-right.y)>=distance,left.name+' and '+right.name+' remain individually visible');
  }
 }
}
checks++;
console.log('PASS '+checks+' canonical first-page layout checks');
