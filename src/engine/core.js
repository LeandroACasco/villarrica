// Núcleo: utilidades, pantalla con escalado en píxeles enteros y loop de paso fijo a 60 Hz.
'use strict';
const VR = {};
VR.TILE = 16;
VR.PS = 0.75; // escala de las personas (11/11/2026, pedido de Leandro: más realista; antes 1 = 16×32 unidades). Fraccionaria: los cuadros se dibujan a ese tamaño (VR.RES * VR.PS)
VR.RES = 1; // resolución del dibujo (píxeles del lienzo por unidad del mundo); la fija VR.screen.fit
VR.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
VR.lerp = (a, b, t) => a + (b - a) * t;
// ruido determinístico por coordenada (mismo resultado siempre para la misma celda)
VR.hash = (x, y, s = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
VR.rng = (seed) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
// Guardados separados por modo (J1, 10/11/2026): en Historia el progreso (posición, plata, ropa, vida…) lleva el prefijo
// 'h:'; los ajustes (sonido, vibración, fps…) son los mismos en los dos modos. VR.store.ns lo fija main.js al arrancar.
VR.store = {
  ns: '', PROG: /^(pos:|dest:|plata$|ropa:mia$|look:propio$|pj$|vida$|mis$)/,
  key(k) { return 'villarrica:' + (this.ns && this.PROG.test(k) ? this.ns : '') + k; },
  get(k, d) { try { const v = localStorage.getItem(this.key(k)); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(this.key(k), JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(this.key(k)); } catch (e) {} },
  // ¿hay una partida de Historia guardada? (se mira sin cambiar de modo)
  hasHistoria() { try { return localStorage.getItem('villarrica:h:vida') !== null; } catch (e) { return false; } },
  wipeHistoria() { try { Object.keys(localStorage).filter((k) => k.startsWith('villarrica:h:')).forEach((k) => localStorage.removeItem(k)); } catch (e) {} },
};
VR.modo = 'libre'; // 'libre' (el juego de siempre) | 'historia' (hora del juego, hambre, pieza…)
VR.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c; };

// Pantalla: el lado corto mide ~270 píxeles del juego (unidades del mundo: 8 por metro).
// Resolución ×2 (05/11/2026): cada unidad del mundo se dibuja con R×R píxeles del lienzo (R = 2 cuando la pantalla
// da), así el piso, las personas y los vehículos pueden tener el doble de detalle (16 px por metro, como Gangstar)
// sin acercar la cámara. Todo el código de dibujo sigue trabajando en unidades del mundo: el contexto lleva la escala.
VR.screen = {
  BASE: 270, R: 1,
  init(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.fit(); },
  fit() {
    const dpr = window.devicePixelRatio || 1;
    const dw = Math.round(innerWidth * dpr), dh = Math.round(innerHeight * dpr);
    // escala entera; en pantallas chicas también se permiten medios (×1,5 o ×2,5) para que alejar la cámara se note
    const raw = Math.min(dw, dh) / this.BASE;
    // en pleno zoom (live) la escala es continua y la resolución del lienzo no cambia, para que el cambio sea suave
    const s = this.live ? Math.max(0.7, raw) : raw >= 3 ? Math.round(raw) : Math.max(1, Math.round(raw * 2) / 2);
    this.scale = s;
    this.w = Math.ceil(dw / s); this.h = Math.ceil(dh / s);
    const R = this.R = VR.RES = this.live ? (this.R || 1) : Math.min(VR.hq ? 3 : 2, s); // VR.hq: calidad alta (Configuración)
    const cw = Math.round(this.w * R), ch = Math.round(this.h * R);
    if (this.canvas.width !== cw || this.canvas.height !== ch) { this.canvas.width = cw; this.canvas.height = ch; }
    this.canvas.style.width = (this.w * s / dpr) + 'px';
    this.canvas.style.height = (this.h * s / dpr) + 'px';
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.setTransform(R, 0, 0, R, 0, 0);
  },
  // base (lado corto en unidades del juego) que da una escala "de reposo" (entera o de a medios), la más cercana a la pedida
  snapBase(base) {
    const dpr = window.devicePixelRatio || 1, m = Math.min(Math.round(innerWidth * dpr), Math.round(innerHeight * dpr)), raw = m / base;
    return m / (raw >= 3 ? Math.round(raw) : Math.max(1, Math.round(raw * 2) / 2));
  },
  // zoom continuo (lo maneja main.js cuadro a cuadro): escala sin redondear
  setLive(base) { this.live = true; this.BASE = base; this.canvas.style.transition = 'none'; this.canvas.style.transform = 'none'; this.fit(); },
  settle(base) { this.live = false; this.BASE = base; this.fit(); },
  // Alejar o acercar la cámara (p. ej. al subir al auto): cambia el lado corto de la pantalla en píxeles
  // del juego. El salto entre escalas enteras se suaviza con una transición CSS desde la escala anterior.
  setBase(base, instant) {
    if (base === this.BASE) return;
    const old = this.scale;
    this.BASE = base; this.fit();
    if (instant) { this.canvas.style.transition = 'none'; this.canvas.style.transform = 'none'; return; }  // zoom del usuario: sin animación (evita barras negras)
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
