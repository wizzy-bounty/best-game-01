// Nights and waves: what spawns, when, and what a cleared night earns.
import { buildNightPlan, nightName, NIGHTS, WAVES_PER_NIGHT } from './config.js';
import { spawnEnemyAtEdge, burst, floatText } from './entities.js';

export function startNight(state, night) {
  state.night = night;
  state.waves = buildNightPlan(night);
  state.waveIndex = 0;
  state.waveState = 'intro';
  state.waveTimer = 2.2;
  state.banner = { text: `NIGHT ${night} — ${nightName(night)}`, sub: 'Guard the ember. The fog is coming.', timer: 2.2 };
}

export function updateWaves(state, dt) {
  if (state.phase !== 'playing') return;
  if (state.waveState === 'intro') {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      state.waveState = 'spawning';
      state.banner = null;
    }
    return;
  }
  if (state.waveState === 'spawning') {
    const wave = state.waves[state.waveIndex];
    wave.timer -= dt;
    if (wave.spawned < wave.queue.length && wave.timer <= 0) {
      wave.timer = wave.interval;
      spawnEnemyAtEdge(state, wave.queue[wave.spawned]);
      wave.spawned += 1;
    }
    if (wave.spawned >= wave.queue.length) state.waveState = 'clearing';
    return;
  }
  // clearing: wait until every enemy of this wave is gone.
  if (state.waveState === 'clearing' && state.enemies.length === 0) {
    if (state.waveIndex + 1 < state.waves.length) {
      state.waveIndex += 1;
      state.waveState = 'intro';
      state.waveTimer = 1.6;
      state.banner = { text: `WAVE ${state.waveIndex + 1} OF ${WAVES_PER_NIGHT}`, sub: '', timer: 1.6 };
      state.score += 100;
      state.sfx.waveClear();
    } else {
      clearNight(state);
    }
  }
}

function clearNight(state) {
  const bonus = 500 + state.night * 250;
  state.score += bonus;
  state.heartHp = Math.min(100, state.heartHp + 15);
  floatText(state, 480, 200, `NIGHT BONUS +${bonus}`, '#ffd166', 22);
  burst(state, 480, 270, '#ffd166', 40, 260, 0.9);
  if (state.night >= NIGHTS) {
    state.phase = 'victory';
    state.endStats = snapshotStats(state);
    if (state.score > state.best) {
      state.best = state.score;
      try { localStorage.setItem('emberprism.best', String(state.best)); } catch { /* storage unavailable */ }
    }
    state.sfx.victory();
    return;
  }
  state.sfx.nightClear();
  startNight(state, state.night + 1);
}

export function snapshotStats(state) {
  return {
    score: state.score,
    kills: state.kills,
    nights: state.night,
    time: state.time,
    best: state.best,
  };
}

export function enemiesLeft(state) {
  // Shot scenes have no wave plan: count what is on the field.
  if (!state.waves) return state.enemies.length;
  let left = state.enemies.length;
  for (let i = state.waveIndex; i < state.waves.length; i++) {
    left += state.waves[i].queue.length - state.waves[i].spawned;
  }
  return left;
}
