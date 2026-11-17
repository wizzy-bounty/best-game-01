// PRISMBEND — the beam: traced, bent, split and focused, every frame.
//
// The Ember Heart shines one beam toward the mouse. This file walks that
// beam across the arena in small steps, and every time it enters a cell
// holding a prism it does what the prism says: a mirror reflects it, a
// splitter forks a second beam off at a right angle, a lens focuses it
// hotter and wider. A dimmed prism swallows the beam whole. The walk ends
// at the arena edge, after too many bounces, or when the segment budget
// runs out — whichever comes first — so a pathological layout of prisms
// can never hang the frame.
//
// The same file burns the wisps: any wisp whose body touches a beam
// segment takes burn damage, and keeps burning briefly after it leaves
// the light. A shade wisp drinks plain light and only burns in a focused
// beam, which is the lens's whole reason to exist.
import { BEAM, BURN_LINGER, HEART, PRISM_TYPES, VIEW_W, VIEW_H } from './config.js';
import { pointToCell, cellKey } from './grid.js';
import { prismAt } from './prisms.js';
import { damageWisp } from './wisps.js';
import { ember } from './particles.js';

// Reflect a travel angle across a mirror pane. Rotation 0 is the "/"
// pane (its line runs north-east), rotation 1 is the "\" pane (its line
// runs south-east). The reflection works for any incoming angle, not
// just the four cardinals: v' = 2 (v . u) u - v, with u the pane's line.
export function reflectAngle(angle, rot) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  // The pane's unit line: "/" is (1, -1) / sqrt(2), "\" is (1, 1) / sqrt(2).
  const ux = 0.70710678;
  const uy = rot === 0 ? -0.70710678 : 0.70710678;
  const dot = dx * ux + dy * uy;
  const rx = 2 * dot * ux - dx;
  const ry = 2 * dot * uy - dy;
  return Math.atan2(ry, rx);
}

// Trace the whole beam network from the heart and store it on the state
// as state.beams: an array of segments {x1, y1, x2, y2, power, width,
// focused}. The renderer draws exactly these segments, and burnWisps
// reads exactly them, so what the player sees is what kills.
export function traceBeams(state) {
  const segments = [];
  const surge = state.surge.active;
  const dpsMult = surge ? BEAM.surgeDpsMult : 1;
  const widthMult = surge ? BEAM.surgeWidthMult : 1;
  const rays = [
    {
      x: HEART.x,
      y: HEART.y,
      angle: state.aimAngle,
      power: 1 * dpsMult,
      width: BEAM.width * widthMult,
      depth: 0, // fork depth: a splitter only forks while depth < 2.
    },
  ];
  let raysTraced = 0;

  while (rays.length > 0 && raysTraced < BEAM.maxRays && segments.length < BEAM.maxSegments) {
    const ray = rays.shift();
    raysTraced += 1;
    traceRay(state, ray, segments, rays, dpsMult, widthMult);
  }
  state.beams = segments;
}

// Walk one ray until it dies: at the arena edge, inside a dimmed prism,
// after BEAM.maxBounces prism hits, or past 1,400 px of travel. New rays
// a splitter forks are pushed onto the shared queue, to be walked next.
function traceRay(state, ray, segments, rays, dpsMult, widthMult) {
  let px = ray.x;
  let py = ray.y;
  let angle = ray.angle;
  let power = ray.power;
  let width = ray.width;
  const depth = ray.depth ?? 0;
  // Where the current drawn segment starts: the ray's origin, then each
  // prism it bends through. The long stretch between two prisms is one
  // segment — the renderer draws it and the burn test reads it, so a
  // segment must never be just the last 3 px step before a prism.
  let sx = ray.x;
  let sy = ray.y;
  const visited = new Set();
  // A fork ray starts in its own splitter's cell: mark that cell visited
  // up front, or the ray re-triggers its own splitter on the first step
  // and spends the segment budget on zero-length segments.
  const startCell = pointToCell(ray.x, ray.y);
  if (startCell) visited.add(cellKey(startCell.col, startCell.row));
  let travelled = 0;
  let bounces = 0;

  while (travelled < 1400 && bounces < BEAM.maxBounces && segments.length < BEAM.maxSegments) {
    const nx = px + Math.cos(angle) * BEAM.step;
    const ny = py + Math.sin(angle) * BEAM.step;

    // Off the arena: the beam ends at the edge.
    if (nx < 0 || nx > VIEW_W || ny < 0 || ny > VIEW_H) {
      const t = Math.min(
        nx < 0 ? (0 - px) / (nx - px) : 1,
        nx > VIEW_W ? (VIEW_W - px) / (nx - px) : 1,
        ny < 0 ? (0 - py) / (ny - py) : 1,
        ny > VIEW_H ? (VIEW_H - py) / (ny - py) : 1,
      );
      const ex = px + (nx - px) * Math.max(0, t);
      const ey = py + (ny - py) * Math.max(0, t);
      segments.push({ x1: sx, y1: sy, x2: ex, y2: ey, power, width, focused: power >= 2 });
      return;
    }

    // A prism cell this ray has not bent through yet.
    const cell = pointToCell(nx, ny);
    if (cell) {
      const key = cellKey(cell.col, cell.row);
      if (!visited.has(key)) {
        const prism = prismAt(state, cell.col, cell.row);
        if (prism) {
          visited.add(key);
          bounces += 1;
          // The beam always ends its segment at the prism's centre, so
          // the drawn beam visibly passes through the glass — and the
          // segment starts where the previous one ended, not where the
          // ray happened to be one step before the prism.
          segments.push({ x1: sx, y1: sy, x2: prism.x, y2: prism.y, power, width, focused: power >= 2 });
          px = prism.x;
          py = prism.y;
          sx = prism.x;
          sy = prism.y;
          if (prism.dimmed) return; // gloom swallows the beam whole.
          if (prism.kind === 'mirror') {
            angle = reflectAngle(angle, prism.rot);
          } else if (prism.kind === 'splitter') {
            // The trunk carries on straight; the fork leaves at a right
            // angle, left for rotation 0 and right for rotation 1 — but
            // only while this ray is still shallow: a fork of a fork of
            // a fork would blow the segment budget on noise.
            if (depth < 2) {
              const fork = angle + (prism.rot === 0 ? Math.PI / 2 : -Math.PI / 2);
              rays.push({
                x: prism.x,
                y: prism.y,
                angle: fork,
                power: power * PRISM_TYPES.splitter.branchPower,
                width: width * 0.85,
                depth: depth + 1,
              });
            }
          } else if (prism.kind === 'lens') {
            // A lens focuses the beam: hotter and wider, straight on.
            power = Math.max(power, PRISM_TYPES.lens.power * dpsMult);
            width = width * PRISM_TYPES.lens.widthMult;
          }
          continue;
        }
      }
    }

    px = nx;
    py = ny;
    travelled += BEAM.step;
  }

  // Ran out of road without hitting an edge or a prism: end where it is.
  segments.push({ x1: sx, y1: sy, x2: px, y2: py, power, width, focused: power >= 2 });
}

// Distance from a point to a segment, squared — the burn test works on
// squared distances and never takes a square root per wisp per segment.
function distToSegSq(px, py, s) {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - s.x1) * dx + (py - s.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = s.x1 + t * dx;
  const cy = s.y1 + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey;
}

// Burn every wisp touching a beam segment, and let lingering burns tick.
// Called once per frame, after traceBeams. A wisp in the beam also throws
// off a few embers so the player can see exactly what is burning.
export function burnWisps(state, dt) {
  for (const wisp of state.wisps) {
    let inBeam = null;
    for (const seg of state.beams) {
      const reach = seg.width / 2 + wisp.r;
      if (distToSegSq(wisp.x, wisp.y, seg) <= reach * reach) {
        inBeam = seg;
        break;
      }
    }

    if (inBeam) {
      if (wisp.needsFocus && inBeam.power < 2) {
        // A shade in plain light: immune. Flash its shell so the player
        // learns the rule from the game itself, not from a manual.
        wisp.immuneFlash = 0.25;
        wisp.burnTimer = 0;
      } else {
        const dmg = inBeam.power * BEAM.dps * dt;
        damageWisp(state, wisp, dmg);
        wisp.burnTimer = BURN_LINGER;
        wisp.lastPower = inBeam.power;
        if (state.rng.chance(0.35)) {
          ember(state, wisp.x, wisp.y, inBeam.focused ? '#fff3c4' : '#ffd166');
        }
        if (state.rng.chance(0.06)) state.audio.sfx('burn');
      }
    } else if (wisp.burnTimer > 0) {
      // Linger burn: half strength, from the last beam that touched it.
      wisp.burnTimer -= dt;
      const dmg = (wisp.lastPower || 1) * BEAM.dps * 0.5 * dt;
      damageWisp(state, wisp, dmg);
      if (state.rng.chance(0.2)) ember(state, wisp.x, wisp.y, '#ff9f43');
    }

    if (wisp.immuneFlash > 0) wisp.immuneFlash -= dt;
  }
  // The dead are removed by damageWisp's kill path; sweep the list clean.
  state.wisps = state.wisps.filter((w) => w.hp > 0);
}
