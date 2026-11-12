// Selected-element resources, real projectors/readers and injected APIs only.
import assert from 'node:assert/strict';
import {enrichPersonalResources,enrichMemberResources} from '../../backend/supabase/functions/_shared/chatgpt-resources.ts';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
const reads=[],rpc=[];let failedTable=null,revoked=false,hidden=false;
const now=Date.now();
const tables={totehms:[{user_id:A,steps:['Draw','Read','Run','Sing'].map(t=>({t,is:['express']}))}],
 objectives:[{user_id:A,id:id(1),text:'Book',status:'active'}],repulsions:[],visions:[],wisdom:[],objective_habits:[],repulsion_habits:[],objective_visions:[],repulsion_teachings:[],teaching_objectives:[],habit_spots:[],element_orders:[],
 element_media:[...Array.from({length:3},(_,n)=>({user_id:A,id:id(10+n),kind:'h',ref:'Draw',name:'illustration '+n,mime:'image/png',bytes:12,created_at:new Date(now-n).toISOString(),removed_at:null,path:'PRIVATE-PATH',signed_url:'PRIVATE-URL'})),
 {user_id:A,id:id(20),kind:'h',ref:'Draw',mime:'image/png',removed_at:'2026-01-01',name:'REMOVED'},
 {user_id:A,id:id(21),kind:'h',ref:'Read',mime:'image/png',removed_at:null,name:'UNSELECTED'},
 {user_id:B,id:id(22),kind:'h',ref:'Draw',mime:'image/png',removed_at:null,name:'OTHER-OWNER'}],
 spot_plans:[{user_id:A,spot_id:id(30),habit:'Draw',starts_at:new Date(now-60000).toISOString(),duration_min:60,status:'published',city:'Lisbon',place:'Studio',lat:38.123456},
 {user_id:A,spot_id:id(31),habit:'Draw',starts_at:new Date(now+86400000).toISOString(),duration_min:60,status:'published',city:'Lisbon',place:'Future studio'},
 {user_id:A,spot_id:id(32),habit:'Read',starts_at:new Date(now+86400000).toISOString(),duration_min:60,status:'published',place:'UNSELECTED'},
 {user_id:B,spot_id:id(33),habit:'Draw',starts_at:new Date(now+86400000).toISOString(),duration_min:60,status:'published',place:'OTHER-OWNER'},
 {user_id:A,spot_id:id(34),habit:'Draw',starts_at:new Date(now+86400000).toISOString(),duration_min:60,status:'cancelled',place:'CANCELLED'}]};
for(const row of tables.spot_plans)row.format='spot';
const db={from(table){const filters=[];let n=Infinity,sort=null;const q={
 select(){return q},eq(k,v){filters.push(row=>row[k]===v);return q},is(k,v){filters.push(row=>row[k]===v);return q},
 or(){filters.push(row=>!['achieved','abandoned','converted'].includes(row.status));return q},in(k,v){filters.push(row=>v.includes(row[k]));return q},
 lte(k,v){filters.push(row=>row[k]<=v);return q},gt(k,v){filters.push(row=>row[k]>v);return q},limit(value){n=value;return q},
 order(k,{ascending=true}={}){sort=[k,ascending];return q},
 then(ok,no){reads.push(table);const rows=structuredClone(tables[table]??[]).filter(row=>filters.every(f=>f(row)));
 if(sort)rows.sort((a,b)=>String(a[sort[0]]??'').localeCompare(String(b[sort[0]]??''))*(sort[1]?1:-1));
 return Promise.resolve(table===failedTable?{data:null,error:{message:'unavailable'}}:{data:rows.slice(0,n),error:null}).then(ok,no);}};return q;},
 async rpc(name,args){rpc.push({name,args});if(revoked)return {data:{ok:false,why:'unavailable'},error:null};
 if(name==='chatgpt_member_orders')return {data:{ok:true,orders:{}},error:null};
 if(args.p_action==='member')return {data:{ok:true,pseudo:args.p_pseudo,steps:hidden?[]:[{t:'Draw',is:['express']}]},error:null};
 if(args.p_action==='media')return {data:{ok:true,items:[{id:id(args.p_pseudo==='artist'?40:41),kind:'h',ref:'Draw',mime:'video/mp4',created_at:'2026-11-10',path:'PRIVATE-PATH'}]},error:null};
 if(args.p_action==='spots')return {data:{ok:true,items:[{id:id(args.p_pseudo==='artist'?50:51),creator:args.p_pseudo,habit:'Draw',habit_box:{name:'Draw'},city:'Lisbon',state:args.p_period==='future'?'will':'now',exact:{place:args.p_pseudo+' studio',lat:38.123456},photo:'PRIVATE-PATH'}]},error:null};
 throw Error('unexpected RPC');}};
const result={items:[{kind:'habit',ref:'Draw',url:'https://www.totehm.com/totehm#element=habit&ref=Draw'}],source:'owner_totehm'};
for(const requested of [undefined,false]){
 check(await enrichPersonalResources(db,A,result,requested)===result,'Resources are absent by default and preserve the result object');
 check(await enrichMemberResources(db,'grant','artist',result,requested)===result,'Member resources are opt-in');
}
check(reads.length===0&&rpc.length===0,'No optional read happens before an explicit resource request');
for(const value of ['true',1,null,{}]){
 await assert.rejects(()=>enrichPersonalResources(db,A,result,value));checks++;
 await assert.rejects(()=>enrichMemberResources(db,'grant','artist',result,value));checks++;
}
check(reads.length===0&&rpc.length===0,'Invalid flags do not read resources');
const rich=await enrichPersonalResources(db,A,result,true),entry=rich.resources.elements[0];
check(rich.resources.metadata_only&&rich.resources.scope==='selected_elements','Optional payload identifies its restricted scope');
check(entry.media.items.length===2&&entry.media.truncated&&!rich.resources.complete,'Media caps are disclosed rather than treated as a complete collection');
check(entry.spots.now.items.length===1&&entry.spots.future.items.length===1,'Current and future plans remain separate');
check(entry.spots.now.items[0].presence_verified===false,'A spot is not proof of the person’s presence');
check(!JSON.stringify(rich).match(/OTHER-OWNER|PRIVATE-PATH|PRIVATE-URL|UNSELECTED|REMOVED|CANCELLED|38\.123456/),'Only selected, current, owner-filtered metadata leaves the readers');
check(rich.items===result.items&&rich.source===result.source,'Resources do not replace saved choices or their ordering');
check(entry.element.ref==='Draw'&&entry.element.url===result.items[0].url,'Resources keep an exact original-element locator');
const many=await enrichPersonalResources(db,A,{items:['Draw','Read','Run','Sing','Draw'].map(ref=>({kind:'habit',ref}))},true);
check(many.resources.elements.length===3&&many.resources.omitted_elements===1&&!many.resources.complete,'Only three distinct selected personal elements are enriched');
const noItem=await enrichPersonalResources(db,A,{items:[{kind:'habit',ref:''}]},true);
check(noItem.resources.elements.length===0,'Malformed references never become resource queries');
failedTable='element_media';const failed=await enrichPersonalResources(db,A,result,true);failedTable=null;
check(failed.resources.elements[0].media.available===false&&!failed.resources.complete,'An unavailable media reader is not an empty collection');
check(failed.resources.elements[0].spots.now.available,'A failing personal media component does not erase an independent plan');
const before=rpc.length,legacy=await enrichMemberResources(db,'grant','artist',result,true,false);
check(legacy.resources.available===false&&legacy.resources.why==='ecosystem_consent_required'&&rpc.length===before,'Legacy consent cannot gain subscribed resources');
const memberResult={...result,source:{kind:'subscribed_member',member:'artist',adopted_by_user:false}};
let start=rpc.length;const artist=await enrichMemberResources(db,'validated-grant','artist',memberResult,true);
check(artist.resources.elements[0].element.source.member==='artist'&&!artist.resources.elements[0].element.source.adopted_by_user,'Creator attribution stays separate from personal adoption');
check(rpc.slice(start).every(q=>q.args.p_grant==='validated-grant'&&q.args.p_pseudo==='artist'),'Every member resource call carries the validated grant and exact creator');
check(rpc.slice(start).filter(q=>q.args.p_action==='spots').every(q=>q.args.p_filters.habit==='Draw'&&q.args.p_limit===2&&['now','future'].includes(q.args.p_period)),'Member plans are filtered to the exact Habit, creator, period and cap');
check(!JSON.stringify(artist).includes('PRIVATE-PATH')&&!JSON.stringify(artist).includes('38.123456'),'Member resource projection removes files and coordinates');
const other=await enrichMemberResources(db,'validated-grant','second',{...result,source:{kind:'subscribed_member',member:'second'}},true);
check(artist.resources.elements[0].media.items[0].ref!==other.resources.elements[0].media.items[0].ref&&other.resources.elements[0].spots.now.items[0].member==='second','Identical Habit names from two creators never merge their resources');
revoked=true;start=rpc.length;const denied=await enrichMemberResources(db,'validated-grant','artist',memberResult,true);revoked=false;
check(denied.resources.elements[0].available===false&&!denied.resources.complete,'A revoked subscription yields unavailable, not a misleading empty resource set');
check(!rpc.slice(start).some(q=>q.args.p_action==='spots'),'After a refused member read, no later member spot discovery is attempted');
hidden=true;start=rpc.length;const masked=await enrichMemberResources(db,'validated-grant','artist',memberResult,true);hidden=false;
check(masked.resources.elements[0].available===false&&!masked.resources.complete,'An element made private after selection becomes unavailable');
check(!rpc.slice(start).some(q=>['media','spots'].includes(q.args.p_action)),'A masked creator element cannot expose residual media or spots');
const savedSteps=tables.totehms[0].steps;tables.totehms[0].steps=[];
const ownerStart=reads.length,removed=await enrichPersonalResources(db,A,result,true);tables.totehms[0].steps=savedSteps;
check(removed.resources.elements[0].available===false&&!removed.resources.complete,'A removed personal element is not presented as an empty attachment collection');
check(!reads.slice(ownerStart).includes('element_media')&&!reads.slice(ownerStart).includes('spot_plans'),'Removed personal choices do not trigger residual attachment or venue reads');
// More items than the per-member budget are disclosed; invalid duplicates do not spend it.
const limit=await enrichMemberResources(db,'validated-grant','artist',{...memberResult,items:[{kind:'habit',ref:'Draw'},{kind:'habit',ref:'Read'},{kind:'habit',ref:'Run'}]},true);
check(limit.resources.elements.length===2&&limit.resources.omitted_elements===1,'The subscribed-member enrichment budget is two elements');
console.log(JSON.stringify({suite:'Selected ecosystem resources',checks,passed:checks}));
