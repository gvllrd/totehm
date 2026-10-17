import * as T from './vendor/three-0.180.0.mjs';
import { TOTEHMPAPER, ORIGINS } from './gallery-artworks.mjs';
import { createLisbonPreview } from './gallery-lisbon.mjs';

// Keep the published journey's positions and cadence. Only its contents change:
// original images take the place of the sculptures, in their original order.
export const VOID = Object.freeze({ spacing: 32, firstZ: -34, firstStopZ: -25, height: 4.8 });
const LISBON = Object.freeze({
  id: 'lisbon-streets', title: 'Higher the Lisbon Streets',
  aspect: 1024 / 722, href: '/play_lisbon_street', collection: 'lisbon'
});
const COLLECTIONS = [Object.freeze([TOTEHMPAPER]), ORIGINS, Object.freeze([LISBON])];
const mobileDefault = () => typeof innerWidth === 'number' && innerWidth < 650;
const finiteIndex = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;

export function createVoid(scene, { mobile = mobileDefault(), lisbonPreview = null, onChange = () => {} } = {}) {
  const root = new T.Group();
  root.name = 'absolute-black-art-corridor';
  root.visible = false;
  scene.add(root);

  const geometry = new T.PlaneGeometry(1, 1), loader = new T.TextureLoader();
  const limit = mobile ? 3 : 5, slots = [], pickables = [], textures = new Map();
  let room = 1, works = COLLECTIONS[room], index = 0, disposed = false, dirty = true;
  let preview = lisbonPreview, ownsPreview = false;

  // There is deliberately no floor, wall, frame, light, label, particle or line.
  // Lighting comes from the unmodified image itself; the parent clears to #000.
  for (let i = 0; i < limit; i++) {
    const material = new T.MeshBasicMaterial({
      color: 0x000000, toneMapped: false, transparent: true, opacity: 0,
      depthWrite: false, fog: false
    });
    const mesh = new T.Mesh(geometry, material);
    mesh.visible = false;
    root.add(mesh);
    slots.push({ mesh, index: -1, key: null });
  }

  function changed() {
    dirty = true;
    const lisbon = textures.get('lisbon-preview');
    if (lisbon?.texture) lisbon.texture.needsUpdate = true;
    if (!disposed) onChange();
  }
  function centre(n) { return { x: (n % 2 ? -1 : 1) * 4.8, y: 5.1, z: VOID.firstZ - n * VOID.spacing }; }
  function safeIndex(n) { return Math.min(works.length - 1, finiteIndex(n)); }
  function textureReady(key, entry) {
    if (disposed || textures.get(key) !== entry) { entry.texture.dispose(); return; }
    entry.loaded = true;
    for (const slot of slots) if (slot.key === key) {
      slot.mesh.material.color.set(0xffffff);
      slot.mesh.material.needsUpdate = true;
    }
    changed();
  }
  function imageTexture(work) {
    const key = work === LISBON ? 'lisbon-preview' : work.src;
    if (textures.has(key)) return { key, entry: textures.get(key) };
    const entry = { texture: null, loaded: false };
    textures.set(key, entry);
    if (work === LISBON) {
      if (!preview) { preview = createLisbonPreview({ onChange: changed }); ownsPreview = true; }
      entry.texture = new T.CanvasTexture(preview.canvas);
      entry.texture.colorSpace = T.SRGBColorSpace;
      entry.loaded = true;
    } else {
      entry.texture = loader.load(work.src, () => textureReady(key, entry), undefined, changed);
      entry.texture.colorSpace = T.SRGBColorSpace;
    }
    return { key, entry };
  }
  function assign(slot, n) {
    const work = works[n], c = centre(n), { key, entry } = imageTexture(work);
    slot.index = n;
    slot.key = key;
    slot.mesh.position.set(c.x, c.y, c.z);
    slot.mesh.scale.set(VOID.height * work.aspect, VOID.height, 1);
    slot.mesh.name = work.id;
    slot.mesh.userData = {
      room, origin: room === 1 ? n : null, void: true, index: n,
      id: work.id, title: work.title,
      href: room === 1 ? `${work.href}?work=${String(n + 1).padStart(2, '0')}` : work.href,
      ...(room === 0 ? { method: '/stoner' } : {})
    };
    slot.mesh.material.map = entry.texture;
    slot.mesh.material.color.set(entry.loaded ? 0xffffff : 0x000000);
    slot.mesh.material.needsUpdate = true;
    slot.mesh.visible = false;
  }
  function arrange(n) {
    const count = Math.min(limit, works.length);
    const first = Math.max(0, Math.min(n - 1, works.length - count));
    const required = Array.from({ length: count }, (_, i) => first + i);
    const spare = slots.filter(slot => !required.includes(slot.index));
    for (const next of required) if (!slots.some(slot => slot.index === next)) assign(spare.pop(), next);
    for (const slot of slots) if (!required.includes(slot.index)) {
      slot.index = -1; slot.key = null; slot.mesh.visible = false;
      slot.mesh.material.map = null; slot.mesh.material.opacity = 0;
    }
    // Keep decoded GPU images bounded on a phone, even after visiting all 20.
    const retained = new Set(slots.map(slot => slot.key));
    for (const [key, entry] of textures) if (!retained.has(key)) {
      entry.texture.dispose(); textures.delete(key);
    }
    changed();
  }
  function reveal(eye) {
    let visualChange = false;
    pickables.length = 0;
    for (const slot of slots) {
      if (slot.index < 0) continue;
      const depth = eye.z - slot.mesh.position.z;
      // The next original emerges as the visitor approaches; a distant row of
      // tiny illuminated pictures never replaces the original reveal mechanic.
      const opacity = T.MathUtils.smoothstep(depth, -6, 2) * (1 - T.MathUtils.smoothstep(depth, 20, 40));
      const visible = root.visible && opacity > .001;
      if (slot.mesh.visible !== visible || Math.abs(slot.mesh.material.opacity - opacity) > .0001) visualChange = true;
      slot.mesh.visible = visible;
      slot.mesh.material.opacity = opacity;
      if (visible) pickables.push(slot.mesh);
    }
    pickables.sort((a, b) => a.position.distanceToSquared(eye) - b.position.distanceToSquared(eye));
    return visualChange;
  }

  function getStop(n) {
    const next = finiteIndex(n);
    if (next >= works.length) return { end: true, sector: next, room, total: works.length };
    const c = centre(next);
    return {
      position: new T.Vector3(0, 1.65, c.z + 9), target: new T.Vector3(c.x, c.y, c.z),
      sector: next, room, origin: room === 1 ? next : null, work: works[next].id, total: works.length
    };
  }

  return {
    root, pickables,
    enter(nextRoom, nextIndex = 0) {
      const candidate = Number(nextRoom);
      room = Number.isInteger(candidate) && candidate >= 0 && candidate < COLLECTIONS.length ? candidate : 1;
      works = COLLECTIONS[room]; index = safeIndex(nextIndex);
      for (const slot of slots) { slot.index = -1; slot.mesh.visible = false; }
      root.visible = true;
      arrange(index);
      reveal(getStop(index).position);
      return getStop(index);
    },
    getStop,
    invalidate: changed,
    nextStop(eye) {
      // Exact former gallery-journey formula, including its first stop at -25.
      const next = eye.z > -25 ? 0 : Math.max(0, Math.floor((-eye.z - 25) / VOID.spacing) + 1);
      return getStop(next);
    },
    update(dt, eye, motion) {
      if (disposed || !root.visible) { pickables.length = 0; return false; }
      const next = safeIndex(Math.floor((-eye.z - 18) / VOID.spacing));
      if (next !== index) { index = next; arrange(index); }
      let visualChange = reveal(eye);
      if (room === 2 && preview) {
        const animated = !!motion && pickables.length > 0;
        if (preview.update(dt, animated)) {
          const entry = textures.get('lisbon-preview');
          if (entry) entry.texture.needsUpdate = true;
          visualChange = true;
        }
      }
      const result = dirty || visualChange;
      dirty = false;
      return result;
    },
    diagnostics: () => ({
      room, total: works.length, index, currentWork: works[index].id,
      order: works.map(work => work.id), spacing: VOID.spacing,
      visibleWorks: root.visible ? slots.filter(slot => slot.mesh.visible).map(slot => slot.index + 1).sort((a, b) => a - b) : [],
      loaded: Array.from(textures.values()).filter(entry => entry.loaded).length,
      pool: slots.length, black: true
    }),
    dispose() {
      if (disposed) return;
      disposed = true; root.visible = false; pickables.length = 0;
      for (const entry of textures.values()) entry.texture.dispose();
      textures.clear();
      for (const slot of slots) slot.mesh.material.dispose();
      geometry.dispose();
      if (ownsPreview) preview?.pause();
      scene.remove(root);
    }
  };
}
