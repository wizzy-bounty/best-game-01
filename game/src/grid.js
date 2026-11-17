// PRISMBEND — the placement grid.
//
// The arena floor is a grid of 48 px cells. Prisms live in cells; the
// beam is traced across them; the mouse hovers them. This file is the only
// place that knows how view coordinates map to cells, so the rest of the
// game never does the arithmetic itself.
import { CELL, GRID_COLS, GRID_ROWS, GRID_Y0, HEART_CELL } from './config.js';

// The centre of a cell, in view coordinates.
export function cellCenter(col, row) {
  return { x: col * CELL + CELL / 2, y: GRID_Y0 + row * CELL + CELL / 2 };
}

// The cell a view point falls in, or null when the point is off the grid.
export function pointToCell(x, y) {
  const col = Math.floor(x / CELL);
  const row = Math.floor((y - GRID_Y0) / CELL);
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
  return { col, row };
}

// A stable string key for a cell, used by the beam tracer's visited set.
export function cellKey(col, row) {
  return `${col},${row}`;
}

// True when the cell is one of the nine sacred cells around the heart.
// The heart needs open floor around it: the beam leaves from there, and a
// prism pressed against it would look wrong and play worse.
export function isHeartCell(col, row) {
  return Math.abs(col - HEART_CELL.col) <= 1 && Math.abs(row - HEART_CELL.row) <= 1;
}

// True when a prism may be placed on this cell: on the grid, not sacred,
// and not already holding a prism.
export function isFreeCell(state, col, row) {
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
  if (isHeartCell(col, row)) return false;
  return !state.prisms.some((p) => p.col === col && p.row === row);
}

// Every cell centre in the arena, row by row — used by the renderer to
// draw the grid and by shot scenes to place prisms without arithmetic.
export function allCellCenters() {
  const cells = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      cells.push({ col, row, ...cellCenter(col, row) });
    }
  }
  return cells;
}
