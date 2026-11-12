// Owner and authorized-member ordering, including capped reads. No remote data.
import assert from 'node:assert/strict';
import {projectGraph,projectContext,retrieveContext,retrieveElement,ContextReadError} from '../../backend/supabase/functions/_shared/chatgpt-context.ts';
import {memberGraph} from '../../backend/supabase/functions/_shared/chatgpt-ecosystem.ts';
const uid='11111111-1111-4111-8111-111111111111',id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
const s={steps:[{t:'Z first',is:['focus']},{t:'A second',is:['flow']}],objectives:[{id:id(1),text:'A objective'},{id:id(2),text:'Z objective'}],repulsions:[{id:'1',repulsion:'A repulsion',active:true},{id:'2',repulsion:'Z repulsion',active:true}],visions:[{id:id(3),text:'A vision',importance:1},{id:id(4),text:'Z vision',importance:99}],wisdom:[{id:id(5),text:'A story',importance:1},{id:id(6),text:'Z story',importance:99}],element_orders:[{kind:'objective',refs:[id(2),id(1)]},{kind:'repulsion',refs:['2','1']},{kind:'vision',refs:[id(4),id(3)]},{kind:'wisdom',refs:[id(6),id(5)]}]};
const graph=projectGraph(s);
for(const [kind,ref] of [['habit','Z first'],['objective',id(2)],['repulsion','2'],['vision',id(4)],['wisdom',id(6)]]){
 const r=projectContext(graph,{query:'next',purpose:'explicit',kinds:[kind],search_terms:[],limit:2});
 check(r.items[0].ref===ref&&r.items[0].rank===1&&r.items[0].rank_scope==='view','The saved first choice leads its own complete view: '+kind);
 const reversed=projectGraph({...s,steps:[...s.steps].reverse(),element_orders:s.element_orders.map(o=>({...o,refs:[...o.refs].reverse()}))});
 const next=projectContext(reversed,{query:'next',purpose:'explicit',kinds:[kind],search_terms:[],limit:2});
 check(next.items[0].ref!==ref&&next.items[0].rank===1,'A native reorder changes the first choice immediately: '+kind);
}
check(projectContext(graph,{query:'flow',purpose:'action',intentions:['flow'],kinds:['habit'],search_terms:[]}).items[0].ref==='A second','The member’s current intention may select a lower-ranked feasible Habit');
check(projectContext(graph,{query:'next',purpose:'action',exclude:[{kind:'habit',ref:'Z first'}],search_terms:[]}).items[0].ref==='A second','A declined first choice does not trap the person');
const member=memberGraph({steps:s.steps,visions:[{id:id(3),text:'Authorized vision'},{id:id(4),text:'Authorized priority'}],orders:{vision:['private-unavailable',id(4),id(3)]}});
check(member.items.find(i=>i.ref===id(4)).rank===1&&!JSON.stringify(member).includes('private-unavailable'),'Private member positions never leak through rank gaps');
const subset=projectGraph({...s,truncated:true});check(subset.items.filter(i=>i.rank).every(i=>i.rank_scope==='available_subset'),'Partial source ranks identify the available subset explicitly');
const tables={totehms:[{user_id:uid,steps:s.steps}],element_orders:[],objectives:[],visions:[],wisdom:[],repulsions:[]};
for(const [kind,table] of [['objective','objectives'],['vision','visions'],['wisdom','wisdom'],['repulsion','repulsions']]){
 const rows=Array.from({length:405},(_,n)=>({user_id:uid,id:kind==='repulsion'?String(n+1):id(n+1),text:table+' '+n,repulsion:table+' '+n,status:'active',active:true,importance:n+1}));
 tables[table]=rows;tables.element_orders.push({user_id:uid,kind,refs:[rows.at(-1).id,rows.at(-2).id,...rows.slice(0,-2).map(r=>r.id)]});
 // A foreign row with an identical id cannot satisfy the owner's supplemental read.
 tables[table].unshift({...rows.at(-1),user_id:'22222222-2222-4222-8222-222222222222',text:'FOREIGN PRIVATE',repulsion:'FOREIGN PRIVATE'});
}
let fail=false;const calls=[];
const client={from(table){const filters=[],selects=[],q={select(v){selects.push(v);return q},eq(k,v){filters.push([k,v]);return q},or(){filters.push(['active_objective',true]);return q},in(k,v){filters.push(['in:'+k,v]);return q},limit(n){q.n=n;return q},then(ok,no){
 const owner=filters.find(([k])=>k==='user_id');assert(owner&&owner[1]===uid);calls.push({table,filters,limit:q.n});
 const supplemental=filters.some(([k])=>k==='in:id');
 const data=(tables[table]??[]).filter(row=>filters.every(([k,v])=>k==='active_objective'?!['achieved','abandoned','converted'].includes(row.status):k==='in:id'?v.includes(row.id):row[k]===v)).slice(0,q.n);
 return Promise.resolve({data,error:fail&&supplemental?{message:'unavailable'}:null}).then(ok,no);
 }};return q;}};
for(const [kind,table] of [['objective','objectives'],['vision','visions'],['wisdom','wisdom'],['repulsion','repulsions']]){
 const r=await retrieveContext(client,uid,{query:'priorities',purpose:'explicit',kinds:[kind],search_terms:[],limit:2});
 const expected=tables.element_orders.find(o=>o.kind===kind).refs[0];
 check(r.items[0].ref===expected&&r.items[0].rank===1,'A physical row cap cannot discard the first saved '+kind);
 check(!r.coverage.source_complete&&r.items[0].rank_scope==='available_subset','Capped sources and partial ranks remain disclosed');
 const focus=tables[table].find(row=>row.user_id===uid&&row.id===tables.element_orders.find(o=>o.kind===kind).refs[1]);
 const exact=await retrieveElement(client,uid,{kind,ref:focus.id});
 check(exact.items[0].ref===focus.id&&!JSON.stringify(exact).includes('FOREIGN PRIVATE'),'Exact reads retain the original and ownership beyond the physical cap');
}
check(calls.filter(c=>c.filters.some(([k])=>k==='in:id')).every(c=>c.filters.find(([k])=>k==='in:id')[1].length<=13),'Supplemental reads are bounded by twelve priority refs and an exact focus');
fail=true;await assert.rejects(()=>retrieveContext(client,uid,{query:'priorities',purpose:'direction',search_terms:[]}),e=>e instanceof ContextReadError&&e.code==='read_failed');checks++;
console.log(JSON.stringify({suite:'TOTEHM priority fidelity',checks,passed:checks}));
