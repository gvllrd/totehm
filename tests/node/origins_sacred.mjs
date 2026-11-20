import assert from 'node:assert/strict';import * as T from '../../space/vendor/three-0.180.0.mjs';import {createOriginsVessel} from '../../space/gallery-origins-vessel.mjs';import {ORIGINS_COVER} from '../../space/origins-cover.mjs';
let checks=0;const check=(v,m)=>{assert(v,m);checks++;};
for(const mobile of [false,true]){
 const scene=new T.Scene(),room=createOriginsVessel(scene,{mobile,bookOnly:true}),d=room.diagnostics();let intentions=0,books=0;
 room.root.traverse(o=>{if(o.userData.intention)intentions++;if(o.name==='Shared original Origins cover'||o.name==='Origins — closed black cover')books++;});
 check(intentions===0,'No intention line remains on the walkway or on the platform');
 check(d.walkway.intentions===0&&d.chamber.intentions===0,'Architectural intention counts are zero');
 check(d.walkway.openAir&&room.root.getObjectByName('Origins exposed walkway deck'),'An open deck joins the saucer to the platform');
 check(d.chamber.openAir&&!d.chamber.closedCeiling,'The original volume is displayed directly under the stars');
 check(books===1&&d.chamber.originalWorks===0,'One physical original volume is the only exhibited object');
 check(d.book.dimensions.join(',')==='0.7,0.08,0.98'&&d.book.coverRatio===5/7,'Physical cover dimensions and enlargement proportions remain exact');
 check(d.book.coverIntentions===7&&d.book.neonTraces,'The seven luminous intentions belong to the book only');
 check(room.root.getObjectByName('Origins ceremonial reading slab').material.color.getHex()===0,'The volume remains on its isolated black ceremonial support');room.dispose();
}
check(ORIGINS_COVER.intentions===7&&ORIGINS_COVER.neon&&ORIGINS_COVER.ratio===5/7,'The physical and reader cover have one canonical neon design');console.log('PASS '+checks+' sacred Origins book checks');
