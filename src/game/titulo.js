// Pantalla de título (10/11/2026, etapa J0 de claude/menu-plan.md): el mundo de verdad corriendo detrás del menú,
// con la cámara en travelling lento y sin jugador ni HUD.
//  - Fondo "parque": vuelta lenta y continua alrededor de la laguna Ykua Pytã (cisnes, surtidores, fauna).
//  - Fondo "recorrido": tomas cortas por lugares reconocibles, con fundido a negro entre una y otra.
// Las tomas salen de los datos del mapa (la máscara de agua de la laguna, las etiquetas y los decorados), no de
// números fijos, así sobreviven a una actualización de OpenStreetMap. Acá vive la cámara y el logo; los botones y
// el cambio de modo están en main.js.
'use strict';

// Logo en pixel art: "VILLARRICA" con letras de 5×7, frente dorado con degradé, extrusión naranja oscura, contorno
// negro y dos flores de tajy rosado en las esquinas de arriba. Se dibuja chico y el CSS lo agranda sin suavizar.
VR.drawLogo = (canvas) => {
  const G = {
    V: ['10001', '10001', '10001', '10001', '01010', '01010', '00100'],
    I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  };
  const word = 'VILLARRICA', ox = 5, oy = 5, W = ox * 2 + word.length * 6 + 2, H = oy + 7 + 3 + 4, P = [];
  [...word].forEach((ch, k) => G[ch].forEach((row, y) => [...row].forEach((b, x) => { if (b === '1') P.push([ox + k * 6 + x, oy + y]); })));
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d'); g.clearRect(0, 0, W, H);
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const sil = new Set();
  for (const [x, y] of P) for (let d = 0; d <= 3; d++) sil.add((x + d) + ',' + (y + d));
  for (const k of sil) { const [x, y] = k.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) px(x + dx, y + dy, '#1a1a1e'); } // contorno
  for (let d = 3; d >= 1; d--) for (const [x, y] of P) px(x + d, y + d, d === 3 ? '#5a3004' : d === 2 ? '#7a410a' : '#a55a10'); // extrusión
  for (const [x, y] of P) { const r = y - oy; px(x, y, r < 2 ? '#fff0b0' : r < 4 ? '#ffd75e' : '#f2a52b'); } // frente
  for (const [fx, fy] of [[1, 1], [W - 4, 1]]) { // tajy: cinco pétalos rosados y el centro amarillo
    for (const [dx, dy] of [[1, 0], [0, 1], [2, 1], [1, 2]]) px(fx + dx, fy + dy, '#f08ab8');
    px(fx + 1, fy + 1, '#ffe08a');
  }
  return canvas;
};

VR.Titulo = class {
  constructor(world, mode) {
    this.world = world; this.mode = mode === 'recorrido' ? 'recorrido' : 'parque'; this.cam = { x: 0, y: 0, px: 0, py: 0 };
    this.fade = 0; this.phase = 'play'; this.hold = 0; this.t = 0; this.i = 0; this.speed = 16; // u/s del travelling del parque
    this.onJump = null; this.loop = null; this.tour = []; this.shot = null;
    this.build();
    this.cut(true);
  }
  // caja de la laguna en unidades del mundo, de la máscara de agua
  lakeBox() {
    const W = this.world, T = VR.T, S = VR.TILE, w = W.w, t = W.tiles;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let i = 0; i < t.length; i++) if (t[i] === T.LAGUNA) { const x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    return { cx: (x0 + x1 + 1) / 2 * S, cy: (y0 + y1 + 1) / 2 * S, rx: (x1 - x0 + 1) / 2 * S, ry: (y1 - y0 + 1) / 2 * S };
  }
  build() {
    const W = this.world, S = VR.TILE, dec = (k) => (W.decals || []).find((d) => d.kind === k), lab = (re) => (W.labels || []).find((l) => re.test(l.text));
    const L = this.lakeBox(), emb = dec('embarcadero'), glo = dec('glorieta');
    // ---- parque: vuelta completa a la laguna en sentido horario, arrancando frente al muelle de los cisnes ----
    if (L) {
      const a0 = emb ? Math.atan2((emb.y + emb.h / 2) * S - L.cy, (emb.x + emb.w / 2) * S - L.cx) : -Math.PI / 2, N = 12, pts = [];
      for (let k = 0; k < N; k++) { const a = a0 + k * Math.PI * 2 / N; pts.push([L.cx + Math.cos(a) * L.rx * 0.8, L.cy + Math.sin(a) * L.ry * 0.8]); }
      this.loop = this.spline(pts);
    }
    // ---- recorrido: panorámicas de ~20 s por lugares reconocibles ----
    const pan = (name, ax, ay, bx, by, dur) => this.tour.push({ name, a: [ax, ay], b: [bx, by], dur });
    if (emb) { const x = (emb.x + emb.w / 2) * S, y = (emb.y + emb.h) * S; pan('muelle', x - 190, y + 40, x + 150, y + 30, 20); }
    let l = lab(/Plaza de los H/i); if (l) pan('plaza', l.x - 230, l.y + 110, l.x + 190, l.y + 80, 22);
    l = lab(/Marimer/i); if (l) pan('marimer', l.x + 30, l.y - 190, l.x + 30, l.y + 160, 20);
    l = lab(/Municipalidad/i); if (l) pan('muni', l.x - 170, l.y + 60, l.x + 130, l.y + 10, 20);
    const cu = dec('cuartel'); if (cu) { const x = (cu.x + cu.w / 2) * S, y = (cu.y + cu.h / 2) * S; pan('cuartel', x - 140, y + 50, x + 120, y + 40, 18); }
    if (glo) { const x = (glo.x + glo.w / 2) * S, y = (glo.y + glo.h / 2) * S; pan('glorieta', x - 40, y - 150, x - 40, y + 150, 20); }
    l = lab(/Catedral/i); if (l) pan('catedral', l.x - 170, l.y + 40, l.x + 150, l.y + 10, 18);
  }
  // Catmull-Rom cerrada, muestreada cada ~5 unidades, con el largo acumulado para ir a velocidad constante
  spline(pts, step = 5) {
    const n = pts.length, P = (i) => pts[((i % n) + n) % n], xs = [], ys = [];
    for (let i = 0; i < n; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), m = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let k = 0; k < m; k++) {
        const t = k / m, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        xs.push(f(p0[0], p1[0], p2[0], p3[0])); ys.push(f(p0[1], p1[1], p2[1], p3[1]));
      }
    }
    const cum = [0]; for (let i = 1; i <= xs.length; i++) cum.push(cum[i - 1] + Math.hypot(xs[i % xs.length] - xs[i - 1], ys[i % xs.length] - ys[i - 1]));
    return { xs, ys, cum, len: cum[xs.length] };
  }
  loopAt(s) {
    const P = this.loop, n = P.xs.length; s = ((s % P.len) + P.len) % P.len;
    let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P.cum[m] <= s) lo = m; else hi = m; }
    const u = (s - P.cum[lo]) / Math.max(1e-6, P.cum[lo + 1] - P.cum[lo]), j = (lo + 1) % n;
    return [P.xs[lo] + (P.xs[j] - P.xs[lo]) * u, P.ys[lo] + (P.ys[j] - P.ys[lo]) * u];
  }
  setMode(m) { if (m === this.mode) return; this.mode = m; if (this.phase === 'play') this.phase = 'out'; }
  // corte a la toma que sigue (o a la primera, al arrancar)
  cut(first) {
    if (this.mode === 'parque' && this.loop) this.shot = { loop: true };
    else if (this.tour.length) { this.i = first ? (Math.random() * this.tour.length) | 0 : (this.i + 1) % this.tour.length; this.shot = this.tour[this.i]; }
    else { const p = this.world.spawn; this.shot = { still: true, x: p.x, y: p.y }; }
    this.t = 0; this.place(); this.cam.px = this.cam.x; this.cam.py = this.cam.y;
    if (!first && this.onJump) this.onJump(this.cam);
  }
  place() {
    const s = this.shot, c = this.cam;
    if (s.still) { c.x = s.x; c.y = s.y; }
    else if (s.loop) { const p = this.loopAt(this.t * this.speed); c.x = p[0]; c.y = p[1]; }
    else { const u = Math.min(1, this.t / s.dur), e = u * u * (3 - 2 * u); c.x = s.a[0] + (s.b[0] - s.a[0]) * e; c.y = s.a[1] + (s.b[1] - s.a[1]) * e; }
  }
  update(dt) {
    this.cam.px = this.cam.x; this.cam.py = this.cam.y;
    if (this.phase === 'black') { this.hold -= dt; if (this.hold <= 0) this.phase = 'in'; return; } // quieta en negro mientras el mundo se acomoda
    if (this.phase === 'out') { this.fade = Math.min(1, this.fade + dt / 0.6); if (this.fade >= 1) { this.cut(false); this.phase = 'black'; this.hold = 0.5; return; } }
    else if (this.phase === 'in') { this.fade = Math.max(0, this.fade - dt / 0.8); if (this.fade <= 0) this.phase = 'play'; }
    this.t += dt; this.place();
    if (this.shot.dur && this.t > this.shot.dur + 0.5 && this.phase === 'play') this.phase = 'out';
  }
};
