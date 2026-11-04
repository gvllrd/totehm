// HTTP + actual OAuth SQL integration, isolated PostgreSQL WASM and synthetic site sessions.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createConnectorHandler} from '../../backend/supabase/functions/_shared/chatgpt-server.ts';
import {hashOpaque} from '../../backend/supabase/functions/_shared/chatgpt-protocol.ts';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const pg=new PGlite();let checks=0;
const check=(v,msg)=>{assert(v,msg);checks++;};
const ORIGIN='https://www.totehm.com',BASE=ORIGIN+'/functions/v1/chatgpt-connector',CALLBACK='https://chatgpt.example.test/oauth/callback',RESOURCE=ORIGIN+'/mcp';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',O='33333333-3333-4333-8333-333333333333';
const data={totehms:[{user_id:A,steps:[{t:'Draw ten minutes',is:['express'],f:'every_evening'}]},{user_id:B,steps:[{t:'Private other member habit'}]}],objectives:[{user_id:A,id:O,text:'Finish my sketchbook',status:'active',target_at:null}],objective_habits:[{user_id:A,objective_id:O,habit_text:'Draw ten minutes'}],repulsions:[],visions:[],wisdom:[],repulsion_habits:[],objective_visions:[],repulsion_teachings:[],teaching_objectives:[],habit_spots:[],spot_plans:[],intention_music:[],element_media:[]};
const tableName=n=>{assert(/^[a-z_]+$/.test(n));return 'public.'+n;};
class Query{
 constructor(table){this.table=table;this.filters=[];this.n=Infinity;}
 select(columns,opts){this.columns=columns;this.opts=opts;return this;}
 insert(value){this.value=value;return this;}
 eq(k,v){this.filters.push([k,x=>x===v]);return this;}
 is(k,v){this.filters.push([k,x=>x===v]);return this;}
 gt(k,v){this.filters.push([k,x=>x>v]);return this;}
 gte(k,v){this.filters.push([k,x=>x>=v]);return this;}
 in(k,v){this.filters.push([k,x=>v.includes(x)]);return this;}
 order(k,{ascending=true}={}){this.sort=[k,ascending];return this;}
 limit(n){this.n=n;return this;}
 maybeSingle(){this.single=true;return this;}
 async run(){try{
  let rows;
  if(this.table.startsWith('chatgpt_')){
   if(this.value){const keys=Object.keys(this.value);keys.forEach(k=>assert(/^[a-z_]+$/.test(k)));rows=(await pg.query(`insert into ${tableName(this.table)} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,keys.map(k=>this.value[k]))).rows;}
   else rows=(await pg.query('select * from '+tableName(this.table))).rows;
   if(this.table==='chatgpt_tokens')for(const row of rows)row.grant=(await pg.query('select * from public.chatgpt_grants where id=$1',[row.grant_id])).rows[0];
  }else rows=structuredClone(data[this.table]||[]);
  rows=JSON.parse(JSON.stringify(rows));
  rows=rows.filter(row=>this.filters.every(([key,test])=>test(key.split('.').reduce((v,k)=>v?.[k],row))));
  if(this.sort){const [k,asc]=this.sort;rows.sort((a,b)=>String(a[k]??'').localeCompare(String(b[k]??''))*(asc?1:-1));}
  const count=rows.length;rows=rows.slice(0,this.n);return {data:this.opts?.head?null:this.single?(rows[0]||null):rows,error:null,count};
 }catch(e){return {data:null,error:{message:e.message}};}}
 then(ok,no){return this.run().then(ok,no);}
}
const db={from:table=>new Query(table),auth:{getUser:async token=>token==='site-session-A-valid-credential'?{data:{user:{id:A,is_anonymous:false}},error:null}:{data:{user:null},error:{message:'bad'}}},rpc:async(name,args)=>{try{const keys=Object.keys(args);assert(/^[a-z_]+$/.test(name));const result=await pg.query(`select public.${name}(${keys.map((k,i)=>k+'=> $'+(i+1)).join(',')}) as result`,keys.map(k=>args[k]));return {data:result.rows[0].result,error:null};}catch(e){return {data:null,error:{message:e.message}};}}};
const handler=createConnectorHandler(db,{publicOrigin:ORIGIN,enabled:true,allowedRedirectUris:[CALLBACK]});
async function send(path,{method='GET',body,site=false,token,form=false,headers={}}={}){
 const h=new Headers(headers);if(site){h.set('origin',ORIGIN);h.set('authorization','Bearer site-session-A-valid-credential');}if(token)h.set('authorization','Bearer '+token);
 if(body!==undefined)h.set('content-type',form?'application/x-www-form-urlencoded':'application/json');
 const r=await handler(new Request(BASE+path,{method,headers:h,body:body===undefined?undefined:form?new URLSearchParams(body):JSON.stringify(body)}));
 const text=await r.text();return {status:r.status,headers:r.headers,data:text?JSON.parse(text):null};
}
const verifier='dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',challenge='E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const mcpHeaders={accept:'application/json, text/event-stream','mcp-protocol-version':'2025-06-18'};
const tool=(token,name,args)=>send('/mcp',{method:'POST',token,headers:mcpHeaders,body:{jsonrpc:'2.0',id:3,method:'tools/call',params:{name,arguments:args}}});
try{
 await pg.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values ('${A}'),('${B}');`);
 await pg.exec(await readFile(new URL('../../backend/supabase/migrations/20261101090000_chatgpt_connector.sql',import.meta.url),'utf8'));
 await pg.exec(await readFile(new URL('../../backend/supabase/migrations/20261104140000_chatgpt_ecosystem.sql',import.meta.url),'utf8'));
 const status=(await send('?action=status')).data;check(status.ready&&status.issuer===ORIGIN,'Ready only after migration and configuration, with canonical issuer');
 const disabled=createConnectorHandler(db,{publicOrigin:ORIGIN,enabled:true,allowedRedirectUris:[]});
 check((await (await disabled(new Request(BASE+'?action=status'))).json()).ready===false,'No guessed callback enables the connector');
 let r=await send('/oauth-resource');check(r.data.resource===RESOURCE&&r.data.scopes_supported[0]==='totehm:read','RFC9728 exact resource metadata');
 r=await send('/oauth-server');check(r.data.issuer===ORIGIN&&r.data.authorization_response_iss_parameter_supported===true,'Advertise RFC9207 issuer identification for the stable ChatGPT callback');
 r=await send('/mcp',{method:'POST',headers:mcpHeaders,body:{jsonrpc:'2.0',id:1,method:'initialize'}});check(r.status===401&&r.headers.get('www-authenticate').includes('oauth-protected-resource/mcp'),'MCP challenges unauthenticated callers');
 r=await send('/mcp',{method:'POST',token:'site-session-A-valid-credential',headers:mcpHeaders,body:{jsonrpc:'2.0',id:1,method:'tools/list'}});check(r.status===401,'A normal site session cannot authenticate MCP');
 r=await send('/register',{method:'POST',body:{redirect_uris:['https://evil.example/callback']}});check(r.status===400,'Reject untrusted registration callback');
 r=await send('/register',{method:'POST',body:{redirect_uris:[CALLBACK],client_name:'Fixture ChatGPT'}});check(r.status===201&&!r.data.client_secret,'DCR public client without secret');const cid=r.data.client_id;
 const query=new URLSearchParams({response_type:'code',client_id:cid,redirect_uri:CALLBACK,code_challenge:challenge,code_challenge_method:'S256',scope:'totehm:read',resource:RESOURCE,state:'fixed-fixture-state'});
 let redirect=await handler(new Request(BASE+'/authorize?'+query));check(redirect.status===302,'Start OAuth authorization');
 const consent=new URL(redirect.headers.get('location'));check(consent.pathname==='/chatgpt'&&!consent.searchParams.has('code'),'Only opaque request ID reaches consent UI');const rid=consent.searchParams.get('request_id');
 r=await send('?action=request&id='+rid);check(r.data.app_name==='Fixture ChatGPT'&&r.data.scopes[0]==='totehm:read','Consent loads authoritative request metadata');
 r=await send('?action=authorize',{method:'POST',body:{request_id:rid}});check(r.status===403,'No implicit consent without origin/session');
 r=await send('?action=authorize',{method:'POST',site:true,body:{request_id:rid}});check(r.status===200,'Explicit consent under site session');const granted=new URL(r.data.redirect_url),code=granted.searchParams.get('code');check(granted.origin+granted.pathname===CALLBACK&&granted.searchParams.get('state')==='fixed-fixture-state','Return code and exact state to registered callback');
 check(granted.searchParams.getAll('iss').length===1&&granted.searchParams.get('iss')===ORIGIN,'RFC9207 authorization response carries the exact advertised issuer');
 check((await send('?action=connection',{site:true})).data.connected===false,'Unredeemed consent is not called connected');
 check((await send('?action=connection',{token:'site-session-A-valid-credential'})).status===200,'Same-origin browser GET needs no Origin header, with verified session');
 check((await send('?action=connection',{token:'site-session-A-valid-credential',headers:{origin:'https://evil.example'}})).status===403,'Connection status rejects an explicitly untrusted Origin');
 check((await send('?action=revoke',{method:'POST',token:'site-session-A-valid-credential',body:{}})).status===403,'Session-bearing mutations still require the trusted Origin');
 const exchange={grant_type:'authorization_code',client_id:cid,redirect_uri:CALLBACK,resource:RESOURCE,code_verifier:verifier,code};
 r=await send('/token',{method:'POST',form:true,body:{...exchange,code_verifier:'X'.repeat(43)}});check(r.data.error==='invalid_grant','Wrong PKCE cannot redeem code');
 r=await send('/token',{method:'POST',form:true,body:exchange});check(r.status===200&&r.data.access_token.startsWith('th_access_'),'Exchange creates isolated opaque access token');let access=r.data.access_token,refresh=r.data.refresh_token;
 check(r.data.scope==='totehm:read'&&!access.includes('.'),'No general JWT/Supabase session is exposed');
 check((await send('?action=connection',{site:true})).data.connected===true,'Connection confirmed only after token exchange');
 r=await send('/mcp',{method:'POST',token:access,headers:mcpHeaders,body:{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18'}}});check(r.data.result.protocolVersion==='2025-06-18','MCP initialize negotiates supported protocol');
 r=await send('/mcp',{method:'POST',token:access,headers:mcpHeaders,body:{jsonrpc:'2.0',method:'notifications/initialized'}});check(r.status===202,'MCP notifications acknowledged without JSON-RPC response');
 r=await send('/mcp',{method:'POST',token:access,headers:mcpHeaders,body:{jsonrpc:'2.0',id:2,method:'tools/list'}});check(r.data.result.tools.length===10&&r.data.result.tools.every(t=>t.annotations.readOnlyHint),'Ten read-only tools, no publish/write tools');
 r=await tool(access,'get_context',{query:'draw',purpose:'action',limit:6});const context=r.data.result.structuredContent;check(context.items.some(x=>x.text==='Draw ten minutes'),'Tool returns the authenticated owner’s Habit');check(context.edges.some(x=>x.relation==='serves'),'Tool preserves recorded relationship provenance');check(!JSON.stringify(context).includes('Private other member'),'No other member data returned');
 const gid=(await pg.query('select grant_id from public.chatgpt_tokens where token_hash=$1',[await hashOpaque(access)])).rows[0].grant_id;
 await pg.query('delete from public.chatgpt_ecosystem_consents where grant_id=$1',[gid]);
 const legacy=await send('/mcp',{method:'POST',token:access,headers:mcpHeaders,body:{jsonrpc:'2.0',id:2,method:'tools/list'}});
 check(legacy.data.result.tools.length===5,'Old grants retain only owner tools');
 const denied=await tool(access,'get_ecosystem_context',{query:'draw',purpose:'action'});
 check(denied.data.result.isError&&denied.data.result.content[0].text.includes('Reconnect'),'Broader access requires explicit renewed consent');
 await pg.query('insert into public.chatgpt_ecosystem_consents(grant_id,version) values ($1,1)',[gid]);
 r=await tool(access,'get_context',{query:'draw',purpose:'action',user_id:B});check(r.data.error.code===-32602,'User ID supplied in arguments rejected');
 r=await tool(access,'publish_spot',{});check(r.data.error.code===-32602,'No undeclared write tool');
 r=await send('/mcp',{method:'POST',token:access,headers:{...mcpHeaders,origin:'https://evil.example'},body:{jsonrpc:'2.0',id:1,method:'tools/list'}});check(r.status===403,'Untrusted browser Origin rejected');
 r=await send('/token',{method:'POST',form:true,body:{grant_type:'refresh_token',client_id:cid,resource:RESOURCE,refresh_token:refresh}});check(r.status===200&&r.data.refresh_token!==refresh,'Refresh token rotated');const nextAccess=r.data.access_token,nextRefresh=r.data.refresh_token;
 r=await send('/token',{method:'POST',form:true,body:{grant_type:'refresh_token',client_id:cid,resource:RESOURCE,refresh_token:refresh}});check(r.data.error==='invalid_grant','Refresh replay rejected and grant revoked');
 r=await tool(nextAccess,'get_context',{query:'draw',purpose:'action'});check(r.status===401,'Refresh replay invalidates the token family');
 check((await send('?action=connection',{site:true})).data.connected===false,'Revoked grant no longer appears connected');
 const stored=await pg.query('select token_hash from public.chatgpt_tokens');check(stored.rows.every(x=>/^[a-f0-9]{64}$/.test(x.token_hash))&&!JSON.stringify(stored.rows).includes(nextRefresh),'Only hashes stored');
 // A second grant exercises RFC7009 revoke separately from browser-session revoke.
 redirect=await handler(new Request(BASE+'/authorize?'+query));const rid2=new URL(redirect.headers.get('location')).searchParams.get('request_id');
 const grant2=await send('?action=authorize',{method:'POST',site:true,body:{request_id:rid2}});const code2=new URL(grant2.data.redirect_url).searchParams.get('code');
 const pair2=await send('/token',{method:'POST',form:true,body:{...exchange,code:code2}});
 r=await send('/revoke',{method:'POST',form:true,body:{client_id:cid,token:pair2.data.refresh_token}});check(r.status===200,'RFC7009 token revocation supported');
 r=await tool(pair2.data.access_token,'get_context',{query:'draw',purpose:'action'});check(r.status===401,'RFC7009 revoke immediately blocks access');
 r=await send('/token',{method:'POST',form:true,body:exchange});check(r.data.error==='invalid_grant','Authorization code replay rejected');
 console.log(checks+' HTTP/OAuth/MCP integration checks passed');
}finally{await pg.close();}
