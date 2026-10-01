import {corsHeaders,SITE_SPACE} from '../_shared/origins.ts';
import {admin,viewer,owner,config,refreshVideo,signedHLS,UUID} from '../_shared/bunny.ts';
Deno.serve(async(req:Request)=>{
 const headers={...corsHeaders(req.headers.get('origin'),SITE_SPACE),'Cache-Control':'no-store'};
 if(req.method==='OPTIONS') return new Response('ok',{headers});
 if(req.method!=='POST') return Response.json({error:'method'},{status:405,headers});
 try{
  const b=await req.json();if(!UUID.test(b.id || '')) return Response.json({error:'id'},{status:400,headers});
  // SQL authorizes the Spot before any Bunny metadata or signed URL leaves the server.
  const sb=viewer(req);const {data:read,error:readError}=await sb.rpc('spot_get',{p_id:b.spot});
  let allowed=!readError && read?.ok && read.spot?.clip?.id===b.id;
  if(!allowed && b.action==='complete'){const user=await owner(req);if(user){const {data}=await admin.from('videos').select('id').eq('id',b.id).eq('user_id',user.id).maybeSingle();allowed=!!data;}}
  if(!allowed) return Response.json({error:'not_found'},{status:404,headers});
  const {data:row,error}=await admin.from('videos').select('id,bunny_video_id,status').eq('id',b.id).maybeSingle();
  if(error || !row?.bunny_video_id) return Response.json({error:'not_found'},{status:404,headers});
  const status=row.status==='ready' || row.status==='failed'?row.status:await refreshVideo(row);
  if(b.action==='complete' || status!=='ready') return Response.json({status},{headers});
  const c=await config();if(!c.ready) return Response.json({error:'video_unavailable'},{status:503,headers});
  return Response.json({status:'ready',...await signedHLS(row.bunny_video_id,c)},{headers});
 }catch{console.error('bunny_video_failed');return Response.json({error:'video_failed'},{status:502,headers});}
});
