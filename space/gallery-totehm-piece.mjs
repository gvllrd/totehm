import * as T from './vendor/three-0.180.0.mjs';

// Native square paper: three original circular edge notches on each side.
export function createTotehmPieceGeometry(width=1.7,depth=.10){
 const h=width/2,r=width*.06,shape=new T.Shape();shape.moveTo(-h,h);
 for(const x of [-h/2,0,h/2]){shape.lineTo(x-r,h);shape.absarc(x,h,r,Math.PI,Math.PI*2,false);}shape.lineTo(h,h);
 for(const y of [h/2,0,-h/2]){shape.lineTo(h,y+r);shape.absarc(h,y,r,Math.PI/2,Math.PI*1.5,false);}shape.lineTo(h,-h);
 for(const x of [h/2,0,-h/2]){shape.lineTo(x+r,-h);shape.absarc(x,-h,r,0,Math.PI,false);}shape.lineTo(-h,-h);
 for(const y of [-h/2,0,h/2]){shape.lineTo(-h,y-r);shape.absarc(-h,y,r,Math.PI*1.5,Math.PI*2.5,false);}shape.closePath();
 const uv={generateTopUV(g,v,a,b,c){return[a,b,c].map(i=>new T.Vector2(v[i*3]/width+.5,v[i*3+1]/width+.5));},generateSideWallUV(){return[new T.Vector2(),new T.Vector2(1,0),new T.Vector2(1,1),new T.Vector2(0,1)];}};
 const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:2,curveSegments:12,steps:1,UVGenerator:uv});
 geometry.userData={nativeTotehm:true,perforations:12,ratio:1};return geometry;
}
