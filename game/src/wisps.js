// PRISMBEND — wisps: the things in the fog.
//
// A wisp is born at the arena's edge, crawls toward the heart with a
// slight wobble so its path never looks mechanical, and bites the heart
// when it arrives. Spitters stop at range and spit gloom at prisms. The
// Herald, the boss of night 7, calls fresh wisps to its side while it
// crawls. This file owns their movement, their damage, and their deaths;
// the beam decides when they burn (beam.js), and the economy decides what
// a kill is worth (economy.js).
import { VIEW_W, VIEW_H, WISP_TYPES, HEART, hpScale, eliteChance } from './config.js';
import { registerKill } from './economy.js';
import { burst, floatText } from './particles.js';
import { dimPrism, prismById } from './prisms.js';

let nextWispId = 1;

// Build one wisp of a kind at a position, scaled to the night. Elites
// (night 5+) are tougher, faster and worth double.
export function makeWisp(kind, x, y, night, rng) {
  const def = WISP_TYPES[kind];
  const elite = rng.chance(eliteChance(night));
  const hp = Math.round(def.hp * hpScale(night) * (elite ? 1.6 : 1));
  return {
    id: nextWispId++,
    kind,
    x,
    y,
    hp,
    maxHp: hp,
    speed: def.speed * (elite ? 1.15 : 1) * rng.range(0.92, 1.08),
    r: def.r,
    score: def.score * (elite ? 2 : 1),
    shards: def.shards * (elite ? 2 : 1),
    damage: def.damage,
    elite,
    needsFocus: !!def.needsFocus,
    boss: !!def.boss,
    shoots: !!def.shoots,
    shootRange: def.shootRange || 0,
    shootTimer: rng.range(1.5, 3),
    callTimer: 6, // the Herald calls for help every few seconds.
    phase: rng.range(0, Math.PI * 2), // the wobble's phase.
    wobble: rng.range(0.5, 1.2), // how much it weaves.
    spawnIn: 0.45, // a telegraph: it fades in behind a portal ring.
    burnTimer: 0,
    lastPower: 1,
    immuneFlash: 0,
    flash: 0, // white flash on taking damage.
  };
}

// Pick an edge point outside the arena and put a wisp there.
export function spawnWispAtEdge(state, kind) {
  const side = state.rng.int(0, 3);
  const m = 26; // spawn just outside the visible floor.
  let x;
  let y;
  if (side === 0) { x = state.rng.range(0, VIEW_W); y = -m; }
  else if (side === 1) { x = VIEW_W + m; y = state.rng.range(0, VIEW_H); }
  else if (side === 2) { x = state.rng.range(0, VIEW_W); y = VIEW_H + m; }
  else { x = -m; y = state.rng.range(0, VIEW_H); }
  const wisp = makeWisp(kind, x, y, state.night, state.rng);
  state.wisps.push(wisp);
  return wisp;
}

// Move every wisp one step: fade in, wobble toward the heart, and bite it
// on arrival. Spitters hold at range and spit; the Herald calls for help.
export function updateWisps(state, dt) {
  for (const wisp of state.wisps) {
    if (wisp.flash > 0) wisp.flash -= dt;
    if (wisp.spawnIn > 0) {
      wisp.spawnIn -= dt;
      continue; // still fading in: it does not move or bite yet.
    }
    const dx = HEART.x - wisp.x;
    const dy = HEART.y - wisp.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    // A spitter holds its distance and shoots instead of closing in.
    if (wisp.shoots && dist < wisp.shootRange + 30 && dist > wisp.shootRange - 60) {
      wisp.shootTimer -= dt;
      if (wisp.shootTimer <= 0) {
        wisp.shootTimer = WISP_TYPES.spitter.shootInterval;
        spitGloom(state, wisp);
      }
    } else {
      // The wobble: a sine wave across the direction of travel, so the
      // crawl looks alive instead of drawn with a ruler.
      const px = -ny;
      const py = nx;
      const wob = Math.sin(state.time * 2.2 * wisp.wobble + wisp.phase) * 14;
      wisp.x += (nx * wisp.speed + px * wob) * dt;
      wisp.y += (ny * wisp.speed + py * wob) * dt;
    }

    // The Herald calls two wisps to its side every few seconds.
    if (wisp.boss) {
      wisp.callTimer -= dt;
      if (wisp.callTimer <= 0) {
        wisp.callTimer = 7;
        const kinds = state.night >= 5 ? ['wisp', 'swift', 'shade'] : ['wisp', 'swift'];
        for (let i = 0; i < 2; i++) {
          const escort = makeWisp(state.rng.pick(kinds), wisp.x + state.rng.range(-50, 50), wisp.y + state.rng.range(-50, 50), state.night, state.rng);
          escort.spawnIn = 0.3;
          state.wisps.push(escort);
        }
        floatText(state, wisp.x, wisp.y - wisp.r - 10, 'THE HERALD CALLS', '#d0a2ff', 13);
        state.audio.sfx('dim');
      }
    }

    // Arrived at the heart: bite it, burst, and die.
    if (dist <= HEART.r + wisp.r * 0.5) {
      state.heartHp = Math.max(0, state.heartHp - wisp.damage);
      burst(state, wisp.x, wisp.y, '#ff6b81', 14, 150, 0.5);
      floatText(state, HEART.x, HEART.y - 44, `-${wisp.damage}`, '#ff6b81', 16);
      state.audio.sfx('hurt');
      state.shake = Math.min(10, (state.shake || 0) + 5);
      wisp.hp = 0;
    }
  }
  state.wisps = state.wisps.filter((w) => w.hp > 0);
}

// Hurt a wisp. A kill pays out through the economy and bursts into light.
export function damageWisp(state, wisp, amount) {
  if (wisp.hp <= 0) return;
  wisp.hp -= amount;
  wisp.flash = 0.08;
  if (wisp.hp <= 0) {
    wisp.hp = 0;
    const def = WISP_TYPES[wisp.kind];
    burst(state, wisp.x, wisp.y, def.rim, wisp.boss ? 40 : 16, wisp.boss ? 260 : 170, 0.7);
    burst(state, wisp.x, wisp.y, '#ffd166', wisp.boss ? 20 : 8, 120, 0.5);
    registerKill(state, wisp);
    state.audio.sfx('kill');
  }
}

// A spitter's gloom orb: a slow purple blob that flies at the nearest
// prism and dims it on arrival. If no prism stands, the orb fizzles.
export function spitGloom(state, spitter) {
  if (state.prisms.length === 0) return;
  let best = null;
  let bd = Infinity;
  for (const p of state.prisms) {
    const d = (p.x - spitter.x) ** 2 + (p.y - spitter.y) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  if (!best) return;
  state.gloomOrbs.push({
    x: spitter.x,
    y: spitter.y,
    targetId: best.id,
    speed: 130,
    life: 6,
  });
  state.audio.sfx('dim');
}

// Fly every gloom orb toward its prism; on arrival, dim the prism.
export function updateGloomOrbs(state, dt) {
  for (const orb of state.gloomOrbs) {
    const prism = prismById(state, orb.targetId);
    if (!prism) {
      orb.life = 0; // its prism was sold: the orb fizzles.
      continue;
    }
    const dx = prism.x - orb.x;
    const dy = prism.y - orb.y;
    const dist = Math.hypot(dx, dy) || 1;
    const step = orb.speed * dt;
    if (dist <= step + 6) {
      dimPrism(prism);
      burst(state, prism.x, prism.y, '#8a6fd6', 12, 120, 0.5);
      floatText(state, prism.x, prism.y - 30, 'DIMMED!', '#d0a2ff', 13);
      state.audio.sfx('dim');
      orb.life = 0;
    } else {
      orb.x += (dx / dist) * step;
      orb.y += (dy / dist) * step;
      orb.life -= dt;
    }
  }
  state.gloomOrbs = state.gloomOrbs.filter((o) => o.life > 0);
}
