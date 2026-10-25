// Preserve legibility on high density phones. A brief shader compile or asset
// load must never permanently turn the whole world into an upscaled thumbnail.
export function createRenderQuality({mobile=false,pixelRatio=1}={}){
 let native=Math.max(1,Number(pixelRatio)||1),ratio=Math.min(native,mobile?2:1.75);
 let started=null,last=null,changedAt=0,slowTime=0,clearTime=0,changes=0;
 const minimum=()=>Math.min(native,mobile?1.5:1.25),maximum=()=>Math.min(native,mobile?2:1.75);
 function reset(){started=null;last=null;slowTime=clearTime=0;}
 function sample(now,{frameMs=0,renderMs=0}={}){
  if(started===null){started=last=now;return ratio;}
  const elapsed=Math.min(100,Math.max(0,now-last));last=now;
  // Ignore startup and gaps caused by returning to a hidden tab.
  if(now-started<6000||frameMs>500){slowTime=clearTime=0;return ratio;}
  const overloaded=frameMs>80||renderMs>45,clear=frameMs<55&&renderMs<24;
  slowTime=overloaded?slowTime+elapsed:Math.max(0,slowTime-elapsed*2);
  clearTime=clear?clearTime+elapsed:0;
  if(now-changedAt>=8000&&slowTime>=3000&&ratio>minimum()){
   ratio=Math.max(minimum(),ratio-.25);changedAt=now;changes++;slowTime=clearTime=0;
  }else if(now-changedAt>=12000&&clearTime>=12000&&ratio<maximum()){
   ratio=Math.min(maximum(),ratio+.25);changedAt=now;changes++;slowTime=clearTime=0;
  }
  return ratio;
 }
 return{sample,reset,resize(pixelRatio){native=Math.max(1,Number(pixelRatio)||1);ratio=Math.min(maximum(),Math.max(minimum(),ratio));reset();return ratio;},
  diagnostics:()=>({pixelRatio:ratio,nativePixelRatio:native,minPixelRatio:minimum(),maxPixelRatio:maximum(),adaptive:true,recoverable:true,startupGraceMs:6000,changes})};
}
