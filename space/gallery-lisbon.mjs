// Ambient view of the same 22 signs as /play_lisbon_street, without its story
// or controls. This one canvas is both the wall texture and the HTML preview.
export function createLisbonPreview({onChange=()=>{}}={}) {
  const names=['fire_exit','Heli','aed','green_walk','red_walk','pharma','destination','lisboa_city_hall','speed_bump_caution','crosswalk_caution','no_entry','no_parking','hospital','parking','Hotel','dead_end','roundabout','left_or_straight','no_uturn','priority','crosswalk','stop'];
  const W=1024,H=722,canvas=document.createElement('canvas');
  canvas.width=innerWidth<650?768:1024;canvas.height=Math.round(canvas.width*H/W);
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Higher the Lisbon Streets. Lisbon road signs floating in space.');
  const ctx=canvas.getContext('2d'),images=new Map(),brand=new Image();
  const brandAsset='/assets/gallery/higher.svg';let time=0,lastDraw=-1,animated=false,brandLoaded=false;
  let seed=473294;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const important=new Set(['crosswalk','stop','no_entry','parking']);
  const signs=names.map((name,index)=>{
    // Loose staggered orbits leave the central slogan free, as in the story.
    const row=index<11?0:1,column=index%11;
    const x=65+column*88+(random()-.5)*36;
    const y=row?H-85-random()*165:70+random()*165;
    const size=important.has(name)?68+random()*12:42+random()*22;
    return {name,x,y,size,angle:random()*Math.PI*2,vx:(random()<.5?-1:1)*(9+random()*12),vy:(random()<.5?-1:1)*(7+random()*9),spin:(random()-.5)*.12};
  });
  function draw() {
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    for(const sign of signs) {
      const image=images.get(sign.name);if(!image)continue;
      const scale=Math.min(sign.size/image.width,sign.size/image.height);
      ctx.save();ctx.translate(sign.x,sign.y);ctx.rotate(sign.angle);
      ctx.drawImage(image,-image.width*scale/2,-image.height*scale/2,image.width*scale,image.height*scale);ctx.restore();
    }
    const text='the Lisbon Streets';ctx.font='30px "Space Mono", monospace';
    const logoWidth=174,gap=18,textWidth=ctx.measureText(text).width,x=(W-logoWidth-gap-textWidth)/2;
    // Clear space around the original vector; no marketing copy or extra CTA.
    ctx.fillStyle='#000';ctx.fillRect(x-20,H/2-52,logoWidth+gap+textWidth+40,104);
    if(brandLoaded)ctx.drawImage(brand,x,H/2-29,logoWidth,58);
    ctx.fillStyle='#eeeaf6';ctx.textBaseline='middle';ctx.fillText(text,x+logoWidth+gap,H/2+1);
    lastDraw=time;onChange();
  }
  function load(src,onLoad) {
    const image=new Image();
    return new Promise(resolve=>{image.onload=()=>{onLoad(image);draw();resolve(true);};image.onerror=()=>resolve(false);image.src=src;});
  }
  const ready=Promise.all(names.map(name=>load('/assets/signs/'+name+'.png',im=>images.set(name,im))));
  const brandReady=new Promise(resolve=>{brand.onload=()=>{brandLoaded=true;draw();resolve(true);};brand.onerror=()=>resolve(false);brand.src=brandAsset;});
  draw();
  document.fonts?.ready.then(draw);
  return {
    canvas,ready:Promise.all([ready,brandReady]),
    pause(){animated=false;},
    update(dt,moving) {
      animated=moving;if(!moving)return false;
      const elapsed=Math.min(dt,.1);time+=elapsed;
      for(const sign of signs) {
        sign.x+=sign.vx*elapsed;sign.y+=sign.vy*elapsed;sign.angle+=sign.spin*elapsed;
        const margin=sign.size*.65;
        if(sign.x<margin){sign.x=margin;sign.vx=Math.abs(sign.vx);}else if(sign.x>W-margin){sign.x=W-margin;sign.vx=-Math.abs(sign.vx);}
        if(sign.y<margin){sign.y=margin;sign.vy=Math.abs(sign.vy);}else if(sign.y>H-margin){sign.y=H-margin;sign.vy=-Math.abs(sign.vy);}
        if(sign.y>H/2-90&&sign.y<H/2+90&&sign.x>220&&sign.x<805)sign.vy=sign.y<H/2?-Math.abs(sign.vy):Math.abs(sign.vy);
      }
      if(time-lastDraw<1/12)return false;
      draw();return true;
    },
    diagnostics:()=>({time:+time.toFixed(3),signs:signs.length,loaded:images.size,brandLoaded,animated,title:'Higher the Lisbon Streets',brandAsset})
  };
}
