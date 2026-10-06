const input=$input.first().json,body=input.body||{};
if(!await serviceAuth(input.headers))return failResult('unauthorized',401);
if(body.type!=='package_shipped')return [{json:{ok:false,reason:'ignored',http_status:200}}];
const id=String(body.data?.order?.id||'');
if(!/^\d+$/.test(id))return failResult('order_id');
const cloth=(await db('totehm_clothes?printful_order_id=eq.'+id+'&select=*'))[0];
if(!cloth||cloth.test)return failResult(cloth?.test?'test_blocked':'not_found',200);
const order=(await request({url:'https://api.printful.com/orders/'+id,headers:pfHeaders})).result;
if(String(order?.id)!==id||String(order.external_id)!==cloth.id)return failResult('order_mismatch',200);
const shipment=(order.shipments||[]).find(s=>s.tracking_number&&/^https:\/\//.test(String(s.tracking_url||'')));
if(!shipment)return failResult('not_shipped',200);
const ticket=await rpc('streetwear_claim',{p_cloth:cloth.id,p_stage:'tracking',p_concept:null});
if(ticket.ok){
  await db('totehm_clothes?id=eq.'+cloth.id+'&test=eq.false','PATCH',{
    status:'shipped',printful_status:order.status,tracking_number:String(shipment.tracking_number),tracking_url:String(shipment.tracking_url),
  });
}
return ticketResult({...ticket,tracking_number:shipment.tracking_number,tracking_url:shipment.tracking_url});
