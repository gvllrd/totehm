import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';
import {createLisbonController} from '../../space/gallery-lisbon-controller.mjs';
import {Mesh,Raycaster,Vector3} from '../../space/vendor/three-0.180.0.mjs';

const url='https://www.totehm.space';
const directory=process.argv[2]||'/tmp/lisbon-controller-3d';
fs.mkdirSync(directory,{recursive:true});
const browser=await launch();
let checks=0;
function check(value,message){assert(value,message);checks++;console.log('PASS '+message);}
// Version 2 artwork layout, measured against the reader in 8ca2f88.
const version2Keys=[
  ['fire_exit',-.35,-.209,.15],['Heli',0,-.234,.064],['aed',.35,-.209,.15],
  ['green_walk',-.195,-.196,.056],['red_walk',-.195,-.126,.056],['pharma',-.35,-.10,.085],
  ['destination',0,-.148,.24],['lisboa_city_hall',.193,-.156,.069],['speed_bump_caution',.325,-.105,.071],
  ['crosswalk_caution',.25,-.011,.071],['no_entry',.397,-.010,.070],['no_parking',.33,.077,.076],
  ['hospital',0,-.052,.047],['parking',0,.009,.06],['Hotel',0,.074,.062],
  ['dead_end',-.341,.022,.065],['roundabout',-.163,.113,.107],['left_or_straight',.163,.113,.107],
  ['no_uturn',.35,.171,.084],['priority',-.348,.177,.09],['crosswalk',0,.151,.073],['stop',.375,.28,.083]
];
const version2Pitch=Math.atan2(3-.032,.58);
const version2ArtworkHeight=id=>.077+(['roundabout','left_or_straight'].includes(id)?.066:.022);
try{
  const model=createLisbonController();
  try{
    assert.deepEqual([...model.keys.values()].map(({id,button,size})=>[id,button.position.x,button.position.z,size]),version2Keys);
    console.log('PASS The shared model retains the order and positions of all 22 version 2 signs');
    checks++;
    check([...model.keys.values()].every(({id,button})=>Math.abs(button.position.y+button.geometry.boundingBox.max.z-version2ArtworkHeight(id))<1e-8),'The relief surfaces match the version 2 artwork heights');
    check([...model.keys.values()].every(({button})=>button.geometry.type==='ExtrudeGeometry'&&button.geometry.boundingBox.max.z>0),'All 22 sign shapes are solid 3D buttons');
    const hasSignAt=(id,x,y)=>{
      const key=model.keys.get(id),mesh=new Mesh(key.button.geometry,key.button.material);
      const scale=key.size*.93;
      return new Raycaster(new Vector3(x*scale,y*scale,1),new Vector3(0,0,-1)).intersectObject(mesh).length>0;
    };
    check(hasSignAt('Heli',0,0)&&hasSignAt('Heli',.415,0)&&!hasSignAt('Heli',.28,0),'Heli has a solid H and ring with an open gap between them');
    check(hasSignAt('stop',0,0)&&!hasSignAt('stop',.39,.39)&&hasSignAt('pharma',0,.33)&&!hasSignAt('pharma',.30,.30),'The STOP octagon and pharmacy cross have their own cut edges');
  }finally{model.dispose();}
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
        const screen=await child.locator('.street-rock[role=button]').evaluateAll(keys=>({
          width:innerWidth,height:innerHeight,centers:keys.map(key=>{
            const {x,y,width,height}=key.getBoundingClientRect();
            return [key.getAttribute('aria-label'),x+width/2,y+height/2];
          })
        }));
        const scale=Math.min(screen.width*.72,1100,screen.height*.78/.68);
        const drift=version2Keys.map(([id,x,z],i)=>{
          const [label,actualX,actualY]=screen.centers[i];
          assert.equal(label,id.replace(/_/g,' '));
          const projectedY=(version2ArtworkHeight(id)-.032)*Math.cos(version2Pitch)-z*Math.sin(version2Pitch);
          return Math.hypot(actualX-(screen.width/2+x*scale),actualY-(screen.height/2-projectedY*scale));
        });
        const maxDrift=Math.max(...drift);
        check(maxDrift<.1,'All 22 fullscreen key centers match version 2 within '+maxDrift.toFixed(3)+' CSS px');
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
