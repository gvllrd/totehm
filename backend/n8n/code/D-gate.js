const input=$input.first().json,body=input.body||{};
if(!await serviceAuth(input.headers))return failResult('unauthorized',401);
if(!uuid(body.cloth_id))return failResult('cloth_id');
return ticketResult(await rpc('streetwear_claim',{p_cloth:body.cloth_id,p_stage:'printful',p_concept:null}));
