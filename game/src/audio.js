// PRISMBEND — sound, all synthesised in code (no audio files).
//
// WebAudio oscillators and filtered noise make every effect: a soft chime
// when a prism is placed, a glassy tick when one rotates, a bright sizzle
// while the beam burns a wisp, a low thud when the heart is bitten, and a
// slow ambient pad underneath it all. Nothing is loaded from disk, so the
// game stays offline and the dossier stays small. Audio starts only after
// the player's first gesture, as browsers require, and M toggles mute.
export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    padNodes: null,
    muted: false,
  };

  // Build the context lazily, on the first user gesture. Until then every
  // call is a silent no-op, which keeps headless playtests error-free.
  audio.ensure = () => {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = audio.muted ? 0 : 0.5;
      audio.master.connect(audio.ctx.destination);
      return true;
    } catch {
      return false;
    }
  };

  audio.setMuted = (muted) => {
    audio.muted = muted;
    if (audio.master) audio.master.gain.value = muted ? 0 : 0.5;
  };

  // One short oscillator note: frequency, duration, wave shape, volume,
  // and an optional slide to a second frequency.
  function tone(freq, dur, type, vol, slideTo) {
    if (!audio.ctx || !audio.master) return;
    const t0 = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // A burst of filtered noise: the raw material of sizzles and thuds.
  function noise(dur, vol, filterFreq, type = 'lowpass') {
    if (!audio.ctx || !audio.master) return;
    const t0 = audio.ctx.currentTime;
    const len = Math.max(1, Math.floor(audio.ctx.sampleRate * dur));
    const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = audio.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const gain = audio.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start(t0);
    src.stop(t0 + dur);
  }

  // The named effects. Each one is two or three tones at most: short,
  // distinct, and quiet enough to stack without muddying the pad.
  audio.sfx = (name) => {
    if (!audio.ctx || audio.muted) return;
    switch (name) {
      case 'place': // a glassy chime: prism set down.
        tone(660, 0.14, 'sine', 0.16);
        tone(990, 0.2, 'sine', 0.1);
        break;
      case 'rotate': // a single glass tick.
        tone(880, 0.06, 'triangle', 0.12, 1320);
        break;
      case 'error': // a dull buzz: not enough shards, bad cell.
        tone(140, 0.18, 'sawtooth', 0.1, 90);
        break;
      case 'sell': // coins back: two descending notes.
        tone(520, 0.09, 'triangle', 0.12);
        tone(392, 0.14, 'triangle', 0.12);
        break;
      case 'kill': // a bright pop as a wisp bursts.
        tone(520, 0.1, 'sine', 0.14, 1040);
        noise(0.08, 0.08, 3200, 'highpass');
        break;
      case 'burn': // a soft sizzle while the beam cooks a wisp.
        noise(0.12, 0.05, 5200, 'highpass');
        break;
      case 'hurt': // a low thud as the heart is bitten.
        tone(110, 0.25, 'sine', 0.22, 55);
        noise(0.15, 0.12, 300);
        break;
      case 'pickup': // a warm two-note lift.
        tone(784, 0.1, 'sine', 0.12);
        tone(1175, 0.16, 'sine', 0.1);
        break;
      case 'surge': // a rising shimmer as the beam flares.
        tone(392, 0.35, 'sine', 0.14, 1568);
        tone(784, 0.35, 'sine', 0.08, 2093);
        break;
      case 'wave': // a horn call as a wave begins.
        tone(220, 0.3, 'triangle', 0.14, 330);
        tone(330, 0.3, 'triangle', 0.1, 440);
        break;
      case 'clear': // a little arpeggio for a cleared wave.
        [523, 659, 784, 1047].forEach((f, i) => {
          setTimeout(() => tone(f, 0.16, 'sine', 0.12), i * 70);
        });
        break;
      case 'dim': // a murky blip as gloom dims a prism.
        tone(220, 0.3, 'sawtooth', 0.08, 110);
        break;
      case 'cleanse': // a clear ping as a prism is cleaned.
        tone(1047, 0.12, 'sine', 0.12);
        break;
      case 'win': // a long major arpeggio.
        [523, 659, 784, 1047, 1319].forEach((f, i) => {
          setTimeout(() => tone(f, 0.3, 'sine', 0.12), i * 110);
        });
        break;
      case 'lose': // a slow fall.
        tone(330, 0.6, 'sine', 0.16, 110);
        tone(220, 0.8, 'triangle', 0.1, 73);
        break;
      default:
        break;
    }
  };

  // A slow two-oscillator pad that starts on the first gesture and runs
  // under the game: a fifth, detuned, very quiet, so it never fights the
  // effects. It is built once and left running.
  audio.startAmbient = () => {
    if (!audio.ctx || audio.padNodes || audio.muted) return;
    try {
      const gain = audio.ctx.createGain();
      gain.gain.value = 0.05;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      const a = audio.ctx.createOscillator();
      a.type = 'sine';
      a.frequency.value = 110;
      const b = audio.ctx.createOscillator();
      b.type = 'sine';
      b.frequency.value = 164.8;
      const c = audio.ctx.createOscillator();
      c.type = 'triangle';
      c.frequency.value = 55;
      a.connect(filter);
      b.connect(filter);
      c.connect(filter);
      filter.connect(gain);
      gain.connect(audio.master);
      a.start();
      b.start();
      c.start();
      audio.padNodes = { gain, oscs: [a, b, c] };
    } catch {
      audio.padNodes = null;
    }
  };

  return audio;
}
