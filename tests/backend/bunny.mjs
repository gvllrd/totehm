// Contract and failure tests. Synthetic credentials only; no network or user data.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto,createHmac} from 'node:crypto';
const {transform}=await import(process.env.ESBUILD_MODULE || 'esbuild');
const source=fs.readFileSync(new URL('../../backend/supabase/functions/_shared/bunny.ts',import.meta.url),'utf8').replace(/^import .*\n/m,'');
const code=(await transform(source,{loader:'ts',format:'cjs',target:'es2022'})).code;
const readyGuid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',uploadGuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let passed=0;
async function fixture(o={}){
 const writes=[],requests=[],updates=[],env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',SUPABASE_ANON_KEY:'synthetic-anon',BUNNY_LIBRARY_ID:'1',BUNNY_API_KEY:'synthetic-upload',BUNNY_ACCOUNT_API_KEY:'synthetic-account'};
 const admin={from:()=>({upsert:async x=>{writes.push(x);return{};},update:x=>({eq:async()=>{updates.push(x);return{};}})})};
 const api={exports:{}};
 const fetch=async(url,init={})=>{
  requests.push({url,init});
  if(url.startsWith('https://video.bunnycdn.com/')){
   if(!url.includes('?'))return Response.json(o.video || {status:4,encodeProgress:50,availableResolutions:'720p',length:3,width:1080,height:1920});
   return Response.json({items:o.empty?[]:o.processingOnly?[{guid:uploadGuid,status:2}]:[{guid:uploadGuid,status:2},{guid:readyGuid,status:3,availableResolutions:'1080p'}]});
  }
  if(url.includes('/videolibrary/'))return Response.json({ReadOnlyApiKey:o.noReadKey?'':'synthetic-read',PullZoneId:1,EnabledResolutions:'720p,1080p',WebhookUrl:o.noWebhook?'':'https://test.supabase.co/functions/v1/bunny-webhook'});
  if(url.includes('/pullzone/'))return Response.json({ZoneSecurityKey:'synthetic-token',ZoneSecurityEnabled:!o.hotlinkOnly,ZoneSecurityIncludeHashRemoteIP:false,Hostnames:[{Value:'test.b-cdn.net'}]});
  const signed=url.includes('/bcdn_token=');
  if(signed){
   const m=url.match(/bcdn_token=([^&]+)&expires=(\d+)&token_path=([^/]+)(\/[^/]+\/)/);
   assert.ok(m,'directory signature format');const path=decodeURIComponent(m[3]);
   const expected='HS256-'+createHmac('sha256','synthetic-token').update(path+m[2]+'token_path='+path).digest('base64url');
   assert.equal(m[1],expected,'matches independent HMAC implementation');assert.equal(path,m[4],'token scoped to one video');
   return new Response(null,{status:o.badSignature?403:o.empty||o.processingOnly?404:200});
  }
  assert.equal(init.headers.Referer,'https://www.totehm.space/','probe bypasses no-referrer blocking');
  return new Response(null,{status:403});
 };
 vm.runInNewContext(code,{module:api,exports:api.exports,createClient:()=>admin,Deno:{env:{get:k=>env[k]}},fetch,crypto:webcrypto,TextEncoder,Uint8Array,AbortSignal,Response,Date,console,btoa:s=>Buffer.from(s,'binary').toString('base64')});
 const c=await api.exports.configured;return{c,api:api.exports,writes,requests,updates};
}
for(const [name,opts,available] of [
 ['protected configured CDN',{},true],['hotlink 403 is not token protection',{hotlinkOnly:true},false],
 ['rejected signature',{badSignature:true},false],['missing webhook',{noWebhook:true},false],
 ['missing webhook signing key',{noReadKey:true},false],['empty library allows first upload',{empty:true},true],
 ['encoding first video keeps upload available',{processingOnly:true},true]
]){
 const f=await fixture(opts);assert.equal(f.c.ready,available,name);
 if(!opts.empty&&!opts.processingOnly)assert.ok(f.requests.filter(r=>r.url.includes('.b-cdn.net')).every(r=>r.url.includes(readyGuid)),'newest encoding clip is not used for the probe');
 assert.ok(!JSON.stringify(f.writes).includes('synthetic-'),'diagnostics never persist secrets');passed++;
}
for(const [name,video,expected] of [
 ['HD rendition can start before full encoding',{status:4,encodeProgress:50,availableResolutions:'720p',length:3},'ready'],
 ['unfinished low rendition waits for HD',{status:4,encodeProgress:50,availableResolutions:'240p',length:3},'processing'],
 ['fully encoded SD source remains playable',{status:3,encodeProgress:100,availableResolutions:'360p',length:3},'ready'],
 ['overlong clip rejected',{status:3,encodeProgress:100,availableResolutions:'1080p',length:35},'failed'],
 ['failed encoding',{status:5,length:3},'failed']
]){
 const f=await fixture({video});assert.equal(await f.api.refreshVideo({id:'test',bunny_video_id:readyGuid}),expected,name);passed++;
}
console.log(`${passed} Bunny backend contract checks passed`);
