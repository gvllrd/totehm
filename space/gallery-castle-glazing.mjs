import * as T from './vendor/three-0.180.0.mjs';

// An uninterrupted contemporary front inserted between the retained ruins.
// The open central bay and its transom share the navigation wall dimensions.
export function createCastleGlazing(parent,{geometry=null,material=null}={}){
 const root=new T.Group();root.name='Lisbon — floating low-iron glass pavilion in the castle';parent.add(root);
 const solids=[],geometries=new Set(),materials=new Set();let disposed=false;
 const ownG=g=>{geometries.add(g);return geometry?geometry(g):g;},ownM=m=>{materials.add(m);return material?material(m):m;};
 const glass=ownM(new T.MeshPhysicalMaterial({color:0xd6e4e4,roughness:.045,metalness:.02,transparent:true,opacity:.09,depthWrite:false,side:T.DoubleSide,envMapIntensity:1.5,clearcoat:1,clearcoatRoughness:.035}));
 glass.name='Castle pavilion — low-iron glass with a reflected night edge';
 glass.customProgramCacheKey=()=> 'castle-pavilion-low-iron-fresnel-v1';
 glass.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
  float castleGrazing=pow(1.-clamp(abs(dot(normalize(normal),normalize(vViewPosition))),0.,1.),4.);
  diffuseColor.a=mix(.055,.28,castleGrazing);
  #include <opaque_fragment>`);};
 const bronze=ownM(new T.MeshStandardMaterial({color:0x39342d,roughness:.31,metalness:.82}));
 const light=ownM(new T.MeshBasicMaterial({color:0xffdcb1,toneMapped:false}));
 const box=ownG(new T.BoxGeometry(1,1,1));
 function block(m,p,size,name,solid=false){const mesh=new T.Mesh(box,m);mesh.position.set(...p);mesh.scale.set(...size);mesh.name=name;mesh.castShadow=!m.transparent;mesh.receiveShadow=!m.isMeshBasicMaterial;root.add(mesh);if(solid)solids.push(mesh);return mesh;}
 const bottom=-.09,top=7.25,z=-1.96;
 for(const side of [-1,1]){
  block(glass,[side*7.7,(top+bottom)/2,z],[10.6,top-bottom,.032],'Uninterrupted double-height glass wing',true);
  for(const x of [2.43,5.9,10.2,12.98])block(bronze,[side*x,(top+bottom)/2,z+.025],[.035,top-bottom,.13],'Slender bronze glass fin');
  block(bronze,[side*7.7,bottom+.025,z],[10.6,.05,.09],'Recessed glass sill');
 }
 block(glass,[0,(top+3.1)/2,z],[4.8,top-3.1,.032],'Clear glass above the open entrance',true);
 block(bronze,[0,3.12,z],[4.8,.04,.09],'Minimal entrance transom');
 // The long, dark eave appears to float; its warm underside washes the stone.
 block(bronze,[0,7.27,-1.88],[26.7,.10,.82],'Floating pavilion cantilever edge');
 block(light,[0,7.212,-1.49],[25.9,.009,.018],'Concealed warm line under the cantilever');
 return {root,solids,diagnostics:()=>({kind:'castle-glass-pavilion',castle:true,castleGlass:true,ruined:true,continuousGlass:true,doubleHeight:true,thinBronzeFins:true,frameThickness:.035,clearEntryWidth:4.8,entryHeight:3.1,windows:0,balconies:0,opaqueFrontWall:false,cantilever:true}),dispose(){if(disposed)return;disposed=true;root.removeFromParent();if(!geometry)for(const g of geometries)g.dispose();if(!material)for(const m of materials)m.dispose();root.clear();}};
}
