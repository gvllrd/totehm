import * as T from './vendor/three-0.180.0.mjs';

function engravingCanvas(width,height){
 const canvas=globalThis.document?.createElement('canvas');
 if(!canvas)return null;
 canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d');
 return context?{canvas,context}:null;
}

function grainTexture(texture,anisotropy){
 const surface=engravingCanvas(256,256);
 if(!surface)return null;
 const {canvas,context}=surface,image=context.createImageData(canvas.width,canvas.height);
 let seed=47;
 for(let offset=0;offset<image.data.length;offset+=4){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const x=offset/4%canvas.width, y=Math.floor(offset/4/canvas.width);
  const height=118+32*Math.sin(x*.57+y*.21)*Math.sin(y*.41-x*.17)+(seed>>>27);
  image.data[offset]=image.data[offset+1]=image.data[offset+2]=height;
  image.data[offset+3]=255;
 }
 context.putImageData(image,0,0);
 const grain=texture(new T.CanvasTexture(canvas));
 grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(3,3);grain.anisotropy=anisotropy;
 return grain;
}

function drawPaintedTongue(context){
 // The open mouth and tongue use the original Get Higher outline, hand-painted on the leather.
 const lips=new Path2D('M47,740C55,728 77.8,694.7 95,668C112.2,641.3 131.7,609.7 150,580C168.3,550.3 186.3,518.3 205,490C223.7,461.7 243.2,432.5 262,410C280.8,387.5 298.7,367.7 318,355C337.3,342.3 354.3,335.5 378,334C401.7,332.5 433,341.7 460,346C487,350.3 513.3,360 540,360C566.7,360 593,350.3 620,346C647,341.7 678.3,332.5 702,334C725.7,335.5 742.7,342.3 762,355C781.3,367.7 799.2,387.5 818,410C836.8,432.5 856.3,461.7 875,490C893.7,518.3 911.7,550.3 930,580C948.3,609.7 967.8,641.3 985,668C1002.2,694.7 1025,728 1033,740L1033,740C1025.5,754.2 1003.5,795.8 988,825C972.5,854.2 957.2,885 940,915C922.8,945 911.7,977.5 885,1005C858.3,1032.5 837.5,1060.8 780,1080C722.5,1099.2 620,1120 540,1120C460,1120 357.5,1099.2 300,1080C242.5,1060.8 221.7,1032.5 195,1005C168.3,977.5 157.2,945 140,915C122.8,885 107.5,854.2 92,825C76.5,795.8 54.5,754.2 47,740Z');
 const mouth=new Path2D('M110,740C124.2,732.3 165.8,709.3 195,694C224.2,678.7 250,665.3 285,648C320,630.7 362.5,596.7 405,590C447.5,583.3 495,608 540,608C585,608 632.5,583.3 675,590C717.5,596.7 760,630.7 795,648C830,665.3 855.8,678.7 885,694C914.2,709.3 955.8,732.3 970,740L970,740C955,747.7 910,771.7 880,786C850,800.3 823.3,815 790,826C756.7,837 721.7,846 680,852C638.3,858 586.7,862 540,862C493.3,862 441.7,858 400,852C358.3,846 323.3,837 290,826C256.7,815 230,800.3 200,786C170,771.7 125,747.7 110,740Z');
 const tongue=new Path2D('M540,762C505,738 460,727 410,727C300,727 207,770 207,880L207,1190C207,1390 360,1540 540,1540C720,1540 872,1390 872,1190L872,880C872,770 780,727 670,727C620,727 575,738 540,762Z');
 const teeth=new Path2D('M285,648C305,638.3 362.5,596.7 405,590C447.5,583.3 495,608 540,608C585,608 632.5,583.3 675,590C717.5,596.7 775,638.3 795,648L795,648C775,651.7 717.5,664.7 675,670C632.5,675.3 585,680 540,680C495,680 447.5,675.3 405,670C362.5,664.7 305,651.7 285,648Z');
 context.save();
 context.translate(625,-2);context.scale(.303,.303);
 context.fillStyle='#873645';context.fill(lips);
 context.lineWidth=20;context.strokeStyle='#f0b185';context.stroke(lips);
 context.fillStyle='#180f24';context.fill(mouth);
 context.fillStyle='#ffe4cb';context.fill(teeth);
 context.save();context.clip(tongue);
 const inks=['#6642ae','#c84980','#ee6d66','#f3a95c','#4ea8a6','#5167ae'];
 const gradient=context.createLinearGradient(275,740,795,1510);
 inks.forEach((ink,index)=>gradient.addColorStop(index/(inks.length-1),ink));
 context.fillStyle=gradient;context.fill(tongue);
 for(let ribbon=0;ribbon<8;ribbon++){
  const y=685+ribbon*119;
  context.beginPath();context.moveTo(100,y+160);
  context.bezierCurveTo(358,y-166,685,y+348,1020,y-42);
  context.lineWidth=30+ribbon*2;context.globalAlpha=.47;
  context.strokeStyle=inks[(ribbon+3)%inks.length];context.stroke();
  context.lineWidth=6;context.strokeStyle='#fbd0ac';context.stroke();
 }
 context.restore();
 context.strokeStyle='#ebb7a2';context.lineWidth=21;context.stroke(tongue);
 context.beginPath();context.moveTo(540,800);context.bezierCurveTo(518,970,570,1135,540,1340);
 context.lineWidth=13;context.strokeStyle='#692e63';context.stroke();
 context.restore();
}

function paintEmbroidery(context,image){
 const badge=engravingCanvas(600,200);
 if(!badge||!image?.naturalWidth)return false;
 const stitch=badge.context;
 stitch.drawImage(image,0,0,600,200);
 stitch.globalCompositeOperation='source-atop';
 for(const [offset,color] of [[0,'rgba(246,225,192,.23)'],[2,'rgba(13,13,29,.23)']]){
  stitch.beginPath();
  for(let x=-200;x<600;x+=5){stitch.moveTo(x+offset,200);stitch.lineTo(x+146+offset,0);}
  stitch.lineWidth=1.3;stitch.strokeStyle=color;stitch.stroke();
 }
 context.shadowColor='#09070a';context.shadowBlur=9;context.shadowOffsetY=4;
 context.drawImage(badge.canvas,65,192,490,490/3);
 context.shadowColor='transparent';
 return true;
}

export function createLisbonPaperAttache(parent,{layout,casePositions,top,roundedRectangle,geometry,material,texture,mesh,anisotropy}){
 const {position:[x,z],size:[width,depth],lidHeight,cradleHeight}=layout;
 const root=new T.Group();
 root.name='Totehmpaper atelier — leather presentation attaché';root.position.set(x,top,z);parent.add(root);
 const grain=grainTexture(texture,anisotropy);
 const leather=material(new T.MeshStandardMaterial({color:0x261615,roughness:.52,bumpMap:grain,bumpScale:.0015}));
 const piping=material(new T.MeshStandardMaterial({color:0x563125,roughness:.52,bumpMap:grain,bumpScale:.0009}));
 const velvet=material(new T.MeshStandardMaterial({color:0x362621,roughness:.96}));
 const suede=material(new T.MeshStandardMaterial({color:0x625047,roughness:.87,bumpMap:grain,bumpScale:.0007}));
 const brass=material(new T.MeshStandardMaterial({color:0xbc9863,roughness:.32,metalness:.67}));
 const thread=material(new T.LineBasicMaterial({color:0xc2966f}));

 function shell(w,h,round,thickness,bevel,finish,position,name,host){
  return mesh(geometry(new T.ExtrudeGeometry(roundedRectangle(w,h,round),{
   depth:thickness,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,curveSegments:10
  })),finish,position,name,host);
 }
 function stitches(w,h,radius,z,host){
  const edge=roundedRectangle(w,h,radius),points=[];
  const length=edge.getLength();
  for(let i=0;i<length;i+=.008){
   for(const distance of [i,Math.min(i+.0048,length)]){
    const p=edge.getPointAt(distance/length);points.push(new T.Vector3(p.x,p.y,z));
   }
  }
  const seam=new T.LineSegments(geometry(new T.BufferGeometry().setFromPoints(points)),thread);
  seam.name='Individual saddle stitches';host.add(seam);
 }
 const base=new T.Group();base.rotation.x=-Math.PI/2;root.add(base);
 const body=shell(width,depth,.036,.049,.009,leather,[0,0,.009],'Rounded leather attaché body',base);
 shell(width-.015,depth-.015,.030,.008,.004,piping,[0,0,.053],'Hand-finished rolled leather rim',base);
 shell(width-.038,depth-.036,.026,.003,.002,velvet,[0,0,.063],'Dark velvet fitted interior',base);
 stitches(width-.024,depth-.024,.032,.066,base);

 for(const {position:[px,pz]} of casePositions){
  shell(.142,.122,.018,.011,.003,suede,[px-x,z-pz,cradleHeight-.014],
   'Fitted suede cradle for one original glass case',base);
 }

 const lid=new T.Group();
 lid.name='Leather lid held open by brass hinges';
 lid.position.set(0,.065,-depth/2+.015);lid.rotation.x=-.35;root.add(lid);
 const lidFace=[0,lidHeight/2,0];
 const lidShell=shell(width,lidHeight,.035,.014,.008,leather,[0,lidFace[1],-.011],'Rigid leather lid',lid);
 shell(width-.026,lidHeight-.024,.029,.003,.003,piping,[0,lidFace[1],.011],'Raised saddle-stitched leather lining',lid);
 const seam=new T.Group();seam.position.y=lidFace[1];lid.add(seam);
 stitches(width-.039,lidHeight-.036,.027,.018,seam);

 const design=engravingCanvas(1024,540);
 let embroidered=false,designMap=null;
 if(design){
  drawPaintedTongue(design.context);
  designMap=texture(new T.CanvasTexture(design.canvas));designMap.anisotropy=anisotropy;designMap.colorSpace=T.SRGBColorSpace;
  const paint=material(new T.MeshStandardMaterial({color:0xffffff,map:designMap,alphaTest:.08,roughness:.77}));
  const plate=geometry(new T.PlaneGeometry(width-.055,lidHeight-.053));
  mesh(plate,paint,[0,lidFace[1],.0185],'Higher embroidery and painted tongue in the lid',lid);
  const rear=mesh(plate,paint,[0,lidFace[1],-.0195],'Higher embroidery and painted tongue on the exterior',lid);
  rear.rotation.y=Math.PI;
 }
 for(const hingeX of [-width*.31,width*.31]){
  const pin=mesh(geometry(new T.CylinderGeometry(.009,.009,.060,14)),brass,[hingeX,.064,-depth/2+.015],'Brushed brass lid hinge',root);
  pin.rotation.z=Math.PI/2;
 }
 const grip=new T.CatmullRomCurve3([
  new T.Vector3(-.088,.035,depth/2),new T.Vector3(-.072,.031,depth/2+.046),
  new T.Vector3(0,.03,depth/2+.054),new T.Vector3(.072,.031,depth/2+.046),
  new T.Vector3(.088,.035,depth/2)
 ]);
 mesh(geometry(new T.TubeGeometry(grip,30,.012,9)),leather,[0,0,0],'Rolled leather handle',root);
 const fitting=geometry(new T.BoxGeometry(.026,.035,.012));
 for(const fittingX of [-.088,.088]){
  mesh(fitting,brass,[fittingX,.034,depth/2+.005],'Brass handle mount',root);
 }
 const clasp=geometry(new T.BoxGeometry(.029,.034,.010));
 for(const claspX of [-width*.31,width*.31]){
  mesh(clasp,brass,[claspX,.042,depth/2+.006],'Recessed brass clasp',root);
 }
 return{
  root,occluders:[body,lidShell],
  applyHigher(image){
   if(!design||embroidered)return;
   embroidered=paintEmbroidery(design.context,image);
   if(embroidered)designMap.needsUpdate=true;
  },
  diagnostics:()=>({open:true,leather:true,cradles:casePositions.length,higherEmbroidered:embroidered,paintedTongue:!!design,size:layout.size,cradleHeight})
 };
}
