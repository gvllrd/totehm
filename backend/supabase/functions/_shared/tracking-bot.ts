import {telegramTextParts} from './tracking-telegram.ts';
import {practiceTelegram,practiceTarget,practiceURL,linkedPracticeRows,linkedPracticeText,linkedPracticeCallback,readPracticeLinks,validPracticeId} from './tracking-practice.ts';
// Private, deterministic tracking. The caller verifies Telegram's webhook secret.
// No model, no location collection, no automatic changes to the five TOTEHM views.
type DB=any;
type Telegram=(method:string,payload:Record<string,unknown>)=>Promise<any>;
const APP='https://www.totehm.com/totehm';
const oid=(v:unknown)=>typeof v==='string'&&/^[1-9][0-9]{0,18}$/.test(v);
// 23/11 (Wah) : « pas de Done/Missed, ça fait trop Task » — deux familles de boutons : REMEMBER en haut (↺ Why: · ↺ Trigger:,
// les box liées), OUTPUT dessous, sur une ligne : [On It] [No Time] [No Energy]. Prepare est retiré.
export const OUTPUT=['on_it','no_time','no_energy'] as const;
export const STATUS_LABEL:Record<string,string>={on_it:'On It',no_time:'No Time',no_energy:'No Energy',not_on_it:'Not on it'};
const STATUSES=['on_it','no_time','no_energy','not_on_it'];
// PONT : les messages déjà envoyés portent encore done / partial / missed / skipped (la base les traduit).
const LEGACY=['done','partial','missed','skipped'];
export function trackingKeyboard(id:string,action:'a'|'c'='a',linked:any[][]=[]){
  if(!oid(id))throw new Error('invalid_outcome');
  return {inline_keyboard:[...linked,OUTPUT.map(v=>({text:STATUS_LABEL[v],callback_data:`t:${action}:${id}:${v}`}))]};
}
export function trackingReview(s:any):string{
  const c=s.counts??{};
  const lines=[`Your practice · ${s.days_count??28} days`,
    `${c.on_it??0} on it · ${c.no_time??0} no time · ${c.no_energy??0} no energy`+(c.not_on_it?` · ${c.not_on_it} not on it`:''),
    `${c.unanswered??0} unanswered: unknown.`,
    'These are your answers, not proof of practice.'];
  if(s.trend?.state==='insufficient')lines.push('Not enough comparable answers for a trend yet.');
  else if(s.trend?.state==='more_on_it')lines.push('More « on it » answers than in the previous two weeks.');
  else if(s.trend?.state==='fewer_on_it')lines.push('Fewer « on it » answers than in the previous two weeks. Something to explore, without judgment.');
  lines.push('/settings for notifications · /pause to pause questions.');
  return lines.join('\n\n');
}
export async function handleTrackingUpdate(db:DB,u:any,telegram:Telegram,pause:(milliseconds:number)=>Promise<void> = milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds))):Promise<boolean>{
  const cb=u?.callback_query,msg=cb?.message??u?.message,from=cb?.from??u?.message?.from;
  if(!msg||!from||msg.chat?.type!=='private'||!Number.isSafeInteger(from.id)||from.id<=0||String(msg.chat.id)!==String(from.id))return false;
  const chat=String(msg.chat.id),tg=from.id;
  const say=(text:string,reply_markup?:unknown)=>telegram('sendMessage',{chat_id:chat,text,reply_markup,link_preview_options:{is_disabled:true}});
  const call=async(name:string,args:Record<string,unknown>)=>{const r=await db.rpc(name,args);if(r.error)throw new Error(name+'_failed');return r.data;};
  const unavailable=()=>say('This check-in is no longer available. Open your dashboard to review your practice.',{inline_keyboard:[[{text:'My dashboard',url:APP+'#settings'}]]});
  const notifications=()=>say('Your Habit check-ins arrive here automatically, within your notification settings. Read the Habit, then tap On It, No Time or No Energy. No selection menu. /pause to pause questions.',{inline_keyboard:[[{text:'TotehmBot settings',url:APP+'#settings'}]]});
  // Retain already-delivered link controls when an answer is confirmed. Their next
  // tap revalidates owner and current links; saving a report does not read more text.
  const deliveredLinks=(id:string)=>(Array.isArray(msg.reply_markup?.inline_keyboard)?msg.reply_markup.inline_keyboard:[])
    .filter((row:any)=>Array.isArray(row)&&row.length&&row.every((b:any)=>typeof b.callback_data==='string'&&
      (b.callback_data.startsWith('t:x:'+id+':')||b.callback_data.startsWith('t:k:'+id+':'))));
  // l'accusé, neutre : « Saved · No Energy », et [Change] ; les liens REMEMBER restent en haut
  const savedMessage=async(id:string,status:string)=>{
    const label=STATUS_LABEL[status];
    const markup={inline_keyboard:[...deliveredLinks(id),[{text:'Saved · '+label+' · Change',callback_data:`t:e:${id}:open`}]]};
    const original=String(msg.text??'').replace(/\n\nSaved(: (Done|Missed|In part|Set aside)| · (On It|No Time|No Energy|Not on it))$/, '');
    const text=original+'\n\nSaved · '+label;
    // Legacy messages can already fill Telegram's limit. Preserve their full text.
    if(original&&text.length<=4096)await telegram('editMessageText',{chat_id:chat,message_id:msg.message_id,text,reply_markup:markup,link_preview_options:{is_disabled:true}});
    else await telegram('editMessageReplyMarkup',{chat_id:chat,message_id:msg.message_id,reply_markup:markup});
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
    if(op==='x'||op==='k'){
      const linkedUnavailable=()=>practiceTelegram(telegram,'sendMessage',{chat_id:chat,disable_notification:true,
        text:'This linked box is no longer available. Open your current Habit in your TOTEHM.',
        reply_markup:{inline_keyboard:[[{text:'Open my Habit',web_app:{url:validPracticeId(id)?practiceURL(id):practiceURL()}}]]},link_preview_options:{is_disabled:true}});
      if(!validPracticeId(id)){await linkedUnavailable();return true;}
      let focus:undefined|{kind:'objective'|'repulsion';ref:string};
      if(op==='x'){
        const ref=parts[4];
        try{if(parts.length!==5||linkedPracticeCallback(id,value as 'w'|'r',ref)!==cb.data)throw new Error('invalid_linked_box');}
        catch{await linkedUnavailable();return true;}
        focus={kind:value==='w'?'objective':'repulsion',ref};
      }else if(parts.length!==4||!(/^(0|[1-9][0-9]{0,2})$/.test(value))||Number(value)>120){await linkedUnavailable();return true;}
      const target=await practiceTarget(db,tg,id);
      if(!target){await linkedUnavailable();return true;}
      const context=await readPracticeLinks(db,target,focus);
      if(op==='k'){
        if(!context.items.some(i=>i.kind==='habit'&&i.ref===target.habit)){await linkedUnavailable();return true;}
        const reports=(Array.isArray(msg.reply_markup?.inline_keyboard)?msg.reply_markup.inline_keyboard:[])
          .filter((row:any)=>Array.isArray(row)&&row.length&&row.every((b:any)=>typeof b.callback_data==='string'&&
            ['t:a:','t:c:','t:e:'].some(prefix=>b.callback_data.startsWith(prefix+id+':'))));
        await telegram('editMessageReplyMarkup',{chat_id:chat,message_id:msg.message_id,
          reply_markup:{inline_keyboard:[...linkedPracticeRows(context,target.habit,id,Number(value)),
            ...(reports.length?reports:[trackingKeyboard(id).inline_keyboard.at(-1)])]}});
      }else{
        const text=linkedPracticeText(context,target.habit,value as 'w'|'r',parts[4]);
        if(text===null){await linkedUnavailable();return true;}
        const segments=telegramTextParts(text);
        for(let n=0;n<segments.length;n++){
          if(n)await pause(1100);
          await practiceTelegram(telegram,'sendMessage',{chat_id:chat,text:segments[n],disable_notification:true,
            reply_parameters:{message_id:msg.message_id},link_preview_options:{is_disabled:true},
            ...(n===segments.length-1?{reply_markup:{inline_keyboard:[[{text:'Open my Habit',web_app:{url:practiceURL(id)}}]]}}:{})});
        }
      }
      return true;
    }
    // 23/11 : Prepare est retiré ; un ancien bouton Prepare ouvre simplement la Habit
    if(op==='p'&&['open','show'].includes(value)){
      await practiceTelegram(telegram,'sendMessage',{chat_id:chat,disable_notification:true,text:'Open this Habit in your TOTEHM.',
        reply_markup:{inline_keyboard:[[{text:'Open my Habit',web_app:{url:validPracticeId(id)?practiceURL(id):practiceURL()}}]]},link_preview_options:{is_disabled:true}});
      return true;
    }
    if((op==='a'||op==='c')&&(STATUSES.includes(value)||LEGACY.includes(value))){
      const r=await call(op==='c'?'tracking_correct':'tracking_answer',{p_telegram:tg,p_outcome:id,p_status:value});
      if(!r?.ok){await unavailable();return true;}
      const savedStatus=String(r.status??value);
      if(!STATUSES.includes(savedStatus)){await unavailable();return true;}
      await savedMessage(id,savedStatus);return true;
    }
    if(op==='b'&&['time','energy','place','overload','other'].includes(value)){
      const r=await call('tracking_detail',{p_telegram:tg,p_outcome:id,p_field:'barrier',p_value:value});
      await say(r?.ok?'Obstacle saved. Your TOTEHM is unchanged.':'This detail is no longer available.');return true;
    }
    if(op==='d'||op==='e'){
      const allowed=await call('tracking_detail',{p_telegram:tg,p_outcome:id,p_field:'inspect',p_value:''});
      if(!allowed?.ok){await unavailable();return true;}
      if(op==='e'){await telegram('editMessageReplyMarkup',{chat_id:chat,message_id:msg.message_id,reply_markup:trackingKeyboard(id,'c',deliveredLinks(id))});return true;}
      const r=await db.from('bot_drafts').upsert({telegram_id:tg,user_id:(await db.from('profiles').select('id').eq('telegram_id',tg).maybeSingle()).data?.id,
        kind:'tracking',step:'detail',data:{outcome:id},updated_at:new Date().toISOString()},{onConflict:'telegram_id'});
      if(r.error)throw new Error('tracking_draft_failed');
      await say('Optional: /minutes 20, /energy 1 to 5, or a private note. Notes are never shared with ChatGPT. /cancel to stop.');return true;
    }
    await unavailable();return true;
  }
  const text=String(msg.text??'').trim();
  // 23/11 : /prepare est un alias MUET (Prepare est retiré) ; /totehm ouvre mon TOTEHM
  if(['/prepare','/preparer','/préparer'].includes(text))return true;
  if(text==='/totehm'){
    await practiceTelegram(telegram,'sendMessage',{chat_id:chat,text:'Your TOTEHM.',
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
