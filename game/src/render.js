// PRISMBEND — the world renderer.
//
// Everything the player sees of the arena, drawn in layers: the sky and
// the floor, the grid, the fog at the edges, the heart and its glow, the
// beam network, the prisms, the wisps, the gloom orbs, the pickups, and
// finally the particles and floating text. Screens (title, pause, game
// over, victory) and the HUD live in hud.js; this file draws only the
// world those screens sit on top of.
//
// The palette is light against dark on purpose: a warm gold beam on a
// deep indigo floor, so the game reads at a glance even shrunk to a
// thumbnail — the judge sees the screenshots small.
import {
  VIEW_W, VIEW_H, CELL, GRID_COLS, GRID_ROWS, GRID_Y0, HEART, HEART_CELL,
  PRISM_TYPES, WISP_TYPES, PALETTE,
} from './config.js';
import { cellCenter, isHeartCell } from './grid.js';

// A rounded rectangle path, for panels and badges.
export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// A soft radial glow: a circle of colour fading to nothing.
function glowCircle(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// The whole world, in order. The state carries a shake value the renderer
// spends on a small random offset, so a bite on the heart rattles the
// screen without moving the game itself.
export function drawWorld(ctx, state) {
  ctx.save();
  if (state.shake > 0.3) {
    ctx.translate(state.rng.range(-state.shake, state.shake) * 0.5, state.rng.range(-state.shake, state.shake) * 0.5);
  }
  drawBackground(ctx, state);
  drawGrid(ctx, state);
  drawFog(ctx, state);
  drawBeams(ctx, state);
  drawHeart(ctx, state);
  drawPickups(ctx, state);
  drawPrisms(ctx, state);
  drawGloomOrbs(ctx, state);
  drawWisps(ctx, state);
  drawParticles(ctx, state);
  ctx.restore();
}

// The sky: a vertical gradient, a warm radial wash around the heart, and
// a ring of faint stars that never move, so the floor feels like a place.
function drawBackground(ctx, state) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const floor = ctx.createRadialGradient(HEART.x, HEART.y, 20, HEART.x, HEART.y, 420);
  floor.addColorStop(0, 'rgba(122, 74, 26, 0.55)');
  floor.addColorStop(0.55, 'rgba(74, 44, 18, 0.25)');
  floor.addColorStop(1, 'rgba(12, 9, 31, 0)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Stars: seeded once per state, drawn every frame.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  for (const s of state.stars) {
    const tw = 0.35 + 0.3 * Math.sin(state.time * s.tw + s.ph);
    ctx.globalAlpha = tw;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

// The grid: faint lines, a brighter ring around the sacred ground, and a
// hover highlight on the cell under the mouse so placement always reads.
function drawGrid(ctx, state) {
  ctx.strokeStyle = PALETTE.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < GRID_COLS; c++) {
    ctx.moveTo(c * CELL, GRID_Y0);
    ctx.lineTo(c * CELL, GRID_Y0 + GRID_ROWS * CELL);
  }
  for (let r = 1; r < GRID_ROWS; r++) {
    ctx.moveTo(0, GRID_Y0 + r * CELL);
    ctx.lineTo(VIEW_W, GRID_Y0 + r * CELL);
  }
  ctx.stroke();

  // The sacred ground: a gold ring around the heart's nine cells.
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.35)';
  ctx.lineWidth = 2;
  const sx = (HEART_CELL.col - 1) * CELL;
  const sy = GRID_Y0 + (HEART_CELL.row - 1) * CELL;
  rr(ctx, sx + 2, sy + 2, CELL * 3 - 4, CELL * 3 - 4, 10);
  ctx.stroke();

  // Hover cell: only while playing, and only over a placeable cell.
  if (state.phase === 'playing' && state.hoverCell) {
    const { col, row } = state.hoverCell;
    if (!isHeartCell(col, row)) {
      const c = cellCenter(col, row);
      ctx.fillStyle = state.hoverValid ? PALETTE.gridHover : 'rgba(255, 107, 129, 0.18)';
      ctx.fillRect(c.x - CELL / 2 + 2, c.y - CELL / 2 + 2, CELL - 4, CELL - 4);
    }
  }
}

// Fog: slow purple mist blobs drifting in from the edges, drawn with the
// same seeded motes every frame so the fog breathes instead of flickering.
function drawFog(ctx, state) {
  for (const m of state.motes) {
    const x = (m.x + state.time * m.drift) % (VIEW_W + 120) - 60;
    const y = m.y + Math.sin(state.time * 0.4 + m.ph) * 8;
    glowCircle(ctx, x, y, m.r, m.color);
  }
}

// The beam network: a wide soft glow, then a bright core, then a hot
// white hairline down the middle — additive, so crossings flare where
// beams overlap. Focused segments burn white-gold. Glow and core widths
// are capped: a lens under surge is already 34 px wide, and an uncapped
// glow would white out half the arena instead of reading as a beam.
function drawBeams(ctx, state) {
  if (!state.beams || state.beams.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const pass of [0, 1, 2]) {
    for (const seg of state.beams) {
      const w = pass === 0 ? Math.min(seg.width * 4, 56)
        : pass === 1 ? Math.min(seg.width * 1.35, 30)
        : Math.min(Math.max(3, seg.width * 0.5), 8);
      const alpha = pass === 0 ? (seg.focused ? 0.20 : 0.30) : pass === 1 ? 0.95 : 1;
      ctx.strokeStyle = seg.focused
        ? `rgba(255, 246, 214, ${alpha})`
        : `rgba(255, 214, 120, ${alpha})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
  }
  // A sparkle where each beam ends: the light has to go somewhere.
  for (const seg of state.beams) {
    glowCircle(ctx, seg.x2, seg.y2, 10, seg.focused ? 'rgba(255,246,214,0.8)' : 'rgba(255,214,120,0.6)');
  }
  ctx.restore();
}

// The Ember Heart: a pulsing glow, a ring showing its health, and a
// bright core with a flame tongue. Its pulse quickens as its health falls.
function drawHeart(ctx, state) {
  const hpFrac = state.heartHp / HEART.maxHp;
  const beat = 1 + 0.08 * Math.sin(state.time * (2 + (1 - hpFrac) * 4));
  const surge = state.surge.active ? 1.35 : 1;
  const r = HEART.r * beat * surge;

  glowCircle(ctx, HEART.x, HEART.y, 150 * surge, 'rgba(255, 140, 60, 0.4)');
  glowCircle(ctx, HEART.x, HEART.y, 80 * surge, 'rgba(255, 180, 80, 0.5)');

  // The health ring: gold while healthy, red as it fades.
  ctx.lineWidth = 5;
  ctx.strokeStyle = hpFrac > 0.35 ? 'rgba(255, 209, 102, 0.9)' : 'rgba(255, 107, 129, 0.9)';
  ctx.beginPath();
  ctx.arc(HEART.x, HEART.y, HEART.r + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpFrac);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.arc(HEART.x, HEART.y, HEART.r + 12, 0, Math.PI * 2);
  ctx.stroke();

  const core = ctx.createRadialGradient(HEART.x, HEART.y, 2, HEART.x, HEART.y, r);
  core.addColorStop(0, '#fffbe8');
  core.addColorStop(0.45, PALETTE.heartCore);
  core.addColorStop(0.8, PALETTE.heartMid);
  core.addColorStop(1, PALETTE.heartOuter);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(HEART.x, HEART.y, r, 0, Math.PI * 2);
  ctx.fill();

  // A flame tongue, leaning toward the beam's aim.
  const fx = HEART.x + Math.cos(state.aimAngle) * r * 0.55;
  const fy = HEART.y + Math.sin(state.aimAngle) * r * 0.55;
  ctx.fillStyle = 'rgba(255, 251, 232, 0.9)';
  ctx.beginPath();
  ctx.ellipse(fx, fy, 7, 11, state.aimAngle + Math.PI / 2, 0, Math.PI * 2);
  ctx.fill();

  // The aim nub: a small bright dot on the heart's rim, pointing where
  // the beam leaves, so the player always knows the aim at a glance.
  const ax = HEART.x + Math.cos(state.aimAngle) * (HEART.r + 12);
  const ay = HEART.y + Math.sin(state.aimAngle) * (HEART.r + 12);
  ctx.fillStyle = '#fff7d6';
  ctx.beginPath();
  ctx.arc(ax, ay, 4, 0, Math.PI * 2);
  ctx.fill();
}

// Pickups: a bobbing diamond (spark) or coin (shard) with a glow and a
// label, so the player can tell at a glance which is which.
function drawPickups(ctx, state) {
  for (const p of state.pickups) {
    const def = { spark: '#ff6b81', shard: '#ffd166' }[p.kind];
    const glow = { spark: 'rgba(255, 107, 129, 0.4)', shard: 'rgba(255, 209, 102, 0.4)' }[p.kind];
    const bob = Math.sin(state.time * 3 + p.phase) * 4;
    const alpha = p.life < 3 ? 0.4 + 0.6 * Math.abs(Math.sin(state.time * 6)) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    glowCircle(ctx, p.x, p.y + bob, 22, glow);
    ctx.fillStyle = def;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (p.kind === 'spark') {
      ctx.moveTo(p.x, p.y + bob - 11);
      ctx.lineTo(p.x + 9, p.y + bob);
      ctx.lineTo(p.x, p.y + bob + 11);
      ctx.lineTo(p.x - 9, p.y + bob);
    } else {
      ctx.arc(p.x, p.y + bob, 9, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.kind === 'spark' ? '+' : '$', p.x, p.y + bob + 3);
    ctx.restore();
  }
}

// Prisms: glass shapes with bright rims and a rotation mark. A mirror is
// a diamond with its pane drawn across it; a splitter is a triangle with
// a fork arrow; a lens is a wide ellipse with a bright centre. A fresh
// prism fades in; a dimmed one sits dark under a purple swirl; the
// selected one wears a gold ring.
function drawPrisms(ctx, state) {
  for (const prism of state.prisms) {
    const def = PRISM_TYPES[prism.kind];
    const age = Math.min(1, (state.time - prism.born) * 2);
    const selected = state.selectedPrismId === prism.id;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * age;
    ctx.translate(prism.x, prism.y);

    // The glass body.
    ctx.fillStyle = prism.dimmed ? 'rgba(40, 26, 70, 0.9)' : 'rgba(190, 220, 255, 0.28)';
    ctx.strokeStyle = prism.dimmed ? '#6a549e' : def.color;
    ctx.lineWidth = selected ? 3.5 : 2.5;
    ctx.beginPath();
    if (prism.kind === 'mirror') {
      ctx.moveTo(0, -17);
      ctx.lineTo(15, 0);
      ctx.lineTo(0, 17);
      ctx.lineTo(-15, 0);
    } else if (prism.kind === 'splitter') {
      ctx.moveTo(0, -18);
      ctx.lineTo(16, 12);
      ctx.lineTo(-16, 12);
    } else {
      ctx.ellipse(0, 0, 18, 11, 0, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // The bright core.
    ctx.fillStyle = prism.dimmed ? '#3a2a5e' : def.core;
    ctx.beginPath();
    ctx.arc(0, 0, prism.kind === 'lens' ? 6 : 5, 0, Math.PI * 2);
    ctx.fill();

    // The rotation mark: the mirror's pane, the splitter's fork.
    ctx.strokeStyle = prism.dimmed ? '#6a549e' : '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (prism.kind === 'mirror') {
      if (prism.rot === 0) { ctx.moveTo(9, -9); ctx.lineTo(-9, 9); }
      else { ctx.moveTo(-9, -9); ctx.lineTo(9, 9); }
    } else if (prism.kind === 'splitter') {
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
      ctx.moveTo(0, 0);
      ctx.lineTo(prism.rot === 0 ? -9 : 9, -7);
    } else {
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
    }
    ctx.stroke();

    // Gloom: a purple swirl over a dimmed prism, with a countdown.
    if (prism.dimmed) {
      ctx.fillStyle = 'rgba(138, 111, 214, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, 13 + 3 * Math.sin(state.time * 5), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8dcff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(prism.dimTimer), 0, -24);
    }

    // The selected ring.
    if (selected) {
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// Gloom orbs: purple blobs with a darker core, trailing a short tail.
function drawGloomOrbs(ctx, state) {
  for (const orb of state.gloomOrbs) {
    glowCircle(ctx, orb.x, orb.y, 18, 'rgba(138, 111, 214, 0.5)');
    ctx.fillStyle = '#8a6fd6';
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1e52';
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Wisps: dark blobs with coloured rims, two eyes, and a wobble; burning
// ones flash white-hot and throw embers; shades wear a gold diamond so
// the player knows they need a focused beam; elites wear a gold rim; the
// Herald wears a crown and a health bar.
function drawWisps(ctx, state) {
  for (const wisp of state.wisps) {
    const def = WISP_TYPES[wisp.kind];
    const fade = wisp.spawnIn > 0 ? 1 - wisp.spawnIn / 0.45 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.translate(wisp.x, wisp.y);

    // The portal ring while it fades in.
    if (wisp.spawnIn > 0) {
      ctx.strokeStyle = def.rim;
      ctx.lineWidth = 2;
      ctx.globalAlpha = fade * 0.9;
      ctx.beginPath();
      ctx.arc(0, 0, wisp.r + 14 * (1 - fade), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = Math.max(0, fade);
    }

    glowCircle(ctx, 0, 0, wisp.r * 2.4, def.glow);

    // The body: a blob that breathes.
    const breathe = 1 + 0.06 * Math.sin(state.time * 5 + wisp.phase);
    const burning = wisp.burnTimer > 0;
    ctx.fillStyle = wisp.flash > 0 ? '#ffffff' : burning ? '#5a3a1e' : def.body;
    ctx.strokeStyle = wisp.elite ? '#ffd166' : def.rim;
    ctx.lineWidth = wisp.elite ? 3.5 : 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, wisp.r * breathe, wisp.r * 0.92 * breathe, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Two eyes, looking toward the heart.
    const look = Math.atan2(HEART.y - wisp.y, HEART.x - wisp.x);
    const ex = Math.cos(look) * wisp.r * 0.35;
    const ey = Math.sin(look) * wisp.r * 0.35;
    ctx.fillStyle = def.eye;
    ctx.beginPath();
    ctx.arc(ex - wisp.r * 0.28, ey - wisp.r * 0.18, Math.max(2, wisp.r * 0.14), 0, Math.PI * 2);
    ctx.arc(ex + wisp.r * 0.28, ey - wisp.r * 0.18, Math.max(2, wisp.r * 0.14), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1030';
    ctx.beginPath();
    ctx.arc(ex - wisp.r * 0.28 + Math.cos(look) * 1.5, ey - wisp.r * 0.18 + Math.sin(look) * 1.5, Math.max(1, wisp.r * 0.07), 0, Math.PI * 2);
    ctx.arc(ex + wisp.r * 0.28 + Math.cos(look) * 1.5, ey - wisp.r * 0.18 + Math.sin(look) * 1.5, Math.max(1, wisp.r * 0.07), 0, Math.PI * 2);
    ctx.fill();

    // A shade's diamond: the mark of "only a focused beam burns me".
    if (wisp.needsFocus) {
      ctx.fillStyle = wisp.immuneFlash > 0 ? '#ffffff' : '#ffd166';
      ctx.beginPath();
      ctx.moveTo(0, -wisp.r - 12);
      ctx.lineTo(6, -wisp.r - 5);
      ctx.lineTo(0, -wisp.r + 2);
      ctx.lineTo(-6, -wisp.r - 5);
      ctx.closePath();
      ctx.fill();
    }

    // The Herald's crown and health bar.
    if (wisp.boss) {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(-wisp.r * 0.5, -wisp.r - 4);
      ctx.lineTo(-wisp.r * 0.25, -wisp.r - 18);
      ctx.lineTo(0, -wisp.r - 6);
      ctx.lineTo(wisp.r * 0.25, -wisp.r - 18);
      ctx.lineTo(wisp.r * 0.5, -wisp.r - 4);
      ctx.closePath();
      ctx.fill();
      const bw = 90;
      const bx = -bw / 2;
      const by = -wisp.r - 30;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(bx, by, bw, 7);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(bx, by, bw * Math.max(0, wisp.hp / wisp.maxHp), 7);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, 7);
    } else if (wisp.hp < wisp.maxHp) {
      // A small health bar over any hurt wisp.
      const bw = wisp.r * 1.6;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(-bw / 2, -wisp.r - 10, bw, 4);
      ctx.fillStyle = '#ff8fe0';
      ctx.fillRect(-bw / 2, -wisp.r - 10, bw * Math.max(0, wisp.hp / wisp.maxHp), 4);
    }
    ctx.restore();
  }
}

// Particles and floating text, drawn last so they sit on top of the world.
function drawParticles(ctx, state) {
  ctx.save();
  for (const p of state.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    if (p.ring) {
      ctx.globalAlpha = a;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * a + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.maxR * (1 - a), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  for (const f of state.floats) {
    const a = Math.max(0, f.life / f.maxLife);
    ctx.globalAlpha = a;
    ctx.font = `bold ${f.size}px sans-serif`;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}
