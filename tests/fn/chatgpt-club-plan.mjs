// Native audience reader is simulated; no external request or real member content.
import assert from 'node:assert/strict';
import {enrichClubPlan} from '../../backend/supabase/functions/_shared/chatgpt-club-plan.ts';
const ID='11111111-1111-4111-8111-111111111111',result={personal:{items:[]},members:[]};
let checks=0,fail=null,overflow=false;const calls=[];
const check=(v,m)=>{assert(v,m);checks++;};
const db={rpc:async(name,args)=>{calls.push({name,args});assert.equal(name,'chatgpt_read_ecosystem');assert.equal(args.p_grant,'validated-grant');assert.equal(args.p_action,'spots');assert.equal(args.p_pseudo,null);
 if(args.p_period===fail)return {data:{ok:false,why:'unavailable'},error:null};
 return {data:{ok:true,items:Array.from({length:overflow?5:1},()=>({id:ID,creator:'outside_subscriptions',habit:'Draw',habit_box:{name:'Draw'},city:'Lisbon',mode:'silent',comment:'Bring a sketchbook',state:args.p_period==='now'?'am':'will',starts_at:'2099-01-01',duration_min:60,exact:{place:'Shared studio',lat:38.123456,lng:-9.123456},photo:'NEVER_PRIVATE_FILE',context:'NEVER_PRIVATE_CONTEXT'})),has_more:overflow,next_offset:3},error:null};}};
for(const flag of [undefined,false])check(await enrichClubPlan(db,'validated-grant',result,flag)===result,'No discovery unless explicitly requested');
for(const flag of ['true',null,1]){await assert.rejects(()=>enrichClubPlan(db,'validated-grant',result,flag));checks++;}
for(const city of ['', ' ', 'x'.repeat(121), 42, null]){await assert.rejects(()=>enrichClubPlan(db,'validated-grant',result,true,{city}));checks++;}
for(const intentions of ['focus',['not_an_intention'],Array(8).fill('focus')]){await assert.rejects(()=>enrichClubPlan(db,'validated-grant',result,true,{intentions}));checks++;}
check(calls.length===0,'Malformed or absent flags never produce a Club read');
const legacy=await enrichClubPlan(db,'validated-grant',result,true,{},false);
check(legacy.club_plan.available===false&&calls.length===0,'Old personal consent never gains Club discovery');
const plan=await enrichClubPlan(db,'validated-grant',result,true,{city:' Lisbon ',intentions:['express']});
check(calls.length===2&&calls.every(c=>c.args.p_limit===3&&c.args.p_filters.city==='Lisbon'&&c.args.p_filters.intentions[0]==='express'),'Explicit city and intentions restrict two bounded native reads');
check(plan.club_plan.now.items[0].member==='outside_subscriptions'&&plan.club_plan.future.items[0].period==='future','The Club includes authorized people outside paid subscriptions, with periods separate');
check(plan.club_plan.complete&&plan.personal===result.personal&&plan.members===result.members,'Discovery complements original choices without replacing them');
check(!JSON.stringify(plan).match(/NEVER_|38\.123456|-9\.123456/),'No file path, private context or coordinate leaves the native projection');
check(plan.club_plan.now.items[0].presence_verified===false,'A published plan never proves actual presence');
const noCity=await enrichClubPlan(db,'validated-grant',result,true);
check(noCity.club_plan.city===null&&!('city' in calls.at(-1).args.p_filters),'No inferred current city or location');
fail='future';const partial=await enrichClubPlan(db,'validated-grant',result,true);fail=null;
check(partial.club_plan.now.available&&partial.club_plan.future.available===false&&!partial.club_plan.complete,'A refused period is unavailable, not an empty successful search');
overflow=true;const many=await enrichClubPlan(db,'validated-grant',result,true);
check(many.club_plan.now.items.length===3&&many.club_plan.now.has_more&&!many.club_plan.complete,'Caps and incomplete discovery remain visible');
console.log(JSON.stringify({suite:'Optional Club plan',checks,passed:checks}));
