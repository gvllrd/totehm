// Behavioral retrieval checks. No model, remote requests or personal records.
import assert from 'node:assert/strict';
import {projectGraph,projectContext,retrieveContext,getSounds,getMediaMetadata,getSpots} from '../../backend/supabase/functions/_shared/chatgpt-context.ts';
import {readMember,memberMedia} from '../../backend/supabase/functions/_shared/chatgpt-ecosystem.ts';
import {initializeResult} from '../../backend/supabase/functions/_shared/chatgpt-protocol.ts';
import {CHATGPT_TOOLS} from '../../backend/supabase/functions/_shared/chatgpt-server.ts';
const uid='11111111-1111-4111-8111-111111111111';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let checks=0;
const check=(v,m)=>{assert(v,m);checks++;};
const snapshot={steps:[{t:'Lire',is:['focus'],f:'every_minute',o:id(1)},{t:'Créer',is:['express'],o:id(2)},{t:'Marcher',is:['love']}],
 objectives:[{id:id(1),text:'Publier mon livre',status:'active',target_at:'2020-01-01'},{id:id(2),text:'Totehm est fonctionnel',status:'active'}],
 repulsions:[{id:'1',repulsion:'Défilement sans fin',active:true,habit_text:'Lire'}],
 visions:[{id:id(3),text:'Partager mes idées',importance:8}],wisdom:[{id:id(4),text:'Commencer petit',importance:2}],
 objective_visions:[{objective_id:id(1),vision_id:id(3)}],repulsion_teachings:[{repulsion_id:'1',wisdom_id:id(4)}],
 element_orders:[{kind:'objective',refs:[id(2),id(1)]},{kind:'vision',refs:['private',id(3)]}]};
const graph=projectGraph(snapshot);
for(const query of ["Qu'est-ce que je peux faire cet après-midi ?",'What could I do this afternoon?','O que posso fazer esta tarde?','¿Qué hago esta tarde?','ماذا أفعل بعد الظهر؟','今天下午做什么？','今日の午後は何をしよう？','आज दोपहर क्या करूँ?','Что делать днём?','오후에 무엇을 할까요?','บ่ายนี้ทำอะไรดี','Was kann ich heute Nachmittag machen?']){
 const broad=projectContext(graph,{query,purpose:'action',search_terms:[]});
 check(broad.selection==='ranked'&&broad.items[0].ref==='Lire','Broad request uses saved order, independent of query language');
 const refined=projectContext(graph,{query,purpose:'action',intentions:['express'],search_terms:[],limit:1});
 check(refined.selection==='intentions'&&refined.items[0].ref==='Créer','Semantic intention works with French records and every query language');
}
check(projectContext(graph,{query:"Qu'est-ce que je peux faire cet après-midi ?",purpose:'action'}).selection==='ranked','Legacy whole query does not match the filler “est”');
const ranked=projectContext(graph,{query:'priorities',purpose:'direction',search_terms:[],kinds:['objective'],limit:1});
check(ranked.items[0].ref===id(2),'Explicit member rank takes precedence over old dates');
check(graph.items.find(x=>x.ref===id(1)).target_state==='past_target','Past target is marked as a date, not interpreted as urgency');
check(graph.items.find(x=>x.ref===id(3)).rank===1,'Private ranking gaps are not exposed');
check(graph.items.find(x=>x.kind==='wisdom').rank_source==='importance','Existing MY STORY importance preserved');
check(projectContext(graph,{query:'unknown',purpose:'action',search_terms:['astronomie']}).items.length===0,'Unmatched specific topic never substitutes an unrelated goal');
check(projectContext(graph,{query:'focus',purpose:'action',intentions:['enrich'],search_terms:[]}).items.length===0,'No intention match stays empty');
const replacement=projectContext(graph,{query:'scrolling',purpose:'replacement',search_terms:[]});
check(replacement.items[0].kind==='repulsion'&&replacement.edges.some(x=>x.relation==='instead'),'Replacement starts from a repulsion and returns its recorded alternative');
const all=projectContext(graph,{query:'overview',purpose:'explicit',search_terms:[],kinds:['habit','objective','repulsion','vision','wisdom'],limit:12});
check(new Set(all.items.map(x=>x.kind)).size===5,'Explicit overview can start from every view');
const disconnected=projectGraph({steps:[{t:'party',is:['celebrate']},{t:'art',is:['express']}]});
check(projectContext(disconnected,{query:'art',purpose:'action',search_terms:['art'],limit:1}).items[0].text==='art','Whole word matching does not confuse art with party');
for(const label of ['読書','阅读','قراءة','पढ़ना','독서','อ่านหนังสือ','écrire','Читать']){
 const g=projectGraph({steps:[{t:label,is:['focus']}]});
 check(projectContext(g,{query:label,purpose:'action',search_terms:[label]}).items[0]?.text===label,'Unicode topic/ref preserved: '+label);
}
for(const options of [{intentions:['productive']},{intentions:'focus'},{kinds:['sixth_view']},{search_terms:['']},{include_sound:'yes'},{search_terms:Array(9).fill('x')}]){
 assert.throws(()=>projectContext(graph,{query:'x',purpose:'action',...options}));checks++;
}
const playlist='https://open.spotify.com/playlist/fixture?si=A%2FB&locale=ja';
const tables={totehms:[{steps:snapshot.steps}],...snapshot,
 intention_music:[{intention:'focus',title:'静かな音',url:playlist,active:true},{intention:'express',title:'Jazz',url:null,active:true},{intention:'love',title:'Old',url:'https://example.test/old',active:false}],
 element_media:[]};
tables.visions[0].image=uid+'/private-image.png';
delete tables.steps;
const reads=[];
const db={from(table){let filters=[],n=Infinity,sort=null;const q={select(){return q},eq(k,v){filters.push(r=>k==='user_id'||r[k]===v);if(k==='user_id')assert.equal(v,uid);return q},is(k,v){filters.push(r=>r[k]===v);return q},or(v){assert.equal(v,'status.is.null,status.not.in.(achieved,abandoned,converted)');filters.push(r=>!['achieved','abandoned','converted'].includes(r.status));return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},gt(k,v){filters.push(r=>r[k]>v);return q},lte(k,v){filters.push(r=>r[k]<=v);return q},limit(v){n=v;return q},order(k,{ascending=true}={}){sort=[k,ascending];return q},then(ok,no){reads.push(table);return Promise.resolve({data:(tables[table]??[]).filter(r=>filters.every(f=>f(r))).sort((a,b)=>sort?String(a[sort[0]]).localeCompare(String(b[sort[0]]))*(sort[1]?1:-1):0).slice(0,n),error:null}).then(ok,no)}};return q}};
const withSound=await retrieveContext(db,uid,{query:'集中したい',purpose:'action',intentions:['focus'],search_terms:[],include_sound:true});
check(withSound.sounds.items.length===1&&withSound.sounds.items[0].url===playlist,'Selected intention returns the exact saved playlist, unchanged');
check(withSound.sounds.items[0].content_accessed===false,'Returning a link is not listening to the playlist');
check((await getSounds(db,uid,['express'])).items[0].url===null,'Description-only sounds supported');
const before=reads.filter(t=>t==='intention_music').length;
await retrieveContext(db,uid,{query:'broad',purpose:'action',search_terms:[]});
check(reads.filter(t=>t==='intention_music').length===before,'No unsolicited playlist read');
const vision=await getMediaMetadata(db,uid,{kind:'vision',ref:id(3)});
check(vision.vision_image_available&&!JSON.stringify(vision).includes('private-image'),'Vision image availability without its storage path or pixels');
const bad=tables.intention_music[0];
for(const url of ['javascript:alert(1)','https://user:pass@example.test','https://','https://example.test/ space']){bad.url=url;check((await getSounds(db,uid,['focus'])).items[0].url===null,'Reject unsafe/malformed playlist URL');}
tables.spot_plans=Array.from({length:405},(_,n)=>({spot_id:id(n+1000),habit:'Lire',starts_at:new Date(Date.UTC(2027,0,n+1)).toISOString(),duration_min:60,status:'published',format:'spot'}));
 tables.spot_plans.push({spot_id:id(999),habit:'Lire',starts_at:'2026-11-08T11:30:00.000Z',duration_min:60,status:'published',format:'spot'});
 const now=await getSpots(db,uid,{period:'now',now:'2026-11-08T12:00:00Z'});
 check(now.items[0]?.ref===id(999),'405 future plans cannot hide the ongoing spot');
 const next=await getSpots(db,uid,{period:'future',now:'2026-11-08T12:00:00Z',limit:1});
 check(next.items[0]?.ref===id(1000)&&next.truncated,'Future cap returns the next plan, not the furthest plan');
// Resources remain tied to their exact element and source, even when labels match.
tables.element_media=[
 {id:id(610),kind:'h',ref:'Lire',removed_at:null,name:'My chosen illustration',mime:'image/png',created_at:'2026-11-10T12:00:00Z',path:'private/original.png',pixels:'not shared'},
 {id:id(611),kind:'h',ref:'Lire ailleurs',removed_at:null,name:'Unrelated illustration',mime:'image/png',created_at:'2026-11-10T12:00:00Z'}];
const ownIllustration=await getMediaMetadata(db,uid,{kind:'habit',ref:'Lire'});
check(ownIllustration.items.length===1&&ownIllustration.items[0].element.ref==='Lire','Illustrations follow the exact personal element, not a similar label');
check(ownIllustration.items[0].content_shared===false&&!JSON.stringify(ownIllustration).includes('private/original.png')&&!JSON.stringify(ownIllustration).includes('not shared'),'An illustrative medium remains metadata, without its pixels or private storage location');
const creatorCalls=[];
const creatorDb={rpc:async(name,args)=>{creatorCalls.push({name,args});return {error:null,data:name==='chatgpt_member_orders'?{ok:true,orders:{}}:
 args.p_action==='member'?{ok:true,pseudo:'writer',steps:[{t:'Lire',is:['focus']}]}:
 {ok:true,items:[{id:id(612),kind:'h',ref:'Lire',mime:'image/png',path:'creator/private.png'}]}};}};
const creatorElement=await readMember(creatorDb,'checked-grant','writer',{query:'reading',purpose:'action',intentions:['focus'],search_terms:[]});
const creatorIllustration=await memberMedia(creatorDb,'checked-grant','writer',{kind:'habit',ref:'Lire'});
check(creatorElement.source.kind==='subscribed_member'&&creatorElement.source.member==='writer'&&creatorElement.source.adopted_by_user===false,'A subscribed creator is attributed inspiration, not a personal choice with the same label');
check(new URL(creatorElement.items[0].url).searchParams.get('ro')==='writer'&&creatorIllustration.source.member==='writer','The creator element and its illustration preserve the same original source');
check(creatorCalls.every(c=>c.args.p_grant==='checked-grant')&&creatorIllustration.items[0].content_shared===false&&!JSON.stringify(creatorIllustration).includes('creator/private.png'),'Creator resources keep the checked grant and never become a media download channel');
const personalPlace=await getSpots(db,uid,{period:'now',habit_ref:'Lire',now:'2026-11-08T12:00:00Z'});
check(personalPlace.items.every(s=>s.habit_ref==='Lire'&&s.source==='owner_spot_plan'&&s.presence_verified===false),'A possible place is a personal plan linked to the Habit, not proof of current presence');
check(CHATGPT_TOOLS.filter(t=>t.name.includes('context')).every(t=>t.inputSchema.properties.intentions&&t.inputSchema.properties.search_terms),'Multilingual filters advertised on both retrieval tools');
check(initializeResult().instructions.includes('WHERE I USUALLY DO IT')&&initializeResult().instructions.includes('not a verified address')&&initializeResult().instructions.includes('time-bound practice plan'),'Habitual places and timed spots carry distinct server instructions');
check(initializeResult().instructions.includes('rhythm_text')&&initializeResult().instructions.includes('never recomputed')&&initializeResult().instructions.includes('does not schedule three notifications'),'Authored timing remains separate from the persisted bot cadence');
check(initializeResult().instructions.includes('short follow-ups')&&initializeResult().instructions.includes('within each view'),'Higher GPT behavior delivered by MCP initialization');
console.log(JSON.stringify({suite:'Higher GPT',checks,passed:checks,query_languages:12,record_scripts:8}));
