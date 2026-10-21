import * as T from './vendor/three-0.180.0.mjs';
import { SIGNS, INTENTIONS } from './gallery-spatial-data.mjs';

// The existing street controller, in its original 16:9 coordinate system.
// Left, top and width are percentages, copied from play_lisbon_street.html.
export const LISBON_SIGNS = Object.freeze(Object.fromEntries(
  Object.entries(SIGNS).map(([key, value]) => [key, Object.freeze([...value])])
));

export const LISBON_LAYOUT = Object.freeze({
  width: 10, height: 5.625, centre: Object.freeze([-11, 3, -5]),
  screen: Object.freeze([-11, 8.1, -8]),
  stop: Object.freeze({position: Object.freeze([-11, 1.65, 7]), target: Object.freeze([-11, 3, -5])})
});

export function createSpatialLisbon(scene, {onChange = () => {}, mobile = false} = {}) {
  const root = new T.Group(); root.name = 'Lisbon — the street controller'; scene.add(root);
  const board = new T.Group(); board.position.fromArray(LISBON_LAYOUT.centre); root.add(board);
  const screen = new T.Group(); screen.position.fromArray(LISBON_LAYOUT.screen); root.add(screen);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const signs = new Map(), missing = new Set(), loader = new T.TextureLoader();
  let disposed = false, loaded = 0, brandLoaded = false, time = 0, moving = false;
  let selected = null, video = null, videoTexture = null, dirty = true;
  const screenWidth = 8.6, screenHeight = screenWidth * 9 / 16;
  const geometry = value => (geometries.add(value), value);
  const material = value => (materials.add(value), value);
  const basic = (colour, extra = {}) => material(new T.MeshBasicMaterial({color: colour, toneMapped: false, ...extra}));
  const boxGeometry = geometry(new T.BoxGeometry(1, 1, 1));
  const planeGeometry = geometry(new T.PlaneGeometry(1, 1));
  const navy = basic('#22224a'), paperNavy = basic('#333366'), black = basic('#000000');
  const ink = basic('#b4b4bc');
  function changed() { if (!disposed) { dirty = true; onChange(); } }
  function box(parent, w, h, d, x, y, z, mat = navy) {
    const mesh = new T.Mesh(boxGeometry, mat); mesh.scale.set(w, h, d); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }
  function line(parent, points, colour, opacity = 1) {
    const mat = material(new T.LineBasicMaterial({color: colour, transparent: opacity < 1, opacity, toneMapped: false}));
    const object = new T.Line(geometry(new T.BufferGeometry().setFromPoints(points.map(p => new T.Vector3(...p)))), mat);
    parent.add(object); return object;
  }
  function frame(parent, w, h, z, colour, opacity = 1) {
    return line(parent, [[-w/2,-h/2,z],[w/2,-h/2,z],[w/2,h/2,z],[-w/2,h/2,z],[-w/2,-h/2,z]], colour, opacity);
  }
  function image(src, onLoad) {
    const texture = loader.load(src, value => {
      if (disposed) { value.dispose(); return; }
      onLoad(value); changed();
    }, undefined, () => { if (!disposed) { missing.add(src); changed(); } });
    texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = mobile ? 1 : 2;
    textures.add(texture); return texture;
  }
  function alphaMask(image) {
    // Rectangle-only raycasts let the transparent part of destination.png
    // intercept neighbouring buttons. Keep one byte per source pixel; no
    // canvas readback is needed during pointer movement or rendering.
    const canvas=document.createElement('canvas');
    canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)return null;
    try {
      ctx.drawImage(image,0,0);
      const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      const alpha=new Uint8Array(canvas.width*canvas.height);
      for(let i=0;i<alpha.length;i++)alpha[i]=rgba[i*4+3];
      return{width:canvas.width,height:canvas.height,alpha};
    } catch { return null; }
  }

  // A floating navy console. Its square signal nodes echo COM's processor;
  // the artwork colours belong to the original sign images themselves.
  box(board, 10.32, 5.94, .32, 0, 0, -.19);
  box(board, 10, 5.625, .035, 0, 0, -.008, black);
  frame(board, 10.34, 5.96, -.02, '#333366');
  box(board, 10.45, .12, .6, 0, -3.01, -.07, paperNavy);
  box(board, .1, 1.18, .1, -3.7, -3.45, -.12, navy);
  box(board, .1, 1.18, .1, 3.7, -3.45, -.12, navy);
  for (let n = 0; n < INTENTIONS.length; n++) {
    const x = -1.2 + n * .4;
    line(board, [[x,-3.03,.25],[x,-3.24,.25],[x+.11,-3.24,.25]], INTENTIONS[n], .85);
    box(board, .036, .036, .02, x+.11, -3.24, .25, basic(INTENTIONS[n]));
  }

  Object.entries(LISBON_SIGNS).forEach(([key, [left, top, width]], index) => {
    const size = width / 100 * LISBON_LAYOUT.width;
    const x = (left / 100 - .5) * LISBON_LAYOUT.width + size / 2;
    const y = (.5 - top / 100) * LISBON_LAYOUT.height - size / 2;
    const group = new T.Group(); group.position.set(x, y, .08); board.add(group);
    const mat = basic('#ffffff', {transparent: true, alphaTest: .06, depthWrite: true});
    const mesh = new T.Mesh(planeGeometry, mat); mesh.scale.set(size, size, 1); mesh.visible = false;
    mesh.name = 'Lisbon sign — ' + key;
    mesh.userData = {kind: 'sign', key, left, top, width}; group.add(mesh);
    const outline = frame(group, size + .09, size + .09, -.016, '#d8d8e0'); outline.visible = false;
    const sign={mesh, group, outline, size, index, baseZ: .08,mask:null};signs.set(key,sign);
    mesh.raycast=function(raycaster,intersections){
      const hits=[];T.Mesh.prototype.raycast.call(this,raycaster,hits);
      for(const hit of hits){
        const mask=sign.mask;
        if(mask&&hit.uv){
          const x=Math.min(mask.width-1,Math.max(0,Math.floor(hit.uv.x*mask.width)));
          const y=Math.min(mask.height-1,Math.max(0,Math.floor((1-hit.uv.y)*mask.height)));
          if(mask.alpha[y*mask.width+x]<16)continue;
        }
        intersections.push(hit);
      }
    };
    mat.map = image('/assets/signs/' + key + '.png', texture => {
      sign.mask=alphaMask(texture.image);loaded++;mesh.visible=true;
    });
  });

  // This is part of the same 3D room. The video element is owned by the shared
  // artwork player; this module never changes its src, plays it or fetches it.
  box(screen, screenWidth + .3, screenHeight + .3, .25, 0, 0, -.2, navy);
  box(screen, screenWidth, screenHeight, .03, 0, 0, -.035, black);
  frame(screen, screenWidth + .32, screenHeight + .32, -.05, '#333366');
  const mediaMaterial = basic('#ffffff');
  const media = new T.Mesh(planeGeometry, mediaMaterial); media.visible = false; media.position.z = .012;
  media.userData = {kind: 'lisbonScreen'}; screen.add(media);
  const idle = new T.Group(); screen.add(idle);
  const brandMaterial = basic('#ffffff', {transparent: true, depthWrite: false});
  const brand = new T.Mesh(planeGeometry, brandMaterial); brand.scale.set(3.3, 1.1, 1); brand.position.set(0, .55, .025);
  brand.visible = false; idle.add(brand);
  brandMaterial.map = image('/assets/gallery/higher.svg', () => { brandLoaded = true; brand.visible = true; });
  const titleCanvas = document.createElement('canvas'); titleCanvas.width = 1024; titleCanvas.height = 256;
  const titleTexture = new T.CanvasTexture(titleCanvas); titleTexture.colorSpace = T.SRGBColorSpace; textures.add(titleTexture);
  const title = new T.Mesh(planeGeometry, basic('#ffffff', {map: titleTexture, transparent: true, depthWrite: false}));
  title.scale.set(6.5, 1.625, 1); title.position.set(0, -.7, .026); idle.add(title);
  function drawTitle() {
    if (disposed) return;
    const ctx = titleCanvas.getContext('2d'); ctx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
    ctx.fillStyle = '#dedee7'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '38px "Space Mono", monospace'; ctx.fillText('the Lisbon Streets', 512, 75);
    ctx.fillStyle = '#a2a2ae'; ctx.font = '22px "Space Mono", monospace'; ctx.fillText('Choose a sign. Play the street.', 512, 170);
    titleTexture.needsUpdate = true; changed();
  }
  drawTitle(); document.fonts?.ready.then(drawTitle);

  // Thin structural cables keep the screen grounded in the same sculpture.
  for (const x of [-3.7, 3.7]) line(root, [[-11+x,5.8,-5.15],[-11+x,5.8,-8.2],[-11+x,8.1-screenHeight/2,-8.2]], '#333366');

  function fitMedia() {
    if (!video || !selected || disposed) return;
    const aspect = video.videoWidth > 0 && video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 16/9;
    const w = Math.min(screenWidth, screenHeight * aspect), h = Math.min(screenHeight, screenWidth / aspect);
    media.scale.set(w, h, 1); changed();
  }
  function setMedia(element, key) {
    if (disposed || !signs.has(key) || !element || element.tagName !== 'VIDEO') return false;
    if (video !== element) {
      video?.removeEventListener('loadedmetadata', fitMedia);
      if (videoTexture) { videoTexture.dispose(); textures.delete(videoTexture); }
      video = element; video.addEventListener('loadedmetadata', fitMedia);
      videoTexture = new T.VideoTexture(video); videoTexture.colorSpace = T.SRGBColorSpace;
      videoTexture.minFilter = T.LinearFilter; videoTexture.magFilter = T.LinearFilter; textures.add(videoTexture);
    }
    selected = key;
    for (const [id, sign] of signs) { sign.outline.visible = id === selected; sign.group.position.z = sign.baseZ + (id === selected ? .12 : 0); }
    mediaMaterial.map = videoTexture; mediaMaterial.needsUpdate = true;
    media.visible = true; idle.visible = false; fitMedia(); changed(); return true;
  }
  function clearMedia() {
    if (disposed) return;
    selected = null; media.visible = false; idle.visible = true;
    mediaMaterial.map = null; mediaMaterial.needsUpdate = true;
    video?.removeEventListener('loadedmetadata', fitMedia); video = null;
    if (videoTexture) { videoTexture.dispose(); textures.delete(videoTexture); videoTexture = null; }
    for (const sign of signs.values()) { sign.outline.visible = false; sign.group.position.z = sign.baseZ; }
    changed();
  }

  return {
    root,
    stop: {position: [...LISBON_LAYOUT.stop.position], target: [...LISBON_LAYOUT.stop.target]},
    get pickables() { return root.visible ? [...signs.values()].filter(s => s.mesh.visible).map(s => s.mesh).concat(media.visible ? [media] : []) : []; },
    setMedia, clearMedia,
    getSignPosition(key) { const sign = signs.get(key); if (!sign) return null; root.updateMatrixWorld(true); return sign.mesh.getWorldPosition(new T.Vector3()); },
    update(dt, eye, motion) {
      if (disposed || !root.visible) { moving = false; return false; }
      const near = !eye || Math.hypot(eye.x + 11, eye.z + 5) < 55;
      moving = !!motion && near;
      if (moving) {
        time += Math.min(Math.max(dt || 0, 0), .1);
        for (const sign of signs.values()) {
          const key=sign.mesh.userData.key;
          sign.group.position.z = sign.baseZ + (selected === key ? .12 : 0) + Math.sin(time * .7 + sign.index * .43) * .025;
          if (key==='roundabout'||key==='left_or_straight') sign.mesh.rotation.z=-time*Math.PI/9;
        }
      }
      // Video is deliberate user playback and remains available with reduced
      // ambient motion; the parent owns visibility and audio suspension.
      const playing = !!selected && !!video && !video.paused && !video.ended && video.readyState >= 2;
      const result = dirty || moving || playing; dirty = false; return result;
    },
    diagnostics: () => ({
      kind: 'original Lisbon controller in the shared spatial world', signs: signs.size, loaded,
      brandLoaded, missing: missing.size, hitMasks:[...signs.values()].filter(s=>s.mask).length,
      selected, playing: !!selected && !!video && !video.paused && !video.ended,
      mediaReady: !!selected && !!video && video.readyState >= 2, videoTextures: videoTexture ? 1 : 0,
      time: +time.toFixed(3), moving, visible: root.visible, board: LISBON_LAYOUT,
      coordinates: LISBON_SIGNS, disposed
    }),
    dispose() {
      if (disposed) return; disposed = true; moving = false;
      video?.removeEventListener('loadedmetadata', fitMedia); video = null; videoTexture = null;
      for (const texture of textures) texture.dispose(); textures.clear();
      for (const mat of materials) mat.dispose(); materials.clear();
      for (const geo of geometries) geo.dispose(); geometries.clear();
      root.removeFromParent(); root.clear(); signs.clear();
    }
  };
}
