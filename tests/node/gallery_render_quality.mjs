// A slow phone must remain legible, transient shader compilation must not
// destroy resolution, and sustained spare capacity must recover lost detail.
import assert from 'node:assert/strict';
import {createRenderQuality} from '../../space/gallery-render-quality.mjs';
let checks=0;
const check=(condition,message)=>{assert(condition,message);checks++;};
function feed(quality,{from=0,to,step=50,frameMs=40,renderMs=10}={}){const changes=[];let previous=quality.diagnostics().pixelRatio;for(let now=from;now<=to;now+=step){const next=quality.sample(now,{frameMs,renderMs});if(next!==previous){changes.push({now,from:previous,to:next});previous=next;}check(next>=quality.diagnostics().minPixelRatio&&next<=quality.diagnostics().maxPixelRatio,'every adaptive decision remains between its sharpness and native-pixel bounds');}return changes;}
const phone=createRenderQuality({mobile:true,pixelRatio:3});
check(phone.diagnostics().pixelRatio===2&&phone.diagnostics().minPixelRatio===1.5,'DPR3 phone starts at2 and cannot drop below1.5');
feed(phone,{to:5900,frameMs:120,renderMs:70});
check(phone.diagnostics().pixelRatio===2&&phone.diagnostics().changes===0,'even sustained shader-compilation stalls are ignored during startup');
feed(phone,{from:5950,to:6200,frameMs:120,renderMs:70});
feed(phone,{from:6250,to:8000});
check(phone.diagnostics().pixelRatio===2,'a short startup-adjacent spike decays without a resolution reduction');
const reductions=feed(phone,{from:8050,to:45000,frameMs:110,renderMs:62});
check(phone.diagnostics().pixelRatio===1.5,'sustained overload reaches the legibility floor');
check(reductions.length===2&&reductions.every(c=>c.from-c.to===.25),'overload reduces resolution in discrete quarter-pixel steps');
check(reductions[1].now-reductions[0].now>=8000,'reductions require a full dwell interval');
const recoveries=feed(phone,{from:45050,to:76000});
check(phone.diagnostics().pixelRatio===2&&recoveries.length===2,'sustained headroom restores the original resolution');
check(recoveries.every(c=>c.to-c.from===.25)&&recoveries[1].now-recoveries[0].now>=12000,'recovery is gradual and waits for sustained stable rendering');
const afterRecovery=phone.diagnostics().changes;
phone.sample(120000,{frameMs:44000,renderMs:80});
check(phone.diagnostics().pixelRatio===2&&phone.diagnostics().changes===afterRecovery,'a background-tab gap is not treated as evidence of GPU overload');
phone.reset();feed(phone,{from:120050,to:125950,frameMs:120,renderMs:80});
check(phone.diagnostics().pixelRatio===2,'resume restarts startup grace without degrading the current resolution');
check(phone.resize(1)===1&&phone.diagnostics().minPixelRatio===1,'moving to a DPR1 display never renders beyond native density');
check(phone.resize(3)>=1.5&&phone.diagnostics().maxPixelRatio===2,'returning to a high-density display restores at least the legibility floor');
for(const native of [1,1.25,1.5,2,3,4])for(const mobile of [false,true]){
 const q=createRenderQuality({mobile,pixelRatio:native});feed(q,{to:30000,frameMs:115,renderMs:65});check(q.diagnostics().pixelRatio<=native,'neither phone nor desktop policy upscales beyond native pixels');feed(q,{from:30050,to:60000});check(q.diagnostics().pixelRatio===Math.min(native,mobile?2:1.75),'each device policy can recover its own maximum');
}
console.log('PASS '+checks+' render-quality decisions and recovery checks');
