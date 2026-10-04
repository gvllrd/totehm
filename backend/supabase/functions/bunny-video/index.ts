import {corsHeaders,SITE_SPACE} from '../_shared/origins.ts';
import {admin,viewer,owner,config,refreshVideo,signedHLS,UUID} from '../_shared/bunny.ts';
Deno.serve(async(req:Request)=>{
 const headers={...corsHeaders(req.headers.get('origin'),SITE_SPACE),'Cache-Control':'no-store'};
 if(req.method==='OPTIONS') return new Response('ok',{headers});
 if(req.method!=='POST') return Response.json({error:'method'},{status:405,headers});
 try{
  const b=await req.json(),batch=Array.isArray(b.clips),clips=batch?b.clips:[b];
  if(!clips.length || clips.length>2 || batch && b.action || clips.some((v:{id?:string})=>!UUID.test(v?.id || '')))return Response.json({error:'id'},{status:400,headers});
  const sb=viewer(req);
  // Each item is independently authorized. A hidden clip is indistinguishable from a missing one.
  const results=await Promise.all(clips.map(async(v:{id:string,spot?:string})=>{
   try{
   const {data:read,error:readError}=await sb.rpc('spot_get',{p_id:v.spot});
   let allowed=!readError && read?.ok && read.spot?.clip?.id===v.id;
   if(!allowed && !batch && b.action==='complete'){const user=await owner(req);if(user){const {data}=await admin.from('videos').select('id').eq('id',v.id).eq('user_id',user.id).maybeSingle();allowed=!!data;}}
   if(!allowed)return {id:v.id,spot:v.spot,error:'not_found',http:404};
   const {data:row,error}=await admin.from('videos').select('id,bunny_video_id,status').eq('id',v.id).maybeSingle();
   if(error || !row?.bunny_video_id)return {id:v.id,spot:v.spot,error:'not_found',http:404};
   const status=row.status==='ready' || row.status==='failed'?row.status:await refreshVideo(row);
   if((!batch && b.action==='complete') || status!=='ready')return {id:v.id,spot:v.spot,status,http:200};
   const c=await config();
   if(!c.ready)return {id:v.id,spot:v.spot,error:'video_unavailable',http:503};
   return {id:v.id,spot:v.spot,status:'ready',...await signedHLS(row.bunny_video_id,c),http:200};
   }catch{return {id:v.id,spot:v.spot,error:'video_failed',http:502};}
  }));
  if(batch)return Response.json({clips:results.map(({http,...r})=>r)},{headers});
  const {http,id,spot,...result}=results[0];return Response.json(result,{status:http,headers});
 }catch{console.error('bunny_video_failed');return Response.json({error:'video_failed'},{status:502,headers});}
});
