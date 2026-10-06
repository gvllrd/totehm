const ticket=$input.first().json;
if(!ticket.ok)return [];
if(ticket.route==='bot'){
  await request({method:'POST',url:SB_URL+'/functions/v1/bot-reply',headers:{...sbHeaders,'x-totehm-telegram-token':$env.TG_TOKEN},body:ticket.update});
  return [{json:{ok:true,route:'bot'}}];
}
if(ticket.callback_id)try{await tg('answerCallbackQuery',{callback_query_id:ticket.callback_id,text:ticket.route==='regen'?'Regenerating…':'Processing your choice…'});}catch{}
if(ticket.route==='regen'){
  try{await callFlow('streetwear-generate',{cloth_id:ticket.cloth_id});}catch{ /* queued in DB */ }
  return [{json:{ok:true,route:'regen'}}];
}
const cloth=ticket.cloth,saved=ticket.job.data||{};
let retryable=!!saved.prediction_id||!!saved.upscaled_url;
try{
  let source=saved.upscaled_url;
  if(!source){
    let prediction;
    if(saved.prediction_id){
      prediction=await request({url:'https://api.replicate.com/v1/predictions/'+encodeURIComponent(saved.prediction_id),
        headers:{Authorization:'Bearer '+$env.REPLICATE_KEY}});
    }else{
      if(saved.prediction_request_started)throw new Error('prediction_outcome_unknown');
      if(!$env.REPLICATE_KEY||!$env.REPLICATE_VERSION)throw new Error('upscale_configuration');
      const signed=await refreshAsset({cloth_id:cloth.id,concept_id:ticket.concept.id});
      await checkpoint(ticket,{prediction_request_started:true});
      prediction=await request({method:'POST',url:'https://api.replicate.com/v1/predictions',
        headers:{Authorization:'Bearer '+$env.REPLICATE_KEY,'Content-Type':'application/json',Prefer:'wait=5','Cancel-After':'10m'},
        body:{version:$env.REPLICATE_VERSION,input:{image:signed.url,scale:4}},timeout:20000});
      if(!prediction.id)throw new Error('prediction_missing_id');
      await checkpoint(ticket,{prediction_id:prediction.id});retryable=true;
    }
    if(['failed','canceled'].includes(prediction.status)){retryable=false;throw new Error('prediction_'+prediction.status);}
    if(prediction.status!=='succeeded'){
      await checkpoint(ticket,{prediction_id:prediction.id},true);
      return [{json:{ok:true,pending:true,cloth_id:cloth.id}}];
    }
    source=Array.isArray(prediction.output)?prediction.output[0]:prediction.output;
    if(typeof source!=='string'||!/^https:\/\//.test(source))throw new Error('upscale_output');
    await checkpoint(ticket,{upscaled_url:source});
  }
  const composed=await request({method:'POST',url:SB_URL+'/functions/v1/compose-artwork',headers:sbHeaders,
    body:{cloth_id:cloth.id,source_url:source},timeout:200000});
  if(!composed.print_url||!composed.final_url||!composed.storage_path)throw new Error('compose_output');
  if(!await complete(ticket,composed))throw new Error('curation_lease');
  try{await callFlow('streetwear-printful',{cloth_id:cloth.id});}catch{ /* durable Printful job */ }
  return [{json:{ok:true,cloth_id:cloth.id}}];
}catch(error){
  const code=String(error.message||'curation_failed');
  await fail(ticket,code,retryable);
  throw new Error('Streetwear curation failed: '+code);
}
