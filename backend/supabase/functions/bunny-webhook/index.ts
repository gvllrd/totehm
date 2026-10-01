import {admin,config,refreshVideo,library,UUID} from '../_shared/bunny.ts';
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST') return new Response('method',{status:405});
 const version=req.headers.get('X-BunnyStream-Signature-Version'),algorithm=req.headers.get('X-BunnyStream-Signature-Algorithm'),signature=req.headers.get('X-BunnyStream-Signature') || '';
 if(version!=='v1' || algorithm!=='hmac-sha256' || !/^[0-9a-f]{64}$/.test(signature)) return new Response('unauthorized',{status:401});
 if(Number(req.headers.get('content-length') || 0)>4096) return new Response('too_large',{status:413});
 try{
  const c=await config();if(!c.readKey) return new Response('unavailable',{status:503});
  const raw=await req.arrayBuffer();if(raw.byteLength>4096) return new Response('too_large',{status:413});
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(c.readKey),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const mac=new Uint8Array(signature.match(/../g)!.map(x=>parseInt(x,16)));
  if(!await crypto.subtle.verify('HMAC',key,mac,raw)) return new Response('unauthorized',{status:401});
  const b=JSON.parse(new TextDecoder().decode(raw));if(String(b.VideoLibraryId)!==library || !UUID.test(b.VideoGuid)) return new Response('invalid',{status:400});
  const {data:row,error}=await admin.from('videos').select('id,bunny_video_id').eq('bunny_video_id',b.VideoGuid).maybeSingle();
  if(error) return new Response('retry',{status:500});if(!row) return new Response('ok');
  // Re-read authoritative current state: duplicate or out-of-order callbacks cannot regress it.
  await refreshVideo(row);return new Response('ok');
 }catch{console.error('bunny_webhook_failed');return new Response('retry',{status:500});}
});
