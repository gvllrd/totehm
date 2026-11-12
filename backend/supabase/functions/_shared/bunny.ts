// Secrets stay in Edge memory; only enums/booleans/HTTP statuses enter private diagnostics.
// 10/11/2026 — ONE SECRET IS ENOUGH: BUNNY_ACCOUNT_API_KEY. From it the server finds its library
// (BUNNY_LIBRARY_ID if set, else the one named TOTEHM, else the only one ; a FRESH account with no
// library at all gets one, named TOTEHM — measured 10/11: the new account answered 200 with 0 libraries),
// reads the library key, the read-only key, the pull zone, its token key and CDN host, and sets what
// TOTEHM needs: the webhook, the renditions, CDN token authentication without IP lock. Each write is
// made only when the setting differs, so a second cold start (or two at once) changes nothing.
// What the ACCOUNT says wins: stale secrets of a dead account (BUNNY_LIBRARY_ID, BUNNY_API_KEY,
// BUNNY_TOKEN_KEY, BUNNY_CDN_HOSTNAME, BUNNY_READ_ONLY_API_KEY) can stay set and never break a fresh
// account key; they are used only when the account API cannot be read.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
export const URL_SB=Deno.env.get('SUPABASE_URL')!;
export const admin=createClient(URL_SB,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const ENV_LIBRARY=Deno.env.get('BUNNY_LIBRARY_ID') || '';
/* une clé collée garde parfois un espace ou un retour : invisible, il fait échouer la requête avant Bunny */
const ENV_API=(Deno.env.get('BUNNY_API_KEY') || '').trim();
const ACCOUNT=(Deno.env.get('BUNNY_ACCOUNT_API_KEY') || '').trim() || ENV_API;
/** Kept for older imports; the RESOLVED library is `(await config()).library`. */
export const library=ENV_LIBRARY;
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_BYTES=48000000;
export const WEBHOOK=URL_SB+'/functions/v1/bunny-webhook';
/* 240p and 360p start a clip at once on a slow network; 720p and 1080p take over as soon as they can. */
const RESOLUTIONS=['240p','360p','480p','720p','1080p'];
type Config={ready:boolean,key:string,host:string,readKey:string,library:string,api:string};
// deno-lint-ignore no-explicit-any
type Json=any;
let pending:Promise<Config>|null=null,expires=0;
let LIB={id:ENV_LIBRARY,api:ENV_API};
const timeout=()=>AbortSignal.timeout(12000);
const core=(path:string,init:RequestInit={})=>fetch('https://api.bunny.net'+path,{...init,
  headers:{AccessKey:ACCOUNT,'Content-Type':'application/json',Accept:'application/json',...init.headers},signal:timeout()});
export async function bunny(path:string,init:RequestInit={}){
 if(!/^\d+$/.test(LIB.id) || !LIB.api) throw new Error('video_unavailable');
 return fetch('https://video.bunnycdn.com/library/'+LIB.id+path,{...init,headers:{AccessKey:LIB.api,'Content-Type':'application/json',...init.headers},signal:timeout()});
}
/* The library: the explicit id if THIS account has it, else the one named TOTEHM (the oldest, should two
   cold starts ever race), else the only one. An account with NO library gets one; never a second. */
async function findLibrary(diag:Record<string,unknown>):Promise<Json|null>{
 if(!ACCOUNT) return null;
 if(ENV_LIBRARY){
  const r=await core('/videolibrary/'+ENV_LIBRARY);diag.env_library_status=r.status;
  if(r.ok){diag.account_api_status=r.status;diag.library_source='env';return await r.json();}
 }
 const r=await core('/videolibrary?page=1&perPage=100');diag.account_api_status=r.status;
 if(!r.ok) return null;
 const d=await r.json(),items:Json[]=Array.isArray(d)?d:(Array.isArray(d?.Items)?d.Items:[]);
 diag.libraries=items.length;
 if(!items.length){
  const c=await core('/videolibrary',{method:'POST',body:JSON.stringify({Name:'TOTEHM'})});diag.library_create_status=c.status;
  // Bunny's refusal says WHY ({ErrorKey, Field, Message}) — words of Bunny, never a key: kept, 120 characters at most.
  if(!c.ok){diag.library_source='missing';
   try{const e=await c.json();diag.library_create_error=[e?.ErrorKey,e?.Field,String(e?.Message || '').slice(0,120)].filter(Boolean).join(' · ');}catch{/* no body */}
   return null;}
  diag.library_source='created';const made=await c.json();
  // Two cold starts at once could each create one: everyone then RE-READS the list and takes the oldest
  // TOTEHM, so uploads and playback always meet on the same library (the spare stays empty, costs nothing).
  const again=await core('/videolibrary?page=1&perPage=100');
  const list:Json[]=again.ok?((x=>Array.isArray(x)?x:(x?.Items||[]))(await again.json())):[made];
  const first=list.filter(l=>String(l?.Name || '').trim().toLowerCase()==='totehm').sort((a,b)=>Number(a.Id)-Number(b.Id))[0] || made;
  if(first?.ApiKey) return first;
  const full=await core('/videolibrary/'+first?.Id);return full.ok?await full.json():first;
 }
 const named=items.filter(l=>String(l?.Name || '').trim().toLowerCase()==='totehm').sort((a,b)=>Number(a.Id)-Number(b.Id))[0];
 const pick=named || (items.length===1?items[0]:null);
 diag.library_source=named?'named':pick?'only':'missing';
 if(!pick?.Id) return null;
 if(pick.ApiKey) return pick;
 const full=await core('/videolibrary/'+pick.Id);return full.ok?await full.json():pick;
}
const sameSet=(a:string,b:string[])=>{const s=new Set(String(a || '').split(',').map(x=>x.trim()).filter(Boolean));
 return s.size===b.length && b.every(x=>s.has(x));};
/* What TOTEHM needs from the library and its pull zone — written only when it differs. */
async function provision(lib:Json,diag:Record<string,unknown>):Promise<Json|null>{
 const done:string[]=[];
 const want:Record<string,unknown>={};
 if(lib.WebhookUrl!==WEBHOOK) want.WebhookUrl=WEBHOOK;
 if(!sameSet(lib.EnabledResolutions,RESOLUTIONS)) want.EnabledResolutions=RESOLUTIONS.join(',');
 if(Object.keys(want).length){
  const r=await core('/videolibrary/'+lib.Id,{method:'POST',body:JSON.stringify(want)});diag.library_update_status=r.status;
  if(r.ok){done.push(...Object.keys(want));Object.assign(lib,want);}
 }
 let zone:Json|null=null;
 if(lib.PullZoneId){
  const z0=await core('/pullzone/'+lib.PullZoneId);diag.zone_api_status=z0.status;
  if(z0.ok){
   zone=await z0.json();
   const zw:Record<string,unknown>={};
   if(zone.ZoneSecurityEnabled!==true) zw.ZoneSecurityEnabled=true;
   // A token bound to the viewer's IP breaks on every network change (Wi-Fi → 4G): the token is per clip and short.
   if(zone.ZoneSecurityIncludeHashRemoteIP===true) zw.ZoneSecurityIncludeHashRemoteIP=false;
   if(Object.keys(zw).length){
    const r=await core('/pullzone/'+lib.PullZoneId,{method:'POST',body:JSON.stringify(zw)});diag.zone_update_status=r.status;
    if(r.ok){done.push(...Object.keys(zw));Object.assign(zone,zw);}
   }
  }
 }
 diag.provisioned=done;
 return zone;
}
export async function config():Promise<Config>{
 if(pending && Date.now()<expires) return pending;
 expires=Date.now()+60000;
 pending=(async()=>{
  const diag:Record<string,unknown>={account_key_present:!!Deno.env.get('BUNNY_ACCOUNT_API_KEY'),
    library_id_present:!!ENV_LIBRARY,api_key_present:!!ENV_API};
  let status='missing_secrets',key='',host='',readKey='';
  const envKey=Deno.env.get('BUNNY_TOKEN_KEY') || '',envHost=Deno.env.get('BUNNY_CDN_HOSTNAME') || '',
        envRead=Deno.env.get('BUNNY_READ_ONLY_API_KEY') || '';
  try{
   let lib:Json|null=null;
   try{lib=await findLibrary(diag);}catch(e){diag.account_api_status='error';diag.account_error=String((e as Error)?.name || 'error').slice(0,40);}
   LIB={id:lib?.Id!=null?String(lib.Id):ENV_LIBRARY,api:(lib?.ApiKey || '') || ENV_API};
   readKey=(lib?.ReadOnlyApiKey || '') || envRead;
   if(LIB.id && LIB.api){
    const probe=await bunny('/videos?page=1&itemsPerPage=10');diag.library_api_status=probe.status;
    if(probe.ok){
     status='secure_delivery_missing';
     const settings=!!lib;
     if(lib){
      const z=await provision(lib,diag);
      diag.resolutions=lib.EnabledResolutions || null;diag.webhook_configured=lib.WebhookUrl===WEBHOOK;
      if(z){key=z.ZoneSecurityKey || z.TokenAuthenticationKey || '';
        host=z.Hostnames?.find((h:{Value:string})=>h.Value?.endsWith('.b-cdn.net'))?.Value || '';
        diag.cdn_token_enabled=z.ZoneSecurityEnabled===true;diag.cdn_ip_locked=z.ZoneSecurityIncludeHashRemoteIP===true;}
     }
     key ||= envKey;host ||= envHost;
     if(key && /^[a-z0-9.-]+\.b-cdn\.net$/i.test(host)){
      const first=await probe.json(),usable=first.items?.find((v:{guid:string,status:number,availableResolutions?:string})=>[3,4].includes(v.status) && !!v.availableResolutions);
      // An uploading newest clip must not disable playback for the whole library; an empty one may still be ready.
      const guid=usable?.guid || crypto.randomUUID(),empty=!usable;
      if(guid && UUID.test(guid)){
       // A Referer bypasses hotlink blocking: a 403 must prove token protection.
       const signed=await signedHLS(guid,{key,host});
       const [unsigned,check]=await Promise.all([fetch('https://'+host+'/'+guid+'/playlist.m3u8',{method:'HEAD',headers:{Referer:'https://www.totehm.space/'},signal:timeout()}),fetch(signed.url,{method:'HEAD',signal:timeout()})]);
       diag.unsigned_playback_status=unsigned.status;diag.signed_playback_status=check.status;
       // Library EMPTY: there is no real clip to read, so a signed 403 proves nothing (measured 12/11 on a fresh zone, 13 min after
       // creation). It is accepted ONLY then; with one real clip the check is strict again (`check.ok`) and a bad token key stops uploads.
       diag.cdn_protected=(diag.cdn_token_enabled===true || !settings) && (unsigned.status===403 || unsigned.status===401);
       if(diag.cdn_protected){if((check.ok || empty && (check.status===404 || check.status===403)) && readKey && (diag.webhook_configured===true || !settings)) status='ready';}
      }
     }
     diag.cdn_hostname_present=!!host;diag.token_key_present=!!key;diag.webhook_key_present=!!readKey;
    }else status='library_unavailable';
   }else if(ACCOUNT) status=diag.account_api_status===401?'account_refused':'library_missing';
  }catch{status='library_unavailable';}
  const {error}=await admin.from('video_backend').upsert({id:true,status,diagnostics:diag,checked_at:new Date().toISOString()});if(error) console.error('video_backend_write_failed');
  // Validated CDN configuration is shared by warm playback requests. Access rights
  // are still checked on each Spot; an unavailable configuration retries promptly.
  expires=Date.now()+(status==='ready'?300000:30000);
  return {ready:status==='ready',key,host,readKey,library:LIB.id,api:LIB.api};
 })();return pending;
}
const enc=new TextEncoder();
export async function sha256Hex(value:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function signedHLS(guid:string,c:{key:string,host:string}){
 const expires=Math.floor(Date.now()/1000)+600,path='/'+guid+'/',signing='token_path='+path;
 const key=await crypto.subtle.importKey('raw',enc.encode(c.key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(path+expires+signing)));
 const token='HS256-'+btoa(String.fromCharCode(...mac)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 return {url:'https://'+c.host+'/bcdn_token='+token+'&expires='+expires+'&token_path='+encodeURIComponent(path)+path+'playlist.m3u8',expires};
}
export function viewer(req:Request){const auth=req.headers.get('authorization') || '';return createClient(URL_SB,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});}
export async function owner(req:Request){const sb=viewer(req);const {data,error}=await sb.auth.getUser();if(error || !data.user) return null;return data.user;}
export async function refreshVideo(row:{id:string,bunny_video_id:string}){
 await config();
 const r=await bunny('/videos/'+row.bunny_video_id);if(!r.ok) throw new Error('video_status_failed');const v=await r.json();
 const failed=[5,8].includes(v.status) || Number(v.length)>34;
 // Start once an HD rendition is playable; do not wait for every lower rendition.
 const hd=String(v.availableResolutions || '').split(',').some((q:string)=>Number.parseInt(q,10)>=720);
 const playable=!!v.availableResolutions && (v.status===3 || v.status===4 && hd);
 const status=failed?'failed':playable?'ready':v.status===6?'uploading':'processing';
 const {error}=await admin.from('videos').update({status,actual_seconds:v.length || null,width:v.width || null,height:v.height || null,resolutions:v.availableResolutions || null,updated_at:new Date().toISOString()}).eq('id',row.id);
 if(error) throw new Error('video_status_write_failed');return status;
}
// A read-only probe starts on invocation, but no diagnostic is returned publicly.
export const configured=config();
