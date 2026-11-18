import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';

const origin='https://www.totehm.space',out=process.argv[2]||'/tmp/lounge-campfire';
fs.mkdirSync(out,{recursive:true});
const fixture=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#030710}canvas{display:block}</style><script type="module">
import * as T from '/vendor/three-0.180.0.mjs';
import {createGalleryFireplace} from '/gallery-fireplace.mjs';
import {createFireAudio} from '/gallery-fire-audio.mjs';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x030710);scene.add(new T.HemisphereLight(0xaccced,0x3f2519,.75));
const floor=new T.Mesh(new T.PlaneGeometry(35,35),new T.MeshStandardMaterial({color:0x66666a,roughness:.83}));floor.rotation.x=-Math.PI/2;floor.position.y=-.09;scene.add(floor);
const camera=new T.PerspectiveCamera(48,innerWidth/innerHeight,.08,100);camera.position.set(0,1.48,3.12);camera.lookAt(0,.77,0);
const fire=createGalleryFireplace(scene,{outdoor:true,layout:{groundY:-.09,fireplace:{position:[0,0,0]}}}),audio=createFireAudio();
let time=0,motion=false,frames=0,redraw=true;
async function unlock(){await audio.unlock();audio.update({active:true,proximity:.91,pan:.22});}
window.addEventListener('pointerdown',unlock,{once:true});
renderer.setAnimationLoop(now=>{fire.update(time?Math.min((now-time)/1000,.1):0,camera.position,motion);time=now;if(motion||redraw||frames<3){renderer.render(scene,camera);frames++;redraw=false;}});
window.fireFixture={state:()=>({fire:fire.diagnostics(),audio:audio.diagnostics(),objects:fire.root.children.map(o=>o.name),frames,programErrors:renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).length}),moveEye:distance=>{camera.position.z=distance;redraw=true;},motion:value=>motion=value,park:()=>audio.update({active:false}),pixels:()=>{const gl=renderer.getContext(),data=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);let flamePixels=0;for(let i=0;i<data.length;i+=4)if(data[i]>180&&data[i+1]>70&&data[i+2]<data[i]-34)flamePixels++;return flamePixels;}};
</script>`;
const browser=await launch();
let checks=0;
const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
try{
 const {pg,ctx,log}=await page(browser,{dir:'space',origin,viewport:{width:1000,height:760},session:false,network:u=>u.pathname==='/__lounge-campfire'?{status:200,contentType:'text/html',body:fixture}:null});
 try{
  await pg.goto(origin+'/__lounge-campfire');await pg.waitForFunction(()=>window.fireFixture?.state().frames>2,null,{timeout:90000});
  const initial=await pg.evaluate(()=>fireFixture.state());
  check(initial.fire.outdoor&&initial.fire.limestoneStones===14&&!initial.fire.glassSmokeCollector&&!initial.fire.blackPipe,'Lounge fire is contained by stone with smoke in open air');
  check(initial.fire.charredLogs===8&&initial.fire.brokenEndGrain&&initial.fire.barkRelief&&initial.fire.instancedCoals===122,'Eight separate sculpted logs have bark, exposed grain and a bed of coals');
  check(initial.programErrors===0&&await pg.evaluate(()=>fireFixture.pixels())>500,'WebGL draws visible golden flames from the ray-marched volume');
  check(initial.fire.flameSteps===48&&initial.audio.voices===0,'Fire starts at full near quality without playing sound before interaction');
  await pg.screenshot({path:out+'/still.png'});
  await pg.waitForTimeout(150);
  check((await pg.evaluate(()=>fireFixture.state())).fire.time===initial.fire.time,'Reduced motion keeps the fire, sparks and smoke at one instant');
  await pg.mouse.click(900,620);
  await pg.waitForFunction(()=>fireFixture.state().audio.audible,null,{timeout:20000});
  const audible=(await pg.evaluate(()=>fireFixture.state())).audio;
  check(audible.loaded&&audible.voices===1&&audible.woodCrackle&&audible.recordedSeconds>20&&audible.gain>0,'A viewer gesture starts the real wood crackle with distance and pan');
  await pg.evaluate(()=>{fireFixture.park();fireFixture.motion(true);});
  await pg.waitForFunction(t=>fireFixture.state().fire.time>t+.27,initial.fire.time,{timeout:30000});
  const moving=await pg.evaluate(()=>fireFixture.state());
  check(moving.fire.moving&&moving.fire.lightIntensity!==initial.fire.lightIntensity&&!moving.audio.audible,'Combustion animates its light and leaving the scene silences the recording');
  await pg.screenshot({path:out+'/moving.png'});
  await pg.evaluate(()=>fireFixture.moveEye(12));await pg.waitForFunction(()=>fireFixture.state().fire.flameSteps===24);
  check((await pg.evaluate(()=>fireFixture.state())).fire.flameSteps===24,'Remote flame rays use half the near sample budget');
  check(!log.errors.some(e=>/pageerror:|WebGLProgram|VALIDATE_STATUS|shader error|WebGL: INVALID/i.test(e)),'No script or GPU error');
  fs.writeFileSync(out+'/results.json',JSON.stringify({checks,initial,moving,errors:log.errors},null,2));
 }finally{await ctx.close();}
}finally{await browser.close();}
