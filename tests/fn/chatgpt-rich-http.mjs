// HTTP orchestration with synthetic service-client fixtures. No network or member data.
// Real subscription/audience/subject-restoration ACLs remain covered by the SQL suites;
// this mock verifies that the HTTP layer invokes those readers with the correct scope.
import assert from 'node:assert/strict';
import {createConnectorHandler} from '../../backend/supabase/functions/_shared/chatgpt-server.ts';
import {hashOpaque} from '../../backend/supabase/functions/_shared/chatgpt-protocol.ts';
const ORIGIN='https://www.totehm.com',RESOURCE=ORIGIN+'/mcp';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',G='33333333-3333-4333-8333-333333333333';
const CLIENT='44444444-4444-4444-8444-444444444444',MEDIA='55555555-5555-4555-8555-555555555555',SPOT='66666666-6666-4666-8666-666666666666';
const ACCESS='th_access_synthetic_resource_orchestration_token',TOKEN_HASH=await hashOpaque(ACCESS);
const OBJECTIVE='77777777-7777-4777-8777-777777777777',VISION='88888888-8888-4888-8888-888888888888';
const HABIT='Play scales',MEMBERS=['artist_one','artist_two','artist_three'];
let ecosystem=true,revoked=false,ownerMediaUnavailable=false,cancelOnMedia=null,checks=0;
const subscribed=new Set(MEMBERS),reads=[],native=[];
const check=(value,message)=>{assert(value,message);checks++;};
const data={
 totehms:[{user_id:A,steps:[{t:HABIT,is:['express'],f:'daily'},{t:'Write a verse',is:['express'],f:'weekly'}]},{user_id:B,steps:[{t:'FORBIDDEN_OTHER_OWNER'}]}],
 objectives:[],repulsions:[],visions:[],wisdom:[],objective_habits:[],repulsion_habits:[],objective_visions:[],repulsion_teachings:[],teaching_objectives:[],habit_spots:[],element_orders:[],
 element_media:[{user_id:A,id:MEDIA,kind:'h',ref:HABIT,name:'Scale drill reference',mime:'image/png',bytes:123,created_at:'2026-11-01T12:00:00Z',removed_at:null,path:'FORBIDDEN_STORAGE_PATH'},
  {user_id:B,id:SPOT,kind:'h',ref:HABIT,name:'FORBIDDEN_OTHER_MEDIA',mime:'image/png',created_at:'2026-11-01',removed_at:null}],
 spot_plans:[{user_id:A,spot_id:SPOT,habit:HABIT,format:'spot',status:'published',starts_at:'2099-01-01T12:00:00Z',duration_min:60,place:'My rehearsal room',city:'Lisbon',mode:'silent',comment:'Bring the small keyboard',intentions:['express'],audience:'private',lat:38.7654321,lng:-9.1234567,photo:'FORBIDDEN_PHOTO_PATH'},
  {user_id:A,spot_id:MEDIA,habit:HABIT,format:'space',status:'published',starts_at:'2099-01-01T12:00:00Z',duration_min:60,place:'FORBIDDEN_LEGACY_SPACE'},
  {user_id:B,spot_id:CLIENT,habit:HABIT,format:'spot',status:'published',starts_at:'2099-01-01T12:00:00Z',duration_min:60,place:'FORBIDDEN_OTHER_SPOT'}]
};
class Query{
 constructor(table){this.table=table;this.filters=[];this.maximum=Infinity;}
 select(columns){this.columns=columns;return this;}
 eq(key,value){this.filters.push([key,v=>v===value]);return this;}
 is(key,value){this.filters.push([key,v=>v===value]);return this;}
 in(key,values){this.filters.push([key,v=>values.includes(v)]);return this;}
 gt(key,value){this.filters.push([key,v=>v>value]);return this;}
 gte(key,value){this.filters.push([key,v=>v>=value]);return this;}
 lte(key,value){this.filters.push([key,v=>v<=value]);return this;}
 or(value){assert.equal(value,'status.is.null,status.not.in.(achieved,abandoned,converted)');this.filters.push(['status',v=>!['achieved','abandoned','converted'].includes(v)]);return this;}
 order(key,{ascending=true}={}){this.sort=[key,ascending];return this;}
 limit(value){this.maximum=value;return this;}
 maybeSingle(){this.single=true;return this;}
 then(ok,no){return this.run().then(ok,no);}
 async run(){
  let rows;
  if(this.table==='chatgpt_clients')rows=[{client_id:CLIENT}];
  else if(this.table==='chatgpt_tokens')rows=[{token_hash:TOKEN_HASH,kind:'access',expires_at:'2099-01-01T00:00:00Z',grant:{id:G,user_id:A,client_id:CLIENT,scope:['totehm:read'],resource:RESOURCE,revoked_at:revoked?'2026-11-10T00:00:00Z':null}}];
  else if(this.table==='chatgpt_ecosystem_consents')rows=ecosystem?[{grant_id:G,version:1}]:[];
  else{reads.push({table:this.table,columns:this.columns});if(this.table==='element_media'&&ownerMediaUnavailable)return {data:null,error:{message:'fixture_unavailable'}};rows=data[this.table]??[];}
  rows=structuredClone(rows).filter(row=>this.filters.every(([key,test])=>test(key.split('.').reduce((v,k)=>v?.[k],row))));
  if(this.sort){const [key,asc]=this.sort;rows.sort((a,b)=>String(a[key]??'').localeCompare(String(b[key]??''))*(asc?1:-1));}
  rows=rows.slice(0,this.maximum);return {data:this.single?(rows[0]??null):rows,error:null};
 }
}
const db={from:table=>new Query(table),rpc:async(name,args)=>{
 native.push({name,args:structuredClone(args)});
 if(name==='chatgpt_member_orders')return {data:{ok:true,orders:{}},error:null};
 assert.equal(name,'chatgpt_read_ecosystem','Only the native ecosystem permission reader is used');
 assert.equal(args.p_grant,G,'Native reads remain bound to the validated opaque grant');
 if(args.p_action==='members')return {data:{ok:true,items:MEMBERS.filter(w=>subscribed.has(w)).map(pseudo=>({pseudo})),has_more:false,next_offset:3},error:null};
 if(args.p_action==='spots'&&args.p_pseudo===null)return {data:{ok:true,items:[{id:SPOT,creator:'club_member_not_subscribed',habit:HABIT,city:args.p_filters.city??'Lisbon',state:args.p_period==='future'?'will':'am',duration_min:60,exact:{place:'Club rehearsal room',lat:38.7654321},habit_box:{name:HABIT}}],has_more:false,next_offset:1},error:null};
 const who=args.p_pseudo;
 assert(MEMBERS.includes(who),'Each foreign resource request names a subscribed creator');
 if(!subscribed.has(who))return {data:{ok:false,why:'unavailable'},error:null};
 if(args.p_action==='member')return {data:{ok:true,pseudo:who,steps:[HABIT,HABIT+' slowly',HABIT+' standing'].map(t=>({t,is:['express'],f:'daily'})),trips:[{id:OBJECTIVE,text:'Learn the piece',status:'active',visions:[VISION]}],reps:[],visions:[{id:VISION,text:'Play at a concert'}],wisdom:[],objs:{[HABIT]:[OBJECTIVE]}},error:null};
 if(args.p_action==='media'){
  if(cancelOnMedia===who){subscribed.delete(who);return {data:{ok:false,why:'unavailable'},error:null};}
  return {data:{ok:true,items:[{id:MEDIA,kind:'h',ref:HABIT,mime:'image/png',created_at:'2026-11-01',name:'FORBIDDEN_FOREIGN_FILENAME',path:'FORBIDDEN_MEMBER_PATH',lat:38.7654321}]},error:null};
 }
 assert.equal(args.p_action,'spots');
 assert(who,'Bundled member venues must never become global Club discovery');
 assert.equal(args.p_filters.habit,HABIT,'A bundled venue belongs to the exact selected Habit');
 return {data:{ok:true,items:[{id:SPOT,creator:who,habit:HABIT,city:'Lisbon',state:args.p_period==='future'?'will':'am',starts_at:'2099-01-01',duration_min:60,mode:'silent',comment:'A place to rehearse',audience:'subscribers',exact:{place:who+' rehearsal room',lat:38.7654321,lng:-9.1234567},photo:'FORBIDDEN_MEMBER_PHOTO',context:{private:'FORBIDDEN_MEMBER_CONTEXT'},habit_box:{name:HABIT,objectives:[{text:'Learn the piece'}],repulsions:[]}}],has_more:false,next_offset:1,as_of:'2026-11-10'},error:null};
}};
const handler=createConnectorHandler(db,{publicOrigin:ORIGIN,enabled:true,allowedRedirectUris:['https://chatgpt.com/connector_platform_oauth_redirect']});
async function rpc(method,params){
 const response=await handler(new Request(RESOURCE,{method:'POST',headers:{authorization:'Bearer '+ACCESS,accept:'application/json, text/event-stream','content-type':'application/json','mcp-protocol-version':'2025-06-18'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}));
 return {status:response.status,data:await response.json()};
}
const tool=(name,args)=>rpc('tools/call',{name,arguments:args});
const args={query:'help me practise',purpose:'action',intentions:['express'],search_terms:[],kinds:['habit'],limit:6};
const resourceReads=()=>reads.filter(r=>['element_media','spot_plans'].includes(r.table)).length+native.filter(r=>['media','spots'].includes(r.args?.p_action)).length;

let response=await rpc('tools/list',{}),tools=response.data.result.tools;
check(tools.length===10,'The ecosystem still has ten read-only tools');
for(const name of ['get_context','read_element','get_ecosystem_context','read_member_element'])check(tools.find(t=>t.name===name).inputSchema.properties.include_resources.type==='boolean',name+' advertises optional resource depth on its existing tool');
let before=resourceReads();
for(const flag of [undefined,false]){
 const callArgs={...args,...(flag===undefined?{}:{include_resources:flag})};
 response=await tool('get_ecosystem_context',callArgs);
 check(response.status===200&&!response.data.result.isError&&!response.data.result.structuredContent.personal.resources,'Absent or false resources flag adds no resource payload');
}
check(resourceReads()===before,'Absent and false flags make no media or spots calls');
for(const flag of ['true',1,null,{}]){
 const ownerBefore=reads.length,nativeBefore=native.length;
 response=await tool('get_ecosystem_context',{...args,include_resources:flag});
 check(response.data.error?.code===-32602,'Invalid resource flags are argument errors');
 check(reads.length===ownerBefore&&native.length===nativeBefore,'An invalid flag is rejected before any personal or member retrieval');
}
response=await tool('get_ecosystem_context',{...args,include_resources:true});
const context=response.data.result.structuredContent;
check(context.members.length===3,'The fixture searches at least three active subscribed creators');
check(context.personal.resources.metadata_only&&context.personal.resources.scope==='selected_elements','Personal resources are a selected metadata-only bundle');
check(context.members.filter(m=>m.resources).length===2&&!context.members[2].resources,'Only two selected creators are enriched in one ecosystem call');
check(context.resource_coverage.attempted_members===2&&context.resource_coverage.selected_members===3&&!context.resource_coverage.complete&&!context.resource_coverage.all_selected_members_requested,'Resource coverage discloses the unenriched creator instead of claiming completeness');
for(const [index,member] of context.members.entries()){
 if(index>=2)continue;
 check(member.resources.elements.length<=2&&member.resources.omitted_elements===1&&!member.resources.complete,'Each creator bundle has at most two elements and discloses omitted elements');
 const element=member.resources.elements.find(e=>e.element.ref===HABIT).element;
 check(element.source.member===member.source.member&&new URL(element.url).searchParams.get('ro')===member.source.member,'An identical Habit text remains attributed to its own creator and original URL');
 check(member.resources.elements[0].media.items[0].source.member===member.source.member,'Illustrative media retains the creator source');
}
const own=context.personal.resources.elements.find(e=>e.element.ref===HABIT);
check(own.element.source==='owner_totehm'&&!new URL(own.element.url).searchParams.has('ro'),'The identical personal Habit remains an adopted personal choice');
check(own.media.items[0].name==='Scale drill reference'&&own.spots.future.items[0].place==='My rehearsal room','The personal selected Habit carries its illustration and saved upcoming spot');
check(!JSON.stringify(context).includes('FORBIDDEN_')&&!JSON.stringify(context).includes('38.7654321')&&!JSON.stringify(context).includes('-9.1234567'),'No raw storage paths, coordinates, legacy spaces, hidden payloads or other-owner content crosses HTTP');
check(native.filter(r=>r.args?.p_action==='spots').every(r=>r.args.p_pseudo&&r.args.p_filters.habit===HABIT),'Bundled spots always name their creator and exact Habit, with no global Club search');

response=await tool('read_member_element',{member:MEMBERS[2],kind:'habit',ref:HABIT,include_resources:true,limit:1});
const exact=response.data.result.structuredContent;
check(exact.resources.elements.length===1&&exact.resources.elements[0].element.source.member===MEMBERS[2],'An exact member read can deepen the third creator without confusing attribution');
check(exact.resources.elements[0].spots.future.items[0].member===MEMBERS[2],'Exact depth retrieves the selected creator venue');

const extraStart=resourceReads();
response=await tool('get_ecosystem_context',{...args,include_boutique:true,include_club_spots:false});
check(response.data.result.structuredContent.personal.boutique.available&&!response.data.result.structuredContent.club_plan&&resourceReads()===extraStart,'A free boutique handoff does not read media, venues or global Club spots');
for(const field of ['include_boutique','include_club_spots'])for(const flag of ['true',null,1]){
 const n=native.length,own=reads.length;
 response=await tool('get_ecosystem_context',{...args,[field]:flag});
 check(response.data.error?.code===-32602&&native.length===n&&reads.length===own,'Invalid planning flag is rejected before source retrieval');
}
const globalStart=native.length;
response=await tool('get_ecosystem_context',{...args,include_resources:true,include_boutique:true,include_club_spots:true,club_city:'Lisbon'});
const prepared=response.data.result.structuredContent;
check(prepared.personal.resources&&prepared.personal.boutique&&prepared.members[0].resources&&prepared.club_plan,'One explicit preparation combines personal choices, creator resources, Club opportunities and boutique locators');
check(prepared.club_plan.now.items[0].member==='club_member_not_subscribed'&&prepared.club_plan.future.items[0].period==='future','Club opportunities are not restricted to creator subscriptions');
check(native.slice(globalStart).filter(q=>q.args.p_action==='spots'&&q.args.p_pseudo===null).every(q=>q.args.p_limit===3&&q.args.p_filters.city==='Lisbon'),'Explicit global discovery remains bounded and uses the supplied city');
check(prepared.members.every(m=>!m.boutique)&&prepared.personal.boutique.order_created===false&&prepared.personal.boutique.photos_selected===false,'Reading creator inspiration never adopts it into a garment or creates an order');
check(prepared.personal.boutique.candidates.every(c=>new URL(c.url).search===''),'Habit text is not exported into boutique query strings');
const noCityStart=native.length;
response=await tool('get_ecosystem_context',{...args,include_club_spots:true});
check(response.data.result.structuredContent.club_plan.city===null&&native.slice(noCityStart).filter(q=>q.args.p_action==='spots').every(q=>!('city' in q.args.p_filters)),'Current location is not guessed when no city is supplied');
response=await tool('get_ecosystem_context',{...args,include_club_spots:true,club_city:''});
check(response.data.error?.code===-32602,'A blank supplied city is not a valid location filter');
data.objectives.push({user_id:A,id:OBJECTIVE,text:'My recorded creative direction',status:'active'});
response=await tool('read_element',{kind:'objective',ref:OBJECTIVE,include_boutique:true});
check(new URL(response.data.result.structuredContent.boutique.candidates[0].url).searchParams.get('wear')==='objective:'+OBJECTIVE,'An exact personal non-text reference opens the existing native boutique selection');
data.objectives.pop();
response=await tool('read_member_element',{member:MEMBERS[0],kind:'habit',ref:HABIT,include_boutique:true});
check(response.data.error?.code===-32602,'A foreign creator element cannot request a personal boutique handoff');

ownerMediaUnavailable=true;
response=await tool('get_context',{...args,include_resources:true});
const partial=response.data.result.structuredContent.resources;
check(!partial.complete&&partial.elements.some(e=>e.media.available===false&&e.media.why==='temporarily_unavailable'),'A media outage is disclosed as unavailable and makes the bundle incomplete');
check(!('items' in partial.elements.find(e=>e.media.available===false).media),'A failed read is not represented as a successful empty resource collection');
ownerMediaUnavailable=false;

cancelOnMedia=MEMBERS[0];
const cancelStart=native.length;
response=await tool('read_member_element',{member:MEMBERS[0],kind:'habit',ref:HABIT,include_resources:true,limit:1});
const canceled=response.data.result.structuredContent.resources;
check(!canceled.complete&&canceled.elements[0].available===false,'Cancellation during the resource read produces an unavailable element');
check(!native.slice(cancelStart).some(r=>r.args?.p_action==='spots'),'A canceled creator media check prevents subsequent bundled spot requests');
cancelOnMedia=null;subscribed.add(MEMBERS[0]);

ecosystem=false;
response=await rpc('tools/list',{});
check(response.data.result.tools.length===5&&!response.data.result.tools.some(t=>t.name==='get_ecosystem_context'),'A legacy grant retains exactly its five personal tools');
for(const name of ['get_ecosystem_context','read_member_element']){
 before=resourceReads();const nativeBefore=native.length;
 response=await tool(name,name==='read_member_element'?{member:MEMBERS[0],kind:'habit',ref:HABIT,include_resources:true}:{...args,include_resources:true});
 check(response.data.result.isError&&resourceReads()===before&&native.length===nativeBefore,'A legacy grant cannot invoke ecosystem enrichment through an unlisted extension');
}
const legacyBefore=native.length;
response=await tool('get_context',{...args,include_resources:true});
check(response.data.result.structuredContent.resources.metadata_only&&native.length===legacyBefore,'Legacy personal access can still request personal illustrations and spots without member reads');

ecosystem=true;revoked=true;
before=resourceReads();const ownerBefore=reads.length,nativeBefore=native.length;
response=await tool('get_ecosystem_context',{...args,include_resources:true,include_boutique:true});
check(response.status===401&&resourceReads()===before&&reads.length===ownerBefore&&native.length===nativeBefore,'A revoked opaque grant is rejected before any personal or foreign resource read');
console.log(JSON.stringify({suite:'Higher rich-resource HTTP orchestration',checks,passed:checks,scope:'Synthetic native reader fixtures; production ACL behavior is covered separately by SQL tests'}));
