// The THP entitlement is decided by the existing server ledger, never by a
// local flag. Films receive their own short-lived signed URL after that check.
const SB_URL='https://abujjbkbbiumxrokozph.supabase.co';
const SB_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidWpqYmtiYml1bXhyb2tvenBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTUyODIsImV4cCI6MjA5MDUzMTI4Mn0.1baPwPzAeT91Re9xj6afBrNso-Ri46fvIIwvATZL2us';
export const LISBON_STREET_SIGN_IDS=Object.freeze(['fire_exit','Heli','aed','green_walk','red_walk','pharma','destination','lisboa_city_hall','speed_bump_caution','crosswalk_caution','no_entry','no_parking','hospital','parking','Hotel','dead_end','roundabout','left_or_straight','no_uturn','priority','crosswalk','stop']);
const ids=new Set(LISBON_STREET_SIGN_IDS);
let sharedClient;
async function clientFor(client){
 if(client)return client;
 if(!sharedClient){const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');sharedClient=createClient(SB_URL,SB_ANON);}
 return sharedClient;
}
const result=(state,extra={})=>({state,owned:state==='owned',...extra});
async function request(endpoint,body,{client,signal}={}){
 try{
  if(signal?.aborted)return result('error');
  const sb=await clientFor(client),{data,error}=await sb.auth.getSession();
  if(error){console.warn('[lisbon access] Session could not be checked');return result('error');}
  const token=data?.session?.access_token;if(!token)return result('guest');
  const response=await fetch(SB_URL+'/functions/v1/'+endpoint,{method:'POST',signal,headers:{Authorization:'Bearer '+token,apikey:SB_ANON,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const payload=await response.json();
  if(signal?.aborted)return result('error');
  if(response.ok&&payload.access===true)return result('owned',{payload});
  if(response.status===401||payload.reason==='no_session')return result('guest');
  if(response.status===403||response.ok&&payload.access===false&&payload.reason!=='error')return result('missing');
  console.warn('[lisbon access] Server verification unavailable');return result('error');
 }catch(error){if(error?.name!=='AbortError')console.warn('[lisbon access] Verification could not complete');return result('error');}
}
export async function checkLisbonStreetAccess(options={}){
 const {state}=await request('stoner-gate',{},options);return result(state);
}
export async function requestLisbonStreetMedia(id,options={}){
 if(!ids.has(id))return result('error',{url:null});
 const access=await request('lisbon-street-media',{sign:id},options);
 if(!access.owned)return result(access.state,{url:null});
 try{
  const url=new URL(access.payload.url);
  if(url.origin!==SB_URL||url.pathname!=='/storage/v1/object/sign/play-signals/'+id+'.mp4'||!url.searchParams.get('token'))return result('error',{url:null});
  return result('owned',{url:url.href,expiresIn:Number(access.payload.expires_in)||900});
 }catch{return result('error',{url:null});}
}
