// Durable delivery and polling, never replay an ambiguous image generation.
await rpc('streetwear_recover_stalled');
const events=await db('streetwear_events?state=eq.queued&next_attempt_at=lte.'+encodeURIComponent(new Date().toISOString())+'&attempts=lt.20&select=id,payload&limit=12&order=next_attempt_at');
const jobs=await db('streetwear_jobs?state=in.(queued,waiting)&next_attempt_at=lte.'+encodeURIComponent(new Date().toISOString())+'&attempts=lt.20&select=cloth_id,stage&limit=12&order=next_attempt_at');
let dispatched=0,failed=0;
for(const event of events)try{await callFlow('printful-product',{...event.payload,_inbox_id:event.id});dispatched++;}catch{failed++;}
for(const job of jobs){
  try{
    if(job.stage==='generation'||job.stage==='notify')await callFlow('streetwear-generate',{cloth_id:job.cloth_id,...(job.stage==='notify'?{stage:'notify'}:{})});
    else if(job.stage==='curation')await callFlow('curation',{resume_cloth_id:job.cloth_id});
    else if(job.stage==='printful')await callFlow('streetwear-printful',{cloth_id:job.cloth_id});
    else if(job.stage==='tracking'){
      const cloth=(await db('totehm_clothes?id=eq.'+job.cloth_id+'&select=printful_order_id'))[0];
      if(cloth?.printful_order_id)await callFlow('streetwear-tracking',{type:'package_shipped',data:{order:{id:cloth.printful_order_id}}});
    }
    dispatched++;
  }catch{failed++;}
}
return [{json:{ok:failed===0,dispatched,failed}}];
