// SPACE gallery and live-market contracts. All identity, media and payments are simulated locally.
// source /workspace/.totehm-cloud/activate.sh; node tests/browser/gallery.mjs /tmp/totehm-gallery
import {launch,page,ok} from './harness.mjs';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';
const OUT=process.argv[2]||'/tmp/totehm-gallery';fs.mkdirSync(OUT,{recursive:true});
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'gallery-media-'));
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=160x160:rate=12','-t','2','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-movflags','+faststart',fixture+'/art.mp4']);
const media=fs.readFileSync(fixture+'/art.mp4'),origin='https://www.totehm.space';
const mediaNetwork=(url,req,log)=>{if(url.pathname.startsWith('/storage/v1/object/public/')){log.network.push(url.pathname);return {status:200,contentType:'video/mp4',body:media};}};
const cols=[
 {slug:'totehmpaper',title:'TOTEHMPAPER',kind:'access',royalty_pct:7,resale:true,works:1,copies:777000,owned:6,listed:0},
 {slug:'quantum',title:'QUANTUM',tagline:'Wah, in motion.',kind:'digital',royalty_pct:7,resale:true,works:2,copies:20,owned:3,listed:0},
 {slug:'play-the-lisbon-street',title:'PLAY THE LISBON STREET',kind:'street',royalty_pct:7,resale:true,works:1,copies:10,owned:10,listed:1}
];
const works=[
 {slug:'totehmpaper',title:'TOTEHMPAPER',collection:'totehmpaper',price_cents:1700,currency:'usd',edition_total:777000,available:776994,media:null,listed:0},
 {slug:'q-01',title:'Quantum 01',collection:'quantum',price_cents:9200,currency:'eur',edition_total:10,available:7,media:'wah/1.mp4',listed:0},
 {slug:'sign-rua',title:'Rua Augusta',collection:'play-the-lisbon-street',price_cents:3000,currency:'eur',edition_total:10,available:0,media:'play-signals/rua.mp4',listed:1,floor_cents:4500}
];
const saleId='e0000000-0000-4000-8000-000000000001',ownId='e0000000-0000-4000-8000-000000000009';
let listed=null,canBuy=true,ownedTHP=false,reserved=false,payoutCalls=0,collectionReads=0,pollReturn=false;
let heldCollection=null,releaseCollection=null,collectionStarted=null,collectionFinished=null,heldArt=null,releaseArt=null,artStarted=null,artFinished=null;
const listings=()=>[{edition_id:saleId,slug:'sign-rua',title:'Rua Augusta',collection:'play-the-lisbon-street',edition:4,of:10,price_cents:4500,currency:'eur',seller:'kai',mine:false,reserved}];
const rpc={
 market_view:async b=>{
  if(heldCollection&&b.p_collection===heldCollection&&!b.p_slug){collectionStarted?.();await new Promise(resolve=>releaseCollection=resolve);collectionFinished?.();}
  if(heldArt&&b.p_slug===heldArt){artStarted?.();await new Promise(resolve=>releaseArt=resolve);artFinished?.();}
  const result={signed_in:true,can_buy_art:canBuy,door:{thp:ownedTHP},collections:cols,works:b.p_collection?works.filter(w=>w.collection===b.p_collection):works,listings:listings()};
  if(b.p_slug){const w=works.find(w=>w.slug===b.p_slug);result.detail=w?{...w,owners:w.slug==='sign-rua'?[{edition_id:saleId,edition:4,owner:'kai',mine:false,since:'2026-09-01',price_cents:4500,currency:'eur',reserved}]:w.slug==='totehmpaper'&&ownedTHP?[{edition_id:'thp-owned',edition:3,owner:'wah',mine:true,since:'2026-09-01'}]:[],history:[{at:'2026-09-01',kind:'primary',edition:4,price_cents:w.price_cents,currency:w.currency}]}:null;}
  return result;
 },
 my_collection:()=>{collectionReads++;return {signed_in:true,pseudo:'wah',payout:{method:'iban',fin:'4321'},balances:[{currency:'eur',earned_cents:4185,pending_cents:4185}],items:pollReturn&&collectionReads<3?[]:[{edition_id:ownId,slug:'q-01',title:'Quantum 01',collection:'quantum',collection_title:'QUANTUM',edition:2,of:10,acquired_at:'2026-09-20',paid_cents:9200,paid_currency:'eur',media:'wah/1.mp4',resale:true,royalty_pct:7,currency:'eur',listed}],sales:[{at:'2026-09-25',title:'Rua Augusta',edition:7,seller_cents:4185,currency:'eur'}]};},
 art_list:b=>{listed={price_cents:b.p_price_cents,currency:'eur',reserved:false};return {ok:true};},
 art_unlist:()=>{listed=null;return {ok:true};},
 creator_payout_set:()=>{payoutCalls++;return {ok:true};}
};
const browser=await launch();
try{
 // A real decoded local video proves off-screen playback handling, without production requests.
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,rpc,viewport,network:mediaNetwork});
  await pg.goto(origin+'/');await pg.waitForFunction(()=>window.__totehm_gallery?.().rooms===4);
  ok(await pg.locator('.room').count()===4,'gallery contains the four existing art experiences at '+viewport.width+'px');
  ok(await pg.locator('.artwork svg path').count()>0&&await pg.locator('.signs img').count()===9,'gallery displays preserved artwork paths and real Lisbon signs');
  ok(!log.network.length,'no art video loaded before its room is visible');
  ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'gallery fits '+viewport.width+'px without horizontal overflow');
  ok(await pg.locator('a[href="/get_higher"]').count()===2&&await pg.locator('a[href="/origins"]').count()===2,'gallery enters the original migrated experiences');
  await pg.screenshot({path:OUT+'/gallery-'+viewport.width+'.png'});
  await pg.click('.room-nav a[href="#quantum"]');
  await pg.waitForFunction(()=>window.__totehm_gallery().room===3);
  await pg.waitForFunction(()=>document.querySelector('#quantum video').videoWidth===160&&!document.querySelector('#quantum video').paused);
  ok(log.network.length>=1,'Quantum preview loads and plays only in its visible room');
  await pg.click('.room-nav a[href="#lisbon"]');await pg.waitForFunction(()=>window.__totehm_gallery().room===2);await pg.waitForFunction(()=>[...document.querySelectorAll('.signs img')].every(i=>i.complete&&i.naturalWidth>0));ok(true,'all Lisbon previews load their original local assets');
  await pg.click('.room-nav a[href="#stoner"]');await pg.waitForFunction(()=>window.__totehm_gallery().room===1);
  ok(await pg.$eval('#quantum video',v=>v.paused),'gallery stops the off-screen Quantum preview');
  ok(await pg.locator('.room-nav a[aria-current="true"]').getAttribute('href')==='#stoner','room navigation tracks the visible artwork');
  await pg.emulateMedia({reducedMotion:'reduce'});await pg.click('.room-nav a[href="#quantum"]');await pg.waitForFunction(()=>window.__totehm_gallery().room===3);
  ok(await pg.$eval('#quantum video',v=>v.paused),'reduced motion suppresses automatic artwork playback');
  ok(!log.errors.length,'gallery has no browser errors at '+viewport.width+'px: '+log.errors.join(' | '));
  await ctx.close();
 }
 // Keep historical direct access alive with all parameters and fragments intact.
 {
  const {pg,ctx}=await page(browser,{dir:'space',origin,rpc});await pg.goto(origin+'/?embed&v=feed&habit=Run%20the%20hill#keep');
  await pg.waitForURL(/\/social\?embed&v=feed&habit=Run%20the%20hill#keep/);ok(true,'legacy social addresses retain path context, query and fragment');await ctx.close();
 }
 const {pg,ctx,log}=await page(browser,{dir:'space',origin,rpc,network:mediaNetwork});
 const fnBodies=[];
 await ctx.route('https://abujjbkbbiumxrokozph.supabase.co/functions/v1/**',r=>{const fn=r.request().url().split('/v1/')[1],body=JSON.parse(r.request().postData()||'{}');fnBodies.push({fn,body});return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({url:'https://checkout.stripe.test/local'})});});
 await ctx.route('https://checkout.stripe.test/**',r=>r.fulfill({status:200,contentType:'text/html',body:'Local payment stub'}));
 const market=async query=>{await pg.goto(origin+'/market'+(query||''));await pg.waitForFunction(()=>window.__totehm_market?.().works>0);};
 await market();ok((await pg.evaluate(()=>__totehm_market())).build==='2026-10-15-space-gallery-market','market uses the migrated SPACE build');
 ok(/\$17/.test(await pg.textContent('#view'))&&/€92/.test(await pg.textContent('#view')),'prices and currencies come from server response (including a changed art price)');
 ok(await pg.locator('.collection-strip [data-col]').count()===3,'minimal collection doors use server collections');
 await pg.screenshot({path:OUT+'/market-mobile.png'});
 await pg.setViewportSize({width:1440,height:1000});await pg.screenshot({path:OUT+'/market-desktop.png'});
 ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'market fits desktop without horizontal overflow');
 await pg.click('[data-tab="collections"]');ok(await pg.locator('.col .media').count()===3&&/7%/.test(await pg.textContent('#view')),'collections pair real artwork previews with server edition and royalty information');
 await pg.click('.col[data-col="quantum"]');await pg.waitForFunction(()=>__totehm_market().collection==='quantum'&&__totehm_market().tab==='market');
 ok(new URL(pg.url()).searchParams.get('collection')==='quantum'&&await pg.locator('.card').count()===1,'collection selection remains in the URL and filters the server query');
 ok(log.rpc.some(r=>r.name==='market_view'&&r.body.p_collection==='quantum'),'collection exploration requests its catalogue from the server');
 await pg.reload();await pg.waitForFunction(()=>__totehm_market?.().collection==='quantum');ok(await pg.locator('.card').count()===1,'reloading a selected collection preserves the context');
 await pg.click('[data-allcol]');await pg.waitForFunction(()=>__totehm_market().collection===null);
 // Release the older response only after a newer selection has finished.
 heldCollection='quantum';const oldCollectionStarted=new Promise(resolve=>collectionStarted=resolve),oldCollectionFinished=new Promise(resolve=>collectionFinished=resolve);
 await pg.click('.collection-strip [data-col="quantum"]');await oldCollectionStarted;
 await pg.click('.collection-strip [data-col="play-the-lisbon-street"]');await pg.waitForFunction(()=>__totehm_market().collection==='play-the-lisbon-street'&&document.querySelectorAll('.card').length===2);
 releaseCollection();await oldCollectionFinished;heldCollection=null;await pg.waitForTimeout(80);
 ok(await pg.locator('.card[data-art="q-01"]').count()===0&&new URL(pg.url()).searchParams.get('collection')==='play-the-lisbon-street','a delayed old collection response cannot overwrite the current selection');
 await pg.click('[data-allcol]');await pg.waitForFunction(()=>__totehm_market().collection===null);
 // Open, explore, return: focus, scroll, deep links, provenance and stale replies.
 await pg.locator('.card[data-art="q-01"]').click();await pg.waitForSelector('#sh h2');
 ok(await pg.$eval('main',e=>e.inert)&&await pg.getAttribute('#sheet','aria-hidden')==='false','artwork sheet isolates background controls accessibly');
 ok(/q-01/.test(pg.url()),'opening a work creates a shareable art address');
 await pg.click('.history summary');ok(/primary/.test(await pg.textContent('.history'))&&/€92/.test(await pg.textContent('.history')),'provenance displays server transfer history and its actual currency');
 await pg.click('[data-step="1"]');await pg.waitForFunction(()=>__totehm_market().detail==='sign-rua');
 ok(/every copy from the studio is owned/.test(await pg.textContent('#sh'))&&await pg.locator('[data-resale]').count()===1,'next artwork retains sold-out state and real resale action');
 await pg.keyboard.press('Escape');ok(await pg.$eval('main',e=>!e.inert)&&await pg.locator('.card[data-art="q-01"]').evaluate(e=>e===document.activeElement),'closing the artwork restores background interaction and the initiating focus');
 ok(!new URL(pg.url()).searchParams.has('art'),'closing artwork clears only its deep-link parameter');
 heldArt='q-01';const oldArtStarted=new Promise(resolve=>artStarted=resolve),oldArtFinished=new Promise(resolve=>artFinished=resolve);
 await pg.locator('.card[data-art="q-01"]').click();await oldArtStarted;await pg.keyboard.press('Escape');
 await pg.locator('.card[data-art="totehmpaper"]').click();await pg.waitForFunction(()=>__totehm_market().detail==='totehmpaper');releaseArt();await oldArtFinished;heldArt=null;await pg.waitForTimeout(80);
 ok(await pg.textContent('#sh h2')==='TOTEHMPAPER'&&new URL(pg.url()).searchParams.get('art')==='totehmpaper','a closed artwork response cannot replace the newly opened work');
 await pg.keyboard.press('Escape');
 // Server-held reservations cannot be purchased from the sheet.
 reserved=true;await market('?art=sign-rua');await pg.waitForSelector('#sh h2');ok(await pg.locator('[data-resale]').count()===0&&/held/.test(await pg.textContent('#sh')),'server-held resale is labelled and has no buy action');reserved=false;
 await market('?art=sign-rua');await pg.waitForSelector('[data-resale]');await pg.click('[data-resale]');await pg.waitForURL(/checkout\.stripe\.test/);
 ok(fnBodies.at(-1).fn==='market-checkout'&&fnBodies.at(-1).body.edition_id===saleId,'resale checkout sends the existing edition identifier, without a client price');
 await market('?art=q-01');await pg.waitForSelector('[data-buy]');await pg.click('[data-buy]');ok(/tick the box/.test(await pg.textContent('#buy-n')),'digital primary purchase requires the withdrawal waiver');
 await pg.check('#wv');await pg.click('[data-buy]');await pg.waitForURL(/checkout\.stripe\.test/);
 ok(fnBodies.at(-1).fn==='artwork-checkout'&&fnBodies.at(-1).body.slug==='q-01'&&fnBodies.at(-1).body.waiver===true&&!('price_cents' in fnBodies.at(-1).body),'primary artwork checkout preserves slug and waiver; server retains the price');
 await market('?art=totehmpaper');await pg.waitForSelector('[data-buy]');ok(/\$17/.test(await pg.textContent('#sh')),'THP sheet uses its server currency and price');await pg.check('#wv');await pg.click('[data-buy]');await pg.waitForURL(/checkout\.stripe\.test/);
 ok(fnBodies.at(-1).fn==='higher-checkout'&&fnBodies.at(-1).body.waiver===true&&!('price_cents' in fnBodies.at(-1).body),'THP keeps its higher-checkout contract from the SPACE origin');
 ownedTHP=true;await market('?art=totehmpaper');await pg.waitForSelector('#sh h2');ok(/owned · № 3/.test(await pg.textContent('#sh'))&&await pg.locator('[data-buy]').count()===0,'THP ownership retains its server edition number and prevents a duplicate primary action');
 canBuy=false;await market('?art=q-01');await pg.waitForSelector('#sh h2');ok(await pg.locator('[data-buy]').count()===0&&await pg.locator('[data-habit]').count()===1,'server art-acquisition gate is retained independently of Club membership');canBuy=true;
 await market('?tab=mine');await pg.waitForSelector('[data-list]');
 ok(await pg.locator('.row .art-open').count()===1&&await pg.locator('.payout[open]').count()===0,'owned artwork leads the collection; payout settings stay available in a disclosure');
 await pg.fill('[data-pin="'+ownId+'"]','120');ok(/I receive €111\.60/.test(await pg.textContent('#view')),'seller preview preserves the server-provided 7% royalty');
 await pg.click('[data-list="'+ownId+'"]');await pg.waitForSelector('[data-unlist]');ok(log.rpc.some(r=>r.name==='art_list'&&r.body.p_edition===ownId&&r.body.p_price_cents===12000),'listing submits the original edition and price in cents');
 await pg.click('[data-unlist]');await pg.waitForSelector('[data-list="'+ownId+'"]');ok(log.rpc.some(r=>r.name==='art_unlist'&&r.body.p_edition===ownId),'unlisting uses the original edition contract');
 await pg.click('.payout summary');ok(/41[.,]85/.test(await pg.textContent('.payout')),'payout balance comes from the ledger response');
 await pg.fill('#po-h','collector@example.test');await pg.selectOption('#po-m','paypal');await pg.click('[data-po]');await pg.waitForFunction(()=>document.querySelector('#po-n')?.textContent==='saved');ok(payoutCalls===1&&log.rpc.some(r=>r.name==='creator_payout_set'&&r.body.p_method==='paypal'),'payout destination remains editable through the existing server RPC');
 // `owned` is only a polling hint; ownership must appear in my_collection.
 pollReturn=true;collectionReads=0;await market('?owned=q-01');await pg.waitForFunction(()=>/waiting for the payment confirmation/.test(document.querySelector('#banner').textContent));
 ok(!/Payment received|payment is confirmed/.test(await pg.textContent('#banner')),'a forged return parameter cannot claim payment or grant ownership');
 await pg.waitForFunction(()=>/it is mine/.test(document.querySelector('#banner').textContent),null,{timeout:10000});
 ok(collectionReads>=3&&!new URL(pg.url()).searchParams.has('owned')&&await pg.locator('.row').count()===1,'payment return polls server ownership then cleans the return URL');pollReturn=false;
 // Video management applies to catalogue, sheet, tab and reduced motion.
 await market();await pg.locator('.card[data-art="q-01"]').scrollIntoViewIfNeeded();await pg.waitForFunction(()=>[...document.querySelectorAll('#view video')].some(v=>v.videoWidth===160&&!v.paused));
 ok(await pg.locator('video').evaluateAll(vs=>vs.filter(v=>!v.paused).length)===1,'market plays at most one visible work');
 // Several works can be fully visible on desktop. Keep the actual playing
 // element, rather than assuming the observer chooses one particular card.
 const removedPreview=await pg.waitForFunction(()=>[...document.querySelectorAll('#view video')].find(v=>!v.paused));
 await pg.click('[data-tab="collections"]');ok(await removedPreview.evaluate(v=>v.paused),'changing tabs also pauses videos removed from the DOM');
 await pg.click('[data-tab="market"]');
 await pg.locator('.card[data-art="q-01"]').click();await pg.waitForSelector('#sh h2');await pg.waitForFunction(()=>document.querySelector('#sh video')?.videoWidth===160);
 ok(await pg.locator('#view video').evaluateAll(vs=>vs.every(v=>v.paused)),'opening an artwork pauses every catalogue preview');
 await pg.emulateMedia({reducedMotion:'reduce'});await pg.waitForFunction(()=>[...document.querySelectorAll('video')].every(v=>v.paused));ok(await pg.locator('video').evaluateAll(vs=>vs.every(v=>v.paused)),'reduced motion pauses market artwork autoplay');
 await pg.keyboard.press('Escape');await pg.setViewportSize({width:390,height:844});ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'market fits mobile without horizontal overflow');
 log.errors=log.errors.filter(e=>!/Failed to load resource: net::ERR_ABORTED/.test(e));ok(!log.errors.length,'market has no browser errors: '+log.errors.join(' | '));
 await ctx.close();
 {
  const guest=await page(browser,{dir:'space',origin,rpc,session:false});await guest.ctx.route('https://www.totehm.com/auth**',r=>r.fulfill({status:200,contentType:'text/html',body:'Local identity stub'}));
  await guest.pg.goto(origin+'/market?tab=mine');await guest.pg.waitForSelector('[data-login]');
  ok(!guest.log.rpc.some(r=>r.name==='my_collection'),'signed-out visitors never fetch a private collection');
  await guest.pg.click('[data-login]');await guest.pg.waitForURL(/totehm\.com\/auth\?/);const u=new URL(guest.pg.url());
  ok(u.searchParams.get('client')==='space'&&u.searchParams.get('return')==='/market?tab=mine'&&u.searchParams.has('challenge')&&u.searchParams.has('state'),'collection sign-in uses SPACE PKCE and retains the selected view');await guest.ctx.close();
 }
}finally{await browser.close();fs.rmSync(fixture,{recursive:true,force:true});}
