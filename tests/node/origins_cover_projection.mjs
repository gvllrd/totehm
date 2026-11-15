import assert from 'node:assert/strict';
import {coverTransform} from '../../space/gallery-book-expansion.mjs';
let checks=0;
for(const points of [[{x:230,y:510},{x:470,y:510},{x:520,y:630},{x:180,y:630}],[{x:181,y:285},{x:636,y:191},{x:573,y:704},{x:94,y:578}],[{x:110,y:92},{x:380,y:92},{x:380,y:470},{x:110,y:470}]]){
 const m=coverTransform(points).slice(9,-1).split(',').map(Number);
 for(const [i,[x,y]]of [[0,0],[1000,0],[1000,1400],[0,1400]].entries()){
  const w=m[3]*x+m[7]*y+m[15];
  assert(Math.abs((m[0]*x+m[4]*y+m[12])/w-points[i].x)<1e-7);
  assert(Math.abs((m[1]*x+m[5]*y+m[13])/w-points[i].y)<1e-7);checks+=2;
 }
}
console.log('PASS '+checks+' exact cover perspective coordinates');
