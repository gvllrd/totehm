import * as T from './vendor/three-0.180.0.mjs';

// One mirrored-camera pass is shared by every coplanar wet surface. Rendering
// is capped independently of screen DPR; idle/reduced-motion callers keep the
// cached image. No DOM screenshot, duplicate architecture or video backdrop.
export function createReflection(scene,renderer,{mobile=false,parent=scene}={}) {
  const size=mobile?256:512,maxHz=mobile?4:8,interval=1000/maxHz;
  const target=new T.WebGLRenderTarget(size,size,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,type:T.HalfFloatType,depthBuffer:true,stencilBuffer:false});
  target.texture.name='Shared real planar reflection';target.texture.colorSpace=T.NoColorSpace;
  const camera=new T.PerspectiveCamera(),textureMatrix=new T.Matrix4();
  const reflectorPlane=new T.Plane(),normal=new T.Vector3(0,1,0),point=new T.Vector3();
  const sourcePosition=new T.Vector3(),sourceDirection=new T.Vector3(),lookAt=new T.Vector3(),clip=new T.Vector4(),q=new T.Vector4();
  const surfaces=[],materials=new Set(),geometries=new Set();
  let height=-.06,passes=0,lastPass=-Infinity,disposed=false,lastError=false,rendering=false,needsCapture=true;
  const uniforms={tReflection:{value:target.texture},uTextureMatrix:{value:textureMatrix},uReady:{value:0}};
  function material(kind='water',tint){
    if(!['water','wet','pool','ocean'].includes(kind))throw new TypeError('Unknown reflective surface kind');
    const colour=new T.Color(tint??(kind==='pool'?0x076d78:kind==='wet'?0x253038:kind==='ocean'?0x071e2d:0x0b2730));
    const m=new T.ShaderMaterial({name:`Planar ${kind}`,fog:false,toneMapped:true,side:T.FrontSide,
      uniforms:{...uniforms,uTint:{value:colour},uTime:{value:0},uWet:{value:kind==='wet'?1:0},uPool:{value:kind==='pool'?1:0},uTexel:{value:1/size}},
      vertexShader:`varying vec3 vWorld;varying vec4 vMirror;uniform mat4 uTextureMatrix;
        void main(){vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;vMirror=uTextureMatrix*world;gl_Position=projectionMatrix*viewMatrix*world;}`,
      fragmentShader:`uniform sampler2D tReflection;uniform vec3 uTint;uniform float uTime,uWet,uPool,uTexel,uReady;varying vec3 vWorld;varying vec4 vMirror;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        void main(){
          vec3 viewDirection=normalize(cameraPosition-vWorld);
          float w1=sin(vWorld.x*2.2+vWorld.z*1.4+uTime*.43),w2=sin(vWorld.x*-.9+vWorld.z*3.8-uTime*.31);
          vec2 ripple=vec2(w1,w2)*mix(.0018,.00022,uWet);
          float grain=hash(floor(vWorld.xz*190.));
          ripple+=vec2(grain-.5,hash(floor(vWorld.zx*220.))-.5)*uWet*.00028;
          vec2 uv=vMirror.xy/vMirror.w+ripple;
          uv=clamp(uv,vec2(.001),vec2(.999));
          float blur=mix(.85,1.5,uWet)*uTexel;
          vec3 reflected=texture2D(tReflection,uv).rgb*.52;
          reflected+=texture2D(tReflection,uv+vec2(blur,0.)).rgb*.12;
          reflected+=texture2D(tReflection,uv-vec2(blur,0.)).rgb*.12;
          reflected+=texture2D(tReflection,uv+vec2(0.,blur)).rgb*.12;
          reflected+=texture2D(tReflection,uv-vec2(0.,blur)).rgb*.12;
          reflected*=vec3(.94,.98,1.);
          float fresnel=.04+.96*pow(1.-max(0.,viewDirection.y),5.);
          float reflectivity=mix(.48+fresnel*.49,.24+fresnel*.67,uWet);
          reflectivity=mix(reflectivity,.22+fresnel*.66,uPool);
          vec3 base=uTint*(mix(.48,.32,uWet)+uWet*grain*.055);
          base+=uPool*(.018+.008*sin(vWorld.x*1.7+vWorld.z*2.9+uTime*.27))*vec3(.08,.65,.68);
          vec3 c=mix(base,reflected,reflectivity*uReady);
          gl_FragColor=vec4(c,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });materials.add(m);return m;
  }
  function horizontal(width,depth,x=0,z=0,kind='water',y=-.06,tint){
    if(disposed)throw new Error('Reflection has been disposed');
    const g=new T.PlaneGeometry(width,depth);geometries.add(g);
    const mesh=new T.Mesh(g,material(kind,tint));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);
    mesh.name=`Real reflective ${kind} surface`;mesh.userData.reflectiveSurface=true;mesh.userData.surfaceKind=kind;
    parent.add(mesh);surfaces.push(mesh);return mesh;
  }
  function visibleInTree(mesh){for(let o=mesh;o;o=o.parent)if(!o.visible)return false;return true;}
  function update(source,{time=0,enabled=true,dirty=false}={}){
    if(disposed||rendering||!enabled||(!dirty&&!needsCapture)||!surfaces.some(visibleInTree))return false;
    const now=performance.now();if(now-lastPass<interval)return false;
    source.updateMatrixWorld();source.getWorldPosition(sourcePosition);if(sourcePosition.y<=height+.015)return false;
    for(const m of materials)m.uniforms.uTime.value=time;
    point.set(0,height,0);
    camera.position.copy(sourcePosition);camera.position.y=2*height-sourcePosition.y;
    source.getWorldDirection(sourceDirection);lookAt.copy(sourcePosition).add(sourceDirection);lookAt.y=2*height-lookAt.y;
    camera.up.copy(source.up).reflect(normal);camera.near=source.near;camera.far=source.far;camera.layers.mask=source.layers.mask;
    camera.lookAt(lookAt);camera.updateMatrixWorld();camera.projectionMatrix.copy(source.projectionMatrix);
    textureMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
    textureMatrix.multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
    // Oblique near-plane clipping excludes geometry below the water plane.
    // This is the Lengyel construction used by Three.js's MIT Reflector.
    reflectorPlane.setFromNormalAndCoplanarPoint(normal,point).applyMatrix4(camera.matrixWorldInverse);
    clip.set(reflectorPlane.normal.x,reflectorPlane.normal.y,reflectorPlane.normal.z,reflectorPlane.constant);
    const projection=camera.projectionMatrix.elements;
    q.set((Math.sign(clip.x)+projection[8])/projection[0],(Math.sign(clip.y)+projection[9])/projection[5],-1,(1+projection[10])/projection[14]);
    clip.multiplyScalar(2/clip.dot(q));projection[2]=clip.x;projection[6]=clip.y;projection[10]=clip.z+1-.003;projection[14]=clip.w;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    const saved={target:renderer.getRenderTarget(),face:renderer.getActiveCubeFace(),level:renderer.getActiveMipmapLevel(),viewport:renderer.getViewport(new T.Vector4()),scissor:renderer.getScissor(new T.Vector4()),scissorTest:renderer.getScissorTest(),xr:renderer.xr.enabled,shadow:renderer.shadowMap.autoUpdate,shadowNeeds:renderer.shadowMap.needsUpdate,autoClear:renderer.autoClear,depth:renderer.getContext().getParameter(renderer.getContext().DEPTH_WRITEMASK)};
    const visibility=surfaces.map(m=>m.visible);rendering=true;
    try{
      surfaces.forEach(m=>{m.visible=false;});renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
      // setRenderTarget applies the target's pixel viewport directly. Calling
      // setViewport here would multiply it by the adaptive screen DPR again,
      // leaving a partially rendered reflection whenever DPR is below one.
      renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.state.buffers.depth.setMask(true);
      if(!renderer.autoClear)renderer.clear();renderer.render(scene,camera);
      lastPass=now;passes++;needsCapture=false;uniforms.uReady.value=1;lastError=false;return true;
    }catch(error){lastError=true;throw error;}
    finally{
      surfaces.forEach((m,i)=>{m.visible=visibility[i];});renderer.xr.enabled=saved.xr;renderer.shadowMap.autoUpdate=saved.shadow;renderer.shadowMap.needsUpdate=saved.shadowNeeds;renderer.autoClear=saved.autoClear;
      renderer.setRenderTarget(saved.target,saved.face,saved.level);renderer.setViewport(saved.viewport);renderer.setScissor(saved.scissor);renderer.setScissorTest(saved.scissorTest);renderer.state.buffers.depth.setMask(saved.depth);rendering=false;
    }
  }
  return {material,horizontal,update,
    setHeight(y){if(!Number.isFinite(y))throw new TypeError('Reflection height must be finite');if(height!==y){height=y;lastPass=-Infinity;needsCapture=true;uniforms.uReady.value=0;}},
    diagnostics:()=>({kind:'real shared planar mirrored-camera reflection',size,maxHz,height,passes,surfaces:surfaces.length,visibleSurfaces:surfaces.filter(visibleInTree).length,materials:materials.size,targets:disposed?0:1,ready:uniforms.uReady.value===1,clipped:true,lastError,disposed}),
    dispose(){if(disposed)return;disposed=true;for(const mesh of surfaces)mesh.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();target.dispose();surfaces.length=0;materials.clear();geometries.clear();}
  };
}
