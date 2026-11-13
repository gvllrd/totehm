// Telegram/Webhook behavior with injected APIs. No network requests or real messages.
import assert from 'node:assert/strict';
import {trackingKeyboard,trackingReview,handleTrackingUpdate} from '../../backend/supabase/functions/_shared/tracking-bot.ts';
import {createTelegramTransport,TelegramAPIError,telegramTextParts} from '../../backend/supabase/functions/_shared/tracking-telegram.ts';
import {createTrackingTick} from '../../backend/supabase/functions/_shared/tracking-tick.ts';
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
const A='11111111-1111-4111-8111-111111111111';
const calls=[],sent=[];let draft=null,answer={ok:true,status:'partial',id:'9007199254740993',habit:'Write'};
const db={async rpc(name,args){calls.push({name,args});return {data:name==='tracking_list'?{ok:true,items:[{habit:'Write <script>',key:'a'.repeat(32)}],has_more:false}
 :name==='tracking_open'?{ok:true,id:'9007199254740993',habit:'Write'}
 :name==='tracking_answer'||name==='tracking_correct'?answer:name==='tracking_detail'?{ok:true}:name==='tracking_bot_pause'?{ok:true,settings:{paused:true}}
 :name==='tracking_bot_summary'?{ok:true,counts:{done:2,partial:1,missed:0,skipped:1,unanswered:2},trend:{state:'insufficient'},barriers:[],settings:{timezone:'UTC',quiet_from:22,quiet_to:8,max_daily:2}}:null,error:null};},
 from(table){let value,remove=false;const q={select(){return q},eq(){return q},maybeSingle(){return Promise.resolve({data:table==='profiles'?{id:A}:draft,error:null})},upsert(v){value=v;return q},delete(){remove=true;return q},then(ok,no){if(value)draft=value;if(remove)draft=null;return Promise.resolve({data:null,error:null}).then(ok,no)}};return q;}};
let ackFailure=null;
const telegram=async(method,payload)=>{sent.push({method,payload});if(method==='answerCallbackQuery'&&ackFailure)throw ackFailure;return {ok:true,result:{message_id:22}};};
const message=text=>({message:{from:{id:101},chat:{id:101,type:'private'},text}});
const callback=(data,text='Write\n\nToday · 10 Nov\nDid you do it?')=>({callback_query:{id:'cb',from:{id:101},message:{message_id:1,text,chat:{id:101,type:'private'}},data}});
for(const id of ['1','9007199254740993']){
 const kb=trackingKeyboard(id);check(kb.inline_keyboard[0].length===2&&kb.inline_keyboard[1][0].text==='Prepare','Two report choices and optional preparation');
 check(kb.inline_keyboard.flat().every(b=>Buffer.byteLength(b.callback_data)<=64),'Callback identifiers fit Telegram without rounding bigint');
}
assert.throws(()=>trackingKeyboard('not-id'));checks++;
for(const command of ['/track','/suivi','/start tracking']){
 const before=calls.length;await handleTrackingUpdate(db,message(command),telegram);
 check(calls.length===before&&sent.at(-1).payload.text.includes('arrive here automatically'),'Tracking entry explains notifications without selecting or opening a Habit');
 check(sent.at(-1).payload.reply_markup.inline_keyboard.flat().every(b=>b.url&&!b.callback_data),'The entry offers settings, never truncated Habit buttons');
}
const beforeOld=calls.length;await handleTrackingUpdate(db,callback('t:n:'+'a'.repeat(32)),telegram);
check(calls.length===beforeOld,'An old Habit selector cannot create a new manual report');
answer={...answer,status:'done'};let beforeSend=sent.filter(s=>s.method==='sendMessage').length;
await handleTrackingUpdate(db,callback('t:a:9007199254740993:done'),telegram);
check(calls.at(-1).args.p_outcome==='9007199254740993'&&calls.at(-1).args.p_status==='done','A report uses its exact string identity');
check(sent.at(-1).method==='editMessageText'&&sent.at(-1).payload.message_id===1&&sent.at(-1).payload.text.endsWith('Saved: Done'),'A report confirms within the same message');
check(sent.filter(s=>s.method==='sendMessage').length===beforeSend,'Answering creates no follow-up messages');
check(sent.at(-1).payload.reply_markup.inline_keyboard.flat().map(b=>b.text).join()==='Change,Prepare','Correction and optional preparation after a report');
answer={...answer,already:true,status:'partial'};await handleTrackingUpdate(db,callback('o:9007199254740993:done'),telegram);
check(sent.at(-1).payload.text.endsWith('Saved: In part'),'Legacy replay shows the saved fact, never the requested replacement');
await handleTrackingUpdate(db,callback('t:e:9007199254740993:open','Write\n\nSaved: Done'),telegram);
check(sent.at(-1).method==='editMessageReplyMarkup'&&sent.at(-1).payload.reply_markup.inline_keyboard[0].every(b=>b.callback_data.startsWith('t:c:')),'Change opens two correction buttons on the same message');
answer={...answer,already:false,status:'missed'};await handleTrackingUpdate(db,callback('t:c:9007199254740993:missed','Write\n\nSaved: Done'),telegram);
check(calls.at(-1).name==='tracking_correct'&&sent.at(-1).payload.text==='Write\n\nSaved: Missed','Explicit correction replaces the prior status once');
await handleTrackingUpdate(db,callback('t:a:9007199254740993:missed','x'.repeat(4096)),telegram);
check(sent.at(-1).method==='editMessageReplyMarkup'&&sent.at(-1).payload.reply_markup.inline_keyboard[0][0].text==='Saved: Missed · Change','A full legacy message keeps its text and confirms status in the short correction control');
for(const failure of [new TelegramAPIError('answerCallbackQuery',400,400,true),new TelegramAPIError('answerCallbackQuery',429,429,true),new TelegramAPIError('answerCallbackQuery',0,0,false)]){
 ackFailure=failure;const writesBefore=calls.filter(c=>c.name==='tracking_answer').length;
 await handleTrackingUpdate(db,callback('t:a:9007199254740993:missed'),telegram);
 check(calls.filter(c=>c.name==='tracking_answer').length===writesBefore+1,'A rejected, throttled or uncertain ACK cannot block an idempotent report');
 check(sent.at(-1).method==='editMessageText'&&sent.at(-1).payload.text.endsWith('Saved: Missed'),'A failed ACK still confirms the saved report in the same message');
}
ackFailure=null;
const before=calls.length;
await handleTrackingUpdate(db,callback('t:a:1:invented'),telegram);check(calls.length===before,'Invalid statuses cause no database writes');
check(!await handleTrackingUpdate(db,{message:{chat:{type:'group',id:-5},from:{id:101},text:'/bilan'}},telegram),'Private reports are not shown in groups');
check(!await handleTrackingUpdate(db,{message:{chat:{type:'private',id:202},from:{id:101},text:'/bilan'}},telegram),'Chat and sender identities must agree');
check(!await handleTrackingUpdate(db,message('an unrelated thought'),telegram),'An unsolicited thought is not stored as an obstacle or Repulsion');
await handleTrackingUpdate(db,callback('t:d:9007199254740993:open'),telegram);
check(draft.kind==='tracking','A historical private detail button remains explicitly usable');
await handleTrackingUpdate(db,message('/minutes 20'),telegram);check(calls.at(-1).args.p_field==='minutes'&&calls.at(-1).args.p_value==='20'&&!draft,'Existing explicit details still record without loss');
await handleTrackingUpdate(db,message('/review'),telegram);check(sent.at(-1).payload.text.includes('unanswered: unknown')&&!sent.at(-1).payload.text.includes('pas done'),'English review distinguishes unknown from missed');
await handleTrackingUpdate(db,message('/pause'),telegram);check(calls.at(-1).args.p_paused===true,'Pause uses the verified linked Telegram identity');
check(!calls.some(c=>/repulsion|wisdom|objective|model/i.test(c.name)),'Tracking does not write the five views or run a model');
check(trackingReview({counts:{},trend:{state:'insufficient'}}).includes('Not enough'),'Sparse data produces no invented trend');
check(trackingKeyboard('1').inline_keyboard.flat().map(b=>b.text).join('|')==='Done|Missed|Prepare','Default report controls are English');
await handleTrackingUpdate(db,callback('t:d:9007199254740993:open'),telegram);
await handleTrackingUpdate(db,message('/energy 4'),telegram);check(calls.at(-1).args.p_field==='energy'&&calls.at(-1).args.p_value==='4'&&!draft,'English energy command remains backward compatible');
await handleTrackingUpdate(db,callback('t:d:9007199254740993:open'),telegram);
await handleTrackingUpdate(db,message('/cancel'),telegram);check(!draft&&sent.at(-1).payload.text==='Detail cancelled.','English cancel discards an optional historical draft');
const unicode=('Habit 👩🏽‍💻 漢字 مرحبا '.repeat(600));const chunks=telegramTextParts(unicode);
check(chunks.join('')===unicode&&chunks.every(s=>s.length<=3500),'Long Unicode text is preserved exactly within message limits');
check(chunks.every(s=>!/[\uD800-\uDBFF]$/.test(s)&&!/^([\uDC00-\uDFFF])/.test(s)),'Text segmentation never splits an emoji surrogate pair');

const tickCalls=[];let sendCount=0,status=200,throwNetwork=false,bodyOk=true,habit='Write',failAt=0;const deliveredMessages=[];
const tickDb={rpc:async(name,args)=>{tickCalls.push({name,args});return {data:name==='bot_tick_consume'?args.p_token==='purpose-token':name==='tracking_delivered'?true:{send:true,id:'9007199254740993',lease:'lease',habit,chat_id:'101',period_label:'Today · 10 Nov 2026 (UTC)'},error:null};},
 from(){const q={select(){return q},eq(){return q},order(){return q},range(){return Promise.resolve({data:[{user_id:A},{user_id:A}],error:null})}};return q;}};
const fetcher=async(url,opts)=>{const name=url.split('/').at(-1);if(name==='sendMessage'){sendCount++;deliveredMessages.push(JSON.parse(opts.body));if(sendCount===failAt)return Response.json({ok:false,error_code:400},{status:400});}if(throwNetwork)throw Error('offline');
 if(name==='getMe')return Response.json({ok:true,result:{username:'TotehmBot'}});
 if(name==='getWebhookInfo')return Response.json({ok:true,result:{url:'https://project.test/functions/v1/bot-reply',pending_update_count:0}});
 return Response.json({ok:bodyOk,...(bodyOk?{result:{message_id:12}}:{error_code:status})},{status});};
const handler=createTrackingTick({db:tickDb,token:'fixture',serviceKey:'service-fixture',webhookSecret:'webhook-fixture',projectOrigin:'https://project.test',fetcher,pause:async()=>{}});
const req=(body={},auth='Bearer service-fixture',token)=>new Request('https://project.test/functions/v1/bot-tick',{method:'POST',headers:{authorization:auth,'content-type':'application/json',...(token?{'x-tick-token':token}:{})},body:JSON.stringify(body)});
check((await handler(req({},'Bearer prefix-service-fixture-suffix'))).status===403,'Service authentication requires an exact credential, not substring matching');
check((await handler(req({},'', 'wrong-token'))).status===403,'An invalid cron token cannot send');
let response=await handler(req({mode:'health'}));check((await response.json()).ready&&sendCount===0,'Health checks verify the configured bot/webhook without messaging users');
response=await handler(req({mode:'health'},'','purpose-token'));check((await response.json()).ready&&sendCount===0,'A single-use purpose-bound operator token can run only the requested read-only probe');
response=await handler(req({mode:'dry_run'}));check((await response.json()).sent===0&&sendCount===0&&!tickCalls.some(c=>c.name==='tracking_claim'),'Dry run makes no reservations or sends');
response=await handler(req());check((await response.json()).sent===1&&sendCount===1,'Duplicate TOTEHM rows cannot duplicate a send');
check(tickCalls.at(-1).name==='tracking_delivered'&&tickCalls.at(-1).args.p_status==='sent','A confirmed Telegram response finalizes delivery');
check(deliveredMessages.at(-1).text.includes('Today · 10 Nov 2026')&&deliveredMessages.at(-1).reply_markup.inline_keyboard[0].length===2,'Push includes the target period and two short report buttons');
status=403;bodyOk=false;await handler(req());check(tickCalls.at(-1).args.p_status==='failed','A definite rejection is not an unanswered practice');
status=500;await handler(req());check(tickCalls.at(-1).args.p_status==='uncertain','Server failures are uncertain, not safe automatic retries');
throwNetwork=true;await handler(req());check(tickCalls.at(-1).args.p_status==='uncertain','A lost response cannot trigger a duplicate');
check((await handler(req({mode:'typo'}))).status===400,'An unknown diagnostic mode never sends messages');
throwNetwork=false;status=200;bodyOk=true;habit=unicode;
let start=deliveredMessages.length;await handler(req());let parts=deliveredMessages.slice(start);
check(parts.map(x=>x.text).join('')===unicode+'\n\nToday · 10 Nov 2026 (UTC)\nDid you do it?','The push keeps the complete long Habit and target period');
check(parts.slice(0,-1).every(x=>!x.reply_markup)&&parts.at(-1).reply_markup.inline_keyboard.flat().map(x=>x.text).join('|')==='Done|Missed|Prepare','Only the final segment has answer and optional preparation buttons');
check(tickCalls.at(-1).args.p_status==='sent','Full text delivery is confirmed only after all segments');
failAt=sendCount+2;await handler(req());check(tickCalls.at(-1).args.p_status==='uncertain'&&tickCalls.at(-1).args.p_code==='telegram_partial_delivery','A definite rejection after partial text delivery cannot trigger duplicates');

const logs=[],oldError=console.error;console.error=(...args)=>logs.push(args.join(' '));
try{
 const rejected=createTelegramTransport('secret-fixture',async()=>Response.json({ok:false,error_code:400,description:'private-member-text secret-fixture'},{status:200}));
 await assert.rejects(()=>rejected('sendMessage',{}),e=>e instanceof TelegramAPIError&&e.definite&&e.code===400);checks++;
 const malformed=createTelegramTransport('secret-fixture',async()=>new Response('not json',{status:200}));
 await assert.rejects(()=>malformed('sendMessage',{}),e=>e instanceof TelegramAPIError&&!e.definite);checks++;
 const unchanged=createTelegramTransport('secret-fixture',async()=>Response.json({ok:false,error_code:400,description:'Bad Request: message is not modified'},{status:400}));
 check((await unchanged('editMessageText',{})).unchanged,'An unchanged idempotent message edit is successful');
 check(!logs.join(' ').includes('secret-fixture')&&!logs.join(' ').includes('private-member-text'),'Provider errors log no credential or member content');
}finally{console.error=oldError;}
console.log(JSON.stringify({suite:'Intelligent tracking bot',checks,passed:checks}));
