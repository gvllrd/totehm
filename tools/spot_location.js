/* ══ LA POSITION DES SPOTS — tools/spot_location.js ══ */
function creerLocalisation(){
  let dernier=null, vol=null;
  function lecture(options){
    return new Promise(resolve=>{
      const service=navigator.geolocation;
      if(!service){ resolve({code:2}); return; }
      const timer=setTimeout(()=>resolve({code:3}),options.timeout+750);
      const fin=r=>{ clearTimeout(timer); resolve(r); };
      try{
        service.getCurrentPosition(({coords})=>{
          const {latitude:lat,longitude:lng,accuracy}=coords;
          fin(Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180
            ?{point:{lat,lng,accuracy}}:{code:2});
        },e=>fin({code:e.code}),options);
      }catch(_){ fin({code:2}); }
    });
  }
  function demander({frais=false,precis=false}={}){
    const age=dernier?Date.now()-dernier.at:Infinity;
    if(vol) return vol;
    if(!frais&&age<120000&&(!precis||dernier.point.accuracy<=250)) return Promise.resolve(dernier.point);
    vol=(async()=>{
      const a=await lecture({enableHighAccuracy:precis,timeout:precis?8000:5000,maximumAge:frais?0:120000});
      if(a.code===1){ dernier=null; return null; }
      let point=a.point;
      if(!point||(!precis&&point.accuracy>5000)){
        const b=await lecture({enableHighAccuracy:!precis,timeout:6500,maximumAge:frais?0:120000});
        if(b.code===1){ dernier=null; return null; }
        if(b.point&&(!point||b.point.accuracy<point.accuracy)) point=b.point;
      }
      if(point){ dernier={point,at:Date.now()}; return point; }
      return !precis&&dernier&&Date.now()-dernier.at<300000?dernier.point:null;
    })().finally(()=>{ vol=null; });
    return vol;
  }
  return demander;
}
/* ══ fin LA POSITION DES SPOTS ══ */
