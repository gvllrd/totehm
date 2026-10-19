// Ground navigation for the four separate shots of the reference architecture.
// Coordinates belong to the currently selected location; they are never joined
// into an invented path between the separate buildings.
const freeze = value => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

export const LOCATIONS = freeze({
  courtyard: {
    id: 'courtyard', entry: [0, 14],
    bounds: {minX: -9, maxX: 9, minZ: -24, maxZ: 18},
    backLimit: -21.2, gateEnd: -23,
    pools: [{minX: -2.45, maxX: 2.45, minZ: -18.5, maxZ: 8.5}],
    plants: [-6, 6].flatMap(x => [4, -7, -15].map(z => ({x, z, radius: 1.15}))),
    portals: [-6.4, 0, 6.4].map((x, index) => ({
      index, x, z: -22, halfWidth: 1.1, triggerHalfWidth: .95,
      approach: [x, -20.9],
    })),
  },
  passage: {
    id: 'passage', entry: [0, 14],
    bounds: {minX: -4.5, maxX: 4.5, minZ: -24, maxZ: 18},
    pools: [{minX: -1.7, maxX: 1.7, minZ: -24, maxZ: 10}],
    plants: [], portals: [],
  },
  pavilion: {
    id: 'pavilion', entry: [0, 14],
    bounds: {minX: -8.6, maxX: 8.6, minZ: -25, maxZ: 18},
    // The visible water is x ±5 / z ≤9; reserve a .2 m walking setback.
    pools: [{minX: -5.2, maxX: 5.2, minZ: -25, maxZ: 9.2}],
    plants: [], portals: [],
  },
  coast: {
    id: 'coast', entry: [15.2, 18],
    bounds: {minX: 9.2, maxX: 15.8, minZ: 10.2, maxZ: 18.8},
    pools: [], plants: [], portals: [],
  },
});

const finite = value => typeof value === 'number' && Number.isFinite(value);
const point = value => value !== null && typeof value === 'object' && finite(value.x) && finite(value.z);
const inside = (x, z, box) => x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;

function allowedIn(location, x, z) {
  if (!finite(x) || !finite(z) || !inside(x, z, location.bounds)) return false;
  if (location.backLimit !== undefined && z < location.backLimit) {
    if (z < location.gateEnd || !location.portals.some(gate => Math.abs(x - gate.x) <= gate.halfWidth)) return false;
  }
  if (location.pools.some(pool => inside(x, z, pool))) return false;
  return !location.plants.some(plant => Math.hypot(x - plant.x, z - plant.z) <= plant.radius);
}

// Liang–Barsky: a rectangle hit includes touching its waterline.
function touchesBox(a, b, box) {
  let near = 0, far = 1;
  for (const [axis, min, max] of [['x', box.minX, box.maxX], ['z', box.minZ, box.maxZ]]) {
    const delta = b[axis] - a[axis];
    if (delta === 0) {
      if (a[axis] < min || a[axis] > max) return false;
    } else {
      let first = (min - a[axis]) / delta, last = (max - a[axis]) / delta;
      if (first > last) [first, last] = [last, first];
      near = Math.max(near, first); far = Math.min(far, last);
      if (near > far) return false;
    }
  }
  return true;
}

function clearIn(location, a, b) {
  if (!point(a) || !point(b) || !allowedIn(location, a.x, a.z) || !allowedIn(location, b.x, b.z)) return false;
  if (location.backLimit !== undefined && Math.min(a.z, b.z) < location.backLimit) {
    // The portion behind the wall must fit wholly inside one gate. This also
    // permits a safe return when a manual step stopped on the physical sill.
    const back = a.z < b.z ? a : b, front = back === a ? b : a;
    const t = front.z > location.backLimit ? (location.backLimit - back.z) / (front.z - back.z) : 1;
    const exitX = back.x + (front.x - back.x) * t;
    if (!location.portals.some(gate => Math.abs(back.x - gate.x) <= gate.halfWidth && Math.abs(exitX - gate.x) <= gate.halfWidth)) return false;
  }
  if (location.pools.some(pool => touchesBox(a, b, pool))) return false;
  const dx = b.x - a.x, dz = b.z - a.z, lengthSquared = dx * dx + dz * dz;
  for (const plant of location.plants) {
    const t = lengthSquared ? Math.max(0, Math.min(1, ((plant.x - a.x) * dx + (plant.z - a.z) * dz) / lengthSquared)) : 0;
    if (Math.hypot(a.x + dx * t - plant.x, a.z + dz * t - plant.z) <= plant.radius) return false;
  }
  return true;
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function buildGraph(location) {
  const nodes = [], add = (x, z) => {
    if (allowedIn(location, x, z) && !nodes.some(node => node.x === x && node.z === z)) nodes.push({x, z});
  };
  const pad = .25, bounds = location.bounds, back = location.backLimit ?? bounds.minZ;
  for (const x of [bounds.minX + pad, bounds.maxX - pad]) {
    for (const z of [back + pad, bounds.maxZ - pad]) add(x, z);
  }
  for (const pool of location.pools) {
    for (const x of [pool.minX - pad, pool.maxX + pad]) {
      for (const z of [pool.minZ - pad, pool.maxZ + pad]) add(x, z);
    }
  }
  for (const plant of location.plants) {
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8, radius = plant.radius + pad;
      add(plant.x + Math.cos(angle) * radius, plant.z + Math.sin(angle) * radius);
    }
  }
  for (const gate of location.portals) add(...gate.approach);
  const edges = nodes.map(() => []);
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      if (clearIn(location, nodes[a], nodes[b])) {
        const length = distance(nodes[a], nodes[b]);
        edges[a].push([b, length]); edges[b].push([a, length]);
      }
    }
  }
  return {nodes, edges};
}

export function createBrutalistWalkway(getLocation = () => 'courtyard') {
  const graphs = new Map();
  const current = () => {
    const id = typeof getLocation === 'function' ? getLocation() : 'courtyard';
    return Object.hasOwn(LOCATIONS, id) ? LOCATIONS[id] : LOCATIONS.courtyard;
  };
  function allowed(x, z) { return allowedIn(current(), x, z); }
  function clear(a, b) { return clearIn(current(), a, b); }
  function portalAt(x, z) {
    const location = current();
    if (!allowedIn(location, x, z)) return null;
    return location.portals.find(gate => z <= gate.z && Math.abs(x - gate.x) <= gate.triggerHalfWidth)?.index ?? null;
  }
  function route(from, to) {
    const location = current();
    if (!point(from) || !point(to) || !allowedIn(location, from.x, from.z) || !allowedIn(location, to.x, to.z)) return null;
    if (clearIn(location, from, to)) return [from, to];
    if (!graphs.has(location.id)) graphs.set(location.id, buildGraph(location));
    const graph = graphs.get(location.id), nodes = [from, to, ...graph.nodes];
    // Static edges are built only once per location. A request adds just its two
    // endpoint fans, rather than recasting the whole graph during navigation.
    const edges = [[], [], ...graph.edges.map(list => list.map(([index, length]) => [index + 2, length]))];
    for (let endpoint = 0; endpoint < 2; endpoint++) {
      for (let index = 2; index < nodes.length; index++) {
        if (clearIn(location, nodes[endpoint], nodes[index])) {
          const length = distance(nodes[endpoint], nodes[index]);
          edges[endpoint].push([index, length]); edges[index].push([endpoint, length]);
        }
      }
    }
    const lengths = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = nodes.map(() => false);
    lengths[0] = 0;
    for (let count = 0; count < nodes.length; count++) {
      let nearest = -1;
      for (let index = 0; index < nodes.length; index++) {
        if (!visited[index] && (nearest === -1 || lengths[index] < lengths[nearest])) nearest = index;
      }
      if (nearest === -1 || !Number.isFinite(lengths[nearest])) return null;
      if (nearest === 1) {
        const path = [];
        for (let index = 1; index !== -1; index = previous[index]) path.unshift(nodes[index]);
        return path;
      }
      visited[nearest] = true;
      for (const [index, length] of edges[nearest]) {
        if (!visited[index] && lengths[nearest] + length < lengths[index]) {
          lengths[index] = lengths[nearest] + length; previous[index] = nearest;
        }
      }
    }
    return null;
  }
  return {allowed, clear, route, portalAt};
}
