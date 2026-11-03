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
  // 03/11 : les Code nodes de n8n ne savent PAS emettre des octets bruts — tout Buffer
  // qui leur passe par le corps HTTP ressort en `{"type":"Buffer","data":[...]}`. Les sept
  // concepts ont donc ete ecrits en JSON deguise en `image/jpeg` pendant tout ce temps :
  // Telegram les telechargeait puis les refusait. n8n envoie desormais du base64, que le
  // backend decode ; et on REFUSE d'ecrire ce qui ne commence pas par la signature JPEG,
  // pour que l'erreur ne puisse plus se reproduire en silence.
  if(body.action==='store'){
    const clothId=String(body.cloth_id||''),batchId=String(body.batch_id||'');
    const position=Number(body.position),b64=String(body.b64||'');
    if(!uuid.test(clothId)||!uuid.test(batchId))return Response.json({error:'ids'},{status:400});
    if(!Number.isInteger(position)||position<1||position>7)return Response.json({error:'position'},{status:400});
    if(!b64||b64.length>40000000)return Response.json({error:'b64'},{status:400});
    let octets:Uint8Array;
    try{const brut=atob(b64);octets=new Uint8Array(brut.length);for(let i=0;i<brut.length;i++)octets[i]=brut.charCodeAt(i);}
    catch{return Response.json({error:'b64'},{status:400});}
    if(!(octets[0]===0xFF&&octets[1]===0xD8&&octets[2]===0xFF))return Response.json({error:'not_jpeg'},{status:400});
    const chemin=clothId+'/'+batchId+'/concept-'+position+'.jpg';
    const {error:upErr}=await sb.storage.from('streetwear-generations')
      .upload(chemin,octets,{contentType:'image/jpeg',upsert:true});
    if(upErr)return Response.json({error:'storage'},{status:503});
    const {data:signe}=await sb.storage.from('streetwear-generations').createSignedUrl(chemin,604800);
    if(!signe?.signedUrl)return Response.json({error:'storage'},{status:503});
    return Response.json({storage_path:chemin,url:signe.signedUrl,octets:octets.length});
  }
  const clothId=String(body.cloth_id||'');
  if(!uuid.test(clothId))return Response.json({error:'cloth_id'},{status:400});
  const {data:cloth,error}=await sb.from('totehm_clothes').select('id,test,artwork_storage_path').eq('id',clothId).maybeSingle();
  if(error)return Response.json({error:'db'},{status:503});
  if(!cloth)return Response.json({error:'not_found'},{status:404});
  // 03/11 : une piece d'essai va JUSQU'A l'oeuvre composee — sa curation doit pouvoir
  // signer ses sept concepts, sinon l'essai visuel, qui existe pour JUGER les visuels,
  // n'a pas lieu. Seul le fichier d'IMPRESSION lui reste ferme ; Printful et le suivi
  // sont deja barres en base par `streetwear_claim` (`test_stop`).
  if(cloth.test&&body.purpose==='print')return Response.json({error:'test_blocked'},{status:404});
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
