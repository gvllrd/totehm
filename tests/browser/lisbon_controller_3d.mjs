import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';

const url='https://www.totehm.space';
const directory=process.argv[2]||'/tmp/lisbon-controller-3d';
fs.mkdirSync(directory,{recursive:true});
const browser=await launch();
let checks=0;
function check(value,message){assert(value,message);checks++;console.log('PASS '+message);}
try{
  for(const owned of [false,true]){
    const logged=[];
    const fixture=await page(browser,{dir:'space',origin:url,session:owned,viewport:{width:1280,height:850},functions:{'stoner-gate':{access:owned}},network:(address,request)=>{
      if(address.pathname==='/controller-host')return {contentType:'text/html',body:'<!doctype html><style>html,body{margin:0;width:100%;height:100%;background:#000}iframe{width:100%;height:100%;border:0}</style><iframe src="/play_lisbon_street?board=1&embedded=1"></iframe>'};
      if(address.pathname==='/functions/v1/lisbon-street-media'){
        const payload=JSON.parse(request.postData());logged.push(payload.id||payload.sign);
        return {status:200,contentType:'application/json',body:JSON.stringify({access:true,sign:'stop',url:'https://abujjbkbbiumxrokozph.supabase.co/storage/v1/object/sign/play-signals/stop.mp4?token=controller-fixture'})};
      }
      if(address.pathname==='/storage/v1/object/sign/play-signals/stop.mp4')return {contentType:'video/mp4',body:fs.readFileSync(new URL('../../space/assets/slides/init.mp4',import.meta.url))};
      return null;
    }});
    try{
      await fixture.pg.emulateMedia({reducedMotion:'reduce'});
      await fixture.pg.goto(url+'/controller-host');
      const child=fixture.pg.frames().find(frame=>frame.parentFrame());
      await child.waitForFunction(()=>window.__totehm_controller_entry?.().ready,null,{timeout:40000});
      const before=await child.evaluate(()=>__totehm_controller_entry());
      check(before.owned===owned&&before.model.physical&&before.model.keys===22&&before.model.loaded===22,'The shared controller prepares twenty-two physical keys, entitlement '+owned);
      check(await child.locator('.street-rock[role=button]').count()===0&&logged.length===0,'Preparation activates neither controls nor signed video, entitlement '+owned);
      await child.evaluate(()=>window.dispatchEvent(new Event('totehm:controller-enter')));
      if(owned){
        await child.waitForFunction(()=>__totehm_controller_entry().phase==='board');
        check(await child.locator('.street-rock[role=button]').count()===22,'The confirmed owner enters the 3D board directly');
        check(await child.evaluate(()=>['experience-front-canvas','sdisc-cover-next'].every(id=>getComputedStyle(document.getElementById(id)).display==='none')),'Direct entry hides the front canvas and Discover button immediately');
        const misses=await child.locator('.street-rock[role=button]').evaluateAll(keys=>keys.flatMap(key=>{
          const box=key.getBoundingClientRect();
          const hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
          return key.tabIndex===0&&hit===key?[]:[{key:key.getAttribute('aria-label'),hit:hit?.getAttribute('aria-label')||hit?.id||hit?.className,x:box.x,y:box.y,w:box.width}];
        }));
        check(!misses.length,'All projected 3D keys have their own clickable and focusable center '+JSON.stringify(misses));
        const canvas=await child.locator('#controller-3d-canvas').boundingBox();
        check(canvas.width>=1270&&canvas.height>=840,'The live 3D controller has a full-screen canvas');
        await fixture.pg.screenshot({path:directory+'/owned.png'});
        await child.getByRole('button',{name:'stop',exact:true}).click();
        await child.waitForFunction(()=>__totehm_lisbon().activeSign==='stop'&&__totehm_lisbon().playAttempted,null,{timeout:25000});
        check(logged.join(',')==='stop','The physical STOP key requests just its original signed film');
      }else{
        await child.waitForFunction(()=>document.body.classList.contains('is-controller-locked'));
        check(await child.locator('.street-rock[role=button]').count()===0&&logged.length===0,'The locked model exposes no playable keys or private media');
        check(/Totehmpaper is required/.test(await child.locator('#street-access-status').textContent()),'The denied player sees the TotehmPaper requirement');
        await fixture.pg.screenshot({path:directory+'/locked.png'});
      }
      check(!fixture.log.errors.some(error=>error.startsWith('pageerror:')),'The controller flow has no exception, entitlement '+owned);
    }finally{await fixture.ctx.close();}
  }
}finally{await browser.close();}
console.log('PASS '+checks+' shared Lisbon 3D controller checks');
