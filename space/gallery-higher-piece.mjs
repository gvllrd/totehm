import * as T from './vendor/three-0.180.0.mjs';

// The exact 600x200, eighteen-notch outline in assets/gallery/higher.svg.
// Extrusion changes depth only; the native proportions and holes stay intact.
export function createHigherPieceGeometry(width=2.4,depth=.035){
 const height=width/3,w=width/2,h=height/2,r=width*14/600,shape=new T.Shape(),top=[60,140,220,300,380,460,540].map(x=>(x/600-.5)*width);
 shape.moveTo(-w,h);
 for(const x of top){shape.lineTo(x-r,h);shape.absarc(x,h,r,Math.PI,Math.PI*2,false);}shape.lineTo(w,h);
 for(const y of [.15*height,-.15*height]){shape.lineTo(w,y+r);shape.absarc(w,y,r,Math.PI/2,Math.PI*1.5,false);}shape.lineTo(w,-h);
 for(const x of top.slice().reverse()){shape.lineTo(x+r,-h);shape.absarc(x,-h,r,0,Math.PI,false);}shape.lineTo(-w,-h);
 for(const y of [-.15*height,.15*height]){shape.lineTo(-w,y-r);shape.absarc(-w,y,r,Math.PI*1.5,Math.PI*2.5,false);}shape.closePath();
 const uv={generateTopUV(g,v,a,b,c){return[a,b,c].map(i=>new T.Vector2(v[i*3]/width+.5,v[i*3+1]/height+.5));},generateSideWallUV(){return[new T.Vector2(),new T.Vector2(1,0),new T.Vector2(1,1),new T.Vector2(0,1)];}};
 const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:2,curveSegments:10,steps:1,UVGenerator:uv});
 geometry.userData={nativeHigher:true,perforations:18,ratio:3,originalSize:[600,200]};return geometry;
}
