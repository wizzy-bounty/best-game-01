// PRISMBEND — a small seeded random number generator.
//
// The whole game runs on one seeded stream (mulberry32) so a screenshot
// scene, a replay and a wave plan all come out the same way from the same
// seed. Nothing in the game calls Math.random during play; Math.random is
// only used once, at boot, to seed a live run from the clock.
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

// A tiny wrapper around the raw stream with the helpers the game uses.
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    // A float in [0, 1).
    next,
    // A float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // An integer in [min, max] inclusive.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // One element of an array, uniformly.
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // True with probability p.
    chance(p) {
      return next() < p;
    },
  };
}
