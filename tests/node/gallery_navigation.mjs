import assert from 'node:assert/strict';
import { createTempleWalkway } from '../../space/gallery-navigation.mjs';

const walkway = createTempleWalkway();
let checks = 0;
const stations = [
  [0, 12], [0, 0], [-9, -11.2], [0, -11.2], [9, -11.2],
  [-13, -6], [-9, -6], [-13, 0], [-9, 0], [-13, 8],
  [-9, 8], [-13, 15], [-9, 15], [13, -6], [9, -6],
  [13, 0], [9, 0], [13, 8], [9, 8], [13, 15],
].map(([x, z]) => ({ x, z }));

for (const from of stations) for (const to of stations) {
  const path = walkway.route(from, to);
  assert(path && path.length >= 2, 'every valid station has a route');
  assert.deepEqual(path[0], from);
  assert.deepEqual(path.at(-1), to);
  for (let i = 1; i < path.length; i++) {
    assert(walkway.clear(path[i - 1], path[i]), 'all route segments avoid planters');
    assert(path[i].z >= -11.4, 'automatic routes do not enter any portal');
  }
  checks++;
}

for (const x of [-11, 11]) for (const z of [-3, 5, 13]) {
  assert(!walkway.allowed(x, z));
  assert(!walkway.allowed(x + 1.29, z));
  assert.equal(walkway.route(stations[0], { x, z }), null);
  const from = { x: x - 2, z }, to = { x: x + 2, z };
  assert(!walkway.clear(from, to), 'a direct segment cannot cross a planter');
  const path = walkway.route(from, to);
  assert(path && path.length > 2, 'a blocked crossing goes around the planter');
  for (let i = 1; i < path.length; i++) assert(walkway.clear(path[i - 1], path[i]));
  checks++;
}

for (const [x, z] of [[14.01, 0], [-14.01, 0], [0, 16.01], [0, -13.01], [4, -12], [-4, -12], [14, -12]]) {
  assert(!walkway.allowed(x, z));
  assert.equal(walkway.route(stations[0], { x, z }), null);
  checks++;
}

for (const [room, x] of [-9, 0, 9].entries()) {
  assert(walkway.allowed(x, -12.8), 'manual walking can cross an open arch');
  assert.equal(walkway.portalAt(x, -11.99), null, 'approaching is not entering');
  assert.equal(walkway.portalAt(x, -12), room);
  assert.equal(walkway.portalAt(x + 1.69, -12.1), room);
  assert.equal(walkway.portalAt(x + 1.701, -12.1), null, 'outside the aperture does not enter');
  assert.equal(walkway.route(stations[0], { x, z: -12.2 }), null, 'automatic walks stop before crossing');
  checks++;
}

assert(!walkway.clear({ x: -13, z: -3 + 1.3 }, { x: -9, z: -3 + 1.3 }), 'exact tangency is blocked'); checks++;
for (const invalid of [{ x: NaN, z: 0 }, { x: 0, z: Infinity }, { x: 0, z: -Infinity }]) {
  assert(!walkway.allowed(invalid.x, invalid.z));
  assert(!walkway.clear(stations[0], invalid));
  assert.equal(walkway.route(stations[0], invalid), null);
  assert.equal(walkway.portalAt(invalid.x, invalid.z), null);
  checks++;
}

console.log(`PASS ${checks} temple navigation checks`);
