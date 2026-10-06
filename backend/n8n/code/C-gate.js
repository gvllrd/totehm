const input=$input.first().json,body=input.body||{};
const internal=await serviceAuth(input.headers);
const expected=$env.TG_WEBHOOK_SECRET||sha256('totehm-telegram-webhook-v1:'+$env.TG_TOKEN);
const telegram=!!$env.TG_TOKEN&&input.headers?.['x-telegram-bot-api-secret-token']===expected;
if(!internal&&!telegram)return failResult('unauthorized',401);
if(internal&&uuid(body.resume_cloth_id)){
  const cloth=(await db('totehm_clothes?id=eq.'+body.resume_cloth_id+'&select=selected_concept_id'))[0];
  if(!uuid(cloth?.selected_concept_id))return failResult('not_selected',200);
  return ticketResult(await rpc('streetwear_claim',{p_cloth:body.resume_cloth_id,p_stage:'curation',p_concept:cloth.selected_concept_id}));
}
const cb=body.callback_query;
if(!cb||!/^(pick|regen):/.test(String(cb.data||'')))return [{json:{ok:true,http_status:200,route:'bot',update:body}}];
const [action,id]=String(cb.data).split(':');
const chat=String(cb.message?.chat?.id||''),who=String(cb.from?.id||'');
const allowed=String($env.TG_ADMIN_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
if(!uuid(id)||chat!==String($env.TG_CHAT)||!who||
  (Number($env.TG_CHAT)>0?who!==String($env.TG_CHAT):!allowed.includes(who)))return failResult('curator_only',403);
let clothId=id;
if(action==='pick'){
  const concept=(await db('cloth_concepts?id=eq.'+id+'&select=cloth_id'))[0];
  if(!concept)return failResult('not_found',404);clothId=concept.cloth_id;
}
const inbox=(await db('streetwear_jobs?cloth_id=eq.'+clothId+'&stage=eq.notify&select=state,data'))[0];
if(inbox?.state!=='done'||String(inbox.data?.curation_message_id)!==String(cb.message?.message_id))return failResult('stale_button',200);
if(action==='regen'){
  const ok=await rpc('streetwear_regenerate',{p_cloth:clothId});
  return [{json:{ok,http_status:200,route:'regen',cloth_id:clothId,callback_id:cb.id}}];
}
const ticket=await rpc('streetwear_claim',{p_cloth:clothId,p_stage:'curation',p_concept:id});
if(!ticket.ok){try{await tg('answerCallbackQuery',{callback_query_id:cb.id,text:'Already processing or expired.'});}catch{} }
return ticketResult({...ticket,callback_id:cb.id});
