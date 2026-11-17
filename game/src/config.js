// PRISMBEND — balance and tuning in one place.
//
// A light-routing defence game: the Ember Heart shines one beam of light
// across the arena, and the player bends that beam with prisms so it burns
// the shadow wisps crawling in from the fog. Nothing here shoots. A wisp
// only dies when a beam touches it, so the whole game is about shaping
// light: where the prisms stand, which way they face, and when to surge.
//
// The arena is a grid of 48 px cells (20 columns x 11 rows) over a
// 960 x 540 view. The heart sits in the middle; the 3 x 3 cells around it
// are sacred ground and can never hold a prism.

export const VIEW_W = 960;
export const VIEW_H = 540;

// ---------------------------------------------------------------- grid ---
export const CELL = 48;
export const GRID_COLS = 20;
export const GRID_ROWS = 11;
export const GRID_Y0 = 6; // the grid starts 6 px below the top edge.

// The heart cell (column 10, row 5) plus its eight neighbours are blocked.
export const HEART_CELL = { col: 10, row: 5 };

// ------------------------------------------------------------- the heart ---
export const HEART = {
  x: VIEW_W / 2,
  y: VIEW_H / 2,
  r: 30,
  maxHp: 100,
};

// ------------------------------------------------------------ the beam -----
// The beam leaves the heart toward the mouse and is re-shaped by every
// prism it crosses. Base burn is per second of contact; a wisp keeps
// burning briefly after it leaves the light (BURN_LINGER), which is what
// makes a crossing kill instead of merely scorching.
export const BEAM = {
  dps: 6.0, // base burn damage per second inside a plain beam.
  width: 12, // half-width is width / 2; the visible core is thinner.
  glowWidth: 30, // the soft outer glow drawn around the core.
  maxSegments: 48, // hard cap on traced segments per frame.
  maxRays: 24, // hard cap on rays (splitters fork the beam).
  maxBounces: 14, // hard cap on prism hits along one ray.
  step: 3, // ray-march step in pixels.
  surgeDpsMult: 3, // surge multiplies burn damage.
  surgeWidthMult: 1.6, // ...and widens every beam while it lasts.
  surgeSeconds: 3, // how long a surge burns.
  surgeCooldown: 10, // seconds before the next surge is ready.
  sweepSpeed: 0, // the beam does NOT auto-rotate: the mouse aims it.
};

export const BURN_LINGER = 0.6; // seconds a wisp keeps burning off-beam.

// -------------------------------------------------------------- prisms -----
// Three prism kinds. Each one is a glass construct the player places on a
// free grid cell. Rotating is free; placing costs shards; selling refunds
// half. A prism the spitter's gloom has dimmed stops the beam dead until
// the player clicks it clean again.
export const PRISM_TYPES = {
  mirror: {
    name: 'MIRROR PRISM',
    short: 'Mirror',
    cost: 30,
    key: '1',
    // A mirror is a diagonal pane of glass. Rotation 0 is the "/" pane
    // (east becomes north, north becomes east); rotation 1 is the "\"
    // pane (east becomes south, south becomes east). Any incoming angle
    // reflects across the pane, not just the four cardinals.
    rotations: 2,
    power: 1, // the beam keeps its power through a mirror.
    widthMult: 1,
    color: '#8fd8ff',
    core: '#dff4ff',
    blurb: 'Bends the beam 90 degrees. Click a placed mirror to flip it.',
  },
  splitter: {
    name: 'SPLIT PRISM',
    short: 'Splitter',
    cost: 60,
    key: '2',
    // A splitter lets the beam pass straight through and forks a second
    // beam off at a right angle. Rotation 0 forks to the beam's left,
    // rotation 1 to its right. The fork is a little weaker than the trunk.
    rotations: 2,
    power: 1,
    branchPower: 0.8,
    widthMult: 1,
    color: '#c9a2ff',
    core: '#f3e8ff',
    blurb: 'Splits the beam in two: straight on, plus a 90-degree fork.',
  },
  lens: {
    name: 'FOCUS LENS',
    short: 'Lens',
    cost: 50,
    key: '3',
    // A lens lets the beam pass straight through, focused: wider, hotter,
    // and bright white-gold. Only a focused beam can burn a shade wisp,
    // which is why the lens exists at all. A lens has no rotation.
    rotations: 1,
    power: 2.5, // a focused beam burns two-and-a-half times as hot.
    widthMult: 1.8,
    color: '#ffe9a8',
    core: '#fffbe8',
    blurb: 'Focuses the beam: wider, hotter, and the only light that burns shades.',
  },
};

export const PRISM_ORDER = ['mirror', 'splitter', 'lens'];
export const SELL_REFUND = 0.5; // selling a prism refunds half its cost.
export const DIM_SECONDS = 5; // how long gloom dims a prism.

// --------------------------------------------------------------- wisps -----
// The things in the fog. Every wisp crawls toward the heart and bites it
// on arrival. Speeds are pixels per second; hp is in burn points.
export const WISP_TYPES = {
  wisp: {
    hp: 3, speed: 42, r: 15, score: 100, shards: 15, damage: 8,
    body: '#3d3480', rim: '#a89bff', eye: '#ffffff', glow: 'rgba(139,123,255,0.65)',
    blurb: 'A plain shadow wisp. One good crossing of the beam ends it.',
  },
  swift: {
    hp: 2, speed: 92, r: 12, score: 150, shards: 20, damage: 6,
    body: '#6e2a68', rim: '#ff8fe0', eye: '#fff0fa', glow: 'rgba(255,122,217,0.65)',
    blurb: 'Small and fast. It crosses the beam quickly, so it needs a hot beam.',
  },
  brute: {
    hp: 14, speed: 26, r: 26, score: 300, shards: 35, damage: 18,
    body: '#2c3d63', rim: '#93c0ff', eye: '#ffffff', glow: 'rgba(127,178,255,0.65)',
    blurb: 'A slow, armoured hulk. It soaks several crossings or one focused beam.',
  },
  spitter: {
    hp: 4, speed: 38, r: 16, score: 200, shards: 30, damage: 10,
    shoots: true, shootRange: 215, shootInterval: 3.4,
    body: '#4e2f6e', rim: '#d0a2ff', eye: '#ffffff', glow: 'rgba(192,132,252,0.65)',
    blurb: 'Stops at range and spits gloom that dims a prism for five seconds.',
  },
  shade: {
    hp: 6, speed: 55, r: 17, score: 250, shards: 30, damage: 12,
    needsFocus: true, // a plain beam cannot hurt it at all.
    body: '#120e26', rim: '#5c5470', eye: '#ffd166', glow: 'rgba(92,84,112,0.55)',
    blurb: 'A shade drinks plain light. Only a focused (lens) beam can burn it.',
  },
  herald: {
    hp: 110, speed: 18, r: 44, score: 2000, shards: 200, damage: 30, boss: true,
    body: '#2a1e52', rim: '#ffd166', eye: '#fff3c4', glow: 'rgba(255,209,102,0.7)',
    blurb: 'The Night Herald. It calls wisps to its side while it crawls.',
  },
};

// How long a kill chain lasts before the combo resets to x1.
export const COMBO_WINDOW = 3.0;
export const COMBO_MAX = 8;

// ------------------------------------------------------- nights and waves --
// Seven nights, three waves a night. The last wave of night 7 brings the
// Night Herald, and clearing it wins the game.
export const NIGHTS = 7;
export const WAVES_PER_NIGHT = 3;
export const BUILD_SECONDS = 7; // seconds to place prisms before a wave.
export const FIRST_BUILD_SECONDS = 10; // longer before the very first wave.

export function nightName(night) {
  const names = [
    'FIRST LIGHT',
    'THE FOG THICKENS',
    'WHISPERS IN THE DARK',
    'THE SWIFT ONES COME',
    'SHADES IN THE MIST',
    'EMBER UNDER SIEGE',
    'THE NIGHT HERALD',
  ];
  return names[night - 1] ?? `NIGHT ${night}`;
}

// A wave is a queue of wisp kinds, dealt out over time. The queue is built
// from the run's own seeded random, never Math.random, so a shot scene and
// a replay of the same seed deal the same wave.
export function buildNightPlan(night, rng) {
  const waves = [];
  for (let w = 0; w < WAVES_PER_NIGHT; w++) {
    const count = 5 + night * 2 + w * 3;
    const queue = [];
    for (let i = 0; i < count; i++) {
      const roll = rng.next();
      if (night >= 5 && roll < 0.14) queue.push('shade');
      else if (night >= 4 && roll < 0.26) queue.push('spitter');
      else if (night >= 3 && roll < 0.42) queue.push('brute');
      else if (night >= 2 && roll < 0.68) queue.push('swift');
      else queue.push('wisp');
    }
    // Night 7, last wave: the Herald leads, wisps escort it.
    if (night === NIGHTS && w === WAVES_PER_NIGHT - 1) {
      queue.unshift('herald');
      queue.push('wisp', 'wisp', 'swift', 'swift', 'shade');
    }
    waves.push({
      queue,
      spawned: 0,
      timer: 1.4,
      interval: Math.max(0.45, 1.1 - night * 0.06 - w * 0.05),
    });
  }
  return waves;
}

// Enemy health grows a little every night so later nights stay tense.
export function hpScale(night) {
  return 1 + (night - 1) * 0.16;
}

// From night 5, some enemies arrive gilded: tougher, faster, worth double.
export function eliteChance(night) {
  return night >= 5 ? 0.1 + (night - 5) * 0.05 : 0;
}

// -------------------------------------------------------------- pickups -----
// Kills sometimes drop a pickup. A pickup drifts where it fell until the
// player clicks it (a generous radius), or a beam sweeps over it — light
// collects light. A spark heals the heart, a shard pays out score.
export const PICKUPS = {
  spark: { heal: 12, score: 0, color: '#ff6b81', label: '+12 EMBER', chance: 0.09 },
  shard: { heal: 0, score: 150, color: '#ffd166', label: '+150', chance: 0.12 },
};

export const START_SHARDS = 60;

// ---------------------------------------------------------------- palette --
export const PALETTE = {
  skyTop: '#1c1440',
  skyBottom: '#3d1f5e',
  floorCenter: '#4a2c12',
  floorEdge: '#0c091f',
  gridLine: 'rgba(150, 130, 255, 0.10)',
  gridHover: 'rgba(255, 233, 168, 0.20)',
  heartCore: '#ffd166',
  heartMid: '#ff9f43',
  heartOuter: '#ff6b35',
  beamCore: '#fff7d6',
  beamGlow: 'rgba(255, 209, 102, 0.55)',
  focusCore: '#ffffff',
  focusGlow: 'rgba(255, 240, 180, 0.8)',
  text: '#f6f2ff',
  dimText: '#cfc9ec',
  gold: '#ffd166',
  panel: 'rgba(12, 12, 36, 0.86)',
  panelEdge: 'rgba(255, 209, 102, 0.5)',
  danger: '#ff6b81',
  teal: '#7ef0d4',
};
