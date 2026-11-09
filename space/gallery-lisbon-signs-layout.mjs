// Twenty-two authored Lisbon cues, each placed as the physical object it is.
// Positions are world metres; floor markings are paint rather than obstacles.
const ROWS = [
  ['priority','Priority','Focus on your objectives, not the battles. They come by the way.',[-4,2.25,9],0.18,1.04,'square','post','outside',-0.08],
  ['stop','Stop','Yes, stop that sht.',[4,2.25,5],-0.16,1.02,'octagon','post','outside',0.06],
  ['crosswalk','Step by step','Step by step is the road to success and the safest way.',[0,-.073,10.5],0,3.2,'square','ground','outside',-0.06],
  ['speed_bump_caution','Slow down','Slow down! Come back to life urgently.',[-8.4,2.25,13],0.25,1.02,'triangle','post','outside',0.07],
  ['crosswalk_caution','Speed-bump warning','Intelligent grind needs strategy.',[9.1,2.25,10.5],-0.30,1.02,'triangle','post','outside',-0.08],
  ['no_parking','No parking','Protect your strategy. Know your enemies.',[-11,2.25,8],0.34,0.94,'circle','post','outside',0.09],
  ['no_uturn','No U-turn','Never reverse intelligent decisions.',[12,2.25,5],-0.45,0.94,'circle','post','outside',-0.05],
  ['left_or_straight','Left or straight','Yin / Yang. Feminine / Masculine. Inspiration / Expiration.',[-11.5,2.25,2],0.34,0.98,'circle','post','outside',0.06],
  ['destination','Higher Lisboa','Elevation demands friction and aspiration.',[10.6,5.7,.7],-.18,5.4,'square','gantry','outside',-.035],
  ['lisboa_city_hall','Lisboa','Time creates the vibe. Travel creates discoveries.',[-8.1,4.8,-1.73],0,1.35,'square','stone','outside',.035],
  ['Heli','Helicopter','The power of Habits: The sky is the limit.',[12,-.074,13.2],0,5,'circle','ground','outside',-.045],
  ['green_walk','Walk','Advance with love. It leads to the best path.',[2.25,2.25,8.4],0,.38,'circle','signal','outside',.03],
  ['roundabout','Roundabout','The supreme objective now is to appreciate the 360 of now.',[-10.26,2.35,-13.75],Math.PI/2,0.94,'circle','post','inside',-0.06],
  ['no_entry','No entry','Access denied to mental bullshit.',[11.7,2.35,-10.65],-Math.PI/2,0.94,'circle','post','inside',0.07],
  ['parking','Parking','Powerful Presence.',[11.65,2.35,-15.6],0,0.98,'square','post','inside',-0.07],
  ['fire_exit','Fire exit','To avoid a headache, stop thinking with your head.',[0,3.45,-2.22],Math.PI,.65,'square','stone','inside',.025],
  ['aed','Defibrillator','Consult your heart. The response is automatic.',[8,2.2,-2.22],Math.PI,.38,'square','stone','inside',-.025],
  ['pharma','Pharmacy','Attract all you love.',[8,3.9,-1.70],0,1.2,'square','stone','outside',.03],
  ['red_walk','Wait','To stop mental bullsht: stay immobile one instant, avoid the crash.',[2.25,2.7,8.4],0,.38,'circle','signal','outside',-.03],
  ['hospital','Hospital','Healing is a process.',[8.7,2.25,-7.4],-0.20,0.94,'square','post','inside',0.06],
  ['Hotel','Hotel','Hard fights lead to hard peace.',[-7.5,1.75,-1.73],0,.44,'square','stone','outside',-.025],
  ['dead_end','Dead end','Action without preparation leads nowhere: Just do it.',[-9,2.25,-9.5],0.25,0.98,'square','post','inside',0.05],
];

const DETAILS=Object.freeze({
 crosswalk:{presentation:'ground-crosswalk',depth:4,rotationX:-Math.PI/2,stickerWidth:.25,stickerOffset:[1.25,-1.7]},
 Heli:{presentation:'ground-helipad',rotationX:-Math.PI/2,stickerWidth:.35,stickerOffset:[1.25,-1.45]},
 destination:{presentation:'motorway-sign',height:3.15,plateWidth:1,plateHeight:.59,postDepth:-.20,postOffsets:Object.freeze([-2.05,2.05]),stickerWidth:.38},
 lisboa_city_hall:{presentation:'building-emblem',depth:.12,plateWidth:.92,plateHeight:.84,stickerWidth:.16},
 Hotel:{presentation:'hotel-plaque',height:.50,stickerWidth:.085},
 aed:{presentation:'defibrillator',depth:.12,stickerWidth:.075},
 fire_exit:{presentation:'fire-exit',plateWidth:.96,plateHeight:.55,stickerWidth:.10},
 pharma:{presentation:'pharmacy',depth:.26,stickerWidth:.15},
 green_walk:{presentation:'pedestrian-green',group:'pedestrian-crossing',stickerWidth:.085},
 red_walk:{presentation:'pedestrian-red',group:'pedestrian-crossing',stickerWidth:.085}
});
export const LISBON_STREET_SIGNS=Object.freeze(ROWS.map(([id,title,phrase,position,rotationY,width,shape,mount,zone,stickerAngle])=>Object.freeze({
 id,title,phrase,position:Object.freeze(position),rotationY,width,shape,mount,zone,stickerAngle,
 presentation:'road-sign',stickerWidth:Math.min(.22,width*.22),...DETAILS[id],src:'/assets/signs/'+id+'.png'
})));

// Collision footprints follow the real road-sign supports, two motorway
// posts and one shared pedestrian-signal pole. Ground paint is flat.
const footprint=(id,x,z,top,radius=.18)=>Object.freeze({id,minX:x-radius,maxX:x+radius,minZ:z-radius,maxZ:z+radius,minY:-.09,maxY:top});
export const LISBON_SIGN_OBSTACLES=Object.freeze(LISBON_STREET_SIGNS.flatMap(sign=>{
 const [x,y,z]=sign.position;
 if(sign.mount==='post')return[footprint('lisbon-sign-post-'+sign.id,x,z,y+sign.width*.32)];
 if(sign.presentation==='motorway-sign')return sign.postOffsets.map((offset,index)=>{
  const postDepth=sign.postDepth||0,dx=Math.cos(sign.rotationY)*offset+Math.sin(sign.rotationY)*postDepth,dz=-Math.sin(sign.rotationY)*offset+Math.cos(sign.rotationY)*postDepth;
  return footprint('lisbon-sign-motorway-post-'+index,x+dx,z+dz,Math.max(y+sign.height/2,y+sign.width*.32),.24);
 });
 if(sign.presentation==='pedestrian-green')return[footprint('lisbon-sign-pedestrian-post',x,z,3.08,.18)];
 return[];
}));
