// Telegram/Webhook behavior with injected APIs. No network requests or real messages.
import assert from 'node:assert/strict';
import {trackingKeyboard,trackingReview,handleTrackingUpdate} from '../../backend/supabase/functions/_shared/tracking-bot.ts';
import {createTrackingTick} from '../../backend/supabase/functions/_shared/tracking-tick.ts';
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
const A='11111111-1111-4111-8111-111111111111';
const calls=[],sent=[];let draft=null,answer={ok:true,status:'partial',id:'9007199254740993',habit:'Write'};
const db={async rpc(name,args){calls.push({name,args});return {data:name==='tracking_list'?{ok:true,items:[{habit:'Write <script>',key:'a'.repeat(32)}],has_more:false}
 :name==='tracking_open'?{ok:true,id:'9007199254740993',habit:'Write'}
 :name==='tracking_answer'?answer:name==='tracking_detail'?{ok:true}:name==='tracking_bot_pause'?{ok:true,settings:{paused:true}}
 :name==='tracking_bot_summary'?{ok:true,counts:{done:2,partial:1,missed:0,skipped:1,unanswered:2},trend:{state:'insufficient'},barriers:[],settings:{timezone:'UTC',quiet_from:22,quiet_to:8,max_daily:2}}:null,error:null};},
 from(table){let value,remove=false;const q={select(){return q},eq(){return q},maybeSingle(){return Promise.resolve({data:table==='profiles'?{id:A}:draft,error:null})},upsert(v){value=v;return q},delete(){remove=true;return q},then(ok,no){if(value)draft=value;if(remove)draft=null;return Promise.resolve({data:null,error:null}).then(ok,no)}};return q;}};
const telegram=async(method,payload)=>{sent.push({method,payload});return {ok:true,result:{message_id:22}};};
const message=text=>({message:{from:{id:101},chat:{id:101,type:'private'},text}});
const callback=data=>({callback_query:{id:'cb',from:{id:101},message:{message_id:1,chat:{id:101,type:'private'}},data}});
for(const id of ['1','9007199254740993']){
 const kb=trackingKeyboard(id);check(kb.inline_keyboard.flat().length===4,'Four distinct self-report states');
 check(kb.inline_keyboard.flat().every(b=>Buffer.byteLength(b.callback_data)<=64),'Callback identifiers fit Telegram without rounding bigint');
}
assert.throws(()=>trackingKeyboard('not-id'));checks++;
await handleTrackingUpdate(db,message('/suivi'),telegram);check(calls.at(-1).name==='tracking_list'&&sent.at(-1).payload.reply_markup.inline_keyboard.length===1,'Explicit tracking opens exact current habits');
await handleTrackingUpdate(db,callback('t:n:'+'a'.repeat(32)),telegram);check(sent.at(-1).payload.reply_markup.inline_keyboard.flat().some(b=>b.callback_data==='t:a:9007199254740993:done'),'A selected habit gets a string identity');
await handleTrackingUpdate(db,callback('t:a:9007199254740993:partial'),telegram);check(calls.at(-1).args.p_outcome==='9007199254740993'&&calls.at(-1).args.p_status==='partial','A partial report is sent atomically without Number conversion');
check(sent.at(-1).payload.text.includes('obstacle')&&sent.at(-1).payload.reply_markup.inline_keyboard.flat().some(b=>b.text.includes('facultatif')),'Context remains optional');
answer={...answer,already:true};await handleTrackingUpdate(db,callback('o:9007199254740993:done'),telegram);
check(sent.at(-1).payload.text.includes('Déjà'),'Legacy buttons are idempotent and cannot change a prior answer');
const before=calls.length;
await handleTrackingUpdate(db,callback('t:a:1:invented'),telegram);check(calls.length===before,'Invalid statuses cause no database writes');
check(!await handleTrackingUpdate(db,{message:{chat:{type:'group',id:-5},from:{id:101},text:'/bilan'}},telegram),'Private reports are not shown in groups');
check(!await handleTrackingUpdate(db,{message:{chat:{type:'private',id:202},from:{id:101},text:'/bilan'}},telegram),'Chat and sender identities must agree');
check(!await handleTrackingUpdate(db,message('an unrelated thought'),telegram),'An unsolicited thought is not stored as an obstacle or Repulsion');
await handleTrackingUpdate(db,callback('t:d:9007199254740993:open'),telegram);
check(draft.kind==='tracking','Private details require an explicitly opened draft');
await handleTrackingUpdate(db,message('/minutes 20'),telegram);check(calls.at(-1).args.p_field==='minutes'&&calls.at(-1).args.p_value==='20'&&!draft,'Explicit duration is recorded and the draft closes');
await handleTrackingUpdate(db,message('/bilan'),telegram);check(sent.at(-1).payload.text.includes('sans réponse : on ne sait pas'),'Review distinguishes unknown from missed');
await handleTrackingUpdate(db,message('/pause'),telegram);check(calls.at(-1).args.p_paused===true,'Pause uses the verified linked Telegram identity');
check(!calls.some(c=>/repulsion|wisdom|objective|model/i.test(c.name)),'Tracking does not write the five views or run a model');
check(trackingReview({counts:{},trend:{state:'insufficient'}}).includes('Pas encore assez'),'Sparse data produces no invented trend');

const tickCalls=[];let sendCount=0,status=200,throwNetwork=false,bodyOk=true;
const tickDb={rpc:async(name,args)=>{tickCalls.push({name,args});return {data:name==='bot_tick_consume'?args.p_token==='purpose-token':name==='tracking_delivered'?true:{send:true,id:'9007199254740993',lease:'lease',habit:'Write',chat_id:'101'},error:null};},
 from(){const q={select(){return q},eq(){return q},order(){return q},range(){return Promise.resolve({data:[{user_id:A},{user_id:A}],error:null})}};return q;}};
const fetcher=async(url,opts)=>{const name=url.split('/').at(-1);if(name==='sendMessage')sendCount++;if(throwNetwork)throw Error('offline');
 if(name==='getMe')return Response.json({ok:true,result:{username:'TotehmBot'}});
 if(name==='getWebhookInfo')return Response.json({ok:true,result:{url:'https://project.test/functions/v1/bot-reply',pending_update_count:0}});
 return Response.json({ok:bodyOk,...(bodyOk?{result:{message_id:12}}:{error_code:status})},{status});};
const handler=createTrackingTick({db:tickDb,token:'fixture',serviceKey:'service-fixture',webhookSecret:'webhook-fixture',projectOrigin:'https://project.test',fetcher});
const req=(body={},auth='Bearer service-fixture',token)=>new Request('https://project.test/functions/v1/bot-tick',{method:'POST',headers:{authorization:auth,'content-type':'application/json',...(token?{'x-tick-token':token}:{})},body:JSON.stringify(body)});
check((await handler(req({},'Bearer prefix-service-fixture-suffix'))).status===403,'Service authentication requires an exact credential, not substring matching');
check((await handler(req({},'', 'wrong-token'))).status===403,'An invalid cron token cannot send');
let response=await handler(req({mode:'health'}));check((await response.json()).ready&&sendCount===0,'Health checks verify the configured bot/webhook without messaging users');
response=await handler(req({mode:'dry_run'}));check((await response.json()).sent===0&&sendCount===0&&!tickCalls.some(c=>c.name==='tracking_claim'),'Dry run makes no reservations or sends');
response=await handler(req());check((await response.json()).sent===1&&sendCount===1,'Duplicate TOTEHM rows cannot duplicate a send');
check(tickCalls.at(-1).name==='tracking_delivered'&&tickCalls.at(-1).args.p_status==='sent','A confirmed Telegram response finalizes delivery');
status=403;bodyOk=false;await handler(req());check(tickCalls.at(-1).args.p_status==='failed','A definite rejection is not an unanswered practice');
status=500;await handler(req());check(tickCalls.at(-1).args.p_status==='uncertain','Server failures are uncertain, not safe automatic retries');
throwNetwork=true;await handler(req());check(tickCalls.at(-1).args.p_status==='uncertain','A lost response cannot trigger a duplicate');
check((await handler(req({mode:'typo'}))).status===400,'An unknown diagnostic mode never sends messages');
console.log(JSON.stringify({suite:'Intelligent tracking bot',checks,passed:checks}));
