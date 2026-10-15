// Gallery migration: execute the real Edge handlers with synthetic services.
// No network, Stripe account, credentials, or production data are used.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const { transform } = await import(process.env.ESBUILD_MODULE || 'esbuild');
const root = new URL('../../backend/supabase/functions/', import.meta.url);
const shared = { exports:{} };
const originsCode = (await transform(fs.readFileSync(new URL('_shared/origins.ts', root), 'utf8'), {loader:'ts', format:'cjs'})).code;
vm.runInNewContext(originsCode, {module:shared, exports:shared.exports});
const origins = shared.exports, SPACE = origins.SITE_SPACE;
const edition = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let passed = 0;

async function call(name, body, options = {}) {
  let handler;
  const sessions = [], calls = [];
  const reservation = {ok:true, reservation:'synthetic-reservation', collection:'lisbon', title:'Synthetic work',
    slug:'test/work & sky', currency:'eur', price_cents:2345, edition_total:77, edition_next:3, edition:2};
  const admin = {
    auth:{getUser:async()=>({data:{user:options.noUser ? null : {id:'synthetic-user', email:'viewer@example.test'}}, error:null})},
    from(table) {
      const query = {select(){return query;}, eq(){return query;}, async maybeSingle(){
        if(table === 'artworks') return {data:{price_cents:2345,currency:'eur',edition_total:77,edition_sold:options.soldOut ? 77 : 2}};
        if(table === 'stoner_access') return {data:options.owned ? {email:'viewer@example.test',source:'existing'} : null};
        throw Error('Unexpected table: ' + table);
      }};
      return query;
    },
    async rpc(name, args) { calls.push({name,args}); return {data:options.denied && name.endsWith('_reserve') ? {ok:false,why:'thp_required'} : reservation}; },
    storage:{from:()=>({createSignedUrl:async file=>({data:{signedUrl:'https://synthetic.invalid/'+file}})})},
  };
  class Stripe {
    checkout = {sessions:{create:async data=>{
      sessions.push(data);
      if(options.stripeFailure) throw Error('synthetic Stripe failure');
      return {id:'synthetic-session',url:'https://checkout.synthetic.invalid/session'};
    }}};
  }
  const source = fs.readFileSync(new URL(name + '/index.ts', root), 'utf8').replace(/^import .*\n/gm, '');
  const code = (await transform(source,{loader:'ts',target:'es2022'})).code;
  vm.runInNewContext(code, {
    ...origins, Stripe, createClient:()=>admin,
    Deno:{env:{get:()=> 'synthetic-only'},serve:f=>handler=f},
    fetch:()=>{throw Error('Network forbidden in this test');},
    Request, Response, Date, console:{error(){}},
  });
  const headers = {'content-type':'application/json',origin:options.origin || SPACE};
  if(!options.noAuth) headers.authorization = 'Bearer synthetic-session';
  const response = await handler(new Request('https://synthetic.invalid/'+name,{method:options.method || 'POST',headers,
    body:options.method === 'OPTIONS' ? undefined : JSON.stringify(body)}));
  const text = await response.text();
  return {status:response.status,headers:response.headers,body:text === 'ok' ? text : JSON.parse(text),sessions,calls};
}

const verify = (condition, message) => { assert.ok(condition,message); passed++; };
let r = await call('higher-checkout',{quote:true},{noAuth:true});
verify(r.body.amount === 2345 && r.body.left === 75 && r.sessions.length === 0,'anonymous quote stays server-priced');
for(const origin of [SPACE,origins.SITE_BOUT,origins.SITE_CLUB]) {
  r = await call('higher-checkout',{waiver:true,success_url:'https://untrusted.invalid/'},{origin});
  const s = r.sessions[0];
  verify(s.success_url === SPACE+'/market?owned=totehmpaper' && s.cancel_url === SPACE+'/market?art=totehmpaper','new and legacy marketplace origins return to SPACE');
  verify(s.line_items[0].price_data.unit_amount === 2345 && s.metadata.product === 'higher','THP price and settlement product preserved');
}
r = await call('higher-checkout',{waiver:true,from:'method'},{origin:origins.SITE_COM});
verify(r.sessions[0].success_url === SPACE+'/stoner?checked=1' && r.sessions[0].cancel_url === SPACE+'/get_higher','method purchase returns to its unchanged experience');
r = await call('higher-checkout',{waiver:true},{owned:true});
verify(r.body.already === true && !r.sessions.length,'existing THP owner is not charged again');
r = await call('higher-checkout',{waiver:true},{soldOut:true});
verify(r.status === 409 && !r.sessions.length,'stock exhaustion is enforced');
r = await call('higher-checkout',{});
verify(r.status === 400 && !r.sessions.length,'waiver remains required');
r = await call('higher-checkout',{waiver:true},{noAuth:true});
verify(r.status === 401 && !r.sessions.length,'checkout still requires authentication');

for(const [name,body,product,reserve] of [
  ['artwork-checkout',{slug:'test/work & sky'},'artwork','art_primary_reserve'],
  ['market-checkout',{edition_id:edition},'resale','art_resale_reserve'],
]) {
  r = await call(name,body);
  const s = r.sessions[0];
  verify(r.status === 200 && s.success_url === SPACE+'/market?owned=test%2Fwork%20%26%20sky' && s.cancel_url === SPACE+'/market?art=test%2Fwork%20%26%20sky','art and resale return paths preserve encoded identity');
  verify(s.line_items[0].price_data.unit_amount === 2345 && s.metadata.product === product && s.payment_intent_data.metadata === s.metadata,'price and webhook settlement metadata remain server-owned');
  verify(r.calls[0].name === reserve && r.calls[0].args.p_buyer === 'synthetic-user' && r.calls[1].name === 'art_reservation_session','reservation and session linking remain intact');
  r = await call(name,body,{denied:true});
  verify(r.status === 402 && !r.sessions.length,'art acquisition gate is independent of Club membership');
  r = await call(name,body,{stripeFailure:true});
  verify(r.status === 502 && r.calls.at(-1).name === 'art_release','failed checkout releases its reservation');
}
r = await call('stoner-gate',{}, {owned:false});
verify(r.body.access === false && r.body.reason === 'locked','Club status cannot unlock the paid Stoner experience');
r = await call('stoner-gate',{}, {owned:true});
verify(r.body.access === true && Object.keys(r.body.urls).length === 11,'existing Stoner grants retain all eleven signed steps');
verify(r.headers.get('access-control-allow-origin') === SPACE,'SPACE is accepted by the existing origin policy');
console.log(`${passed} gallery checkout and acquired-rights checks passed`);
