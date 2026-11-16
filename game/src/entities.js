// Entities: the player, the shadow wisps, bolts, pickups, particles and
// floating score text — their creation and their per-frame behaviour.
// Drawing lives in render.js; orchestration (collisions, waves) in main.js.
import { ENEMY_TYPES, HEART, PLAYER, PICKUPS, hpScale, eliteChance } from './config.js';
import { edgePoint } from './random.js';

export function makePlayer() {
  return {
    x: HEART.x,
    y: HEART.y + 120,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    r: PLAYER.r,
    hp: PLAYER.maxHp,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashX: 0,
    dashY: 0,
    invuln: 0,
    surge: 0,
    alive: true,
    respawnTimer: 0,
    trail: [],
  };
}

export function makeEnemy(type, x, y, night) {
  const def = ENEMY_TYPES[type];
  const elite = type !== 'herald' && Math.random() < eliteChance(night);
  const hp = Math.round(def.hp * hpScale(night) * (elite ? 1.5 : 1));
  return {
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    r: def.r,
    hp,
    maxHp: hp,
    speed: def.speed * (elite ? 1.15 : 1) * (0.9 + Math.random() * 0.2),
    score: def.score * (elite ? 2 : 1),
    damage: def.damage,
    elite,
    phase: Math.random() * Math.PI * 2,
    wobble: 14 + Math.random() * 22,
    shootTimer: 1.5 + Math.random(),
    spawnTimer: 0,
    // Spawn-in telegraph: the wisp materialises over 0.45 s, ring first.
    spawnIn: 0.45,
    flash: 0,
    knockX: 0,
    knockY: 0,
  };
}

export function spawnEnemyAtEdge(state, type) {
  const p = edgePoint(state.rng);
  const e = makeEnemy(type, p.x, p.y, state.night);
  state.enemies.push(e);
  return e;
}

export function makeBullet(x, y, angle, speed, friendly, damage = 1) {
  return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: friendly ? 5 : 6, friendly, damage, life: 1.6 };
}

export function burst(state, x, y, color, count, speed = 160, life = 0.6) {
  for (let i = 0; i < count; i++) {
    const a = state.rng.angle();
    const s = speed * (0.3 + state.rng.next() * 0.7);
    state.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      r: 1.5 + state.rng.next() * 2.5,
      color,
      life: life * (0.5 + state.rng.next() * 0.5),
      maxLife: life,
    });
  }
}

export function floatText(state, x, y, text, color = '#f4f1ff', size = 16) {
  state.floats.push({ x, y, text, color, size, life: 1.1, maxLife: 1.1 });
}

export function makePickup(state, x, y, kind) {
  state.pickups.push({ x, y, kind, r: 13, bob: state.rng.next() * Math.PI * 2, life: 9 });
}

export function maybeDropPickup(state, x, y) {
  const roll = state.rng.next();
  if (roll < 0.05) makePickup(state, x, y, 'shard');
  else if (roll < 0.09) makePickup(state, x, y, 'spark');
  else if (roll < 0.12) makePickup(state, x, y, 'surge');
}

// --- per-frame updates -------------------------------------------------

export function updatePlayer(state, dt, input) {
  const p = state.player;
  if (!p.alive) {
    p.respawnTimer -= dt;
    if (p.respawnTimer <= 0) {
      p.alive = true;
      p.hp = PLAYER.maxHp;
      p.x = HEART.x;
      p.y = HEART.y + 120;
      p.invuln = 2;
      burst(state, p.x, p.y, '#7ef0d4', 24, 200, 0.7);
    }
    return;
  }
  p.invuln = Math.max(0, p.invuln - dt);
  p.fireTimer -= dt;
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.surge = Math.max(0, p.surge - dt);

  const move = input.moveVector();
  const aimDx = input.mouse.x - p.x;
  const aimDy = input.mouse.y - p.y;
  if (Math.hypot(aimDx, aimDy) > 4) p.angle = Math.atan2(aimDy, aimDx);

  // Dash: a short burst toward the movement keys (or the aim when idle).
  if ((input.pressed('Shift') || input.mouse.rightDown) && p.dashCooldown <= 0 && p.dashTimer <= 0) {
    const dx = move.x !== 0 || move.y !== 0 ? move.x : Math.cos(p.angle);
    const dy = move.x !== 0 || move.y !== 0 ? move.y : Math.sin(p.angle);
    p.dashTimer = PLAYER.dashTime;
    p.dashCooldown = PLAYER.dashCooldown;
    p.dashX = dx;
    p.dashY = dy;
    p.invuln = Math.max(p.invuln, PLAYER.dashTime + 0.05);
    state.sfx.dash();
  }

  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.x += p.dashX * PLAYER.dashSpeed * dt;
    p.y += p.dashY * PLAYER.dashSpeed * dt;
  } else {
    p.vx = move.x * PLAYER.speed;
    p.vy = move.y * PLAYER.speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  // Keep the wisp inside the arena.
  p.x = Math.max(18, Math.min(942, p.x));
  p.y = Math.max(18, Math.min(522, p.y));

  // A faint trail so fast movement reads on screen.
  p.trail.unshift({ x: p.x, y: p.y });
  if (p.trail.length > 10) p.trail.pop();

  // Fire light bolts toward the mouse while held.
  if (input.mouse.down && p.fireTimer <= 0) {
    p.fireTimer = PLAYER.fireInterval;
    const shots = p.surge > 0 ? [-0.16, 0, 0.16] : [0];
    for (const off of shots) {
      state.bullets.push(makeBullet(
        p.x + Math.cos(p.angle + off) * 18,
        p.y + Math.sin(p.angle + off) * 18,
        p.angle + off,
        PLAYER.bulletSpeed,
        true,
        PLAYER.bulletDamage,
      ));
    }
    state.sfx.shoot();
  }
}

export function updateEnemies(state, dt) {
  const heart = HEART;
  for (const e of state.enemies) {
    e.flash = Math.max(0, e.flash - dt);
    e.phase += dt;
    // Still materialising: hold at the edge, ring closing, then hunt.
    if (e.spawnIn > 0) {
      e.spawnIn = Math.max(0, e.spawnIn - dt);
      continue;
    }
    const dx = heart.x - e.x;
    const dy = heart.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    if (e.type === 'spitter' && dist < ENEMY_TYPES.spitter.shootRange) {
      // Hold at range and spit shadow bolts at the heart.
      e.shootTimer -= dt;
      const strafe = Math.sin(e.phase * 1.4) * 0.6;
      e.x += (-ny * strafe + nx * 6) * dt;
      e.y += (nx * strafe + ny * 6) * dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = ENEMY_TYPES.spitter.shootInterval;
        const a = Math.atan2(dy, dx);
        state.ebullets.push(makeBullet(e.x, e.y, a, 170, false, 4));
        burst(state, e.x, e.y, '#c084fc', 6, 90, 0.4);
      }
    } else if (e.type === 'herald') {
      // The Herald lumbers in, spawns escorts and fires a triple spread.
      e.x += nx * e.speed * dt;
      e.y += ny * e.speed * dt;
      e.spawnTimer -= dt;
      if (e.spawnTimer <= 0 && state.enemies.length < 26) {
        e.spawnTimer = 6;
        for (let i = 0; i < 2; i++) {
          const a = state.rng.angle();
          state.enemies.push(makeEnemy('wisp', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, state.night));
        }
        burst(state, e.x, e.y, '#ffd166', 16, 120, 0.6);
      }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && dist < 520) {
        e.shootTimer = 3.2;
        const base = Math.atan2(state.player.y - e.y, state.player.x - e.x);
        for (const off of [-0.22, 0, 0.22]) {
          state.ebullets.push(makeBullet(e.x, e.y, base + off, 190, false, 6));
        }
      }
    } else {
      // Drift toward the heart with a slow sideways wobble.
      const wob = Math.sin(e.phase * 1.7) * e.wobble;
      e.x += (nx * e.speed + -ny * wob * 0.4) * dt;
      e.y += (ny * e.speed + nx * wob * 0.4) * dt;
    }

    // Knockback decays.
    e.x += e.knockX * dt;
    e.y += e.knockY * dt;
    e.knockX *= Math.pow(0.001, dt);
    e.knockY *= Math.pow(0.001, dt);
  }
}

export function updateBullets(state, dt) {
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  state.bullets = state.bullets.filter((b) => b.life > 0 && b.x > -20 && b.x < 980 && b.y > -20 && b.y < 560);
  for (const b of state.ebullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  state.ebullets = state.ebullets.filter((b) => b.life > 0 && b.x > -20 && b.x < 980 && b.y > -20 && b.y < 560);
}

export function updateParticles(state, dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.05, dt);
    p.vy *= Math.pow(0.05, dt);
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  if (state.particles.length > 420) state.particles.splice(0, state.particles.length - 420);
}

export function updateFloats(state, dt) {
  for (const f of state.floats) {
    f.y -= 34 * dt;
    f.life -= dt;
  }
  state.floats = state.floats.filter((f) => f.life > 0);
}

export function updatePickups(state, dt) {
  for (const pk of state.pickups) {
    pk.bob += dt * 3;
    pk.life -= dt;
  }
  state.pickups = state.pickups.filter((pk) => pk.life > 0);
}

export function pickupLabel(kind) {
  return PICKUPS[kind].label;
}
