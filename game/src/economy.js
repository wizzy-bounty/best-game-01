// PRISMBEND — the economy: score, shards, combo and pickups.
//
// Shards are the game's currency: kills earn them, prisms spend them,
// selling refunds half. Score is what the leaderboard remembers: every
// kill pays its value times the combo multiplier, and the combo climbs
// with each kill inside the window, up to x8. Pickups are the windfalls:
// a spark heals the heart, a shard pays out score. Nothing here touches
// the network or storage except the best score, kept in localStorage.
import { COMBO_WINDOW, COMBO_MAX, PICKUPS } from './config.js';
import { burst, floatText } from './particles.js';

// A kill pays out: score times the combo, shards for the next prism, a
// longer combo window, and a roll for a pickup drop.
export function registerKill(state, wisp) {
  state.kills += 1;
  state.combo = Math.min(COMBO_MAX, state.combo + 1);
  state.comboTimer = COMBO_WINDOW;
  const gained = wisp.score * state.combo;
  state.score += gained;
  state.shards += wisp.shards;
  floatText(state, wisp.x, wisp.y - wisp.r - 6, `+${gained}`, '#ffd166', wisp.boss ? 20 : 15);
  if (wisp.boss) {
    floatText(state, wisp.x, wisp.y - wisp.r - 28, 'HERALD BURNED!', '#fff3c4', 18);
  }
  // A pickup drops from roughly one kill in five, alternating kinds.
  const roll = state.rng.next();
  if (roll < PICKUPS.spark.chance) {
    makePickup(state, 'spark', wisp.x, wisp.y);
  } else if (roll < PICKUPS.spark.chance + PICKUPS.shard.chance) {
    makePickup(state, 'shard', wisp.x, wisp.y);
  }
}

// Drop a pickup where a wisp died. It drifts gently until collected.
export function makePickup(state, kind, x, y) {
  state.pickups.push({
    kind,
    x: Math.max(30, Math.min(930, x)),
    y: Math.max(30, Math.min(510, y)),
    t: 0,
    life: 14, // it fades away after fourteen seconds, uncollected.
    phase: state.rng.range(0, Math.PI * 2),
  });
}

// Collect a pickup: a spark heals the heart, a shard pays out score.
export function collectPickup(state, pickup) {
  const def = PICKUPS[pickup.kind];
  if (pickup.kind === 'spark') {
    state.heartHp = Math.min(100, state.heartHp + def.heal);
  } else {
    state.score += def.score;
  }
  burst(state, pickup.x, pickup.y, def.color, 12, 130, 0.5);
  floatText(state, pickup.x, pickup.y - 18, def.label, def.color, 15);
  state.audio.sfx('pickup');
  state.pickups = state.pickups.filter((p) => p !== pickup);
}

// Tick the combo window and the pickups. A beam sweeping over a pickup
// collects it too — light collects light — so the player is never forced
// to chase a drop mid-wave.
export function updateEconomy(state, dt) {
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }
  for (const pickup of state.pickups) {
    pickup.t += dt;
    pickup.life -= dt;
    // A beam touching a pickup collects it without a click.
    for (const seg of state.beams) {
      const dx = seg.x2 - seg.x1;
      const dy = seg.y2 - seg.y1;
      const lenSq = dx * dx + dy * dy;
      let t = lenSq === 0 ? 0 : ((pickup.x - seg.x1) * dx + (pickup.y - seg.y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const cx = seg.x1 + t * dx;
      const cy = seg.y1 + t * dy;
      const ex = pickup.x - cx;
      const ey = pickup.y - cy;
      if (ex * ex + ey * ey <= (seg.width / 2 + 16) ** 2) {
        collectPickup(state, pickup);
        break;
      }
    }
  }
  state.pickups = state.pickups.filter((p) => p.life > 0);
}

// The best score, kept across runs in localStorage. Headless or private
// modes may refuse storage; the game plays on regardless.
export function loadBest() {
  try {
    return Number(window.localStorage.getItem('prismbend-best') || 0) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    window.localStorage.setItem('prismbend-best', String(score));
  } catch {
    // Storage refused: the run still counts, it just is not remembered.
  }
}
