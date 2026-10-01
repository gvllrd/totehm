import {corsHeaders,SITE_SPACE} from '../_shared/origins.ts';
import {admin,owner,config,bunny,library,sha256Hex,UUID,MAX_BYTES,configured} from '../_shared/bunny.ts';
Deno.serve(async(req:Request)=>{
 const headers=corsHeaders(req.headers.get('origin'),SITE_SPACE);
 if(req.method==='OPTIONS') return new Response('ok',{headers});
 await configured;
 const user=await owner(req);if(!user) return Response.json({error:'signin'},{status:401,headers});
 if(req.method!=='POST') return Response.json({error:'method'},{status:405,headers});
 try{
  if(Number(req.headers.get('content-length') || 0)>4096) return Response.json({error:'request'},{status:413,headers});
  const body=await req.json(),c=await config();
  if(body.action==='status') return Response.json({available:c.ready},{headers});
  if(!c.ready) return Response.json({error:'video_unavailable'},{status:503,headers});
  const bytes=Number(body.bytes),seconds=Number(body.seconds);
  if(!Number.isInteger(bytes) || bytes<1 || bytes>MAX_BYTES || !Number.isFinite(seconds) || seconds<=0 || seconds>34) return Response.json({error:'clip_limit'},{status:400,headers});
  const {data:reserved,error}=await admin.rpc('video_reserve',{p_user:user.id,p_bytes:bytes,p_seconds:seconds});
  if(error || !reserved?.ok) return Response.json({error:'upload_limit'},{status:429,headers});
  const id=reserved.id;
  const r=await bunny('/videos',{method:'POST',body:JSON.stringify({title:'Spot '+id})});
  if(!r.ok){await admin.from('videos').update({status:'failed'}).eq('id',id);throw new Error('bunny_create_failed');}
  const v=await r.json();if(!UUID.test(v.guid)) throw new Error('bunny_id_invalid');
  const update=await admin.from('videos').update({bunny_video_id:v.guid}).eq('id',id);if(update.error) throw new Error('video_write_failed');
  const expires=Math.floor(Date.now()/1000)+3600;
  const signature=await sha256Hex(library+Deno.env.get('BUNNY_API_KEY')!+expires+v.guid);
  return Response.json({id,endpoint:'https://video.bunnycdn.com/tusupload',headers:{AuthorizationSignature:signature,AuthorizationExpire:String(expires),VideoId:v.guid,LibraryId:library}},{headers});
 }catch{console.error('create_bunny_upload_failed');return Response.json({error:'upload_failed'},{status:502,headers});}
});
