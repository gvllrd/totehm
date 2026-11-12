// Optional, bounded context for elements already selected by retrieval.
// Existing readers retain ownership, subscription and audience checks.
import {ContextReadError,validElementRef,getMediaMetadata,getSpots,elementURL,type ElementRef} from './chatgpt-context.ts';
import {memberMedia,clubSpots} from './chatgpt-ecosystem.ts';
type Row=Record<string,any>;
const unavailable=()=>({available:false,why:'temporarily_unavailable'});
function requestedResources(requested:unknown){
  if(requested===undefined||requested===false)return false;
  if(requested!==true)throw new ContextReadError('invalid_request');
  return true;
}
function selected(result:Row,limit:number){
  const seen=new Set<string>();
  const items=(Array.isArray(result.items)?result.items:[]).filter((item:any)=>{
    if(!validElementRef(item))return false;
    const key=JSON.stringify([item.kind,item.ref]);if(seen.has(key))return false;seen.add(key);return true;
  });
  return {items:items.slice(0,limit),omitted:Math.max(0,items.length-limit)};
}
const failed=(value:any)=>value?.available===false;
const partial=(value:any)=>failed(value)||value?.truncated===true||value?.has_more===true;
async function read(reader:()=>Promise<any>){try{return {available:true,...await reader()};}catch{return unavailable();}}
function wrap(result:Row,elements:Row[],omitted:number){
  return {...result,resources:{scope:'selected_elements',metadata_only:true,elements,omitted_elements:omitted,
    complete:omitted===0&&elements.every(e=>!failed(e)&&!partial(e.media)&&Object.values(e.spots??{}).every(v=>!partial(v)))}};
}
export async function enrichPersonalResources(db:any,uid:string,result:Row,requested:unknown){
  if(!requestedResources(requested))return result;
  const choice=selected(result,3),elements:Row[]=[];
  for(const item of choice.items){
    const focus:ElementRef={kind:item.kind,ref:item.ref};
    const element={...focus,url:item.url??elementURL(focus),source:'owner_totehm'};
    const media=await read(()=>getMediaMetadata(db,uid,focus,{limit:2}));
    if(media.element_available===false){elements.push({element,...unavailable(),media:unavailable(),spots:{}});continue;}
    const spots:Row={};
    if(item.kind==='habit')for(const period of ['now','future'] as const){
      spots[period]=await read(()=>getSpots(db,uid,{habit_ref:item.ref,period,limit:2}));
    }
    elements.push({element,media,spots});
  }
  return wrap(result,elements,choice.omitted);
}
export async function enrichMemberResources(db:any,grant:string,member:string,result:Row,requested:unknown,ecosystemAllowed=true){
  if(!requestedResources(requested))return result;
  if(!ecosystemAllowed)return {...result,resources:{scope:'selected_elements',metadata_only:true,available:false,why:'ecosystem_consent_required',elements:[],omitted_elements:0,complete:false}};
  const choice=selected(result,2),elements:Row[]=[];
  const who=typeof result.source?.member==='string'?result.source.member:member;
  const source={kind:'subscribed_member',member:who,url:'https://www.totehm.com/@'+encodeURIComponent(who),adopted_by_user:false};
  for(const item of choice.items){
    const focus:ElementRef={kind:item.kind,ref:item.ref};
    const element={...focus,url:item.url??elementURL(focus,who),source};
    // This reader checks the subscription and the exact element again. If it
    // refuses, do not turn the old selection into a new member-spots request.
    const media=await read(()=>memberMedia(db,grant,who,focus,2));
    if(failed(media)||media.element_available===false){elements.push({element,...unavailable(),media:unavailable(),spots:{}});continue;}
    const spots:Row={};
    if(item.kind==='habit')for(const period of ['now','future'] as const){
      spots[period]=await read(()=>clubSpots(db,grant,{member:who,habit_ref:item.ref,period,limit:2}));
    }
    elements.push({element,media,spots});
  }
  return wrap(result,elements,choice.omitted);
}
