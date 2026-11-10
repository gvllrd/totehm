import {trackingKeyboard} from './tracking-bot.ts';
type Config={db:any;token?:string;serviceKey:string;webhookSecret?:string;projectOrigin:string;fetcher?:typeof fetch};
export function createTrackingTick(c:Config){
 const send=c.fetcher??fetch;
 const telegram=async(method:string,body:unknown)=>{
  const r=await send(`https://api.telegram.org/bot${c.token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  let data:any;try{data=await r.json();}catch{data={};}
  return {status:r.status,data};
 };
 return async(req:Request)=>{
  if(req.method!=='POST')return new Response('method not allowed',{status:405});
  let authorized=!!c.serviceKey&&req.headers.get('authorization')==='Bearer '+c.serviceKey;
  if(!authorized){const token=req.headers.get('x-tick-token');if(token&&token.length<=256){const r=await c.db.rpc('bot_tick_consume',{p_token:token});authorized=!r.error&&r.data===true;}}
  if(!authorized)return new Response('forbidden',{status:403});
  let body:any={};try{body=await req.json();}catch{}
  if(body?.mode&&!['health','dry_run'].includes(body.mode))return Response.json({ok:false,error:'invalid_mode'},{status:400});
  if(!c.token)return Response.json({ok:false,error:'no_telegram_token'},{status:503});
  if(body?.mode==='health'){
   try{
    const me=await telegram('getMe',{}),wh=await telegram('getWebhookInfo',{});
    const tokenValid=me.status===200&&me.data.ok===true;
    const expectedBot=tokenValid&&String(me.data.result?.username).toLowerCase()==='totehmbot';
    const webhook=wh.data?.result??{};
    const webhookCorrect=wh.data?.ok===true&&webhook.url===c.projectOrigin+'/functions/v1/bot-reply';
    return Response.json({ok:true,token_valid:tokenValid,expected_bot:expectedBot,webhook_correct:webhookCorrect,webhook_secret_configured:!!c.webhookSecret,
      pending_updates:Number(webhook.pending_update_count)||0,ready:tokenValid&&expectedBot&&webhookCorrect&&!!c.webhookSecret});
   }catch{return Response.json({ok:false,error:'telegram_unavailable'},{status:503});}
  }
  const seen=new Set<string>(),reasons:Record<string,number>={};let sent=0,truncated=false;
  const bump=(reason:string)=>{reasons[reason]=(reasons[reason]??0)+1;};
  for(let page=0;page<10;page++){
   const rows=await c.db.from('totehms').select('user_id').eq('bot',true).order('user_id').range(page*200,page*200+199);
   if(rows.error)return Response.json({ok:false,error:'read_failed'},{status:503});
   for(const row of rows.data??[]){
    const uid=String(row.user_id);if(seen.has(uid))continue;seen.add(uid);
    const claim=await c.db.rpc(body?.mode==='dry_run'?'tracking_next':'tracking_claim',{p_user:uid});
    const d=claim.data;
    if(claim.error){bump('claim_failed');continue;}if(!d?.send){bump(String(d?.why??'not_due'));continue;}
    if(body?.mode==='dry_run'){bump('due');continue;}
    let state='uncertain',message:number|null=null,code='network_uncertain';
    try{
     const delivered=await telegram('sendMessage',{chat_id:d.chat_id,text:String(d.habit)+' — how did it go?',reply_markup:trackingKeyboard(String(d.id))});
     if(delivered.status===200&&delivered.data?.ok===true&&Number.isSafeInteger(delivered.data.result?.message_id)){
      state='sent';message=delivered.data.result.message_id;code='';
     }else if((delivered.status>=400&&delivered.status<500)||(delivered.data?.ok===false&&delivered.data?.error_code>=400&&delivered.data?.error_code<500)){
      state='failed';code='telegram_'+delivered.status;
     }else{state='uncertain';code='telegram_uncertain';}
    }catch{/* An uncertain network response must never trigger an automatic duplicate. */}
    const saved=await c.db.rpc('tracking_delivered',{p_lease:d.lease,p_status:state,p_message:message,p_code:code||null});
    if(saved.error||saved.data!==true)bump('delivery_unconfirmed');
    if(state==='sent')sent++;else bump(state==='failed'?'telegram_failed':'delivery_uncertain');
   }
   if((rows.data??[]).length<200)break;if(page===9)truncated=true;
  }
  return Response.json({ok:true,checked:seen.size,sent,reasons,truncated});
 };
}
