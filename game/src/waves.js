// PRISMBEND — nights and waves: the schedule the player survives.
//
// The game runs on a simple clock: a build phase (place prisms, the next
// wave is coming), then a wave (wisps dealt out over time), then a wave
// clear (bonus shards, a breath, the next build phase). Seven nights of
// three waves; clearing the last wave of night 7 wins the game. The wave
// plan for each night is built once from the run's seeded random, so the
// schedule is fixed the moment the night begins.
import {
  NIGHTS, WAVES_PER_NIGHT, BUILD_SECONDS, FIRST_BUILD_SECONDS,
  nightName, buildNightPlan,
} from './config.js';
import { spawnWispAtEdge } from './wisps.js';
import { ring, floatText } from './particles.js';
import { saveBest } from './economy.js';
import { HEART } from './config.js';

// Begin a night: build its three-wave plan and open a build phase. The
// first wave of the first night gets a longer build so a new player can
// read the board before anything crawls out of the fog.
export function startNight(state, night) {
  state.night = night;
  state.waveIndex = 0;
  state.waves = buildNightPlan(night, state.rng);
  state.waveActive = false;
  state.buildTimer = night === 1 ? FIRST_BUILD_SECONDS : BUILD_SECONDS;
  state.banner = {
    text: `NIGHT ${night} — ${nightName(night)}`,
    sub: night === 1
      ? 'Place prisms with the mouse. The beam burns what it touches.'
      : 'The fog thickens. Spend your shards.',
    timer: 3,
  };
  state.audio.sfx('wave');
}

// Open the next wave: deal its queue out over time. Called by the build
// timer running out, or by the player pressing Enter early.
export function startWave(state) {
  if (state.waveActive) return;
  state.waveActive = true;
  state.buildTimer = 0;
  const wave = state.waves[state.waveIndex];
  wave.spawned = 0;
  wave.timer = 1.0;
  state.banner = {
    text: `WAVE ${state.waveIndex + 1} OF ${WAVES_PER_NIGHT}`,
    sub: `${wave.queue.length} wisps crawl out of the fog.`,
    timer: 2.2,
  };
  state.audio.sfx('wave');
}

// One frame of the schedule. During a build phase the timer counts down
// and the wave starts itself. During a wave, wisps are dealt out; when
// the queue is empty and the field is clear, the wave is won.
export function updateWaves(state, dt) {
  if (state.phase !== 'playing') return;

  if (!state.waveActive) {
    state.buildTimer -= dt;
    if (state.buildTimer <= 0) startWave(state);
    return;
  }

  const wave = state.waves[state.waveIndex];
  if (wave.spawned < wave.queue.length) {
    wave.timer -= dt;
    if (wave.timer <= 0) {
      wave.timer = wave.interval;
      spawnWispAtEdge(state, wave.queue[wave.spawned]);
      wave.spawned += 1;
    }
  } else if (state.wisps.length === 0 && state.gloomOrbs.length === 0) {
    // The wave is clear: pay the bonus, ring the heart, move on.
    const bonus = 25 + state.night * 10;
    state.shards += bonus;
    state.score += 100 * state.night;
    ring(state, HEART.x, HEART.y, '#7ef0d4', 260);
    floatText(state, HEART.x, HEART.y - 56, `WAVE CLEAR +${bonus} SHARDS`, '#7ef0d4', 16);
    state.audio.sfx('clear');
    state.waveActive = false;
    state.waveIndex += 1;
    if (state.waveIndex >= WAVES_PER_NIGHT) {
      // The night is done. The next night, or the victory screen.
      if (state.night >= NIGHTS) {
        winGame(state);
      } else {
        startNight(state, state.night + 1);
      }
    } else {
      state.buildTimer = BUILD_SECONDS;
      state.banner = {
        text: 'BUILD — THE NEXT WAVE COMES',
        sub: 'Place, rotate and sell prisms. Press Enter to start early.',
        timer: 2.2,
      };
    }
  }
}

// The win: the Herald is ash, the seventh night is over. The victory
// screen shows the run's numbers and the best score is saved.
export function winGame(state) {
  state.phase = 'victory';
  state.endAt = state.time;
  state.endStats = {
    score: state.score,
    kills: state.kills,
    nights: NIGHTS,
    time: Math.round(state.time),
    best: Math.max(state.best, state.score),
  };
  state.best = state.endStats.best;
  saveBest(state.best);
  state.audio.sfx('win');
  ring(state, HEART.x, HEART.y, '#ffd166', 320);
}

// The loss: the heart is snuffed out. The game-over screen shows the
// run's numbers and how far it got.
export function loseGame(state) {
  state.phase = 'gameover';
  state.endAt = state.time;
  state.endStats = {
    score: state.score,
    kills: state.kills,
    nights: state.night,
    time: Math.round(state.time),
    best: Math.max(state.best, state.score),
  };
  state.best = state.endStats.best;
  saveBest(state.best);
  state.audio.sfx('lose');
}
