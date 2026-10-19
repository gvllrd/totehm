import assert from 'node:assert/strict';
import {LOCATIONS, createBrutalistWalkway} from '../../space/gallery-brutalist-path.mjs';

let location = 'courtyard', checks = 0, sampledSteps = 0;
const walkway = createBrutalistWalkway(() => location);
function check(condition, message) { assert(condition, message); checks++; }
const p = (x, z) => ({x, z});

// Independent specification checks, deliberately not built from the exported
// obstacle objects or clear(): every routed segment is sampled against these.
function ground(id, x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (id === 'coast') return x >= 9.2 && x <= 15.8 && z >= 10.2 && z <= 18.8;
  if (id === 'passage') return Math.abs(x) <= 4.5 && z >= -24 && z <= 18 && !(Math.abs(x) <= 1.7 && z <= 10);
  if (id === 'pavilion') return Math.abs(x) <= 8.6 && z >= -25 && z <= 18 && !(Math.abs(x) <= 5.2 && z <= 9.2);
  if (Math.abs(x) > 9 || z > 18 || z < -23) return false;
  if (z < -21.2 && ![-6.4, 0, 6.4].some(gate => Math.abs(x - gate) <= 1.1)) return false;
  if (Math.abs(x) <= 2.45 && z >= -18.5 && z <= 8.5) return false;
  for (const side of [-6, 6]) for (const depth of [4, -7, -15]) if (Math.hypot(x - side, z - depth) <= 1.15) return false;
  return true;
}

function verifyRoute(from, to) {
  const route = walkway.route(from, to);
  assert(route && route.length >= 2, `${location}: route ${JSON.stringify(from)} → ${JSON.stringify(to)}`);
  assert.deepEqual(route[0], from);
  assert.deepEqual(route.at(-1), to);
  for (let segment = 1; segment < route.length; segment++) {
    const a = route[segment - 1], b = route[segment];
    assert(walkway.clear(a, b), `${location}: route segment is clear`);
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .03));
    for (let step = 0; step <= count; step++) {
      const t = step / count, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      assert(ground(location, x, z), `${location}: route crosses water, wall or planting at ${x},${z}`);
      sampledSteps++;
    }
  }
  checks++;
  return route;
}

const stations = {
  courtyard: [p(0, 14), p(-8.5, 16), p(8.5, 16), p(-3.2, 9.2), p(3.2, 9.2),
    ...[-8.5, -3.2, 3.2, 8.5].flatMap(x => [0, -11, -19.5].map(z => p(x, z))),
    ...[-6.4, 0, 6.4].map(x => p(x, -20.9))],
  passage: [p(0, 14), p(-4.2, 17.5), p(4.2, 17.5),
    ...[-3.4, 3.4].flatMap(x => [10.4, 0, -12, -23.5].map(z => p(x, z)))],
  pavilion: [p(0, 14), p(-8.2, 17.5), p(8.2, 17.5),
    ...[-6.5, 6.5].flatMap(x => [9.5, 0, -12, -24.5].map(z => p(x, z)))],
  coast: [p(15.2, 18), p(9.3, 10.3), p(15.7, 10.3), p(9.3, 18.7), p(15.7, 18.7), p(12.5, 12)],
};

for (const id of Object.keys(stations)) {
  location = id;
  const entry = p(...LOCATIONS[id].entry);
  check(walkway.allowed(entry.x, entry.z), `${id}: its own entry is on solid ground`);
  check(Object.isFrozen(LOCATIONS[id]) && Object.isFrozen(LOCATIONS[id].bounds), `${id}: shared geometry is immutable`);
  for (const from of stations[id]) for (const to of stations[id]) verifyRoute(from, to);
  for (let x = -10; x <= 17; x += .5) for (let z = -26; z <= 20; z += .5) {
    assert.equal(walkway.allowed(x, z), ground(id, x, z), `${id}: point ${x},${z}`);
  }
  checks++;
}

location = 'courtyard';
for (const [index, x] of [-6.4, 0, 6.4].entries()) {
  const approach = p(x, -20.9), from = p(0, 14);
  const route = verifyRoute(from, approach);
  check(route.every(node => node.z >= -21.2), `door ${index}: automatic approach stays in front of the rear wall`);
  check(route.length > 2, `door ${index}: approach goes around the central basin`);
  for (let step = 0; step <= 28; step++) {
    const z = -20.9 - step * .05;
    assert(walkway.allowed(x, z), `door ${index}: physical crossing remains on stone`);
    assert.equal(walkway.portalAt(x, z), z <= -22 ? index : null);
  }
  checks++;
  verifyRoute(p(x + .9, -21.5), from);
  verifyRoute(p(x, -22.3), approach);
  check(walkway.portalAt(x + 1, -22.2) === null, `door ${index}: arch edge does not accidentally trigger`);
}
check(!walkway.clear(p(-6.4, -22.3), p(0, -22.3)), 'different door sills cannot connect through the solid wall');
check(!walkway.allowed(3.2, -22) && !walkway.allowed(0, -23.1), 'rear wall and far side of doorway remain bounded');
check(!walkway.clear(p(-3.2, 0), p(3.2, 0)), 'a direct line cannot cross the courtyard pool');
check(!walkway.clear(p(-8, -7), p(-4, -7)), 'a direct line cannot cross a planting bed');
check(!walkway.clear(p(-3, 8), p(-2, 8.9)), 'an oblique corner clip cannot cross the waterline');
check(walkway.clear(p(-2.7, -18.8), p(2.7, -18.8)), 'walkway behind the pool remains open');

for (const id of ['passage', 'pavilion', 'coast']) {
  location = id;
  for (const x of [-6.4, 0, 6.4]) check(walkway.portalAt(x, -22.3) === null, `${id}: no invisible courtyard portal`);
}
location = 'coast';
check(!walkway.allowed(0, 14) && !walkway.allowed(12, 10) && !walkway.allowed(16, 16), 'coast cannot walk off the terrace into the lower pool or out of the building');
check(walkway.route(p(12, 16), p(0, 14)) === null, 'location switches do not invent a connecting route');
location = 'pavilion';
for (const boundary of [p(5.1, 0), p(-5.1, 0), p(0, 9.1), p(5, 9)]) {
  check(!walkway.allowed(boundary.x, boundary.z), 'pavilion: the visible waterline and its .2 m setback are excluded');
}
check(walkway.allowed(5.5, 0) && walkway.allowed(0, 9.5), 'pavilion: side and front margelles remain accessible outside the setback');

for (const id of Object.keys(LOCATIONS)) {
  location = id;
  const entry = p(...LOCATIONS[id].entry);
  for (const bad of [NaN, Infinity, -Infinity, undefined, null, '0']) {
    check(!walkway.allowed(bad, entry.z) && !walkway.allowed(entry.x, bad), `${id}: reject nonfinite or nonnumeric coordinates`);
    check(walkway.route(entry, p(bad, entry.z)) === null && !walkway.clear(entry, p(bad, entry.z)), `${id}: reject invalid destinations`);
  }
  for (const bad of [null, undefined, {}, [], {x: 0}]) {
    check(walkway.route(bad, entry) === null && !walkway.clear(bad, entry), `${id}: reject malformed points`);
  }
  const before = JSON.stringify(entry);
  verifyRoute(entry, entry);
  check(JSON.stringify(entry) === before, `${id}: caller coordinates are not mutated`);
}
location = 'toString';
check(walkway.allowed(0, 14), 'unknown scene identifier safely falls back to the courtyard');
check(createBrutalistWalkway().allowed(0, 14), 'factory works without a scene callback');
console.log(`PASS ${checks} brutalist navigation checks (${sampledSteps} independently sampled path points across four locations)`);
