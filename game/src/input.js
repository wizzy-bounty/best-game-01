// Keyboard + mouse, converted into the game's 960x540 logical space.
// The canvas keeps a 16:9 aspect in CSS, so logical coordinates are a
// straight scale of the element's bounding box.
import { VIEW_W, VIEW_H } from './config.js';

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: VIEW_W / 2, y: VIEW_H / 2 - 140, down: false, rightDown: false };
  const clicks = [];
  let anyKey = null;

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW_W,
      y: ((clientY - rect.top) / rect.height) * VIEW_H,
    };
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (!e.repeat) {
      keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      anyKey = e.key;
    }
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    mouse.down = false;
    mouse.rightDown = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const p = toLogical(e.clientX, e.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = toLogical(e.clientX, e.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    if (e.button === 0) mouse.down = true;
    if (e.button === 2) mouse.rightDown = true;
    clicks.push({ x: p.x, y: p.y, button: e.button });
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.down = false;
    if (e.button === 2) mouse.rightDown = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    keys,
    mouse,
    // Movement keys, as a normalised direction vector.
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    pressed(code) {
      return keys.has(code);
    },
    takeAnyKey() {
      const k = anyKey;
      anyKey = null;
      return k;
    },
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
  };
}
