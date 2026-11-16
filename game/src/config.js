// EMBERPRISM — balance and tuning in one place.
// A top-down arena defence: one prism wisp guards the last Ember Heart
// against shadow wisps that crawl out of the fog, for seven nights.
export const VIEW_W = 960;
export const VIEW_H = 540;

export const HEART = { x: VIEW_W / 2, y: VIEW_H / 2, r: 34, maxHp: 100 };

export const PLAYER = {
  r: 16,
  speed: 255,
  fireInterval: 0.15,
  bulletSpeed: 580,
  bulletDamage: 1,
  dashSpeed: 760,
  dashTime: 0.16,
  dashCooldown: 1.5,
  maxHp: 3,
  respawnDelay: 1.5,
};

// How long a kill chain lasts before the combo resets.
export const COMBO_WINDOW = 2.5;

export const ENEMY_TYPES = {
  wisp: {
    hp: 3, speed: 48, r: 18, score: 100, damage: 8,
    body: '#453a8f', rim: '#a89bff', eye: '#ffffff', glow: 'rgba(139,123,255,0.7)',
  },
  swift: {
    hp: 2, speed: 96, r: 14, score: 150, damage: 6,
    body: '#7a2f74', rim: '#ff8fe0', eye: '#fff0fa', glow: 'rgba(255,122,217,0.7)',
  },
  brute: {
    hp: 13, speed: 27, r: 31, score: 300, damage: 18,
    body: '#33456e', rim: '#93c0ff', eye: '#ffffff', glow: 'rgba(127,178,255,0.7)',
  },
  spitter: {
    hp: 4, speed: 40, r: 19, score: 200, damage: 10, shoots: true, shootRange: 250, shootInterval: 2.4,
    body: '#5a3678', rim: '#d0a2ff', eye: '#ffffff', glow: 'rgba(192,132,252,0.7)',
  },
  herald: {
    hp: 95, speed: 19, r: 50, score: 2000, damage: 30, boss: true,
    body: '#33255e', rim: '#ffd166', eye: '#fff3c4', glow: 'rgba(255,209,102,0.7)',
  },
};

// Nights run 1..7. Each night has three waves; the last wave of night 7
// brings the Night Herald.
export const NIGHTS = 7;
export const WAVES_PER_NIGHT = 3;

export function nightName(night) {
  const names = [
    'FIRST LIGHT',
    'THE FOG THICKENS',
    'WHISPERS IN THE DARK',
    'THE SWIFT ONES COME',
    'EMBER UNDER SIEGE',
    'THE LONGEST NIGHT',
    'THE NIGHT HERALD',
  ];
  return names[night - 1] ?? `NIGHT ${night}`;
}

// A wave is a queue of enemy kinds, dealt out over time.
export function buildNightPlan(night) {
  const waves = [];
  for (let w = 0; w < WAVES_PER_NIGHT; w++) {
    const count = 5 + night * 2 + w * 3;
    const queue = [];
    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      if (night >= 4 && roll < 0.12) queue.push('spitter');
      else if (night >= 3 && roll < 0.26) queue.push('brute');
      else if (night >= 2 && roll < 0.52) queue.push('swift');
      else queue.push('wisp');
    }
    // Night 7, last wave: the Herald leads, wisps escort it.
    if (night === NIGHTS && w === WAVES_PER_NIGHT - 1) {
      queue.unshift('herald');
      queue.push('wisp', 'wisp', 'swift', 'swift');
    }
    waves.push({
      queue,
      spawned: 0,
      timer: 1.2,
      interval: Math.max(0.42, 1.05 - night * 0.06 - w * 0.05),
    });
  }
  return waves;
}

// Enemy health grows a little every night so later nights stay tense.
export function hpScale(night) {
  return 1 + (night - 1) * 0.18;
}

// From night 5, some enemies arrive gilded: tougher, faster, worth double.
export function eliteChance(night) {
  return night >= 5 ? 0.12 + (night - 5) * 0.04 : 0;
}

export const PICKUPS = {
  shard: { score: 150, color: '#ffd166', label: '+150' },
  spark: { heal: 12, color: '#ff6b81', label: '+12 EMBER' },
  surge: { seconds: 8, color: '#7ef0d4', label: 'PRISM SURGE!' },
};

export const PALETTE = {
  skyTop: '#232a5e',
  skyBottom: '#3a2a68',
  floorCenter: '#4a3416',
  floorEdge: '#0d0a24',
  heartCore: '#ffd166',
  heartMid: '#ff9f43',
  heartOuter: '#ff6b35',
  playerBody: '#e8fbff',
  playerRim: '#7ef0d4',
  bullet: '#ffe9a8',
  text: '#f4f1ff',
  dimText: '#cfc9ec',
  panel: 'rgba(12, 14, 40, 0.84)',
  panelEdge: 'rgba(126, 240, 212, 0.45)',
};
