// Synthetic narratives and authorized source fixtures; no member data or model calls.
import assert from 'node:assert/strict';
import {projectGraph,projectContext,retrieveContext,retrieveElement,elementURL,validElementRef} from '../../backend/supabase/functions/_shared/chatgpt-context.ts';
import {retrieveEcosystem,readMember,clubSpots} from '../../backend/supabase/functions/_shared/chatgpt-ecosystem.ts';
import {enrichClubPlan} from '../../backend/supabase/functions/_shared/chatgpt-club-plan.ts';
import {parseElementLink,resolveElementLink} from '../../com/totehm-link.mjs';
import {CHATGPT_TOOLS} from '../../backend/supabase/functions/_shared/chatgpt-server.ts';
const uid='11111111-1111-4111-8111-111111111111',id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
const snapshot={habits:[{t:'Écrire mon livre',is:['express']},{t:'Lire',is:['focus']},{t:'Marcher doucement',is:['love']}],
 objectives:[{id:id(1),text:'Publier mon livre',status:'active',target_at:'2027-01-01'},{id:id(2),text:'Apprendre',status:'active',target_at:'2027-01-01'},{id:id(3),text:'Transmettre',status:'active',target_at:null}],
 repulsions:[{id:'1',repulsion:'Défilement',active:true,habit_text:'Écrire mon livre'},{id:'2',repulsion:'Attendre',active:true,habit_text:'Lire'}],
 stories:[{id:id(4),text:'Mon expérience\n\n'+('Le temps de créer compte. '.repeat(30))+'Ne pas me presser.'}],
 objective_habits:[{habit_text:'Écrire mon livre',objective_id:id(1)},{habit_text:'Lire',objective_id:id(2)},{habit_text:'Écrire mon livre',objective_id:id(3)}],
repulsion_stories:[{repulsion_id:'1',story_id:id(4)}]};
const graph=projectGraph(snapshot),query=options=>projectContext(graph,{query:'Que faire ?',purpose:'action',search_terms:[],...options});
const broad=query({});
check(new Set(broad.items.map(i=>i.kind)).size===5,'The primary recommendation keeps its whole recorded five-view graph');
check(broad.edges.filter(e=>e.relation!=='informs').length===4,'All four explanatory links travel with the main recommendation');
check(broad.edges.filter(e=>e.relation==='serves'&&e.from===broad.items.find(i=>i.ref==='Écrire mon livre').key).length===2&&!broad.edges.some(e=>e.relation==='towards'),'The Habit directly serves both its recorded dated and undated whys');
check(broad.coverage.omitted_related&&broad.coverage.source_complete,'Selection omissions are distinct from incomplete source rows');
check(query({search_terms:['ecrire']}).items[0].text==='Écrire mon livre','Missing Latin accents do not hide a match');
check(query({search_terms:['écriture','écrire']}).selection==='lexical','Model-supplied word forms can refine the search without a server model');
check(query({search_terms:['nonexistent']}).selection==='empty','Tolerance never fabricates a match for an unrelated topic');
const declined=query({exclude:snapshot.habits.slice(0,2).map(h=>({kind:'habit',ref:h.t}))});
check(declined.items[0].text==='Marcher doucement','A subsequent call can retrieve a feasible alternative beyond the first two habits');
check(query({}).items[0].text==='Écrire mon livre','Exclusion never changes the person’s persisted order');
const excerpt=broad.items.find(i=>i.kind==='story');
check(excerpt.text.length===500&&excerpt.text_truncated&&excerpt.text_length>500,'Long excerpts advertise their missing original text');
const full=query({purpose:'explicit',focus:{kind:'story',ref:id(4)}}).items[0];
check(full.text===snapshot.stories[0].text&&!full.text_truncated,'Exact read preserves the whole story, paragraphs and decisive ending');
const veryLong='Un paragraphe.\n'.repeat(700)+'Le mot final.';
const longGraph=projectGraph({stories:[{id:id(9),text:veryLong}]});
let restored='',offset=0,next;
do{const page=projectContext(longGraph,{query:'story',purpose:'explicit',focus:{kind:'story',ref:id(9)},text_offset:offset}).items[0];
 restored+=page.text;next=page.next_text_offset;offset=next;}while(next!==undefined);
check(restored===veryLong,'Exact text pages reconstruct a long original without loss or duplication');
const longHabit='x'.repeat(3999)+'🌍読書 '.repeat(420)+'The exact ending.';
const habitGraph=projectGraph({habits:[{t:longHabit,is:['focus']}]});
check(habitGraph.items.length===1&&habitGraph.items[0].ref===longHabit,'A long Unicode Habit remains an exact graph reference rather than disappearing above 500 characters');
const habitURL=new URL(habitGraph.items[0].url);
check(new URLSearchParams(habitURL.hash.slice(1)).get('ref')===longHabit&&!habitURL.search,'The source locator preserves the complete Unicode Habit in the fragment only');
restored='';offset=0;
do{const page=projectContext(habitGraph,{query:'practice',purpose:'explicit',focus:{kind:'habit',ref:longHabit},text_offset:offset}).items[0];
 check(page.text.length<=4000&&page.text.isWellFormed(),'Each exact Habit page fits the page bound without splitting a Unicode surrogate pair');
 restored+=page.text;next=page.next_text_offset;offset=next;}while(next!==undefined);
check(restored===longHabit,'Paged exact Habit reads reconstruct all original characters and the decisive ending');
assert.throws(()=>projectContext(habitGraph,{query:'practice',purpose:'explicit',focus:{kind:'habit',ref:longHabit},text_offset:4000}));checks++;
const excerptEmoji=projectContext(projectGraph({habits:[{t:'a'.repeat(499)+'🌍 end'}]}),{query:'practice',purpose:'action',search_terms:[]}).items[0];
check(excerptEmoji.text.isWellFormed()&&excerptEmoji.text.length===499&&excerptEmoji.text_truncated,'A short discovery excerpt also preserves emoji integrity');
check(validElementRef({kind:'habit',ref:'a'.repeat(16000)})&&!validElementRef({kind:'habit',ref:'a'.repeat(16001)}),'Only Habit references receive the explicit 16000-unit bound');
check(!validElementRef({kind:'objective',ref:longHabit})&&!validElementRef({kind:'vision',ref:longHabit})&&!validElementRef({kind:'repulsion',ref:longHabit}),'Long Habit support never relaxes UUID or numeric identifiers of other views');

for(const options of [{text_offset:-1,focus:{kind:'story',ref:id(4)}},{text_offset:1.5,focus:{kind:'story',ref:id(4)}},{text_offset:0},{exclude:[{kind:'habit',ref:''}]},{exclude:Array(13).fill({kind:'habit',ref:'Read'})},{review:true}]){
 assert.throws(()=>query(options));checks++;
}
const reviewGraph=projectGraph({habits:[{t:'Read'}],objectives:[{id:id(1),text:'Orphan',status:'active',target_at:'2027-01-01'},{id:id(2),text:'Finished',status:'achieved',target_at:'2027-01-01'},{id:id(3),text:'Vision',status:'active',target_at:null}],
 repulsions:[{id:'1',repulsion:'Delay',active:true}]});
const review=projectContext(reviewGraph,{query:'Review my system',purpose:'explicit',review:true});
check(review.review.complete&&review.review.counts.objective===1&&review.review.gaps.length===4,'Review identifies only missing active recorded links, without a score');
check(review.review.gaps.every(g=>review.items.some(i=>i.kind===g.element.kind&&i.ref===g.element.ref)),'Each review suggestion has its exact element in the response');
const partial=projectContext({...reviewGraph,truncated:true},{query:'Review',purpose:'explicit',review:true});
check(!partial.review.complete&&partial.review.gaps.length===0,'An incomplete graph cannot establish that a connection is absent');
const tables={...snapshot,totehms:[{habits:snapshot.habits}],element_orders:[]};delete tables.habits;
tables.objectives=[...Array.from({length:401},(_,n)=>({id:id(n+20),text:'Finished '+n,status:'achieved',target_at:'2027-01-01'})),...snapshot.objectives];
const queries=[];
const db={from(table){let filters=[],n=Infinity;const q={select(){return q},eq(k,v){if(k==='user_id')assert.equal(v,uid);else filters.push(r=>r[k]===v);return q},
 is(k,v){filters.push(r=>r[k]===v);return q},not(k,op,v){assert.equal(op,'is');assert.equal(v,null);filters.push(r=>r[k]!==null&&r[k]!==undefined);return q},or(v){assert.ok(['status.is.null,status.not.in.(achieved,abandoned,converted)','status.is.null,status.eq.active'].includes(v));filters.push(v.endsWith('eq.active')?r=>r.status==null||r.status==='active':r=>!['achieved','abandoned','converted'].includes(r.status));return q},
 limit(v){n=v;return q},then(ok,no){queries.push(table);return Promise.resolve({data:(tables[table]||[]).filter(r=>filters.every(f=>f(r))).slice(0,n),error:null}).then(ok,no)}};return q},
 async rpc(name,args){
  if(name==='chatgpt_member_orders')return {data:{ok:true,orders:{}},error:null};
  assert.equal(args.p_grant,'consented-grant');
  if(args.p_action==='members')return {data:{ok:true,items:args.p_offset===0?Array.from({length:8},(_,n)=>({pseudo:'artist'+n})):[{pseudo:'artist8'}],has_more:args.p_offset===0,next_offset:args.p_offset+8},error:null};
  if(args.p_action==='member')return args.p_pseudo==='revoked'?{data:{ok:false,why:'unavailable'},error:null}
   :{data:{ok:true,pseudo:args.p_pseudo,habits:[{t:args.p_pseudo==='artist8'?'Écrire mon livre':'Swimming',is:['flow']}],stories:[{id:id(4),text:snapshot.stories[0].text}]},error:null};
  throw Error('Unexpected RPC');
 }};
const current=await retrieveContext(db,uid,{query:'priorities',purpose:'direction',search_terms:[],kinds:['objective']});
check(current.items.some(i=>i.ref===id(1))&&current.coverage.source_complete,'401 archived objectives cannot hide a currently active goal');
check((await retrieveElement(db,uid,{kind:'story',ref:id(4)})).items[0].text===snapshot.stories[0].text,'The network reader also returns the full original');
const options={query:'writing',purpose:'action',search_terms:['ecrire']};
const first=await retrieveEcosystem(db,'consented-grant',uid,options);
check(first.members.length===0&&first.next_subscription_offset===8&&first.subscriptions_searched===8,'A partial ecosystem search exposes a continuation cursor');
const second=await retrieveEcosystem(db,'consented-grant',uid,options,undefined,first.next_subscription_offset);
check(second.members[0].source.member==='artist8'&&!second.subscriptions_truncated,'Relevant inspiration beyond the first eight subscriptions is reachable');
const member=await readMember(db,'consented-grant','artist8',{query:'story',purpose:'explicit',focus:{kind:'story',ref:id(4)}});
check(new URL(member.items[0].url).searchParams.get('ro')==='artist8'&&member.source.adopted_by_user===false,'Member source links open the authorized original, without adopting it');
await assert.rejects(()=>readMember(db,'consented-grant','revoked',{query:'story',purpose:'explicit',focus:{kind:'story',ref:id(4)}}));checks++;
const club=await clubSpots({rpc:async(name,args)=>{
 check(name==='chatgpt_read_ecosystem'&&args.p_grant==='consented-grant','Club filtering still goes through the consented audience reader');
 check(args.p_filters.city==='Lisbon'&&args.p_filters.intentions[0]==='express','City and intentions are filtered by the native authorized query');
 return {data:{ok:true,items:[{id:id(8),city:'Lisbon',intentions:['express'],state:'will'}]},error:null};
}},'consented-grant',{period:'future',city:'Lisbon',intentions:['express']});
check(club.items[0].url.endsWith(id(8))&&club.items[0].presence_verified===false,'Club sources are actionable without claiming actual presence');
for(const ref of [{kind:'habit',ref:longHabit},{kind:'habit',ref:'Écrire & lire #1 / 読む'},{kind:'objective',ref:id(1)},{kind:'repulsion',ref:'9007199254740993'}]){
 const u=new URL(elementURL(ref));check(!u.search&&JSON.stringify(parseElementLink(u.hash))===JSON.stringify(ref),'Exact references survive fragment encoding without appearing in an HTTP query');
}
for(const hash of ['#element=habit&ref=Read&ref=Other','#element=__proto__&ref=x','#element=objective&ref=not-a-uuid','#element=habit&ref=%00x','#element=habit&ref=Read&url=https://evil.test']){
 check(parseElementLink(hash)===null,'Reject malformed/ambiguous locators');
}
check(resolveElementLink({kind:'habit',ref:'Écrire mon livre'},{habits:[{id:'h7',t:'Draft being typed',t0:'Écrire mon livre'}]}).id==='h7','A habit resolves by its exact persisted reference');
check(resolveElementLink(parseElementLink(habitURL.hash),{habits:[{id:'hLong',t:longHabit,t0:longHabit}]}).id==='hLong','The long Unicode Higher source locator resolves the exact native Habit without abbreviation');
check(resolveElementLink({kind:'habit',ref:'ecrire mon livre'},{habits:[{id:'h7',t:'Écrire mon livre'}]})===null,'Opening a source never substitutes an approximately matching element');
check(resolveElementLink({kind:'objective',ref:id(1)},{objectives:[]})===null,'A locator cannot make an unavailable/private source appear');
check(CHATGPT_TOOLS.length===11&&CHATGPT_TOOLS.find(t=>t.name==='get_context').inputSchema.properties.review,'The same eleven tools support an optional review without expanding grants');

// These fixtures test the context available for place planning, not model output or live venues.
const placeGraph=projectGraph({
 habits:[{t:'Write my book',f:'weekly',rhythm_text:'three mornings at 7am',is:['express']},{t:'Walk slowly',f:'daily',is:['flow']}],
 habit_spots:[{habit_text:'Write my book',place:'my kitchen',latitude:38.71,longitude:-9.14}],
 objectives:[{id:id(701),text:'Perform on an open stage',target_at:null,status:'active'}],
 objective_habits:[{habit_text:'Write my book',objective_id:id(701)}],
 repulsions:[{id:'701',repulsion:'Endless scrolling',obstacle:'After dinner',habit_text:'Write my book',active:true}]
});
const writing=placeGraph.items.find(i=>i.ref==='Write my book'),walking=placeGraph.items.find(i=>i.ref==='Walk slowly');
check(writing.freq==='weekly'&&writing.rhythm_text==='three mornings at 7am','A travel plan receives the confirmed cadence and authored time preference separately');
check(writing.usual_place.text==='my kitchen'&&writing.usual_place.source==='habit_spots'&&writing.usual_place.presence_verified===false,'A usual place is attributed member text without a claim of current presence');
check(!('usual_place' in walking)&&!('where' in walking),'A Habit with no recorded usual place remains without an invented venue');
check(!JSON.stringify(placeGraph).includes('latitude')&&!JSON.stringify(placeGraph).includes('longitude')&&!('city' in writing),'Habitual place input cannot become coordinates or an inferred current city');
const stage=placeGraph.items.find(i=>i.ref===id(701));
check(stage.kind==='vision'&&!('target_at' in stage)&&placeGraph.edges.some(e=>e.from===writing.key&&e.to===stage.key&&e.relation==='serves'),'An undated Vision remains undated in the place-planning context and keeps its direct Habit link');
check(placeGraph.items.some(i=>i.ref==='701'&&i.obstacle==='After dinner')&&placeGraph.edges.some(e=>e.relation==='instead'&&e.to===writing.key),'A real-world replacement can retain the recorded trigger and INSTEAD Habit');
const placeCalls=[],placeDB={rpc:async(name,args)=>{
 assert.equal(name,'chatgpt_read_ecosystem');assert.equal(args.p_grant,'consented-grant');placeCalls.push(args);
 return {error:null,data:{ok:true,as_of:'2026-11-22T18:00:00Z',items:[{
  id:id(702),pseudo:'artist8',city:'Lisbon',state:args.p_period==='future'?'will':'now',
  exact:{place:'Sample writing studio',latitude:38.71,longitude:-9.14},
  starts_at:args.p_period==='future'?'2026-11-23T18:00:00Z':'2026-11-22T18:00:00Z',
  duration_min:45,mode:'group',comment:'Bring a notebook',audience:'figher',intentions:['express'],
  habit_box:{name:'Write my book',objectives:[{text:'Publish my book'}],repulsions:[{text:'Endless scrolling'}]},
  tracking:{done:12},snapshot:{private:'not shared'},open_now:true
 }]}};
}};
const ownPlanningContext={personal:{items:[writing,walking]}};
const untouched=await enrichClubPlan(placeDB,'consented-grant',ownPlanningContext,false,{city:'Lisbon',intentions:['express']});
check(untouched===ownPlanningContext&&placeCalls.length===0,'Personal place planning does not read Club context without an explicit request');
const blockedClub=await enrichClubPlan(placeDB,'consented-grant',ownPlanningContext,true,{city:'Lisbon',intentions:['express']},false);
check(blockedClub.club_plan.why==='ecosystem_consent_required'&&blockedClub.personal===ownPlanningContext.personal&&placeCalls.length===0,'Existing personal access survives absent ecosystem consent without a Club read');
const planning=await enrichClubPlan(placeDB,'consented-grant',ownPlanningContext,true,{city:' Lisbon ',intentions:['express']});
check(placeCalls.length===2&&placeCalls.every(a=>a.p_filters.city==='Lisbon'&&a.p_filters.intentions[0]==='express'&&a.p_pseudo===null),'Explicit Club planning combines the supplied city and intention for now/future, independently of subscriptions');
const opportunity=planning.club_plan.future.items[0];
check(opportunity.starts_at==='2026-11-23T18:00:00Z'&&opportunity.duration_min===45&&opportunity.mode==='group'&&opportunity.comment==='Bring a notebook','A meeting or travel proposal retains the authorized plan date, duration, social mode and member wording');
check(opportunity.place==='Sample writing studio'&&opportunity.intentions[0]==='express'&&opportunity.objectives[0]==='Publish my book'&&opportunity.repulsions[0]==='Endless scrolling','The venue stays attached to its authorized Habit intention and recorded reasons');
check(opportunity.source==='figher_club'&&opportunity.member==='artist8'&&opportunity.presence_verified===false,'A Club opportunity identifies its author and remains a plan, not actual presence');
const plannedJSON=JSON.stringify(planning);
check(!plannedJSON.includes('latitude')&&!plannedJSON.includes('longitude')&&!plannedJSON.includes('tracking')&&!plannedJSON.includes('snapshot')&&!plannedJSON.includes('open_now'),'Venue context contains no GPS, another member tracking, private snapshot or unverified open-now claim');
const creatorCalls=[],creatorDB={rpc:async(name,args)=>{
 creatorCalls.push({name,args});assert.equal(args.p_grant,'consented-grant');
 if(name==='chatgpt_member_orders')return {error:null,data:{ok:true,orders:{}}};
 assert.equal(name,'chatgpt_read_ecosystem');assert.equal(args.p_action,'member');
 return {error:null,data:{ok:true,pseudo:'artist8',habits:[{t:'Write my book',is:['express']},{t:'Walk slowly',is:['flow']}],
  habit_spots:[{habit_text:'Write my book',place:'creator private studio'}],tracking:{done:12}}};
}};
const creatorDay=await readMember(creatorDB,'consented-grant','artist8',{query:'A day in their universe',purpose:'action',search_terms:[],limit:12});
check(creatorDay.items.map(i=>i.ref).join('|')==='Write my book|Walk slowly'&&creatorDay.items.every((i,n)=>i.rank===n+1),'A creator-day request keeps that creator’s native Habit order instead of a cross-source priority');
check(creatorDay.source.member==='artist8'&&creatorDay.source.adopted_by_user===false&&creatorDay.items.every(i=>new URL(i.url).searchParams.get('ro')==='artist8'),'A creator-day request preserves attribution and links to the creator originals without adoption');
check(!JSON.stringify(creatorDay).includes('creator private studio')&&!('practice' in creatorDay)&&creatorCalls.every(c=>['chatgpt_read_ecosystem','chatgpt_member_orders'].includes(c.name)),'Creator planning adds neither a usual-place reader nor another member tracking');
await clubSpots(placeDB,'consented-grant',{period:'future',member:'artist8',habit_ref:'Write my book'});
check(placeCalls.at(-1).p_pseudo==='artist8'&&placeCalls.at(-1).p_filters.habit==='Write my book','A requested creator’s venue uses the existing member and exact Habit filters');

console.log(JSON.stringify({suite:'Higher context fidelity',checks,passed:checks}));
