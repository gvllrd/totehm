// Private, deterministic tracking. The caller verifies Telegram's webhook secret.
// No model, no location collection, no automatic changes to the five TOTEHM views.
type DB=any;
type Telegram=(method:string,payload:Record<string,unknown>)=>Promise<any>;
const APP='https://www.totehm.com/totehm', TG='https://t.me/TotehmBot?start=tracking';
const oid=(v:unknown)=>typeof v==='string'&&/^[1-9][0-9]{0,18}$/.test(v);
export function trackingKeyboard(id:string,action:'a'|'c'='a'){
  if(!oid(id))throw new Error('invalid_outcome');
  return {inline_keyboard:[[
    {text:'Fait',callback_data:`t:${action}:${id}:done`},{text:'En partie',callback_data:`t:${action}:${id}:partial`}],
    [{text:'Pas fait',callback_data:`t:${action}:${id}:missed`},{text:'Pas aujourd’hui',callback_data:`t:${action}:${id}:skipped`}]]};
}
export function trackingReview(s:any):string{
  const c=s.counts??{},b=(s.barriers??[]).find((x:any)=>x.count>=2);
  const names:Record<string,string>={time:'le temps',energy:'l’énergie',place:'le lieu',overload:'la surcharge',other:'un autre obstacle'};
  const lines=[`Ton suivi · ${s.days_count??28} jours`,
    `${c.done??0} fait · ${c.partial??0} en partie · ${c.missed??0} pas fait · ${c.skipped??0} laissés de côté`,
    `${c.unanswered??0} sans réponse : on ne sait pas.`,
    'Ce sont tes déclarations, pas une preuve de pratique.'];
  if(b)lines.push(`Tu as signalé ${names[b.kind]??'cet obstacle'} ${b.count} fois. Tu peux choisir une version plus légère, sans changer ton objectif.`);
  if(s.trend?.state==='insufficient')lines.push('Pas encore assez de réponses comparables pour parler de tendance.');
  else if(s.trend?.state==='more_done')lines.push('Plus de réponses « fait » parmi tes essais rapportés que sur les deux semaines précédentes.');
  else if(s.trend?.state==='fewer_done')lines.push('Moins de réponses « fait » parmi tes essais rapportés. Un point à regarder, pas un jugement.');
  lines.push('/suivi pour noter une Habit · /pause pour couper les questions.');
  return lines.join('\n\n');
}
export async function handleTrackingUpdate(db:DB,u:any,telegram:Telegram):Promise<boolean>{
  const cb=u?.callback_query,msg=cb?.message??u?.message,from=cb?.from??u?.message?.from;
  if(!msg||!from||msg.chat?.type!=='private'||!Number.isSafeInteger(from.id)||from.id<=0||String(msg.chat.id)!==String(from.id))return false;
  const chat=String(msg.chat.id),tg=from.id;
  const say=(text:string,reply_markup?:unknown)=>telegram('sendMessage',{chat_id:chat,text,reply_markup,link_preview_options:{is_disabled:true}});
  const call=async(name:string,args:Record<string,unknown>)=>{const r=await db.rpc(name,args);if(r.error)throw new Error(name+'_failed');return r.data;};
  const unavailable=()=>say('Cette demande n’est plus disponible. /suivi pour repartir de ton TOTEHM.');
  const list=async(offset=0)=>{
    const r=await call('tracking_list',{p_telegram:tg,p_offset:offset});
    if(!r?.ok){await say('Relie TotehmBot depuis ton dashboard sur totehm.com.');return;}
    const rows=(r.items??[]).map((h:any)=>[{text:String(h.habit).slice(0,45),callback_data:`t:n:${h.key}`}]);
    if(r.has_more)rows.push([{text:'Suite',callback_data:`t:l:${r.next_offset}`}]);
    await say(rows.length?'Quelle Habit veux-tu noter ?':'Ajoute une première Habit dans ton TOTEHM.',
      rows.length?{inline_keyboard:rows}:{inline_keyboard:[[{text:'Mon TOTEHM',url:APP}]]});
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
      await say(String(r.habit)+' — où en es-tu ?',trackingKeyboard(String(r.id)));return true;
    }
    if(!oid(id)){await unavailable();return true;}
    if((op==='a'||op==='c')&&['done','partial','missed','skipped'].includes(value)){
      const r=await call(op==='c'?'tracking_correct':'tracking_answer',{p_telegram:tg,p_outcome:id,p_status:value});
      if(!r?.ok){await unavailable();return true;}
      // Remove buttons only after the database confirms the report.
      await telegram('editMessageReplyMarkup',{chat_id:chat,message_id:msg.message_id,reply_markup:{inline_keyboard:[]}});
      if(r.already){await say('Déjà enregistré. /suivi pour noter une nouvelle observation.');return true;}
      const barrier=value==='partial'||value==='missed';
      const buttons=barrier?[
        [{text:'Temps',callback_data:`t:b:${id}:time`},{text:'Énergie',callback_data:`t:b:${id}:energy`}],
        [{text:'Lieu',callback_data:`t:b:${id}:place`},{text:'Surcharge',callback_data:`t:b:${id}:overload`},{text:'Autre',callback_data:`t:b:${id}:other`}]
      ]:[];
      buttons.push([{text:'Une précision · facultatif',callback_data:`t:d:${id}:open`},{text:'Corriger',callback_data:`t:e:${id}:open`}]);
      await say(value==='skipped'?'Laissé de côté. Ce choix ne compte pas comme un échec.':barrier?'Noté. Un obstacle à préciser ? Tu peux aussi t’arrêter ici.':'Noté.',{inline_keyboard:buttons});return true;
    }
    if(op==='b'&&['time','energy','place','overload','other'].includes(value)){
      const r=await call('tracking_detail',{p_telegram:tg,p_outcome:id,p_field:'barrier',p_value:value});
      await say(r?.ok?'Obstacle noté, sans modifier ton TOTEHM.':'Cette précision n’est plus disponible.');return true;
    }
    if(op==='d'||op==='e'){
      const allowed=await call('tracking_detail',{p_telegram:tg,p_outcome:id,p_field:'inspect',p_value:''});
      if(!allowed?.ok){await unavailable();return true;}
      if(op==='e'){await say('Quelle réponse veux-tu conserver ?',trackingKeyboard(id,'c'));return true;}
      const r=await db.from('bot_drafts').upsert({telegram_id:tg,user_id:(await db.from('profiles').select('id').eq('telegram_id',tg).maybeSingle()).data?.id,
        kind:'tracking',step:'detail',data:{outcome:id},updated_at:new Date().toISOString()},{onConflict:'telegram_id'});
      if(r.error)throw new Error('tracking_draft_failed');
      await say('Facultatif : /minutes 20, /energie 1 à 5, ou une note privée. La note ne sera pas transmise à ChatGPT. /annuler pour arrêter.');return true;
    }
    await unavailable();return true;
  }
  const text=String(msg.text??'').trim();
  if(['/suivi','/track','/start tracking'].includes(text)){await list();return true;}
  if(['/bilan','/review','/moi','/me'].includes(text)){
    const r=await call('tracking_bot_summary',{p_telegram:tg});
    await say(r?.ok?trackingReview(r):'Relie TotehmBot depuis ton dashboard sur totehm.com.',
      {inline_keyboard:[[{text:'Mon dashboard',url:APP+'#settings'},{text:'Noter une Habit',url:TG}]]});return true;
  }
  if(['/pause','/reprendre','/resume'].includes(text)){
    const paused=text==='/pause',r=await call('tracking_bot_pause',{p_telegram:tg,p_paused:paused});
    await say(!r?.ok?'Relie TotehmBot depuis ton dashboard.':paused?'Questions coupées. Tes données restent là. /reprendre quand tu veux.':'Questions reprises, avec tes horaires et ton plafond. /suivi reste disponible à la demande.');return true;
  }
  if(['/reglages','/settings'].includes(text)){
    const r=await call('tracking_bot_summary',{p_telegram:tg}),s=r?.settings;
    await say(s?`${s.timezone} · calme de ${s.quiet_from} h à ${s.quiet_to} h · ${s.max_daily} questions maximum par jour.\n\n${s.paused?'Questions en pause.':'Questions activées.'}\n\nLes réglages et le partage avec ChatGPT se choisissent dans ton dashboard.`:'Relie TotehmBot depuis ton dashboard.',
      {inline_keyboard:[[{text:'Réglages du suivi',url:APP+'#settings'}]]});return true;
  }
  const r=await db.from('bot_drafts').select('kind,data,updated_at').eq('telegram_id',tg).maybeSingle(),draft=r.data;
  if(draft?.kind!=='tracking')return false;
  if(text==='/annuler'||Date.now()-Date.parse(draft.updated_at)>30*60000){await db.from('bot_drafts').delete().eq('telegram_id',tg);await say('Précision abandonnée.');return true;}
  const match=/^\/(minutes|energie|énergie)\s+([0-9]{1,4})$/.exec(text);
  if(text.startsWith('/')&&!match){await say('/minutes 20, /energie 1 à 5, une note privée ou /annuler.');return true;}
  if(!text)return true;
  const saved=await call('tracking_detail',{p_telegram:tg,p_outcome:String(draft.data?.outcome),p_field:match?(match[1]==='minutes'?'minutes':'energy'):'note',p_value:match?match[2]:text.slice(0,1000)});
  if(saved?.ok)await db.from('bot_drafts').delete().eq('telegram_id',tg);
  await say(saved?.ok?'Précision enregistrée.':'Valeur refusée ou observation expirée. /annuler pour arrêter.');return true;
}
