/* ══ LA CARTE DES SPOTS — tools/spot_map.js ══ */
function creerCarteSpots({spots,lieuDe,couleur,voir,geometrie,positionAuto,position,groupesOuverts=()=>true}){
  const $=id=>document.getElementById(id);
  const D=Math.PI/180, TERRE_KM=6371, ZOOM_VILLE=TERRE_KM/14, ZOOM_MAX=4096, ZOOM_PLAN=6;
  const SEUIL_GLISSE=6, DELAI_TUILE=15000;
  const etat={on:false, terres:0, points:0, groupes:0, repartis:0, villes:0, sans:0, zoom:1, centre:false, position:false};
  let terre=null, terreP=null, lon0=8, lat0=28, k=1, tenu=null, pinch=null, pts=[], lieux=[], seq=0, rq=0, pique=null, epingle=null;
  let geoSeq=0, geoAttente=false, ici=null, dernierTap=null, trajet=null, roue=null, zoomDoigt=null, repartition=null;
  let niveau=-1, niveauDepuis=0;
  const ptrs=new Map(), tuiles=new Map();
  const cv=()=>$('rdr-map'), fond=$('rdr-base'), loc=$('rdr-locate'), note=$('rdr-loc-note'), credit=$('rdr-map-credit');
  const reduit=matchMedia('(prefers-reduced-motion: reduce)');
  const borner=(v,a,b)=>Math.max(a,Math.min(b,v));
  const longitude=l=>((l+180)%360+360)%360-180;
  const latitude=l=>borner(l,-85,85);
  const doux=t=>t*t*(3-2*t);
  const mercY=la=>(1-Math.asinh(Math.tan(borner(la,-85.0511,85.0511)*D))/Math.PI)/2;
  const latMerc=y=>Math.atan(Math.sinh(Math.PI*(1-2*y)))/D;

  const geo=()=>geometrie(cv().clientWidth||innerWidth,cv().clientHeight||innerHeight);
  let ancreTouche='';
  function poserTouche(g,w,h){
    const x=Math.round(Math.min(w-30,g.cx+g.R0*.74+12));
    const y=Math.round(Math.min(h-30,g.cy+g.R0*.74+12));
    const cle=x+':'+y;
    if(cle===ancreTouche) return;
    ancreTouche=cle;
    for(const el of [loc,note]){
      el.style.setProperty('--loc-x',x+'px');
      el.style.setProperty('--loc-y',y+'px');
    }
  }
  function coord(lng,lat){
    const l=lng*D, p=lat*D, c=Math.cos(p);
    return {lng,lat, y:mercY(lat), a:c*Math.cos(l), b:c*Math.sin(l), c:Math.sin(p)};
  }
  function chargerTerre(){
    if(!terreP) terreP=fetch('/assets/earth.json').then(r=>r.ok?r.json():[])
      .then(data=>Array.isArray(data)?data.map(r=>{
        const polygone=[];
        for(let i=0;i<r.length;i+=2) polygone.push(coord(r[i],r[i+1]));
        return polygone;
      }):[])
      .catch(e=>{ console.error('[earth]',e&&e.message||e); return []; })
      .then(t=>{ terre=t; etat.terres=t.length; kick(); });
  }
  function camera(g){
    const r=g.R0*k, rotation=lon0*D, inclinaison=lat0*D, cos=Math.cos(inclinaison);
    const mix=doux(borner(Math.log(k/2.4)/Math.log(ZOOM_PLAN/2.4),0,1));
    return {cx:g.cx, cy:g.cy, r, mix, echelle:2*Math.PI*r*cos, x:(lon0+180)/360,
      y:mercY(lat0), cos, sin:Math.sin(inclinaison), cosLon:Math.cos(rotation), sinLon:Math.sin(rotation)};
  }
  function projeter(q,g,cote=false){
    const mx=g.echelle*longitude(q.lng-lon0)/360, my=g.echelle*(q.y-g.y);
    if(g.mix===1) return [g.cx+mx,g.cy+my,1];
    const vers=q.a*g.cosLon+q.b*g.sinLon;
    const devant=g.sin*q.c+g.cos*vers;
    let x=g.r*(q.b*g.cosLon-q.a*g.sinLon), y=-g.r*(g.cos*q.c-g.sin*vers);
    if(cote&&devant<0){
      const r=g.r/(Math.hypot(x,y)||1); x*=r; y*=r;
    }
    return [g.cx+x+(mx-x)*g.mix,g.cy+y+(my-y)*g.mix,devant];
  }
  function inverse(x,y,g){
    const rx=(x-g.cx)/g.r, ry=(g.cy-y)/g.r, r=Math.hypot(rx,ry);
    const ll=g.mix===0?null:{lat:latitude(latMerc(g.y+(y-g.cy)/g.echelle)),lng:longitude(lon0+(x-g.cx)*360/g.echelle)};
    if(g.mix===1) return ll;
    if(g.mix===0){
      if(r>1) return null; if(r<1e-9) return {lat:lat0,lng:lon0};
      const z=Math.sqrt(Math.max(0,1-r*r));
      return {lat:Math.asin(borner(z*g.sin+ry*g.cos,-1,1))/D,
        lng:longitude(lon0+Math.atan2(rx,z*g.cos-ry*g.sin)/D)};
    }
    /* Au milieu de la transition, inverser localement la projection mélangée. */
    const delta=.001;
    for(let i=0;i<4;i++){
      const [px,py]=projeter(coord(ll.lng,ll.lat),g);
      if(Math.hypot(x-px,y-py)<.03) break;
      const [hx,hy]=projeter(coord(ll.lng+delta,ll.lat),g);
      const [vx,vy]=projeter(coord(ll.lng,ll.lat+delta),g);
      const a=hx-px, b=vx-px, c=hy-py, d=vy-py, det=a*d-b*c;
      if(Math.abs(det)<1e-9) break;
      ll.lng=longitude(ll.lng+delta*(d*(x-px)-b*(y-py))/det);
      ll.lat=latitude(ll.lat+delta*(a*(y-py)-c*(x-px))/det);
    }
    return ll;
  }
  function zoomerVers(n,x,y,ancre,g){
    k=borner(n,1,ZOOM_MAX);
    if(!ancre) return;
    for(let i=0;i<3;i++){
      const sous=inverse(x,y,camera(g)); if(!sous) break;
      lon0=longitude(lon0+longitude(ancre.lng-sous.lng));
      lat0=latitude(lat0+ancre.lat-sous.lat);
    }
  }
  function voler(lat,lng,zoom,ms,fin){
    roue=null; zoomDoigt=null;
    if(reduit.matches){
      lat0=latitude(lat); lon0=longitude(lng); k=zoom; trajet=null;
      fin?.(null); kick(); return;
    }
    trajet={t:performance.now(), lat:lat0, lon:lon0, k, dy:latitude(lat)-lat0, dx:longitude(lng-lon0),zoom,ms,fin};
    kick();
  }
  function avancer(t,g){
    if(trajet){
      const v=trajet, p=borner((t-v.t)/v.ms,0,1), f=doux(p);
      lon0=longitude(v.lon+v.dx*doux(Math.min(1,p/.78))); lat0=v.lat+v.dy*doux(Math.min(1,p/.78));
      k=v.k*(v.zoom/v.k)**f;
      if(p===1){ trajet=null; v.fin?.(t); }
    }else if(zoomDoigt){
      const {k1,x,y,ancre}=zoomDoigt; zoomDoigt=null;
      zoomerVers(k1,x,y,ancre,g);
    }else if(roue){
      const w=roue, reste=Math.log(w.k/k), dt=borner(t-w.t,8,40);
      const fini=reduit.matches||Math.abs(reste)<.002;
      const pas=borner(reste*(1-Math.exp(-dt/53)),-dt*.013,dt*.013);
      zoomerVers(fini?w.k:k*Math.exp(pas),w.x,w.y,w.ancre,g);
      if(fini) roue=null; else w.t=t;
    }
  }
  function tuile(z,x,y,charger,maintenant){
    const n=2**z, cle=z+'/'+((x%n+n)%n)+'/'+y;
    let t=tuiles.get(cle);
    if(charger&&(!t||(t.echec!=null&&maintenant-t.echec>=DELAI_TUILE))){
      t={im:new Image(), at:null, echec:null};
      t.im.referrerPolicy='strict-origin-when-cross-origin'; t.im.onload=()=>{ t.at=performance.now(); kick(); };
      t.im.onerror=()=>{ t.echec=performance.now(); };
      t.im.src='https://tile.openstreetmap.org/'+cle+'.png';
      tuiles.set(cle,t);
      if(tuiles.size>180) tuiles.delete(tuiles.keys().next().value);
    }
    return t;
  }
  /* Les tuiles déjà chargées restent visibles quand on change d'échelle. Une tuile nette remplace sa parente en fondu. */
  function dessinerTuiles(ctx,g,w,h,t){
    const z=borner(Math.round(Math.log2(g.echelle/256)),2,18), n=2**z, cote=g.echelle/n;
    const dx=g.cx-g.x*g.echelle, dy=g.cy-g.y*g.echelle;
    const x0=Math.floor(-dx/cote), x1=Math.ceil((w-dx)/cote)-1;
    const y0=Math.floor(-dy/cote), y1=Math.ceil((h-dy)/cote)-1;
    if(niveau!==z){ niveau=z; niveauDepuis=t; }
    const charger=navigator.onLine&&((!trajet&&!roue&&!pinch)||t-niveauDepuis>100);
    let peint=false, couvre=y0>=0&&y1<n, fondu=false;
    for(let y=Math.max(0,y0);y<=Math.min(n-1,y1);y++) for(let x=x0;x<=x1;x++){
      const a=tuile(z,x,y,charger,t), alpha=a?.at!=null?(reduit.matches?1:borner((t-a.at)/135,0,1)):0;
      const l=dx+x*cote, top=dy+y*cote;
      let compte=alpha===1;
      if(alpha<1){
        for(let zz=z-1;zz>=Math.max(2,z-5);zz--){
          const facteur=2**(z-zz), i=Math.floor(x/facteur), j=Math.floor(y/facteur);
          const parent=tuile(zz,i,j,false);
          if(parent?.at==null) continue;
          const taille=parent.im.naturalWidth/facteur;
          ctx.drawImage(parent.im,(x-i*facteur)*taille,(y-j*facteur)*taille,taille,taille,l,top,cote,cote);
          peint=true; compte=true; break;
        }
        if(!compte&&z<18){
          let enfants=0;
          for(let j=0;j<2;j++) for(let i=0;i<2;i++){
            const enfant=tuile(z+1,x*2+i,y*2+j,false);
            if(enfant?.at==null) continue;
            ctx.drawImage(enfant.im,l+i*cote/2,top+j*cote/2,cote/2+.25,cote/2+.25);
            enfants++; peint=true;
          }
          compte=enfants===4;
        }
      }
      if(a?.at!=null){
        ctx.globalAlpha=alpha;
        ctx.drawImage(a.im,l,top,cote+.35,cote+.35);
        ctx.globalAlpha=1; peint=true; fondu=fondu||alpha<1;
      }
      couvre=couvre&&compte;
    }
    return {peint,couvre,fondu};
  }
  function dessinerTerre(ctx,g,w,h){
    /* Les gris ci-dessous passent par le même filtre monochrome que les tuiles. */
    if(g.mix<1){
      ctx.beginPath(); ctx.arc(g.cx,g.cy,g.r,0,2*Math.PI);
      ctx.strokeStyle='#dcdcdc'; ctx.globalAlpha=1-g.mix; ctx.lineWidth=1;
      ctx.stroke(); ctx.globalAlpha=1;
    }
    ctx.fillStyle='#dedede';
    for(const polygone of terre||[]){
      let visible=g.mix===1; ctx.beginPath();
      for(let i=0;i<polygone.length;i++){
        const [x,y,devant]=projeter(polygone[i],g,true);
        if(devant>=0) visible=true;
        if(i) ctx.lineTo(x,y); else ctx.moveTo(x,y);
      }
      if(visible){ ctx.closePath(); ctx.fill(); }
    }
    ctx.fillStyle='#fbfbfb';
    if(g.mix===1) ctx.fillRect(0,0,w,h);
    else{ ctx.beginPath(); ctx.arc(g.cx,g.cy,g.r,0,2*Math.PI); ctx.fill(); }
  }
  function cadrerSpots(){
    if(!lieux.length||etat.centre||geoAttente) return;
    etat.centre=true; lon0=lieux[0].p.lng; lat0=latitude(lieux[0].p.lat);
  }
  async function situer(){
    const s=++seq, l=spots();
    const r=await Promise.all(l.map(async z=>{
      const lieu=await lieuDe(z);
      return lieu?{z, cle:'sp:'+z.id, p:{...coord(lieu.lng,lieu.lat),plein:lieu.plein}}:null;
    }));
    if(s!==seq) return;
    lieux=r.filter(Boolean); etat.sans=r.length-lieux.length; etat.villes=lieux.filter(x=>!x.p.plein).length;
    cadrerSpots(); kick();
  }
  function regrouper(g,w,h){
    const groupes=[];
    for(const lieu of lieux){
      const [x,y,devant]=projeter(lieu.p,g);
      if((g.mix<1&&devant<0)||x<0||y<0||x>w||y>h) continue;
      const point={lieu,x,y};
      const voisin=groupes.find(a=>Math.hypot(a.x-x,a.y-y)<26);
      if(!voisin) groupes.push({...point,enfants:[point]});
      else if(lieu.p.plein&&!voisin.lieu.p.plein){
        Object.assign(voisin,point); voisin.enfants.unshift(point);
      }else voisin.enfants.push(point);
    }
    return groupes;
  }
  function ecarter(ctx,marques,groupe,choisis,t,w,h){
    const f=repartition.t==null?1:doux(borner((t-repartition.t)/210,0,1));
    const tracer=(p,dx,dy)=>{
      const x=p.x+(dx-p.x)*f, y=p.y+(dy-p.y)*f;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(x,y); ctx.stroke();
      marques.push({lieu:p.lieu,x,y,enfants:[p]});
    };
    const n=choisis.length;
    ctx.strokeStyle=n>12?'rgba(165,165,178,.15)':'rgba(165,165,178,.35)'; ctx.lineWidth=1;
    if(n<=12){
      const r=Math.min(Math.max(25,n*28/(2*Math.PI)),Math.max(6,Math.min(w,h)/2-16));
      const cx=borner(groupe.x,r+12,w-r-12), cy=borner(groupe.y,r+16,h-r-16);
      choisis.forEach((p,i)=>{
        const angle=-Math.PI/2+i*2*Math.PI/n;
        tracer(p,cx+r*Math.cos(angle),cy+r*Math.sin(angle));
      });
    }else{
      /* Une grille locale garde les gros groupes cliquables, même sur un écran étroit. */
      const largeur=Math.max(1,w-40), hauteur=Math.max(1,h-100);
      const cols=borner(Math.ceil(Math.sqrt(n*largeur/hauteur)),1,n), rangs=Math.ceil(n/cols);
      const pas=Math.min(28,largeur/cols,hauteur/rangs), lx=(cols-1)*pas/2, ly=(rangs-1)*pas/2;
      const x0=borner(groupe.x,lx+20,w-lx-20)-lx, y0=borner(groupe.y,ly+50,h-ly-50)-ly;
      choisis.forEach((p,i)=>tracer(p,x0+i%cols*pas,y0+Math.floor(i/cols)*pas));
    }
    return f<1;
  }
  function pointLumineux(ctx,x,y,col,r,halo,plein=true){
    ctx.shadowColor=col; ctx.shadowBlur=halo;
    ctx.beginPath(); ctx.arc(x,y,r,0,2*Math.PI);
    if(plein){ ctx.fillStyle=col; ctx.fill(); }
    else{ ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.stroke(); }
    ctx.shadowBlur=0;
  }
  function dessiner(t){
    rq=0; if(!etat.on) return;
    const c=cv(), d=Math.min(2,devicePixelRatio||1), w=c.clientWidth, h=c.clientHeight;
    if(!w||!h) return;
    for(const el of [c,fond]){
      const W=Math.round(w*d), H=Math.round(h*d);
      if(el.width!==W||el.height!==H){ el.width=W; el.height=H; }
    }
    const geo0=geo(); poserTouche(geo0,w,h); avancer(t,geo0);
    const g=camera(geo0), ctx=c.getContext('2d'), base=fond.getContext('2d');
    for(const x of [ctx,base]){ x.setTransform(d,0,0,d,0,0); x.clearRect(0,0,w,h); }
    const tuilesEnVue=g.mix===1?dessinerTuiles(base,g,w,h,t):null;
    if(!tuilesEnVue?.couvre){
      base.globalCompositeOperation='destination-over'; dessinerTerre(base,g,w,h); base.globalCompositeOperation='source-over';
    }
    credit.hidden=!tuilesEnVue?.peint;
    etat.position=false;
    if(ici){
      const [x,y,devant]=projeter(ici,g);
      if((g.mix===1||devant>=0)&&x>=0&&x<=w&&y>=0&&y<=h){
        pointLumineux(ctx,x,y,'#fff',4,11); etat.position=true;
      }
    }
    let anime=false, repartis=0;
    pts=[];
    for(const groupe of regrouper(g,w,h)){
      const choisis=repartition&&groupe.enfants.filter(p=>repartition.ids.has(p.lieu.cle));
      if(!choisis?.length||groupe.enfants.length===1){ pts.push(groupe); continue; }
      if(choisis.length>1){ anime=ecarter(ctx,pts,groupe,choisis,t,w,h)||anime; repartis+=choisis.length; }
      else pts.push({...choisis[0],enfants:choisis});
      const autres=groupe.enfants.filter(p=>!repartition.ids.has(p.lieu.cle));
      if(autres.length) pts.push({...autres[0],enfants:autres});
    }
    for(const {lieu,x,y,enfants} of pts){
      const z=lieu.z, col=couleur(z.intentions||((z.habit_box||{}).ints)||[]), n=enfants.length;
      if(n===1){ pointLumineux(ctx,x,y,col,z.state==='am'?5.5:4,z.state==='am'?16:11,lieu.p.plein); continue; }
      ctx.fillStyle='#101010'; ctx.beginPath(); ctx.arc(x,y,Math.max(11,5+String(n).length*3),0,2*Math.PI); ctx.fill();
      ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.shadowColor=col; ctx.shadowBlur=10; ctx.stroke(); ctx.shadowBlur=0;
      ctx.fillStyle='#fff'; ctx.font='700 10px "Space Mono", monospace';
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(n),x,y);
    }
    if(epingle){
      const [x,y,devant]=projeter(epingle,g);
      if(g.mix===1||devant>=0){
        ctx.beginPath(); ctx.arc(x,y,7,0,2*Math.PI); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
        pointLumineux(ctx,x,y,'#fff',2,0);
      }
    }
    etat.points=pts.reduce((n,p)=>n+p.enfants.length,0);
    etat.groupes=pts.filter(p=>p.enfants.length>1).length;
    etat.repartis=repartis; etat.zoom=Math.round(k*100)/100;
    if(trajet||roue||anime||tuilesEnVue?.fondu) kick();
  }
  function kick(){ if(!rq&&etat.on) rq=requestAnimationFrame(dessiner); }
  function annulerPosition(){ geoSeq++; geoAttente=false; loc.removeAttribute('aria-busy'); }
  function interrompre(){ annulerPosition(); trajet=null; roue=null; zoomDoigt=null; }
  function zoomerIci(clic=false){
    if(!etat.on) return;
    interrompre(); repartition=null; note.textContent='';
    const s=++geoSeq; geoAttente=true;
    loc.setAttribute('aria-busy','true');
    position({frais:clic}).then(p=>{
      if(s!==geoSeq) return;
      annulerPosition();
      if(!p){
        if(clic) note.textContent='location unavailable · try again';
        cadrerSpots(); kick(); return;
      }
      etat.centre=true; ici=coord(p.lng,p.lat);
      voler(ici.lat,ici.lng,ZOOM_VILLE,clic?750:1050);
    });
  }
  loc.addEventListener('click',()=>zoomerIci(true));

  function monde(){
    const initial=k<=1.005&&Math.abs(lat0-28)<.01&&Math.abs(longitude(lon0-8))<.01;
    if(!etat.on||pique||(!geoAttente&&!trajet&&!roue&&!repartition&&!ptrs.size&&initial)) return false;
    interrompre(); relacherGeste(); dernierTap=null; repartition=null; etat.centre=true;
    voler(28,8,1,620);
    return true;
  }

  function dansDisque(x,y){
    const g=geo();
    if(k>=ZOOM_PLAN) return x>=12&&x<=cv().clientWidth-12;
    return Math.hypot(x-g.cx,y-g.cy)<=g.R0*k;
  }
  function viser(x,y){
    let best=null, dm=22;
    for(const p of pts){ const dd=Math.hypot(p.x-x,p.y-y); if(dd<dm){ dm=dd; best=p; } }
    return best;
  }
  function ouvrirGroupe(groupe){
    const points=groupe.enfants, repere=groupe.lieu.p.lng, g=geo(), c=cv();
    const l=points.map(o=>longitude(o.lieu.p.lng-repere)), ys=points.map(o=>o.lieu.p.y);
    const gauche=Math.min(...l), droite=Math.max(...l), haut=Math.min(...ys), bas=Math.max(...ys);
    const lng=longitude(repere+(gauche+droite)/2), lat=latitude(latMerc((haut+bas)/2));
    const dx=(droite-gauche)/360, dy=bas-haut;
    const maximum=Math.min((c.clientWidth-84)/Math.max(dx,1e-9),(Math.max(100,c.clientHeight-320))/Math.max(dy,1e-9));
    const cible=dx<.000025&&dy<.000025?ZOOM_VILLE:maximum/(2*Math.PI*g.R0*Math.cos(lat*D));
    const zoom=borner(cible,k,ZOOM_MAX);
    const ids=new Set(points.map(o=>o.lieu.cle));
    repartition=null; etat.centre=true;
    const placer=t=>{ repartition={ids,t}; };
    if(Math.abs(lat-lat0)<.00001&&Math.abs(longitude(lng-lon0))<.00001&&zoom===k){
      placer(reduit.matches?null:performance.now()); kick(); return;
    }
    voler(lat,lng,zoom,borner(Math.log(zoom/k)*170,620,1150),placer);
  }

  const c=cv();
  function relacherGeste(){
    const ids=[...ptrs.keys()];
    ptrs.clear(); tenu=null; pinch=null;
    c.classList.remove('is-tenu');
    for(const id of ids) if(c.hasPointerCapture(id)) c.releasePointerCapture(id);
  }
  c.addEventListener('pointerdown',e=>{
    if(!etat.on||ptrs.size>=2||(e.pointerType==='mouse'&&e.button!==0)) return;
    const r=c.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top;
    if(!ptrs.size&&!dansDisque(x,y)){ etat.horsDisque=(etat.horsDisque||0)+1; return; }
    interrompre(); etat.centre=true; kick();
    ptrs.set(e.pointerId,{x,y});
    try{ c.setPointerCapture(e.pointerId); }catch(_){}
    if(ptrs.size===2){
      const [a,b]=[...ptrs.values()], gx=(a.x+b.x)/2, gy=(a.y+b.y)/2;
      pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,k,ancre:inverse(gx,gy,camera(geo()))};
      tenu=null; dernierTap=null; repartition=null; return;
    }
    tenu={id:e.pointerId,x,y,bouge:false}; c.classList.add('is-tenu');
  });
  c.addEventListener('pointermove',e=>{
    if(!ptrs.has(e.pointerId)) return;
    const r=c.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top;
    ptrs.set(e.pointerId,{x,y});
    if(pinch&&ptrs.size===2){
      const [a,b]=[...ptrs.values()], ratio=Math.hypot(a.x-b.x,a.y-b.y)/pinch.d;
      zoomDoigt={k1:pinch.k*ratio**1.6,x:(a.x+b.x)/2,y:(a.y+b.y)/2,ancre:pinch.ancre};
      kick(); return;
    }
    if(!tenu||tenu.id!==e.pointerId) return;
    const dx=x-tenu.x, dy=y-tenu.y;
    if(!tenu.bouge){
      if(Math.hypot(dx,dy)<=SEUIL_GLISSE) return;
      tenu.bouge=true; repartition=null; dernierTap=null;
    }
    const g=camera(geo());
    lon0=longitude(lon0-dx*360/g.echelle);
    lat0=latitude(lat0+(1-g.mix)*dy/(D*g.r)+g.mix*(latMerc(g.y-dy/g.echelle)-lat0));
    tenu.x=x; tenu.y=y; etat.tours=(etat.tours||0)+1; kick();
  });
  const relacher=e=>{
    if(!ptrs.delete(e.pointerId)) return;
    if(pinch){
      if(zoomDoigt) avancer(performance.now(),geo());
      pinch=null;
      const [id,p]=ptrs.entries().next().value;
      tenu={id,x:p.x,y:p.y,bouge:true};
      kick(); return;
    }
    c.classList.remove('is-tenu');
    if(!tenu||tenu.id!==e.pointerId) return; const tenu0=tenu; tenu=null;
    const r=c.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top;
    if(e.type!=='pointerup'||tenu0.bouge||Math.hypot(x-tenu0.x,y-tenu0.y)>SEUIL_GLISSE){
      dernierTap=null; return;
    }
    if(pique){
      const ll=inverse(x,y,camera(geo())); if(!ll) return;
      ll.lat=+ll.lat.toFixed(5); ll.lng=+ll.lng.toFixed(5);
      epingle=coord(ll.lng,ll.lat); kick(); const f=pique; pique=null; f(ll); return;
    }
    const p=viser(x,y);
    if(p){
      dernierTap=null;
      if(p.enfants.length>1&&groupesOuverts()) ouvrirGroupe(p);
      else{
        const cle=p.lieu.cle, avec=repartition?.ids.has(cle)?[cle,...[...repartition.ids].filter(o=>o!==cle)]:null;
        voir(cle,avec);
      }
      return;
    }
    const maintenant=performance.now();
    if(dernierTap&&maintenant-dernierTap.t<320&&Math.hypot(x-dernierTap.x,y-dernierTap.y)<22){
      dernierTap=null; repartition=null; viserZoom(k*2.5,x,y);
    }else dernierTap={t:maintenant,x,y};
  };
  c.addEventListener('pointerup',relacher);
  c.addEventListener('pointercancel',relacher);
  c.addEventListener('lostpointercapture',relacher);
  function viserZoom(k1,x,y){
    const proche=roue&&Math.hypot(roue.x-x,roue.y-y)<2;
    const ancre=proche?roue.ancre:inverse(x,y,camera(geo()));
    roue={k:borner(k1,1,ZOOM_MAX),x,y,ancre,t:roue?.t??performance.now()};
    kick();
  }
  c.addEventListener('wheel',e=>{
    const r=c.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top;
    if(!etat.on||!dansDisque(x,y)) return;
    e.preventDefault(); e.stopPropagation();
    if(!e.deltaY) return;
    annulerPosition(); trajet=null; repartition=null; etat.centre=true;
    const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
    viserZoom((roue?.k??k)*Math.exp(-borner(pixels,-240,240)*.005),x,y);
  },{passive:false});
  window.addEventListener('resize',kick);
  window.addEventListener('online',()=>{
    for(const [cle,t] of tuiles) if(t.echec!=null) tuiles.delete(cle);
    if(etat.on&&terre?.length===0){ terreP=null; chargerTerre(); }
    kick();
  });
  return {
    geo,
    ouvrir(){
      interrompre(); etat.on=true; etat.centre=false; lon0=8; lat0=28; k=1; ici=null; dernierTap=null; repartition=null; note.textContent='';
      chargerTerre();
      if(positionAuto()) zoomerIci();
      situer(); kick();
    },
    fermer(){
      etat.on=false; interrompre(); relacherGeste();
      if(rq){ cancelAnimationFrame(rq); rq=0; }
      credit.hidden=true;
    },
    maj(){ if(etat.on) situer(); },
    rafraichir:kick, monde,
    vider(){ seq++; lieux=[]; pts=[]; repartition=null; etat.centre=false; etat.points=0; etat.groupes=0; etat.repartis=0; },
    ou:()=>pts.map(p=>[Math.round(p.x),Math.round(p.y)]),
    dans(x,y){ if(!etat.on) return false; const r=c.getBoundingClientRect(); return dansDisque(x-r.left,y-r.top); },
    piquer(f){
      const a=pique; pique=typeof f==='function'?f:null;
      if(pique){ interrompre(); repartition=null; etat.centre=true; kick(); }
      if(a&&!pique) a(null);
    },
    epingler(ll){ epingle=ll&&typeof ll.lat==='number'?coord(ll.lng,ll.lat):null; kick(); },
    pique:()=>!!pique,
    etat:()=>Object.assign({},etat)
  };
}
/* ══ fin LA CARTE DES SPOTS ══ */
