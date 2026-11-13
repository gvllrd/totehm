import {practiceKeyboard,practiceTelegram,practiceTarget,readPreparation,practiceURL} from './tracking-practice.ts';
// Private, deterministic tracking. The caller verifies Telegram's webhook secret.
// No model, no location collection, no automatic changes to the five TOTEHM views.
type DB=any;
type Telegram=(method:string,payload:Record<string,unknown>)=>Promise<any>;
const APP='https://www.totehm.com/totehm';
const oid=(v:unknown)=>typeof v==='string'&&/^[1-9][0-9]{0,18}$/.test(v);
export function trackingKeyboard(id:string,action:'a'|'c'='a'){
  if(!oid(id))throw new Error('invalid_outcome');
  return {inline_keyboard:[[{text:'Done',callback_data:`t:${action}:${id}:done`},{text:'Missed',callback_data:`t:${action}:${id}:missed`}],[{text:'Prepare',callback_data:`t:p:${id}:open`}]]};
}
export function trackingReview(s:any):string{
  const c=s.counts??{};
  const lines=[`Your practice · ${s.days_count??28} days`,
    `${c.done??0} done · ${c.partial??0} in part · ${c.missed??0} missed · ${c.skipped??0} set aside`,
    `${c.unanswered??0} unanswered: unknown.`,
    'These are your reports, not proof of practice.'];
  if(s.trend?.state==='insufficient')lines.push('Not enough comparable reports for a trend yet.');
  else if(s.trend?.state==='more_done')lines.push('More done reports among your reported attempts than in the previous two weeks.');
  else if(s.trend?.state==='fewer_done')lines.push('Fewer done reports among your reported attempts. Something to explore, without judgment.');
  lines.push('/settings for notifications · /pause to pause questions.');
  return lines.join('\n\n');
}
export async function handleTrackingUpdate(db:DB,u:any,telegram:Telegram):Promise<boolean>{
  const cb=u?.callback_query,msg=cb?.message??u?.message,from=cb?.from??u?.message?.from;
  if(!msg||!from||msg.chat?.type!=='private'||!Number.isSafeInteger(from.id)||from.id<=0||String(msg.chat.id)!==String(from.id))return false;
  const chat=String(msg.chat.id),tg=from.id;
  const say=(text:string,reply_markup?:unknown)=>telegram('sendMessage',{chat_id:chat,text,reply_markup,link_preview_options:{is_disabled:true}});
  const call=async(name:string,args:Record<string,unknown>)=>{const r=await db.rpc(name,args);if(r.error)throw new Error(name+'_failed');return r.data;};
  const unavailable=()=>say('This check-in is no longer available. Open your dashboard to review your practice.',{inline_keyboard:[[{text:'My dashboard',url:APP+'#settings'}]]});
  const notifications=()=>say('Your Habit check-ins arrive here automatically, within your notification settings. Read the Habit, then tap Done or Missed. No selection menu. /pause to pause questions.',{inline_keyboard:[[{text:'TotehmBot settings',url:APP+'#settings'}]]});
  const savedMessage=async(id:string,status:string)=>{
    const label=({done:'Done',missed:'Missed',partial:'In part',skipped:'Set aside'} as Record<string,string>)[status];
    const markup={inline_keyboard:[[{text:'Change',callback_data:`t:e:${id}:open`}],[{text:'Prepare',callback_data:`t:p:${id}:open`}]]};
    const original=String(msg.text??'').replace(/\n\nSaved: (Done|Missed|In part|Set aside)$/, '');
    const text=original+'\n\nSaved: '+label;
    // Legacy messages can already fill Telegram's limit. Preserve their full text.
    if(original&&text.length<=4096)await telegram('editMessageText',{chat_id:chat,message_id:msg.message_id,text,reply_markup:markup,link_preview_options:{is_disabled:true}});
    else await telegram('editMessageReplyMarkup',{chat_id:chat,message_id:msg.message_id,reply_markup:{inline_keyboard:[[{text:'Saved: '+label+' · Change',callback_data:`t:e:${id}:open`}],[{text:'Prepare',callback_data:`t:p:${id}:open`}]]}});
  };
  if(cb){
    const parts=String(cb.data??'').split(':'),legacy=parts[0]==='o';
    if(parts[0]!=='t'&&!legacy)return false;
    // Ending Telegram's spinner is best effort; an expired/throttled ACK must not block the idempotent report.
    try{await telegram('answerCallbackQuery',{callback_query_id:String(cb.id)});}
    catch{console.error('[tracking]','callback_ack_failed');}
    const op=legacy?'a':parts[1],id=legacy?parts[1]:parts[2],value=legacy?parts[2]:parts[3];
    if(op==='l'||op==='n'){await notifications();return true;}
    if(!oid(id)){await unavailable();return true;}
    if(op==='p'&&['open','show'].includes(value)){
      const target=await practiceTarget(db,tg,id);
      if(!target){await unavailable();return true;}
      if(value==='open'){
        await practiceTelegram(telegram,'sendMessage',{chat_id:chat,
          text:'Prepare your next step. Open the original Habit with its private media, or bring its recorded timing, usual place and linked WHY, TRIGGER, VISION and MY STORY text into this private Telegram chat. Opening preparation never records Done or Missed.',
          reply_markup:practiceKeyboard(id,true),link_preview_options:{is_disabled:true}});
      }else{
        const text=await readPreparation(db,target);
        await practiceTelegram(telegram,'editMessageText',{chat_id:chat,message_id:msg.message_id,text,
          reply_markup:practiceKeyboard(id),link_preview_options:{is_disabled:true}});
      }
      return true;
    }
    if((op==='a'||op==='c')&&['done','partial','missed','skipped'].includes(value)){
      const r=await call(op==='c'?'tracking_correct':'tracking_answer',{p_telegram:tg,p_outcome:id,p_status:value});
      if(!r?.ok){await unavailable();return true;}
      const savedStatus=String(r.status??value);
      if(!['done','partial','missed','skipped'].includes(savedStatus)){await unavailable();return true;}
      await savedMessage(id,savedStatus);return true;
    }
    if(op==='b'&&['time','energy','place','overload','other'].includes(value)){
      const r=await call('tracking_detail',{p_telegram:tg,p_outcome:id,p_field:'barrier',p_value:value});
      await say(r?.ok?'Obstacle saved. Your TOTEHM is unchanged.':'This detail is no longer available.');return true;
    }
    if(op==='d'||op==='e'){
      const allowed=await call('tracking_detail',{p_telegram:tg,p_outcome:id,p_field:'inspect',p_value:''});
      if(!allowed?.ok){await unavailable();return true;}
      if(op==='e'){await telegram('editMessageReplyMarkup',{chat_id:chat,message_id:msg.message_id,reply_markup:trackingKeyboard(id,'c')});return true;}
      const r=await db.from('bot_drafts').upsert({telegram_id:tg,user_id:(await db.from('profiles').select('id').eq('telegram_id',tg).maybeSingle()).data?.id,
        kind:'tracking',step:'detail',data:{outcome:id},updated_at:new Date().toISOString()},{onConflict:'telegram_id'});
      if(r.error)throw new Error('tracking_draft_failed');
      await say('Optional: /minutes 20, /energy 1 to 5, or a private note. Notes are never shared with ChatGPT. /cancel to stop.');return true;
    }
    await unavailable();return true;
  }
  const text=String(msg.text??'').trim();
  if(['/prepare','/preparer','/préparer','/totehm'].includes(text)){
    await practiceTelegram(telegram,'sendMessage',{chat_id:chat,
      text:'Prepare under a check-in opens that exact Habit: your trigger, your why, your illustrations and your spots. Show linked text is optional. Your TOTEHM account is required in the mini-app; Telegram does not replace that connection.',
      reply_markup:{inline_keyboard:[[{text:'Open my TOTEHM',web_app:{url:practiceURL()}}]]},link_preview_options:{is_disabled:true}});return true;
  }
  if(['/suivi','/track','/start tracking'].includes(text)){await notifications();return true;}
  if(['/bilan','/review','/moi','/me'].includes(text)){
    const r=await call('tracking_bot_summary',{p_telegram:tg});
    await say(r?.ok?trackingReview(r):'Connect TotehmBot from your dashboard on totehm.com.',
      {inline_keyboard:[[{text:'My dashboard',url:APP+'#settings'}]]});return true;
  }
  if(['/pause','/reprendre','/resume'].includes(text)){
    const paused=text==='/pause',r=await call('tracking_bot_pause',{p_telegram:tg,p_paused:paused});
    await say(!r?.ok?'Connect TotehmBot from your dashboard.':paused?'Questions paused. Your reports are kept. /resume whenever you want.':'Questions resumed with your schedule and daily limit. Manage notifications in your dashboard.');return true;
  }
  if(['/reglages','/settings'].includes(text)){
    const r=await call('tracking_bot_summary',{p_telegram:tg}),s=r?.settings;
    await say(s?`${s.timezone} · quiet hours ${s.quiet_from}:00 to ${s.quiet_to}:00 · ${s.max_daily} questions maximum per day.\n\n${s.paused?'Questions paused.':'Questions enabled.'}\n\nManage settings and ChatGPT sharing in your dashboard.`:'Connect TotehmBot from your dashboard.',
      {inline_keyboard:[[{text:'Tracking settings',url:APP+'#settings'}]]});return true;
  }
  const r=await db.from('bot_drafts').select('kind,data,updated_at').eq('telegram_id',tg).maybeSingle(),draft=r.data;
  if(draft?.kind!=='tracking')return false;
  if(['/cancel','/annuler'].includes(text)||Date.now()-Date.parse(draft.updated_at)>30*60000){await db.from('bot_drafts').delete().eq('telegram_id',tg);await say('Detail cancelled.');return true;}
  const match=/^\/(minutes|energy|energie|énergie)\s+([0-9]{1,4})$/.exec(text);
  if(text.startsWith('/')&&!match){await say('/minutes 20, /energy 1 to 5, a private note or /cancel.');return true;}
  if(!text)return true;
  const saved=await call('tracking_detail',{p_telegram:tg,p_outcome:String(draft.data?.outcome),p_field:match?(match[1]==='minutes'?'minutes':'energy'):'note',p_value:match?match[2]:text.slice(0,1000)});
  if(saved?.ok)await db.from('bot_drafts').delete().eq('telegram_id',tg);
  await say(saved?.ok?'Detail saved.':'Invalid value or expired report. /cancel to stop.');return true;
}
