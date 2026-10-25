/** Four scales of a living wood fire, entirely synthesised. No audio file,
 * timer-driven popping loop or AudioContext exists before a real gesture.
 * A supplied context is borrowed: muting/disposal never suspends or closes it.
 */
export function createFireAudio({context:sharedContext=null,destination=null}={}){
 const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
 const ownsContext=!sharedContext;
 let supported=!!sharedContext||typeof Context==='function',context=null,master=null,limiter=null,bus=null,reverb=null,reverbGain=null;
 let unlocked=false,muted=false,active=false,disposed=false,proximity=0,gainTarget=0;
 let resumeBlocked=false,resumePromise=null,suspendPromise=null,suspendTimer=null;
 const layers=[],modulators=[],buffers=[],statistics=[];
 const synthesisRate=24000,maxGain=.48;
 const clamp=n=>Math.max(0,Math.min(1,n));
 const audible=()=>unlocked&&active&&!muted&&!disposed&&proximity>.001;
 function random(seed){let value=seed>>>0;return()=>{value^=value<<13;value^=value>>>17;value^=value<<5;return(value>>>0)/4294967296;};}
 function cancelSuspension(){if(suspendTimer!==null)globalThis.clearTimeout(suspendTimer);suspendTimer=null;}
 function glide(parameter,value,seconds=.16){
  if(!context||context.state==='closed')return;
  const time=context.currentTime;
  if(typeof parameter.cancelAndHoldAtTime==='function')parameter.cancelAndHoldAtTime(time);
  else{const held=parameter.value;parameter.cancelScheduledValues(time);parameter.setValueAtTime(held,time);}
  parameter.setTargetAtTime(value,time,seconds);
 }
 function makeBuffer(seconds,kind,seed){
  // Wood has little useful energy above 10 kHz. Native resampling keeps the
  // texture crisp while these long independent loops fit in phone memory.
  const rate=Math.min(context.sampleRate||synthesisRate,synthesisRate),length=Math.ceil(rate*seconds);
  const buffer=context.createBuffer(2,length,rate),left=buffer.getChannelData(0),right=buffer.getChannelData(1),rng=random(seed);
  let events=0,families=0;
  if(kind==='body'){
   let a=0,b=0,c=0,drift=0;
   for(let i=0;i<length;i++){
    const n=rng()*2-1;a=.991*a+.058*n;b=.953*b+.077*n;c=.84*c+.11*n;
    drift=.99985*drift+.00015*(rng()*2-1);
    const t=i/rate,breath=.78+.11*Math.sin(t*.47+.8)+.07*Math.sin(t*.813+2.7)+drift*6;
    // A gentle, dry combustion bed supports the transients. It should not
    // sound like an extra wind generator or a broadband recorded hiss.
    const centre=(a*.64+b*.29+c*.13)*breath;
    left[i]=centre;right[i]=centre*.86+(rng()*2-1)*.004;
   }
  }else{
   function fracture(at,size,pan,weight=1){
    const count=Math.ceil(rate*(size===0?.024:size===1?.115:.27));
    const start=Math.floor(at*rate),delay=Math.floor((.00012+.00038*Math.abs(pan))*rate);
    const l=Math.sqrt((1-pan)*.5),r=Math.sqrt((1+pan)*.5);
    const amplitude=(size===0?.045+rng()**2*.14:size===1?.22+rng()*.35:.39+rng()*.43)*weight;
    const pitch=size===0?900+rng()*2400:size===1?270+rng()*540:105+rng()*170;
    const decay=size===0?.002+rng()*.004:size===1?.010+rng()*.020:.018+rng()*.033;
    const phase=rng()*6.28318,phase2=rng()*6.28318;
    let low=0,previous=0;
    events++;
    for(let n=0;n<count&&start+n+delay<length;n++){
     const t=n/rate,white=rng()*2-1;low=.61*low+.39*white;
     const bright=white-previous*.64;previous=white;
     const attack=1-Math.exp(-t/(size===0?.00007:.00018));
     const envelope=attack*Math.exp(-t/decay);
     // A brief broadband fracture excites short, inharmonic wooden modes.
     // Their fast decay avoids the synthetic bell/laser sound of a single
     // long oscillator, and the grain remains different on every break.
     const grain=low*.49+bright*Math.exp(-t*440)*.43;
     const mode1=Math.sin(t*pitch*6.28318*(1-.08*Math.min(1,t*30)))*.19;
     const mode2=Math.sin(t*pitch*2.317*6.28318+phase)*Math.exp(-t*43)*.12;
     const mode3=Math.sin(t*pitch*4.871*6.28318+phase2)*Math.exp(-t*110)*.065;
     const texture=size===0?bright*.72+mode3*.16:grain+mode1+mode2+mode3;
     const sample=amplitude*envelope*texture;
     left[start+n]+=sample*l;right[start+n+delay]+=sample*r;
     // Quiet local reflections give each crack body instead of the brittle
     // isolated clicks of a noise gate. They remain part of the same event.
     if(size>0){const bounce=start+n+Math.floor(rate*.0137);if(bounce<length){left[bounce]+=sample*r*.085;right[bounce]+=sample*l*.067;}}
    }
   }
   let cursor=.21;
   const familyRate=kind==='embers'?5.2:kind==='splinters'?1.42:.24;
   while(cursor<seconds-.55){
    // Exponential pauses produce quiet intervals; each fractured pocket of
    // wood releases a different small cascade rather than a steady metronome.
    cursor+=.025-Math.log(Math.max(.00001,1-rng()))/familyRate;
    if(cursor>=seconds-.55)break;families++;
    const pan=(rng()*2-1)*.72,size=kind==='embers'?0:kind==='splinters'?1:2;
    fracture(cursor,size,pan);
    const count=size===0?2+Math.floor(rng()*6):size===1?1+Math.floor(rng()*4):3+Math.floor(rng()*6);
    let offset=cursor;
    for(let k=0;k<count;k++){
     offset+=(size===0?.006:.011)+rng()**2*(size===2?.085:.037);
     fracture(offset,0,Math.max(-.85,Math.min(.85,pan+(rng()-.5)*.25)),(.48+rng()*.5)*(1-k/(count*1.6)));
     if(size===2&&k===1)fracture(offset,1,pan*.86,.47);
    }
   }
  }
  let peak=0,sum=0;
  const edge=Math.min(Math.floor(rate*.10),Math.floor(length/2));
  for(const data of [left,right]){
   for(let i=0;i<edge;i++){const fade=(i/edge)**2*(3-2*i/edge);data[i]*=fade;data[length-1-i]*=fade;}
   for(let i=0;i<length;i++)peak=Math.max(peak,Math.abs(data[i]));
  }
  const normalise=peak>.88?.88/peak:1;
  for(const data of [left,right])for(let i=0;i<length;i++){data[i]*=normalise;sum+=data[i]*data[i];}
  statistics.push({kind,seconds,events,families,peak:+(peak*normalise).toFixed(4),rms:+Math.sqrt(sum/(length*2)).toFixed(5)});
  buffers.push(buffer);return buffer;
 }
 function modulation(parameter,frequency,depth,offset=0){
  const source=context.createOscillator(),amount=context.createGain();source.type='sine';source.frequency.value=frequency;
  if(offset&&typeof context.createPeriodicWave==='function')source.setPeriodicWave(context.createPeriodicWave(new Float32Array([0,Math.sin(offset)]),new Float32Array([0,Math.cos(offset)])));
  amount.gain.value=depth;source.connect(amount);amount.connect(parameter);source.start();modulators.push({source,amount});
 }
 function layer(kind,buffer,{gain,highpass,lowpass,rate,offset,pan}){
  const source=context.createBufferSource(),high=context.createBiquadFilter(),low=context.createBiquadFilter(),level=context.createGain();
  source.buffer=buffer;source.loop=true;source.playbackRate.value=rate;
  high.type='highpass';high.frequency.value=highpass;high.Q.value=.45;
  low.type='lowpass';low.frequency.value=lowpass;low.Q.value=.45;level.gain.value=gain;
  source.connect(high);high.connect(low);low.connect(level);
  let panner=null;if(typeof context.createStereoPanner==='function'){panner=context.createStereoPanner();panner.pan.value=pan;level.connect(panner);panner.connect(bus);}else level.connect(bus);
  source.start(0,offset);layers.push({kind,source,high,low,level,panner});return{level,low};
 }
 function initialise(){
  context=sharedContext||new Context({latencyHint:'interactive'});
  if(context.state==='closed')throw new Error('Closed hearth audio context');
  master=context.createGain();master.gain.value=0;
  limiter=context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=3.6;limiter.attack.value=.002;limiter.release.value=.11;
  limiter.connect(master);master.connect(destination||context.destination);
  bus=context.createGain();bus.connect(limiter);
  // Subtle glass-room early reflections: a short diffuse tail, no cavernous
  // reverberation and no delay feedback. Construction is optional for hosts
  // which provide a deliberately minimal borrowed audio graph.
  if(typeof context.createConvolver==='function'){
   reverb=context.createConvolver();reverb.normalize=false;reverbGain=context.createGain();reverbGain.gain.value=.14;
   // ConvolverNode requires the impulse to match its context sample rate;
   // only AudioBufferSourceNode resamples the four lower-rate fire textures.
   const rate=context.sampleRate||synthesisRate,length=Math.floor(rate*.23),impulse=context.createBuffer(2,length,rate),rng=random(0x726f6f6d);
   for(let c=0;c<2;c++){const data=impulse.getChannelData(c);for(let i=Math.floor(rate*.018);i<length;i++){const t=i/rate;data[i]=(rng()*2-1)*Math.exp(-t*27)*.014;}for(const [t,g]of [[.031,.12],[.057,.065],[.089,.027]])data[Math.floor(rate*(t+c*.0017))]+=g;}
   reverb.buffer=impulse;bus.connect(reverb);reverb.connect(reverbGain);reverbGain.connect(limiter);
  }
  const body=layer('warmth',makeBuffer(19.371,'body',0x68656172),{gain:.34,highpass:72,lowpass:720,rate:.973,offset:.27,pan:0});
  layer('embers',makeBuffer(37.711,'embers',0x656d6265),{gain:1.14,highpass:700,lowpass:7400,rate:1.013,offset:.83,pan:.04});
  layer('splinters',makeBuffer(49.073,'splinters',0x73706c69),{gain:1.27,highpass:175,lowpass:5900,rate:.991,offset:1.79,pan:-.025});
  const wood=layer('wood',makeBuffer(61.133,'wood',0x776f6f64),{gain:1.12,highpass:83,lowpass:4200,rate:1.007,offset:1.19,pan:0});
  modulation(body.level.gain,.067,.047,.4);modulation(body.low.frequency,.041,90,1.2);modulation(wood.level.gain,.053,.055,2.1);
 }
 async function resume(){
  if(!context||context.state==='closed'||disposed||resumeBlocked)return false;
  if(suspendPromise){await suspendPromise;if(!context||context.state==='closed'||disposed||resumeBlocked)return false;}
  if(context.state==='running')return true;if(resumePromise)return resumePromise;
  let operation;try{operation=context.resume();}catch{resumeBlocked=true;return false;}
  resumePromise=Promise.resolve(operation).then(()=>context?.state==='running').catch(()=>{resumeBlocked=true;return false;}).finally(()=>{resumePromise=null;});
  return resumePromise;
 }
 function mix(){
  if(!context||disposed||context.state==='closed')return;
  gainTarget=audible()?maxGain*proximity**1.38:0;
  glide(master.gain,gainTarget,gainTarget?.20:.025);
 }
 function synchronise(){
  if(!context||disposed||context.state==='closed')return;
  cancelSuspension();mix();
  if(audible()){void resume();return;}
  // Shared weather must retain its clock; only an owned silent context sleeps.
  if(ownsContext)suspendTimer=globalThis.setTimeout(()=>{
   suspendTimer=null;if(!audible()&&context?.state==='running'){
    try{suspendPromise=Promise.resolve(context.suspend()).catch(()=>{}).finally(()=>{suspendPromise=null;});}catch{}
   }
  },180);
 }
 async function unlock(){
  if(disposed||!supported)return false;
  try{
   if(!context)initialise();resumeBlocked=false;
   const running=await resume();if(!running||disposed)return false;
   unlocked=true;synchronise();return true;
  }catch{
   supported=false;gainTarget=0;
   if(ownsContext&&context&&context.state!=='closed')Promise.resolve(context.close()).catch(()=>{});
   return false;
  }
 }
 function setMuted(value){const next=!!value;if(disposed||next===muted)return;muted=next;synchronise();}
 function update(state={}){
  if(disposed)return;
  const nextActive=typeof state.active==='boolean'?state.active:active;
  const nextProximity=Number.isFinite(state.proximity)?clamp(state.proximity):proximity;
  const activityChanged=nextActive!==active,rangeChanged=Math.abs(nextProximity-proximity)>.002;
  const audibleChanged=(nextProximity>.001)!==(proximity>.001);
  active=nextActive;proximity=nextProximity;
  if(activityChanged||audibleChanged)synchronise();else if(rangeChanged)mix();
 }
 function dispose(){
  if(disposed)return;disposed=true;active=false;gainTarget=0;cancelSuspension();
  for(const item of [...layers,...modulators]){try{item.source.stop();}catch{}item.source.disconnect();item.amount?.disconnect();item.high?.disconnect();item.low?.disconnect();item.level?.disconnect();item.panner?.disconnect();}
  layers.length=modulators.length=buffers.length=0;master?.disconnect();limiter?.disconnect();bus?.disconnect();reverb?.disconnect();reverbGain?.disconnect();if(reverb)reverb.buffer=null;
  if(ownsContext&&context&&context.state!=='closed')Promise.resolve(context.close()).catch(()=>{});
 }
 return{unlock,setMuted,update,dispose,diagnostics:()=>({kind:'procedural-hearth-audio',supported,unlocked,muted,active:!disposed&&active,audible:audible(),woodCrackle:true,resonantWoodPops:true,layeredWoodFractures:true,clusteredEmbers:true,correlatedStereo:true,earlyReflections:!!reverb,longIndependentLoops:true,synthesisRate,textureStatistics:statistics,proximity,gain:disposed?0:gainTarget,maxGain,state:disposed?'closed':context?.state||(supported?'uninitialized':'unsupported'),sharedContext:!ownsContext,voices:disposed?0:layers.length,modulators:disposed?0:modulators.length,loopBuffers:disposed?0:buffers.length,clock:+(context?.currentTime||0).toFixed(3),externalFiles:0,intervals:0,disposed})};
}
