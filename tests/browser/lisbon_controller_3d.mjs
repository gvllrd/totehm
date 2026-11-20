import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';
import {createLisbonController} from '../../space/gallery-lisbon-controller.mjs';
import {Box3,Matrix4,Mesh,Raycaster,Vector3} from '../../space/vendor/three-0.180.0.mjs';

const url='https://www.totehm.space';
const directory=process.argv[2]||'/tmp/lisbon-controller-3d';
fs.mkdirSync(directory,{recursive:true});
const browser=await launch();
let checks=0;
function check(value,message){assert(value,message);checks++;console.log('PASS '+message);}
// Identity/order and native cut-outs remain invariant. The new shoulder
// controls and projected layout deliberately replace the old V2 coordinates.
const canonicalIds=['fire_exit','Heli','aed','green_walk','red_walk','pharma','destination','lisboa_city_hall','speed_bump_caution','crosswalk_caution','no_entry','no_parking','hospital','parking','Hotel','dead_end','roundabout','left_or_straight','no_uturn','priority','crosswalk','stop'];
const previousSizes={fire_exit:.15,Heli:.064,aed:.15,green_walk:.056,red_walk:.056,pharma:.085,destination:.24,lisboa_city_hall:.069,speed_bump_caution:.071,crosswalk_caution:.071,no_entry:.070,no_parking:.076,hospital:.047,parking:.06,Hotel:.062,dead_end:.065,roundabout:.107,left_or_straight:.107,no_uturn:.084,priority:.09,crosswalk:.073,stop:.083};
function dimensions(key){key.button.geometry.computeBoundingBox();return key.button.geometry.boundingBox.getSize(new Vector3());}
function localBounds(model,object){model.root.updateMatrixWorld(true);return new Box3().setFromObject(object).applyMatrix4(new Matrix4().copy(model.root.matrixWorld).invert());}
async function snapshotPixels(frame){
  await frame.evaluate(()=>{const canvas=document.getElementById('controller-3d-canvas'),gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);window.__qaControllerRestPixels=pixels;});
}
async function changedPixels(frame){
  return frame.evaluate(()=>{const canvas=document.getElementById('controller-3d-canvas'),gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),before=window.__qaControllerRestPixels;const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let count=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-before[i])+Math.abs(pixels[i+1]-before[i+1])+Math.abs(pixels[i+2]-before[i+2])>10)count++;delete window.__qaControllerRestPixels;return count;});
}
try{
  const model=createLisbonController();
  try{
    assert.deepEqual([...model.keys.keys()],canonicalIds);
    console.log('PASS The revised controller retains all twenty-two original signs in their canonical order');
    checks++;
    const shoulders=['fire_exit','aed'].map(id=>model.keys.get(id));
    check(shoulders.every(key=>key.shoulder===true&&dimensions(key).x>.19&&dimensions(key).y>.06&&dimensions(key).z>.005&&dimensions(key).z<.035),'The sculpted L1/R1 signs retain their wide shoulder outline with less than three quarters of the former .048 vertical thickness');
    check(Math.abs(shoulders[0].button.position.x+shoulders[1].button.position.x)<1e-8&&Math.abs(shoulders[0].button.position.y-shoulders[1].button.position.y)<1e-8&&Math.abs(shoulders[0].button.position.z-shoulders[1].button.position.z)<1e-8,'The two upper shoulder controls are physically symmetric');
    check([...model.keys.values()].filter(key=>key.id!=='destination').every(key=>{const size=dimensions(key);return size.x>0&&size.y>0&&size.z>0;}),'All physical sign controls retain genuine three-dimensional geometry');
    check(dimensions(model.keys.get('pharma')).x>.12&&dimensions(model.keys.get('destination')).x>.215,'The pharmacy cross and central destination display have visibly larger artwork surfaces');
    const surrounds=model.root.getObjectsByProperty('name','Circular sign bank');
    check(surrounds.length===2&&surrounds.every(well=>well.isMesh&&localBounds(model,well).getSize(new Vector3()).x>.23),'Two recessed circular surrounds frame the original banks');
    const display=model.keys.get('destination'),shell=model.root.getObjectByName('Bevelled graphite controller shell');
    check(display.kind==='display'&&display.display?.bezel?.isMesh&&display.display?.glass?.isMesh,'Destination is a distinct embedded display assembly with a physical bezel and glass');
    const screenBounds=localBounds(model,display.button),glassBounds=localBounds(model,display.display.glass),shellBounds=localBounds(model,shell);
    check(display.display.glass.material.transparent&&screenBounds.max.y<=glassBounds.min.y+.002,'The original destination image lies beneath the transparent glass');
    check(Math.abs(screenBounds.max.y-shellBounds.max.y)<.025,'The mini-screen is embedded near the shell face rather than raised like a push-button');
    const displayY=display.button.position.y,displayPressure=display.applyPressure?.(1,true);model.root.updateMatrixWorld(true);
    check(displayPressure&&displayPressure.travel<.001&&displayPressure.tilt<.001&&Math.abs(display.button.position.y-displayY)<.001,'Press feedback keeps the glass-covered destination screen stationary');display.applyPressure(0,true);
    for(const id of ['roundabout','left_or_straight']){
      const key=model.keys.get(id),stick=key.stick;
      check(key.kind==='stick'&&stick?.socket?.isMesh&&stick?.boot?.isMesh&&stick?.stem?.isMesh&&stick?.cap?.isMesh&&stick?.pivot,'The '+id+' sign sits on a true socket, rubber boot, shaft and pivoting thumb cap');
      check(localBounds(model,stick.stem).getSize(new Vector3()).y>.02&&stick.pivot.getObjectById(key.button.id),'The '+id+' artwork belongs to the movable joystick assembly above a real shaft');
      const rest=stick.pivot.quaternion.clone(),pressed=key.applyPressure?.(1,true);
      check(pressed?.tilt>.15&&stick.pivot.quaternion.angleTo(rest)>.15,'The '+id+' cap visibly tilts under normal-motion input');
      key.applyPressure(0,true);check(stick.pivot.quaternion.angleTo(rest)<.000001,'The '+id+' spring returns its cap to the exact neutral pose');
    }
    const ordinary=[...model.keys.values()].filter(key=>!['fire_exit','aed','pharma','destination'].includes(key.id));
    check(ordinary.every(key=>key.size>=previousSizes[key.id])&&ordinary.filter(key=>key.size>previousSizes[key.id]).length>=12,'The other sign buttons grow modestly without shrinking their original artwork');
    for(const [left,right] of [['priority','stop'],['dead_end','no_uturn']]){
      const a=model.keys.get(left),b=model.keys.get(right);
      check(Math.abs(a.button.position.z-b.button.position.z)<1e-8&&Math.abs(a.y-b.y)<1e-8,'The '+left+' and '+right+' controls share one physical row');
    }
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
        const payload=JSON.parse(request.postData()),id=payload.id||payload.sign;logged.push(id);
        return {status:200,contentType:'application/json',body:JSON.stringify({access:true,sign:id,url:'https://abujjbkbbiumxrokozph.supabase.co/storage/v1/object/sign/play-signals/'+id+'.mp4?token=controller-fixture'})};
      }
      if(address.pathname.startsWith('/storage/v1/object/sign/play-signals/'))return {headers:{'Access-Control-Allow-Origin':'*'},contentType:'video/mp4',body:fs.readFileSync(new URL('../../space/assets/slides/init.mp4',import.meta.url))};
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
        const boardBack=child.locator('#sdisc-board-close'),credit=child.locator('#controller-credit');
        check(await boardBack.evaluate(button=>{
          const style=getComputedStyle(button);
          return button.textContent==='BACK'&&Math.abs(button.getBoundingClientRect().left-14)<1&&style.backgroundColor==='rgba(0, 0, 0, 0)';
        }),'The active controller BACK uses the shared plain left-hand position');
        check(await credit.isVisible()&&(await credit.textContent()).trim()==='Neurological & Digital Street Art by Wah'&&
          await credit.locator('.wah-signature').evaluate(mark=>getComputedStyle(mark).maskImage.includes('wavywah_signature.png')),
        'The controller credits Wah with the signature from the Totehmpaper');
        const meaning=child.getByRole('link',{name:'Get Higher to see the true meaning'});
        check(await meaning.isVisible()&&await meaning.getAttribute('href')==='/get_higher'&&await meaning.locator('use[href="#higher-slogan"]').count()===1,'The controller reveals the native Higher slogan invitation');
        check(await meaning.locator('.get-word').evaluate(word=>getComputedStyle(word).fontFamily.includes('Quantico')&&getComputedStyle(word).color==='rgb(251, 213, 202)'),'Get uses the authored Quantico coral lettering');
        check(await child.evaluate(()=>['experience-front-canvas','sdisc-cover-next'].every(id=>getComputedStyle(document.getElementById(id)).display==='none')),'Direct entry hides the front canvas and Discover button immediately');
        const screen=await child.locator('.street-rock[role=button]').evaluateAll(keys=>({
          width:innerWidth,height:innerHeight,centers:keys.map(key=>{
            const {x,y,width,height}=key.getBoundingClientRect();
            return [key.getAttribute('aria-label'),x+width/2,y+height/2];
          })
        }));
        assert.deepEqual(screen.centers.map(([label])=>label),canonicalIds.map(id=>id.replace(/_/g,' ')));
        check(screen.centers.every(([,x,y])=>x>0&&x<screen.width&&y>0&&y<screen.height),'All original signs remain in canonical order and inside the full-screen view');
        const center=id=>screen.centers[canonicalIds.indexOf(id)];
        for(const [left,right] of [['priority','stop'],['dead_end','no_uturn'],['fire_exit','aed']]){
          check(Math.abs(center(left)[2]-center(right)[2])<.1,'The '+left+' and '+right+' controls are level in the actual projected view');
        }
        const misses=await child.locator('.street-rock[role=button]').evaluateAll(keys=>keys.flatMap(key=>{
          const box=key.getBoundingClientRect();
          const hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
          return key.tabIndex===0&&hit===key?[]:[{key:key.getAttribute('aria-label'),hit:hit?.getAttribute('aria-label')||hit?.id||hit?.className,x:box.x,y:box.y,w:box.width}];
        }));
        check(!misses.length,'All projected 3D keys have their own clickable and focusable center '+JSON.stringify(misses));
        const canvas=await child.locator('#controller-3d-canvas').boundingBox();
        check(canvas.width>=1270&&canvas.height>=840,'The live 3D controller has a full-screen canvas');
        await fixture.pg.screenshot({path:directory+'/owned.png'});
        // Hold a real pointer down before the click. Reading the retained GPU
        // frame proves that feedback changes the rendered object itself.
        await fixture.pg.emulateMedia({reducedMotion:'no-preference'});
        await snapshotPixels(child);
        const stop=await child.getByRole('button',{name:'stop',exact:true}).boundingBox();
        await fixture.pg.mouse.move(stop.x+stop.width/2,stop.y+stop.height/2);await fixture.pg.mouse.down();
        await child.waitForFunction(()=>{const f=__totehm_lisbon().keyFeedback;return f?.id==='stop'&&f.pressure>=.9&&f.travel>=.012&&f.mode==='holding';},null,{timeout:5000});
        check(logged.length===0&&await child.locator('.played-sticker').count()===0,'Holding a depressed physical key requests no film and leaves no sticker');
        const changed=await changedPixels(child);
        check(changed>25,'The real STOP press visibly changes '+changed+' controller pixels');
        await fixture.pg.screenshot({path:directory+'/owned-pressed.png'});
        await fixture.pg.mouse.up();
        await child.waitForFunction(()=>{const f=__totehm_lisbon().keyFeedback;return f?.id==='stop'&&f.mode==='activating';},null,{timeout:5000});
        check(await child.evaluate(()=>!__totehm_lisbon().artwork),'Activation retains the visible physical press before opening the original film');
        await child.waitForFunction(()=>{
          const state=__totehm_lisbon();
          return state.sequence==='phrase'&&state.typewriter.typed>0&&state.typewriter.typed<state.typewriter.total;
        },null,{timeout:15000});
        check(await child.locator('#xp-phrase').getAttribute('aria-label')==='Yes, stop that sht.'&&!(await child.locator('#vidWrap').isVisible()),'The authored phrase types fullscreen before its artwork is visible');
        check(await child.locator('#xp-phrase').evaluate(phrase=>{
          const style=getComputedStyle(phrase);
          return style.fontFamily.includes('Quantico')&&style.color==='rgb(251, 213, 202)'&&parseFloat(style.fontSize)>32;
        }),'The fullscreen phrase uses large Quantico coral lettering');
        await child.waitForFunction(()=>__totehm_lisbon().activeSign==='stop'&&__totehm_lisbon().sequence==='art'&&__totehm_lisbon().playAttempted,null,{timeout:25000});
        check(logged.join(',')==='stop','The physical STOP key requests just its original signed film');
        check(await child.locator('#vid').evaluate(video=>{
          const bounds=video.getBoundingClientRect();
          return Math.abs(bounds.x+bounds.width/2-innerWidth/2)<1&&Math.abs(bounds.y+bounds.height/2-innerHeight/2)<1&&getComputedStyle(video).objectFit==='contain';
        }),'The signed art is centred and preserves its native aspect ratio');
        await child.locator('#vid').evaluate(video=>video.dispatchEvent(new Event('ended')));
        await child.waitForFunction(()=>{const d=__totehm_lisbon();return d.board&&d.activeSign===null&&d.keyFeedback.pressure<.01;});
        check(await child.locator('.street-rock[role=button]').count()===22,'Returning from a film releases the physical key and restores the full controller');
        await child.waitForFunction(()=>__totehm_lisbon().controller.stickers.includes('stop'));
        const stopSticker=child.getByRole('button',{name:'stop',exact:true}).locator('.played-sticker');
        check(await stopSticker.count()===1&&!(await stopSticker.isVisible()),'STOP carries a real 3D sticker and its DOM fallback stays hidden over WebGL');
        await fixture.pg.screenshot({path:directory+'/owned-sticker.png'});
        await child.getByRole('button',{name:'stop',exact:true}).focus();
        const beforeSpace=logged.length;await fixture.pg.keyboard.down('Space');
        await child.waitForFunction(()=>{const f=__totehm_lisbon().keyFeedback;return f?.id==='stop'&&f.pressure>=.9&&f.mode==='holding';});
        check(logged.length===beforeSpace,'Holding Space depresses the selected key without starting its film');
        await fixture.pg.keyboard.up('Space');
        await child.waitForFunction(()=>__totehm_lisbon().artwork&&__totehm_lisbon().activeSign==='stop');
        check(logged.length===beforeSpace+1&&logged.at(-1)==='stop','Releasing Space activates exactly the selected original signed film');
        await child.locator('#xp-close').click();await child.waitForFunction(()=>__totehm_lisbon().board&&__totehm_lisbon().activeSign===null);
        await child.getByRole('button',{name:'stop',exact:true}).focus();const beforeEnter=logged.length;
        await fixture.pg.keyboard.press('Enter');await child.waitForFunction(()=>__totehm_lisbon().artwork&&__totehm_lisbon().activeSign==='stop');
        check(logged.length===beforeEnter+1&&logged.at(-1)==='stop','Enter also activates one original clip from the physical controller');
        await child.locator('#xp-close').click();await child.waitForFunction(()=>__totehm_lisbon().activeSign===null&&__totehm_lisbon().keyFeedback.pressure<.01);
        check((await child.evaluate(()=>__totehm_controller_entry().phase))==='board','Closing a keyboard-activated work leaves a ready, unpressed controller');
        for(const id of ['roundabout','left_or_straight']){
          const control=child.getByRole('button',{name:id.replace(/_/g,' '),exact:true}),anchor=await control.boundingBox(),beforeTilt=logged.length;
          await snapshotPixels(child);await fixture.pg.mouse.move(anchor.x+anchor.width/2,anchor.y+anchor.height/2);await fixture.pg.mouse.down();
          await child.waitForFunction(id=>{const f=__totehm_lisbon().keyFeedback;return f?.id===id&&f.kind==='stick'&&f.pressure>=.9&&f.tilt>.15&&f.travel>.001&&f.mode==='holding';},id);
          const held=await control.boundingBox(),difference=await changedPixels(child);
          check(logged.length===beforeTilt&&difference>25,'Holding the '+id+' analog stick visibly tilts it without requesting media ('+difference+' changed pixels)');
          check(Math.max(...['x','y','width','height'].map(axis=>Math.abs(anchor[axis]-held[axis])))<.1,'The moving '+id+' thumb cap retains its stable clickable anchor');
          await fixture.pg.screenshot({path:directory+'/'+id+'-tilted.png'});
          await fixture.pg.mouse.move(5,5);await fixture.pg.mouse.up();
          await child.waitForFunction(()=>{const f=__totehm_lisbon().keyFeedback;return f.pressure<.01&&f.tilt<.01&&f.travel<.001;});
          check(logged.length===beforeTilt,'Leaving the '+id+' stick restores its neutral spring pose without playing a film');
          await control.click();await child.waitForFunction(id=>__totehm_lisbon().artwork&&__totehm_lisbon().activeSign===id,id);
          check(logged.length===beforeTilt+1&&logged.at(-1)===id,'The '+id+' joystick still selects its own original signed film');
          await child.locator('#xp-close').click();await child.waitForFunction(()=>__totehm_lisbon().activeSign===null);
        }
        check(await stopSticker.count()===1,'Replaying STOP keeps a single sticker');
        const thumbStickers=['roundabout','left or straight'];
        await child.waitForFunction(()=>['roundabout','left_or_straight'].every(id=>__totehm_lisbon().controller.stickers.includes(id)));
        const placements=[];
        for(const name of thumbStickers){
          placements.push(await child.getByRole('button',{name,exact:true}).locator('.played-sticker').evaluate(el=>
            [el.style.left,el.style.top,el.style.getPropertyValue('--angle')]));
        }
        check(placements[0].every((value,index)=>value!==placements[1][index]),'The concave joystick caps carry stickers at distinct positions and angles');
        const beforeDisplay=logged.length;await child.getByRole('button',{name:'destination',exact:true}).click();
        await child.waitForFunction(()=>__totehm_lisbon().artwork&&__totehm_lisbon().activeSign==='destination');
        check(logged.length===beforeDisplay+1&&logged.at(-1)==='destination','The embedded mini-screen retains its own original signed destination film');
        await child.locator('#xp-close').click();await child.waitForFunction(()=>__totehm_lisbon().activeSign===null);
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
