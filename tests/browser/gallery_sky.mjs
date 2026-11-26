import assert from 'node:assert/strict';
import fs from 'node:fs';
import {launch,page} from './harness.mjs';

const out=process.argv[2]||'/tmp/totehm-production/starry-sky';
const origin='https://www.totehm.space',results=[];
fs.mkdirSync(out,{recursive:true});
const browser=await launch();
let checks=0;
const check=(condition,message)=>{assert(condition,message);checks++;console.log('PASS '+message);};
const state=pg=>pg.evaluate(()=>{
 const scene=window.__totehm_origin?.()??window.__totehm_gallery?.();
 return {frames:scene?.frames,sky:scene?.sky??scene?.landscape?.sky,ocean:scene?.landscape?.ocean};
});

try{
 const catalogues=[];
 for(const [city,path] of [['lisbon','/lisbon-space'],['new-york','/new-york'],['origin','/origin?arrival=1']]){
  const {pg,ctx,log}=await page(browser,{dir:'space',origin,session:false,viewport:{width:1440,height:900},hasTouch:false});
  const sample={city};results.push(sample);
  try{
   await pg.emulateMedia({reducedMotion:'reduce'});
   await pg.goto(origin+path);
   await pg.waitForFunction(()=>{
    const scene=window.__totehm_origin?.()??window.__totehm_gallery?.();
    const sky=scene?.sky??scene?.landscape?.sky;
    return scene?.frames>0&&sky?.fullSphere&&sky.galacticPlate?.ready&&!sky.galacticPlate.failed&&sky.galacticPlate.blend===1&&sky.lunarPhotograph?.ready&&sky.lunarPhotograph.blend===1;
   },null,{timeout:90000});
   sample.reducedStart=await state(pg);
   const {skyMotion,dimension,catalogue,stars,stellarColours,moonDirection,galacticNormal,companionGalaxy,emissionNebula,brightAnchors,shootingStars,comet,lunarRelief,galacticPlate,skyGrade,skyPalette,astrophotography}=sample.reducedStart.sky;
   catalogues.push({catalogue,stars,stellarColours,moonDirection,galacticNormal,companionGalaxy,emissionNebula,brightAnchors,shootingStars,comet,lunarRelief,galacticPlate,skyGrade,skyPalette,astrophotography});
   check(stars===23500&&stellarColours===7&&brightAnchors===14&&lunarRelief&&sample.reducedStart.sky.photographicLocalContrast&&comet===false&&shootingStars===0,city+' keeps the shared authored stars and lunar relief');
   check(skyGrade==='astrophotographic-night'&&skyPalette==='black-cobalt-violet-turquoise-gold'&&galacticPlate.projection==='full-sphere-astrophotography'&&skyMotion.stellarScintillation&&astrophotography?.ready&&astrophotography.local&&astrophotography.dimensions.join(',')==='2048,1024',city+' renders the night-colour ESO panorama and stellar scintillation');
   const dimensional=city==='origin';
   check(sample.reducedStart.sky.lunarPhotograph.src==='/assets/gallery/sky/lroc-moon-2048.jpg',city+' uses the local NASA lunar map');
   if(!dimensional){
    const water=sample.reducedStart.ocean;
    check(water?.photographicSkyReflection&&water.windAlignedGlints&&water.crestFoamShear,city+' uses the common panorama and directional light on the sea');
   }
   check(skyMotion.paintedShear===dimensional&&skyMotion.driftingDust===dimensional&&skyMotion.colourScintillation===dimensional,city+' uses the intended sky motion');
   if(dimensional)check(dimension?.deepField?.fullSphere&&dimension.deepField.stars===224000&&dimension.deepField.concentrations===16,'Origins renders an independent dense star field over the whole sky');
   check(dimensional?dimension?.refraction&&dimension?.auroras&&dimension?.parallax&&dimension?.dustLayers===4&&dimension?.pairedVeils&&dimension.passage===0:dimension===null,city+' respects the dimensional boundary');
   await pg.waitForTimeout(600);
   sample.reducedEnd=await state(pg);
   check(sample.reducedEnd.sky.time===sample.reducedStart.sky.time&&!sample.reducedEnd.sky.animated&&!sample.reducedEnd.sky.meteor,city+' freezes the sky in reduced motion');
   await pg.emulateMedia({reducedMotion:'no-preference'});
   await pg.waitForFunction(t=>{
    const scene=window.__totehm_origin?.()??window.__totehm_gallery?.();
    const sky=scene?.sky??scene?.landscape?.sky;
    return sky?.animated&&sky.time>t+.6;
   },sample.reducedEnd.sky.time);
   sample.animated=await state(pg);
   check(sample.animated.frames>sample.reducedEnd.frames,city+' keeps rendering an animated sky');
   await pg.screenshot({path:out+'/'+city+'-animated.png'});
   if(dimensional){
    check(sample.animated.sky.dimension.passage>0,'the passage from the event horizon intensifies the moving sky');
    await pg.waitForFunction(()=>window.__totehm_origin?.().sky?.dimension?.passage===0,null,{timeout:60000});
    check((await state(pg)).sky.animated,'Origins keeps moving after the passage settles');
   }
   check(!log.errors.some(error=>/pageerror:|shader error|VALIDATE_STATUS|WebGLProgram/i.test(error)),city+' renders without JavaScript or shader errors');
  }catch(error){
   sample.error=String(error);
   await pg.screenshot({path:out+'/'+city+'-failure.png'}).catch(()=>{});
   throw error;
  }finally{
   sample.log=log;
   fs.writeFileSync(out+'/results.json',JSON.stringify({checks,results},null,2));
   await ctx.close();
  }
 }
 check(catalogues.every(sky=>JSON.stringify(sky)===JSON.stringify(catalogues[0])),'Lisbon, New York and Origin keep the same celestial catalogue and photograph');
 console.log('PASS '+checks+' animated sky checks');
}finally{await browser.close();}
