import * as T from './vendor/three-0.180.0.mjs';

// A celestial canopy made locally from geometry and shaders. No remote assets.
export function createSky(scene, renderer) {
  const root = new T.Group();
  scene.add(root);
  let time = 0, seed = 1827;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const starCount = innerWidth < 650 ? 2400 : 3800;
  const uniforms = { uTime:{value:0}, uPixelRatio:{value:renderer.getPixelRatio()} };
  const dome = new T.Mesh(new T.SphereGeometry(64,32,20), new T.ShaderMaterial({
    side:T.BackSide, depthWrite:false, depthTest:false, fog:false, toneMapped:false,
    uniforms,
    vertexShader:`varying vec3 vDirection;
      void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec3 vDirection;
      uniform float uTime;
      float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float cloud(vec2 p){float n=0.,weight=.55;for(int i=0;i<4;i++){n+=weight*noise(p);p=p*2.03+vec2(8.1,3.7);weight*=.48;}return n;}
      void main(){
        vec3 d=normalize(vDirection);
        vec2 p=vec2(d.x*4.+d.y*1.7,d.z*3.7-d.y*2.8);
        float band=exp(-pow(abs(dot(d,normalize(vec3(.84,.2,.15))))*4.7,1.4));
        float billow=cloud(p*2.1+vec2(uTime*.0015,0.));
        float dust=cloud(p*7.8);
        float horizon=pow(1.-abs(d.y),4.);
        vec3 color=mix(vec3(.0015,.002,.007),vec3(.006,.008,.023),horizon);
        color+=band*pow(billow,1.6)*vec3(.065,.041,.12);
        color+=band*smoothstep(.42,.85,dust)*vec3(.025,.045,.075);
        color*=1.-band*smoothstep(.49,.78,dust)*.55;
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`
  }));
  dome.renderOrder = -1000;
  dome.frustumCulled = false;
  root.add(dome);

  const positions = new Float32Array(starCount*3), colors = new Float32Array(starCount*3);
  const sizes = new Float32Array(starCount), phases = new Float32Array(starCount);
  for (let i=0; i<starCount; i++) {
    const y=random()*1.16-.16, theta=random()*Math.PI*2, radius=Math.sqrt(1-y*y);
    positions.set([Math.cos(theta)*radius*59,y*59,Math.sin(theta)*radius*59],i*3);
    const tint=random();
    colors.set(tint<.18?[1,.79,.58]:tint<.4?[.58,.73,1]:[.88,.92,1],i*3);
    sizes[i]=random()<.04?4.6+random()*1.8:1.65+Math.pow(random(),2)*2.1;
    phases[i]=random()*Math.PI*2;
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  geometry.setAttribute('aColor',new T.BufferAttribute(colors,3));
  geometry.setAttribute('aSize',new T.BufferAttribute(sizes,1));
  geometry.setAttribute('aPhase',new T.BufferAttribute(phases,1));
  const stars=new T.Points(geometry,new T.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,fog:false,toneMapped:false,blending:T.AdditiveBlending,
    vertexShader:`
      uniform float uTime,uPixelRatio;attribute vec3 aColor;attribute float aSize,aPhase;
      varying vec3 vColor;varying float vLight,vSize;
      void main(){vColor=aColor;vSize=aSize;vLight=.72+.28*sin(uTime*(.35+aSize*.12)+aPhase);
        gl_PointSize=aSize*uPixelRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec3 vColor;varying float vLight,vSize;
      void main(){vec2 p=abs(gl_PointCoord-.5)*2.;float r=length(p);if(r>1.)discard;
        float glow=pow(max(0.,1.-r),1.6);
        float cross=max(0.,1.-min(p.x,p.y)*18.)*pow(max(0.,1.-max(p.x,p.y)),2.);
        float alpha=max(glow,vSize>3.5?cross*.6:0.);
        gl_FragColor=vec4(vColor,vLight*alpha);
      }`
  }));
  stars.frustumCulled=false;
  root.add(stars);

  // One brief, fading meteor at a time; its 28 vertices are reused.
  const trailVertices=new Float32Array(28*3), fades=new Float32Array(28);
  for(let i=0;i<28;i++)fades[i]=Math.pow(1-i/27,2);
  const trailGeometry=new T.BufferGeometry();
  trailGeometry.setAttribute('position',new T.BufferAttribute(trailVertices,3).setUsage(T.DynamicDrawUsage));
  trailGeometry.setAttribute('aFade',new T.BufferAttribute(fades,1));
  const meteorUniforms={uOpacity:{value:0}};
  const meteor=new T.Line(trailGeometry,new T.ShaderMaterial({
    uniforms:meteorUniforms,transparent:true,depthWrite:false,fog:false,toneMapped:false,blending:T.AdditiveBlending,
    vertexShader:`attribute float aFade;varying float vFade;void main(){vFade=aFade;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float uOpacity;varying float vFade;void main(){gl_FragColor=vec4(.72,.83,1.,vFade*uOpacity);}`
  }));
  meteor.frustumCulled=false;meteor.visible=false;root.add(meteor);
  function update(dt, eye, animated) {
    root.position.copy(eye);
    if(animated)time+=Math.min(dt,.05);
    uniforms.uTime.value=time;
    root.rotation.y=time*.002;
    const age=(time+10)%14;
    meteor.visible=animated&&age<1.6;
    if(meteor.visible){
      const progress=age/1.6, cycle=Math.floor((time+10)/14), flip=cycle%2?-1:1;
      for(let i=0;i<28;i++){
        const t=progress-i/27*.14;
        trailVertices[i*3]=flip*(-27+t*44);
        trailVertices[i*3+1]=35-t*15;
        trailVertices[i*3+2]=-39-t*5;
      }
      meteorUniforms.uOpacity.value=Math.sin(Math.PI*progress)*.9;
      trailGeometry.attributes.position.needsUpdate=true;
    }
  }
  return {update,diagnostics:()=>({stars:starCount,time:+time.toFixed(3),meteor:meteor.visible})};
}
