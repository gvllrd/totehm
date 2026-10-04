// Authorization boundaries and mixed batch failures; synthetic rows/credentials only.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const {transform}=await import(process.env.ESBUILD_MODULE || 'esbuild');
const source=fs.readFileSync(new URL('../../backend/supabase/functions/bunny-video/index.ts',import.meta.url),'utf8').replace(/^import .*\n/gm,'');
const code=(await transform(source,{loader:'ts',target:'es2022'})).code;
const ids=['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];let passed=0;
async function call(body,{denyNext=false,brokenNext=false,processing=false,ownerAccess=false,ready=true}={}){
 let handler;const reads=[],signs=[],rpc=[];
 const viewer=()=>({rpc:async(_,b)=>{rpc.push(b.p_id);const i=b.p_id==='spot-a'?0:b.p_id==='spot-b'?1:-1;return {data:i<0 || i===1 && denyNext?{ok:false}:{ok:true,spot:{clip:{id:ids[i]}}}};}});
 const admin={from:()=>{const q={id:null,user:null,select(){return q;},eq(k,v){q[k==='user_id'?'user':'id']=v;return q;},async maybeSingle(){reads.push({id:q.id,user:q.user});const i=ids.indexOf(q.id);return {data:i<0 || q.user && !ownerAccess?null:{id:q.id,bunny_video_id:'cdn-'+i,status:processing && i===1?'processing':'ready'}};}};return q;}};
 vm.runInNewContext(code,{Deno:{serve:f=>handler=f},viewer,owner:async()=>({id:'owner'}),admin,config:async()=>({ready}),refreshVideo:async row=>{if(brokenNext && row.id===ids[1])throw Error('upstream');return 'processing';},signedHLS:async guid=>{signs.push(guid);return {url:'https://cdn.test/signed/'+guid+'/playlist.m3u8',expires:1234567890};},UUID:/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,corsHeaders:()=>({'Access-Control-Allow-Origin':'https://www.totehm.space'}),SITE_SPACE:'https://www.totehm.space',Response,console});
 const response=await handler(new Request('https://test.supabase.co/functions/v1/bunny-video',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
 return {status:response.status,body:await response.json(),reads,signs,rpc,headers:response.headers};
}
const pair={clips:[{id:ids[0],spot:'spot-a'},{id:ids[1],spot:'spot-b'}]};
let r=await call({id:ids[0],spot:'spot-a'});assert.equal(r.status,200);assert.equal(r.body.status,'ready');assert.ok(r.body.url.includes('cdn-0'));passed++;
r=await call({id:ids[1],spot:'spot-a'});assert.equal(r.status,404);assert.equal(r.reads.length,0);assert.equal(r.signs.length,0);passed++;
r=await call({id:ids[0],spot:'hidden'});assert.equal(r.status,404);assert.equal(r.reads.length,0);passed++;
r=await call(pair);assert.equal(r.status,200);assert.equal(r.body.clips.length,2);assert.equal(r.signs.length,2);assert.ok(r.body.clips.every((v,i)=>v.id===ids[i] && v.url.includes('cdn-'+i)));assert.equal(r.headers.get('cache-control'),'no-store');passed++;
r=await call(pair,{denyNext:true});assert.equal(r.body.clips[0].status,'ready');assert.equal(r.body.clips[1].error,'not_found');assert.ok(!r.body.clips[1].url && !r.body.clips[1].status);assert.equal(r.reads.length,1);passed++;
r=await call(pair,{processing:true});assert.equal(r.body.clips[1].status,'processing');assert.ok(!r.body.clips[1].url);assert.equal(r.signs.length,1);passed++;
r=await call(pair,{processing:true,brokenNext:true});assert.equal(r.body.clips[0].status,'ready');assert.equal(r.body.clips[1].error,'video_failed');assert.equal(r.signs.length,1);passed++;
for(const body of [{clips:[]},{clips:[...pair.clips,pair.clips[0]]},{clips:[{id:'invalid',spot:'spot-a'}]},{...pair,action:'complete'}]){r=await call(body);assert.equal(r.status,400);assert.equal(r.rpc.length,0);passed++;}
r=await call({id:ids[0],action:'complete'},{ownerAccess:true});assert.equal(r.status,200);assert.equal(r.body.status,'ready');assert.equal(r.signs.length,0);passed++;
r=await call({id:ids[0],action:'complete'});assert.equal(r.status,404);assert.equal(r.signs.length,0);passed++;
r=await call(pair,{ready:false});assert.ok(r.body.clips.every(v=>v.error==='video_unavailable' && !v.url));passed++;
assert.ok(!JSON.stringify(r.body).includes('cdn-'));console.log(`${passed} playback authorization checks passed`);
