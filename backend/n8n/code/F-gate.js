const input=$input.first().json;
const internal=await serviceAuth(input.headers);
const expected=sha256('totehm-printful-webhook-v1:'+$env.PRINTFUL_TOKEN);
if(!internal&&input.query?.signature!==expected)return failResult('unauthorized',401);
const body=input.body||{};
if(!['product_synced','product_updated','product_deleted','package_shipped'].includes(body.type))return [{json:{ok:true,http_status:200,body:{type:'ignored'}}}];
if(internal&&/^\d+$/.test(String(body._inbox_id||''))){
  const event=(await db('streetwear_events?id=eq.'+body._inbox_id+'&state=eq.queued&select=id,payload,attempts'))[0];
  if(!event)return [{json:{ok:false,http_status:200,reason:'event_done'}}];
  return [{json:{ok:true,http_status:202,body:event.payload,inbox_id:event.id,inbox_attempts:event.attempts}}];
}
const entity=body.type==='package_shipped'?body.data?.order?.id:body.data?.sync_product?.id;
if(!/^\d+$/.test(String(entity||'')))return failResult('entity_id');
const payload={type:body.type,data:body.type==='package_shipped'?{order:{id:entity}}:{sync_product:{id:entity}}};
const saved=await db('streetwear_events','POST',{payload},{Prefer:'return=representation'});
return [{json:{ok:true,http_status:202,body:payload,inbox_id:saved[0].id,inbox_attempts:0}}];
