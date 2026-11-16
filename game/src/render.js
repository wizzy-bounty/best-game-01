// Every pixel of EMBERPRISM: the night arena, the Ember Heart, the wisp,
// the HUD and the title / pause / victory / game-over screens.
// Canvas is 960x540 logical; the page scales it with CSS.
import { VIEW_W, VIEW_H, HEART, PALETTE, ENEMY_TYPES, PICKUPS, WAVES_PER_NIGHT } from './config.js';
import { enemiesLeft } from './waves.js';

const FONT = "'Trebuchet MS', Verdana, sans-serif";

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  rr(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function glowCircle(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// Scores and bests are always shown with thousands separators.
function fmtScore(n) {
  return Math.floor(n).toLocaleString('en-US');
}

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

  // Warm floor glow around the heart, fading into the dark fog.
  const floor = ctx.createRadialGradient(HEART.x, HEART.y, 20, HEART.x, HEART.y, 420);
  floor.addColorStop(0, 'rgba(122, 84, 32, 0.55)');
  floor.addColorStop(0.5, 'rgba(58, 40, 26, 0.35)');
  floor.addColorStop(1, 'rgba(13, 10, 36, 0)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Drifting fog banks, darker than the floor so the light reads.
  ctx.save();
  for (const f of state.fog) {
    const fx = ((f.x + state.time * f.speed) % (VIEW_W + 320)) - 160;
    ctx.globalAlpha = f.a;
    ctx.fillStyle = '#1b1445';
    ctx.beginPath();
    ctx.ellipse(fx, f.y, f.rx, f.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Arena rings around the heart: the line the wisps must not cross.
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(HEART.x, HEART.y, 120, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.08)';
  ctx.beginPath();
  ctx.arc(HEART.x, HEART.y, 200, 0, Math.PI * 2);
  ctx.stroke();
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
    ctx.arc(t.x, t.y, 8 * (1 - i / p.trail.length), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Aim guide: a faint beam toward the mouse.
  ctx.strokeStyle = 'rgba(126, 240, 212, 0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.angle) * 46, p.y + Math.sin(p.angle) * 46);
  ctx.stroke();

  ctx.globalCompositeOperation = 'lighter';
  glowCircle(ctx, p.x, p.y, 34, 'rgba(126, 240, 212, 0.5)', 0.8);
  ctx.restore();

  // The prism wisp: a bright diamond with a light core.
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = PALETTE.playerBody;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-8, 9);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-8, -9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.playerRim;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(2, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Prism Surge timer ring.
  if (p.surge > 0) {
    ctx.strokeStyle = '#7ef0d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, -Math.PI / 2, -Math.PI / 2 + (p.surge / 8) * Math.PI * 2);
    ctx.stroke();
  }

  // Player hearts (lives).
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < p.hp ? '#ff6b81' : 'rgba(255,255,255,0.18)';
    const hx = p.x - 14 + i * 14;
    const hy = p.y - 30;
    ctx.beginPath();
    ctx.arc(hx - 3, hy, 4, 0, Math.PI * 2);
    ctx.arc(hx + 3, hy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 6.5, hy + 1);
    ctx.lineTo(hx, hy + 8);
    ctx.lineTo(hx + 6.5, hy + 1);
    ctx.fill();
  }
}

function drawEnemies(ctx, state) {
  for (const e of state.enemies) {
    const def = ENEMY_TYPES[e.type];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glowCircle(ctx, e.x, e.y, e.r * 2.1, def.glow, 0.55);
    ctx.restore();

    // Shadow body: a dark blob with a coloured rim light.
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
    ctx.lineWidth = e.elite ? 3 : 2;
    ctx.stroke();

    // Eyes, always looking at the heart.
    const look = Math.atan2(HEART.y - e.y, HEART.x - e.x);
    const ex = Math.cos(look) * e.r * 0.3;
    const ey = Math.sin(look) * e.r * 0.3;
    const perp = look + Math.PI / 2;
    for (const s of [-1, 1]) {
      ctx.fillStyle = def.eye;
      ctx.beginPath();
      ctx.arc(ex + Math.cos(perp) * e.r * 0.32 * s, ey + Math.sin(perp) * e.r * 0.32 * s, Math.max(2, e.r * 0.14), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Boss crown + health bar for the Herald.
    if (e.type === 'herald') {
      ctx.fillStyle = '#ffd166';
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('THE NIGHT HERALD', e.x, e.y - e.r - 22);
      const bw = 120;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - bw / 2, e.y - e.r - 16, bw, 7);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(e.x - bw / 2, e.y - e.r - 16, bw * (e.hp / e.maxHp), 7);
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
    glowCircle(ctx, b.x, b.y, 14, 'rgba(255, 233, 168, 0.8)', 0.9);
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of state.ebullets) {
    glowCircle(ctx, b.x, b.y, 15, 'rgba(168, 85, 247, 0.7)', 0.85);
    ctx.fillStyle = '#d8b4fe';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
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
    glowCircle(ctx, pk.x, pk.y + bobY, 26, def.color, 0.5);
    ctx.restore();
    ctx.save();
    ctx.translate(pk.x, pk.y + bobY);
    ctx.fillStyle = def.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    if (pk.kind === 'shard') {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-7, -7, 14, 14);
      ctx.strokeRect(-7, -7, 14, 14);
    } else if (pk.kind === 'spark') {
      ctx.beginPath();
      ctx.arc(-3.5, -2, 4.5, 0, Math.PI * 2);
      ctx.arc(3.5, -2, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(0, 9);
      ctx.lineTo(8, 0);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(9, 7);
      ctx.lineTo(-9, 7);
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

function drawHud(ctx, state) {
  // Top bar: night, wave, score, combo, heart, dash, foes left.
  panel(ctx, 12, 10, 936, 46);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 17px ${FONT}`;
  ctx.fillText(`NIGHT ${state.night}/${7}`, 26, 34);
  ctx.font = `15px ${FONT}`;
  ctx.fillStyle = PALETTE.dimText;
  ctx.fillText(`WAVE ${Math.min(state.waveIndex + 1, WAVES_PER_NIGHT)}/${WAVES_PER_NIGHT}`, 150, 34);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(`SCORE ${fmtScore(state.score)}`, 480, 30);
  if (state.combo > 1) {
    ctx.fillStyle = '#ffd166';
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillText(`COMBO x${state.combo}`, 480, 48);
  }

  // Heart HP bar, right side.
  const bx = 650;
  const bw = 120;
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.dimText;
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillText('EMBER', bx, 22);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  rr(ctx, bx, 28, bw, 12, 6);
  ctx.fill();
  const frac = Math.max(0, state.heartHp / 100);
  ctx.fillStyle = frac > 0.35 ? '#ffd166' : '#ff5a5a';
  if (frac > 0) {
    rr(ctx, bx, 28, bw * frac, 12, 6);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillText(`${Math.ceil(state.heartHp)}`, bx + bw + 6, 34);

  // Dash pip + foes left.
  ctx.fillStyle = state.player.dashCooldown <= 0 ? '#7ef0d4' : 'rgba(255,255,255,0.25)';
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillText(state.player.dashCooldown <= 0 ? 'DASH READY' : 'DASH…', 858, 22);
  ctx.fillStyle = PALETTE.dimText;
  ctx.fillText(`FOES ${enemiesLeft(state)}`, 858, 40);

  // Best score, bottom-left corner.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(244,241,255,0.55)';
  ctx.font = `13px ${FONT}`;
  ctx.fillText(`BEST ${fmtScore(Math.max(state.best, state.score))}`, 16, 528);

  // Controls hint, bottom-right, fades after the first night.
  if (state.night === 1 && state.waveIndex === 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(244,241,255,0.55)';
    ctx.fillText('WASD move · MOUSE aim · HOLD CLICK fire · SHIFT dash · P pause · M mute', 944, 528);
  }

  // Wave / night banner.
  if (state.banner && state.banner.timer > 0) {
    const a = Math.min(1, state.banner.timer);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = `bold 34px ${FONT}`;
    ctx.fillText(state.banner.text, 480, 150);
    if (state.banner.sub) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = `18px ${FONT}`;
      ctx.fillText(state.banner.sub, 480, 182);
    }
    ctx.globalAlpha = 1;
  }

  // Prism Surge active notice.
  if (state.player.surge > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7ef0d4';
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(`PRISM SURGE ${state.player.surge.toFixed(0)}s — triple light!`, 480, 78);
  }
  ctx.textBaseline = 'alphabetic';
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(6, 8, 26, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.save();
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = 34;
  ctx.fillStyle = '#ffe9a8';
  ctx.font = `bold 64px ${FONT}`;
  ctx.fillText('EMBERPRISM', 480, 128);
  ctx.restore();
  ctx.fillStyle = '#7ef0d4';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText('GUARD THE LAST EMBER THROUGH SEVEN NIGHTS', 480, 162);

  panel(ctx, 230, 196, 500, 168);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `17px ${FONT}`;
  const lines = [
    'Shadow wisps crawl out of the fog to snuff the Ember Heart.',
    'You are the last Prism Wisp. Burn them with light before',
    'they reach the flame. Survive all seven nights to win.',
    '',
    'WASD / ARROWS — move      MOUSE — aim',
    'HOLD CLICK — fire light      SHIFT — dash',
    'P — pause      M — mute',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 480, 226 + i * 22));

  if (state.best > 0) {
    ctx.fillStyle = '#ffd166';
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`BEST SCORE  ${fmtScore(state.best)}`, 480, 396);
  }
  const pulse = 0.6 + 0.4 * Math.sin(state.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', 480, 436);
  ctx.globalAlpha = 1;
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(6, 8, 26, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillText('PAUSED', 480, 250);
  ctx.font = `18px ${FONT}`;
  ctx.fillStyle = PALETTE.dimText;
  ctx.fillText('Press P or click to resume', 480, 292);
}

function drawEndScreen(ctx, state, won) {
  ctx.fillStyle = won ? 'rgba(20, 26, 8, 0.62)' : 'rgba(26, 6, 12, 0.62)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.save();
  ctx.shadowColor = won ? '#ffd166' : '#ff5a5a';
  ctx.shadowBlur = 30;
  ctx.fillStyle = won ? '#ffe9a8' : '#ffb3b3';
  ctx.font = `bold 52px ${FONT}`;
  ctx.fillText(won ? 'DAWN BREAKS — YOU WIN!' : 'THE EMBER DIES…', 480, 130);
  ctx.restore();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `19px ${FONT}`;
  ctx.fillText(
    won ? 'Seven nights held. The fog lifts, and the light remains.' : 'The last ember is gone, and the fog takes the field.',
    480, 166,
  );

  const s = state.endStats || { score: state.score, kills: state.kills, nights: state.night, time: state.time, best: state.best };
  panel(ctx, 300, 200, 360, 176);
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillStyle = '#ffd166';
  ctx.fillText(`SCORE  ${fmtScore(s.score)}`, 480, 238);
  ctx.font = `17px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`Wisps banished  ${s.kills}`, 480, 272);
  ctx.fillText(`Nights held  ${Math.min(s.nights, 7)} / 7`, 480, 298);
  const mins = Math.floor(s.time / 60);
  const secs = Math.floor(s.time % 60);
  ctx.fillText(`Time  ${mins}:${String(secs).padStart(2, '0')}`, 480, 324);
  ctx.fillStyle = s.score >= s.best && s.score > 0 ? '#7ef0d4' : PALETTE.dimText;
  ctx.fillText(s.score >= s.best && s.score > 0 ? '★ NEW BEST SCORE ★' : `Best  ${fmtScore(s.best)}`, 480, 352);

  const pulse = 0.6 + 0.4 * Math.sin(state.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 21px ${FONT}`;
  ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', 480, 424);
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
  drawPickups(ctx, state);
  drawEnemies(ctx, state);
  drawPlayer(ctx, state);
  drawBullets(ctx, state);
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
