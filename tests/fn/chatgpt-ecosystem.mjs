import assert from 'node:assert/strict';
import {memberGraph,projectClubSpots,retrieveEcosystem,memberMedia} from '../../backend/supabase/functions/_shared/chatgpt-ecosystem.ts';
const O='33333333-3333-4333-8333-333333333333',V='44444444-4444-4444-8444-444444444444',W='55555555-5555-4555-8555-555555555555';
const graph=memberGraph({ok:true,steps:[{t:'Draw',is:['express'],o:'private-objective'}],
 trips:[{id:O,text:'Book',status:'active',visions:[V],is:['focus']}],objs:{Draw:[O,'private-objective']},
 reps:[{id:'9007199254740993',text:'Delay',hs:['Draw'],ws:[W]}],
 visions:[{id:V,text:'Exhibit'}],wisdom:[{id:W,text:'Start small',os:[O]}]});
assert.equal(graph.items.length,5);
assert.equal(new Set(graph.items.map(x=>x.kind)).size,5);
assert.equal(graph.edges.length,5);
assert(!JSON.stringify(graph).includes('private-objective'));
assert.deepEqual(graph.items.find(x=>x.kind==='objective').intentions,['focus']);
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
