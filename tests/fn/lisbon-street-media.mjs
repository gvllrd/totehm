import assert from 'node:assert/strict';
import {createLisbonStreetMediaHandler,LISBON_STREET_MEDIA_IDS,LISBON_STREET_MEDIA_TTL} from '../../backend/supabase/functions/_shared/lisbon-street-media.ts';
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
const calls=[];
const handler=createLisbonStreetMediaHandler({
 authenticate:async authorization=>{calls.push(['identity',authorization]);return authorization==='Bearer owner'?{email:' Owner@EXAMPLE.test '}:authorization==='Bearer missing'?{email:'missing@example.test'}:null;},
 hasAccess:async email=>{calls.push(['grant',email]);return email==='owner@example.test';},
 sign:async(filename,ttl)=>{calls.push(['sign',filename,ttl]);return 'https://media.example/signed/'+filename;}
});
const request=(body,authorization='Bearer owner',method='POST',origin='https://www.totehm.space')=>new Request('https://functions.example/lisbon-street-media',{method,headers:{origin,authorization},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
for(const authorization of ['', 'Basic owner','Bearer invalid']){
 calls.length=0;const response=await handler(request({sign:'priority'},authorization));
 check(response.status===401&&(await response.json()).access===false,'A missing or invalid session cannot get a media URL');
 check(!calls.some(call=>call[0]==='grant'||call[0]==='sign'),'Unauthenticated input never reads grants or signs media');
}
calls.length=0;let response=await handler(request({sign:'stop',email:'owner@example.test',user_id:'owner'},'Bearer missing'));
check(response.status===403&&(await response.json()).reason==='locked','A member without a THP/Stoner grant is refused');
assert.deepEqual(calls,[['identity','Bearer missing'],['grant','missing@example.test']]);checks++;
for(const body of [{sign:'../priority'}, {sign:'priority.mp4'},{sign:'/priority'}, {sign:'%2e%2e/stop'},{sign:'__proto__'},{sign:'Priority'},{sign:22},{},[],null,'{bad']){
 calls.length=0;response=await handler(request(body));check(response.status===400,'Only exact canonical sign identifiers are accepted');check(calls.length===0,'Invalid paths never touch identity, grant or storage APIs');
}
for(const id of LISBON_STREET_MEDIA_IDS){
 calls.length=0;response=await handler(request({sign:id,email:'victim@example.test',path:'private/victim.mp4'}));const body=await response.json();
 check(response.status===200&&body.access&&body.url.endsWith('/'+id+'.mp4')&&body.expires_in===900,'An entitled member receives only the requested original clip');
 assert.deepEqual(calls,[['identity','Bearer owner'],['grant','owner@example.test'],['sign',id+'.mp4',LISBON_STREET_MEDIA_TTL]]);checks++;
 check(response.headers.get('cache-control')==='no-store'&&response.headers.get('vary').includes('Authorization'),'Signed URLs cannot become shared cached responses');
}
for(const name of ['authenticate','hasAccess','sign']){
 const deps={authenticate:async()=>({email:'owner@example.test'}),hasAccess:async()=>true,sign:async()=> 'https://media.example/signed'};
 deps[name]=async()=>{throw new Error('PRIVATE_DETAIL');};response=await createLisbonStreetMediaHandler(deps)(request({sign:'priority'}));
 check(response.status===503&&!(await response.text()).includes('PRIVATE_DETAIL'),'A '+name+' outage fails closed without leaking internal details');
}
response=await createLisbonStreetMediaHandler({authenticate:async()=>({email:'owner@example.test'}),hasAccess:async()=>true,sign:async()=>null})(request({sign:'priority'}));check(response.status===503,'An empty storage signature never grants a video URL');
response=await handler(request(null,'','OPTIONS'));check(response.status===200&&response.headers.get('access-control-allow-origin')==='https://www.totehm.space','SPACE preflight works without authentication');
response=await handler(request(null,'Bearer owner','GET'));check(response.status===405,'GET cannot mint a signed URL');
response=await handler(request({sign:'stop'},'Bearer owner','POST','https://evil.example'));check(response.headers.get('access-control-allow-origin')!=='https://evil.example','Foreign origins are not reflected');
console.log('PASS '+checks+' Lisbon private-media authorization checks');
