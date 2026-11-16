// The HUD and the screens: top bar (night, wave, score, combo, Ember HP,
// dash, foes left), wave banners, and the title / pause / victory /
// game-over screens. Drawing lives here; the world lives in render.js.
import { VIEW_W, VIEW_H, PALETTE, WAVES_PER_NIGHT } from './config.js';
import { FONT, fmtScore, panel, rr } from './canvas.js';
import { enemiesLeft } from './waves.js';

export function drawHud(ctx, state) {
  // Top bar: night, wave, score, combo, heart, dash, foes left.
  panel(ctx, 12, 10, 936, 46);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(`NIGHT ${state.night}/${7}`, 26, 34);
  ctx.font = `15px ${FONT}`;
  ctx.fillStyle = PALETTE.dimText;
  ctx.fillText(`WAVE ${Math.min(state.waveIndex + 1, WAVES_PER_NIGHT)}/${WAVES_PER_NIGHT}`, 152, 34);

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 22px ${FONT}`;
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
  ctx.fillStyle = 'rgba(244,241,255,0.6)';
  ctx.font = `13px ${FONT}`;
  ctx.fillText(`BEST ${fmtScore(Math.max(state.best, state.score))}`, 16, 528);

  // Controls hint, bottom-right, fades after the first night.
  if (state.night === 1 && state.waveIndex === 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(244,241,255,0.6)';
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

export function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(10, 12, 38, 0.55)';
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

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(10, 12, 38, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillText('PAUSED', 480, 250);
  ctx.font = `18px ${FONT}`;
  ctx.fillStyle = PALETTE.dimText;
  ctx.fillText('Press P or click to resume', 480, 292);
}

export function drawEndScreen(ctx, state, won) {
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
