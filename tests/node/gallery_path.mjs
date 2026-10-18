import assert from 'node:assert/strict';
import {createWalkway} from '../../space/gallery-path.mjs';
const walkway=createWalkway({x:0,z:-3,radius:1.2});
const stations=[{x:0,z:8.7},{x:-7.5,z:-3},{x:7.5,z:-3},{x:0,z:3},{x:0,z:-25},{x:0,z:-57}];
let checks=0;
for(const from of stations)for(const to of stations){
 const path=walkway.route(from,to);assert(path&&path.length>=2);
 for(let i=1;i<path.length;i++)assert(walkway.clear(path[i-1],path[i]),'every segment avoids tree and walls');
 assert.deepEqual(path.at(-1),to);checks++;
}
assert(walkway.route(stations[1],stations[2]).length>2,'cross-room visit goes around the abstract trunk');checks++;
for(const p of [{x:0,z:-3},{x:1,z:-3},{x:12.8,z:-3},{x:4,z:-16},{x:12,z:-50}]){
 assert(!walkway.allowed(p.x,p.z));assert.equal(walkway.route(stations[0],p),null);checks++;
}
for(let i=0;i<20;i++){
 const side=i<10?1:-1,a=side*(2.07+(i%5)*.185),r=9.45,to={x:Math.sin(a)*r,z:-3+Math.cos(a)*r};
 const path=walkway.route(stations[0],to);assert(path);
 for(let j=1;j<path.length;j++)assert(walkway.clear(path[j-1],path[j]));checks++;
}
for(const from of [{x:0,z:-1.799},{x:1.201,z:-3},{x:9,z:-1000000}]){
 const path=walkway.route(from,stations[0]);assert(path);
 for(let i=1;i<path.length;i++)assert(walkway.clear(path[i-1],path[i]));checks++;
}
assert(walkway.allowed(0,-16)&&walkway.allowed(9,-1000000),'portal and endless outside path are walkable');checks++;
assert(!walkway.clear({x:6,z:-20},{x:6,z:-12}),'outside cannot enter through a wall');checks++;
console.log('PASS '+checks+' circular gallery and portal checks');
