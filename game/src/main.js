// EMBERPRISM — guard the last ember through seven nights.
// Bootstrap, the fixed-step loop, the state machine, collisions and scoring.
// Rendering lives in render.js, entities in entities.js, waves in waves.js.
import { VIEW_W, VIEW_H, HEART, PLAYER, COMBO_WINDOW, ENEMY_TYPES, PICKUPS } from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { ensureAudio, toggleMute, startPad, stopPad, sfx, isMuted } from './audio.js';
import {
  makePlayer, makeEnemy, burst, floatText, maybeDropPickup,
  updatePlayer, updateEnemies, updateBullets, updateParticles,
  updateFloats, updatePickups,
} from './entities.js';
import { startNight, updateWaves, snapshotStats } from './waves.js';
import { drawGame } from './render.js';
import { applyShot } from './shots.js';

const STEP = 1 / 60;

function loadBest() {
  try {
    return Number(localStorage.getItem('emberprism.best') || 0) || 0;
  } catch {
    return 0;
  }
}

export function createState(seed) {
  const rng = makeRng(seed);
  const stars = [];
  for (let i = 0; i < 90; i++) {
    stars.push({ x: rng.range(0, VIEW_W), y: rng.range(0, VIEW_H), r: rng.range(1, 2.4), a: rng.range(0.3, 0.9), tw: rng.range(0.5, 2), ph: rng.range(0, Math.PI * 2) });
  }
  const fog = [];
  for (let i = 0; i < 6; i++) {
    fog.push({ x: rng.range(0, VIEW_W), y: rng.range(40, VIEW_H - 40), rx: rng.range(120, 220), ry: rng.range(26, 54), speed: rng.range(4, 12), a: rng.range(0.16, 0.3) });
  }
  // Ember motes: faint glowing dots on the arena floor, seeded like the
  // stars so every render of the same seed matches.
  const motes = [];
  for (let i = 0; i < 42; i++) {
    motes.push({ x: rng.range(20, VIEW_W - 20), y: rng.range(70, VIEW_H - 20), r: rng.range(1, 2.2), a: rng.range(0.25, 0.7), tw: rng.range(0.6, 1.8), ph: rng.range(0, Math.PI * 2) });
  }
  return {
    rng,
    seed,
    phase: 'title',
    time: 0,
    playTime: 0,
    score: 0,
    best: loadBest(),
    kills: 0,
    combo: 0,
    comboTimer: 0,
    night: 1,
    waveIndex: 0,
    waves: null,
    waveState: 'intro',
    waveTimer: 0,
    heartHp: HEART.maxHp,
    player: makePlayer(),
    enemies: [],
    bullets: [],
    ebullets: [],
    particles: [],
    floats: [],
    pickups: [],
    stars,
    fog,
    motes,
    banner: null,
    shake: 0,
    endStats: null,
    sfx,
    muted: isMuted(),
  };
}

function startGame(state) {
  const best = state.best;
  const fresh = createState((Math.random() * 0xffffffff) >>> 0);
  Object.assign(state, fresh);
  state.best = best;
  state.phase = 'playing';
  ensureAudio();
  startPad();
  startNight(state, 1);
  sfx.click();
}

function endGame(state, won) {
  state.phase = won ? 'victory' : 'gameover';
  state.endStats = snapshotStats(state);
  if (state.score > state.best) {
    state.best = state.score;
    try { localStorage.setItem('emberprism.best', String(state.best)); } catch { /* storage unavailable */ }
  }
  if (won) sfx.victory();
  else sfx.gameOver();
  stopPad();
}

// --- collisions ---------------------------------------------------------

function collideBulletsWithEnemies(state) {
  for (const b of state.bullets) {
    for (const e of state.enemies) {
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      const rr = e.r + b.r;
      if (dx * dx + dy * dy > rr * rr) continue;
      b.life = 0;
      e.hp -= b.damage;
      e.flash = 0.12;
      e.knockX += b.vx * 0.35;
      e.knockY += b.vy * 0.35;
      burst(state, b.x, b.y, '#ffe9a8', 4, 90, 0.3);
      state.sfx.hit();
      if (e.hp <= 0) killEnemy(state, e);
      break;
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
}

function killEnemy(state, e) {
  const idx = state.enemies.indexOf(e);
  if (idx === -1) return;
  state.enemies.splice(idx, 1);
  state.kills += 1;
  // Combo: each kill inside the window raises the multiplier, to x8.
  if (state.comboTimer > 0) state.combo = Math.min(state.combo + 1, 8);
  else state.combo = 1;
  state.comboTimer = COMBO_WINDOW;
  const gained = e.score * state.combo;
  state.score += gained;
  floatText(state, e.x, e.y - e.r - 6, `+${gained}`, '#ffd166', e.type === 'herald' ? 22 : 15);
  const def = ENEMY_TYPES[e.type];
  burst(state, e.x, e.y, def.rim, e.type === 'herald' ? 46 : 18, e.type === 'brute' ? 220 : 170, 0.7);
  burst(state, e.x, e.y, '#ffffff', 6, 120, 0.4);
  state.sfx.kill(e.type === 'brute' || e.type === 'herald');
  if (e.type === 'herald') state.shake = Math.max(state.shake, 0.9);
  maybeDropPickup(state, e.x, e.y);
}

function collideEnemiesWithHeart(state) {
  for (const e of [...state.enemies]) {
    const dx = e.x - HEART.x;
    const dy = e.y - HEART.y;
    const rr = HEART.r + e.r - 4;
    if (dx * dx + dy * dy > rr * rr) continue;
    state.enemies.splice(state.enemies.indexOf(e), 1);
    state.heartHp -= e.damage;
    state.combo = 0;
    state.comboTimer = 0;
    state.shake = Math.max(state.shake, 0.7);
    burst(state, e.x, e.y, '#ff6b35', 26, 240, 0.8);
    floatText(state, HEART.x, HEART.y - 70, `-${e.damage} EMBER`, '#ff6b81', 18);
    state.sfx.heartHurt();
    if (state.heartHp <= 0) {
      state.heartHp = 0;
      burst(state, HEART.x, HEART.y, '#ff6b35', 60, 320, 1.1);
      endGame(state, false);
    }
  }
}

function collideEnemyShots(state) {
  const p = state.player;
  for (const b of state.ebullets) {
    // Against the player.
    if (p.alive && p.invuln <= 0) {
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const rr = p.r + b.r;
      if (dx * dx + dy * dy <= rr * rr) {
        b.life = 0;
        hurtPlayer(state, 1);
        continue;
      }
    }
    // Against the heart.
    const dx = b.x - HEART.x;
    const dy = b.y - HEART.y;
    const rr = HEART.r + b.r;
    if (dx * dx + dy * dy <= rr * rr) {
      b.life = 0;
      state.heartHp -= b.damage;
      state.shake = Math.max(state.shake, 0.4);
      burst(state, b.x, b.y, '#c084fc', 10, 140, 0.5);
      state.sfx.heartHurt();
      if (state.heartHp <= 0) {
        state.heartHp = 0;
        endGame(state, false);
      }
    }
  }
  state.ebullets = state.ebullets.filter((b) => b.life > 0);
}

function collidePlayerWithEnemies(state) {
  const p = state.player;
  if (!p.alive || p.invuln > 0) return;
  for (const e of [...state.enemies]) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const rr = p.r + e.r;
    if (dx * dx + dy * dy > rr * rr) continue;
    e.hp -= 2;
    e.flash = 0.12;
    const d = Math.hypot(dx, dy) || 1;
    e.knockX += (dx / d) * 260;
    e.knockY += (dy / d) * 260;
    if (e.hp <= 0) killEnemy(state, e);
    hurtPlayer(state, 1);
    break;
  }
}

function hurtPlayer(state, amount) {
  const p = state.player;
  p.hp -= amount;
  p.invuln = 1.2;
  state.shake = Math.max(state.shake, 0.5);
  burst(state, p.x, p.y, '#ff6b81', 18, 200, 0.6);
  state.sfx.playerHurt();
  if (p.hp <= 0) {
    p.alive = false;
    p.respawnTimer = PLAYER.respawnDelay;
    state.heartHp = Math.max(0, state.heartHp - 10);
    floatText(state, HEART.x, HEART.y - 70, 'WARDEN DOWN −10 EMBER', '#ff6b81', 17);
    burst(state, p.x, p.y, '#7ef0d4', 30, 260, 0.8);
    if (state.heartHp <= 0) endGame(state, false);
  }
}

function collidePlayerWithPickups(state) {
  const p = state.player;
  if (!p.alive) return;
  for (const pk of [...state.pickups]) {
    const dx = p.x - pk.x;
    const dy = p.y - pk.y;
    const rr = p.r + pk.r;
    if (dx * dx + dy * dy > rr * rr) continue;
    state.pickups.splice(state.pickups.indexOf(pk), 1);
    const def = PICKUPS[pk.kind];
    if (pk.kind === 'shard') {
      state.score += def.score;
      floatText(state, pk.x, pk.y - 16, def.label, def.color, 16);
    } else if (pk.kind === 'spark') {
      state.heartHp = Math.min(100, state.heartHp + def.heal);
      floatText(state, pk.x, pk.y - 16, def.label, def.color, 16);
    } else {
      p.surge = def.seconds;
      floatText(state, pk.x, pk.y - 16, def.label, def.color, 18);
    }
    burst(state, pk.x, pk.y, def.color, 14, 150, 0.5);
    state.sfx.pickup();
  }
}

// --- update --------------------------------------------------------------

function update(state, dt, input) {
  state.time += dt;
  if (state.phase === 'title' || state.phase === 'victory' || state.phase === 'gameover') {
    updateParticles(state, dt);
    updateFloats(state, dt);
    return;
  }
  if (state.phase !== 'playing') return;
  state.playTime += dt;
  state.shake = Math.max(0, state.shake - dt * 2.2);
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }
  if (state.banner) state.banner.timer -= dt;

  updatePlayer(state, dt, input);
  updateWaves(state, dt);
  updateEnemies(state, dt);
  updateBullets(state, dt);
  updateParticles(state, dt);
  updateFloats(state, dt);
  updatePickups(state, dt);
  collideBulletsWithEnemies(state);
  collideEnemiesWithHeart(state);
  collideEnemyShots(state);
  collidePlayerWithEnemies(state);
  collidePlayerWithPickups(state);
}

// --- boot -----------------------------------------------------------------

function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  ctx.scale(dpr, dpr);

  const input = createInput(canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed') || 7) >>> 0;
  const state = createState(seed);
  state.sfx = sfx;

  // A handle for scripted playtests (and for curious players): read-only
  // snapshots of the live game, never a cheat.
  window.__game = {
    state: () => ({
      phase: state.phase,
      score: state.score,
      night: state.night,
      wave: state.waveIndex + 1,
      heartHp: state.heartHp,
      enemies: state.enemies.length,
      bullets: state.bullets.length,
      foes: state.enemies.slice(0, 4).map((e) => ({ x: Math.round(e.x), y: Math.round(e.y) })),
      px: Math.round(state.player.x),
      py: Math.round(state.player.y),
      kills: state.kills,
      playerHp: state.player.hp,
      playerAlive: state.player.alive,
    }),
  };

  if (shot) {
    applyShot(state, shot);
    drawGame(ctx, state);
    window.__shotReady = true;
    return;
  }

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;

    // UI keys and clicks, handled once per frame.
    const key = input.takeAnyKey();
    if (key === 'm' || key === 'M') {
      state.muted = toggleMute();
    }
    if (state.phase === 'title' && (key === 'Enter' || key === ' ')) startGame(state);
    else if ((state.phase === 'victory' || state.phase === 'gameover') && (key === 'r' || key === 'R' || key === 'Enter' || key === ' ')) startGame(state);
    else if (key === 'p' || key === 'P' || key === 'Escape') {
      if (state.phase === 'playing') { state.phase = 'paused'; stopPad(); }
      else if (state.phase === 'paused') { state.phase = 'playing'; ensureAudio(); startPad(); }
    }
    for (const click of input.takeClicks()) {
      ensureAudio();
      if (state.phase === 'title') startGame(state);
      else if (state.phase === 'victory' || state.phase === 'gameover') startGame(state);
      else if (state.phase === 'paused') { state.phase = 'playing'; startPad(); }
    }

    while (acc >= STEP) {
      update(state, STEP, input);
      acc -= STEP;
    }
    drawGame(ctx, state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
