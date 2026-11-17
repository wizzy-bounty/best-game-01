// PRISMBEND — mouse and keyboard state.
//
// One object owns every input the game reads. The canvas reports the mouse
// in view coordinates (the 960 x 540 the game draws in), whatever size the
// canvas is shown at on screen. Keys are tracked as a set of codes held
// down, plus a queue of keys pressed since the last frame so the game can
// answer a tap exactly once (rotate, surge, pause, restart).
export function createInput(canvas) {
  const input = {
    mouse: { x: 0, y: 0, inside: false },
    keys: new Set(),
    pressed: [], // key codes pressed since the last call to endFrame().
    // Clicks are queued, not level-tracked: a mousedown and mouseup that
    // both land between two frames would otherwise vanish entirely on a
    // slow (software-rendered) display, and a click must never be lost.
    leftClicks: [], // {x, y} in view coordinates, since the last frame.
    rightClicks: [],
    leftDown: false,
    rightDown: false,
  };

  function toView(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 960,
      y: ((event.clientY - rect.top) / rect.height) * 540,
    };
  }

  canvas.addEventListener('mousemove', (event) => {
    const p = toView(event);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    input.mouse.inside = true;
  });
  canvas.addEventListener('mouseleave', () => {
    input.mouse.inside = false;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      input.leftDown = true;
      const p = toView(event);
      input.leftClicks.push(p);
    }
    if (event.button === 2) {
      input.rightDown = true;
      const p = toView(event);
      input.rightClicks.push(p);
    }
  });
  canvas.addEventListener('mouseup', (event) => {
    if (event.button === 0) input.leftDown = false;
    if (event.button === 2) input.rightDown = false;
  });
  // No context menu: right-click sells a prism, it never opens a menu.
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  window.addEventListener('keydown', (event) => {
    // Space scrolls the page and arrows move it; the game owns those keys.
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.push(event.code);
    input.keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.leftDown = false;
    input.rightDown = false;
  });

  // True while the key is held down.
  input.isDown = (code) => input.keys.has(code);

  // True if the key was pressed since the last frame (a tap, not a hold).
  input.wasPressed = (code) => input.pressed.includes(code);

  // The game calls this once per frame, after it has read the taps.
  input.endFrame = () => {
    input.pressed.length = 0;
    input.leftClicks.length = 0;
    input.rightClicks.length = 0;
  };

  return input;
}
