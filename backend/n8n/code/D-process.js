const ticket=$input.first().json;
if(!ticket.ok)return [];
const cloth=ticket.cloth;
try{
  let order;
  try{order=(await request({url:'https://api.printful.com/orders/@'+cloth.id,headers:pfHeaders})).result;}
  catch(error){if(error.status!==404)throw error;}
  if(!order){
    if(ticket.job.data.order_request_started)throw new Error('printful_outcome_unknown');
    const support=(await db('totehm_cloth_support?id=eq.'+cloth.garment_id+'&select=*'))[0];
    const variant=support?.printful_variant_map?.[cloth.size];
    if(!variant?.sync_variant_id)throw new Error('variant_not_found');
    const area=support.print_area||{},placement=String(area.placement||'back');
    if(!/^[a-z0-9_]+$/.test(placement))throw new Error('print_placement');
    const fileType=area.method==='embroidery'?'embroidery_'+placement:placement;
    const address=cloth.shipping?.address||{};
    if(!cloth.shipping?.name||!address.line1||!address.city||!address.country||!address.postal_code)throw new Error('shipping_missing');
    const signed=await refreshAsset({cloth_id:cloth.id,purpose:'print'});
    const files=(variant.files||[]).filter(f=>f.type!==fileType&&f.type!=='preview'&&(f.id||f.url))
      .map(f=>({type:f.type,...(f.id?{id:Number(f.id)}:{url:f.url})}));
    files.push({type:fileType,url:signed.url});
    await checkpoint(ticket,{order_request_started:true,external_id:cloth.id});
    const result=await request({method:'POST',url:'https://api.printful.com/orders?confirm=false',headers:pfHeaders,body:{
      external_id:cloth.id,
      recipient:{name:cloth.shipping.name,email:cloth.email,address1:address.line1,address2:address.line2||'',
        city:address.city,state_code:address.state||'',country_code:address.country,zip:address.postal_code},
      items:[{sync_variant_id:variant.sync_variant_id,name:'TOTEHM — '+cloth.name,quantity:1,files}],
    }});
    order=result.result;
  }
  if(!order?.id||String(order.external_id)!==cloth.id)throw new Error('printful_order_mismatch');
  if(!await complete(ticket,{order_id:String(order.id),printful_status:order.status||'draft'}))throw new Error('printful_lease');
  return [{json:{ok:true,cloth_id:cloth.id,printful_order_id:String(order.id),printful_status:order.status||'draft'}}];
}catch(error){
  const code=String(error.message||'printful_failed');
  await fail(ticket,code,true);
  throw new Error('Streetwear Printful failed: '+code);
}
