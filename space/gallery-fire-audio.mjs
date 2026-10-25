/** A small, entirely synthesised hearth. No audio file, timer-driven popping
 * loop or AudioContext exists before unlock() is called from a real gesture.
 * A supplied context is borrowed: muting/disposal never suspends or closes it.
 */
export function createFireAudio({context:sharedContext=null,destination=null}={}){
 const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
 const ownsContext=!sharedContext;
 let supported=!!sharedContext||typeof Context==='function',context=null,master=null,limiter=null;
 let unlocked=false,muted=false,active=false,disposed=false,proximity=0,gainTarget=0;
 let resumeBlocked=false,resumePromise=null,suspendPromise=null,suspendTimer=null;
 const layers=[],modulators=[],buffers=[];
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
  const length=Math.ceil(context.sampleRate*seconds),buffer=context.createBuffer(2,length,context.sampleRate);
  const rng=random(seed),rate=context.sampleRate;
  for(let channel=0;channel<2;channel++){
   const data=buffer.getChannelData(channel);
   if(kind==='body'){
    let b0=0,b1=0,b2=0;
    for(let i=0;i<length;i++){
     const n=rng()*2-1;b0=.9972*b0+.027*n;b1=.985*b1+.045*n;b2=.91*b2+.075*n;
     data[i]=(b0+b1+b2)*.38;
    }
   }else{
    let cursor=Math.floor(rate*.13);
    const fine=kind==='embers';
    while(cursor<length-rate*.25){
     // Uneven pauses and little families of embers avoid a mechanical rhythm.
     cursor+=Math.max(2,Math.floor(-Math.log(Math.max(.00001,1-rng()))*rate/(fine?18:1.13)));
     const duration=rate*(fine?.003+rng()*.019:.045+rng()*.105),count=Math.floor(duration);
     const amplitude=fine?.045+rng()**2*.25:.24+rng()*.38;
     const ring=145+rng()*310,ring2=ring*(2.13+rng()*.28),ring3=910+rng()*950;
     const grainPhase=rng()*Math.PI*2,secondary=.010+rng()*.025;
     let low=0;
     for(let n=0;n<count&&cursor+n<length;n++){
      const t=n/rate,x=n/count,envelope=Math.min(1,n/(rate*.0004))*Math.exp(-x*(fine?7:5));
      const white=rng()*2-1;low=low*.67+white*.33;
      // Wood under heat breaks with a brief bright attack, a damped hollow
      // body and a few tiny splinters. These three time scales make a crackle
      // recognisable instead of a bed of filtered weather-like noise.
      const woodenBody=Math.sin(t*ring*Math.PI*2)*.23+Math.sin(t*ring2*Math.PI*2+grainPhase)*Math.exp(-t*55)*.17;
      const dryAttack=white*Math.exp(-t*320)*.57;
      const splinter=t>secondary?Math.sin((t-secondary)*ring3*Math.PI*2)*Math.exp(-(t-secondary)*210)*.18:0;
      const impulse=fine?white*(.62+.38*Math.cos(t*1400)):low*.40+woodenBody+dryAttack+splinter;
      data[cursor+n]+=amplitude*envelope*impulse;
     }
    }
   }
   // Silence at the long loop seam prevents a periodic edge from making a pop.
   const edge=Math.min(Math.floor(rate*.11),Math.floor(length/2));
   for(let i=0;i<edge;i++){const a=i/edge;data[i]*=a;data[length-1-i]*=a;}
   for(let i=0;i<length;i++)data[i]=Math.max(-.92,Math.min(.92,data[i]));
  }
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
  let panner=null;if(typeof context.createStereoPanner==='function'){panner=context.createStereoPanner();panner.pan.value=pan;level.connect(panner);panner.connect(limiter);}else level.connect(limiter);
  source.start(0,offset);layers.push({kind,source,high,low,level,panner});return{level,low};
 }
 function initialise(){
  context=sharedContext||new Context({latencyHint:'interactive'});
  if(context.state==='closed')throw new Error('Closed hearth audio context');
  master=context.createGain();master.gain.value=0;
  limiter=context.createDynamicsCompressor();limiter.threshold.value=-19;limiter.knee.value=15;limiter.ratio.value=8;limiter.attack.value=.002;limiter.release.value=.19;
  limiter.connect(master);master.connect(destination||context.destination);
  const body=layer('warmth',makeBuffer(15.37,'body',0x68656172),{gain:.29,highpass:65,lowpass:590,rate:.89,offset:.27,pan:-.08});
  layer('embers',makeBuffer(17.83,'embers',0x656d6265),{gain:.76,highpass:480,lowpass:5400,rate:.973,offset:.83,pan:.16});
  const wood=layer('wood',makeBuffer(21.19,'wood',0x776f6f64),{gain:.83,highpass:100,lowpass:3800,rate:1.017,offset:1.19,pan:-.16});
  modulation(body.level.gain,.091,.10,.4);modulation(body.low.frequency,.057,115,1.2);modulation(wood.level.gain,.073,.085,2.1);
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
  gainTarget=audible()?.36*proximity**1.55:0;
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
  layers.length=modulators.length=buffers.length=0;master?.disconnect();limiter?.disconnect();
  if(ownsContext&&context&&context.state!=='closed')Promise.resolve(context.close()).catch(()=>{});
 }
 return{unlock,setMuted,update,dispose,diagnostics:()=>({kind:'procedural-hearth-audio',supported,unlocked,muted,active:!disposed&&active,audible:audible(),woodCrackle:true,resonantWoodPops:true,proximity,gain:disposed?0:gainTarget,maxGain:.36,state:disposed?'closed':context?.state||(supported?'uninitialized':'unsupported'),sharedContext:!ownsContext,voices:disposed?0:layers.length,modulators:disposed?0:modulators.length,loopBuffers:disposed?0:buffers.length,clock:+(context?.currentTime||0).toFixed(3),externalFiles:0,intervals:0,disposed})};
}
