// REMEMBER links, privacy, graph fidelity and Telegram limits. All identities are synthetic.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectGraph,projectContext} from '../../backend/supabase/functions/_shared/chatgpt-context.ts';
import {practiceURL,practiceTelegram,validPracticeId,linkedPracticeBoxes,linkedPracticeRows,linkedPracticeText,linkedPracticeCallback,readPracticeLinks} from '../../backend/supabase/functions/_shared/tracking-practice.ts';
import {handleTrackingUpdate} from '../../backend/supabase/functions/_shared/tracking-bot.ts';
import {TelegramAPIError} from '../../backend/supabase/functions/_shared/tracking-telegram.ts';
import {parsePracticeLink} from '../../com/telegram-practice.mjs';
const uid='11111111-1111-4111-8111-111111111111',id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
for(const ref of ['1','9007199254740993','9223372036854775807']){
 const url=new URL(practiceURL(ref));
 check(validPracticeId(ref)&&parsePracticeLink(url.hash)===ref,'Full bigint locator is preserved');
 check(url.origin==='https://www.totehm.com'&&url.pathname==='/totehm'&&url.search==='?telegram=1','The mini-app always opens the native authority');
 check(!url.href.includes('token')&&!url.href.includes('habit')&&!url.href.includes('ref='),'No session or Habit text is exported in the mini-app URL');
}
for(const bad of ['',0,'0','-1','01','1&token=secret','9223372036854775808','99999999999999999999']){
 check(!validPracticeId(bad)&&!parsePracticeLink('#practice='+bad),'Invalid source IDs cannot become native locators');
 assert.throws(()=>practiceURL(bad));checks++;
}
check(!parsePracticeLink('#practice=1&ro=someone')&&!parsePracticeLink('#practice=1&practice=2'),'No extra values or visited-account context are accepted');
const habit='Lire & écrire <b>読書</b>';
const snapshot={habits:[{t:habit,is:['express'],f:'weekly',rhythm_text:'3 times a week at 7 AM'},{t:'Unrelated Habit',f:'daily',rhythm_text:'UNRELATED TIMING'}],
 habit_spots:[{habit_text:habit,place:'My kitchen <b>読書</b>'},{habit_text:'Unrelated Habit',place:'UNRELATED PLACE'}],
 objectives:[{id:id(1),text:'Publish my book',target_at:'2027-06-01'},{id:id(2),text:'Travel unrelated',target_at:'2027-07-01'},
  {id:id(3),text:'Share what I learn',target_at:null},{id:id(6),text:'UNRELATED VISION',target_at:null}],
 repulsions:[{id:'1',repulsion:'Scroll instead',habit_text:habit,active:true},{id:'2',repulsion:'UNRELATED TRIGGER',habit_text:'Unrelated Habit',active:true}],
 stories:[{id:id(4),text:'MY OWN WORDS, not an inferred lesson'},{id:id(5),text:'UNRELATED STORY'}],
 objective_habits:[{habit_text:habit,objective_id:id(1)},{habit_text:habit,objective_id:id(3)}],repulsion_stories:[{repulsion_id:'1',story_id:id(4)}]};
const context=s=>projectContext(projectGraph(s),{query:'',purpose:'explicit',focus:{kind:'habit',ref:habit},limit:12});
const calls=[],queries=[],sent=[];let allowed=true,readError=false;
const tables={...snapshot,totehms:[{habits:snapshot.habits}]};delete tables.habits;
const db={async rpc(name,args){calls.push({name,args});assert.equal(name,'tracking_practice_target');assert.equal(args.p_telegram,101);return {data:allowed?{ok:true,user_id:uid,habit}:{ok:false},error:null};},
 from(table){const filters=[];let n=Infinity,columns;const q={select(v){columns=v;return q},eq(k,v){if(k==='user_id')assert.equal(v,uid);else filters.push(r=>r[k]===v);return q},
 or(){filters.push(r=>!['achieved','abandoned','converted'].includes(r.status));return q},is(k,v){filters.push(r=>(r[k]??null)===v);return q},not(k,op,v){assert.equal(op,'is');filters.push(r=>(r[k]??null)!==v);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},limit(v){n=v;return q},then(ok,no){queries.push({table,n,columns});return Promise.resolve({data:(tables[table]||[]).filter(r=>filters.every(f=>f(r))).slice(0,n),error:readError?{message:'private detail'}:null}).then(ok,no)}};return q;}};
const telegram=async(method,payload)=>{sent.push({method,payload});return {ok:true,result:{message_id:22}};};
const callback=(data)=>({callback_query:{id:'cb',from:{id:101},message:{message_id:22,chat:{id:101,type:'private'},text:'Prepare your next step'},data}});
/* 23/11 (Wah) : « Prepare est inutile » — un ancien bouton Prepare ouvre simplement la Habit, sans lire le texte lié ;
   /prepare est un alias muet ; /totehm ouvre mon TOTEHM. Aucune lecture, aucune écriture. */
await handleTrackingUpdate(db,callback('t:p:9007199254740993:open'),telegram);
check(calls.length===0&&queries.length===0&&sent.at(-1).payload.reply_markup.inline_keyboard[0][0].web_app.url===practiceURL('9007199254740993'),'An old Prepare button only opens that Habit: no lookup, no linked text');
await handleTrackingUpdate(db,callback('t:p:9007199254740993:show'),telegram);
check(calls.length===0&&queries.length===0&&!sent.at(-1).payload.text.includes('My next step'),'An old « show linked text » button never brings linked text into Telegram');
const group=callback('t:p:1:show');group.callback_query.message.chat.type='group';
check(!await handleTrackingUpdate(db,group,telegram),'Group messages are never handled');
const forged=callback('t:p:1:show');forged.callback_query.from.id=202;
check(!await handleTrackingUpdate(db,forged,telegram),'Mismatching sender and private chat cannot impersonate the linked member');
const sentBefore=sent.length;
for(const command of ['/prepare','/preparer','/préparer']){
 check(await handleTrackingUpdate(db,{message:{text:command,from:{id:101},chat:{id:101,type:'private'}}},telegram)&&sent.length===sentBefore,'/prepare is a silent alias: '+command);
}
await handleTrackingUpdate(db,{message:{text:'/totehm',from:{id:101},chat:{id:101,type:'private'}}},telegram);
check(calls.length===0&&sent.at(-1).payload.reply_markup.inline_keyboard[0][0].web_app.url===practiceURL(),'/totehm opens my TOTEHM, no report or data lookup');
const payload={chat_id:'101',text:'Choose',reply_markup:{inline_keyboard:[[{text:'↺ Why: x',callback_data:'t:k:1:0'}],[{text:'Open my Habit',web_app:{url:practiceURL('1')}}]]}};
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

// Direct linked boxes use the complete bounded owner graph, rather than a 12-item excerpt.
const outcome='9223372036854775807',goalRefs=Array.from({length:14},(_,n)=>id(100+n)),visionRefs=[id(200),id(201),id(202)],repRefs=['9007199254740993','9223372036854775807','3','4'];
const objectiveOrder=[...goalRefs].reverse(),visionOrder=[visionRefs[2],visionRefs[0],visionRefs[1]],repulsionOrder=[repRefs[3],repRefs[1],repRefs[2],repRefs[0]];
const nativeSnapshot={
 habits:[{t:habit,f:'weekly'},{t:'PEER HABIT',f:'daily'}],
 objectives:[...goalRefs.map((ref,n)=>({id:ref,text:'Objective '+n+' · 漢字 👩🏽‍💻',target_at:'2027-06-01',status:'active'})),
  ...visionRefs.map((ref,n)=>({id:ref,text:'Vision '+n,target_at:null,status:'active'})),
  {id:id(390),text:'OWNED BUT UNLINKED',target_at:'2027-07-01',status:'active'},
  {id:id(391),text:'INDIRECT STORY WHY',target_at:null,status:'active'}],
 repulsions:repRefs.map((ref,n)=>({id:ref,repulsion:'Repulsion '+n,habit_text:habit,active:true})),
 stories:[{id:id(392),text:'A linked story is not a direct why'}],
 objective_habits:[...goalRefs,...visionRefs].map(ref=>({habit_text:habit,objective_id:ref})),
 repulsion_habits:[{habit_text:habit,repulsion_id:repRefs[0]}],
 repulsion_stories:[{repulsion_id:repRefs[0],story_id:id(392)}],
 story_objectives:[{story_id:id(392),objective_id:id(391)}],
 element_orders:[{kind:'objective',refs:objectiveOrder},{kind:'vision',refs:visionOrder},{kind:'repulsion',refs:repulsionOrder}]
};
nativeSnapshot.objective_habits.push({habit_text:habit,objective_id:goalRefs[0]},{habit_text:'PEER HABIT',objective_id:id(390)});
const nativeGraph=projectGraph(nativeSnapshot),expectedRefs=[...objectiveOrder,...visionOrder,...repulsionOrder];
const directBoxes=linkedPracticeBoxes(nativeGraph,habit);
check(directBoxes.map(x=>x.ref).join('|')===expectedRefs.join('|'),'Every direct objective, vision and repulsion appears once in its own native view order');
check(directBoxes.length===21&&!directBoxes.some(x=>x.kind==='story'||x.ref===id(390)||x.ref===id(391)),'Indirect stories, another Habit and owned unlinked choices cannot become direct tracking buttons');
check(linkedPracticeBoxes(nativeGraph,'MISSING HABIT').length===0,'A missing Habit has no linked box controls');
const linkPages=[0,1,2].map(page=>linkedPracticeRows(nativeGraph,habit,outcome,page));
const linkButtons=rows=>rows.flat().filter(b=>b.callback_data?.startsWith('t:x:'));
const pagedButtons=linkPages.flatMap(linkButtons);
check(linkPages.map(rows=>linkButtons(rows).length).join('|')==='2|10|9'&&pagedButtons.length===21,'23/11 · two REMEMBER links under the Habit, then « ↺ +N more » pages of ten: every link stays reachable');
check(pagedButtons.map(b=>b.callback_data.split(':').at(-1)).join('|')===expectedRefs.join('|'),'Pagination preserves each native order without dropping or duplicating a box');
check(pagedButtons.slice(0,17).every(b=>b.text.startsWith('↺ Why: '))&&pagedButtons.slice(17).every(b=>b.text.startsWith('↺ Trigger: '))&&linkPages[0].flat().some(b=>b.text==='↺ +19 more'),'The button itself states ↺ Why or ↺ Trigger (the Stoner method)');
check(linkPages[0].flat().some(b=>b.callback_data==='t:k:'+outcome+':1')&&!linkPages[0].flat().some(b=>b.text==='Previous links')&&linkPages[1].flat().some(b=>b.callback_data==='t:k:'+outcome+':0')&&linkPages[2].flat().some(b=>b.callback_data==='t:k:'+outcome+':1'),'Previous and more controls preserve the exact outcome and requested link page');
check(pagedButtons.every(b=>Buffer.byteLength(b.callback_data)<=64)&&Buffer.byteLength(linkedPracticeCallback(outcome,'w',goalRefs[0]))===62,'A nineteen-digit outcome and an unchanged UUID fit Telegram’s 64-byte callback limit');
check(linkedPracticeCallback(outcome,'r',repRefs[1]).endsWith(':r:'+repRefs[1]),'Repulsion bigint references remain complete strings');
for(const bad of ['0','01','9223372036854775808','99999999999999999999']){assert.throws(()=>linkedPracticeCallback(bad,'w',goalRefs[0]));checks++;}
for(const [kind,ref] of [['w','0'],['r','01'],['r','9223372036854775808'],['w','1:other'],['z',goalRefs[0]]]){assert.throws(()=>linkedPracticeCallback(outcome,kind,ref));checks++;}
const previewSnapshot=structuredClone(nativeSnapshot),previewText='👩🏽‍💻 漢字 مرحبا <b>literal</b> '.repeat(40);
previewSnapshot.objectives[0].text=previewText;
const previewGraph=projectGraph(previewSnapshot),previewButton=Array.from({length:3},(_,page)=>linkedPracticeRows(previewGraph,habit,outcome,page)).flatMap(linkButtons).find(b=>b.callback_data.endsWith(':w:'+goalRefs[0]));
check(previewButton.text.isWellFormed()&&previewButton.text.length<80&&previewButton.text.startsWith('↺ Why: 👩🏽‍💻 漢字'),'Long multilingual button previews remain short and preserve complete Unicode characters');
const fullLinkedText=linkedPracticeText(previewGraph,habit,'w',goalRefs[0]);
check(fullLinkedText.startsWith('Why · Deadline: 2027-06-01\n\n')&&fullLinkedText.includes(previewText.trim()),'Opening an objective returns its complete authored text with its recorded deadline');
check(linkedPracticeText(nativeGraph,habit,'w',visionRefs[0]).startsWith('Why · vision\n\n')&&linkedPracticeText(nativeGraph,habit,'r',repRefs[0]).startsWith('Trigger\n\n'),'Undated whys state vision and repulsions are read as a Trigger');
check(linkedPracticeText(nativeGraph,habit,'w',id(390))===null&&linkedPracticeText(nativeGraph,habit,'w',id(391))===null&&linkedPracticeText(nativeGraph,habit,'r',goalRefs[0])===null,'Even valid owned IDs require the exact current direct relation and category');
const shiftedSnapshot=structuredClone(nativeSnapshot);shiftedSnapshot.objectives.find(x=>x.id===goalRefs[0]).target_at=null;
check(linkedPracticeText(projectGraph(shiftedSnapshot),habit,'w',goalRefs[0]).startsWith('Why · vision\n\n'),'The same UUID callback survives moving a why from objective to vision');
shiftedSnapshot.objectives.find(x=>x.id===goalRefs[0]).target_at='2028-03-01';
check(linkedPracticeText(projectGraph(shiftedSnapshot),habit,'w',goalRefs[0]).startsWith('Why · Deadline: 2028-03-01\n\n'),'The same UUID callback also survives restoring a deadline');
const maximalTextSnapshot={habits:[{t:habit}],objectives:[{id:id(399),text:'🌍'.repeat(33000),target_at:null}],objective_habits:[{habit_text:habit,objective_id:id(399)}]};
const maximalText=linkedPracticeText(projectGraph(maximalTextSnapshot),habit,'w',id(399));
check(maximalText.includes('🌍'.repeat(32000))&&maximalText.isWellFormed()&&maximalText.includes('This text continues in the original box'),'A physically bounded 64000-character graph excerpt states that the authored box continues');

// The in-memory client enforces the real owner, active-row and physical bounds.
// Mutations fail immediately so a read callback cannot silently create a report or draft.
const foreignUid='22222222-2222-4222-8222-222222222222';
const snapshotTables=(source,owner)=>{
 const result={totehms:[{user_id:owner,habits:source.habits||[]}]};
 for(const [table,rows] of Object.entries(source))if(Array.isArray(rows)&&table!=='habits')result[table]=rows.map(row=>({...row,user_id:owner}));
 return result;
};
const makeLinkedHarness=(source,foreign={})=>{
 const ownTables=snapshotTables(source,uid),foreignTables=snapshotTables(foreign,foreignUid),state={allowed:true,error:false},rpcs=[],reads=[],messages=[],writes=[];
 const linkedDb={async rpc(name,args){rpcs.push({name,args});assert.equal(name,'tracking_practice_target','Linked text must never call an answer/detail/model RPC');assert.equal(args.p_telegram,101);return {data:state.allowed?{ok:true,user_id:uid,habit}:{ok:false},error:null};},
  from(table){const filters=[],constraints=[];let n=Infinity,columns;
   const q={select(value){columns=value;return q},eq(key,value){constraints.push([key,value]);filters.push(row=>row[key]===value);return q},
    is(key,value){filters.push(row=>(row[key]??null)===value);return q},
    not(key,op,value){assert.equal(op,'is');filters.push(row=>(row[key]??null)!==value);return q},
    in(key,values){constraints.push([key,[...values]]);filters.push(row=>values.includes(String(row[key])));return q},
    or(value){filters.push(row=>value==='status.is.null,status.eq.active'?(!row.status||row.status==='active'):!['achieved','abandoned','converted'].includes(row.status));return q},
    limit(value){n=value;return q},
    insert(){writes.push(table);throw Error('Unexpected linked-text insert')},upsert(){writes.push(table);throw Error('Unexpected linked-text upsert')},update(){writes.push(table);throw Error('Unexpected linked-text update')},delete(){writes.push(table);throw Error('Unexpected linked-text delete')},
    then(ok,no){reads.push({table,columns,n,constraints});assert(constraints.some(([key,value])=>key==='user_id'&&value===uid),'Every graph query must filter the resolved owner');assert(n<=401,'Every graph query must remain bounded');
     return Promise.resolve({data:[...(ownTables[table]||[]),...(foreignTables[table]||[])].filter(row=>filters.every(f=>f(row))).slice(0,n),error:state.error?{message:'PRIVATE READ ERROR'}:null}).then(ok,no)}
   };return q;}
 };
 const linkedTelegram=async(method,payload)=>{messages.push({method,payload});return {ok:true,result:{message_id:77}};};
 return {db:linkedDb,telegram:linkedTelegram,state,rpcs,reads,messages,writes,tables:ownTables,reset(){rpcs.length=reads.length=messages.length=0}};
};
const invokeLinked=(h,data)=>handleTrackingUpdate(h.db,callback(data),h.telegram,async()=>{});
const sentLinked=h=>h.messages.filter(x=>x.method==='sendMessage');
const linkedHarness=makeLinkedHarness(previewSnapshot,{habits:[{t:habit}],objectives:[{id:id(500),text:'FOREIGN SAME HABIT SECRET',target_at:null}],objective_habits:[{habit_text:habit,objective_id:id(500)}]});
const loadedGraph=await readPracticeLinks(linkedHarness.db,{user_id:uid,habit});
check(linkedPracticeBoxes(loadedGraph,habit).map(x=>x.ref).join('|')===expectedRefs.join('|'),'The read path retains every direct relation beyond the connector’s twelve-item selection');
check(linkedHarness.reads.every(q=>q.n<=401&&q.constraints.some(([key,value])=>key==='user_id'&&value===uid))&&!linkedPracticeText(loadedGraph,habit,'w',id(500)),'A foreign owner with the same exact Habit text cannot contribute a box or relation');
const callbackData=linkedPracticeCallback(outcome,'w',goalRefs[0]);
linkedHarness.reset();await invokeLinked(linkedHarness,callbackData);
check(linkedHarness.rpcs.length===1&&linkedHarness.rpcs[0].args.p_outcome===outcome&&linkedHarness.reads.length>0,'A box callback revalidates the exact outcome owner before its bounded current graph read');
check(sentLinked(linkedHarness).map(x=>x.payload.text).join('')===fullLinkedText,'A tapped preview returns the complete recorded text rather than the button excerpt');
check(sentLinked(linkedHarness).every(x=>x.payload.disable_notification===true&&!x.payload.parse_mode)&&!linkedHarness.messages.some(x=>x.method.startsWith('editMessage')),'Requested linked text is silent plain text and leaves the original Done/Missed message untouched');
check(sentLinked(linkedHarness).at(-1).payload.reply_markup.inline_keyboard.flat().some(b=>b.web_app?.url===practiceURL(outcome))&&linkedHarness.writes.length===0,'The explicit reply keeps the authenticated native path without writing a report, detail or draft');
const rawMultilingual=('First line · 👩🏽‍💻 漢字 مرحبا <b>literal</b>\nSecond line & all my words\n').repeat(350);
const longHarness=makeLinkedHarness({habits:[{t:habit}],objectives:[{id:id(600),text:rawMultilingual,target_at:'2027-09-01',status:'active'}],objective_habits:[{habit_text:habit,objective_id:id(600)}]});
await invokeLinked(longHarness,linkedPracticeCallback(outcome,'w',id(600)));
const fullSegments=sentLinked(longHarness),expectedLong=linkedPracticeText(projectGraph({habits:[{t:habit}],objectives:[{id:id(600),text:rawMultilingual,target_at:'2027-09-01',status:'active'}],objective_habits:[{habit_text:habit,objective_id:id(600)}]}),habit,'w',id(600));
check(fullSegments.length>1&&fullSegments.map(x=>x.payload.text).join('')===expectedLong&&fullSegments.every(x=>x.payload.text.length<=3500&&x.payload.text.isWellFormed()),'The real callback delivers every authored Unicode character in safe Telegram segments');
check(fullSegments.every(x=>x.payload.disable_notification===true&&!x.payload.parse_mode)&&fullSegments.slice(0,-1).every(x=>!x.payload.reply_markup)&&!!fullSegments.at(-1).payload.reply_markup,'Only the final silent text segment carries the native Habit control');
check(!longHarness.messages.some(x=>x.method.startsWith('editMessage'))&&longHarness.writes.length===0&&longHarness.rpcs.every(x=>x.name==='tracking_practice_target'),'Long requested text creates neither a check-in edit nor an observation, draft or model call');

for(const reason of ['unlinked Telegram','expired reference','revoked owner']){
 const denied=makeLinkedHarness(previewSnapshot);denied.state.allowed=false;
 await invokeLinked(denied,callbackData);
 check(denied.rpcs.length===1&&denied.reads.length===0&&!JSON.stringify(sentLinked(denied)).includes(previewText.trim()),reason+' is refused before any linked private read');
}
for(const [reason,mutate,kind,ref] of [
 ['removed current Habit',s=>{s.habits=[]},'w',goalRefs[0]],
 ['removed direct why link',s=>{s.objective_habits=s.objective_habits.filter(x=>x.objective_id!==goalRefs[0])},'w',goalRefs[0]],
 ['deleted why row',s=>{s.objectives=s.objectives.filter(x=>x.id!==goalRefs[0])},'w',goalRefs[0]],
 ['inactive objective',s=>{s.objectives.find(x=>x.id===goalRefs[0]).status='achieved'},'w',goalRefs[0]],
 ['inactive vision',s=>{s.objectives.find(x=>x.id===visionRefs[0]).status='abandoned'},'w',visionRefs[0]],
 ['inactive repulsion',s=>{s.repulsions.find(x=>x.id===repRefs[0]).active=false},'r',repRefs[0]],
 ['removed direct repulsion link',s=>{s.repulsions.find(x=>x.id===repRefs[0]).habit_text='PEER HABIT';s.repulsion_habits=[]},'r',repRefs[0]]
]){
 const changed=structuredClone(previewSnapshot);mutate(changed);const denied=makeLinkedHarness(changed);
 await invokeLinked(denied,linkedPracticeCallback(outcome,kind,ref));
 check(denied.rpcs.length===1&&denied.reads.length>0&&sentLinked(denied).every(x=>!x.payload.text.includes('Why ·')&&!x.payload.text.includes('Trigger\n\n'))&&denied.writes.length===0,reason+' prevents a stale button from opening private linked text');
}
for(const ref of [id(390),id(391),id(500)]){
 linkedHarness.reset();await invokeLinked(linkedHarness,linkedPracticeCallback(outcome,'w',ref));
 check(linkedHarness.rpcs.length===1&&sentLinked(linkedHarness).every(x=>!x.payload.text.includes('OWNED BUT UNLINKED')&&!x.payload.text.includes('INDIRECT STORY WHY')&&!x.payload.text.includes('FOREIGN SAME HABIT SECRET')),'A forged owned-unlinked, indirect or foreign reference cannot expose text');
}
for(const data of ['t:x:'+outcome+':w:0','t:x:'+outcome+':w:1','t:x:'+outcome+':w:'+goalRefs[0]+':extra','t:x:9223372036854775808:w:'+goalRefs[0],'t:x:'+outcome+':r:01','t:x:'+outcome+':v:'+visionRefs[0]]){
 linkedHarness.reset();await invokeLinked(linkedHarness,data);
 check(linkedHarness.rpcs.length===0&&linkedHarness.reads.length===0,'Malformed or former index callbacks cannot retarget a current box');
}

for(const [state,controls] of [
 ['unanswered',[[{text:'On It',callback_data:'t:a:'+outcome+':on_it'},{text:'No Time',callback_data:'t:a:'+outcome+':no_time'},{text:'No Energy',callback_data:'t:a:'+outcome+':no_energy'}]]],
 ['saved',[[{text:'Saved · On It · Change',callback_data:'t:e:'+outcome+':open'}]]]
]){
 const pagerHarness=makeLinkedHarness(nativeSnapshot),update=callback('t:k:'+outcome+':1');
 update.callback_query.message.text=habit+'\n\nToday · 10 Nov\nAre you on it?'+(state==='saved'?'\n\nSaved · On It':'');
 update.callback_query.message.reply_markup={inline_keyboard:[...controls,...linkedPracticeRows(nativeGraph,habit,outcome,0)]};
 const originalText=update.callback_query.message.text;
 await handleTrackingUpdate(pagerHarness.db,update,pagerHarness.telegram,async()=>{});
 const edited=pagerHarness.messages.filter(x=>x.method==='editMessageReplyMarkup');
 check(pagerHarness.rpcs.length===1&&pagerHarness.reads.length>0&&edited.length===1&&sentLinked(pagerHarness).length===0,'Paging '+state+' links rechecks ownership and changes only the existing message keyboard');
 const buttons=edited[0].payload.reply_markup.inline_keyboard.flat();
 check(controls.flat().every(expected=>buttons.some(actual=>actual.callback_data===expected.callback_data&&actual.text===expected.text))&&linkButtons(edited[0].payload.reply_markup.inline_keyboard).map(b=>b.callback_data).join('|')===linkButtons(linkPages[1]).map(b=>b.callback_data).join('|'),'Paging '+state+' links keeps the exact answer or Change controls and shows the requested native-order page');
 check(!pagerHarness.messages.some(x=>x.method==='editMessageText')&&update.callback_query.message.text===originalText&&pagerHarness.writes.length===0,'Paging '+state+' links preserves check-in text and creates no report, detail or draft');
}

const reorderHarness=makeLinkedHarness({...previewSnapshot,element_orders:[{kind:'objective',refs:goalRefs},{kind:'vision',refs:visionRefs},{kind:'repulsion',refs:repRefs}]});
await invokeLinked(reorderHarness,callbackData);
check(sentLinked(reorderHarness).map(x=>x.payload.text).join('')===fullLinkedText,'Changing native order cannot retarget an existing exact box callback');
const movedHarness=makeLinkedHarness(shiftedSnapshot);movedHarness.tables.objectives.find(x=>x.id===goalRefs[0]).target_at=null;
await invokeLinked(movedHarness,callbackData);
check(sentLinked(movedHarness).map(x=>x.payload.text).join('').startsWith('Why · vision\n\n'),'A previously issued objective callback opens that same current UUID after it becomes a vision');

// A focus beyond a physical category cap is supplemented through the existing owner path.
const physicalRefs=Array.from({length:405},(_,n)=>id(1000+n)),physicalRef=physicalRefs.at(-1),physicalSnapshot={habits:[{t:habit}],objectives:physicalRefs.map((ref,n)=>({id:ref,text:n===404?'EXACT SOURCE OUTSIDE FIRST 400':'Reason '+n,target_at:'2028-01-01',status:'active'})),objective_habits:[{habit_text:habit,objective_id:physicalRef}]};
const physicalHarness=makeLinkedHarness(physicalSnapshot);
const physicalGraph=await readPracticeLinks(physicalHarness.db,{user_id:uid,habit},{kind:'objective',ref:physicalRef});
check(physicalGraph.truncated&&linkedPracticeText(physicalGraph,habit,'w',physicalRef).includes('EXACT SOURCE OUTSIDE FIRST 400'),'A current exact linked box beyond the physical cap remains recoverable without widening the read');
check(physicalHarness.reads.some(q=>q.table==='objectives'&&q.constraints.some(([key,value])=>key==='id'&&Array.isArray(value)&&value.includes(physicalRef)))&&physicalHarness.reads.every(q=>q.n<=401&&q.constraints.some(([key,value])=>key==='user_id'&&value===uid)),'Supplementary focused reads keep both the owner filter and original physical bound');
check(linkedPracticeRows(physicalGraph,habit,outcome).flat().some(b=>b.text==='More in my Habit'&&b.url===practiceURL(outcome)),'A physically partial source exposes a truthful route to the complete native Habit');
physicalHarness.reset();await invokeLinked(physicalHarness,linkedPracticeCallback(outcome,'w',physicalRef));
check(sentLinked(physicalHarness).map(x=>x.payload.text).join('').includes('EXACT SOURCE OUTSIDE FIRST 400')&&physicalHarness.writes.length===0,'The callback itself can retrieve an exact linked source outside the first physical page');

const movedPhysicalSnapshot=structuredClone(physicalSnapshot);for(const row of movedPhysicalSnapshot.objectives)row.target_at=null;
const movedPhysicalHarness=makeLinkedHarness(movedPhysicalSnapshot);
await invokeLinked(movedPhysicalHarness,linkedPracticeCallback(outcome,'w',physicalRef));
check(sentLinked(movedPhysicalHarness).map(x=>x.payload.text).join('').startsWith('Why · vision\n\nEXACT SOURCE OUTSIDE FIRST 400'),'An old objective UUID callback still finds that same why after it moves beyond the first 400 current visions');
check(movedPhysicalHarness.reads.some(q=>q.table==='objectives'&&q.constraints.some(([key,value])=>key==='id'&&Array.isArray(value)&&value.includes(physicalRef)))&&movedPhysicalHarness.reads.every(q=>q.n<=401&&q.constraints.some(([key,value])=>key==='user_id'&&value===uid))&&movedPhysicalHarness.writes.length===0,'Cross-view exact recovery preserves bounded owner-filtered reads and never writes');

const failedHarness=makeLinkedHarness(previewSnapshot);failedHarness.state.error=true;
await assert.rejects(()=>invokeLinked(failedHarness,callbackData));checks++;
check(failedHarness.writes.length===0&&!JSON.stringify(failedHarness.messages).includes('PRIVATE READ ERROR'),'A private read failure produces neither a mutation nor a provider/private error disclosure');

console.log(JSON.stringify({suite:'TotehmBot REMEMBER links',checks,passed:checks}));
