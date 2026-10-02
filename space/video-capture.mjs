// Keep the camera's native stream whenever it is already 9:16.
// https://w3c.github.io/mediacapture-main/
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
export const VIDEO = Object.freeze({width:1080,height:1920,fps:30,bitrate:10000000,audioBitrate:192000,maxBytes:48000000});

export function cameraConstraints(){
  const video={facingMode:{ideal:'environment'},width:{ideal:VIDEO.width},height:{ideal:VIDEO.height},aspectRatio:{ideal:9/16},frameRate:{ideal:VIDEO.fps,max:VIDEO.fps}};
  // Avoid preview-only browser adaptations: some recorders encode the raw source.
  if(navigator.mediaDevices.getSupportedConstraints?.().resizeMode) video.resizeMode={ideal:'none'};
  return {video,audio:true};
}

export async function cameraReady(video){
  if(video.readyState>=2 && video.videoWidth && video.videoHeight) return;
  await new Promise((resolve,reject)=>{
    const done=error=>{clearTimeout(timer);video.removeEventListener('loadeddata',ready);video.removeEventListener('error',failed);error?reject(error):resolve();};
    const ready=()=>{if(video.videoWidth && video.videoHeight) done();};
    const failed=()=>done(new Error('Camera frames unavailable'));
    const timer=setTimeout(failed,8000);
    video.addEventListener('loadeddata',ready);video.addEventListener('error',failed);ready();
  });
}

export async function portraitCapture(video,source){
  await cameraReady(video);
  const track=source.getVideoTracks()[0],cap=track.getCapabilities?.() || {};
  const continuous={};
  for(const key of ['focusMode','exposureMode','whiteBalanceMode']) if(cap[key]?.includes('continuous')) continuous[key]='continuous';
  if(Object.keys(continuous).length) try{await track.applyConstraints({advanced:[continuous]});}catch{}
  let sw=video.videoWidth,sh=video.videoHeight;
  if(track.getSettings?.().resizeMode!=='crop-and-scale' && Math.abs(sw*16-sh*9)<=2 && sw<=VIDEO.width && sh<=VIDEO.height){
    return {stream:source,width:sw,height:sh,fps:Math.min(VIDEO.fps,track.getSettings?.().frameRate || VIDEO.fps),sourceWidth:sw,sourceHeight:sh,path:'native',stop(){}};
  }
  // A landscape source needs enough pixels for a real Full HD vertical crop.
  if(sw/sh>1 && Math.min(sw,sh*9/16)<VIDEO.width && cap.width?.max>=3840){
    try{await track.applyConstraints({width:{ideal:3840},height:{ideal:2160},frameRate:{ideal:VIDEO.fps,max:VIDEO.fps},resizeMode:'none'});await new Promise(r=>setTimeout(r,150));sw=video.videoWidth;sh=video.videoHeight;}catch{}
  }
  // Exact ratio and even dimensions, with no artificial upscale of a weak camera.
  const scale=Math.floor(Math.min(VIDEO.width/9,sw/9,sh/16)/2)*2;
  if(scale<2) throw new Error('Camera resolution unavailable');
  const canvas=document.createElement('canvas');canvas.width=scale*9;canvas.height=scale*16;
  const context=canvas.getContext('2d',{alpha:false,desynchronized:true});
  if(!context || !canvas.captureStream) throw new Error('Portrait capture unsupported');
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
  const fps=Math.min(VIDEO.fps,track.getSettings?.().frameRate || VIDEO.fps);
  let closed=false,frame=0;
  const draw=()=>{
    if(closed || video.readyState<2 || !video.videoWidth || !video.videoHeight) return;
    const w=video.videoWidth,h=video.videoHeight,cw=Math.min(w,h*9/16),ch=cw*16/9;
    context.drawImage(video,(w-cw)/2,(h-ch)/2,cw,ch,0,0,canvas.width,canvas.height);
  };
  draw();
  const rendered=canvas.captureStream(fps),output=new MediaStream([...rendered.getVideoTracks(),...source.getAudioTracks()]);
  const hasVideoFrames=typeof video.requestVideoFrameCallback==='function';
  const next=()=>{if(closed) return;draw();frame=hasVideoFrames?video.requestVideoFrameCallback(next):requestAnimationFrame(next);};
  next();
  return {stream:output,width:canvas.width,height:canvas.height,fps,sourceWidth:sw,sourceHeight:sh,path:'crop',stop(){
    if(closed) return;closed=true;
    if(hasVideoFrames) video.cancelVideoFrameCallback(frame);else cancelAnimationFrame(frame);
    rendered.getTracks().forEach(t=>t.stop());
  }};
}

export async function recordingMime(capture){
  if(typeof MediaRecorder==='undefined') return '';
  // Supported is not necessarily smooth: prefer H.264, then efficient codecs.
  const candidates=['video/mp4;codecs=avc1.42E028,mp4a.40.2','video/mp4;codecs=avc1','video/webm;codecs=vp8,opus','video/mp4','video/webm;codecs=vp9,opus','video/webm'].filter(t=>MediaRecorder.isTypeSupported(t));
  if(!candidates.length) return '';
  if(!navigator.mediaCapabilities?.encodingInfo) return candidates[0];
  const checks=Promise.all(candidates.map(async mime=>{
    try{const info=await navigator.mediaCapabilities.encodingInfo({type:'record',video:{contentType:mime.replace(/,(mp4a\.40\.2|opus)/,''),width:capture.width,height:capture.height,bitrate:VIDEO.bitrate,framerate:capture.fps}});return {mime,...info};}catch{return {mime};}
  }));
  const result=await Promise.race([checks,new Promise(r=>setTimeout(()=>r(null),400))]);
  return result?.find(c=>c.supported && c.smooth && c.powerEfficient)?.mime || candidates[0];
}
