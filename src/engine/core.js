// Núcleo: utilidades, pantalla con escalado en píxeles enteros y loop de paso fijo a 60 Hz.
'use strict';
const VR = {};
VR.TILE = 16;
VR.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
VR.lerp = (a, b, t) => a + (b - a) * t;
// ruido determinístico por coordenada (mismo resultado siempre para la misma celda)
VR.hash = (x, y, s = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
VR.rng = (seed) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
VR.store = {
  get(k, d) { try { const v = localStorage.getItem('villarrica:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('villarrica:' + k, JSON.stringify(v)); } catch (e) {} },
};
VR.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c; };

// Pantalla: el lado corto mide ~270 píxeles del juego y cada píxel del juego ocupa un número entero de píxeles físicos.
VR.screen = {
  BASE: 270,
  init(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.fit(); },
  fit() {
    const dpr = window.devicePixelRatio || 1;
    const dw = Math.round(innerWidth * dpr), dh = Math.round(innerHeight * dpr);
    // escala entera; en pantallas chicas también se permiten medios (×1,5 o ×2,5) para que alejar la cámara se note
    const raw = Math.min(dw, dh) / this.BASE;
    const s = raw >= 3 ? Math.round(raw) : Math.max(1, Math.round(raw * 2) / 2);
    this.scale = s;
    this.w = Math.ceil(dw / s); this.h = Math.ceil(dh / s);
    this.canvas.width = this.w; this.canvas.height = this.h;
    this.canvas.style.width = (this.w * s / dpr) + 'px';
    this.canvas.style.height = (this.h * s / dpr) + 'px';
    this.ctx.imageSmoothingEnabled = false;
  },
  // Alejar o acercar la cámara (p. ej. al subir al auto): cambia el lado corto de la pantalla en píxeles
  // del juego. El salto entre escalas enteras se suaviza con una transición CSS desde la escala anterior.
  setBase(base) {
    if (base === this.BASE) return;
    const old = this.scale;
    this.BASE = base; this.fit();
    if (old === this.scale) return;
    const c = this.canvas;
    c.style.transition = 'none'; c.style.transform = `scale(${old / this.scale})`;
    void c.offsetWidth;
    c.style.transition = 'transform .45s cubic-bezier(.2,.7,.3,1)'; c.style.transform = 'scale(1)';
  },
};

// Loop: la lógica corre en pasos fijos de 1/60 s y el dibujo interpola entre el paso anterior y el actual,
// así se ve igual de suave en pantallas de 60, 90, 120 o 144 Hz.
VR.loop = {
  STEP: 1 / 60, paused: false, fps: 0,
  start(update, render) {
    let last = performance.now(), acc = 0, fpsT = 0, fpsN = 0;
    const frame = (now) => {
      requestAnimationFrame(frame);
      let dt = (now - last) / 1000; last = now;
      if (dt > 0.25) dt = 0.25;
      fpsT += dt; fpsN++; if (fpsT >= 0.5) { this.fps = Math.round(fpsN / fpsT); fpsT = 0; fpsN = 0; }
      if (this.paused) { acc = 0; render(1, dt); return; }
      VR.input.poll();
      acc += dt;
      let n = 0;
      while (acc >= this.STEP && n < 6) { update(this.STEP); VR.input.consume(); acc -= this.STEP; n++; }
      if (n === 6) acc = 0;
      render(acc / this.STEP, dt);
    };
    requestAnimationFrame(frame);
  },
};
