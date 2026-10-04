// Search → native read-only TOTEHM → reviewed copies. No production data.
import fs from 'node:fs';
import {launch,page,ok} from './harness.mjs';
const OUT=process.argv[2]||'/tmp';fs.mkdirSync(OUT,{recursive:true});
const origin='https://www.totehm.com';
const source={ok:true,pseudo:'studio',steps:[{t:'Deep practice',f:'daily',i:'focus',is:['focus','express'],o:'obj-1'}],
  objs:{'Deep practice':['obj-1']},trips:[{id:'obj-1',text:'Build a practice',is:['focus'],habits:[{t:'Deep practice'}],visions:['vis-1']}],
  reps:[{id:71,text:'Put the phone away',obstacle:'Phone',is:['focus'],hs:['Deep practice'],ws:['wis-1']}],
  wisdom:[{id:'wis-1',text:'Attention is a choice',is:['focus'],os:['obj-1']}],
  visions:[{id:'vis-1',text:'A focused life',is:['focus'],os:['obj-1']}]};
const result=(pseudo='studio')=>({pseudo,own:false,subscribed:true,can_read:true,offer:true,price_cents:1200,currency:'eur',match:'name'});
const tables={profiles:[{pseudo:'wahigher'}]};
const rpc={totehm_of:source,my_trips:{trips:[],reps:[],wisdom:[],visions:[]},my_box_sources:[]};
const browser=await launch();
const sleep=pg=>pg.waitForTimeout(300);
const ready=async(pg,url)=>{await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(url);await pg.waitForSelector('body.ro:not(.gate)');await pg.waitForFunction(()=>window.__totehm_copies?.().readable);await sleep(pg);};
try{
  // Standalone search, including races across debounce, modes, pages and filters.
  {const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{...rpc,totehm_discover:async b=>{
    if(b.p_q==='slow'){await new Promise(r=>setTimeout(r,550));return{items:[result('old')],total:1,more:false};}
    if(b.p_scope==='boxes')return{items:[{...result(),boxes:[{kind:'h',key:'Deep practice',text:'Deep practice',intentions:['focus']}]}],total:1,more:false};
    if(b.p_scope==='subscriptions')return{items:[result('subscribed')],total:1,more:false};
    if(b.p_q==='missing')return{items:[],total:0,more:false};
    if(b.p_q==='pages')return{items:[result(b.p_offset?'second':'first')],total:2,more:!b.p_offset};
    return{items:[result(b.p_q||'studio')],total:1,more:false};
  }},network:(url)=>url.pathname==='/search'?{status:200,contentType:'text/html',body:fs.readFileSync(new URL('../../com/creator.html',import.meta.url),'utf8')}:null});
   await pg.goto(origin+'/search');await pg.waitForSelector('.ts-result');
   ok(await pg.getAttribute('.ts-open','href')==='/totehm?ro=studio','name result opens the native reader');
   ok(await pg.getAttribute('[data-search-scope="names"]','aria-pressed')==='true','name discovery is the default mode');
   await pg.fill('#q','slow');await pg.waitForTimeout(260);await pg.fill('#q','fresh');await pg.waitForTimeout(1000);
   ok(await pg.textContent('.srch-name')==='fresh','slow earlier reply cannot replace newer typing');
   await pg.click('[data-search-scope="subscriptions"]');await sleep(pg);
   ok(await pg.textContent('.srch-name')==='subscribed','subscription mode sends its own scope');
   await pg.click('[data-search-scope="boxes"]');await sleep(pg);
   ok(await pg.locator('.ts-filters').isVisible()&&await pg.locator('.ts-box').count()===1,'accessible box previews use native box colours');
   await pg.selectOption('[data-search-kind]','h');await pg.selectOption('[data-search-intention]','focus');await sleep(pg);
   const last=log.rpc.filter(x=>x.name==='totehm_discover').at(-1).body;
   ok(last.p_scope==='boxes'&&last.p_kind==='h'&&last.p_intention==='focus','kind and intention reach the server');
   const href=await pg.getAttribute('.ts-box','href');
   ok(href==='/totehm?ro=studio&box_kind=h&box_key=Deep%20practice','box result targets that exact box in the reader');
   await pg.click('[data-search-scope="names"]');await pg.fill('#q','pages');await pg.waitForTimeout(450);await pg.click('#search-more');await sleep(pg);
   ok(await pg.locator('.ts-result').count()===2,'more results append without replacing the previous page');
   await pg.fill('#q','missing');await pg.waitForTimeout(450);
   ok(await pg.locator('.ts-result').count()===0&&/No matching name/.test(await pg.textContent('#q-note')),'empty search clears old results and offers an explanation');
   await pg.fill('#q','studio');await pg.waitForTimeout(450);
   await pg.screenshot({path:OUT+'/discovery_search.png'});
   ok(!log.errors.length,'search has no unexpected console errors: '+log.errors.join('|'));
   await pg.goto(origin+href);await pg.waitForSelector('body.ro:not(.gate)');await pg.waitForFunction(()=>window.__totehm_zone?.boite_ouverte==='h');
   ok(await pg.locator('.habit.open').count()===1,'box deep link opens the native box');
  }
  // Five views, individual copies, review/remove, safe import failure and retry.
  {let imports=0;const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{...rpc,totehm_import_boxes:async b=>{
    imports++;return imports===1?{ok:false,why:'access'}:{ok:true,created:b.p_selection.length,reused:0,total:b.p_selection.length};
  }}});
   await ready(pg,origin+'/totehm?ro=studio');
   const d=await pg.evaluate(()=>window.__totehm_zone);
   ok([d.habitudes,d.objectifs,d.repulsions,d.lecons,d.visions].every(n=>n===1),'reader loads all five native lists');
   ok(!await pg.locator('#fold-x').isVisible()&&!await pg.locator('[data-add="h"]').isVisible(),'reader hides editing and folding controls');
   ok(!log.rpc.some(x=>x.name==='my_trips'),'reader never loads the viewer tree into the source');
   await pg.click('[data-copy]');
   ok(await pg.evaluate(()=>window.__totehm_copies().selected)===1&&await pg.getAttribute('[data-copy]','aria-pressed')==='true','copy stages a stable source reference');
   await pg.click('[data-copy]');ok(await pg.evaluate(()=>window.__totehm_copies().selected)===0,'copy button can remove a selection');
   await pg.click('#ro-select');
   for(const key of ['ArrowUp','ArrowLeft','ArrowRight','ArrowDown','ArrowDown','ArrowRight']){
     await pg.keyboard.press(key);await sleep(pg);await pg.click('#ro-select');
   }
   ok(await pg.evaluate(()=>window.__totehm_copies().selected)===5,'copy this view accumulates all five types without duplicates');
   await pg.screenshot({path:OUT+'/discovery_reader.png'});
   await pg.click('#ro-review');
   ok(await pg.locator('#ro-import').isVisible()&&await pg.locator('.ro-item').count()===5,'review lists all selected boxes');
   ok(await pg.$eval('#stage',e=>e.inert),'underlying reader is inert while reviewing');
   await pg.keyboard.press('ArrowDown');await pg.keyboard.press('ArrowRight');
   ok(await pg.evaluate(()=>window.__totehm_copies().dialog),'navigation keys keep the review open');
   for(let i=0;i<12;i++){await pg.keyboard.press('Tab');ok(await pg.evaluate(()=>!!document.activeElement.closest('#ro-import')),'review traps keyboard focus '+i);}
   await pg.click('[data-remove-copy="0"]');ok(await pg.locator('.ro-item').count()===4,'review can remove a box before import');
   await pg.screenshot({path:OUT+'/discovery_review.png'});
   await pg.click('#ro-import-go');await sleep(pg);
   ok(/Access changed/.test(await pg.textContent('#ro-import-note'))&&await pg.locator('.ro-item').count()===4,'access refusal keeps selection for review');
   await pg.click('#ro-import-go');await sleep(pg);
   ok(/4 boxes imported/.test(await pg.textContent('#ro-import-note'))&&await pg.locator('#ro-import-mine').isVisible(),'successful import offers the viewer own TOTEHM');
   const calls=log.rpc.filter(x=>x.name==='totehm_import_boxes');
   ok(calls.length===2&&calls.every(x=>x.body.p_pseudo==='studio'&&x.body.p_selection.every(b=>Object.keys(b).sort().join()==='key,kind')),'import sends references only, never client-written source content');
   ok(!log.rpc.some(x=>/rename|_create|_set|_delete|habit_step|totehm_save/.test(x.name)),'reading, navigation and selection never write the source');
   ok(await pg.evaluate(()=>window.__totehm_copies().selected)===0,'successful copies leave no stale selection');
   await pg.keyboard.press('Escape');
   ok(!await pg.locator('#ro-import').isVisible()&&!await pg.$eval('#stage',e=>e.inert),'Escape restores the reader and its focus');
   ok(!log.errors.length,'reader and import have no unexpected console errors: '+log.errors.join('|'));
  }
  // Signing out while a copy is being read clears its content and selection.
  {const{pg}=await page(browser,{dir:'com',origin,tables,rpc});
   await ready(pg,origin+'/totehm?ro=studio');await pg.click('[data-copy]');await pg.click('#ro-review');
   await pg.evaluate(async()=>{const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
     const second=createClient('https://abujjbkbbiumxrokozph.supabase.co','anon-test',{auth:{detectSessionInUrl:false}});
     await second.auth.signOut({scope:'local'});
   });
   await pg.waitForFunction(()=>window.__totehm_copies?.().selected===0&&!window.__totehm_copies().readable);
   ok(!await pg.locator('#ro-import').isVisible()&&await pg.locator('.ro-item').count()===0,'signing out purges review and source content');
   ok(await pg.locator('[data-copy]').count()===0,'signing out removes every source copy control');
  }
  // Access gates stay within the reader; own read-only mode has no self-import.
  {const{pg,log}=await page(browser,{dir:'com',origin,tables,rpc:{...rpc,totehm_of:{ok:false,why:'subscribe'},creator_page:{ok:true,sale:{open:true,price_cents:1200,currency:'eur'}}}});
   await pg.emulateMedia({reducedMotion:'reduce'});await pg.goto(origin+'/totehm?ro=studio');await pg.waitForSelector('#ro-access:not(.hide)');await sleep(pg);
   ok(new URL(pg.url()).pathname==='/totehm','subscription gate stays in the native reader');
   ok(await pg.locator('#ro-access a[href="/@studio"]').count()===1,'gate links explicitly to subscription details');
   ok(await pg.locator('[data-copy]').count()===0&&!await pg.locator('#ro-review').isVisible(),'unreadable content offers no copy controls');
   await pg.screenshot({path:OUT+'/discovery_access.png'});
   ok(!log.errors.length,'subscription gate has no unexpected console errors');
  }
  {const{pg}=await page(browser,{dir:'com',origin,tables,rpc:{...rpc,totehm_of:{...source,pseudo:'wahigher'}}});
   await ready(pg,origin+'/totehm?ro=wahigher');
   ok(await pg.locator('[data-copy]').count()===0&&!await pg.locator('#ro-select').isVisible(),'own reader remains read-only without self-copy');
  }
  {const{pg,log}=await page(browser,{dir:'com',origin,tables,viewport:{width:1280,height:800},rpc});
   await ready(pg,origin+'/totehm?ro=studio&box_kind=v&box_key=vis-1');
   ok(await pg.evaluate(()=>window.__totehm_zone.vue)==='visions','desktop deep link opens the vision view');
   await pg.click('[data-copy]');await pg.click('#ro-review');await pg.screenshot({path:OUT+'/discovery_desktop.png'});
   const r=await pg.locator('.ro-import-panel').boundingBox();ok(r.x>=0&&r.x+r.width<=1280,'desktop review fits inside the viewport');
   ok(!log.errors.length,'desktop reader has no unexpected console errors');
  }
}finally{await browser.close();}
