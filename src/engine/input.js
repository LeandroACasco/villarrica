// Entrada unificada: teclado, joystick táctil analógico, botones táctiles y control de consola.
// El juego solo lee VR.input.ax / ay (de -1 a 1), down(b) y pressed(b).
'use strict';
VR.input = (() => {
  const BTN = ['action', 'run', 'car', 'menu', 'map'];
  const kb = { u: 0, d: 0, l: 0, r: 0 };
  const kbBtn = {}, touchBtn = {}, padBtn = {}, latch = {};
  let prev = {}, cur = {}, pressedNow = {}, consumed = false;
  const touchAxis = { x: 0, y: 0 }, padAxis = { x: 0, y: 0 };
  const api = { ax: 0, ay: 0, source: 'kb', vibrate: true, onAny: null, enabled: true };

  const dirKeys = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
  const btnKeys = { Space: 'action', KeyJ: 'action', Enter: 'action', ShiftLeft: 'run', ShiftRight: 'run', KeyF: 'car', KeyK: 'car', Escape: 'menu', KeyP: 'menu', KeyM: 'map', Tab: 'map' };

  const any = () => { if (api.onAny) api.onAny(); };
  addEventListener('keydown', (e) => {
    if (!api.enabled) return;
    const d = dirKeys[e.code], b = btnKeys[e.code];
    if (!d && !b) return;
    e.preventDefault(); api.source = 'kb'; any();
    if (d) kb[d] = 1;
    if (b && !e.repeat) { kbBtn[b] = true; latch[b] = true; }
  });
  addEventListener('keyup', (e) => {
    const d = dirKeys[e.code], b = btnKeys[e.code];
    if (d) kb[d] = 0;
    if (b) kbBtn[b] = false;
  });
  const releaseAll = () => { kb.u = kb.d = kb.l = kb.r = 0; for (const b of BTN) kbBtn[b] = touchBtn[b] = padBtn[b] = false; touchAxis.x = touchAxis.y = 0; };
  addEventListener('blur', releaseAll);
  api.releaseAll = releaseAll;

  const buzz = (ms) => { if (api.vibrate && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} };

  // ---- táctil: el joystick aparece donde apoyás el pulgar (mitad izquierda) ----
  api.initTouch = (zone, joy, knob, buttons) => {
    let id = null, ox = 0, oy = 0;
    const R = 50;
    const home = () => { const r = zone.getBoundingClientRect(); return [r.left + 96, r.bottom - 110]; };
    const place = (x, y) => { joy.style.left = x + 'px'; joy.style.top = y + 'px'; };
    const rest = () => { const [x, y] = home(); place(x, y); knob.style.transform = ''; joy.classList.add('idle'); };
    rest(); addEventListener('resize', () => { if (id === null) rest(); });
    const move = (e) => {
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const dist = Math.hypot(dx, dy);
      if (dist > R) { // el joystick "sigue" al dedo si se pasa del borde
        ox += dx * (1 - R / dist); oy += dy * (1 - R / dist); place(ox, oy);
        dx = e.clientX - ox; dy = e.clientY - oy;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      let m = Math.min(1, Math.hypot(dx, dy) / R);
      if (m < 0.18) { touchAxis.x = touchAxis.y = 0; return; }
      m = (m - 0.18) / 0.82;
      const a = Math.atan2(dy, dx);
      touchAxis.x = Math.cos(a) * m; touchAxis.y = Math.sin(a) * m;
    };
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault(); any(); if (id !== null) return;
      id = e.pointerId; api.source = 'touch';
      try { zone.setPointerCapture(id); } catch (x) {}
      ox = e.clientX; oy = e.clientY; place(ox, oy); joy.classList.remove('idle'); move(e);
    });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; touchAxis.x = touchAxis.y = 0; rest(); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);

    buttons.forEach((el) => {
      const b = el.dataset.b;
      const down = (e) => { e.preventDefault(); any(); api.source = 'touch'; try { el.setPointerCapture(e.pointerId); } catch (x) {}
        if (touchBtn[b]) return; touchBtn[b] = true; latch[b] = true; el.classList.add('down'); buzz(8); };
      const up = () => { if (!touchBtn[b]) return; touchBtn[b] = false; el.classList.remove('down'); };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  };

  // ---- control de consola (mapeo estándar) ----
  const PADMAP = { 0: 'action', 1: 'run', 7: 'run', 2: 'car', 9: 'menu', 8: 'map' };
  let padName = null;
  addEventListener('gamepadconnected', (e) => { padName = (e.gamepad && e.gamepad.id) || 'control'; if (api.onPad) api.onPad(padName, true); });
  addEventListener('gamepaddisconnected', () => { if (api.onPad) api.onPad(padName, false); });
  function pollPad() {
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    const gp = pads[0];
    for (const b of BTN) padBtn[b] = false;
    padAxis.x = padAxis.y = 0;
    if (!gp) return;
    const p = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
    let x = (p(15) ? 1 : 0) - (p(14) ? 1 : 0), y = (p(13) ? 1 : 0) - (p(12) ? 1 : 0);
    if (x || y) { const l = Math.hypot(x, y); x /= l; y /= l; }
    else {
      x = gp.axes[0] || 0; y = gp.axes[1] || 0;
      let m = Math.hypot(x, y);
      if (m < 0.2) { x = y = 0; } else { const k = Math.min(1, (m - 0.2) / 0.75) / m; x *= k; y *= k; }
    }
    padAxis.x = x; padAxis.y = y;
    let used = !!(x || y);
    for (const i in PADMAP) if (p(+i)) { padBtn[PADMAP[i]] = true; used = true; }
    if (used) { api.source = 'pad'; any(); }
  }

  // Se llama una vez por cuadro antes de los pasos de lógica.
  api.poll = () => {
    pollPad();
    let x = kb.r - kb.l, y = kb.d - kb.u;
    if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    if (!x && !y) { x = touchAxis.x; y = touchAxis.y; }
    if (!x && !y) { x = padAxis.x; y = padAxis.y; }
    if (!api.enabled) x = y = 0;
    api.ax = x; api.ay = y;
    prev = cur; cur = {};
    for (const b of BTN) {
      cur[b] = api.enabled && !!(kbBtn[b] || touchBtn[b] || padBtn[b] || latch[b]);
      pressedNow[b] = cur[b] && !prev[b];
      latch[b] = false;
    }
    consumed = false;
  };
  // Los "recién apretados" valen solo para el primer paso de lógica del cuadro.
  api.consume = () => { if (!consumed) { consumed = true; for (const b of BTN) pressedNow[b] = false; } };
  api.down = (b) => !!cur[b];
  api.pressed = (b) => !!pressedNow[b];
  return api;
})();
