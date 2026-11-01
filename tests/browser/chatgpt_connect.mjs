// Consent/setup behavior under mocked APIs; callback below is a test fixture, not a production default.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';
const browser=await launch(), origin='https://www.totehm.com', rid='r'.repeat(32), out=process.argv[2]||'/tmp/chatgpt-connect';fs.mkdirSync(out,{recursive:true});
let count=0;const check=(c,m)=>{assert(c,m);count++;};
const json=b=>({status:200,contentType:'application/json',body:JSON.stringify(b)});
async function open({ready=true,connected=false,session=true,query='',redirect='https://chatgpt.com/connector_platform/oauth/redirect?code=opaque&state=test',apiError=false}={}){
 const calls=[],external=[];
 const {pg,log}=await page(browser,{dir:'com',origin,session,network:async(url,req)=>{
  if(url.pathname==='/chatgpt-api'){
   const a=url.searchParams.get('action');let body={};try{body=JSON.parse(req.postData()||'{}')}catch{}calls.push({a,method:req.method(),body,auth:!!req.headers().authorization});
   if(apiError)return {status:503,contentType:'application/json',body:'{"error":"unavailable"}'};
   return json(a==='status'?{ready,mcp_url:origin+'/mcp',allowed_redirect_uris:['https://chatgpt.com/connector_platform/oauth/redirect']}:a==='connection'?{connected}:a==='request'?{app_name:'ChatGPT',scopes:['totehm:read']}:a==='authorize'?{redirect_url:redirect}:a==='revoke'?{ok:true}:{});
  }
  if(url.host==='chatgpt.com'||url.host==='evil.test'){external.push(url.href);return {status:200,contentType:'text/html',body:'<p>OAuth return</p>'};}
  return null;
 }});
 await pg.goto(origin+'/chatgpt'+query);await pg.waitForFunction(()=>window.__totehm_chatgpt&&!window.__totehm_chatgpt().busy);return {pg,log,calls,external};
}
try{
 let x=await open({ready:false});check(await x.pg.getByRole('heading',{name:'THE CONNECTION IS GETTING READY'}).isVisible(),'unavailable honestly');check(x.calls.length===1,'no account reads unavailable');await x.pg.context().close();
 x=await open({apiError:true});check(!(await x.pg.locator('body').innerText()).includes('IS CONNECTED'),'unavailable does not fake connection');await x.pg.context().close();
 x=await open();check(await x.pg.getByRole('heading',{name:'CONNECT FROM CHATGPT'}).isVisible(),'setup from actual ready status');check(await x.pg.locator('code').textContent()===origin+'/mcp','MCP URL from status');check(!x.calls.some(c=>c.method==='POST'),'no automatic authorization');await x.pg.screenshot({path:out+'/setup-desktop.png'});await x.pg.setViewportSize({width:390,height:844});await x.pg.screenshot({path:out+'/setup-mobile.png'});check(await x.pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile no overflow');await x.pg.context().close();
 x=await open({session:false});check(await x.pg.getByLabel('EMAIL',{exact:true}).isVisible(),'login before linking');await x.pg.context().close();
 x=await open({query:'?request_id='+rid+'&redirect_uri=https://evil.test/steal'});check(await x.pg.getByRole('heading',{name:'CONNECT TO CHATGPT'}).isVisible(),'server request metadata');check(!x.calls.some(c=>c.a==='authorize'),'no consent on navigation');await x.pg.getByRole('button',{name:'CONNECT MY TOTEHM'}).click();await x.pg.waitForURL(/chatgpt.com\/connector_platform/);check(x.calls.find(c=>c.a==='authorize').auth,'consent authenticated');check(x.calls.find(c=>c.a==='authorize').body.request_id===rid,'opaque request only');check(!x.external.some(u=>u.includes('evil.test')),'query destination ignored');await x.pg.context().close();
 x=await open({query:'?request_id='+rid,redirect:'https://evil.test/steal'});await x.pg.getByRole('button',{name:'CONNECT MY TOTEHM'}).click();await x.pg.waitForFunction(()=>!window.__totehm_chatgpt().busy);check(x.external.length===0,'reject malicious API return');await x.pg.context().close();
 x=await open({query:'?request_id=../../oauth'});check(await x.pg.getByRole('heading',{name:'START AGAIN FROM CHATGPT'}).isVisible(),'malformed opaque id rejected');check(!x.calls.some(c=>c.a==='request'),'malformed id never requested');await x.pg.context().close();
 x=await open({connected:true});check(await x.pg.getByRole('heading',{name:'YOUR TOTEHM IS CONNECTED'}).isVisible(),'backend-confirmed connection');await x.pg.getByRole('button',{name:'DISCONNECT',exact:true}).click();await x.pg.waitForFunction(()=>!window.__totehm_chatgpt().connected&&!window.__totehm_chatgpt().busy);check(x.calls.find(c=>c.a==='revoke').auth,'revocation authenticated');await x.pg.context().close();
 console.log(JSON.stringify({checks:count,passed:count}));
}finally{await browser.close();}
