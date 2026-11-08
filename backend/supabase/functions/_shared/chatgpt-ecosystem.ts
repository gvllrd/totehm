// Ecosystem extension: all reads reuse the application's audience readers.
// The grant comes from validated OAuth, never from tool arguments.
import {
  ContextReadError, projectGraph, projectContext, retrieveContext, validElementRef,
  type GraphSnapshot, type ContextOptions, type ElementRef,
} from './chatgpt-context.ts';

type Row = Record<string, any>;
type Client = any;
const obj = (v: unknown): Row => v && typeof v === 'object' && !Array.isArray(v) ? v as Row : {};
const list = (v: unknown): Row[] => Array.isArray(v) ? v.map(obj) : [];
const txt = (v: unknown, n = 500): string => typeof v === 'string' ? v.replace(/\s+/g,' ').trim().slice(0,n) : '';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ref = (v: unknown) => typeof v === 'string' ? v : typeof v === 'number' && Number.isSafeInteger(v) ? String(v) : '';

export async function ecosystemRead(db: Client, grant: string, action: string, args: Row = {}) {
  const {data,error} = await db.rpc('chatgpt_read_ecosystem',{p_grant:grant,p_action:action,...args});
  if(error) throw new ContextReadError('read_failed');
  if(!data?.ok) throw new ContextReadError('read_failed');
  return data;
}

/** Convert the *authorized* totehm_read format; never accept a raw foreign table.
 * Drop edges to private elements, unsafe bigint IDs and hidden refs in step.o.
 * Five kinds: HABITS, OBJECTIVES, REPULSIONS, VISIONS, MY STORY. */
export function memberGraph(value: unknown) {
  const r=obj(value), objectives=list(r.trips), reps=list(r.reps), wisdom=list(r.wisdom);
  const snapshot: GraphSnapshot = {
    steps:list(r.steps),
    objectives,
    repulsions:reps.map(x=>({...x,id:ref(x.id),repulsion:x.text,active:true})),
    visions:list(r.visions).map(x=>({...x,importance:x.rang})), wisdom:wisdom.map(x=>({...x,importance:x.rang})),
    element_orders:Object.entries(obj(r.orders)).map(([kind,refs])=>({kind,refs})),
    objective_habits:Object.entries(obj(r.objs)).flatMap(([habit_text,ids])=>
      (Array.isArray(ids)?ids:[]).map(objective_id=>({habit_text,objective_id:ref(objective_id)}))),
    repulsion_habits:reps.flatMap(x=>(Array.isArray(x.hs)?x.hs:[]).map((habit_text:string)=>({repulsion_id:ref(x.id),habit_text}))),
    objective_visions:objectives.flatMap(x=>(Array.isArray(x.visions)?x.visions:[]).map((vision_id:string)=>({objective_id:ref(x.id),vision_id}))),
    repulsion_teachings:reps.flatMap(x=>(Array.isArray(x.ws)?x.ws:[]).map((wisdom_id:string)=>({repulsion_id:ref(x.id),wisdom_id}))),
    teaching_objectives:wisdom.flatMap(x=>(Array.isArray(x.os)?x.os:[]).map((objective_id:string)=>({wisdom_id:ref(x.id),objective_id}))),
  };
  return projectGraph(snapshot);
}

const memberSource=(pseudo:string)=>({kind:'subscribed_member' as const,member:pseudo,url:'https://www.totehm.com/@'+encodeURIComponent(pseudo),adopted_by_user:false});
export async function listSubscribedMembers(db:Client,grant:string,offset=0,limit=20){
  const r=await ecosystemRead(db,grant,'members',{p_offset:offset,p_limit:limit});
  return {items:list(r.items).map(x=>({member:txt(x.pseudo,80),source:memberSource(txt(x.pseudo,80))})),
    has_more:r.has_more===true,next_offset:Number(r.next_offset)||0};
}
export async function readMember(db:Client,grant:string,member:string,options:ContextOptions){
  const r=await ecosystemRead(db,grant,'member',{p_pseudo:member});
  const orders=await db.rpc('chatgpt_member_orders',{p_grant:grant,p_pseudo:member});
  if(orders.error||!orders.data?.ok)throw new ContextReadError('read_failed');
  const result=projectContext(memberGraph({...r,orders:orders.data.orders}),options);
  return {...result,source:memberSource(txt(r.pseudo,80)||member)};
}
export async function retrieveEcosystem(db:Client,grant:string,uid:string,options:ContextOptions,member?:string){
  const personal=await retrieveContext(db,uid,options);
  const subscriptions=member?{items:[{member}],has_more:false}:await listSubscribedMembers(db,grant,0,8);
  const candidates=await Promise.all(subscriptions.items.map(async({member:who})=>{
    try{return await readMember(db,grant,who,options);}catch{return null;}
  }));
  const selected=candidates.filter(x=>x&&(member||x.selection==='lexical'||x.selection==='intentions'));
  return {personal,members:selected,generated_at:new Date().toISOString(),
    subscriptions_truncated:subscriptions.has_more,
    unavailable_members:candidates.filter(x=>!x).length,
    attribution:'Only personal items belong to the user. Member items are inspiration, not adopted choices.',
    memory:'Live context retrieved on demand; no automatic write to ChatGPT saved memory.'};
}

export async function memberMedia(db:Client,grant:string,member:string,focus:ElementRef,limit=6){
  if(!validElementRef(focus))throw new ContextReadError('invalid_request');
  const element=await readMember(db,grant,member,{query:'',purpose:'explicit',focus,limit:1});
  if(!element.items.length)return {items:[],truncated:false,source:memberSource(member)};
  const r=await ecosystemRead(db,grant,'media',{p_pseudo:member});
  const letters={habit:'h',objective:'o',repulsion:'r',vision:'v',wisdom:'w'};
  const all=list(r.items).filter(x=>x.kind===letters[focus.kind]&&x.ref===focus.ref&&UUID.test(ref(x.id)));
  return {source:memberSource(member),items:all.slice(0,limit).map(x=>({
    ref:ref(x.id),element:focus,mime:txt(x.mime,100),created_at:txt(x.created_at,80),content_shared:false,
  })),truncated:all.length>limit};
}

/** Project already authorized Club views. No coordinates, snapshots, private
 * storage paths or file contents cross MCP, even if the native RPC contains them. */
export function projectClubSpots(value:unknown){
  const r=obj(value);
  return {items:list(r.items).filter(x=>UUID.test(ref(x.spot_id||x.id))).map(x=>{
    const exact=obj(x.exact), box=obj(x.habit_box);
    return {ref:ref(x.spot_id||x.id),member:txt(x.creator||x.pseudo||x.owner_pseudo,80),
      habit:txt(box.name||x.habit),city:txt(x.city,120),place:txt(exact.place,160)||null,
      starts_at:txt(x.starts_at,80),duration_min:Number.isFinite(x.duration_min)?x.duration_min:null,
      period:x.state==='will'?'future':x.state==='was'?'past':'now',
      intentions:Array.isArray(x.intentions)?x.intentions.filter((i:unknown)=>typeof i==='string').slice(0,7):[],
      objectives:list(box.objectives).map(o=>txt(o.text)),repulsions:list(box.repulsions).map(o=>txt(o.text)),
      presence_verified:false,source:'figher_club',
    };
  }),has_more:r.has_more===true,next_offset:Number(r.next_offset)||0,as_of:txt(r.as_of,80)};
}
export async function clubSpots(db:Client,grant:string,options:Row){
  const r=await ecosystemRead(db,grant,'spots',{
    p_period:options.period,p_pseudo:options.member||null,p_limit:options.limit||6,p_offset:options.offset||0,
    p_filters:{...(options.city?{city:options.city}:{}),...(options.habit_ref?{habit:options.habit_ref}:{})},
  });
  return projectClubSpots(r);
}
