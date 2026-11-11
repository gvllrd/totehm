// Real handlers with fake identity/Stripe boundaries; no external calls or money.
import assert from 'node:assert/strict';
import {createHigherSubHandler,retiredClubCheckout} from '../../backend/supabase/functions/_shared/retired-subscriptions.ts';
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
const req=(body,options={})=>new Request('https://functions.example/higher-sub',{method:'POST',headers:{origin:'https://www.totehm.com',authorization:'Bearer owner-session'},body:JSON.stringify(body),...options});
const calls=[];
const handler=createHigherSubHandler({
 user:async token=>{calls.push(['user',token]);return token==='owner-session'?'owner-id':null;},
 subscription:async id=>{calls.push(['read',id]);return {stripe_subscription_id:'sub-owner',status:'active'};},
 cancel:async id=>{calls.push(['cancel',id]);return {ending:true,until:'2027-01-01T00:00:00.000Z'};}
});
for(const action of ['checkout','resume'])for(const authorization of ['','Bearer owner-session']){
 const response=await handler(req({action,user_id:'victim',subscription_id:'sub-victim'},{headers:{authorization}}));
 check(response.status===410&&response.headers.get('cache-control')==='no-store','Retired actions are final and uncached');
 const body=await response.json();check(body.error==='product_retired'&&body.url==='https://www.totehm.com/chatgpt','A free connector replaces the offer');
 check(calls.length===0,'No identity, DB or Stripe access for creation/reactivation');
}
for(const body of [{},{preview:true},{preview:false},{user_id:'victim'}]){
 const response=retiredClubCheckout(req(body));
 check(response.status===410&&(await response.json()).error==='product_retired','Former annual Club checkout/preview is retired without dependencies');
}
let response=await handler(req({action:'cancel',user_id:'victim',subscription_id:'sub-victim'}));
check(response.status===200&&(await response.json()).ending===true,'Existing owners can still cancel at period end');
check(JSON.stringify(calls)===JSON.stringify([['user','owner-session'],['read','owner-id'],['cancel','sub-owner']]),'Identity and Stripe subscription are always read from the authenticated owner');
calls.length=0;response=await handler(req({action:'cancel'},{headers:{authorization:'Bearer attacker'}}));
check(response.status===401&&calls.length===1,'No authenticated owner means no lookup or Stripe cancellation');
for(const status of ['canceled','unpaid','incomplete']){
 let canceled=false;
 const h=createHigherSubHandler({user:async()=> 'owner',subscription:async()=>({status,stripe_subscription_id:'sub-owner'}),cancel:async()=>{canceled=true;throw Error();}});
 check((await h(req({action:'cancel'}))).status===404&&!canceled,'Inactive history cannot be mutated');
}
for(const status of ['active','trialing','past_due']){
 let canceled=false;
 const h=createHigherSubHandler({user:async()=> 'owner',subscription:async()=>({status,stripe_subscription_id:'sub-owner'}),cancel:async()=>{canceled=true;return {ending:true,until:'2027-01-01'};}});
 check((await h(req({action:'cancel'}))).status===200&&canceled,'Live historical contract supports owner cancellation');
}
const broken=createHigherSubHandler({user:async()=> 'owner',subscription:async()=>{throw Error('private database detail');},cancel:async()=>{throw Error('must not run');}});
response=await broken(req({action:'cancel'}));check(response.status===503&&!JSON.stringify(await response.json()).includes('private'),'Unreadable history fails closed without leaking details');
check((await handler(req({action:'unknown'}))).status===400,'Unknown action rejected');
for(const handlerFn of [handler,retiredClubCheckout]){
 check((await handlerFn(new Request('https://example.test',{method:'GET'}))).status===405,'GET is never a checkout');
 const options=await handlerFn(new Request('https://example.test',{method:'OPTIONS',headers:{origin:'https://totehm.com'}}));
 check(options.status===200&&options.headers.get('access-control-allow-origin')==='https://totehm.com','Configured origins retain preflight access');
 const foreign=await handlerFn(req({action:'checkout'},{headers:{origin:'https://evil.example'}}));
 check(foreign.headers.get('access-control-allow-origin')!=='https://evil.example','An arbitrary origin is never reflected');
}
for(const body of ['{bad','null','[]'])check((await handler(req({},{body}))).status===400,'Malformed body rejected');
console.log(JSON.stringify({suite:'Retired subscription boundaries',checks,passed:checks}));
