import {corsHeaders,SITE_SPACE} from './origins.ts';

export const LISBON_STREET_MEDIA_IDS=Object.freeze([
 'fire_exit','Heli','aed','green_walk','red_walk','pharma','destination','lisboa_city_hall',
 'speed_bump_caution','crosswalk_caution','no_entry','no_parking','hospital','parking','Hotel',
 'dead_end','roundabout','left_or_straight','no_uturn','priority','crosswalk','stop'
]);
const allowed=new Set(LISBON_STREET_MEDIA_IDS);
export const LISBON_STREET_MEDIA_TTL=900;
type Dependencies={
 authenticate:(authorization:string)=>Promise<{email:string}|null>;
 hasAccess:(email:string)=>Promise<boolean>;
 sign:(filename:string,ttl:number)=>Promise<string|null>;
};

// Identity and acquired access come from the same server authority as Stoner.
// A caller supplies only a canonical sign, never a user, email or storage path.
export function createLisbonStreetMediaHandler(deps:Dependencies){
 return async(req:Request):Promise<Response>=>{
  const headers={...corsHeaders(req.headers.get('origin'),SITE_SPACE),'Cache-Control':'no-store','Vary':'Origin, Authorization'};
  const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(req.method==='OPTIONS')return new Response('ok',{headers});
  if(req.method!=='POST')return json({access:false,reason:'method_not_allowed'},405);
  let input:unknown;try{input=await req.json();}catch{return json({access:false,reason:'invalid_sign'},400);}
  if(!input||typeof input!=='object'||Array.isArray(input))return json({access:false,reason:'invalid_sign'},400);
  const id=(input as Record<string,unknown>).sign;
  if(typeof id!=='string'||!allowed.has(id))return json({access:false,reason:'invalid_sign'},400);
  const authorization=req.headers.get('authorization')||'';
  if(!/^Bearer\s+\S+$/i.test(authorization))return json({access:false,reason:'no_session'},401);
  try{
   const user=await deps.authenticate(authorization);
   if(!user?.email?.trim())return json({access:false,reason:'no_session'},401);
   const email=user.email.trim().toLowerCase();
   if(!await deps.hasAccess(email))return json({access:false,reason:'locked'},403);
   const url=await deps.sign(id+'.mp4',LISBON_STREET_MEDIA_TTL);
   if(!url)return json({access:false,reason:'media_unavailable'},503);
   return json({access:true,url,expires_in:LISBON_STREET_MEDIA_TTL});
  }catch{
   console.error('lisbon-street-media: access_or_media_unavailable');
   return json({access:false,reason:'unavailable'},503);
  }
 };
}
