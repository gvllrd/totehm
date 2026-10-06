const state=$input.first().json;
if(state.ok===false)return [];
try{
  const output=await (async()=>{
const SB_KEY = $env.SB_KEY;
const PRINTFUL_TOKEN = $env.PRINTFUL_TOKEN;
const PF_STORE_ID = $env.PF_STORE_ID;
const input = $input.first().json || {};
const body = input.body || {};
const isPhotoRetry = !body.type && input.image_pending === true && !!input.source_event;
const type = body.type || (isPhotoRetry ? input.source_event : undefined);
const pf_id = body.data?.sync_product?.id || (isPhotoRetry ? input.printful_product_id : undefined);
const imageRetry = isPhotoRetry ? Math.min(Number(input.image_retry || 0) + 1, 5) : 0;

const SB_URL = 'https://abujjbkbbiumxrokozph.supabase.co';
if (pf_id && !/^\d+$/.test(String(pf_id))) throw new Error('invalid_product_id');
if (type === 'package_shipped') {
  throw new Error('tracking_deployment_pending_approval');
}

const sbh = {
  apikey: SB_KEY,
  'Content-Type': 'application/json'
};

const pfh = {
  Authorization: `Bearer ${PRINTFUL_TOKEN}`,
  'X-PF-Store-Id': PF_STORE_ID
};

const BUCKET = 'totehm-cloth-support';

const slugify = s => (s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 40) || 'product';


if (type === 'product_deleted') {
  const verified = await this.helpers.httpRequest({method:'GET',url:'https://api.printful.com/store/products/'+pf_id,headers:pfh,json:true,returnFullResponse:true,ignoreHttpStatusErrors:true});
  if (verified.statusCode === 200) return [{json:{ok:true,action:'ignored',reason:'product_still_exists'}}];
  if (verified.statusCode !== 404) throw new Error('product_deletion_not_verified');
  if (!pf_id) return [{ json: { action: 'ignored', reason: 'no product id' } }];

  const support = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SB_URL}/rest/v1/totehm_cloth_support?printful_product_id=eq.${pf_id}&select=id`,
    headers: sbh, json: true
  });

  if (!support?.length) return [{ json: { action: 'not_found', printful_product_id: pf_id } }];

  const support_id = support[0].id;

  const orders = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SB_URL}/rest/v1/totehm_clothes?garment_id=eq.${support_id}&select=id&limit=1`,
    headers: sbh, json: true
  });

  if (orders?.length) {
    await this.helpers.httpRequest({
      method: 'PATCH',
      url: `${SB_URL}/rest/v1/totehm_cloth_support?id=eq.${support_id}`,
      headers: sbh, body: { active: false }, json: true
    });
    return [{ json: { action: 'deactivated', reason: 'has_orders', printful_product_id: pf_id } }];
  }

  await this.helpers.httpRequest({
    method: 'DELETE',
    url: `${SB_URL}/rest/v1/totehm_cloth_support?id=eq.${support_id}`,
    headers: sbh, json: true
  });
  return [{ json: { action: 'deleted', printful_product_id: pf_id } }];
}


if (!['product_synced', 'product_updated'].includes(type)) {
  return [{ json: { action: 'ignored', type } }];
}

if (!pf_id) return [{ json: { action: 'ignored', reason: 'no product id' } }];


const storeRes = await this.helpers.httpRequest({
  method: 'GET',
  url: `https://api.printful.com/store/products/${pf_id}`,
  headers: pfh, json: true
});

const product = storeRes.result?.sync_product;
const variants = storeRes.result?.sync_variants || [];

if (!product) throw new Error(`Printful product ${pf_id} not found`);


const variantMap = {};
for (const v of variants) {
  if (!v.size) continue;
  variantMap[v.size] = {
    variant_id: v.variant_id,
    sync_variant_id: v.id,
    retail_price: parseFloat(v.retail_price),
    availability: v.availability_status || 'active',
    color: v.color || null,
    color_code: v.color_code || null,
    files: (v.files || []).filter(f => f.type && f.type !== 'preview' && /^https:\/\//.test(String(f.url || ''))).map(f => ({type:f.type,url:f.url}))
  };
}


const catalogProductId = variants[0]?.product?.product_id;

let description = null;
let avgFulfillmentTime = null;
let techniques = [];

if (catalogProductId) {
  try {
    const catRes = await this.helpers.httpRequest({
      method: 'GET',
      url: `https://api.printful.com/products/${catalogProductId}`,
      headers: pfh, json: true
    });
    const cat = catRes.result?.product;
    description = cat?.description || null;
    avgFulfillmentTime = cat?.avg_fulfillment_time || null;
    techniques = (cat?.techniques || []).map(t => t.key).filter(Boolean);
  } catch (_) {}
}


let printArea = {
  method: techniques.includes('DTG') ? 'dtg' : 'embroidery',
  placement: 'back',
  width_in: 12, height_in: 16, dpi: 300
};

if (catalogProductId) {
  try {
    const pfRes = await this.helpers.httpRequest({
      method: 'GET',
      url: `https://api.printful.com/mockup-generator/printfiles/${catalogProductId}`,
      headers: pfh, json: true
    });
    const pfiles = pfRes.result?.printfiles || [];
    const backFile =
      pfiles.find(p =>
        p.placement?.toLowerCase().includes('back') ||
        p.type?.toLowerCase().includes('back')
      ) || pfiles[0];
    if (backFile) {
      const dpi = backFile.dpi || 300;
      printArea = {
        method: techniques.includes('DTG') ? 'dtg' : 'embroidery',
        placement: backFile.placement || backFile.type || 'back',
        width_in: backFile.width ? Math.round((backFile.width / dpi) * 10) / 10 : 12,
        height_in: backFile.height ? Math.round((backFile.height / dpi) * 10) / 10 : 16,
        dpi,
        width_px: backFile.width || null,
        height_px: backFile.height || null
      };
    }
  } catch (_) {}
}


const storageFolder = `${slugify(product.name)}-${pf_id}`;

try {
  await this.helpers.httpRequest({
    method: 'POST',
    url: `${SB_URL}/storage/v1/object/${BUCKET}/${storageFolder}/.keep`,
    headers: {
      apikey: SB_KEY,
          'Content-Type': 'text/plain',
      'x-upsert': 'true'
    },
    body: `printful_product_id: ${pf_id}\nproduct: ${product.name}`,
    json: false
  });
} catch (_) {}


const upsertData = {
  printful_product_id: pf_id,
  printful_variant_map: variantMap,
  title: product.name,
  details: description,
  print_area: printArea,
  avg_fulfillment_days: avgFulfillmentTime ? Math.ceil(avgFulfillmentTime) : null,
  storage_folder: storageFolder
};

const existing = await this.helpers.httpRequest({
  method: 'GET',
  url: `${SB_URL}/rest/v1/totehm_cloth_support?printful_product_id=eq.${pf_id}&select=id,image_url`,
  headers: sbh, json: true
});

const exists = Array.isArray(existing) && existing.length > 0;

// Keep curated product photos; use Printful's preview for new supports.
if (!existing?.[0]?.image_url && product.thumbnail_url) {
  upsertData.image_url = product.thumbnail_url;
}

if (!exists) {
  upsertData.price = 0;
  upsertData.max_pieces = 0;
  upsertData.active = false;
  upsertData.claimed = 0;
  upsertData.position = 0;
}

const synced = await this.helpers.httpRequest({
  method:'POST',url:SB_URL+'/rest/v1/rpc/streetwear_sync_catalog',
  headers:sbh,body:{p_product:{...upsertData,image_url:product.thumbnail_url || null}},json:true
});

return [{
  json: {
    ok: true,
    action: exists ? 'updated' : 'created',
    printful_product_id: pf_id,
    title: product.name,
    source_event: type,
    image_url: upsertData.image_url || existing?.[0]?.image_url || null,
    image_pending: !(upsertData.image_url || existing?.[0]?.image_url),
    image_retry: imageRetry,
    catalog_product_id: catalogProductId,
    sizes: Object.keys(variantMap),
    print_area: printArea,
    avg_fulfillment_days: avgFulfillmentTime ? Math.ceil(avgFulfillmentTime) : null,
    storage_folder: synced.storage_folder || storageFolder
  }
}];
  })();
  if(state.inbox_id)await this.helpers.httpRequest({method:'PATCH',url:'https://abujjbkbbiumxrokozph.supabase.co/rest/v1/streetwear_events?id=eq.'+state.inbox_id,headers:{apikey:$env.SB_KEY,'Content-Type':'application/json'},body:{state:'done',last_error:null},json:true});
  return output;
}catch{
  if(state.inbox_id)await this.helpers.httpRequest({method:'PATCH',url:'https://abujjbkbbiumxrokozph.supabase.co/rest/v1/streetwear_events?id=eq.'+state.inbox_id,headers:{apikey:$env.SB_KEY,'Content-Type':'application/json'},body:{last_error:'printful_event_failed',attempts:Number(state.inbox_attempts||0)+1,next_attempt_at:new Date(Date.now()+120000).toISOString()},json:true});
  throw new Error('Printful event failed; retained for retry');
}
