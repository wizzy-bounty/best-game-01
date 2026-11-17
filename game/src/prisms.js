// PRISMBEND — prisms: the glass the player places, turns and sells.
//
// A prism is one row of the game's state: its kind, its cell, its rotation,
// and whether gloom has dimmed it. This file owns the rules of prisms —
// what they cost, where they may stand, how they turn — and nothing else.
// How a prism bends a beam lives in beam.js; how one looks lives in
// render.js. Keeping those three apart is what lets each file stay small
// and named for one job.
import { PRISM_TYPES, SELL_REFUND, DIM_SECONDS } from './config.js';
import { isFreeCell, isHeartCell, cellCenter } from './grid.js';

let nextPrismId = 1;

// The prism at a cell, or null when the cell is empty.
export function prismAt(state, col, row) {
  return state.prisms.find((p) => p.col === col && p.row === row) || null;
}

// The prism with this id, or null.
export function prismById(state, id) {
  return state.prisms.find((p) => p.id === id) || null;
}

// Try to place a prism of this kind on this cell. Returns the new prism
// on success, or null with a reason when the placement is illegal: the
// caller shows the reason and plays the error sound.
export function placePrism(state, kind, col, row) {
  const def = PRISM_TYPES[kind];
  if (!def) return { ok: false, reason: 'Unknown prism.' };
  if (!isFreeCell(state, col, row)) {
    if (isHeartCell(col, row)) return { ok: false, reason: 'Sacred ground — the heart needs open floor.' };
    return { ok: false, reason: 'That cell already holds a prism.' };
  }
  if (state.shards < def.cost) {
    return { ok: false, reason: `Need ${def.cost} shards.` };
  }
  const center = cellCenter(col, row);
  const prism = {
    id: nextPrismId++,
    kind,
    col,
    row,
    x: center.x,
    y: center.y,
    rot: 0, // mirror "/" or splitter "fork left" to start.
    dimmed: false,
    dimTimer: 0,
    born: state.time, // a fresh prism fades in over its first half second.
  };
  state.prisms.push(prism);
  state.shards -= def.cost;
  state.selectedPrismId = prism.id;
  return { ok: true, prism };
}

// Turn a prism to its next rotation. A mirror flips between its two panes;
// a splitter flips which side the fork bends to; a lens has one rotation
// and turning it does nothing at all.
export function rotatePrism(prism) {
  const def = PRISM_TYPES[prism.kind];
  if (!def || def.rotations <= 1) return false;
  prism.rot = (prism.rot + 1) % def.rotations;
  return true;
}

// Sell a prism back for half its cost and take it off the board.
export function sellPrism(state, prism) {
  const def = PRISM_TYPES[prism.kind];
  const refund = Math.floor(def.cost * SELL_REFUND);
  state.shards += refund;
  state.prisms = state.prisms.filter((p) => p.id !== prism.id);
  if (state.selectedPrismId === prism.id) state.selectedPrismId = null;
  return refund;
}

// Dim a prism with gloom: for DIM_SECONDS it stops the beam dead instead
// of bending it. Called by a spitter's gloom orb when it lands.
export function dimPrism(prism) {
  if (prism.dimmed) {
    prism.dimTimer = DIM_SECONDS; // a second hit refreshes the gloom.
    return;
  }
  prism.dimmed = true;
  prism.dimTimer = DIM_SECONDS;
}

// Wash the gloom off a dimmed prism. Clicking a dimmed prism cleanses it
// for free — the cost is the player's attention, mid-wave.
export function cleansePrism(prism) {
  prism.dimmed = false;
  prism.dimTimer = 0;
}

// Tick every prism's dim timer down; a prism whose gloom runs out shines
// again on its own. Called once a frame from the main update.
export function updatePrisms(state, dt) {
  for (const prism of state.prisms) {
    if (prism.dimmed) {
      prism.dimTimer -= dt;
      if (prism.dimTimer <= 0) cleansePrism(prism);
    }
  }
}

// How many prisms of each kind stand on the board, for the HUD counts.
export function prismCounts(state) {
  const counts = { mirror: 0, splitter: 0, lens: 0 };
  for (const prism of state.prisms) counts[prism.kind] += 1;
  return counts;
}
