// A tiny seeded random generator (mulberry32) so shot scenes and tests
// can replay the exact same layout, and the live game can seed from time.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    chance(p) {
      return next() < p;
    },
    angle() {
      return next() * Math.PI * 2;
    },
  };
}

// A point on the arena's edge, just outside the view, for spawning.
export function edgePoint(rng, margin = 24) {
  const side = rng.int(0, 3);
  const m = margin;
  if (side === 0) return { x: rng.range(0, 960), y: -m };
  if (side === 1) return { x: 960 + m, y: rng.range(0, 540) };
  if (side === 2) return { x: rng.range(0, 960), y: 540 + m };
  return { x: -m, y: rng.range(0, 540) };
}
