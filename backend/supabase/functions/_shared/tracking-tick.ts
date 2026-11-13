import {trackingKeyboard} from './tracking-bot.ts';
import {createTelegramTransport,TelegramAPIError,telegramTextParts} from './tracking-telegram.ts';
type Config={db:any;token?:string;serviceKey:string;webhookSecret?:string;projectOrigin:string;fetcher?:typeof fetch;pause?:(milliseconds:number)=>Promise<void>};
// Only the member's confirmed wording for this exact current Habit. A lookup
// failure never prevents the already-reserved canonical check-in from arriving.
async function confirmedTiming(db:any,uid:string,claim:any):Promise<string>{
 try{
  const r=await db.from('totehms').select('steps').eq('user_id',uid)
   .order('updated_at',{ascending:false,nullsFirst:false}).limit(1);
  if(r.error)throw new Error('unavailable');
  const steps=Array.isArray(r.data?.[0]?.steps)?r.data[0].steps:[];
  const current=steps.find((s:any)=>s&&typeof s.t==='string'&&s.t===claim.habit);
  if(!current||(Object.hasOwn(claim,'frequency')&&(current.f??null)!==(claim.frequency??null)))return '';
  const words=current.rhythm_text;
  if(typeof words!=='string'||words.length>500||!words.isWellFormed()||/[\u0000-\u001f\u007f-\u009f]/u.test(words))return '';
  return words.replace(/\s+/gu,' ').trim();
 }catch{console.error('[tracking]','timing_read_failed');return '';}
}
export function createTrackingTick(c:Config){
 const telegram=createTelegramTransport(c.token,c.fetcher??fetch);
 const pause=c.pause??((milliseconds:number)=>new Promise<void>(resolve=>setTimeout(resolve,milliseconds)));
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
    const tokenValid=me.ok===true;
    const expectedBot=tokenValid&&String(me.result?.username).toLowerCase()==='totehmbot';
    const webhook=wh.result??{};
    const webhookCorrect=wh.ok===true&&webhook.url===c.projectOrigin+'/functions/v1/bot-reply';
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
    const timing=await confirmedTiming(c.db,uid,d);
    let state='uncertain',message:number|null=null,code='network_uncertain',partsSent=0;
    try{
     const text=String(d.habit)+'\n\n'+(timing?'Your timing: '+timing+'\n\n':'')+(d.period_label?String(d.period_label)+'\n':'')+'Did you do it?';
     const parts=telegramTextParts(text);
     for(let n=0;n<parts.length;n++){
      if(n)await pause(1100);
      const delivered=await telegram('sendMessage',{chat_id:d.chat_id,text:parts[n],...(n===parts.length-1?{reply_markup:trackingKeyboard(String(d.id))}:{}),link_preview_options:{is_disabled:true}});
      if(!Number.isSafeInteger(delivered.result?.message_id))throw new TelegramAPIError('sendMessage',200,0,false);
      partsSent++;message=delivered.result.message_id;
     }
     state='sent';code='';
    }catch(error){
     // A partial text delivery or lost response must never trigger an automatic duplicate.
     state=partsSent===0&&error instanceof TelegramAPIError&&error.definite?'failed':'uncertain';
     code=partsSent?'telegram_partial_delivery':error instanceof TelegramAPIError?'telegram_'+(error.code||'network_uncertain'):'telegram_uncertain';
    }
    const saved=await c.db.rpc('tracking_delivered',{p_lease:d.lease,p_status:state,p_message:message,p_code:code||null});
    if(saved.error||saved.data!==true)bump('delivery_unconfirmed');
    if(state==='sent')sent++;else bump(state==='failed'?'telegram_failed':'delivery_uncertain');
   }
   if((rows.data??[]).length<200)break;if(page===9)truncated=true;
  }
  return Response.json({ok:true,checked:seen.size,sent,reasons,truncated});
 };
}
