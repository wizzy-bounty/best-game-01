// PRISMBEND — the entry point: state, loop, input, and the shot hook.
//
// This file wires the game together. It builds the state, runs the frame
// loop, turns mouse clicks and key taps into game actions, and exposes a
// small `window.__game.state()` snapshot the playtest scripts read. The
// rules themselves live in the other files: prisms.js places glass,
// beam.js traces light, wisps.js crawls the fog, waves.js keeps the
// schedule, economy.js pays for kills, render.js draws the world, and
// hud.js draws the screens on top of it.
//
// A run starts on the title screen. Clicking or pressing Enter begins
// night 1 with a build phase; waves follow; the seventh night's last wave
// brings the Night Herald, and burning it wins the game. If the heart's
// health reaches zero, the fog wins, and R starts a fresh run.
import {
  VIEW_W, VIEW_H, HEART, START_SHARDS, BEAM, NIGHTS,
  PRISM_TYPES, PRISM_ORDER,
} from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { pointToCell, isFreeCell } from './grid.js';
import {
  placePrism, rotatePrism, sellPrism, cleansePrism, prismAt, prismById, updatePrisms,
} from './prisms.js';
import { traceBeams, burnWisps } from './beam.js';
import { updateWisps, updateGloomOrbs } from './wisps.js';
import { startNight, startWave, updateWaves, loseGame } from './waves.js';
import { collectPickup, updateEconomy, loadBest } from './economy.js';
import { updateParticles } from './particles.js';
import { drawWorld } from './render.js';
import { drawHud, drawTitle, drawPaused, drawGameOver, drawVictory, drawToast } from './hud.js';
import { applyShot } from './shots.js';

// ------------------------------------------------------------- state -------
function createState(seed) {
  const rng = makeRng(seed);
  const state = {
    seed,
    rng,
    time: 0,
    phase: 'title', // title | playing | paused | gameover | victory
    night: 1,
    waveIndex: 0,
    waves: [],
    waveActive: false,
    buildTimer: 0,
    score: 0,
    best: loadBest(),
    kills: 0,
    shards: START_SHARDS,
    combo: 0,
    comboTimer: 0,
    heartHp: HEART.maxHp,
    aimAngle: -Math.PI / 2, // the beam starts pointing straight up.
    selectedKind: 'mirror',
    selectedPrismId: null,
    hoverCell: null,
    hoverValid: false,
    prisms: [],
    wisps: [],
    gloomOrbs: [],
    pickups: [],
    particles: [],
    floats: [],
    beams: [],
    surge: { active: false, timer: 0, cooldown: 0 },
    banner: null,
    toast: null,
    endStats: null,
    endAt: 0,
    shake: 0,
    audio: createAudio(),
    input: null,
    stars: [],
    motes: [],
  };

  // Stars that never move, and fog motes that drift: seeded once, so a
  // screenshot of the same seed shows the same sky.
  for (let i = 0; i < 70; i++) {
    state.stars.push({
      x: rng.range(0, VIEW_W),
      y: rng.range(0, VIEW_H),
      size: rng.range(1, 2.4),
      tw: rng.range(0.5, 2),
      ph: rng.range(0, Math.PI * 2),
    });
  }
  for (let i = 0; i < 16; i++) {
    state.motes.push({
      x: rng.range(-60, VIEW_W + 60),
      y: rng.range(0, VIEW_H),
      r: rng.range(50, 110),
      drift: rng.range(2, 7),
      ph: rng.range(0, Math.PI * 2),
      color: rng.pick(['rgba(90, 60, 160, 0.12)', 'rgba(60, 40, 130, 0.10)', 'rgba(120, 80, 190, 0.09)']),
    });
  }
  return state;
}

// Reset the run and open night 1. The stars and motes stay: the sky does
// not change because the player lost.
function startGame(state) {
  state.time = 0;
  state.phase = 'playing';
  state.score = 0;
  state.kills = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.shards = START_SHARDS;
  state.heartHp = HEART.maxHp;
  state.aimAngle = -Math.PI / 2;
  state.selectedKind = 'mirror';
  state.selectedPrismId = null;
  state.prisms = [];
  state.wisps = [];
  state.gloomOrbs = [];
  state.pickups = [];
  state.particles = [];
  state.floats = [];
  state.beams = [];
  state.surge = { active: false, timer: 0, cooldown: 0 };
  state.banner = null;
  state.toast = null;
  state.endStats = null;
  state.shake = 0;
  startNight(state, 1);
}

// -------------------------------------------------------------- input ------
// A left click, in view coordinates. What it does depends on the phase
// and on what is under the cursor: a pickup, a prism, or an empty cell.
function onLeftClick(state, x, y) {
  state.audio.ensure();
  state.audio.startAmbient();
  if (state.phase === 'title') {
    startGame(state);
    return;
  }
  if ((state.phase === 'gameover' || state.phase === 'victory') && state.time - state.endAt > 0.8) {
    startGame(state);
    return;
  }
  if (state.phase !== 'playing') return;

  // A pickup first: a generous radius, so collecting feels forgiving.
  for (const pickup of state.pickups) {
    if ((pickup.x - x) ** 2 + (pickup.y - y) ** 2 <= 34 ** 2) {
      collectPickup(state, pickup);
      return;
    }
  }

  const cell = pointToCell(x, y);
  if (!cell) return;
  const prism = prismAt(state, cell.col, cell.row);
  if (prism) {
    if (prism.dimmed) {
      cleansePrism(prism);
      state.audio.sfx('cleanse');
      return;
    }
    if (state.selectedPrismId === prism.id) {
      if (rotatePrism(prism)) state.audio.sfx('rotate');
    } else {
      state.selectedPrismId = prism.id;
    }
    return;
  }

  const res = placePrism(state, state.selectedKind, cell.col, cell.row);
  if (res.ok) {
    state.audio.sfx('place');
  } else {
    state.toast = { text: res.reason, timer: 1.6 };
    state.audio.sfx('error');
  }
}

// A right click: sell the prism under the cursor, or deselect.
function onRightClick(state, x, y) {
  if (state.phase !== 'playing') return;
  const cell = pointToCell(x, y);
  if (!cell) return;
  const prism = prismAt(state, cell.col, cell.row);
  if (prism) {
    const refund = sellPrism(state, prism);
    state.audio.sfx('sell');
    state.toast = { text: `Sold for ◆ ${refund}`, timer: 1.2 };
  } else {
    state.selectedPrismId = null;
  }
}

// Key taps, read once per frame from the input queue.
function onKeys(state) {
  const input = state.input;
  if (input.wasPressed('Digit1')) state.selectedKind = 'mirror';
  if (input.wasPressed('Digit2')) state.selectedKind = 'splitter';
  if (input.wasPressed('Digit3')) state.selectedKind = 'lens';

  if (input.wasPressed('KeyR')) {
    const prism = prismById(state, state.selectedPrismId);
    if (prism && rotatePrism(prism)) state.audio.sfx('rotate');
  }
  if (input.wasPressed('Escape')) state.selectedPrismId = null;

  if (input.wasPressed('KeyM')) {
    state.audio.setMuted(!state.audio.muted);
  }

  if (input.wasPressed('Space')) {
    state.audio.ensure();
    if (state.phase === 'playing') fireSurge(state);
  }

  if (input.wasPressed('Enter')) {
    state.audio.ensure();
    state.audio.startAmbient();
    if (state.phase === 'title') startGame(state);
    else if (state.phase === 'playing' && !state.waveActive) startWave(state);
    else if (state.phase === 'gameover' || state.phase === 'victory') startGame(state);
  }

  if (input.wasPressed('KeyP')) {
    if (state.phase === 'playing') state.phase = 'paused';
    else if (state.phase === 'paused') state.phase = 'playing';
  }

  // R restarts from an end screen, or from a pause.
  if (input.wasPressed('KeyR') && (state.phase === 'gameover' || state.phase === 'victory' || state.phase === 'paused')) {
    startGame(state);
  }
}

// The surge: three seconds of triple burn and wider beams, then a
// cooldown. Only when it is ready; the HUD shows the gauge.
function fireSurge(state) {
  if (state.surge.active || state.surge.cooldown > 0) return;
  state.surge.active = true;
  state.surge.timer = BEAM.surgeSeconds;
  state.audio.sfx('surge');
}

// ------------------------------------------------------------- update ------
// One frame of the game, in the order the systems depend on each other:
// the schedule first, then movement, then the beam, then the burn, then
// the economy and the cosmetics.
function update(state, dt) {
  state.time += dt;

  // The title screen's beam sweeps slowly on its own, so the backdrop
  // behind the panel is alive rather than a still image.
  if (state.phase === 'title') {
    state.aimAngle = state.time * 0.12;
    traceBeams(state);
    updateParticles(state, dt);
    return;
  }
  if (state.phase !== 'playing') {
    updateParticles(state, dt);
    return;
  }

  // The mouse aims the beam; the arrow keys nudge it for keyboard play.
  const input = state.input;
  if (input.mouse.inside) {
    state.aimAngle = Math.atan2(input.mouse.y - HEART.y, input.mouse.x - HEART.x);
  }
  if (input.isDown('ArrowLeft')) state.aimAngle -= 2.4 * dt;
  if (input.isDown('ArrowRight')) state.aimAngle += 2.4 * dt;

  // The hover cell, for the placement highlight.
  const cell = pointToCell(input.mouse.x, input.mouse.y);
  state.hoverCell = cell;
  state.hoverValid = cell ? isFreeCell(state, cell.col, cell.row) : false;

  // The surge clock.
  if (state.surge.active) {
    state.surge.timer -= dt;
    if (state.surge.timer <= 0) {
      state.surge.active = false;
      state.surge.cooldown = BEAM.surgeCooldown;
    }
  } else if (state.surge.cooldown > 0) {
    state.surge.cooldown -= dt;
  }

  updateWaves(state, dt);
  updateWisps(state, dt);
  updateGloomOrbs(state, dt);
  traceBeams(state);
  burnWisps(state, dt);
  updateEconomy(state, dt);
  updatePrisms(state, dt);
  updateParticles(state, dt);

  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
  if (state.banner && state.banner.timer > 0) state.banner.timer -= dt;
  if (state.toast && state.toast.timer > 0) state.toast.timer -= dt;

  // The heart is snuffed out: the fog wins.
  if (state.heartHp <= 0 && state.phase === 'playing') {
    state.endAt = state.time;
    loseGame(state);
  }
  // Victory sets the phase itself, inside updateWaves.
  if (state.phase === 'victory' && !state.endAt) state.endAt = state.time;
}

// ------------------------------------------------------------- render ------
function render(ctx, state) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawWorld(ctx, state);
  if (state.phase === 'playing' || state.phase === 'paused') {
    drawHud(ctx, state);
    drawToast(ctx, state);
    if (state.phase === 'paused') drawPaused(ctx, state);
  } else if (state.phase === 'title') {
    drawTitle(ctx, state);
  } else if (state.phase === 'gameover') {
    drawGameOver(ctx, state);
  } else if (state.phase === 'victory') {
    drawVictory(ctx, state);
  }
}

// ------------------------------------------------------- playtest hook -----
// A plain snapshot for scripted playtests: no functions, no cycles.
function snapshot(state) {
  return {
    phase: state.phase,
    time: Math.round(state.time * 10) / 10,
    score: state.score,
    kills: state.kills,
    night: state.night,
    wave: state.waveIndex + 1,
    waveActive: state.waveActive,
    buildTimer: Math.max(0, Math.ceil(state.buildTimer)),
    heartHp: state.heartHp,
    shards: state.shards,
    combo: state.combo,
    surgeActive: state.surge.active,
    surgeCooldown: Math.max(0, Math.ceil(state.surge.cooldown)),
    prisms: state.prisms.map((p) => ({ kind: p.kind, col: p.col, row: p.row, x: p.x, y: p.y, dimmed: p.dimmed })),
    foes: state.wisps.map((w) => ({ kind: w.kind, x: Math.round(w.x), y: Math.round(w.y), hp: Math.round(w.hp) })),
    beams: state.beams.length,
    aimAngle: state.aimAngle,
    selectedKind: state.selectedKind,
    best: state.best,
  };
}

// ---------------------------------------------------------------- boot -----
const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shotScene = params.get('shot');
const seed = Number(params.get('seed') || '11') || 11;
const state = createState(seed);
state.input = createInput(canvas);

// A shot scene is a fixed frame: build it, draw it once, and tell the
// screenshot tool the frame is ready. No loop runs in shot mode.
if (shotScene) {
  applyShot(state, shotScene);
  render(ctx, state);
  window.__shotReady = true;
  window.__game = { state: () => snapshot(state) };
} else {
  // The live game: clicks, keys, and a clamped frame loop.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.phase === 'playing') state.phase = 'paused';
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;

    const input = state.input;
    for (const click of input.leftClicks) onLeftClick(state, click.x, click.y);
    for (const click of input.rightClicks) onRightClick(state, click.x, click.y);

    onKeys(state);
    update(state, dt);
    render(ctx, state);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  window.__game = { state: () => snapshot(state) };
  window.__shotReady = false;
  requestAnimationFrame(frame);
}
