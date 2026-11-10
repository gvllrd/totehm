import {
  ProtocolError, MCP_PROTOCOL_VERSION, READ_SCOPE, normalizeEndpoints, authorizationServerMetadata,
  protectedResourceMetadata, authenticationChallenge, validateRegistration, validateAuthorization,
  validateTokenRequest, bearerToken, validateOrigin, randomOpaque, hashOpaque, parseJsonRpc,
  jsonRpcResult, jsonRpcError, initializeResult, isObject,
} from './chatgpt-protocol.ts';
import { CONTEXT_DESCRIPTION } from './higher-gpt.ts';
import { ContextReadError, retrieveContext, retrieveElement, getSpots, getSounds, getMediaMetadata, validElementRef, HABIT_REF_MAX } from './chatgpt-context.ts';

import {retrieveEcosystem,readMember,listSubscribedMembers,memberMedia,clubSpots} from './chatgpt-ecosystem.ts';
import {enrichPersonalResources,enrichMemberResources} from './chatgpt-resources.ts';
type DB = any;
export type ConnectorConfig = { publicOrigin:string; allowedRedirectUris:string[]; enabled:boolean };
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const kinds=['habit','objective','repulsion','vision','wisdom'];
const ints=['fight','flow','enrich','focus','express','celebrate','love'];
const annotations={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
const schema=(properties:unknown,required:string[])=>({type:'object',properties,required,additionalProperties:false});
const elementProps={kind:{type:'string',enum:kinds},ref:{type:'string',minLength:1,maxLength:HABIT_REF_MAX,description:'Exact reference returned by retrieval. Habits preserve up to 16000 UTF-16 units; other kinds still require their UUID or numeric identifier.'}};
const textOffset={type:'integer',minimum:0,maximum:64000,description:'Continue an exact element at its returned next_text_offset; no offset for its first page.'};
const contextProps={
 query:{type:'string',minLength:1,maxLength:1000},
 purpose:{type:'string',enum:['action','direction','replacement','explicit']},
 intentions:{type:'array',items:{type:'string',enum:ints},maxItems:7,description:'Canonical intentions inferred from meaning in any language; omit when unknown.'},
 kinds:{type:'array',items:{type:'string',enum:kinds},maxItems:5,description:'Starting views; connected explanatory elements may have other kinds.'},
 search_terms:{type:'array',items:{type:'string',minLength:1,maxLength:120},maxItems:8,description:'Salient topic phrases, translated to record language if needed. [] for broad requests. No function words. No match returns empty.'},
 include_resources:{type:'boolean',description:'When useful for a personal next step, include a bounded bundle of metadata for media attached to selected elements and current/upcoming spots tied to selected Habits. No pixels, playback, GPS or global Club search. Omitted elements are explicit; read an exact element to deepen it.'},
 include_tracking:{type:'boolean',description:'Only for relevant personal practice questions. Read the owner’s self-report summaries after a separate explicit sharing choice in TOTEHM. Never member tracking or raw private notes; no answer is unknown.'},
 tracking_days:{type:'integer',enum:[7,28],default:28,description:'Reporting window shared with the dashboard, only read when include_tracking is true. 7 for this week, 28 for a longer review. Counts are self reports, not all planned practice.'},
 include_sound:{type:'boolean',description:'Include the owner’s saved sound descriptions and exact playlist URLs for selected intentions when useful.'},
 exclude:{type:'array',maxItems:12,items:schema(elementProps,['kind','ref']),description:'Exact starting elements already declined or infeasible in this conversation. Retrieve alternatives without changing saved priorities; explanatory links may still mention them.'},
 limit:{type:'integer',minimum:1,maximum:12},
};
export const CHATGPT_TOOLS=[
  {name:'get_context',description:CONTEXT_DESCRIPTION,inputSchema:schema({...contextProps,review:{type:'boolean',description:'Only for an explicit personal system review, with purpose explicit. Return active-view counts and missing recorded connections; incomplete sources never establish a missing link. Optional choices, not scores or diagnoses.'}},['query','purpose']),annotations},
  {name:'read_element',description:'Read an exact personal element and its recorded links. Returns up to 4000 characters of its original text, next_text_offset for continuation, and a URL to open it in TOTEHM. Follow text_truncated before interpreting a story. Do not guess references or enumerate an account without an explicit request.',inputSchema:schema({...elementProps,text_offset:textOffset,include_resources:contextProps.include_resources,include_tracking:contextProps.include_tracking,tracking_days:contextProps.tracking_days,limit:{type:'integer',minimum:1,maximum:12}},['kind','ref']),annotations},
  {name:'list_spots',description:'Use to retrieve the person’s own published Spots when relevant to a current plan. Historical or future Spots are not evidence of present location or completed practice. No GPS coordinates are returned. Do not use for public venue opening hours.',inputSchema:schema({period:{type:'string',enum:['now','past','future']},habit_ref:{type:'string',minLength:1,maxLength:HABIT_REF_MAX,description:'Exact reference returned by retrieval. Habits preserve up to 16000 UTF-16 units; other kinds still require their UUID or numeric identifier.'},limit:{type:'integer',minimum:1,maximum:12}},['period']),annotations},
  {name:'get_sound',description:'Use when the person requests the sound saved for an intention or it is useful to their chosen activity. Returns their saved sound description and optional exact playlist URL. Sound belongs to an intention, shared by its habits. Offer a clickable link when useful; do not invent a missing URL, claim to have listened, or autoplay or use for unrelated music advice.',inputSchema:schema({intention:{type:'string',enum:ints}},['intention']),annotations},
  {name:'get_media',description:'Use to find metadata of media attached to an exact personal element. No image pixels, file paths, signed URLs or media analysis are provided. Do not claim to have seen a photo.',inputSchema:schema({...elementProps,limit:{type:'integer',minimum:1,maximum:12}},['kind','ref']),annotations},
  {name:'get_ecosystem_context',description:CONTEXT_DESCRIPTION+' Also return relevant inspiration from active subscribed members, always attributed separately; include_sound is the owner’s music only. Each call searches at most eight subscriptions; continue next_subscription_offset to search beyond the first batch. Never describe a partial search as the whole ecosystem.',inputSchema:schema({...contextProps,member:{type:'string',minLength:1,maxLength:80},subscription_offset:{type:'integer',minimum:0,maximum:10000}},['query','purpose']),annotations},
  {name:'list_subscriptions',description:'List active subscribed TOTEHM member names. Use pagination to select a member, then retrieve relevant connections or exact boxes. This is not the user’s fan list.',inputSchema:schema({offset:{type:'integer',minimum:0,maximum:10000},limit:{type:'integer',minimum:1,maximum:12}},[]),annotations},
  {name:'read_member_element',description:'Read an exact shared element, its original text in pages of 4000 characters and its visible links from an active subscribed member. Continue next_text_offset if present. References must come from that member’s retrieved context. Private or expired-subscription content is unavailable. The URL opens the original; it never copies it.',inputSchema:schema({...elementProps,member:{type:'string',minLength:1,maxLength:80},text_offset:textOffset,include_resources:contextProps.include_resources,limit:{type:'integer',minimum:1,maximum:12}},['member','kind','ref']),annotations},
  {name:'get_member_media',description:'Read metadata of media attached to an exact authorized subscribed-member box. Does not send pixels or download URLs. Never claim to have seen an image or watched a video.',inputSchema:schema({...elementProps,member:{type:'string',minLength:1,maxLength:80},limit:{type:'integer',minimum:1,maximum:12}},['member','kind','ref']),annotations},
  {name:'list_club_spots',description:'Find published Figher Club spots from all members that this user is permitted to see. Filter by period, supported intentions and an explicitly supplied city, habit or member; paginate with offset. Private and unentitled subscriber spots are excluded. A plan is not proof of actual presence. No coordinates or media files.',inputSchema:schema({period:{type:'string',enum:['now','past','future']},intentions:contextProps.intentions,city:{type:'string',maxLength:120},habit_ref:{type:'string',maxLength:HABIT_REF_MAX},member:{type:'string',maxLength:80},offset:{type:'integer',minimum:0,maximum:10000},limit:{type:'integer',minimum:1,maximum:12}},['period']),annotations},
].map(tool=>({...tool,securitySchemes:[{type:'oauth2',scopes:[READ_SCOPE]}],_meta:{securitySchemes:[{type:'oauth2',scopes:[READ_SCOPE]}]}}));

async function textBody(req:Request,max=16384){
  const reader=req.body?.getReader();if(!reader)return '';
  const decoder=new TextDecoder();let text='',size=0;
  while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>max){await reader.cancel();throw new ProtocolError('request_too_large','Request too large',413);}text+=decoder.decode(r.value,{stream:true});}
  return text+decoder.decode();
}
async function jsonBody(req:Request){if(!req.headers.get('content-type')?.includes('application/json'))throw new ProtocolError('invalid_request','JSON required',415);try{return JSON.parse(await textBody(req));}catch(e){if(e instanceof ProtocolError)throw e;throw new ProtocolError('invalid_request');}}
function ensureUUID(id:unknown){if(typeof id!=='string'||!UUID.test(id))throw new ProtocolError('invalid_request');return id;}
function check(result:any){if(result.error)throw new ProtocolError('temporarily_unavailable','Unavailable',503);return result.data;}
function scalar(value:unknown,max=1000){if(typeof value!=='string'||!value.trim()||value.length>max)throw new ProtocolError('invalid_params');return value;}
function argsOnly(args:unknown,allowed:string[]){if(!isObject(args)||Object.keys(args).some(k=>!allowed.includes(k)))throw new ProtocolError('invalid_params');return args;}
function limit(value:unknown){if(value===undefined)return 6;if(!Number.isInteger(value)||Number(value)<1||Number(value)>12)throw new ProtocolError('invalid_params');return Number(value);}
function focus(args:Record<string,unknown>){const f={kind:args.kind,ref:args.ref};if(!validElementRef(f))throw new ProtocolError('invalid_params');return f;}
const ECOSYSTEM_TOOLS=new Set(['get_ecosystem_context','list_subscriptions','read_member_element','get_member_media','list_club_spots']);
function resourceFlag(value:unknown){if(value===undefined||value===false)return false;if(value!==true)throw new ProtocolError('invalid_params');return true;}
function offset(value:unknown){if(value===undefined)return 0;if(!Number.isInteger(value)||Number(value)<0||Number(value)>10000)throw new ProtocolError('invalid_params');return Number(value);}
async function challengeFor(verifier:string){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}

/** Factory isolates HTTP behavior for integration tests. db is a SERVER-ONLY service client. */
export function createConnectorHandler(db:DB,config:ConnectorConfig){
 const endpoints=normalizeEndpoints(config.publicOrigin);
 const allowedOrigins=[endpoints.issuer,'https://chatgpt.com','https://chat.openai.com'];
 const redirectAllowed=(uri:string)=>config.allowedRedirectUris.includes(uri);
 async function ready(){if(!config.enabled||!config.allowedRedirectUris.length)return false;try{const r=await db.from('chatgpt_clients').select('client_id').limit(1);return !r.error;}catch{return false;}}
 async function siteUser(req:Request){
   // A site session authenticates consent/revocation only; never the MCP endpoint.
   // Browsers omit Origin on a same-origin GET. Mutations always require it;
   // the read-only connection status still requires a verified site session.
   if((req.method!=='GET'||req.headers.has('origin'))&&req.headers.get('origin')!==endpoints.issuer)throw new ProtocolError('invalid_origin','Same-origin consent required',403);
   const token=bearerToken(req.headers);if(!token||token.startsWith('th_'))throw new ProtocolError('unauthorized','Sign in',401);
   const result=await db.auth.getUser(token);const u=result.data?.user;
   if(result.error||!u||u.is_anonymous)throw new ProtocolError('unauthorized','Sign in with your TOTEHM',401);
   return u;
 }
 async function activeToken(req:Request){
   const token=bearerToken(req.headers);
   if(!token?.startsWith('th_access_'))throw new ProtocolError('invalid_token','Connect TOTEHM',401);
   const row=check(await db.from('chatgpt_tokens').select('kind,expires_at,grant:chatgpt_grants!inner(id,user_id,client_id,scope,resource,revoked_at)').eq('token_hash',await hashOpaque(token)).maybeSingle());
   const g=row?.grant;
   if(!row||row.kind!=='access'||!Number.isFinite(Date.parse(row.expires_at))||Date.parse(row.expires_at)<=Date.now()||!g||g.revoked_at||g.resource!==endpoints.resource||!Array.isArray(g.scope)||g.scope.length!==1||g.scope[0]!==READ_SCOPE)throw new ProtocolError('invalid_token','Connect TOTEHM',401);
   // Checking grants on every request makes revocation immediate; no auth cache.
   const consent=await db.from('chatgpt_ecosystem_consents').select('version').eq('grant_id',g.id).maybeSingle();
   return {...g,ecosystem:!consent.error&&consent.data?.version===1};
 }
 async function client(id:string){const row=check(await db.from('chatgpt_clients').select('client_id,name,redirect_uris').eq('client_id',ensureUUID(id)).maybeSingle());if(!row)throw new ProtocolError('invalid_client');return {...row,client_name:row.name,scope:READ_SCOPE};}
 async function request(id:string){const row=check(await db.from('chatgpt_requests').select('*').eq('id',ensureUUID(id)).maybeSingle());if(!row||row.used_at||Date.parse(row.expires_at)<=Date.now()||!redirectAllowed(row.redirect_uri))throw new ProtocolError('invalid_request','Expired request');return row;}
 async function withTracking(result:any,requested:unknown,grant:any,whole=false,days:unknown=28){
   if(days!==7&&days!==28)throw new ProtocolError('invalid_params');
   if(requested===undefined||requested===false)return result;
   if(requested!==true)throw new ProtocolError('invalid_params');
   const refs=[...new Set<string>((result.items??[]).filter((i:any)=>i.kind==='habit').map((i:any)=>i.ref))].slice(0,12);
   const read=await db.rpc('chatgpt_tracking_period',{p_grant:grant.id,p_days:days,p_habits:whole?null:refs});
   return {...result,practice:read.error?{available:false,why:'temporarily_unavailable'}:read.data};
 }
 async function callTool(name:unknown,raw:unknown,uid:string,grant:any){
   if(ECOSYSTEM_TOOLS.has(String(name))&&!grant.ecosystem)throw new ProtocolError('ecosystem_consent_required');
   if(name==='get_ecosystem_context'){const a=argsOnly(raw,['query','purpose','member','limit','intentions','kinds','search_terms','include_sound','exclude','subscription_offset','include_tracking','tracking_days','include_resources']);const resources=resourceFlag(a.include_resources);const query=scalar(a.query);if(!['action','direction','replacement','explicit'].includes(String(a.purpose)))throw new ProtocolError('invalid_params');const context=await retrieveEcosystem(db,grant.id,uid,{query,purpose:a.purpose as any,limit:limit(a.limit),intentions:a.intentions as string[]|undefined,kinds:a.kinds as any,search_terms:a.search_terms as string[]|undefined,include_sound:a.include_sound as boolean|undefined,exclude:a.exclude as any},a.member===undefined?undefined:scalar(a.member,80),offset(a.subscription_offset));const personal=await enrichPersonalResources(db,uid,await withTracking(context.personal,a.include_tracking,grant,false,a.tracking_days),resources);if(!resources)return {...context,personal};const members=await Promise.all(context.members.map(async(m:any,i:number)=>i<2?enrichMemberResources(db,grant.id,m.source.member,m,true,grant.ecosystem):m));return {...context,personal,members,resource_coverage:{attempted_members:Math.min(2,members.length),selected_members:members.length,all_selected_members_requested:members.length<=2,complete:members.length<=2&&members.every((m:any)=>m.resources?.complete===true)}};}
   if(name==='list_subscriptions'){const a=argsOnly(raw,['offset','limit']);return listSubscribedMembers(db,grant.id,offset(a.offset),limit(a.limit));}
   if(name==='read_member_element'){const a=argsOnly(raw,['member','kind','ref','limit','text_offset','include_resources']);const resources=resourceFlag(a.include_resources),member=scalar(a.member,80);const context=await readMember(db,grant.id,member,{query:'',purpose:'explicit',focus:focus(a),limit:limit(a.limit),text_offset:a.text_offset as number|undefined});return enrichMemberResources(db,grant.id,context.source.member,context,resources,grant.ecosystem);}
   if(name==='get_member_media'){const a=argsOnly(raw,['member','kind','ref','limit']);return memberMedia(db,grant.id,scalar(a.member,80),focus(a),limit(a.limit));}
   if(name==='list_club_spots'){const a=argsOnly(raw,['period','intentions','city','habit_ref','member','offset','limit']);if(!['now','past','future'].includes(String(a.period))||(a.intentions!==undefined&&(!Array.isArray(a.intentions)||a.intentions.length>7||a.intentions.some(i=>!ints.includes(i)))))throw new ProtocolError('invalid_params');return clubSpots(db,grant.id,{period:a.period,intentions:a.intentions,city:a.city===undefined?undefined:scalar(a.city,120),habit_ref:a.habit_ref===undefined?undefined:scalar(a.habit_ref,HABIT_REF_MAX),member:a.member===undefined?undefined:scalar(a.member,80),offset:offset(a.offset),limit:limit(a.limit)});}
   if(name==='get_context'){const a=argsOnly(raw,['query','purpose','limit','intentions','kinds','search_terms','include_sound','exclude','review','include_tracking','tracking_days','include_resources']);const resources=resourceFlag(a.include_resources);const query=scalar(a.query);if(!['action','direction','replacement','explicit'].includes(String(a.purpose)))throw new ProtocolError('invalid_params');const context=await retrieveContext(db,uid,{query,purpose:a.purpose as any,limit:limit(a.limit),intentions:a.intentions as string[]|undefined,kinds:a.kinds as any,search_terms:a.search_terms as string[]|undefined,include_sound:a.include_sound as boolean|undefined,exclude:a.exclude as any,review:a.review as boolean|undefined});return enrichPersonalResources(db,uid,await withTracking(context,a.include_tracking,grant,a.review===true,a.tracking_days),resources);}
   if(name==='read_element'){const a=argsOnly(raw,['kind','ref','limit','text_offset','include_tracking','tracking_days','include_resources']);const resources=resourceFlag(a.include_resources);const context=await retrieveElement(db,uid,focus(a),limit(a.limit),a.text_offset as number|undefined);return enrichPersonalResources(db,uid,await withTracking(context,a.include_tracking,grant,false,a.tracking_days),resources);}
   if(name==='list_spots'){const a=argsOnly(raw,['period','habit_ref','limit']);if(!['now','past','future'].includes(String(a.period)))throw new ProtocolError('invalid_params');return getSpots(db,uid,{period:a.period as any,habit_ref:a.habit_ref===undefined?undefined:scalar(a.habit_ref,HABIT_REF_MAX),limit:limit(a.limit)});}
   if(name==='get_sound'){const a=argsOnly(raw,['intention']);if(!ints.includes(String(a.intention)))throw new ProtocolError('invalid_params');return getSounds(db,uid,[String(a.intention)]);}
   if(name==='get_media'){const a=argsOnly(raw,['kind','ref','limit']);return getMediaMetadata(db,uid,focus(a),{limit:limit(a.limit)});}
   throw new ProtocolError('unknown_tool');
 }
 return async function handle(req:Request):Promise<Response>{
  const url=new URL(req.url),route=url.pathname.split('/').filter(Boolean).at(-1)||'';
  const action=route==='chatgpt-connector'?(url.searchParams.get('action')||'mcp'):route;
  const headers=new Headers({'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','vary':'Origin'});
  const origin=req.headers.get('origin');if(origin&&allowedOrigins.includes(origin))headers.set('access-control-allow-origin',origin);
  headers.set('access-control-expose-headers','WWW-Authenticate,MCP-Protocol-Version');
  const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:new Headers([...headers,['content-type','application/json']])});
  const mcp=action==='mcp';
  try{
   validateOrigin(req.headers,allowedOrigins);
   if(req.method==='OPTIONS'){headers.set('access-control-allow-methods','GET,POST,OPTIONS');headers.set('access-control-allow-headers','Authorization,Content-Type,Accept,MCP-Protocol-Version');return new Response(null,{status:204,headers});}
   if(req.method==='GET'&&action==='oauth-resource')return json(protectedResourceMetadata(endpoints));
   if(req.method==='GET'&&action==='oauth-server')return json(authorizationServerMetadata(endpoints));
   if(req.method==='GET'&&action==='status')return json({ready:await ready(),issuer:endpoints.issuer,mcp_url:endpoints.resource,allowed_redirect_uris:config.allowedRedirectUris});
   if(!(await ready()))return json({error:'temporarily_unavailable'},503);
   if(req.method==='POST'&&action==='register'){
    // Aggregate limits avoid persisting IP addresses; admission is still governed by exact callback allowlist.
    const recent=await db.from('chatgpt_clients').select('client_id',{count:'exact',head:true}).gte('created_at',new Date(Date.now()-600000).toISOString());
    if(recent.error)throw new ProtocolError('temporarily_unavailable','Unavailable',503);
    if((recent.count||0)>=100)return json({error:'temporarily_unavailable'},429);
    const value=validateRegistration(await jsonBody(req),config.allowedRedirectUris);
    const id=crypto.randomUUID();check(await db.from('chatgpt_clients').insert({client_id:id,name:value.client_name,redirect_uris:value.redirect_uris}));
    return json({...value,client_id:id,client_id_issued_at:Math.floor(Date.now()/1000)},201);
   }
   if(req.method==='GET'&&action==='authorize'){
    const c=await client(url.searchParams.get('client_id')||'');const a=validateAuthorization(url.searchParams,c,endpoints.resource);
    if(!redirectAllowed(a.redirect_uri))throw new ProtocolError('invalid_request');
    const recent=await db.from('chatgpt_requests').select('id',{count:'exact',head:true}).eq('client_id',c.client_id).gte('expires_at',new Date().toISOString());
    if(recent.error)throw new ProtocolError('temporarily_unavailable','Unavailable',503);if((recent.count||0)>=30)return json({error:'temporarily_unavailable'},429);
    const id=crypto.randomUUID();check(await db.from('chatgpt_requests').insert({id,client_id:c.client_id,redirect_uri:a.redirect_uri,code_challenge:a.code_challenge,scope:[a.scope],state:a.state,resource:endpoints.resource}));
    headers.set('location',endpoints.issuer+'/chatgpt?request_id='+id);return new Response(null,{status:302,headers});
   }
   if(req.method==='GET'&&action==='request'){
    const r=await request(url.searchParams.get('id')||'');const c=await client(r.client_id);
    return json({app_name:c.name,scopes:r.scope,expires_at:r.expires_at});
   }
   if(req.method==='GET'&&action==='connection'){
    const u=await siteUser(req);const rows=check(await db.from('chatgpt_tokens').select('grant_id,grant:chatgpt_grants!inner(user_id,client_id,revoked_at)').eq('grant.user_id',u.id).is('grant.revoked_at',null).is('used_at',null).gt('expires_at',new Date().toISOString()).limit(30));
    const ids=rows.map((r:any)=>r.grant_id);
    const consents=ids.length?await db.from('chatgpt_ecosystem_consents').select('grant_id').in('grant_id',ids).eq('version',1):{data:[]};
    return json({connected:rows.length>0,ecosystem_connected:!consents.error&&!!consents.data?.length});
   }
   if(req.method==='POST'&&action==='token'){
    if(!req.headers.get('content-type')?.includes('application/x-www-form-urlencoded'))throw new ProtocolError('invalid_request','Form required',415);
    const a=validateTokenRequest(new URLSearchParams(await textBody(req)),endpoints.resource);
    const access=randomOpaque('th_access_'),refresh=randomOpaque('th_refresh_');
    const params=a.grant_type==='authorization_code'?{p_code_hash:await hashOpaque(a.code),p_client_id:ensureUUID(a.client_id),p_redirect_uri:a.redirect_uri,p_challenge:await challengeFor(a.code_verifier),p_resource:endpoints.resource,p_access_hash:await hashOpaque(access),p_refresh_hash:await hashOpaque(refresh)}
      :{p_refresh_hash:await hashOpaque(a.refresh_token),p_client_id:ensureUUID(a.client_id),p_resource:endpoints.resource,p_access_hash:await hashOpaque(access),p_next_refresh_hash:await hashOpaque(refresh)};
    const r=check(await db.rpc(a.grant_type==='authorization_code'?'chatgpt_exchange_code':'chatgpt_refresh',params));
    if(!r?.ok)throw new ProtocolError(r?.error||'invalid_grant');
    headers.set('pragma','no-cache');return json({access_token:access,refresh_token:refresh,token_type:'Bearer',scope:READ_SCOPE,expires_in:r.expires_in});
   }
   if(req.method==='POST'&&action==='revoke'&&req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')){
    const form=new URLSearchParams(await textBody(req)),token=form.get('token'),cid=form.get('client_id');
    if(token&&cid&&UUID.test(cid)){
      const row=check(await db.from('chatgpt_tokens').select('grant:chatgpt_grants!inner(id,user_id,client_id)').eq('token_hash',await hashOpaque(token)).maybeSingle());
      if(row?.grant?.client_id===cid)check(await db.rpc('chatgpt_revoke',{p_user:row.grant.user_id,p_client_id:cid}));
    }
    return new Response(null,{status:200,headers});
   }
   if(req.method==='POST'&&(action==='authorize'||action==='revoke')){
    const u=await siteUser(req);const b=await jsonBody(req);if(!isObject(b))throw new ProtocolError('invalid_request');
    if(action==='revoke'){const c=b.client_id==null?null:ensureUUID(b.client_id);check(await db.rpc('chatgpt_revoke',{p_user:u.id,p_client_id:c}));return json({ok:true});}
    const r=await request(String(b.request_id||''));const code=randomOpaque('th_code_');
    const result=check(await db.rpc('chatgpt_authorize_ecosystem',{p_request:r.id,p_user:u.id,p_code_hash:await hashOpaque(code)}));
    if(!result?.ok||!redirectAllowed(result.redirect_uri))throw new ProtocolError(result?.error||'invalid_request');
    const redirect=new URL(result.redirect_uri);redirect.searchParams.set('code',code);redirect.searchParams.set('state',result.state);redirect.searchParams.set('iss',endpoints.issuer);
    return json({redirect_url:redirect.href});
   }
   if(mcp){
    if(req.method==='GET'||req.method==='DELETE'){headers.set('allow','POST,OPTIONS');return json({error:'method_not_allowed'},405);}
    if(req.method!=='POST')return json({error:'method_not_allowed'},405);
    const granted=await activeToken(req);
    const protocol=req.headers.get('mcp-protocol-version');
    const accept=req.headers.get('accept')||'';if(!accept.includes('application/json')||!accept.includes('text/event-stream'))return json({error:'invalid_request'},406);
    let message;try{message=parseJsonRpc(await jsonBody(req));}catch(e){return json(jsonRpcError(null,-32600,'Invalid Request'),400);}
    if(protocol&&protocol!==MCP_PROTOCOL_VERSION&&message.method!=='initialize')throw new ProtocolError('invalid_request','Unsupported MCP version');
    if(message.id===undefined)return new Response(null,{status:202,headers});
    if(message.method==='initialize')return json(jsonRpcResult(message.id,initializeResult()));
    if(message.method==='ping')return json(jsonRpcResult(message.id,{}));
    if(message.method==='tools/list')return json(jsonRpcResult(message.id,{tools:CHATGPT_TOOLS.filter(t=>granted.ecosystem||!ECOSYSTEM_TOOLS.has(t.name))}));
    if(message.method==='tools/call'){
     try{const result=await callTool(message.params?.name,message.params?.arguments??{},granted.user_id,granted);return json(jsonRpcResult(message.id,{structuredContent:result,content:[{type:'text',text:JSON.stringify(result)}]}));}
     catch(e){if(e instanceof ProtocolError&&e.code==='ecosystem_consent_required')return json(jsonRpcResult(message.id,{isError:true,content:[{type:'text',text:'Reconnect TOTEHM from ChatGPT to authorize subscribed-member and Club context. Existing personal access remains available.'}]}));if((e instanceof ContextReadError&&e.code==='invalid_request')||(e instanceof ProtocolError&&['invalid_params','unknown_tool'].includes(e.code)))return json(jsonRpcError(message.id,-32602,'Invalid tool arguments'));return json(jsonRpcResult(message.id,{isError:true,content:[{type:'text',text:'TOTEHM context is temporarily unavailable. Continue without inventing personal information.'}]}));}
    }
    return json(jsonRpcError(message.id,-32601,'Method not found'));
   }
   return json({error:'not_found'},404);
  }catch(e){
   const err=e instanceof ProtocolError?e:new ProtocolError('temporarily_unavailable','Unavailable',503);
   if(mcp&&err.status===401)headers.set('www-authenticate',authenticationChallenge(endpoints,'invalid_token'));
   return json({error:err.code},err.status);
  }
 };
}
