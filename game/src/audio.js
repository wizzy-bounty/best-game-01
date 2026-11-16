// All sound is synthesised with WebAudio — no audio files, no network.
// The context is created on the first user gesture, so the title screen
// stays silent until the player starts.
let ctx = null;
let master = null;
let muted = false;
let pad = null;

export function ensureAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.45;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    // Audio is decoration; a failure here must never break the game.
  }
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.45;
  return muted;
}

function tone({ freq = 440, end = null, dur = 0.12, type = 'sine', vol = 0.2, delay = 0 }) {
  if (!ctx || !master || muted) return;
  try {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (end !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    // Ignore synth errors.
  }
}

function noise({ dur = 0.15, vol = 0.15, low = 400, high = 4000, delay = 0 }) {
  if (!ctx || !master || muted) return;
  try {
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = (low + high) / 2;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  } catch {
    // Ignore synth errors.
  }
}

export const sfx = {
  shoot() {
    tone({ freq: 880, end: 320, dur: 0.09, type: 'triangle', vol: 0.12 });
  },
  hit() {
    noise({ dur: 0.05, vol: 0.08, low: 800, high: 2400 });
  },
  kill(big = false) {
    tone({ freq: big ? 392 : 523, end: big ? 98 : 196, dur: big ? 0.35 : 0.18, type: 'sine', vol: 0.2 });
    tone({ freq: big ? 587 : 784, end: big ? 147 : 392, dur: 0.14, type: 'triangle', vol: 0.1, delay: 0.02 });
    if (big) noise({ dur: 0.3, vol: 0.14, low: 200, high: 1200 });
  },
  heartHurt() {
    tone({ freq: 110, end: 55, dur: 0.35, type: 'sawtooth', vol: 0.22 });
    noise({ dur: 0.2, vol: 0.12, low: 100, high: 600 });
  },
  playerHurt() {
    tone({ freq: 220, end: 110, dur: 0.25, type: 'square', vol: 0.12 });
  },
  pickup() {
    tone({ freq: 660, dur: 0.1, type: 'sine', vol: 0.16 });
    tone({ freq: 990, dur: 0.14, type: 'sine', vol: 0.16, delay: 0.07 });
  },
  dash() {
    noise({ dur: 0.18, vol: 0.1, low: 1200, high: 5000 });
  },
  waveClear() {
    tone({ freq: 523, dur: 0.12, type: 'triangle', vol: 0.16 });
    tone({ freq: 659, dur: 0.12, type: 'triangle', vol: 0.16, delay: 0.09 });
    tone({ freq: 784, dur: 0.2, type: 'triangle', vol: 0.16, delay: 0.18 });
  },
  nightClear() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.16, delay: i * 0.1 }));
  },
  victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'triangle', vol: 0.18, delay: i * 0.12 }));
  },
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, dur: 0.35, type: 'sine', vol: 0.18, delay: i * 0.16 }));
  },
  click() {
    tone({ freq: 700, dur: 0.05, type: 'triangle', vol: 0.1 });
  },
};

// A soft two-voice pad that hums under play, so the game has music
// without shipping a single audio file.
export function startPad() {
  if (!ctx || !master || pad) return;
  try {
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    gain.connect(master);
    const voices = [];
    for (const freq of [110, 164.81, 220]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start();
      voices.push(osc);
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    pad = { gain, voices, lfo };
  } catch {
    pad = null;
  }
}

export function stopPad() {
  if (!pad) return;
  try {
    for (const osc of pad.voices) osc.stop();
    pad.lfo.stop();
    pad.gain.disconnect();
  } catch {
    // Already stopped.
  }
  pad = null;
}
