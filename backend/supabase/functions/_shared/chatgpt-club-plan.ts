// Explicit Club discovery complements personal and subscribed-member context.
// The native reader, not a subscription list, defines which members are visible.
import {ContextReadError,INTENTIONS} from './chatgpt-context.ts';
import {clubSpots} from './chatgpt-ecosystem.ts';
type Row=Record<string,any>;
export async function enrichClubPlan(db:any,grant:string,result:Row,requested:unknown,options:{city?:unknown;intentions?:unknown}={},ecosystemAllowed=true){
  if(requested===undefined||requested===false)return result;
  if(requested!==true)throw new ContextReadError('invalid_request');
  const city=options.city;
  if(city!==undefined&&(typeof city!=='string'||!city.trim()||city.length>120))throw new ContextReadError('invalid_request');
  const intentions=options.intentions;
  if(intentions!==undefined&&(!Array.isArray(intentions)||intentions.length>7||intentions.some(i=>!INTENTIONS.includes(i))))throw new ContextReadError('invalid_request');
  if(!ecosystemAllowed)return {...result,club_plan:{available:false,why:'ecosystem_consent_required',scope:'authorized_club'}};
  const read=async(period:'now'|'future')=>{
    try{
      const r=await clubSpots(db,grant,{period,city:typeof city==='string'?city.trim():undefined,intentions,limit:3});
      return {available:true,...r,items:r.items.slice(0,3),has_more:r.has_more||r.items.length>3};
    }catch{return {available:false,why:'unavailable',items:[],has_more:false};}
  };
  const [now,future]=await Promise.all([read('now'),read('future')]);
  return {...result,club_plan:{scope:'authorized_club',city:typeof city==='string'?city.trim():null,now,future,
    complete:now.available&&future.available&&!now.has_more&&!future.has_more,
    interpretation:'Authorized spots from Club members, including people outside subscriptions. A plan is not proof of presence or verified opening hours. No current location was inferred.'}};
}
