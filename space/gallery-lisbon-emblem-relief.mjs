import * as T from './vendor/three-0.180.0.mjs';

// The city emblem's alpha is its physical outline: the spaces between mast,
// birds and waves are empty all the way through the relief, not a black plate.
// The caller owns and disposes the returned geometry. Material group 0 is the
// authored front/back image; group 1 contains the cut metal edges.
export function createEmblemReliefGeometry(image,{width=1.5,depth=.10,mobile=false}={}){
 const size=Math.max(.05,Number(width)||1.5),thickness=Math.max(.005,Number(depth)||.10);
 const sourceWidth=image?.naturalWidth||image?.width||0,sourceHeight=image?.naturalHeight||image?.height||0;
 if(!image||!sourceWidth||!sourceHeight||(!image.data&&!globalThis.document?.createElement))return fallback(size,thickness);
 const columns=mobile?96:160,rows=Math.max(16,Math.round(columns*sourceHeight/sourceWidth)),height=size*sourceHeight/sourceWidth;
 let pixels;
 try{
  if(image.data){
   pixels=new Uint8ClampedArray(columns*rows*4);
   for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
    const sx=Math.min(sourceWidth-1,Math.floor((x+.5)*sourceWidth/columns)),sy=Math.min(sourceHeight-1,Math.floor((y+.5)*sourceHeight/rows));
    pixels[(y*columns+x)*4+3]=image.data[(sy*sourceWidth+sx)*4+3];
   }
  }else{
   const canvas=document.createElement('canvas');canvas.width=columns;canvas.height=rows;
   const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return fallback(size,thickness);
   context.drawImage(image,0,0,columns,rows);pixels=context.getImageData(0,0,columns,rows).data;
  }
 }catch{return fallback(size,thickness);}
 const mask=new Uint8Array(columns*rows),used=new Uint8Array(columns*rows);
 let cells=0;for(let i=0;i<mask.length;i++){mask[i]=pixels[i*4+3]>=112?1:0;cells+=mask[i];}
 if(!cells)return fallback(size,thickness);
 const facePositions=[],faceUVs=[],edgePositions=[],edgeUVs=[];
 const xAt=x=>(x/columns-.5)*size,yAt=y=>(.5-y/rows)*height;
 const filled=(x,y)=>x>=0&&y>=0&&x<columns&&y<rows&&mask[y*columns+x]===1;
 function quad(vertices,coords,target,targetUV){for(const index of [0,1,2,0,2,3]){target.push(...vertices[index]);targetUV.push(...coords[index]);}}
 // Greedy rectangles produce a small coplanar cap mesh while preserving
 // the fine sampled silhouette. No face lies over a transparent source cell.
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  if(!filled(x,y)||used[y*columns+x])continue;
  let right=x+1,bottom=y+1;
  while(right<columns&&filled(right,y)&&!used[y*columns+right])right++;
  outer:while(bottom<rows){for(let xx=x;xx<right;xx++)if(!filled(xx,bottom)||used[bottom*columns+xx])break outer;bottom++;}
  for(let yy=y;yy<bottom;yy++)for(let xx=x;xx<right;xx++)used[yy*columns+xx]=1;
  const x0=xAt(x),x1=xAt(right),y0=yAt(y),y1=yAt(bottom),u0=x/columns,u1=right/columns,v0=1-y/rows,v1=1-bottom/rows;
  quad([[x0,y1,thickness],[x1,y1,thickness],[x1,y0,thickness],[x0,y0,thickness]],[[u0,v1],[u1,v1],[u1,v0],[u0,v0]],facePositions,faceUVs);
  quad([[x0,y1,0],[x0,y0,0],[x1,y0,0],[x1,y1,0]],[[u0,v1],[u0,v0],[u1,v0],[u1,v1]],facePositions,faceUVs);
 }
 // Every exposed grid edge becomes a genuine side wall, including holes.
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++)if(filled(x,y)){
  const x0=xAt(x),x1=xAt(x+1),y0=yAt(y),y1=yAt(y+1),uv=[[0,0],[1,0],[1,1],[0,1]];
  if(!filled(x-1,y))quad([[x0,y0,0],[x0,y1,0],[x0,y1,thickness],[x0,y0,thickness]],uv,edgePositions,edgeUVs);
  if(!filled(x+1,y))quad([[x1,y1,0],[x1,y0,0],[x1,y0,thickness],[x1,y1,thickness]],uv,edgePositions,edgeUVs);
  if(!filled(x,y-1))quad([[x1,y0,0],[x0,y0,0],[x0,y0,thickness],[x1,y0,thickness]],uv,edgePositions,edgeUVs);
  if(!filled(x,y+1))quad([[x0,y1,0],[x1,y1,0],[x1,y1,thickness],[x0,y1,thickness]],uv,edgePositions,edgeUVs);
 }
 const positions=facePositions.concat(edgePositions),uvs=faceUVs.concat(edgeUVs);
 const geometry=new T.BufferGeometry();geometry.name='Lisbon city emblem — cut-through alpha relief';
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
 geometry.addGroup(0,facePositions.length/3,0);geometry.addGroup(facePositions.length/3,edgePositions.length/3,1);
 geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData={alphaRelief:true,solidCells:cells,sampling:[columns,rows],depth:thickness,triangles:positions.length/9,fallback:false};return geometry;
}

function fallback(width,depth){
 const paths=[];
 const rectangle=(x0,y0,x1,y1)=>{const s=new T.Shape();s.moveTo(x0,y0);s.lineTo(x1,y0);s.lineTo(x1,y1);s.lineTo(x0,y1);s.closePath();paths.push(s);};
 rectangle(-.035,-.08,.035,.34);rectangle(-.19,.25,.19,.29);
 const hull=new T.Shape();hull.moveTo(-.34,-.02);hull.quadraticCurveTo(-.27,-.27,0,-.27);hull.quadraticCurveTo(.27,-.27,.34,-.02);hull.lineTo(.20,-.02);hull.quadraticCurveTo(.10,-.15,0,-.15);hull.quadraticCurveTo(-.10,-.15,-.20,-.02);hull.closePath();paths.push(hull);
 for(const side of [-1,1]){
  const bird=new T.Shape();bird.moveTo(side*.07,.16);bird.lineTo(side*.20,.23);bird.lineTo(side*.46,-.015);bird.lineTo(side*.39,-.075);bird.lineTo(side*.27,.055);bird.lineTo(side*.13,.04);bird.closePath();paths.push(bird);
 }
 const flag=new T.Shape();flag.moveTo(-.015,.34);flag.lineTo(.15,.34);flag.lineTo(.105,.385);flag.lineTo(.15,.43);flag.lineTo(-.015,.43);flag.closePath();paths.push(flag);
 const geometry=new T.ExtrudeGeometry(paths,{depth:depth/width,bevelEnabled:false,steps:1,curveSegments:12});geometry.scale(width,width,width);
 geometry.name='Lisbon city emblem — physical anchor fallback';geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData={alphaRelief:true,depth,fallback:true,triangles:geometry.attributes.position.count/3};return geometry;
}
