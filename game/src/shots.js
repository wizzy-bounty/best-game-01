// Deterministic shot scenes for screenshots: ?shot=title|play|boss|victory
// &seed=N renders one fixed frame of the game's own code and sets
// window.__shotReady, so the screenshot tool can capture it.
// Nothing here is a mock: every scene is a real game state, placed by a
// seeded generator at a fixed simulated time.
import { makeEnemy, makeBullet, burst, floatText, makePickup } from './entities.js';

function placeWisp(state, type, x, y) {
  const e = makeEnemy(type, x, y, state.night);
  e.phase = state.rng.next() * Math.PI * 2;
  e.spawnIn = 0;
  state.enemies.push(e);
  return e;
}

export function applyShot(state, scene) {
  state.time = 1.234;
  state.phase = 'playing';
  state.banner = null;

  if (scene === 'title') {
    state.phase = 'title';
    state.best = 12500;
    // The world rests behind the title panel: arena + ember only, so no
    // stray wisp or player sprite peeks out from under it.
    return;
  }

  if (scene === 'play') {
    state.night = 3;
    state.waveIndex = 1;
    state.score = 4850;
    state.combo = 4;
    state.comboTimer = 1.8;
    state.heartHp = 78;
    state.kills = 41;
    state.player.x = 330;
    state.player.y = 380;
    state.player.angle = -0.5;
    state.player.dashCooldown = 0;
    // A mid-fight spread: wisps closing in from all sides, bolts flying.
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
    for (let i = 0; i < 7; i++) {
      const a = -0.5 + (i - 3) * 0.1;
      state.bullets.push(makeBullet(360 + i * 26, 372 - i * 8, a, 580, true, 1));
    }
    burst(state, 620, 180, '#8b7bff', 14, 160, 0.6);
    burst(state, 700, 330, '#ff7ad9', 10, 140, 0.5);
    burst(state, 780, 220, '#7fb2ff', 12, 150, 0.5);
    floatText(state, 620, 150, '+100', '#ffd166', 16);
    floatText(state, 700, 300, '+150', '#ffd166', 16);
    makePickup(state, 540, 430, 'spark');
    makePickup(state, 420, 320, 'shard');
    return;
  }

  if (scene === 'boss') {
    state.night = 7;
    state.waveIndex = 2;
    state.score = 18200;
    state.combo = 6;
    state.comboTimer = 2.1;
    state.heartHp = 54;
    state.kills = 168;
    state.player.x = 300;
    state.player.y = 430;
    state.player.angle = -0.35;
    state.player.surge = 5;
    state.player.dashCooldown = 0;
    const herald = placeWisp(state, 'herald', 640, 240);
    herald.hp = 62;
    placeWisp(state, 'wisp', 870, 130);
    placeWisp(state, 'wisp', 580, 340);
    placeWisp(state, 'swift', 760, 330);
    placeWisp(state, 'brute', 520, 130);
    placeWisp(state, 'spitter', 840, 200);
    placeWisp(state, 'brute', 840, 380);
    placeWisp(state, 'swift', 430, 110);
    for (let i = 0; i < 7; i++) {
      const a = -0.35 + (i - 3) * 0.09;
      state.bullets.push(makeBullet(330 + i * 22, 420 - i * 6, a, 580, true, 1));
    }
    for (const off of [-0.22, 0, 0.22]) {
      state.ebullets.push(makeBullet(610, 250, Math.PI + off, 190, false, 6));
    }
    burst(state, 640, 240, '#ffd166', 22, 200, 0.7);
    burst(state, 520, 130, '#7fb2ff', 12, 150, 0.5);
    burst(state, 840, 380, '#7fb2ff', 12, 150, 0.5);
    floatText(state, 770, 150, '+300', '#ffd166', 18);
    floatText(state, 580, 380, '+150', '#ffd166', 16);
    makePickup(state, 420, 470, 'surge');
    makePickup(state, 700, 430, 'shard');
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
    // The world rests behind the victory panel: bursts only.
    burst(state, 480, 270, '#ffd166', 40, 260, 0.9);
    burst(state, 380, 320, '#7ef0d4', 24, 200, 0.8);
    burst(state, 580, 320, '#ff9f43', 24, 200, 0.8);
    return;
  }

  // Unknown scene: fall back to the play scene.
  applyShot(state, 'play');
}

export const SHOT_SCENES = ['title', 'play', 'boss', 'victory'];
