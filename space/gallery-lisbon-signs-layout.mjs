// Original Lisbon Street signs, at street scale across the calçada and gallery.
// Heights describe panel centres. Glass, the central approach and artworks stay clear.
const ROWS = [
  ['priority','Priority','Focus on your objectives, not the battles. They come by the way.',[-4,2.25,9],0.18,1.04,'square','post','outside',-0.08],
  ['stop','Stop','Yes, stop that sht.',[4,2.25,5],-0.16,1.02,'octagon','post','outside',0.06],
  ['crosswalk','Step by step','Step by step is the road to success and the safest way.',[4.8,2.25,12.7],-0.18,1.02,'square','post','outside',-0.06],
  ['speed_bump_caution','Slow down','Slow down! Come back to life urgently.',[-8.4,2.25,13],0.25,1.02,'triangle','post','outside',0.07],
  ['crosswalk_caution','Crossing','Intelligent grind needs strategy.',[9.1,2.25,10.5],-0.30,1.02,'triangle','post','outside',-0.08],
  ['no_parking','No parking','Protect your strategy. Know your enemies.',[-11,2.25,8],0.34,0.94,'circle','post','outside',0.09],
  ['no_uturn','No U-turn','Never reverse intelligent decisions.',[12,2.25,5],-0.45,0.94,'circle','post','outside',-0.05],
  ['left_or_straight','Left or straight','Yin / Yang. Feminine / Masculine. Inspiration / Expiration.',[-11.5,2.25,2],0.34,0.98,'circle','post','outside',0.06],
  ['destination','Higher Lisboa','Elevation demands friction and aspiration.',[10.5,2.25,0.2],-0.22,1.10,'square','post','outside',-0.06],
  ['lisboa_city_hall','Lisboa','Time creates the vibe. Travel creates discoveries.',[-13.5,2.25,12.8],0.48,1.10,'square','post','outside',0.05],
  ['Heli','Helicopter','The power of Habits: The sky is the limit.',[13.5,2.25,13.8],-0.48,0.94,'square','post','outside',-0.08],
  ['green_walk','Walk','Advance with love. It leads to the best path.',[-5,2.25,0.3],0.10,0.84,'circle','post','outside',0.05],
  ['roundabout','Roundabout','The supreme objective now is to appreciate the 360 of now.',[-10.26,2.35,-13.75],Math.PI/2,0.94,'circle','stone','inside',-0.06],
  ['no_entry','No entry','Access denied to mental bullshit.',[12.78,2.35,-10.65],-Math.PI/2,0.94,'circle','stone','inside',0.07],
  ['parking','Parking','Powerful Presence.',[11.65,2.35,-16.79],0,0.98,'square','stone','inside',-0.07],
  ['fire_exit','Fire exit','To avoid a headache, stop thinking with your head.',[-7.45,2.35,-2.94],Math.PI,1.04,'square','stone','inside',0.06],
  ['aed','Heart','Consult your heart. The response is automatic.',[9.2,2.35,-2.88],Math.PI,0.98,'square','stone','inside',-0.05],
  ['pharma','Pharmacy','Attract all you love.',[-10.8,2.35,-11.96],0,0.80,'square','stone','inside',0.07],
  ['red_walk','Wait','To stop mental bullsht: stay immobile one instant, avoid the crash.',[-6,2.25,-7.8],0.20,0.84,'circle','post','inside',-0.06],
  ['hospital','Hospital','Healing is a process.',[8.7,2.25,-7.4],-0.20,0.94,'square','post','inside',0.06],
  ['Hotel','Hotel','Hard fights lead to hard peace.',[3.9,2.25,-12.8],-0.12,0.94,'square','post','inside',-0.07],
  ['dead_end','Dead end','Action without preparation leads nowhere: Just do it.',[-9,2.25,-9.5],0.25,0.98,'square','post','inside',0.05],
];

const PLATE_RATIOS = Object.freeze({fire_exit:{plateWidth:.96,plateHeight:.55},destination:{plateWidth:1,plateHeight:.60},lisboa_city_hall:{plateWidth:.92,plateHeight:.84}});
export const LISBON_STREET_SIGNS = Object.freeze(ROWS.map(([id,title,phrase,position,rotationY,width,shape,mount,zone,stickerAngle]) => Object.freeze({
  id,title,phrase,position:Object.freeze(position),rotationY,width,shape,mount,zone,stickerAngle,
  ...PLATE_RATIOS[id],
  src:'/assets/signs/'+id+'.png',
})));

// Posts remain solid from paving to panel, while raised panels leave headroom.
// Their small footprints keep the entrance, caravel and gallery visits walkable.
export const LISBON_SIGN_OBSTACLES = Object.freeze(LISBON_STREET_SIGNS.filter(sign=>sign.mount==='post').map(sign=>{
  const [x,y,z]=sign.position;
  return Object.freeze({id:'lisbon-sign-post-'+sign.id,minX:x-.18,maxX:x+.18,minZ:z-.18,maxZ:z+.18,minY:-.09,maxY:y+sign.width*.32});
}));
