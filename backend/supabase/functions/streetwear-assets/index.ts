// Private artwork URLs are refreshed from durable Storage paths at use time.
import { streetwearServiceRequest,streetwearAdmin } from '../_shared/streetwear-auth.ts';
const sb=streetwearAdmin();
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async req=>{
  if(req.method!=='POST')return Response.json({error:'method'},{status:405});
  if(!await streetwearServiceRequest(req))return Response.json({error:'unauthorized'},{status:401});
  let body:Record<string,unknown>;
  try{body=await req.json();}catch{return Response.json({error:'json'},{status:400});}
  if(body.action==='health'){
    let telegramBotId:number|null=null;
    const token=Deno.env.get('TELEGRAM_BOT_TOKEN');
    if(token)try{
      const response=await fetch('https://api.telegram.org/bot'+token+'/getMe',{signal:AbortSignal.timeout(5000)});
      const me=await response.json();if(me.ok)telegramBotId=me.result.id;
    }catch{ /* boolean readiness only */ }
    return Response.json({ok:true,stripe_test_key:!!Deno.env.get('STRIPE_TEST_SECRET_KEY'),
      stripe_test_webhook:!!Deno.env.get('STRIPE_TEST_WEBHOOK_SECRET'),telegram_bot_id:telegramBotId});
  }
  const clothId=String(body.cloth_id||'');
  if(!uuid.test(clothId))return Response.json({error:'cloth_id'},{status:400});
  const {data:cloth,error}=await sb.from('totehm_clothes').select('id,test,artwork_storage_path').eq('id',clothId).maybeSingle();
  if(error)return Response.json({error:'db'},{status:503});
  if(!cloth||cloth.test)return Response.json({error:cloth?.test?'test_blocked':'not_found'},{status:404});
  let path=cloth.artwork_storage_path;
  if(body.concept_id){
    const conceptId=String(body.concept_id);
    if(!uuid.test(conceptId))return Response.json({error:'concept_id'},{status:400});
    const {data:concept}=await sb.from('cloth_concepts').select('storage_path').eq('id',conceptId).eq('cloth_id',clothId).maybeSingle();
    path=concept?.storage_path;
  }
  if(!path||!path.startsWith(clothId+'/'))return Response.json({error:'not_found'},{status:404});
  const expiresIn=body.purpose==='print'?30*86400:3600;
  const {data:signed,error:signError}=await sb.storage.from('streetwear-generations').createSignedUrl(path,expiresIn);
  if(signError||!signed?.signedUrl)return Response.json({error:'storage'},{status:503});
  return Response.json({url:signed.signedUrl,storage_path:path,expires_in:expiresIn});
});
