// Secrets stay in Edge memory; only enums/booleans enter private diagnostics.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
export const URL_SB=Deno.env.get('SUPABASE_URL')!;
export const admin=createClient(URL_SB,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
export const library=Deno.env.get('BUNNY_LIBRARY_ID') || '';
const api=Deno.env.get('BUNNY_API_KEY') || '';
const account=Deno.env.get('BUNNY_ACCOUNT_API_KEY') || api;
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_BYTES=48000000;
type Config={ready:boolean,key:string,host:string,readKey:string};
let pending:Promise<Config>|null=null,expires=0;
const timeout=()=>AbortSignal.timeout(12000);
export async function bunny(path:string,init:RequestInit={}){
 if(!/^\d+$/.test(library) || !api) throw new Error('video_unavailable');
 return fetch('https://video.bunnycdn.com/library/'+library+path,{...init,headers:{AccessKey:api,'Content-Type':'application/json',...init.headers},signal:timeout()});
}
export async function config():Promise<Config>{
 if(pending && Date.now()<expires) return pending;
 expires=Date.now()+60000;
 pending=(async()=>{
  const diag:Record<string,unknown>={library_id_present:!!library,api_key_present:!!api};
  let status='missing_secrets',key=Deno.env.get('BUNNY_TOKEN_KEY') || '',host=Deno.env.get('BUNNY_CDN_HOSTNAME') || '',readKey=Deno.env.get('BUNNY_READ_ONLY_API_KEY') || '';
  try{
   if(library && api){
    const [probe,settings]=await Promise.all([bunny('/videos?page=1&itemsPerPage=10'),fetch('https://api.bunny.net/videolibrary/'+library,{headers:{AccessKey:account},signal:timeout()})]);diag.library_api_status=probe.status;
    if(probe.ok){
     status='secure_delivery_missing';
     diag.settings_api_status=settings.status;
     if(settings.ok){
      const lib=await settings.json();readKey ||= lib.ReadOnlyApiKey || '';
      diag.resolutions=lib.EnabledResolutions || null;diag.webhook_configured=lib.WebhookUrl===URL_SB+'/functions/v1/bunny-webhook';
      const zone=await fetch('https://api.bunny.net/pullzone/'+lib.PullZoneId,{headers:{AccessKey:account},signal:timeout()});
      if(zone.ok){const z=await zone.json();key ||= z.ZoneSecurityKey || z.TokenAuthenticationKey || '';host ||= z.Hostnames?.find((h:{Value:string})=>h.Value?.endsWith('.b-cdn.net'))?.Value || '';diag.cdn_token_enabled=z.ZoneSecurityEnabled===true;diag.cdn_ip_locked=z.ZoneSecurityIncludeHashRemoteIP===true;}
     }
     // Explicit CDN secrets are also supported when the library key cannot read account settings.
     if(key && /^[a-z0-9.-]+\.b-cdn\.net$/i.test(host)){
      const first=await probe.json(),usable=first.items?.find((v:{guid:string,status:number,availableResolutions?:string})=>[3,4].includes(v.status) && !!v.availableResolutions);
      // An uploading newest clip must not disable playback for the whole library.
      const guid=usable?.guid || crypto.randomUUID(),empty=!usable;
      if(guid && UUID.test(guid)){
       // A Referer bypasses hotlink blocking: a 403 must prove token protection.
       const signed=await signedHLS(guid,{key,host});
       const [unsigned,check]=await Promise.all([fetch('https://'+host+'/'+guid+'/playlist.m3u8',{method:'HEAD',headers:{Referer:'https://www.totehm.space/'},signal:timeout()}),fetch(signed.url,{method:'HEAD',signal:timeout()})]);
       diag.unsigned_playback_status=unsigned.status;diag.signed_playback_status=check.status;
       diag.cdn_protected=(diag.cdn_token_enabled===true || !settings.ok) && (unsigned.status===403 || unsigned.status===401);
       if(diag.cdn_protected){if((check.ok || empty && check.status===404) && readKey && (diag.webhook_configured===true || !settings.ok)) status='ready';}
      }
     }
     diag.cdn_hostname_present=!!host;diag.token_key_present=!!key;diag.webhook_key_present=!!readKey;
    }else status='library_unavailable';
   }
  }catch{status='library_unavailable';}
  const {error}=await admin.from('video_backend').upsert({id:true,status,diagnostics:diag,checked_at:new Date().toISOString()});if(error) console.error('video_backend_write_failed');
  // Validated CDN configuration is shared by warm playback requests. Access rights
  // are still checked on each Spot; an unavailable configuration retries promptly.
  expires=Date.now()+(status==='ready'?300000:30000);
  return {ready:status==='ready',key,host,readKey};
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
