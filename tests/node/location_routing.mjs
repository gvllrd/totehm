import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import handler from '../../space/api/location.js';
const config=JSON.parse(await readFile(new URL('../../space/vercel.json',import.meta.url)));
// Vercel's public clean URLs are distinct from the source filenames. Its
// index document is exposed at /, as in the actual static filesystem router.
const publicFiles=new Map((await readdir(new URL('../../space/',import.meta.url))).filter(name=>name.endsWith('.html')).map(name=>[name==='index.html'?'/':'/'+(config.cleanUrls?name.slice(0,-5):name),name]));
let checks=0;const check=(condition,message)=>{assert(condition,message);checks++;};
function request(country,method='GET',otherHeaders={}){
 const response={headers:{},code:0,body:null,setHeader(key,value){this.headers[key.toLowerCase()]=value;},status(value){this.code=value;return this;},end(body){this.body=body;return this;}};
 handler({method,headers:{...otherHeaders,...(country===undefined?{}:{'x-vercel-ip-country':country})}},response);
 return response;
}
for(const country of ['PT','US','FR','BR',undefined,'','ZZ','pt','PT, US',['PT'],'PT\r\nX-Test: yes']){
 const response=request(country),body=JSON.parse(response.body),portugal=country==='PT';
 check(response.code===200,'Country inspection succeeds without a member session');
 check(body.city===(portugal?'lisbon':'new-york')&&body.path===(portugal?'/lisbon-space':'/new-york'),'Portugal alone selects Lisbon; other/absent country selects New York');
 check(body.country===(typeof country==='string'&&/^[A-Z]{2}$/.test(country)?country:null),'Malformed or multiple header values are not reflected');
 check(body.precise===false&&body.source==='vercel-ip-country','The source is explicitly IP country, without a precise-location claim');
 check(/no-store/.test(response.headers['cache-control'])&&response.headers['vercel-cdn-cache-control']==='no-store','Country response is never shared in caches');
 check(!/latitude|longitude|address|email/.test(response.body),'No coordinates, IP address or member data is returned');
}
check(request(undefined,'GET',{'x-forwarded-for':'193.136.0.1','x-country':'PT','cf-ipcountry':'PT'}).body.includes('"new-york"'),'Other providers/client IP headers never determine the country');
check(request('PT','HEAD').code===200&&request('PT','HEAD').body===undefined,'HEAD does not send a response body');
check(request('PT','POST').code===405&&request('PT','POST').headers.allow==='GET, HEAD','The diagnostic does not accept writes');

// Apply Vercel's first-match selection to real public entry points. Query
// pass-through is Vercel's default when destinations contain no query string;
// fragment inheritance is the browser's redirect behavior, so neither is rebuilt.
function redirect(path,country,query=''){
 const params=new URLSearchParams(query);
 return config.redirects.find(rule=>rule.source===path&&(rule.has||[]).every(condition=>condition.type==='header'?condition.key==='x-vercel-ip-country'&&country===condition.value:condition.type==='query'&&params.has(condition.key)));
}
for(const path of ['/','/index.html']){
 for(const country of ['PT','US','FR',undefined]){
  const rule=redirect(path,country,'sso=abc&state=pkce&return=%2Forigins');
  check(rule.destination===(country==='PT'?'/lisbon-space':'/new-york'),'Actual ordered redirect config maps each country correctly');
  check(rule.permanent===false&&!rule.destination.includes('?')&&!rule.destination.includes('#'),'A temporary redirect preserves query/SSO fragment and never pins a country permanently');
 }
 for(const key of ['embed','spot','u','v','habit','take']){
  check(redirect(path,'PT',key+'=example').destination==='/social','Social entry takes precedence over country selection in Portugal');
  check(redirect(path,'US',key+'=example').destination==='/social','Social entry takes precedence over country selection elsewhere');
 }
 const headers=config.headers.find(rule=>rule.source===path).headers;
 check(headers.some(header=>header.key==='Cache-Control'&&header.value.includes('no-store'))&&headers.some(header=>header.key==='Vary'&&header.value==='X-Vercel-IP-Country'),'Geographic entry redirects explicitly prevent cross-country cache reuse');
}
for(const path of ['/lisbon-space','/new-york']){
 check(!redirect(path,'PT')&&!redirect(path,'US'),'An explicit space URL bypasses geographic redirects without a loop');
 const destination=config.rewrites.find(rule=>rule.source===path)?.destination;
 check(publicFiles.get(destination)==='index.html','Both places target the publicly exposed index document under cleanUrls');
 check((await readFile(new URL('../../space/'+publicFiles.get(destination),import.meta.url),'utf8')).includes('src="/gallery-ui.mjs"'),'The resolved public target contains the actual gallery entry, not an absent file');
}
check(redirect('/lisbon','PT')?.destination==='/play_lisbon_street','Existing Lisbon artwork route remains intact');
check(config.rewrites.some(rule=>rule.source==='/s/:id'&&rule.destination==='/api/card?id=:id'),'Shared card route remains intact');
console.log('PASS '+checks+' Vercel country/location routing checks');
