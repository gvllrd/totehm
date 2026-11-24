import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';
import {OPPOSITES} from '../../space/gallery-opposites.mjs';

const origin='https://www.totehm.space';
const out=process.argv[2]||'/tmp/opposites-canonical-front';
fs.mkdirSync(out,{recursive:true});
const b=await launch(),results=[];
let checks=0;
const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const f=await page(b,{dir:'space',origin,session:false,viewport}),{pg}=f;
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});
   await pg.goto(origin+'/think_same_but_opposite');
   await pg.waitForFunction(()=>window.__totehm_experience_front?.().ready);
   check(await pg.locator('.front-hit').count()===6&&await pg.locator('#experience-front-canvas').isVisible(),'All six original works occupy the canonical first page at '+viewport.width);
   const front=await pg.evaluate(()=>__totehm_experience_front());
   check(front.ids.join(',')===OPPOSITES.map(w=>w.id).join(',')&&front.black&&front.canonical,'The projected front keeps the exact original order and black ground at '+viewport.width);
   await pg.screenshot({path:out+'/front-'+viewport.width+'.png'});

   for(const work of OPPOSITES){
    await pg.getByRole('button',{name:'Discover '+work.title,exact:true}).click();
    await pg.waitForFunction(()=>__totehm_opposites().phase==='artwork'&&__totehm_experience_front().ready);
    check(await pg.locator('#artwork-hero-image').getAttribute('src')===work.image,'The selected work opens on its own original: '+work.id);
    await pg.keyboard.press('ArrowDown');
    await pg.waitForFunction(()=>__totehm_opposites().phase==='discover');
    check((await pg.locator('#slide').innerText()).includes(work.slides[0][0]),'The selected original opens its own Discover: '+work.id);
    for(let i=1;i<work.slides.length;i++){
     await pg.keyboard.press('ArrowDown');
     await pg.waitForFunction(i=>__totehm_opposites().step===i,i);
    }
    check(await pg.locator('#action').getAttribute('href')===work.href&&await pg.locator('#action').isVisible(),'The original Discover keeps its authored final offer: '+work.id);
    await pg.locator('#close').click();
    await pg.waitForFunction(()=>__totehm_opposites().phase==='artwork');
    await pg.locator('#close').click();
    await pg.waitForFunction(()=>__totehm_opposites().phase==='front');
   }
   check(!f.log.errors.some(e=>e.startsWith('pageerror:')),'The canonical front and all six Discover journeys run without script errors at '+viewport.width);
   results.push({viewport,front});
  }finally{await f.ctx.close();}
 }

 const f=await page(b,{dir:'space',origin,session:false,viewport:{width:1100,height:760}});
 try{
  const html=`<!doctype html>
  <script type="module">
   import {createOppositesFront} from '/opposites-front.mjs';
   window.canonicalSource=createOppositesFront();canonicalSource.setTime(17.25);
   await canonicalSource.ready;window.canonicalSourceReady=true;
  </script>
  <iframe style="position:fixed;inset:0;border:0;width:100%;height:100%" src="/think_same_but_opposite?embedded=1&sceneTime=17.25"></iframe>`;
  await f.ctx.route(origin+'/qa-front',route=>route.fulfill({contentType:'text/html',body:html}));
  await f.pg.goto(origin+'/qa-front');
  const reader=f.pg.frames().find(fr=>fr.url().includes('embedded=1'));
  await reader.waitForFunction(()=>window.__totehm_experience_front?.().ready);
  await f.pg.waitForFunction(()=>window.canonicalSourceReady);
  const sourcePNG=await f.pg.evaluate(()=>canonicalSource.canvas.toDataURL());
  const embeddedPNG=await reader.locator('#experience-front-canvas').evaluate(canvas=>canvas.toDataURL());
  check(sourcePNG===embeddedPNG,'The embedded first page is pixel-identical to its source projection at the supplied scene time');
  check(await reader.evaluate(()=>__totehm_experience_front().time===17.25&&__totehm_experience_front().frozen),'The six-work front holds its scene time until handoff');
  await reader.evaluate(()=>dispatchEvent(new Event('totehm:experience-enter')));
  await reader.getByRole('button',{name:'Discover GET HIGHER vs Just Do It',exact:true}).click();
  await reader.waitForFunction(()=>__totehm_opposites().phase==='artwork'&&__totehm_experience_front().ready);
  await reader.locator('#artwork-discover').click();
  await reader.waitForFunction(()=>__totehm_opposites().phase==='entering');
  await f.pg.screenshot({path:out+'/entering.png'});
  await reader.waitForFunction(()=>__totehm_opposites().phase==='discover');
  check(await reader.evaluate(()=>__totehm_opposites().work==='get-higher'&&__totehm_opposites().step===0),'The original art dissolves into its Discover in the same document');
  check(!f.log.errors.some(e=>e.startsWith('pageerror:')),'The embedded handoff has no script exception');
 }finally{await f.ctx.close();}
}finally{await b.close();}
fs.writeFileSync(out+'/results.json',JSON.stringify({checks,results},null,2));
console.log('PASS '+checks+' canonical New York front checks');
