import * as T from './vendor/three-0.180.0.mjs';

// One local stone slab, projected in metres instead of stretching a box's UVs.
// The long calcite veins join at the tile's edges; tributaries stay irregular.
export function createMarble(renderer) {
  const size=innerWidth<650?1024:2048;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');ctx.scale(size,size);
  let seed=0x4e45524f;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  ctx.fillStyle='#090909';ctx.fillRect(0,0,1,1);

  // Subtle graphite mineral clouds, rather than a flat painted black surface.
  for(let i=0;i<38;i++){
    const x=random(),y=random(),r=.10+random()*.25,opacity=.13+random()*.16;
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
      const gradient=ctx.createRadialGradient(x+dx,y+dy,0,x+dx,y+dy,r);
      gradient.addColorStop(0,`rgba(100,100,102,${opacity})`);gradient.addColorStop(1,'rgba(15,17,23,0)');
      ctx.fillStyle=gradient;ctx.fillRect(x+dx-r,y+dy-r,r*2,r*2);
    }
  }

  function stroke(points,width,colour){
    ctx.strokeStyle=colour;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
      ctx.beginPath();points.forEach(([x,y],index)=>index?ctx.lineTo(x+dx,y+dy):ctx.moveTo(x+dx,y+dy));ctx.stroke();
    }
  }
  function vein(points,width,strong=false){
    stroke(points,width*15,'rgba(80,86,100,.10)');
    stroke(points,width*8,'rgba(95,103,121,.10)');
    stroke(points,width*3.5,'rgba(116,122,139,.12)');
    if(!strong){
      stroke(points,width,'rgba(117,126,145,.35)');stroke(points,width*.27,'rgba(186,196,209,.58)');
    }
    if(strong){
      const noise=periodicNoise(19),edges=points.map((p,i)=>{
        const before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)],angle=Math.atan2(after[1]-before[1],after[0]-before[0])+Math.PI/2;
        const radius=width*(.13+Math.pow(noise(i/(points.length-1))+.5,1.2)*1.8);
        return[p[0],p[1],Math.cos(angle)*radius,Math.sin(angle)*radius];
      });
      function ribbon(scale,colour){
        ctx.fillStyle=colour;
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
          ctx.beginPath();edges.forEach(([x,y,nx,ny],i)=>i?ctx.lineTo(x+dx+nx*scale,y+dy+ny*scale):ctx.moveTo(x+dx+nx*scale,y+dy+ny*scale));
          for(let i=edges.length-1;i>=0;i--){const[x,y,nx,ny]=edges[i];ctx.lineTo(x+dx-nx*scale,y+dy-ny*scale);}ctx.closePath();ctx.fill();
        }
      }
      ribbon(1.8,'rgba(100,99,97,.22)');ribbon(.9,'rgba(177,173,166,.68)');ribbon(.24,'rgba(220,219,216,.32)');
      // Uneven crystalline seams keep the main veins mineral rather than drawn wires.
      for(let i=2;i<points.length-2;i+=3){
        const p=points[i],next=points[i+1],w=width*(.2+random()*1.7),angle=Math.atan2(next[1]-p[1],next[0]-p[0]);
        const nx=Math.cos(angle+Math.PI/2),ny=Math.sin(angle+Math.PI/2),length=width*(1+random()*5);
        ctx.fillStyle=`rgba(187,194,205,${.06+random()*.20})`;
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
          ctx.beginPath();ctx.moveTo(p[0]+dx-nx*w,p[1]+dy-ny*w);
          ctx.lineTo(p[0]+dx+Math.cos(angle)*length,p[1]+dy+Math.sin(angle)*length);
          ctx.lineTo(p[0]+dx+nx*w*.55,p[1]+dy+ny*w*.55);ctx.closePath();ctx.fill();
        }
      }
    }
  }
  function periodicNoise(count){
    const values=Array.from({length:count},random);
    return t=>{const p=((t%1)+1)%1*count,index=Math.floor(p),f=p-index,s=f*.45+f*f*(3-2*f)*.55;return values[index]*(1-s)+values[(index+1)%count]*s-.5;};
  }
  for(let i=0;i<5;i++){
    const start=i<2?i*.47+.12:random(),drift=-1;
    const a=periodicNoise(7),b=periodicNoise(29),c=periodicNoise(91);
    const width=(i===0?.012:i===1?.0075:.0009)*(1+random()*.25);
    const at=t=>{
      const x=start+drift*t+a(t)*.2+b(t)*.032+c(t)*.009;
      return i%2?[t,x]:[x,t];
    };
    const points=Array.from({length:193},(_,j)=>at(j/192));vein(points,width,i<2);
    for(let j=0;j<10;j++){
      const t=.05+random()*.88,base=at(t),length=.045+random()*.18,side=random()<.5?-1:1;
      const branch=Array.from({length:37},(_,k)=>{
        const f=k/36;return[base[0]+side*length*f+Math.sin(f*9+j)*.006*f,base[1]+length*.65*f+Math.sin(f*4+j)*.02*f];
      });
      vein(branch,width*(.08+random()*.12));
      if(j%3===0){
        const origin=branch[19],tip=branch[36],fork=Array.from({length:17},(_,k)=>{
          const f=k/16;return[origin[0]+(tip[0]-origin[0])*.8*f,origin[1]-(tip[1]-origin[1])*.8*f+Math.sin(f*8)*.003];
        });vein(fork,width*.11);
      }
    }
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  map.name='Nero marble · local calcite veins';

  function material(name,roughness,metalness){
    const stone=new T.MeshStandardMaterial({name,map,color:0xffffff,roughness,metalness});
    stone.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
varying vec3 vStonePosition;
varying vec3 vStoneNormal;`).replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
vStonePosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
vStoneNormal = normalize(mat3(modelMatrix) * objectNormal);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vStonePosition;
varying vec3 vStoneNormal;`).replace('#include <map_fragment>',`
vec3 stoneNormal = abs(normalize(vStoneNormal));
vec2 stoneUv = stoneNormal.y > max(stoneNormal.x, stoneNormal.z)
  ? vStonePosition.xz : (stoneNormal.x > stoneNormal.z ? vStonePosition.zy : vStonePosition.xy);
vec4 stoneSample = texture2D(map, stoneUv / 5.4);
diffuseColor *= stoneSample;
`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + (0.12 - dot(stoneSample.rgb, vec3(0.2126, 0.7152, 0.0722))) * 0.12, 0.12, 0.65);`);
    };
    stone.customProgramCacheKey=()=> 'space-nero-marble-world-1';
    return stone;
  }
  return {
    wall:material('Black marble walls',.29,.035),
    floor:material('Polished black marble floor',.19,.09),
    trim:material('Black marble edges',.25,.05),
    diagnostics:()=>({material:'black marble',texture:size,slabMetres:5.4,worldProjected:true}),
    dispose(){map.dispose();}
  };
}
