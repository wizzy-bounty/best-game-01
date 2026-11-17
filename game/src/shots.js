// PRISMBEND — deterministic shot scenes for screenshots.
//
// ?shot=title|play|boss|victory&seed=N renders one fixed frame of the
// game's own code and sets window.__shotReady, so the screenshot tool can
// capture it. Nothing here is a mock: every scene is a real game state —
// prisms placed through the same placePrism the player uses, beams traced
// by the same tracer, wisps built by the same constructor — at a fixed
// simulated time, from the scene's seeded random.
//
// The prisms are laid by walking the beam itself: step along the ray,
// drop a prism in the first free cell far enough along, bend the walk
// with the mirror's reflection, and keep going. The network a shot shows
// is therefore a network the game could really have built.
import { makeWisp } from './wisps.js';
import { placePrism, rotatePrism } from './prisms.js';
import { traceBeams } from './beam.js';
import { pointToCell, isFreeCell } from './grid.js';
import { burst, floatText } from './particles.js';
import { makePickup as dropPickup } from './economy.js';

// Place one prism of each kind along the beam itself: trace the network,
// take its longest segment, and drop the prism in the first free cell at
// least 100 px along that segment, then re-trace — so every prism the
// shot shows is a prism the beam really passes through, and the network
// grows a bend or a fork with each kind. (The old walk-along-the-ray
// version died after two legs whenever the reflected ray left the arena
// before finding a third free cell.)
function layPrismsAlongBeam(state, kinds) {
  for (const kind of kinds) {
    traceBeams(state);
    const segs = [...state.beams].sort((a, b) => {
      const la = Math.hypot(a.x2 - a.x1, a.y2 - a.y1);
      const lb = Math.hypot(b.x2 - b.x1, b.y2 - b.y1);
      return lb - la;
    });
    let placed = false;
    for (const seg of segs) {
      const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
      if (len < 130) continue;
      for (let d = 100; d < len - 10; d += 6) {
        const t = d / len;
        const x = seg.x1 + (seg.x2 - seg.x1) * t;
        const y = seg.y1 + (seg.y2 - seg.y1) * t;
        const cell = pointToCell(x, y);
        if (!cell) break;
        if (!isFreeCell(state, cell.col, cell.row)) continue;
        const res = placePrism(state, kind, cell.col, cell.row);
        if (!res.ok) break;
        const prism = res.prism;
        if (state.rng.chance(0.5)) rotatePrism(prism);
        placed = true;
        break;
      }
      if (placed) break;
    }
    if (!placed) break;
  }
}

// Put a wisp of a kind on the state, already burning if it stands in a
// beam: the shot shows the burn as the player would see it mid-wave.
function placeWisp(state, kind, x, y, inBeam = false) {
  const wisp = makeWisp(kind, x, y, state.night, state.rng);
  wisp.spawnIn = 0;
  if (inBeam) {
    wisp.burnTimer = 0.5;
    wisp.flash = 0.05;
  }
  state.wisps.push(wisp);
  return wisp;
}

// A point a fraction t along a beam segment, nudged off the line so the
// wisp sits visibly inside the glow rather than dead on the core.
function pointOnSegment(seg, t, off = 4) {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: seg.x1 + dx * t + (-dy / len) * off,
    y: seg.y1 + dy * t + (dx / len) * off,
  };
}

export function applyShot(state, scene) {
  state.time = 1.234; // fixed simulated time: the frame never changes.
  state.phase = 'playing';
  state.banner = null;
  state.shards = 999; // shots place prisms freely; the count is set below.
  state.aimAngle = -0.5;

  if (scene === 'title') {
    state.phase = 'title';
    state.best = 12500;
    // The world rests behind the title panel: a glowing beam network and
    // the heart, no wisps peeking out from under the panel.
    // (state.shards is 999 while prisms are laid, so every kind fits;
    // the display value is set after the network stands.)
    layPrismsAlongBeam(state, ['mirror', 'splitter', 'lens', 'mirror']);
    traceBeams(state);
    state.shards = 60;
    return;
  }

  if (scene === 'play') {
    state.night = 3;
    state.waveIndex = 1;
    state.score = 4850;
    state.best = 12500;
    state.combo = 4;
    state.comboTimer = 1.8;
    state.heartHp = 78;
    state.kills = 41;
    state.waveActive = true;
    layPrismsAlongBeam(state, ['mirror', 'splitter', 'lens', 'mirror', 'splitter']);
    traceBeams(state);
    state.shards = 120;
    // Wisps caught in the beams, burning, and wisps closing in from
    // every side: the frame is busy at every scale.
    const segs = state.beams;
    const p1 = pointOnSegment(segs[0], 0.55);
    placeWisp(state, 'wisp', p1.x, p1.y, true);
    const p2 = pointOnSegment(segs[Math.min(1, segs.length - 1)], 0.6);
    placeWisp(state, 'swift', p2.x, p2.y, true);
    const p3 = pointOnSegment(segs[Math.min(2, segs.length - 1)], 0.5);
    placeWisp(state, 'brute', p3.x, p3.y, true);
    placeWisp(state, 'wisp', 620, 180);
    placeWisp(state, 'wisp', 700, 330);
    placeWisp(state, 'swift', 560, 420);
    placeWisp(state, 'swift', 300, 150);
    placeWisp(state, 'brute', 780, 220);
    placeWisp(state, 'wisp', 180, 260);
    placeWisp(state, 'spitter', 850, 430);
    placeWisp(state, 'wisp', 420, 90);
    placeWisp(state, 'swift', 880, 300);
    placeWisp(state, 'wisp', 250, 460);
    burst(state, 620, 180, '#8b7bff', 14, 160, 0.6);
    burst(state, 700, 330, '#ff7ad9', 10, 140, 0.5);
    burst(state, 780, 220, '#7fb2ff', 12, 150, 0.5);
    floatText(state, 620, 150, '+100', '#ffd166', 16);
    floatText(state, 700, 300, '+150 x4', '#ffd166', 16);
    dropPickup(state, 'spark', 540, 430);
    dropPickup(state, 'shard', 420, 320);
    return;
  }

  if (scene === 'boss') {
    state.night = 7;
    state.waveIndex = 2;
    state.score = 18200;
    state.best = 21400;
    state.combo = 6;
    state.comboTimer = 2.1;
    state.heartHp = 54;
    state.kills = 168;
    state.waveActive = true;
    // The surge is burning: every beam is wider and hotter, and the
    // frame is at its brightest.
    state.surge.active = true;
    state.surge.timer = 1.8;
    state.aimAngle = -0.35;
    layPrismsAlongBeam(state, ['lens', 'splitter', 'mirror', 'lens', 'mirror', 'splitter']);
    traceBeams(state);
    state.shards = 210;
    const herald = placeWisp(state, 'herald', 640, 240);
    herald.hp = 62;
    herald.burnTimer = 0.5;
    const segs = state.beams;
    const p1 = pointOnSegment(segs[0], 0.5);
    placeWisp(state, 'shade', p1.x, p1.y, true);
    placeWisp(state, 'wisp', 870, 130);
    placeWisp(state, 'wisp', 580, 340);
    placeWisp(state, 'swift', 760, 330);
    placeWisp(state, 'brute', 520, 130);
    placeWisp(state, 'spitter', 840, 200);
    placeWisp(state, 'brute', 840, 380);
    placeWisp(state, 'swift', 430, 110);
    placeWisp(state, 'shade', 300, 200);
    burst(state, 640, 240, '#ffd166', 22, 200, 0.7);
    burst(state, 520, 130, '#7fb2ff', 12, 150, 0.5);
    burst(state, 840, 380, '#7fb2ff', 12, 150, 0.5);
    floatText(state, 770, 150, '+300', '#ffd166', 18);
    floatText(state, 580, 380, '+150 x6', '#ffd166', 16);
    dropPickup(state, 'spark', 420, 470);
    dropPickup(state, 'shard', 700, 430);
    return;
  }

  if (scene === 'victory') {
    state.phase = 'victory';
    state.night = 7;
    state.score = 24750;
    state.kills = 214;
    state.best = 24750;
    state.endStats = { score: 24750, kills: 214, nights: 7, time: 582, best: 24750 };
    state.heartHp = 64;
    // The world rests behind the victory panel: the beam network still
    // shining, and bursts of light where the last wisps burned.
    layPrismsAlongBeam(state, ['mirror', 'splitter', 'lens', 'mirror']);
    traceBeams(state);
    state.shards = 340;
    burst(state, 480, 270, '#ffd166', 40, 260, 0.9);
    burst(state, 380, 320, '#7ef0d4', 24, 200, 0.8);
    burst(state, 580, 320, '#ff9f43', 24, 200, 0.8);
    return;
  }

  // Unknown scene: fall back to the play scene.
  applyShot(state, 'play');
}

export const SHOT_SCENES = ['title', 'play', 'boss', 'victory'];
