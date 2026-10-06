// Manual, repeatable checks. Provider reads and a bounded private diagnostic receipt.
const hook=(await request({method:'GET',url:'https://api.printful.com/webhooks',headers:pfHeaders})).result;
const expected=N8N_URL+'/webhook/printful-product?signature='+sha256('totehm-printful-webhook-v1:'+$env.PRINTFUL_TOKEN);
const types=['product_synced','product_updated','product_deleted'];
const telegram=(await tg('getWebhookInfo',{})).result;
const health=await refreshAsset({action:'health'});
const refusal=await this.helpers.httpRequest({method:'POST',url:N8N_URL+'/webhook/printful-product',body:{type:'product_updated',data:{sync_product:{id:1}}},json:true,returnFullResponse:true,ignoreHttpStatusErrors:true});
const composeRefusal=await this.helpers.httpRequest({method:'POST',url:SB_URL+'/functions/v1/compose-artwork',body:{},json:true,returnFullResponse:true,ignoreHttpStatusErrors:true});
const composeAuth=await this.helpers.httpRequest({method:'POST',url:SB_URL+'/functions/v1/compose-artwork',headers:sbHeaders,body:{},json:true,returnFullResponse:true,ignoreHttpStatusErrors:true});
const supports=await db('totehm_cloth_support?active=eq.true&select=id,image_url');
const checks={catalogue_hook_protected:hook.url===expected,catalogue_events_present:types.every(t=>hook.types.includes(t)),unauthenticated_catalogue_rejected:refusal.statusCode===401,active_catalogue_has_photo:supports.length>0&&supports.every(s=>/^https:\/\//.test(s.image_url||'')),service_auth:health.ok===true&&await rpc('streetwear_service_ready')===true,unauthenticated_artwork_rejected:composeRefusal.statusCode===401,compose_service_auth:composeAuth.statusCode===400};
const readiness={stripe_test_key:health.stripe_test_key===true,stripe_test_webhook:health.stripe_test_webhook===true,telegram_connected:!!telegram.url,telegram_shared_key_valid:health.telegram_bot_id!==null};
const passed=Object.values(checks).every(Boolean);
// Allowlist: no URL, key, customer, address, order or provider response is stored.
await db('streetwear_events','POST',{payload:{type:'streetwear_readiness',checks,readiness,passed,compose_auth_status:Number(composeAuth.statusCode)},state:'done'});
return [{json:{passed,checks,readiness}}];
