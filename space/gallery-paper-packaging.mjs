import * as T from './vendor/three-0.180.0.mjs';

// The physical counterpart of get_higher.html's .box: black 180-square case,
// 50-deep sides, clear front and the original THP at 68% of the case width.
// Local +Z faces the viewer; the group is centred so its owner can lay it on
// the edition table or incline it. Resource callbacks belong to that owner.
export function createPaperPackaging({paperMaterial,geometry=g=>g,material=m=>m,width=.38}={}){
 if(!paperMaterial)throw new TypeError('A Totehmpaper material is required');
 const root=new T.Group();root.name='Totehmpaper — original premium glass case';
 const depth=width*50/180,halfDepth=depth/2,edgeWidth=width*1.5/180;
 const box=geometry(new T.BoxGeometry(1,1,1)),plane=geometry(new T.PlaneGeometry(1,1));
 const black=material(new T.MeshStandardMaterial({color:0x000000,roughness:.39,metalness:.18}));
 function block(p,size,name){
  const mesh=new T.Mesh(box,black);mesh.position.set(...p);mesh.scale.set(...size);mesh.name=name;
  mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
 }
 function sheet(m,p,size,name){
  const mesh=new T.Mesh(plane,m);mesh.position.set(...p);mesh.scale.set(size[0],size[1],1);mesh.name=name;root.add(mesh);return mesh;
 }
 block([0,0,-halfDepth],[width,width,edgeWidth],'Original matte-black case backing');
 for(const x of [-width/2,width/2])block([x,0,0],[edgeWidth,width+edgeWidth,depth],'Original black vertical side');
 for(const y of [-width/2,width/2])block([0,y,0],[width,edgeWidth,depth],'Original black horizontal side');
 const paper=sheet(paperMaterial,[0,0,-width*12/180],[width*.68,width*.68],'One authentic THP protected inside its premium case');
 paper.castShadow=true;paper.receiveShadow=true;
 // These match .b-front and its diagonal ::before highlight. They avoid a
 // transmission pass, keeping six independent cases inexpensive on mobile.
 const glass=material(new T.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:.04,roughness:.10,metalness:.12,depthWrite:false,side:T.FrontSide}));
 const front=sheet(glass,[0,0,halfDepth+width*.0007],[width,width],'Original clear premium case glass');front.renderOrder=3;
 const glint=material(new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 vUv;void main(){float d=(vUv.x+1.-vUv.y)*.5;float a=d<.4?mix(.14,.03,d/.4):mix(.03,0.,clamp((d-.4)/.25,0.,1.));gl_FragColor=vec4(vec3(1.),a);}'
 }));
 sheet(glint,[0,0,halfDepth+width*.001],[width,width],'Original diagonal glass reflection').renderOrder=4;
 const rim=material(new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35,depthWrite:false,toneMapped:false}));
 sheet(rim,[0,width/2-width*.002,halfDepth+width*.0013],[width-edgeWidth,width*.0017],'Original fine upper glass edge').renderOrder=4;
 root.userData={premiumPackaging:true,premiumSource:'/get_higher',sourceClasses:['box','b-back','b-logo','bside','b-front'],originalDimensions:[180,180,50],logoRatio:.68,glassOpacity:.04,dimensions:[width+edgeWidth,width+edgeWidth,depth+edgeWidth],paperCount:1};
 return root;
}
