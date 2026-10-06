const ticket=$input.first().json;
if(!ticket.ok)return [];
try{
  const result=await request({method:'POST',url:'https://api.resend.com/emails',
    headers:{Authorization:'Bearer '+$env.RESEND_KEY,'Content-Type':'application/json',
      'Idempotency-Key':'streetwear-shipped-'+ticket.cloth.id},body:{
      from:'TOTEHM <totehm@higher.boutique>',to:[ticket.cloth.email],subject:'Your TOTEHM Cloth is on its way.',
      html:'<p>Your physical garment has been encoded and shipped.</p><p>Track its arrival here: <a href="'+
        escapeHtml(ticket.tracking_url)+'">'+escapeHtml(ticket.tracking_number)+'</a></p><p>— TOTEHM</p>',
    }});
  if(!result.id)throw new Error('tracking_email');
  await complete(ticket,{email_id:result.id});
  return [{json:{ok:true,cloth_id:ticket.cloth.id}}];
}catch(error){
  const code=String(error.message||'tracking_failed');await fail(ticket,code,true);
  throw new Error('Streetwear tracking failed: '+code);
}
