import assert from 'node:assert/strict';
import {memberGraph,projectClubSpots,retrieveEcosystem,memberMedia,clubSpots} from '../../backend/supabase/functions/_shared/chatgpt-ecosystem.ts';
const O='33333333-3333-4333-8333-333333333333',V='44444444-4444-4444-8444-444444444444',W='55555555-5555-4555-8555-555555555555';
const graph=memberGraph({ok:true,steps:[{t:'Draw',is:['express'],o:'private-objective'}],
 trips:[{id:O,text:'Book',status:'active',visions:[V],is:['focus']}],objs:{Draw:[O,'private-objective']},
 reps:[{id:'9007199254740993',text:'Delay',hs:['Draw'],ws:[W]}],
 visions:[{id:V,text:'Exhibit'}],wisdom:[{id:W,text:'Start small',os:[O]}]});
const memberTiming=memberGraph({steps:[{t:'Draw',f:'weekly',rhythm_text:'three mornings per week'}],habit_spots:[{habit_text:'Draw',place:'NOT AUTHORIZED'}]});
assert.equal(memberTiming.items[0].rhythm_text,'three mornings per week');assert.equal(memberTiming.items[0].freq,'weekly');
assert.equal(memberTiming.items[0].usual_place,undefined);assert(!JSON.stringify(memberTiming).includes('NOT AUTHORIZED'));
assert.equal(graph.items.length,5);
assert.equal(new Set(graph.items.map(x=>x.kind)).size,5);
assert.equal(graph.edges.length,5);
assert(!JSON.stringify(graph).includes('private-objective'));
assert.deepEqual(graph.items.find(x=>x.kind==='objective').intentions,['express']);
assert.equal(graph.items.find(x=>x.kind==='repulsion').ref,'9007199254740993');
const denied=memberGraph({steps:[],trips:[],reps:[{id:9007199254740993,text:'unsafe id'}]});
assert.equal(denied.items.length,0);
const spots=projectClubSpots({items:[{id:O,creator:'artist',habit:'Draw',city:'Lisbon',state:'will',starts_at:'2030-01-01',duration_min:60,
 exact:{place:'A shared studio',lat:38.7,lng:-9.1},context:{private:'hidden'},photo:'private/path',habit_box:{name:'Draw',objectives:[{text:'Book'}],repulsions:[]}}],
 has_more:true,next_offset:1,as_of:'2030-01-01'});
assert.equal(spots.items[0].member,'artist');
assert.equal(spots.items[0].place,'A shared studio');
assert.equal(spots.items[0].presence_verified,false);
assert(!JSON.stringify(spots).includes('38.7')&&!JSON.stringify(spots).includes('private/path')&&!JSON.stringify(spots).includes('hidden'));
assert.equal(projectClubSpots({items:[{id:O,place:'private exact place'}]}).items[0].place,null);
const queries=[];
const db={rpc:async(name,args)=>{queries.push({name,args});return {data:{ok:true,pseudo:'artist',steps:[{t:'Draw'}],items:[{id:V,kind:'h',ref:'Draw',path:'secret',mime:'image/png'}]},error:null};}};
const media=await memberMedia(db,'validated-grant','artist',{kind:'habit',ref:'Draw'});
assert.equal(media.items.length,1);
assert(!JSON.stringify(media).includes('secret'));
assert.equal(media.items[0].content_shared,false);
assert(queries.every(x=>x.args.p_grant==='validated-grant'));
console.log('Ecosystem projection, attribution, five kinds and media/spot minimization passed');
// An empty creator match must not consume the limited rich-resource budget.
const scoped={from(){const q={select(){return q},eq(){return q},or(){return q},order(){return q},limit(){return q},in(){return q},then(ok,no){return Promise.resolve({data:[],error:null}).then(ok,no)}};return q;},
 async rpc(name,args){
  assert.equal(args.p_grant,'validated-grant');
  if(name==='chatgpt_member_orders')return {data:{ok:true,orders:{}},error:null};
  if(args.p_action==='members')return {data:{ok:true,items:['first','second','third'].map(pseudo=>({pseudo})),has_more:false},error:null};
  if(args.p_action==='member')return {data:{ok:true,pseudo:args.p_pseudo,steps:[{t:'A selected practice',is:[args.p_pseudo==='third'?'focus':'fight']}]},error:null};
  throw Error('unexpected native read');}};
const selective=await retrieveEcosystem(scoped,'validated-grant','11111111-1111-4111-8111-111111111111',{query:'time to concentrate',purpose:'action',intentions:['focus'],search_terms:[]});
assert.deepEqual(selective.members.map(m=>m.source.member),['third']);
assert.equal(selective.subscriptions_searched,3);
const broad=await retrieveEcosystem(scoped,'validated-grant','11111111-1111-4111-8111-111111111111',{query:'what could I try',purpose:'action',search_terms:[]});
assert.equal(broad.members.length,3);
console.log('Intentional broad inspiration keeps non-empty creator choices; empty matches do not consume resource budgets');

const caseDb={rpc:async()=>({data:{ok:true,has_more:true,next_offset:2,items:[{id:O,habit_box:{name:'Draw'},exact:{place:'Exact studio'},state:'will'},{id:V,habit_box:{name:'draw'},exact:{place:'Wrong studio'},state:'will'}]},error:null})};
const exactSpots=await clubSpots(caseDb,'validated-grant',{member:'artist',habit_ref:'Draw',period:'future'});
assert.equal(exactSpots.items.length,1);assert.equal(exactSpots.items[0].place,'Exact studio');
assert(exactSpots.has_more&&exactSpots.next_offset===2);
console.log('Habit spot association preserves exact case before label projection, with partial pagination disclosed');
