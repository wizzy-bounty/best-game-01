// Every pixel of EMBERPRISM's world: the night arena, the Ember Heart, the
// wisps, the player, bolts, pickups and particles. Canvas is 960x540
// logical; the page scales it with CSS. HUD and screens live in hud.js;
// shared primitives (panels, glows, score formatting) in canvas.js.
import { VIEW_W, VIEW_H, HEART, PALETTE, ENEMY_TYPES, PICKUPS } from './config.js';
import { FONT, glowCircle } from './canvas.js';
import { drawHud, drawTitle, drawPause, drawEndScreen } from './hud.js';

export function drawBackground(ctx, state) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Stars, twinkling slowly.
  for (const s of state.stars) {
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(state.time * s.tw + s.ph));
    ctx.globalAlpha = tw * s.a;
    ctx.fillStyle = '#dfe6ff';
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
  ctx.globalAlpha = 1;

  // Warm floor glow around the heart, fading into the dusk.
  const floor = ctx.createRadialGradient(HEART.x, HEART.y, 20, HEART.x, HEART.y, 460);
  floor.addColorStop(0, 'rgba(150, 104, 40, 0.75)');
  floor.addColorStop(0.5, 'rgba(84, 58, 36, 0.5)');
  floor.addColorStop(1, 'rgba(26, 20, 64, 0)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Glowing ember motes scattered over the arena floor, so the ground
  // reads as a place and not an empty void.
  for (const m of state.motes) {
    const tw = 0.5 + 0.5 * Math.sin(state.time * m.tw + m.ph);
    ctx.globalAlpha = tw * m.a;
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Drifting fog banks, misty lavender now so the light reads against them.
  ctx.save();
  for (const f of state.fog) {
    const fx = ((f.x + state.time * f.speed) % (VIEW_W + 320)) - 160;
    ctx.globalAlpha = f.a;
    ctx.fillStyle = '#3a2f7d';
    ctx.beginPath();
    ctx.ellipse(fx, f.y, f.rx, f.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Arena rings around the heart: the line the wisps must not cross.
  // Faint rune ticks mark the ring so the boundary reads at a glance.
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(HEART.x, HEART.y, 120, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.12)';
  ctx.beginPath();
  ctx.arc(HEART.x, HEART.y, 200, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 209, 102, 0.35)';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(HEART.x + Math.cos(a) * 120, HEART.y + Math.sin(a) * 120, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHeart(ctx, state) {
  const flick = 1 + Math.sin(state.time * 7) * 0.05 + Math.sin(state.time * 13.7) * 0.03;
  const hpFrac = Math.max(0, state.heartHp / 100);
  const glowR = 130 * flick * (0.55 + hpFrac * 0.45);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowCircle(ctx, HEART.x, HEART.y, glowR, 'rgba(255, 159, 67, 0.5)', 0.9);
  glowCircle(ctx, HEART.x, HEART.y, 60 * flick, 'rgba(255, 209, 102, 0.75)', 0.9);
  ctx.restore();

  // The flame: layered teardrops that flicker with time.
  const flameH = 52 * flick * (0.6 + hpFrac * 0.4);
  ctx.save();
  ctx.translate(HEART.x, HEART.y + 8);
  for (const [scale, color] of [[1, PALETTE.heartOuter], [0.66, PALETTE.heartMid], [0.36, PALETTE.heartCore]]) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -flameH * scale);
    ctx.bezierCurveTo(20 * scale, -flameH * scale * 0.4, 16 * scale, 12 * scale, 0, 14 * scale);
    ctx.bezierCurveTo(-16 * scale, 12 * scale, -20 * scale, -flameH * scale * 0.4, 0, -flameH * scale);
    ctx.fill();
  }
  ctx.restore();

  // HP ring around the heart.
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(HEART.x, HEART.y, HEART.r + 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = hpFrac > 0.35 ? '#ffd166' : '#ff5a5a';
  ctx.beginPath();
  ctx.arc(HEART.x, HEART.y, HEART.r + 12, -Math.PI / 2, -Math.PI / 2 + hpFrac * Math.PI * 2);
  ctx.stroke();
}

function drawPlayer(ctx, state) {
  const p = state.player;
  if (!p.alive) return;
  const blink = p.invuln > 0 && Math.floor(state.time * 14) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;

  // Dash trail.
  for (let i = 0; i < p.trail.length; i++) {
    const t = p.trail[i];
    ctx.globalAlpha = (1 - i / p.trail.length) * 0.25;
    ctx.fillStyle = '#7ef0d4';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 10 * (1 - i / p.trail.length), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Aim guide: a bright beam toward the mouse so the aim reads at once.
  ctx.strokeStyle = 'rgba(126, 240, 212, 0.45)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.angle) * 72, p.y + Math.sin(p.angle) * 72);
  ctx.stroke();

  ctx.globalCompositeOperation = 'lighter';
  glowCircle(ctx, p.x, p.y, 44, 'rgba(126, 240, 212, 0.55)', 0.85);
  ctx.restore();

  // The prism wisp: a bright diamond with a light core.
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = PALETTE.playerBody;
  ctx.beginPath();
  ctx.moveTo(21, 0);
  ctx.lineTo(-11, 12);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-11, -12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.playerRim;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(3, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Prism Surge timer ring.
  if (p.surge > 0) {
    ctx.strokeStyle = '#7ef0d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 26, -Math.PI / 2, -Math.PI / 2 + (p.surge / 8) * Math.PI * 2);
    ctx.stroke();
  }

  // Player hearts (lives).
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < p.hp ? '#ff6b81' : 'rgba(255,255,255,0.18)';
    const hx = p.x - 17 + i * 17;
    const hy = p.y - 36;
    ctx.beginPath();
    ctx.arc(hx - 3.5, hy, 4.5, 0, Math.PI * 2);
    ctx.arc(hx + 3.5, hy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 7.5, hy + 1);
    ctx.lineTo(hx, hy + 9);
    ctx.lineTo(hx + 7.5, hy + 1);
    ctx.fill();
  }
}

function drawEnemies(ctx, state) {
  for (const e of state.enemies) {
    const def = ENEMY_TYPES[e.type];

    // Spawn telegraph: a closing portal ring while the wisp materialises.
    if (e.spawnIn > 0) {
      const f = e.spawnIn / 0.45;
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.55 * f;
      ctx.strokeStyle = def.rim;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * (1.6 + f * 0.9), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowCircle(ctx, e.x, e.y, e.r * 2.1, def.glow, 0.65);
    ctx.restore();

    // Shadow body: a bright-rimmed blob, no longer near-black, so every
    // foe reads at thumbnail size.
    ctx.save();
    ctx.translate(e.x, e.y);
    const wob = Math.sin(e.phase * 3) * 0.12;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const rr2 = e.r * (1 + Math.sin(a * 3 + e.phase) * 0.08 + wob * Math.sin(a * 2));
      const px = Math.cos(a) * rr2;
      const py = Math.sin(a) * rr2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : def.body;
    ctx.fill();
    ctx.strokeStyle = e.elite ? '#ffd166' : def.rim;
    ctx.lineWidth = e.elite ? 3.5 : 2.5;
    ctx.stroke();

    // Eyes, always looking at the heart — bigger now, the face of the foe.
    const look = Math.atan2(HEART.y - e.y, HEART.x - e.x);
    const ex = Math.cos(look) * e.r * 0.3;
    const ey = Math.sin(look) * e.r * 0.3;
    const perp = look + Math.PI / 2;
    for (const s of [-1, 1]) {
      ctx.fillStyle = def.eye;
      ctx.beginPath();
      ctx.arc(ex + Math.cos(perp) * e.r * 0.32 * s, ey + Math.sin(perp) * e.r * 0.32 * s, Math.max(2.5, e.r * 0.18), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Boss crown, name and health bar for the Herald.
    if (e.type === 'herald') {
      ctx.save();
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(state.time * 4);
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      for (const s of [-1, 0, 1]) {
        const cx = e.x + s * 16;
        ctx.moveTo(cx - 7, e.y - e.r - 6);
        ctx.lineTo(cx, e.y - e.r - 22);
        ctx.lineTo(cx + 7, e.y - e.r - 6);
      }
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.font = `bold 19px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('THE NIGHT HERALD', e.x, e.y - e.r - 52);
      const bw = 150;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - bw / 2, e.y - e.r - 46, bw, 9);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(e.x - bw / 2, e.y - e.r - 46, bw * (e.hp / e.maxHp), 9);
    } else if (e.hp < e.maxHp) {
      const bw = e.r * 1.6;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(e.x - bw / 2, e.y - e.r - 10, bw, 4);
      ctx.fillStyle = def.rim;
      ctx.fillRect(e.x - bw / 2, e.y - e.r - 10, bw * (e.hp / e.maxHp), 4);
    }
  }
}

function drawBullets(ctx, state) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of state.bullets) {
    glowCircle(ctx, b.x, b.y, 15, 'rgba(255, 233, 168, 0.85)', 0.9);
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of state.ebullets) {
    glowCircle(ctx, b.x, b.y, 16, 'rgba(168, 85, 247, 0.75)', 0.85);
    ctx.fillStyle = '#d8b4fe';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPickups(ctx, state) {
  for (const pk of state.pickups) {
    const bobY = Math.sin(pk.bob) * 3;
    const def = PICKUPS[pk.kind];
    const blink = pk.life < 3 && Math.floor(state.time * 8) % 2 === 0;
    if (blink) continue;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowCircle(ctx, pk.x, pk.y + bobY, 30, def.color, 0.55);
    ctx.restore();
    ctx.save();
    ctx.translate(pk.x, pk.y + bobY);
    ctx.fillStyle = def.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    if (pk.kind === 'shard') {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-8, -8, 16, 16);
      ctx.strokeRect(-8, -8, 16, 16);
    } else if (pk.kind === 'spark') {
      ctx.beginPath();
      ctx.arc(-4, -2, 5, 0, Math.PI * 2);
      ctx.arc(4, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(9, 0);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(10, 8);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawParticles(ctx, state) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawFloats(ctx, state) {
  ctx.textAlign = 'center';
  for (const f of state.floats) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.font = `bold ${f.size}px ${FONT}`;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

export function drawGame(ctx, state) {
  ctx.save();
  if (state.shake > 0) {
    const s = state.shake * 8;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx, state);
  drawHeart(ctx, state);
  // On the title / victory / game-over screens the world rests: only the
  // arena and the ember show behind the panel, so no stray wisp or player
  // sprite peeks out from under it.
  const inWorld = state.phase === 'playing' || state.phase === 'paused';
  if (inWorld) {
    drawPickups(ctx, state);
    drawEnemies(ctx, state);
    drawPlayer(ctx, state);
    drawBullets(ctx, state);
  }
  drawParticles(ctx, state);
  drawFloats(ctx, state);
  ctx.restore();

  if (state.phase === 'playing' || state.phase === 'paused') drawHud(ctx, state);
  if (state.phase === 'title') drawTitle(ctx, state);
  if (state.phase === 'paused') drawPause(ctx);
  if (state.phase === 'victory') drawEndScreen(ctx, state, true);
  if (state.phase === 'gameover') drawEndScreen(ctx, state, false);

  // Low-ember warning vignette.
  if (state.phase === 'playing' && state.heartHp < 30) {
    const a = 0.12 + 0.1 * Math.sin(state.time * 5);
    const vg = ctx.createRadialGradient(480, 270, 180, 480, 270, 480);
    vg.addColorStop(0, 'rgba(255,40,40,0)');
    vg.addColorStop(1, `rgba(255,40,40,${a})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
