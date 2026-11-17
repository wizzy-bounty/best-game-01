// PRISMBEND — particles and floating text.
//
// Two small systems that make the game feel alive: sparks that fly when
// something burns, bursts or is collected, and short-lived text that floats
// up from the action ("+100", "WAVE CLEAR +100", "IMMUNE"). Both are plain
// arrays on the state, updated and drawn by the renderer, and both die on
// their own so the game never has to clean up after them.
export function burst(state, x, y, color, count, speed, life) {
  for (let i = 0; i < count; i++) {
    const a = state.rng.range(0, Math.PI * 2);
    const v = state.rng.range(speed * 0.3, speed);
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: state.rng.range(life * 0.5, life),
      maxLife: life,
      size: state.rng.range(1.5, 3.5),
      color,
      drag: 0.92,
    });
  }
}

// One ember rising from a burning wisp: slow, warm, short-lived.
export function ember(state, x, y, color) {
  state.particles.push({
    x: x + state.rng.range(-8, 8),
    y: y + state.rng.range(-8, 8),
    vx: state.rng.range(-12, 12),
    vy: state.rng.range(-46, -18),
    life: state.rng.range(0.3, 0.7),
    maxLife: 0.7,
    size: state.rng.range(1, 2.4),
    color,
    drag: 0.98,
  });
}

// A ring that expands and fades: used when a wave clears and when the
// heart surges, so the player feels the beat of the game.
export function ring(state, x, y, color, maxR) {
  state.particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.6,
    maxLife: 0.6,
    size: 2,
    color,
    ring: true,
    maxR,
    drag: 1,
  });
}

export function floatText(state, x, y, text, color, size = 14) {
  state.floats.push({ x, y, text, color, size, life: 1.1, maxLife: 1.1 });
}

// Move everything one step and drop what has died.
export function updateParticles(state, dt) {
  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= p.drag;
    p.vy *= p.drag;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.floats) {
    f.life -= dt;
    f.y -= 34 * dt;
  }
  state.floats = state.floats.filter((f) => f.life > 0);
}
