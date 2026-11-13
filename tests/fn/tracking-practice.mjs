// Explicit preparation, privacy, graph fidelity and Telegram limits. All identities are synthetic.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectGraph,projectContext} from '../../backend/supabase/functions/_shared/chatgpt-context.ts';
import {practiceURL,practiceKeyboard,practiceTelegram,preparationText,practiceCadence,validPracticeId,STONER_URL} from '../../backend/supabase/functions/_shared/tracking-practice.ts';
import {handleTrackingUpdate} from '../../backend/supabase/functions/_shared/tracking-bot.ts';
import {TelegramAPIError} from '../../backend/supabase/functions/_shared/tracking-telegram.ts';
import {parsePracticeLink} from '../../com/telegram-practice.mjs';
import {FREQS} from '../../com/habit-rhythm.mjs';
const uid='11111111-1111-4111-8111-111111111111',id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
for(const ref of ['1','9007199254740993','9223372036854775807']){
 const url=new URL(practiceURL(ref));
 check(validPracticeId(ref)&&parsePracticeLink(url.hash)===ref,'Full bigint locator is preserved');
 check(url.origin==='https://www.totehm.com'&&url.pathname==='/totehm'&&url.search==='?telegram=1','The mini-app always opens the native authority');
 const kb=practiceKeyboard(ref,true);
 check(kb.inline_keyboard.flat().every(b=>!b.callback_data||Buffer.byteLength(b.callback_data)<=64),'Callbacks contain only bounded string IDs');
 check(!url.href.includes('token')&&!url.href.includes('habit')&&!url.href.includes('ref='),'No session or Habit text is exported in the mini-app URL');
}
for(const bad of ['',0,'0','-1','01','1&token=secret','9223372036854775808','99999999999999999999']){
 check(!validPracticeId(bad)&&!parsePracticeLink('#practice='+bad),'Invalid source IDs cannot become native locators');
 assert.throws(()=>practiceURL(bad));checks++;
}
check(!parsePracticeLink('#practice=1&ro=someone')&&!parsePracticeLink('#practice=1&practice=2'),'No extra values or visited-account context are accepted');
check(STONER_URL==='https://www.totehm.space/stoner','Stoner keeps its existing native access gate');
const habit='Lire & écrire <b>読書</b>';
const snapshot={steps:[{t:habit,is:['express'],f:'weekly',rhythm_text:'3 times a week at 7 AM'},{t:'Unrelated Habit',f:'daily',rhythm_text:'UNRELATED TIMING'}],
 habit_spots:[{habit_text:habit,place:'My kitchen <b>読書</b>'},{habit_text:'Unrelated Habit',place:'UNRELATED PLACE'}],
 objectives:[{id:id(1),text:'Publish my book'},{id:id(2),text:'Travel unrelated'}],
 repulsions:[{id:'1',repulsion:'Scroll instead',habit_text:habit,active:true},{id:'2',repulsion:'UNRELATED TRIGGER',habit_text:'Unrelated Habit',active:true}],
 visions:[{id:id(3),text:'Share what I learn'},{id:id(6),text:'UNRELATED VISION'}],
 wisdom:[{id:id(4),text:'MY OWN WORDS, not an inferred lesson'},{id:id(5),text:'UNRELATED STORY'}],
 objective_habits:[{habit_text:habit,objective_id:id(1)}],objective_visions:[{objective_id:id(1),vision_id:id(3)}],repulsion_teachings:[{repulsion_id:'1',wisdom_id:id(4)}]};
const context=s=>projectContext(projectGraph(s),{query:'',purpose:'explicit',focus:{kind:'habit',ref:habit},limit:12});
const text=preparationText(context(snapshot),habit);
check(['TRIGGER · INSTEAD OF','INSTEAD · MY HABIT','WHY','VISION · THE BIG WHY','MY STORY · LINKED TO THIS TRIGGER'].every(t=>text.includes(t)),'All native phrase directions are present');
check(['Scroll instead',habit,'Publish my book','Share what I learn','MY OWN WORDS'].every(t=>text.includes(t)),'Only recorded links supply the preparation chain');
check(!text.includes('UNRELATED')&&!text.includes('Travel unrelated'),'Unconnected choices are not presented as reasons');
check(text.includes('<b>読書</b>'),'Member text is preserved as plain text, never HTML instructions');
check(text.includes('WHERE I USUALLY DO IT')&&text.includes('My kitchen <b>読書</b>')&&text.includes('not your current position or a timed spot'),'Only the exact Habit’s authored usual place is shown, with truthful scope');
check(text.includes('MY TIMING · MY WORDS')&&text.includes('3 times a week at 7 AM')&&text.includes('SAVED CHECK-IN RHYTHM\n\nweekly'),'Authored practice timing is preserved separately from the selected check-in cadence');
for(const frequency of FREQS)check(practiceCadence(frequency.id)===frequency.label,'Telegram and native picker use the same meaning for '+frequency.id);
check(practiceCadence('unsupported')===null&&practiceCadence(undefined)===null,'Missing/unknown cadence never invents a readable schedule');

check(preparationText(context({steps:[{t:habit}]}),habit).includes('No linked why or trigger'),'Missing links remain missing instead of inventing a motivation');
check(preparationText(context({steps:[]}),habit).includes('no longer available'),'A missing current Habit never substitutes another one');
check(preparationText({...context(snapshot),coverage:{source_complete:false,omitted_related:true}},habit).includes('part of your linked context'),'Partial context is explicitly described');
const long=structuredClone(context(snapshot));for(const row of long.items)row.text='🌍'.repeat(4000);
const bounded=preparationText(long,habit);
check(bounded.length<3500&&bounded.isWellFormed()&&bounded.includes('excerpts'),'Long multilingual text and emoji fit a single consented message without broken characters');
const fullest=structuredClone(context(snapshot)),rootFull=fullest.items.find(i=>i.ref===habit);
rootFull.rhythm_text='🌍'.repeat(500);rootFull.usual_place.text='🌍'.repeat(500);
for(const [kind,relation,from,to] of [['repulsion','instead',null,rootFull.key],['objective','serves',rootFull.key,null],['vision','towards',fullest.items.find(i=>i.kind==='objective').key,null],['wisdom','learned_from',null,fullest.items.find(i=>i.kind==='repulsion').key]]){
 const row=fullest.items.find(i=>i.kind===kind),copy={...row,key:row.key+':second',ref:row.ref+':second',rank:2};
 fullest.items.push(copy);fullest.edges.push({from:from||copy.key,to:to||copy.key,relation,provenance:[]});
}
for(const row of fullest.items)row.text='🌍'.repeat(4000);
const fullMessage=preparationText(fullest,habit);
check(fullMessage.length<3500&&fullMessage.isWellFormed()&&fullMessage.includes('does not schedule an exact alert time'),'Full recorded chain, timing and place together fit Telegram’s safe message bound');
const maximal=structuredClone(fullest),maxRoot=maximal.items.find(i=>i.ref===habit);
for(const row of maximal.items)row.text='a'.repeat(260);
maxRoot.rhythm_text='b'.repeat(500);maxRoot.usual_place.text='c'.repeat(120);maxRoot.freq='every_15th_month';
maximal.coverage={source_complete:false,omitted_related:true,more_matches:true};
const maximalMessage=preparationText(maximal,habit);
check(maximal.items.length===9&&maximalMessage.length<=3500&&maximalMessage.isWellFormed()&&maximalMessage.includes('part of your linked context'),'Two triggers, goals, visions and stories plus 500-character timing, usual place and partial coverage fit one safe Telegram message');
const orders={...snapshot,objectives:[...snapshot.objectives,{id:id(7),text:'My ranked reason'}],objective_habits:[...snapshot.objective_habits,{habit_text:habit,objective_id:id(7)}],element_orders:[{kind:'objective',refs:[id(7),id(1)]}]};
const sorted=preparationText(context(orders),habit);check(sorted.indexOf('My ranked reason')<sorted.indexOf('Publish my book'),'Multiple reasons follow their own view order');
const calls=[],queries=[],sent=[];let allowed=true,readError=false;
const tables={...snapshot,totehms:[{steps:snapshot.steps}]};delete tables.steps;
const db={async rpc(name,args){calls.push({name,args});assert.equal(name,'tracking_practice_target');assert.equal(args.p_telegram,101);return {data:allowed?{ok:true,user_id:uid,habit}:{ok:false},error:null};},
 from(table){const filters=[];let n=Infinity;const q={select(){return q},eq(k,v){if(k==='user_id')assert.equal(v,uid);else filters.push(r=>r[k]===v);return q},
 or(){filters.push(r=>!['achieved','abandoned','converted'].includes(r.status));return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},limit(v){n=v;return q},then(ok,no){queries.push({table,n});return Promise.resolve({data:(tables[table]||[]).filter(r=>filters.every(f=>f(r))).slice(0,n),error:readError?{message:'private detail'}:null}).then(ok,no)}};return q;}};
const telegram=async(method,payload)=>{sent.push({method,payload});return {ok:true,result:{message_id:22}};};
const callback=(data)=>({callback_query:{id:'cb',from:{id:101},message:{message_id:22,chat:{id:101,type:'private'},text:'Prepare your next step'},data}});
await handleTrackingUpdate(db,callback('t:p:9007199254740993:open'),telegram);
check(calls.length===1&&queries.length===0,'Prepare validates ownership without reading linked private text yet');
check(sent.at(-1).method==='sendMessage'&&sent.at(-1).payload.reply_markup.inline_keyboard[0][0].callback_data.endsWith(':show'),'An explicit second choice is required to bring linked text into Telegram');
check(sent.at(-1).payload.text.includes('private media')&&sent.at(-1).payload.reply_markup.inline_keyboard[1][0].web_app,'Opening private media remains in the native mini-app');
const sendCount=sent.filter(x=>x.method==='sendMessage').length;
await handleTrackingUpdate(db,callback('t:p:9007199254740993:show'),telegram);
check(sent.at(-1).method==='editMessageText'&&sent.filter(x=>x.method==='sendMessage').length===sendCount,'Consented text replaces the preparation prompt rather than adding notifications');
check(sent.at(-1).payload.text===text&&!sent.at(-1).payload.parse_mode,'Exact own graph is used without evaluating markup');
check(queries.every(q=>q.n<=401)&&!queries.some(q=>/media|spot_plans|intention_music|grants/.test(q.table)),'Reads stay bounded; no images, sounds, public places or creator content are exported');
check(calls.every(c=>c.name==='tracking_practice_target'),'No answer, reservation, subscription, note or TOTEHM write occurs');
allowed=false;const beforeQueries=queries.length;await handleTrackingUpdate(db,callback('t:p:9007199254740993:show'),telegram);
check(queries.length===beforeQueries&&sent.at(-1).payload.text.includes('no longer available'),'Revocation, deletion or another owner prevents future linked reads');
const beforeCalls=calls.length;await handleTrackingUpdate(db,callback('t:p:9223372036854775808:show'),telegram);
check(calls.length===beforeCalls,'A bigint overflow is rejected without calling the database');
const group=callback('t:p:1:show');group.callback_query.message.chat.type='group';
check(!await handleTrackingUpdate(db,group,telegram)&&queries.length===beforeQueries,'Group preparation is never allowed');
const forged=callback('t:p:1:show');forged.callback_query.from.id=202;
check(!await handleTrackingUpdate(db,forged,telegram),'Mismatching sender and private chat cannot impersonate the linked member');
for(const command of ['/prepare','/preparer','/préparer','/totehm']){
 await handleTrackingUpdate(db,{message:{text:command,from:{id:101},chat:{id:101,type:'private'}}},telegram);
 check(calls.length===beforeCalls&&sent.at(-1).payload.reply_markup.inline_keyboard[0][0].web_app.url===practiceURL(),'Preparation overview creates no report or data lookup');
}
allowed=true;readError=true;await assert.rejects(()=>handleTrackingUpdate(db,callback('t:p:1:show'),telegram));checks++;
const payload={chat_id:'101',text:'Choose',reply_markup:practiceKeyboard('1',true)};
for(const method of ['sendMessage','editMessageText']){
 const attempts=[];
 await practiceTelegram(async(m,p)=>{attempts.push({m,p});if(attempts.length===1)throw new TelegramAPIError(m,400,400,true);return {ok:true};},method,payload);
 check(attempts.length===2&&attempts[1].p.reply_markup.inline_keyboard[1][0].url===practiceURL('1'),'A definite provider rejection can fall back once to the secure native URL');
 check(payload.reply_markup.inline_keyboard[1][0].web_app,'Fallback never mutates a reused keyboard');
}
for(const error of [new TelegramAPIError('sendMessage',0,0,false),new TelegramAPIError('sendMessage',500,500,false),new TelegramAPIError('sendMessage',403,403,true)]){
 let attempts=0;await assert.rejects(()=>practiceTelegram(async()=>{attempts++;throw error;},'sendMessage',payload));
 check(attempts===1,'An uncertain delivery or unrelated rejection never causes duplicate messages');
}
const headers=JSON.parse(fs.readFileSync(new URL('../../com/vercel.json',import.meta.url)));
for(const route of ['/totehm','/totehm.html']){
 const applied=headers.headers.filter(h=>new RegExp('^'+h.source+'$').test(route)).flatMap(h=>h.headers);
 check(!applied.some(h=>h.key==='X-Frame-Options')&&applied.some(h=>h.key==='Content-Security-Policy'&&h.value.includes('https://web.telegram.org')&&!h.value.includes('*')),'Only the native app allows the official Telegram web frames');
}
check(new RegExp('^'+headers.headers[0].source+'$').test('/auth')&&new RegExp('^'+headers.headers[0].source+'$').test('/chatgpt'),'Authentication and consent pages retain their usual frame protection');
console.log(JSON.stringify({suite:'Optional TotehmBot preparation',checks,passed:checks}));
