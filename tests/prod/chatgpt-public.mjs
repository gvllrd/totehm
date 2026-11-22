// Public production checks only: no session, account content, registration or message.
import assert from 'node:assert/strict';
const site='https://www.totehm.com',fn='https://abujjbkbbiumxrokozph.supabase.co/functions/v1/';
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
async function get(url,init={}){
 const r=await fetch(url,{redirect:'manual',...init,signal:AbortSignal.timeout(20000)});
 const text=await r.text();let data;try{data=JSON.parse(text);}catch{data=text;}
 return {r,data};
}
for(const direct of [false,true]){
 const endpoint=a=>direct?fn+'chatgpt-connector?action='+a:site+'/chatgpt-api/'+a;
 const status=await get(endpoint('status'));
 check(status.r.status===200&&status.data.ready===true,'Production connector is ready');
 check(status.data.issuer===site&&status.data.mcp_url===site+'/mcp','Canonical OAuth origin and resource');
 check(JSON.stringify(status.data.allowed_redirect_uris)===JSON.stringify(['https://chatgpt.com/connector_platform_oauth_redirect']),'Exact ChatGPT callback');
 const server=await get(direct?endpoint('oauth-server'):site+'/.well-known/oauth-authorization-server');
 check(server.r.status===200&&server.data.issuer===site&&server.data.code_challenge_methods_supported?.includes('S256'),'OAuth PKCE discovery');
 const resource=await get(direct?endpoint('oauth-resource'):site+'/.well-known/oauth-protected-resource/mcp');
 check(resource.r.status===200&&resource.data.resource===site+'/mcp'&&JSON.stringify(resource.data.scopes_supported)===JSON.stringify(['totehm:read']),'Read-only resource discovery');
 const mcp=direct?endpoint('mcp'):site+'/mcp';
 const headers={'content-type':'application/json',accept:'application/json, text/event-stream'};
 const body=JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'});
 const denied=await get(mcp,{method:'POST',headers,body});
 check(denied.r.status===401&&denied.data.error==='invalid_token','No MCP access without consented credentials');
 check(denied.r.headers.get('www-authenticate')?.includes(site+'/.well-known/oauth-protected-resource/mcp'),'MCP advertises its authentication challenge');
 const invalid=await get(mcp,{method:'POST',headers:{...headers,authorization:'Bearer th_access_public_probe_invalid'},body});
 check(invalid.r.status===401,'Unknown credentials open no account');
 const cross=await get(mcp,{method:'POST',headers:{...headers,origin:'https://untrusted.example'},body});
 check(cross.r.status===403,'An unapproved browser origin is refused');
 const connection=await get(endpoint('connection'));
 check(connection.r.status===401,'Connection status needs the member session');
 const revoke=await get(endpoint('revoke'),{method:'POST',headers:{'content-type':'application/json',origin:site},body:'{}'});
 check(revoke.r.status===401,'An unauthenticated request cannot revoke a member');
}
const reply=await get(fn+'bot-reply',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
check(reply.r.status===403,'Telegram webhook refuses a request without its secret');
const tick=await get(fn+'bot-tick',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
check(tick.r.status===403,'The scheduler refuses an unauthenticated trigger');
console.log(JSON.stringify({suite:'Production public access boundaries',checks,passed:checks,telegram_messages_sent:0,account_content_read:0}));
