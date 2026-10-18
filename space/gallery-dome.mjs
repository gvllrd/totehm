import * as T from './vendor/three-0.180.0.mjs';

// The published intention colours used by the processor on totehm.com.
// These are flat strokes: no bloom, blur, invented colours or moving pulses.
export const INTENTION_COLOURS = Object.freeze([
  '#E24B4A', '#e48b31', '#fcbe21', '#639922',
  '#1D9E75', '#378ADD', '#7F77DD'
]);

export function createDome(scene, renderer) {
  const center = {x: 0, y: 0, z: -3};
  const radius = 13, spring = 5.2, height = 13.2;
  const root = new T.Group();
  root.name = 'Seven intentions · tree and open dome';
  root.position.set(center.x, center.y, center.z);
  scene.add(root);

  const positions = [], ends = [], alongs = [], sides = [], colours = [], indices = [];
  const counts = {tree: 0, ribs: 0, rings: 0, roots: 0, portal: 0};
  const point = (x, y, z) => new T.Vector3(x, y, z);
  const polar = (angle, r, y) => point(Math.sin(angle) * r, y, Math.cos(angle) * r);
  const colour = index => new T.Color(INTENTION_COLOURS[(index + 7) % 7]);

  // A single batch of screen-width segments keeps the traits at 2 CSS pixels
  // on a phone and on a large display, including branches high over the visitor.
  function path(points, index, kind) {
    const c = colour(index);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], offset = positions.length / 3;
      for (let j = 0; j < 4; j++) {
        positions.push(a.x, a.y, a.z);
        ends.push(b.x, b.y, b.z);
        alongs.push(j < 2 ? 0 : 1);
        sides.push(j % 2 ? 1 : -1);
        colours.push(c.r, c.g, c.b);
      }
      indices.push(offset, offset + 1, offset + 2, offset + 2, offset + 1, offset + 3);
    }
    counts[kind]++;
  }
  function branch(points, index, steps = 90) {
    const curve = new T.CatmullRomCurve3(points, false, 'centripetal');
    path(curve.getPoints(steps), index, 'tree');
    return curve;
  }
  function domePoint(angle, elevation) {
    return polar(angle, radius * Math.cos(elevation), spring + (height - spring) * Math.sin(elevation));
  }

  // Seven long continuous meridians define the dome without putting a roof
  // between its visitors and the stars. Each opposite pair shares an intention.
  // Uneven orientation avoids a front-on wire-cage grid at the entrance.
  const angles = [0.18, 0.60, 1.03, 1.49, 1.94, 2.38, 2.85];
  for (let i = 0; i < 7; i++) {
    const angle = angles[i], rib = [];
    for (let j = 0; j <= 180; j++) {
      const t = j / 180 * Math.PI;
      rib.push(polar(angle, radius * Math.cos(t), spring + (height - spring) * Math.sin(t)));
    }
    path(rib, i, 'ribs');
  }

  // A quiet spring line, interrupted at the two doors. The broken, upper
  // crown is deliberately sparse; the form is an airy canopy, not a mesh.
  for (let i = 0; i < 7; i++) {
    const start = i / 7 * Math.PI * 2, end = (i + 1) / 7 * Math.PI * 2;
    for (const elevation of [0, 0.89]) {
      let section = [];
      for (let j = 0; j <= 62; j++) {
        const angle = start + (end - start) * j / 62;
        const doorway = elevation === 0 && Math.abs(Math.sin(angle)) < 2.04 / radius;
        // Small spaces separate the seven upper strokes, like the COM traits.
        const gap = elevation > 0 && (j < 4 || j > 58);
        if (doorway || gap) {
          if (section.length > 1) path(section, i, 'rings');
          section = [];
        } else section.push(domePoint(angle, elevation));
      }
      if (section.length > 1) path(section, i, 'rings');
    }
  }

  // A tree drawn with the very same seven traits. They gather into a narrow
  // trunk, separate into a high canopy, then become the dome's architecture.
  // Roots remain within the central clearance; no low branch crosses a walk.
  for (let i = 0; i < 7; i++) {
    const angle = angles[i] + (i % 2 ? Math.PI : 0);
    const trunkAngle = i / 7 * Math.PI * 2;
    const rootTip = polar(trunkAngle - 0.3, 1.04, 0.035);
    const foot = polar(trunkAngle, 0.30, 0.13);
    const trunk = polar(trunkAngle + 0.48, 0.22, 2.1);
    const fork = polar(trunkAngle + 0.92, 0.30, 4.35 + (i % 3) * 0.17);
    const shoulder = polar(angle + 0.13, 1.30, 6.15 + (i % 2) * 0.25);
    const elbow = polar(angle + 0.05, 3.3, 8.35);
    const join = domePoint(angle, 1.055);
    const main = branch([rootTip, foot, trunk, fork, shoulder, elbow, join], i, 132);

    // A short, branching root makes the centre read as a planted tree while
    // keeping the entire installation made of fine, uninterrupted lines.
    const rootCurve = new T.CatmullRomCurve3([
      polar(trunkAngle + 0.38, 1.12, 0.028),
      polar(trunkAngle + 0.17, 0.68, 0.06), foot
    ], false, 'centripetal');
    path(rootCurve.getPoints(28), i, 'roots');

    // Two asymmetric offshoots turn the seven parent traits into a branching
    // silhouette. Each meets a real meridian, avoiding loose decorative wires.
    for (let j = 0; j < 2; j++) {
      const next = (i + (j ? 6 : 1)) % 7;
      const targetAngle = angles[next] + (i % 2 ? Math.PI : 0);
      const elevation = j ? 0.72 : 1.25;
      const takeoff = main.getPoint(j ? 0.68 : 0.53);
      const destination = domePoint(targetAngle, elevation);
      const bend = takeoff.clone().lerp(destination, 0.58);
      bend.y += j ? 0.72 : 1.2;
      branch([takeoff, bend, destination], i, 74);
    }
  }

  // The far portal is an actual doorway in the room's black shell. Its
  // seven-colour outline gives the eye a destination beyond the central tree.
  const portal = {
    x: 0, y: 0, z: center.z - radius,
    width: 3.6, height: 5.6, radius: 1.8,
    outward: {x: 0, y: 0, z: -1}
  };
  const arch = [point(-1.8, 0.035, -radius + 0.025), point(-1.8, 3.8, -radius + 0.025)];
  for (let i = 0; i <= 90; i++) {
    const angle = Math.PI - i / 90 * Math.PI;
    arch.push(point(Math.cos(angle) * 1.8, 3.8 + Math.sin(angle) * 1.8, -radius + 0.025));
  }
  arch.push(point(1.8, 0.035, -radius + 0.025));
  const archCurve = new T.CurvePath();
  for (let i = 1; i < arch.length; i++) archCurve.add(new T.LineCurve3(arch[i - 1], arch[i]));
  for (let i = 0; i < 7; i++) {
    const points = [];
    for (let j = 0; j <= 30; j++) points.push(archCurve.getPointAt((i + j / 30) / 7));
    path(points, i, 'portal');
  }

  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('end', new T.Float32BufferAttribute(ends, 3));
  geometry.setAttribute('along', new T.Float32BufferAttribute(alongs, 1));
  geometry.setAttribute('side', new T.Float32BufferAttribute(sides, 1));
  geometry.setAttribute('colour', new T.Float32BufferAttribute(colours, 3));
  geometry.setIndex(indices);
  const material = new T.ShaderMaterial({
    uniforms: {resolution: {value: new T.Vector2(innerWidth, innerHeight)}, stroke: {value: 2}},
    vertexShader: `
      attribute vec3 end;
      attribute float along;
      attribute float side;
      attribute vec3 colour;
      uniform vec2 resolution;
      uniform float stroke;
      varying vec3 vColour;
      void main() {
        vec4 a = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec4 b = projectionMatrix * modelViewMatrix * vec4(end, 1.0);
        float da = a.z + a.w, db = b.z + b.w;
        if (da < 0.0 && db < 0.0) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        } else {
          // Clip the segment before projecting its width. This prevents long
          // spikes when a visitor walks through or looks behind a fine stroke.
          if (da < 0.0) a = mix(a, b, -da / (db - da));
          else if (db < 0.0) b = mix(b, a, -db / (da - db));
          vec2 delta = (b.xy / b.w - a.xy / a.w) * resolution;
          vec2 direction = delta / max(length(delta), 0.001);
          vec2 normal = vec2(-direction.y, direction.x);
          vec4 clip = mix(a, b, along);
          // Subpixel overlap closes the joins between consecutive segments.
          vec2 offset = normal * side * stroke + direction * (along * 2.0 - 1.0) * 0.35;
          clip.xy += offset / resolution * clip.w;
          gl_Position = clip;
        }
        vColour = colour;
      }
    `,
    fragmentShader: `
      varying vec3 vColour;
      void main() {
        gl_FragColor = vec4(vColour, 1.0);
        #include <colorspace_fragment>
      }
    `,
    side: T.DoubleSide, toneMapped: false, depthTest: true, depthWrite: true
  });
  const strokes = new T.Mesh(geometry, material);
  strokes.name = 'Intention traits · 2px';
  // The geometry stores segment starts; the shader also uses their ends.
  // A dome surrounding the camera must never be rejected by that start box.
  strokes.frustumCulled = false;
  strokes.onBeforeRender = () => renderer.getSize(material.uniforms.resolution.value);
  root.add(strokes);

  return {
    root, center, radius, height, spring, portal,
    collision: {x: center.x, z: center.z, radius: 1.2},
    pickables: [],
    diagnostics: () => ({
      intentions: 7, colours: [...INTENTION_COLOURS], stroke: 2,
      ribs: counts.ribs, branches: counts.tree, roots: counts.roots,
      radius, height, portal: true, animated: false
    }),
    dispose() { scene.remove(root); geometry.dispose(); material.dispose(); }
  };
}
