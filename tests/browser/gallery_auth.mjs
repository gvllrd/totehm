// Space's real SSO module, isolated origins and mocked network; no GPU or production access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {launch} from './harness.mjs';

const ROOT=new URL('../..',import.meta.url).pathname;
const OUT=process.argv[2]||'/tmp/gallery-auth';fs.mkdirSync(OUT,{recursive:true});
const SPACE='https://www.totehm.space',COM='https://www.totehm.com',SB='https://abujjbkbbiumxrokozph.supabase.co';
const CODE='a'.repeat(64),HANDOFF='b'.repeat(64),STATE='s'.repeat(24),VERIFIER='v'.repeat(43);
const USER={id:'11111111-1111-4111-8111-111111111111',email:'space@example.test',aud:'authenticated',role:'authenticated',user_metadata:{pseudo:'stale-metadata'}};
const session=()=>({access_token:'synthetic-space-access',refresh_token:'synthetic-space-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:USER});
const BUNDLE=fs.readFileSync(new URL('./supabase.mjs',import.meta.url));
const TYPES={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
let checks=0;const results=[];
function check(condition,message){assert(condition,message);checks++;results.push(message);console.log('PASS '+message);}
const browser=await launch();

async function fixture({signedIn=false,callback=false,wrongState=false,deferProfile=false}={}){
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),log={mint:[],redeem:[],profiles:0,errors:[]};
 let releaseProfile;const profileWait=new Promise(resolve=>releaseProfile=resolve);
 await ctx.addInitScript(({signedIn,callback,wrongState,session,state,verifier,space})=>{
  if(location.origin!==space)return;
  if(signedIn&&!sessionStorage.getItem('fixture-seeded')){localStorage.setItem('sb-abujjbkbbiumxrokozph-auth-token',JSON.stringify(session));sessionStorage.setItem('fixture-seeded','1');}
  if(callback)sessionStorage.setItem('totehm_sso_pkce',JSON.stringify({state:wrongState?'wrong-state':state,verifier}));
 },{signedIn,callback,wrongState,session:session(),state:STATE,verifier:VERIFIER,space:SPACE});
 const pg=await ctx.newPage();pg.on('pageerror',e=>log.errors.push(e.message));
 await ctx.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),json=body=>route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  if(url.host==='esm.sh')return route.fulfill({contentType:'text/javascript',body:BUNDLE});
  if(url.origin===SB){
   let body={};try{body=JSON.parse(req.postData()||'{}');}catch{}
   if(url.pathname.endsWith('/sso-mint')){log.mint.push({body,bearer:req.headers().authorization,origin:req.headers().origin});return json({code:HANDOFF});}
   if(url.pathname.endsWith('/sso-redeem')){log.redeem.push({body,url:await pg.evaluate(()=>location.href)});return json({token_hash:'synthetic-space-hash'});}
   if(url.pathname==='/auth/v1/verify')return json(session());
   if(url.pathname==='/auth/v1/user')return json(USER);
   if(url.pathname.startsWith('/auth/v1/'))return json({});
   if(url.pathname==='/rest/v1/profiles'){log.profiles++;if(deferProfile)await profileWait;return json({pseudo:'wah'});}
   return json(null);
  }
  if(url.origin===COM)return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Mock COM authority</title>'});
  if(url.origin===SPACE){
   if(url.pathname==='/auth-test-empty')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Auth fixture</title>'});
   if(url.pathname==='/gallery-spatial.mjs')return route.fulfill({contentType:'text/javascript',body:"export async function createGallery(){throw new Error('GPU intentionally omitted in identity tests');}"});
   let file=path.join(ROOT,'space',url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname);
   if(!path.extname(file))file+='.html';
   if(!fs.existsSync(file))return route.fulfill({status:404,body:'not found'});
   return route.fulfill({contentType:TYPES[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  }
  return route.fulfill({status:204,body:''});
 });
 return {ctx,pg,log,releaseProfile};
}

try{
 {
  const {ctx,pg,log}=await fixture();
  await pg.goto(SPACE+'/?campaign=auth');await pg.waitForFunction(()=>document.querySelector('#member')?.textContent==='CONNECT WITH MY TOTEHM');
  check(await pg.locator('#member-menu').count()===0,'Space has one identity entry and no local member menu');
  await pg.click('#member');await pg.waitForURL(COM+'/auth?**');
  const u=new URL(pg.url());
  check(u.searchParams.get('client')==='space'&&u.searchParams.get('return')==='/?campaign=auth','anonymous login goes through COM and preserves the Space return path');
  check(/^[A-Za-z0-9_-]{43}$/.test(u.searchParams.get('challenge'))&&!u.searchParams.has('prompt'),'explicit login uses an S256 challenge and asks the central authority');
  const stored=(await ctx.storageState()).origins.find(o=>o.origin===SPACE);
  check(!stored?.localStorage.some(v=>v.name==='sb-abujjbkbbiumxrokozph-auth-token'),'anonymous navigation invents no local session');
  // sessionStorage is origin-scoped; inspect it on a second Space page in this same tab.
  await pg.goto(SPACE+'/auth-test-empty');const pk=await pg.evaluate(()=>JSON.parse(sessionStorage.getItem('totehm_sso_pkce')));
  check(pk.state===u.searchParams.get('state')&&createHash('sha256').update(pk.verifier).digest('base64url')===u.searchParams.get('challenge'),'PKCE verifier stays in Space storage and matches the outgoing challenge/state');
  check(!log.mint.length&&!log.redeem.length&&!log.errors.length,'anonymous connection makes no handoff request or JavaScript error');
  await ctx.close();
 }
 {
  const {ctx,pg,log}=await fixture({signedIn:true});
  await pg.goto(SPACE+'/');await pg.waitForFunction(()=>document.querySelector('#member')?.textContent==='wah');
  check(log.profiles>0,'connected identity uses the current profile name, rather than stale user metadata');
  await pg.click('#member');await pg.waitForURL(COM+'/totehm#**');
  check(log.mint.length===1&&log.mint[0].body.target==='com'&&log.mint[0].bearer==='Bearer synthetic-space-access','connected identity mints one COM handoff with the Space session');
  check(pg.url()===COM+'/totehm#sso='+HANDOFF&&!pg.url().includes('synthetic-space-access'),'connected identity opens the central TOTEHM with a one-use code');
  check(!log.errors.length,'connected identity navigation has no JavaScript errors');await ctx.close();
 }
 for(const wrongState of [false,true]){
  const {ctx,pg,log}=await fixture({callback:true,wrongState});
  await pg.goto(SPACE+'/?campaign=callback#chapter-2&sso='+CODE+'&state='+STATE);
  await pg.waitForFunction(()=>!location.href.includes('sso='));
  await pg.waitForFunction(()=>document.querySelector('#member')?.textContent===('wah'),null,{timeout:wrongState?500:10000}).catch(error=>{if(!wrongState)throw error;});
  if(wrongState){
   check(log.redeem.length===0&&log.mint.length===0,'mismatched callback state cannot redeem or mint a session');
   check(await pg.textContent('#member')==='CONNECT WITH MY TOTEHM','rejected callback keeps the visitor disconnected');
  }else{
   check(log.redeem.length===1&&log.redeem[0].body.code===CODE&&log.redeem[0].body.verifier===VERIFIER,'valid callback redeems once with the local verifier');
   check(!log.redeem[0].url.includes('sso=')&&!log.redeem[0].url.includes('state='),'callback secrets leave the address before redemption');
   check(await pg.textContent('#member')==='wah','redeemed session paints the current TOTEHM identity');
  }
  check(pg.url()===SPACE+'/?campaign=callback#chapter-2','callback keeps useful query and fragment while removing auth parameters');
  check(!log.errors.length,'callback has no JavaScript exception');await ctx.close();
 }
 {
  const {ctx,pg,log,releaseProfile}=await fixture({signedIn:true,deferProfile:true});
  await pg.goto(SPACE+'/');await pg.waitForFunction(()=>document.querySelector('#member')?.classList.contains('is-in'));
  // Use another real Supabase client on the same origin: its signout broadcasts to Space.
  const peer=await ctx.newPage();await peer.goto(SPACE+'/auth-test-empty');
  await peer.evaluate(async({SB})=>{const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');const client=createClient(SB,'synthetic-anon');await client.auth.signOut({scope:'local'});},{SB});
  await pg.waitForFunction(()=>document.querySelector('#member')?.textContent==='CONNECT WITH MY TOTEHM');
  check(!await pg.locator('#member').evaluate(e=>e.classList.contains('is-in')),'cross-tab signout returns the identity entry to its disconnected state');
  releaseProfile();await pg.waitForTimeout(200);
  check(await pg.textContent('#member')==='CONNECT WITH MY TOTEHM','late profile responses cannot restore a signed-out identity');
  check(!log.errors.length,'cross-tab identity changes have no JavaScript exceptions');await ctx.close();
 }
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({passed:checks,checks:results},null,2));
 console.log(`${checks} Space identity checks passed; ${OUT}/results.json`);
}finally{await browser.close();}
