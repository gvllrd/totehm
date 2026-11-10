// Private, deterministic tracking. The caller verifies Telegram's webhook secret.
// No model, no location collection, no automatic changes to the five TOTEHM views.
type DB=any;
type Telegram=(method:string,payload:Record<string,unknown>)=>Promise<any>;
const APP='https://www.totehm.com/totehm', TG='https://t.me/TotehmBot?start=tracking';
const oid=(v:unknown)=>typeof v==='string'&&/^[1-9][0-9]{0,18}$/.test(v);
export function trackingKeyboard(id:string,action:'a'|'c'='a'){
  if(!oid(id))throw new Error('invalid_outcome');
  return {inline_keyboard:[[
    {text:'Done',callback_data:`t:${action}:${id}:done`},{text:'In part',callback_data:`t:${action}:${id}:partial`}],
    [{text:'Not done',callback_data:`t:${action}:${id}:missed`},{text:'Not today',callback_data:`t:${action}:${id}:skipped`}]]};
}
export function trackingReview(s:any):string{
  const c=s.counts??{},b=(s.barriers??[]).find((x:any)=>x.count>=2);
  const names:Record<string,string>={time:'time',energy:'energy',place:'place',overload:'overload',other:'another obstacle'};
  const lines=[`Your practice · ${s.days_count??28} days`,
    `${c.done??0} done · ${c.partial??0} in part · ${c.missed??0} pas done · ${c.skipped??0} set aside`,
    `${c.unanswered??0} unanswered: unknown.`,
    'These are your reports, not proof of practice.'];
  if(b)lines.push(`You reported ${names[b.kind]??'this obstacle'} ${b.count} times. Consider a smaller version while keeping your objective.`);
  if(s.trend?.state==='insufficient')lines.push('Not enough comparable reports for a trend yet.');
  else if(s.trend?.state==='more_done')lines.push('More done reports among your reported attempts than in the previous two weeks.');
  else if(s.trend?.state==='fewer_done')lines.push('Fewer done reports among your reported attempts. Something to explore, without judgment.');
  lines.push('/track to report a Habit · /pause to pause questions.');
  return lines.join('\n\n');
}
export async function handleTrackingUpdate(db:DB,u:any,telegram:Telegram):Promise<boolean>{
  const cb=u?.callback_query,msg=cb?.message??u?.message,from=cb?.from??u?.message?.from;
  if(!msg||!from||msg.chat?.type!=='private'||!Number.isSafeInteger(from.id)||from.id<=0||String(msg.chat.id)!==String(from.id))return false;
  const chat=String(msg.chat.id),tg=from.id;
  const say=(text:string,reply_markup?:unknown)=>telegram('sendMessage',{chat_id:chat,text,reply_markup,link_preview_options:{is_disabled:true}});
  const call=async(name:string,args:Record<string,unknown>)=>{const r=await db.rpc(name,args);if(r.error)throw new Error(name+'_failed');return r.data;};
  const unavailable=()=>say('This request is no longer available. Use /track to start from your TOTEHM.');
  const list=async(offset=0)=>{
    const r=await call('tracking_list',{p_telegram:tg,p_offset:offset});
    if(!r?.ok){await say('Connect TotehmBot from your dashboard on totehm.com.');return;}
    const rows=(r.items??[]).map((h:any)=>[{text:String(h.habit).slice(0,45),callback_data:`t:n:${h.key}`}]);
    if(r.has_more)rows.push([{text:'More',callback_data:`t:l:${r.next_offset}`}]);
    await say(rows.length?'Which Habit would you like to report?':'Add your first Habit to your TOTEHM.',
      rows.length?{inline_keyboard:rows}:{inline_keyboard:[[{text:'My TOTEHM',url:APP}]]});
  };
  if(cb){
    const parts=String(cb.data??'').split(':'),legacy=parts[0]==='o';
    if(parts[0]!=='t'&&!legacy)return false;
    await telegram('answerCallbackQuery',{callback_query_id:String(cb.id)});
    const op=legacy?'a':parts[1],id=legacy?parts[1]:parts[2],value=legacy?parts[2]:parts[3];
    if(op==='l'&&/^[0-9]{1,3}$/.test(id)){await list(Math.min(400,Number(id)));return true;}
    if(op==='n'&&/^[a-f0-9]{32}$/.test(id)){
      const r=await call('tracking_open',{p_telegram:tg,p_key:id});
      if(!r?.ok){await unavailable();return true;}
      await say(String(r.habit)+' — how did it go?',trackingKeyboard(String(r.id)));return true;
    }
    if(!oid(id)){await unavailable();return true;}
    if((op==='a'||op==='c')&&['done','partial','missed','skipped'].includes(value)){
      const r=await call(op==='c'?'tracking_correct':'tracking_answer',{p_telegram:tg,p_outcome:id,p_status:value});
      if(!r?.ok){await unavailable();return true;}
      // Remove buttons only after the database confirms the report.
      await telegram('editMessageReplyMarkup',{chat_id:chat,message_id:msg.message_id,reply_markup:{inline_keyboard:[]}});
      if(r.already){await say('Already saved. Use /track for a new report.');return true;}
      const barrier=value==='partial'||value==='missed';
      const buttons=barrier?[
        [{text:'Time',callback_data:`t:b:${id}:time`},{text:'Energy',callback_data:`t:b:${id}:energy`}],
        [{text:'Place',callback_data:`t:b:${id}:place`},{text:'Overload',callback_data:`t:b:${id}:overload`},{text:'Other',callback_data:`t:b:${id}:other`}]
      ]:[];
      buttons.push([{text:'Optional detail',callback_data:`t:d:${id}:open`},{text:'Correct',callback_data:`t:e:${id}:open`}]);
      await say(value==='skipped'?'Set aside. This choice does not count as a failure.':barrier?'Saved. Would you like to name an obstacle? You can also stop here.':'Saved.',{inline_keyboard:buttons});return true;
    }
    if(op==='b'&&['time','energy','place','overload','other'].includes(value)){
      const r=await call('tracking_detail',{p_telegram:tg,p_outcome:id,p_field:'barrier',p_value:value});
      await say(r?.ok?'Obstacle saved. Your TOTEHM is unchanged.':'This detail is no longer available.');return true;
    }
    if(op==='d'||op==='e'){
      const allowed=await call('tracking_detail',{p_telegram:tg,p_outcome:id,p_field:'inspect',p_value:''});
      if(!allowed?.ok){await unavailable();return true;}
      if(op==='e'){await say('Which answer would you like to keep?',trackingKeyboard(id,'c'));return true;}
      const r=await db.from('bot_drafts').upsert({telegram_id:tg,user_id:(await db.from('profiles').select('id').eq('telegram_id',tg).maybeSingle()).data?.id,
        kind:'tracking',step:'detail',data:{outcome:id},updated_at:new Date().toISOString()},{onConflict:'telegram_id'});
      if(r.error)throw new Error('tracking_draft_failed');
      await say('Optional: /minutes 20, /energy 1 to 5, or a private note. Notes are never shared with ChatGPT. /cancel to stop.');return true;
    }
    await unavailable();return true;
  }
  const text=String(msg.text??'').trim();
  if(['/suivi','/track','/start tracking'].includes(text)){await list();return true;}
  if(['/bilan','/review','/moi','/me'].includes(text)){
    const r=await call('tracking_bot_summary',{p_telegram:tg});
    await say(r?.ok?trackingReview(r):'Connect TotehmBot from your dashboard on totehm.com.',
      {inline_keyboard:[[{text:'My dashboard',url:APP+'#settings'},{text:'Report a Habit',url:TG}]]});return true;
  }
  if(['/pause','/reprendre','/resume'].includes(text)){
    const paused=text==='/pause',r=await call('tracking_bot_pause',{p_telegram:tg,p_paused:paused});
    await say(!r?.ok?'Connect TotehmBot from your dashboard.':paused?'Questions paused. Your reports are kept. /resume whenever you want.':'Questions resumed with your schedule and daily limit. /track is always available on request.');return true;
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
