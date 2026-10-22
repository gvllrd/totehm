// Navigation on the temple platform. Automatic routes stop before its arches;
// walking through an arch is an explicit, separately detected transition.
export function createTempleWalkway() {
  const gates = [-9, 0, 9];
  const trees = [-11, 11].flatMap(x => [-3, 5, 13].map(z => ({ x, z, radius: 2.7 })));
  const routeEdge = -11.4;
  const finite = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);

  function portalAt(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z) || z > -12) return null;
    const room = gates.findIndex(gate => Math.abs(x - gate) < 1.7);
    return room < 0 ? null : room;
  }

  function allowed(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > 14 || z < -13 || z > 16) return false;
    if (z < routeEdge && !gates.some(gate => Math.abs(x - gate) < 1.7)) return false;
    return trees.every(tree => Math.hypot(x - tree.x, z - tree.z) > tree.radius);
  }

  function clear(a, b) {
    if (!finite(a) || !finite(b) || a.z < routeEdge || b.z < routeEdge ||
        !allowed(a.x, a.z) || !allowed(b.x, b.z)) return false;
    const dx = b.x - a.x, dz = b.z - a.z, lengthSquared = dx * dx + dz * dz;
    // The exact segment distance also catches grazing collisions between samples.
    for (const tree of trees) {
      const t = lengthSquared ? Math.max(0, Math.min(1,
        ((tree.x - a.x) * dx + (tree.z - a.z) * dz) / lengthSquared)) : 0;
      if (Math.hypot(a.x + dx * t - tree.x, a.z + dz * t - tree.z) <= tree.radius) return false;
    }
    const steps = Math.max(1, Math.ceil(Math.sqrt(lengthSquared) / .12));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (!allowed(a.x + dx * t, a.z + dz * t)) return false;
    }
    return true;
  }

  // A fixed visibility graph gives bounded route cost, independent of frame rate.
  const waypoints = [];
  for (const tree of trees) {
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8, radius = tree.radius + .25;
      waypoints.push({ x: tree.x + Math.cos(angle) * radius, z: tree.z + Math.sin(angle) * radius });
    }
  }
  const edges = waypoints.map(() => []);
  for (let a = 0; a < waypoints.length; a++) {
    for (let b = a + 1; b < waypoints.length; b++) {
      if (!clear(waypoints[a], waypoints[b])) continue;
      const distance = Math.hypot(waypoints[b].x - waypoints[a].x, waypoints[b].z - waypoints[a].z);
      edges[a].push([b, distance]);
      edges[b].push([a, distance]);
    }
  }

  function route(from, to) {
    if (!finite(from) || !finite(to) || from.z < routeEdge || to.z < routeEdge ||
        !allowed(from.x, from.z) || !allowed(to.x, to.z)) return null;
    if (clear(from, to)) return [from, to];
    const nodes = [from, to, ...waypoints];
    const graph = [[], [], ...edges.map(neighbours => neighbours.map(([index, distance]) => [index + 2, distance]))];
    for (let endpoint = 0; endpoint < 2; endpoint++) {
      for (let i = 2; i < nodes.length; i++) {
        if (!clear(nodes[endpoint], nodes[i])) continue;
        const distance = Math.hypot(nodes[i].x - nodes[endpoint].x, nodes[i].z - nodes[endpoint].z);
        graph[endpoint].push([i, distance]);
        graph[i].push([endpoint, distance]);
      }
    }
    const distances = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set();
    distances[0] = 0;
    for (let count = 0; count < nodes.length; count++) {
      let current = -1;
      for (let i = 0; i < nodes.length; i++) {
        if (!visited.has(i) && (current < 0 || distances[i] < distances[current])) current = i;
      }
      if (current < 0 || !Number.isFinite(distances[current])) return null;
      if (current === 1) {
        const path = [];
        for (let i = 1; i !== -1; i = previous[i]) path.unshift(nodes[i]);
        return path;
      }
      visited.add(current);
      for (const [next, distance] of graph[current]) {
        if (visited.has(next)) continue;
        const candidate = distances[current] + distance;
        if (candidate < distances[next]) {
          distances[next] = candidate;
          previous[next] = current;
        }
      }
    }
    return null;
  }

  return { allowed, clear, route, portalAt };
}
