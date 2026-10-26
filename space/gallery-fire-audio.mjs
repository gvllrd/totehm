/** A genuine wood-fire recording, decoded only after a trusted viewer gesture.
 * The field recording and its provenance live in assets/fire/LICENSE.txt.
 * Its tail and head overlap in one loop buffer; no scheduled popping/noise.
 * A supplied AudioContext is borrowed and is never suspended or closed here.
 */
const RECORDING='/assets/fire/wood-fire.mp3';
const CROSSFADE=.65;
const clamp=n=>Math.max(0,Math.min(1,n));

export function createRecordingLoop(context,recording,seconds=CROSSFADE){
 const overlap=Math.max(1,Math.min(Math.floor(recording.sampleRate*seconds),Math.floor(recording.length/4)));
 const length=recording.length-overlap,loop=context.createBuffer(recording.numberOfChannels,length,recording.sampleRate);
 // Fold the actual recorded ending into its beginning. At both wrap edges
 // neighbouring samples stay neighbouring recording samples, avoiding a click.
 for(let c=0;c<recording.numberOfChannels;c++){
  const input=recording.getChannelData(c),output=loop.getChannelData(c);
  output.set(input.subarray(0,length));
  for(let i=0;i<overlap;i++){
   const angle=i/overlap*Math.PI*.5;
   output[i]=input[length+i]*Math.cos(angle)+input[i]*Math.sin(angle);
  }
 }
 return loop;
}

export function createFireAudio({context:sharedContext=null,destination=null}={}){
 const Context=globalThis.AudioContext||globalThis.webkitAudioContext,ownsContext=!sharedContext;
 let supported=!!sharedContext||typeof Context==='function',context=null,master=null,limiter=null,tone=null,panner=null,source=null,buffer=null;
 let unlocked=false,muted=false,active=false,disposed=false,proximity=0,pan=0,gainTarget=0,loaded=false,loadError=null,statistics=null,recordedSeconds=0;
 let resumeBlocked=false,resumePromise=null,suspendPromise=null,suspendTimer=null,loadPromise=null,loadController=null;
 const maxGain=.72;
 const audible=()=>unlocked&&loaded&&active&&!muted&&!disposed&&proximity>.001;
 function cancelSuspension(){if(suspendTimer!==null)globalThis.clearTimeout(suspendTimer);suspendTimer=null;}
 function glide(parameter,value,seconds=.16){
  if(!context||context.state==='closed')return;
  const time=context.currentTime;
  if(typeof parameter.cancelAndHoldAtTime==='function')parameter.cancelAndHoldAtTime(time);
  else{const held=parameter.value;parameter.cancelScheduledValues(time);parameter.setValueAtTime(held,time);}
  parameter.setTargetAtTime(value,time,seconds);
 }
 function initialise(){
  context=sharedContext||new Context({latencyHint:'interactive'});
  if(context.state==='closed')throw new Error('Closed hearth audio context');
  master=context.createGain();master.gain.value=0;
  limiter=context.createDynamicsCompressor();limiter.threshold.value=-8;limiter.knee.value=9;limiter.ratio.value=2.5;limiter.attack.value=.003;limiter.release.value=.12;
  tone=context.createBiquadFilter();tone.type='lowpass';tone.frequency.value=10000;tone.Q.value=.5;
  if(typeof context.createStereoPanner==='function'){panner=context.createStereoPanner();panner.pan.value=pan;tone.connect(panner);panner.connect(limiter);}else tone.connect(limiter);
  limiter.connect(master);master.connect(destination||context.destination);
 }
 async function loadRecording(){
  if(loaded)return true;if(loadPromise)return loadPromise;if(loadError||disposed)return false;
  loadController=new AbortController();
  loadPromise=(async()=>{
   try{
    const response=await fetch(RECORDING,{signal:loadController.signal});
    if(!response.ok)throw new Error('Recording HTTP '+response.status);
    const bytes=await response.arrayBuffer();if(disposed)return false;
    const recording=await context.decodeAudioData(bytes);if(disposed||context.state==='closed')return false;
    if(!Number.isFinite(recording.duration)||recording.duration<2||recording.length<1)throw new Error('Invalid wood-fire recording');
    recordedSeconds=recording.duration;buffer=createRecordingLoop(context,recording);
    let peak=0,sum=0;
    for(let c=0;c<buffer.numberOfChannels;c++)for(const value of buffer.getChannelData(c)){peak=Math.max(peak,Math.abs(value));sum+=value*value;}
    statistics={kind:'wood-fire-recording',seconds:+recordedSeconds.toFixed(3),peak:+peak.toFixed(4),rms:+Math.sqrt(sum/(buffer.length*buffer.numberOfChannels)).toFixed(5)};
    source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(tone);source.start();loaded=true;synchronise();return true;
   }catch(error){
    if(!disposed){loadError=error?.message||'Wood-fire recording unavailable';console.error('[hearth audio]',loadError);}
    return false;
   }finally{loadPromise=null;loadController=null;}
  })();return loadPromise;
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
  glide(tone.frequency,1800+8200*proximity,.22);
  if(panner)glide(panner.pan,pan,.12);
 }
 function synchronise(){
  if(!context||disposed||context.state==='closed')return;
  cancelSuspension();mix();
  if(audible()){void resume();return;}
  // The world may own a shared weather clock; sleep only our silent context.
  if(ownsContext)suspendTimer=globalThis.setTimeout(()=>{
   suspendTimer=null;if(!audible()&&context?.state==='running'){
    try{suspendPromise=Promise.resolve(context.suspend()).catch(()=>{}).finally(()=>{suspendPromise=null;});}catch{}
   }
  },180);
 }
 async function unlock(){
  if(disposed||!supported)return false;
  try{
   // resume() begins inside the gesture, before any network/decode await.
   if(!context)initialise();resumeBlocked=false;
   const running=await resume();if(!running||disposed)return false;
   unlocked=true;void loadRecording();synchronise();return true;
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
  const nextPan=Number.isFinite(state.pan)?Math.max(-.65,Math.min(.65,state.pan)):pan;
  const activityChanged=nextActive!==active,rangeChanged=Math.abs(nextProximity-proximity)>.002,panChanged=Math.abs(nextPan-pan)>.004;
  const audibleChanged=(nextProximity>.001)!==(proximity>.001);
  active=nextActive;proximity=nextProximity;pan=nextPan;
  if(activityChanged||audibleChanged)synchronise();else if(rangeChanged||panChanged)mix();
 }
 function dispose(){
  if(disposed)return;disposed=true;active=false;gainTarget=0;cancelSuspension();loadController?.abort();
  try{source?.stop();}catch{}source?.disconnect();source=null;buffer=null;
  master?.disconnect();limiter?.disconnect();tone?.disconnect();panner?.disconnect();
  if(ownsContext&&context&&context.state!=='closed')Promise.resolve(context.close()).catch(()=>{});
 }
 return{unlock,setMuted,update,dispose,diagnostics:()=>({kind:'recorded-wood-fire-audio',recording:true,recordingSource:RECORDING,credit:'/assets/fire/LICENSE.txt',supported,unlocked,loaded,loadError,muted,active:!disposed&&active,audible:audible(),woodCrackle:true,correlatedStereo:true,seamlessLoop:true,crossfadeSeconds:CROSSFADE,recordedSeconds:+recordedSeconds.toFixed(3),loopSeconds:+(buffer?.duration||0).toFixed(3),textureStatistics:statistics?[statistics]:[],proximity,pan,gain:disposed?0:gainTarget,maxGain,state:disposed?'closed':context?.state||(supported?'uninitialized':'unsupported'),sharedContext:!ownsContext,voices:source&&!disposed?1:0,loopBuffers:buffer&&!disposed?1:0,clock:+(context?.currentTime||0).toFixed(3),externalFiles:1,intervals:0,disposed})};
}
