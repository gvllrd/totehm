// SPACE · supprimer un space (06/10/2026). Le propriétaire seul : la décision
// est prise par `space_delete` SOUS SA SESSION (auth.uid()), jamais d'après le
// corps de la requête. La fonction ne fait ensuite qu'effacer le média que la
// base lui rend : la vidéo Bunny (et sa ligne `videos`), les fichiers du seau
// `moments` rangés dans SON dossier. Un média qui résiste n'empêche pas la
// suppression (le space ne se lit déjà plus) : il est journalisé.
import {corsHeaders,SITE_SPACE} from '../_shared/origins.ts';
import {admin,viewer,owner,bunny,UUID} from '../_shared/bunny.ts';
Deno.serve(async(req:Request)=>{
 const headers={...corsHeaders(req.headers.get('origin'),SITE_SPACE),'Cache-Control':'no-store'};
 if(req.method==='OPTIONS') return new Response('ok',{headers});
 if(req.method!=='POST') return Response.json({error:'method'},{status:405,headers});
 const user=await owner(req);if(!user) return Response.json({error:'signin'},{status:401,headers});
 let spot='';try{spot=String((await req.json())?.spot || '');}catch{}
 if(!UUID.test(spot)) return Response.json({error:'spot'},{status:400,headers});
 const {data,error}=await viewer(req).rpc('space_delete',{p_spot:spot});
 if(error){console.error('space_delete_failed',error.code);return Response.json({error:'try_again'},{status:503,headers});}
 if(!data?.ok) return Response.json({error:data?.why || 'not_found'},{status:404,headers});
 const media=data.media || {},removed={clip:false,files:0};
 if(media.bunny && UUID.test(media.bunny)){
  try{
   const r=await bunny('/videos/'+media.bunny,{method:'DELETE'});
   if(r.ok || r.status===404){removed.clip=true;
    const {error:e}=await admin.from('videos').delete().eq('id',media.video_id).eq('user_id',user.id);if(e) console.error('video_row_delete_failed',e.code);}
   else console.error('bunny_delete_failed',r.status);
  }catch{console.error('bunny_delete_failed');}
 }
 const paths=(Array.isArray(media.paths)?media.paths:[]).filter((p:unknown)=>typeof p==='string' && p.startsWith(user.id+'/'));
 if(paths.length){
  const {data:gone,error:e}=await admin.storage.from('moments').remove(paths);
  if(e) console.error('storage_delete_failed'); else removed.files=gone?.length || 0;
 }
 return Response.json({ok:true,removed},{headers});
});
