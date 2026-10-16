import * as T from './vendor/three-0.180.0.mjs';

// A celestial canopy made locally from geometry and shaders. No remote assets.
export function createSky(scene, renderer) {
  const root = new T.Group();
  scene.add(root);
  let time = 0, seed = 1827;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const starCount = innerWidth < 650 ? 4300 : 6800;
  const uniforms = { uTime:{value:0}, uPixelRatio:{value:renderer.getPixelRatio()} };
  const dome = new T.Mesh(new T.SphereGeometry(64,32,20), new T.ShaderMaterial({
    side:T.BackSide, depthWrite:false, depthTest:false, fog:false, toneMapped:false,
    uniforms,
    vertexShader:`varying vec3 vDirection;
      void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec3 vDirection;
      uniform float uTime;
      // Sample the unit sphere in three dimensions: no stretched UV curtains,
      // poles or panorama seams when a visitor looks directly overhead.
      float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                       mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                       mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float cloud(vec3 p){float n=0.,weight=.55;
        for(int i=0;i<4;i++){n+=weight*noise(p);p=p*2.03+vec3(8.1,3.7,5.3);weight*=.48;}return n;}
      void main(){
        vec3 d=normalize(vDirection);
        vec3 drift=vec3(uTime*.003,uTime*.0011,-uTime*.0018);
        float billow=cloud(d*4.6+drift);
        float detail=cloud(d*15.+vec3(billow*1.8)-drift*.65);
        float axis=dot(d,normalize(vec3(.84,.2,.15)));
        float bend=(billow-.48)*.32;
        float band=exp(-pow((axis+bend)*3.65,2.));
        float halo=exp(-pow((axis+bend)*1.7,2.));
        float density=smoothstep(.20,.76,billow)*(.36+detail*.85);
        float filaments=smoothstep(.38,.82,detail);
        float rose=smoothstep(.46,.76,cloud(d*2.7+vec3(7.2,3.8,1.4)+drift*.45));
        float dust=1.-smoothstep(.46,.73,detail)*smoothstep(.42,.69,billow)*.72;
        vec3 color=vec3(.00045,.00065,.0019);
        color+=halo*(.27+billow*.5)*vec3(.007,.014,.036);
        vec3 nebula=mix(vec3(.025,.10,.24),vec3(.18,.035,.24),rose);
        nebula=mix(nebula,vec3(.27,.065,.14),rose*filaments*.68);
        color+=band*density*dust*nebula;
        color+=band*pow(filaments,2.)*vec3(.018,.031,.055);
        color+=pow(max(0.,dot(d,normalize(vec3(-.45,.66,-.6)))),18.)*vec3(.008,.027,.045);
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
    let y=random()*1.16-.16, theta=random()*Math.PI*2;
    // Some distant stars gather in the Milky Way, with an even foreground.
    if(i%3===0){
      for(let attempt=0;attempt<5;attempt++){
        const candidateY=random()*1.16-.16, candidateTheta=random()*Math.PI*2;
        const r=Math.sqrt(1-candidateY*candidateY);
        if(Math.abs(Math.cos(candidateTheta)*r*.959+candidateY*.228+Math.sin(candidateTheta)*r*.171)<.24){y=candidateY;theta=candidateTheta;break;}
      }
    }
    const radius=Math.sqrt(1-y*y);
    positions.set([Math.cos(theta)*radius*59,y*59,Math.sin(theta)*radius*59],i*3);
    const tint=random();
    colors.set(tint<.16?[1,.73,.43]:tint<.45?[.55,.72,1]:tint<.52?[1,.71,.85]:[.91,.95,1],i*3);
    const size=random();
    sizes[i]=size<.014?10.+random()*6.:size<.07?3.8+random()*2.8:1.15+Math.pow(random(),2)*2.;
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
      void main(){vColor=aColor;vSize=aSize;vLight=.69+.24*sin(uTime*(.22+aSize*.045)+aPhase)+.07*sin(uTime*.91+aPhase*2.);
        gl_PointSize=aSize*uPixelRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec3 vColor;varying float vLight,vSize;
      void main(){vec2 p=abs(gl_PointCoord-.5)*2.;float r=length(p);if(r>1.)discard;
        float glow=exp(-r*r*5.5)*(1.-smoothstep(.3,1.,r));
        float core=exp(-r*r*42.);
        float cross=max(0.,1.-min(p.x,p.y)*24.)*pow(max(0.,1.-max(p.x,p.y)),2.);
        float alpha=max(glow*.62+core*.6,vSize>6.5?cross*.48:0.);
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
