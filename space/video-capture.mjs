// Camera frames are cropped before their only encode: every new Spot is 9:16.
// https://w3c.github.io/mediacapture-main/
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
export const VIDEO = Object.freeze({width:1080,height:1920,fps:30,bitrate:10000000,audioBitrate:192000,maxBytes:48000000});

export function cameraConstraints(){
  const video={facingMode:{ideal:'environment'},width:{ideal:2160},height:{ideal:3840},aspectRatio:{ideal:9/16},frameRate:{ideal:VIDEO.fps,max:VIDEO.fps}};
  // A wide sensor needs enough source pixels for a sharp vertical crop.
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
  const sw=video.videoWidth,sh=video.videoHeight;
  // Exact ratio and even dimensions, with no artificial upscale of a weak camera.
  const scale=Math.floor(Math.min(VIDEO.width/9,sw/9,sh/16)/2)*2;
  if(scale<2) throw new Error('Camera resolution unavailable');
  const canvas=document.createElement('canvas');canvas.width=scale*9;canvas.height=scale*16;
  const context=canvas.getContext('2d',{alpha:false});
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
  return {stream:output,width:canvas.width,height:canvas.height,fps,sourceWidth:sw,sourceHeight:sh,stop(){
    if(closed) return;closed=true;
    if(hasVideoFrames) video.cancelVideoFrameCallback(frame);else cancelAnimationFrame(frame);
    rendered.getTracks().forEach(t=>t.stop());
  }};
}
