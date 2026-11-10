// Bunny, avec UNE seule clé (celle du compte) : le serveur trouve la bibliothèque TOTEHM, pose le webhook,
// les rendus et l'authentification par jeton (sans verrou d'IP), puis prouve la protection et se déclare prêt.
// Tout est simulé : aucune requête ne sort, aucune vraie clé. LANCER : deno test -A _shared/bunny_test.ts
import { assert, assertEquals } from 'jsr:@std/assert@1';
Deno.env.set('SUPABASE_URL','https://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','service-test');
Deno.env.set('SUPABASE_ANON_KEY','anon-test');
Deno.env.set('BUNNY_ACCOUNT_API_KEY','ACCOUNT-SECRET');
/* Les VIEUX secrets du compte mort restent posés : ils ne doivent RIEN casser (mesuré le 10/11 : 401). */
Deno.env.set('BUNNY_LIBRARY_ID','999');Deno.env.set('BUNNY_API_KEY','DEAD-LIBRARY');Deno.env.set('BUNNY_TOKEN_KEY','DEAD-TOKEN');
Deno.env.set('BUNNY_CDN_HOSTNAME','vz-dead.b-cdn.net');Deno.env.set('BUNNY_READ_ONLY_API_KEY','DEAD-READ');
const writes:{url:string,body:Record<string,unknown>}[]=[];let backend:Record<string,unknown>|null=null;
const zone={ZoneSecurityEnabled:false,ZoneSecurityKey:'TOKEN-SECRET',ZoneSecurityIncludeHashRemoteIP:true,Hostnames:[{Value:'vz-test.b-cdn.net'}]};
const lib={Id:42,Name:'TOTEHM',ApiKey:'LIBRARY-SECRET',ReadOnlyApiKey:'READ-SECRET',PullZoneId:7,WebhookUrl:'',EnabledResolutions:'720p'};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=(async(input:Request|URL|string,init?:RequestInit)=>{
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 const method=(init?.method || (input instanceof Request?input.method:'GET')).toUpperCase();
 const h=new Headers(init?.headers || (input instanceof Request?input.headers:undefined));
 if(url.startsWith('https://api.bunny.net/')){
  assertEquals(h.get('AccessKey'),'ACCOUNT-SECRET');
  if(url==='https://api.bunny.net/videolibrary/999') return json({Message:'not found'},404);
  if(url.startsWith('https://api.bunny.net/videolibrary?')) return json({Items:[{Id:1,Name:'old test'},lib]});
  if(url==='https://api.bunny.net/videolibrary/42'&&method==='GET') return json(lib);
  if(url==='https://api.bunny.net/videolibrary/42'&&method==='POST'){const b=JSON.parse(String(init?.body));writes.push({url,body:b});Object.assign(lib,b);return json(lib);}
  if(url==='https://api.bunny.net/pullzone/7'&&method==='GET') return json(zone);
  if(url==='https://api.bunny.net/pullzone/7'&&method==='POST'){const b=JSON.parse(String(init?.body));writes.push({url,body:b});Object.assign(zone,b);return json(zone);}
  return json({},404);
 }
 if(url.startsWith('https://video.bunnycdn.com/library/42/')){assertEquals(h.get('AccessKey'),'LIBRARY-SECRET');return json({items:[]});}
 if(url.startsWith('https://vz-test.b-cdn.net/')) return new Response(null,{status:url.includes('bcdn_token=')?404:403});
 if(url.startsWith('https://test.supabase.co/rest/v1/video_backend')){backend=JSON.parse(String(init?.body));return json([],201);}
 return json({},404);
}) as typeof fetch;
Deno.test('une seule clé de compte suffit, même avec les vieux secrets posés : trouvée, configurée, protégée, prête',async()=>{
 const m=await import('./bunny.ts');
 const c=await m.config();
 assert(c.ready,'prêt');
 assertEquals([c.library,c.api,c.host],['42','LIBRARY-SECRET','vz-test.b-cdn.net']);
 const faits=writes.flatMap(w=>Object.keys(w.body)).sort();
 assertEquals(faits,['EnabledResolutions','WebhookUrl','ZoneSecurityEnabled','ZoneSecurityIncludeHashRemoteIP']);
 assertEquals(lib.WebhookUrl,'https://test.supabase.co/functions/v1/bunny-webhook');
 assertEquals(zone.ZoneSecurityEnabled,true);assertEquals(zone.ZoneSecurityIncludeHashRemoteIP,false);
 const row=Array.isArray(backend)?(backend as Record<string,unknown>[])[0]:backend!;
 assertEquals(row.status,'ready');
 const diag=JSON.stringify(row.diagnostics);
 for(const s of ['ACCOUNT-SECRET','LIBRARY-SECRET','READ-SECRET','TOKEN-SECRET']) assert(!diag.includes(s),'aucun secret dans le diagnostic : '+s);
 assertEquals((row.diagnostics as Record<string,unknown>).library_source,'named');
 // Une deuxième lecture ne réécrit RIEN : tout est déjà réglé.
 const n=writes.length;await m.config();assertEquals(writes.length,n);
});

Deno.test('un compte NEUF sans bibliothèque : TOTEHM est créée une fois, puis configurée',async()=>{
 const made={Id:77,Name:'TOTEHM',ApiKey:'NEW-LIBRARY',ReadOnlyApiKey:'NEW-READ',PullZoneId:8,WebhookUrl:'',EnabledResolutions:''};
 const z8={ZoneSecurityEnabled:false,ZoneSecurityKey:'NEW-TOKEN',ZoneSecurityIncludeHashRemoteIP:false,Hostnames:[{Value:'vz-new.b-cdn.net'}]};
 const creations:unknown[]=[];let row:Record<string,unknown>|null=null;
 const env0=Deno.env.get('BUNNY_LIBRARY_ID');Deno.env.delete('BUNNY_LIBRARY_ID');
 globalThis.fetch=(async(input:Request|URL|string,init?:RequestInit)=>{
  const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  const method=(init?.method || 'GET').toUpperCase();
  if(url.startsWith('https://api.bunny.net/videolibrary?')) return json({Items:creations.length?[made]:[]});
  if(url==='https://api.bunny.net/videolibrary'&&method==='POST'){creations.push(JSON.parse(String(init?.body)));return json(made,201);}
  if(url==='https://api.bunny.net/videolibrary/77'&&method==='POST'){Object.assign(made,JSON.parse(String(init?.body)));return json(made);}
  if(url==='https://api.bunny.net/videolibrary/77') return json(made);
  if(url==='https://api.bunny.net/pullzone/8'&&method==='POST'){Object.assign(z8,JSON.parse(String(init?.body)));return json(z8);}
  if(url==='https://api.bunny.net/pullzone/8') return json(z8);
  if(url.startsWith('https://video.bunnycdn.com/library/77/')) return json({items:[]});
  if(url.startsWith('https://vz-new.b-cdn.net/')) return new Response(null,{status:url.includes('bcdn_token=')?404:403});
  if(url.startsWith('https://test.supabase.co/rest/v1/video_backend')){const b=JSON.parse(String(init?.body));row=Array.isArray(b)?b[0]:b;return json([],201);}
  return json({},404);
 }) as typeof fetch;
 const m=await import('./bunny.ts?neuf');
 const c=await m.config();
 assertEquals(creations,[{Name:'TOTEHM'}]);
 assert(c.ready,'prêt');assertEquals([c.library,c.host],['77','vz-new.b-cdn.net']);
 assertEquals((row!.diagnostics as Record<string,unknown>).library_source,'created');
 assertEquals(made.WebhookUrl,'https://test.supabase.co/functions/v1/bunny-webhook');assertEquals(z8.ZoneSecurityEnabled,true);
 if(env0) Deno.env.set('BUNNY_LIBRARY_ID',env0);
});
