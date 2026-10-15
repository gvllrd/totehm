import assert from 'node:assert/strict';
import {createWalkway} from '../../space/gallery-path.mjs';
const walkway=createWalkway({x:0,z:-2.6,radius:1.85});
const stations=[{x:.5,z:8},{x:-2.7,z:-2},{x:-3.6,z:-7.3},{x:2.5,z:-3.8},{x:3.7,z:-7.3}];
let checks=0;
for(const from of stations)for(const to of stations) {
  const path=walkway.route(from,to);
  assert(path&&path.length>=2,'each pair of stations is reachable');
  for(let i=1;i<path.length;i++)assert(walkway.clear(path[i-1],path[i]),'every segment clears the tree, bench and walls');
  assert.deepEqual(path.at(-1),to);checks++;
}
assert(walkway.route(stations[1],stations[3]).length>2,'the direct cross-gallery visit detours around the trunk');checks++;
for(const point of [{x:0,z:-2.6},{x:1,z:-2.6},{x:-3,z:3.3},{x:6.5,z:0},{x:0,z:-12}]) {
  assert(!walkway.allowed(point.x,point.z));assert.equal(walkway.route(stations[0],point),null);checks++;
}
// Free movement can stop beside a root or a bench corner, then start a guided tour.
for(const from of [{x:1.851,z:-2.6},{x:0,z:-.749},{x:-4.651,z:3.3},{x:-3,z:4.051}]) {
  const path=walkway.route(from,stations[3]);assert(path);
  for(let i=1;i<path.length;i++)assert(walkway.clear(path[i-1],path[i]));checks++;
}
console.log('PASS '+checks+' route and collision checks');
