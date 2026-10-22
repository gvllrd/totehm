import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Runs exported Code nodes in memory. No network client, credentials or database connection.
const root = resolve(process.argv[2] || dirname(fileURLToPath(import.meta.url)) + '/snapshots');
const snapshots = Object.fromEntries(await Promise.all(['B','C','D','E','F','E-prepared'].map(async key =>
  [key, JSON.parse(await readFile(resolve(root, key + '.json'), 'utf8'))])));
const fake = Object.freeze({SB_KEY:'simulation-backend',PRINTFUL_TOKEN:'simulation-printful',PF_STORE_ID:'0',
  TG_TOKEN:'simulation-telegram',TG_CHAT:'7001',TG_WEBHOOK_SECRET:'simulation-webhook',TG_ADMIN_IDS:'7001',
  OPENAI_KEY:'simulation-openai',REPLICATE_KEY:'simulation-replicate',REPLICATE_VERSION:'simulation-version',RESEND_KEY:'simulation-email'});
const id = '11111111-1111-4111-8111-111111111111';
const concept = '22222222-2222-4222-8222-222222222222';
const batch = '33333333-3333-4333-8333-333333333333';
const cloth = {id,name:'0.Simulation',size:'M',garment_id:'fixture-support',style_id:'fixture-style',
  generation_batch:batch,message:'A fictional story for an offline test.',palette:['#333366'],box_snapshot:{is:['flow']},
  email:'simulation@example.invalid',shipping:{name:'Simulation',address:{line1:'Fixture street',city:'Fixture',country:'PT',postal_code:'0000-000'}}};
const concepts = Array.from({length:7}, (_,i) => ({id:i ? '44444444-4444-4444-8444-' + String(i).padStart(12,'0') : concept, position:i+1}));
const ticket = (stage, data={}) => ({ok:true,stage,token:'simulation-lease',cloth:{...cloth},concept:{id:concept},job:{data}});
const clone = value => JSON.parse(JSON.stringify(value));
const status = (code, body={}) => ({__status:code,body});
const rpcName = o => new URL(o.url).pathname.split('/rpc/')[1];
const hits = (r, text, method) => r.calls.filter(o => o.url.includes(text) && (!method || (o.method || 'GET') === method));
const callback = (action='pick', changes={}) => ({headers:{'x-telegram-bot-api-secret-token':fake.TG_WEBHOOK_SECRET},
  body:{callback_query:{id:'fixture-callback',data:action+':'+(action==='pick'?concept:id),from:{id:7001},
    message:{message_id:42,chat:{id:7001}},...changes}}});
const internal = body => ({headers:{apikey:fake.SB_KEY},body});
const signature = createHash('sha256').update('totehm-printful-webhook-v1:'+fake.PRINTFUL_TOKEN).digest('hex');
const productEvent = (type='product_updated') => ({query:{signature},body:{type,data:{sync_product:{id:123}}}});
const support = {title:'Fixture garment',print_area:{method:'dtg',placement:'back'},printful_variant_map:{M:{sync_variant_id:55,
  files:[{type:'front',url:'https://fixture.invalid/front.png'},{type:'back',url:'https://fixture.invalid/old.png'}]}}};
const syncProduct = {result:{sync_product:{id:123,name:'Fixture garment',thumbnail_url:'https://fixture.invalid/photo.png'},
  sync_variants:[{id:55,variant_id:66,size:'M',retail_price:'170',product:{product_id:77},files:[]}]}};

async function execute(key, nodeName, input={}, responder=()=>undefined, env={}, published=false) {
  const graph = published ? snapshots[key].activeVersion : snapshots[key];
  const node = graph.nodes.find(n => n.name === nodeName);
  assert.ok(node, key + ': missing node ' + nodeName);
  const calls=[], unexpected=[];
  const httpRequest = async options => {
    const o = {...options,method:options.method || 'GET'};
    calls.push(clone({...o,body:Buffer.isBuffer(o.body)?'<fixture bytes>':o.body}));
    let value = await responder(o);
    if(value === undefined && rpcName(o) === 'streetwear_service_ready') value=o.headers?.apikey===fake.SB_KEY;
    if(value === undefined && ['streetwear_checkpoint','streetwear_complete','streetwear_fail'].includes(rpcName(o))) value=true;
    if(value === undefined) {unexpected.push(o.method+' '+o.url);throw new Error('Unconfigured simulated request');}
    if(value?.__transport) throw new Error('Simulated transport failure');
    const code=value?.__status || 200, body=value?.__status ? value.body : value;
    if(o.returnFullResponse) return {statusCode:code,body:clone(body)};
    if(code>=400 && !o.ignoreHttpStatusErrors) throw new Error('Simulated HTTP '+code);
    return clone(body);
  };
  const context = vm.createContext({$env:{...fake,...env},$input:{first:()=>({json:clone(input)})},
    $json:clone(input),Buffer,URL,console:{log(){},warn(){},error(){}}}, {codeGeneration:{strings:false,wasm:false}});
  const fn = new vm.Script('(async function(){\n'+node.parameters.jsCode+'\n})', {filename:key+'-'+nodeName+'.js'})
    .runInContext(context,{timeout:2000});
  let result,error;
  try {result=clone(await fn.call({helpers:{httpRequest}}));} catch(e) {error=String(e.message);}
  assert.deepEqual(unexpected, [], 'All simulated requests must be declared');
  return {result,error,calls};
}
const nodeNames={B:'Generate seven concepts or notify',C:'Upscale and compose',D:'Create or recover Printful draft',E:'Update DB + Email',F:'Sync Product'};
const gate = (key,input,responder,env) => execute(key,'Authenticate and claim',input,responder,env);
const processNode = (key,input,responder,env) => execute(key,nodeNames[key],input,responder,env);
const ok = r => {assert.equal(r.error,undefined);return r.result?.[0]?.json;};
const failed = (r, text) => assert.ok(r.error?.includes(text), 'Expected error '+text+', got '+r.error);
const queueResponder = o => {
  if(o.url.includes('/cloth_concepts?')) return [{cloth_id:id}];
  if(o.url.includes('/streetwear_jobs?')) return [{state:'done',data:{curation_message_id:42}}];
};
const generationResponder = (o, number=7) => {
  if(o.url.includes('/totehm_cloth_support?')) return [support];
  if(o.url.includes('/artistic_styles?')) return [{name:'Fixture style'}];
  if(o.url.includes('/images/generations')) return {data:Array.from({length:number},()=>({b64_json:'cG5n'}))};
  if(o.url.includes('/storage/v1/object/sign/')) return {signedURL:'/object/sign/fixture?token=simulation'};
  if(o.url.includes('/storage/v1/object/')) return {};
  if(o.url.endsWith('/cloth_concepts')) return {};
  if(o.url.includes('/webhook/')) return {ok:true};
};
const tracking = {id:88,external_id:id,status:'fulfilled',shipments:[{tracking_number:'FIXTURE',tracking_url:'https://fixture.invalid/tracking'}]};
const preparedTrackingResponder = o => {
  if(o.url.includes('/totehm_clothes?') && o.method==='GET') return [{...cloth,test:false,printful_order_id:'88'}];
  if(o.url.includes('api.printful.com/orders/88')) return {result:tracking};
  if(rpcName(o)==='streetwear_claim') return ticket('tracking');
  if(o.url.includes('/totehm_clothes?') && o.method==='PATCH') return {};
};
const catalogueResponder = (o, product=syncProduct, existing=[{id:'fixture-support',image_url:'https://fixture.invalid/curated.png'}]) => {
  if(o.url.includes('/store/products/')) return product;
  if(o.url.includes('/products/77')) return {result:{product:{description:'Fixture',techniques:[{key:'DTG'}]}}};
  if(o.url.includes('/printfiles/77')) return {result:{printfiles:[{placement:'back',width:3600,height:4800,dpi:300}]}};
  if(o.url.includes('/storage/v1/object/')) return {};
  if(o.url.includes('/totehm_cloth_support?') && o.method==='GET') return existing;
  if(rpcName(o)==='streetwear_sync_catalog') return {storage_folder:'fixture-123'};
  if(o.url.includes('/streetwear_events?') && o.method==='PATCH') return {};
};
const tests=[], findings=[];
function test(name, fn) {tests.push({name,fn});}

for(const key of ['B','D']) {
  test(key+' rejects an anonymous request without provider calls', async()=>{
    const r=await gate(key,{body:{cloth_id:id}});assert.equal(ok(r).http_status,401);assert.equal(r.calls.length,0);
  });
  test(key+' rejects an invalid backend key', async()=>{
    const r=await gate(key,{headers:{apikey:'invalid'},body:{cloth_id:id}});assert.equal(ok(r).http_status,401);assert.equal(hits(r,'streetwear_claim').length,0);
  });
  test(key+' validates the cloth identifier before claiming work', async()=>{
    const r=await gate(key,internal({cloth_id:'invalid'}));assert.equal(ok(r).reason,'cloth_id');assert.equal(hits(r,'streetwear_claim').length,0);
  });
  for(const reason of ['test_blocked','unpaid','already_claimed']) test(key+' honors a '+reason+' database refusal', async()=>{
    const r=await gate(key,internal({cloth_id:id}),o=>rpcName(o)==='streetwear_claim'?{ok:false,reason}:undefined);
    assert.equal(ok(r).reason,reason);const p=await processNode(key,ok(r));assert.deepEqual(p.result,[]);assert.equal(p.calls.length,0);
  });
}
test('B selects the notify stage explicitly',async()=>{
  const r=await gate('B',internal({cloth_id:id,stage:'notify'}),o=>rpcName(o)==='streetwear_claim'?ticket(o.body.p_stage):undefined);
  assert.equal(ok(r).stage,'notify');assert.equal(hits(r,'streetwear_claim')[0].body.p_stage,'notify');
});
test('C rejects a forged callback',async()=>{const r=await gate('C',{body:callback().body});assert.equal(ok(r).http_status,401);assert.equal(r.calls.length,0);});
test('C restricts callbacks to the curator',async()=>{const r=await gate('C',callback('pick',{from:{id:9001}}));assert.equal(ok(r).reason,'curator_only');assert.equal(r.calls.length,0);});
test('C rejects buttons from an old Telegram message',async()=>{
  const r=await gate('C',callback('pick',{message:{message_id:99,chat:{id:7001}}}),queueResponder);
  assert.equal(ok(r).reason,'stale_button');assert.equal(hits(r,'streetwear_claim').length,0);
});
test('C claims the selected concept with its cloth',async()=>{
  const r=await gate('C',callback(),o=>queueResponder(o)??(rpcName(o)==='streetwear_claim'?ticket('curation'):undefined));
  assert.equal(ok(r).stage,'curation');assert.equal(hits(r,'streetwear_claim')[0].body.p_concept,concept);
});
test('C declines a duplicate choice before upscale',async()=>{
  const r=await gate('C',callback(),o=>queueResponder(o)??(rpcName(o)==='streetwear_claim'?{ok:false,reason:'already_claimed'}:o.url.includes('/answerCallbackQuery')?{ok:true}:undefined));
  assert.equal(ok(r).ok,false);const p=await processNode('C',ok(r));assert.equal(p.calls.length,0);
});
test('C queues REGEN and invokes generation once',async()=>{
  const r=await gate('C',callback('regen'),o=>queueResponder(o)??(rpcName(o)==='streetwear_regenerate'?true:undefined));
  const p=await processNode('C',ok(r),o=>o.url.includes('/answerCallbackQuery')||o.url.includes('/webhook/')?{ok:true}:undefined);
  assert.equal(ok(p).route,'regen');assert.equal(hits(p,'streetwear-generate').length,1);assert.equal(hits(p,'replicate.com').length,0);
});
test('C does not resume without a selected concept',async()=>{
  const r=await gate('C',internal({resume_cloth_id:id}),o=>o.url.includes('/totehm_clothes?')?[{selected_concept_id:null}]:undefined);
  assert.equal(ok(r).reason,'not_selected');assert.equal(hits(r,'streetwear_claim').length,0);
});
test('F rejects an unsigned event',async()=>{const r=await gate('F',{body:productEvent().body});assert.equal(ok(r).http_status,401);assert.equal(r.calls.length,0);});
test('F stores only the minimal signed provider payload',async()=>{
  const input=productEvent();input.body.data.customer_email='discard@example.invalid';input.body.data.extra='discard';
  const r=await gate('F',input,o=>o.url.endsWith('/streetwear_events')?[{id:1}]:undefined);
  assert.equal(ok(r).http_status,202);assert.deepEqual(hits(r,'/streetwear_events')[0].body.payload,productEvent().body);
});
test('F ignores unrelated signed events',async()=>{const r=await gate('F',productEvent('unrelated'));assert.equal(ok(r).body.type,'ignored');assert.equal(r.calls.length,0);});
test('F validates the provider product identifier',async()=>{const input=productEvent();input.body.data.sync_product.id='invalid';const r=await gate('F',input);assert.equal(ok(r).reason,'entity_id');});
test('F refuses to replay a completed inbox event',async()=>{
  const r=await gate('F',internal({type:'product_updated',_inbox_id:1}),o=>o.url.includes('/streetwear_events?')?[]:undefined);
  assert.equal(ok(r).reason,'event_done');
});
test('B generates and persists exactly seven concepts before notify',async()=>{
  const r=await processNode('B',ticket('generation'),generationResponder);assert.equal(ok(r).stage,'generation');
  assert.equal(hits(r,'/images/generations')[0].body.n,7);assert.equal(hits(r,'/storage/v1/object/streetwear-generations/','POST').length,7);
  assert.equal(hits(r,'/cloth_concepts','POST')[0].body.length,7);assert.equal(hits(r,'streetwear-generate').length,1);
  assert.ok(r.calls.findIndex(o=>rpcName(o)==='streetwear_checkpoint')<r.calls.findIndex(o=>o.url.includes('/images/generations')));
});
test('B rejects an incomplete generation batch',async()=>{
  const r=await processNode('B',ticket('generation'),o=>generationResponder(o,6));failed(r,'seven_images_required');
  assert.equal(hits(r,'/cloth_concepts','POST').length,0);assert.equal(hits(r,'streetwear_fail')[0].body.p_retry,false);
});
test('B records a generation provider error without automatic regeneration',async()=>{
  const r=await processNode('B',ticket('generation'),o=>o.url.includes('/images/generations')?status(429):generationResponder(o));
  failed(r,'http_429');assert.equal(hits(r,'streetwear_fail')[0].body.p_retry,false);assert.equal(hits(r,'/images/generations').length,1);
});
test('B cannot proceed without generation configuration',async()=>{
  const r=await processNode('B',ticket('generation'),generationResponder,{OPENAI_KEY:''});failed(r,'generation_configuration');assert.equal(hits(r,'/images/generations').length,0);
});
const notifyResponder=o=>o.url.includes('/cloth_concepts?')?concepts:o.url.includes('/streetwear-assets')?{url:'https://fixture.invalid/concept.png'}:
  o.url.includes('/sendMediaGroup')?{ok:true,result:[]}:o.url.includes('/sendMessage')?{ok:true,result:{message_id:42}}:undefined;
test('B offers seven choices and REGEN after a simulated media delivery',async()=>{
  const r=await processNode('B',ticket('notify'),notifyResponder);assert.equal(ok(r).stage,'notify');
  const rows=hits(r,'/sendMessage')[0].body.reply_markup.inline_keyboard;assert.equal(rows[0].length,7);assert.equal(rows[1][0].text,'REGEN');
});
test('B notification retry preserves an already sent media group',async()=>{
  const r=await processNode('B',ticket('notify',{media_sent:true}),notifyResponder);ok(r);assert.equal(hits(r,'/sendMediaGroup').length,0);assert.equal(hits(r,'/sendMessage').length,1);
});
const composeResponder=o=>o.url.includes('/streetwear-assets')?{url:'https://fixture.invalid/concept.png'}:
  o.url.includes('/compose-artwork')?{print_url:'https://fixture.invalid/print.png',final_url:'https://fixture.invalid/final.png',storage_path:id+'/final.png'}:
  o.url.includes('/webhook/')?{ok:true}:undefined;
test('C checkpoints a pending upscale and stops before composition',async()=>{
  const r=await processNode('C',ticket('curation'),o=>o.url.endsWith('/predictions')?{id:'prediction-fixture',status:'processing'}:composeResponder(o));
  assert.equal(ok(r).pending,true);assert.equal(hits(r,'/compose-artwork').length,0);assert.equal(hits(r,'streetwear_checkpoint').at(-1).body.p_wait,true);
});
test('C resumes an existing prediction without purchasing another',async()=>{
  const r=await processNode('C',ticket('curation',{prediction_id:'prediction-fixture'}),o=>o.url.includes('/predictions/prediction-fixture')?{id:'prediction-fixture',status:'succeeded',output:'https://replicate.delivery/fixture.png'}:composeResponder(o));
  ok(r);assert.equal(hits(r,'/predictions','POST').length,0);assert.equal(hits(r,'/compose-artwork').length,1);assert.equal(hits(r,'streetwear-printful').length,1);
});
test('C stops when a previous upscale creation has an unknown outcome',async()=>{
  const r=await processNode('C',ticket('curation',{prediction_request_started:true}));failed(r,'prediction_outcome_unknown');assert.equal(hits(r,'replicate.com').length,0);
});
test('C records a terminal upscale failure',async()=>{
  const r=await processNode('C',ticket('curation',{prediction_id:'prediction-fixture'}),o=>o.url.includes('/predictions/')?{id:'prediction-fixture',status:'failed'}:undefined);
  failed(r,'prediction_failed');assert.equal(hits(r,'streetwear_fail')[0].body.p_retry,false);
});
test('C reuses the cached upscale for composition',async()=>{
  const r=await processNode('C',ticket('curation',{upscaled_url:'https://replicate.delivery/fixture.png'}),composeResponder);ok(r);assert.equal(hits(r,'replicate.com').length,0);assert.equal(hits(r,'/compose-artwork').length,1);
});
const orderResponder=o=>o.url.includes('/orders/@')?status(404):o.url.includes('/totehm_cloth_support?')?[support]:
  o.url.includes('/streetwear-assets')?{url:'https://fixture.invalid/print.png'}:o.url.includes('/orders?confirm=false')?{result:{id:88,external_id:id,status:'draft'}}:undefined;
test('D creates only a draft and keeps other print placements',async()=>{
  const r=await processNode('D',ticket('printful'),orderResponder);assert.equal(ok(r).printful_status,'draft');
  const created=hits(r,'/orders?','POST');assert.equal(created.length,1);assert.ok(created[0].url.endsWith('confirm=false'));
  assert.equal(created[0].body.items[0].files.find(f=>f.type==='front').url,'https://fixture.invalid/front.png');
  assert.equal(created[0].body.items[0].files.find(f=>f.type==='back').url,'https://fixture.invalid/print.png');
});
test('D recovers the existing order without creating another',async()=>{
  const r=await processNode('D',ticket('printful'),o=>o.url.includes('/orders/@')?{result:{id:88,external_id:id,status:'draft'}}:undefined);
  ok(r);assert.equal(hits(r,'api.printful.com','POST').length,0);
});
test('D rejects an order belonging to a different cloth',async()=>{
  const r=await processNode('D',ticket('printful'),o=>o.url.includes('/orders/@')?{result:{id:88,external_id:'different',status:'draft'}}:undefined);
  failed(r,'printful_order_mismatch');assert.equal(hits(r,'streetwear_complete').length,0);
});
test('D stops after an uncertain previous order creation',async()=>{
  const r=await processNode('D',ticket('printful',{order_request_started:true}),o=>o.url.includes('/orders/@')?status(404):undefined);
  failed(r,'printful_outcome_unknown');assert.equal(hits(r,'api.printful.com','POST').length,0);
});
test('D rejects an incomplete shipping address',async()=>{
  const t=ticket('printful');t.cloth.shipping={};const r=await processNode('D',t,orderResponder);failed(r,'shipping_missing');assert.equal(hits(r,'api.printful.com','POST').length,0);
});
test('F synchronizes metadata without resetting commercial fields',async()=>{
  const r=await processNode('F',{...productEvent(),inbox_id:1},catalogueResponder);assert.equal(ok(r).action,'updated');
  const data=hits(r,'streetwear_sync_catalog')[0].body.p_product;
  for(const key of ['price','max_pieces','active','claimed'])assert.equal(Object.hasOwn(data,key),false);
  assert.equal(ok(r).image_url,'https://fixture.invalid/curated.png');assert.equal(ok(r).image_pending,false);
});
test('F leaves a newly imported garment inactive and unpriced',async()=>{
  const r=await processNode('F',productEvent(),o=>catalogueResponder(o,syncProduct,[]));assert.equal(ok(r).action,'created');
  const data=hits(r,'streetwear_sync_catalog')[0].body.p_product;assert.equal(data.price,0);assert.equal(data.max_pieces,0);assert.equal(data.active,false);
});
test('F limits missing-photo retries to five',async()=>{
  const product=clone(syncProduct);product.result.sync_product.thumbnail_url=null;
  const r=await processNode('F',{image_pending:true,image_retry:4,source_event:'product_updated',printful_product_id:123},o=>catalogueResponder(o,product,[]));
  const state=ok(r);assert.equal(state.image_retry,5);assert.equal(state.image_pending,true);
  const condition=snapshots.F.nodes.find(n=>n.type==='n8n-nodes-base.if').parameters.conditions.conditions[0].leftValue;
  assert.equal(vm.runInNewContext(condition.slice(3,-2).trim(),{$json:state}),false);
});
test('F verifies a deletion against Printful before changing the catalogue',async()=>{
  const r=await processNode('F',productEvent('product_deleted'),o=>o.url.includes('/store/products/')?{}:undefined);
  assert.equal(ok(r).reason,'product_still_exists');assert.equal(hits(r,'/rest/').length,0);
});
test('F deactivates a removed product that already has orders',async()=>{
  const r=await processNode('F',productEvent('product_deleted'),o=>o.url.includes('/store/products/')?status(404):
    o.url.includes('/totehm_cloth_support?')?(o.method==='GET'?[{id:'fixture-support'}]:{}):o.url.includes('/totehm_clothes?')?[{id}]:undefined);
  assert.equal(ok(r).action,'deactivated');assert.equal(hits(r,'/totehm_cloth_support?','PATCH')[0].body.active,false);assert.equal(hits(r,'/rest/','DELETE').length,0);
});
test('F retains a failed event for recovery',async()=>{
  const r=await processNode('F',{...productEvent(),inbox_id:1,inbox_attempts:1},o=>o.url.includes('/store/products/')?{__transport:true}:o.url.includes('/streetwear_events?')?{}:undefined);
  failed(r,'retained for retry');const update=hits(r,'/streetwear_events?','PATCH')[0].body;assert.equal(update.attempts,2);assert.equal(update.state,undefined);
});
test('Prepared E rejects an anonymous shipping event',async()=>{const r=await gate('E-prepared',{body:{type:'package_shipped',data:{order:{id:88}}}});assert.equal(ok(r).http_status,401);assert.equal(r.calls.length,0);});
test('Prepared E blocks a TEST cloth before contacting Printful',async()=>{
  const r=await gate('E-prepared',internal({type:'package_shipped',data:{order:{id:88}}}),o=>o.url.includes('/totehm_clothes?')?[{...cloth,test:true}]:undefined);
  assert.equal(ok(r).reason,'test_blocked');assert.equal(hits(r,'api.printful.com').length,0);
});
test('Prepared E verifies ownership and the real tracking response',async()=>{
  const r=await gate('E-prepared',internal({type:'package_shipped',data:{order:{id:88},shipment:{tracking_url:'https://untrusted.invalid'}}}),preparedTrackingResponder);
  assert.equal(ok(r).tracking_url,tracking.shipments[0].tracking_url);const patch=hits(r,'/totehm_clothes?','PATCH')[0];assert.ok(patch.url.includes('test=eq.false'));
});
test('Prepared E refuses an order mismatch without marking it shipped',async()=>{
  const r=await gate('E-prepared',internal({type:'package_shipped',data:{order:{id:88}}}),o=>o.url.includes('api.printful.com/orders/88')?{result:{...tracking,external_id:'different'}}:preparedTrackingResponder(o));
  assert.equal(ok(r).reason,'order_mismatch');assert.equal(hits(r,'/totehm_clothes?','PATCH').length,0);
});
test('Prepared E refuses a duplicate event before changing shipping state',async()=>{
  const r=await gate('E-prepared',internal({type:'package_shipped',data:{order:{id:88}}}),o=>rpcName(o)==='streetwear_claim'?{ok:false,reason:'already_claimed'}:preparedTrackingResponder(o));
  assert.equal(ok(r).ok,false);assert.equal(hits(r,'/totehm_clothes?','PATCH').length,0);
});
test('Prepared E sends an escaped, idempotent simulated email',async()=>{
  const t={...ticket('tracking'),tracking_url:'https://fixture.invalid/?x="unsafe"',tracking_number:'<fixture>'};
  const r=await execute('E-prepared','Send verified tracking',t,o=>o.url.includes('api.resend.com')?{id:'fixture-email'}:undefined);ok(r);
  const email=hits(r,'api.resend.com')[0];assert.equal(email.headers['Idempotency-Key'],'streetwear-shipped-'+id);
  assert.ok(email.body.html.includes('&lt;fixture&gt;'));assert.equal(email.body.html.includes('<fixture>'),false);
});

// Findings are reported separately from passing simulations. They never turn the pipeline green.
for(const key of ['B','C','D','E'])test('Detect published '+key+' legacy runtime failure',async()=>{
  const r=await execute(key,'⚙️ CONFIG',{},()=>undefined,{},true);failed(r,'process is not defined');
  findings.push({workflow:key,severity:'blocker',code:'published_legacy_config',detail:'Published CONFIG requires process.env in a runtime without process.'});
});
test('Detect current E accepting an unverified shipping event',async()=>{
  const r=await processNode('E',{body:{type:'package_shipped',data:{order:{id:88},shipment:{tracking_number:'FIXTURE',tracking_url:'https://untrusted.invalid'}}}},
    o=>o.url.includes('/totehm_clothes?')?(o.method==='GET'?[{...cloth,test:true}]:{}):o.url.includes('api.resend.com')?{id:'fixture-email'}:undefined);
  ok(r);assert.equal(hits(r,'/totehm_clothes?','PATCH').length,1);assert.equal(hits(r,'api.printful.com').length,0);
  findings.push({workflow:'E',severity:'blocker',code:'draft_tracking_unverified',detail:'Current E draft accepts an unsigned event and TEST cloth, updates shipping and attempts an email. All effects were simulated.'});
});
test('Detect F shipment routing explicitly held back',async()=>{
  const r=await processNode('F',{body:{type:'package_shipped',data:{order:{id:88}}}});failed(r,'retained for retry');assert.equal(r.calls.length,0);
  findings.push({workflow:'F/E',severity:'blocker',code:'tracking_not_deployed',detail:'Current F process refuses package_shipped while tracking deployment is pending.'});
});

const results=[];
for(const {name,fn} of tests){try{await fn();results.push({name,passed:true});}catch(error){results.push({name,passed:false,error:String(error.message)});}}
const report={scope:'Offline exported n8n Code nodes; external services and database RPCs are simulated.',
  snapshot_versions:Object.fromEntries(Object.entries(snapshots).map(([key,w])=>[key,{workflowId:w.workflowId||w.id,versionId:w.versionId,activeVersionId:w.activeVersionId}])),
  passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,findings,checks:results,
  limitations:['Does not prove actual PostgreSQL locking or provider integration.','Prepared E is from Git commit 7bdd1223c2469f0d9bf5f3108e6959ad4dd27fb2; it is not deployed.','No real payment, provider request, Telegram message, email or Printful order is sent.']};
await writeFile(resolve(root,'../results.json'),JSON.stringify(report,null,2)+'\n');
for(const failure of results.filter(r=>!r.passed))console.error(failure.name+': '+failure.error);
console.log(JSON.stringify({passed:report.passed,failed:report.failed,blockers:findings.length,report:resolve(root,'../results.json')}));
process.exitCode=report.failed?1:0;
