// Fuego de pastizal (J5, M3 «Tata!»): celdas de pasto que arden, se propagan con el viento, se queman en unos segundos y se apagan con el cañón de agua del camión bomba.
// Cada celda es un tile (16 px). Arde pasto y árboles; no arde el agua, el pavimento ni los edificios. Lo prende la misión (`empezar`) y se limpia al terminar (`limpiar`).
'use strict';
VR.Pastizal = class {
  // o: { world, hurt(n), toast }
  constructor(o) {
    Object.assign(this, o); this.cells = new Map(); this.ash = new Map(); this.activo = false; this.t = 0; this.acc = 0; this.quemadas = 0; this.limite = 230; this.o = null;
    this.viento = { x: -0.55, y: 0.1 }; this.origenPx = null; this.glo = null;
  }
  ardible(tx, ty) { const t = this.world.get(tx, ty); return t === VR.T.GRASS || t === VR.T.TREE; }
  // Un punto de pasto abierto (sin trama de árboles) al que el camión llega de verdad: se recorre desde las calles por baldosas con
  // 3x3 libres (el camión mide ~2,5 x 1 baldosas) y el fuego nace a ~15–30 baldosas de la glorieta, del lado este de la laguna.
  origen() {
    const W = this.world, T = VR.T, S = VR.TILE, g = (W.decals || []).find((d) => d.kind === 'glorieta'); if (!g) return null;
    const gx = g.x + g.w / 2, gy = g.y + g.h / 2; this.glo = { x: gx * S, y: gy * S, r: Math.min(g.w, g.h) * S / 2 + 4 };
    const x0 = Math.floor(gx) - 4, x1 = Math.floor(gx) + 70, y0 = Math.floor(gy) - 40, y1 = Math.floor(gy) + 50, w = x1 - x0 + 1, h = y1 - y0 + 1, I = (x, y) => (y - y0) * w + (x - x0);
    const libre = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (W.solid(x + dx, y + dy)) return false; return true; };
    const dist = new Int16Array(w * h).fill(-1), q = [];
    for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) if (VR.ROADLIKE[W.get(x, y)] && libre(x, y)) { dist[I(x, y)] = 0; q.push(x, y); }
    for (let k = 0; k < q.length; k += 2) { const x = q[k], y = q[k + 1], d = dist[I(x, y)]; if (d >= 40) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx <= x0 || ny <= y0 || nx >= x1 || ny >= y1 || dist[I(nx, ny)] >= 0 || !libre(nx, ny)) continue; dist[I(nx, ny)] = d + 1; q.push(nx, ny); } }
    let best = null, bs = 1e9;
    for (let ty = y0 + 3; ty < y1 - 3; ty++) for (let tx = Math.floor(gx) + 14; tx < x1 - 3; tx++) {
      if (W.get(tx, ty) !== T.GRASS || dist[I(tx, ty)] < 0) continue; let n = 0, ar = 0;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const t = W.get(tx + dx, ty + dy); if (t === T.GRASS) n++; if (!W.solid(tx + dx, ty + dy)) ar++; }
      if (n < 22 || ar < 40) continue; const d = Math.hypot(tx - gx, ty - gy); if (d < 14 || d > 45) continue;
      const sc = Math.abs(d - 24) + dist[I(tx, ty)] * 0.3 + (49 - n) * 0.15; if (sc < bs) { bs = sc; best = { tx, ty }; }
    }
    return best && { x: (best.tx + 0.5) * S, y: (best.ty + 0.5) * S };
  }
  centro() { return this.origenPx; }
  empezar() {
    this.limpiar(); const p = this.origen(); if (!p) return false; this.origenPx = p; this.activo = true; this.t = 0; this.quemadas = 0;
    const S = VR.TILE, cx = Math.floor(p.x / S), cy = Math.floor(p.y / S); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) this.prende(cx + dx, cy + dy);
    return true;
  }
  limpiar() { this.cells.clear(); this.ash.clear(); this.activo = false; this.quemadas = 0; }
  prende(tx, ty) {
    const k = tx + ',' + ty; if (this.cells.has(k) || this.ash.has(k) || !this.ardible(tx, ty)) return false;
    const arbol = this.world.get(tx, ty) === VR.T.TREE; this.cells.set(k, { tx, ty, hp: arbol ? 2 : 1, vida: 11 + Math.random() * 7, ph: Math.random() * 6.28, edad: 0 }); this.quemadas++; return true;
  }
  get ardiendo() { return this.cells.size; }
  cerca(x, y, r) { for (const c of this.cells.values()) if (Math.hypot((c.tx + 0.5) * VR.TILE - x, (c.ty + 0.5) * VR.TILE - y) < r) return true; return false; }
  // el fuego llegó a la glorieta
  enGlorieta() { return !!this.glo && this.cerca(this.glo.x, this.glo.y, this.glo.r); }
  mojar(x, y, dt) {
    if (!this.cells.size) return; const S = VR.TILE, tx = Math.floor(x / S), ty = Math.floor(y / S);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const k = (tx + dx) + ',' + (ty + dy), c = this.cells.get(k); if (!c) continue;
      if (Math.hypot((c.tx + 0.5) * S - x, (c.ty + 0.5) * S - y) > 11) continue; c.hp -= dt * 0.9; if (c.hp <= 0) { this.cells.delete(k); this.ash.set(k, { tx: c.tx, ty: c.ty, mojado: true }); } }
  }
  update(dt, player, car) {
    if (!this.activo) return; this.t += dt; this.acc += dt; const S = VR.TILE;
    // lejos del fuego se propaga muy despacio, así llegás con el fuego chico (el camión tarda en cruzar la ciudad)
    const f = car || player, o = this.origenPx, lejos = (() => { const d = o ? Math.hypot(f.x - o.x, f.y - o.y) : 0; return d > 2200 ? 0.08 : d > 900 ? 0.35 : 1; })();
    for (const [k, c] of this.cells) { c.edad += dt; c.vida -= dt * lejos; if (c.vida <= 0) { this.cells.delete(k); this.ash.set(k, { tx: c.tx, ty: c.ty }); } }
    if (this.acc >= 0.5) { this.acc = 0; const nuevos = [];
      for (const c of this.cells.values()) { if (c.edad < 1.2) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const w = 1 + 0.9 * (dx * this.viento.x + dy * this.viento.y) / 0.55; if (Math.random() < 0.10 * Math.max(0.25, w) * lejos) nuevos.push([c.tx + dx, c.ty + dy]); } }
      for (const [x, y] of nuevos) this.prende(x, y);
    }
    // el fuego quema lo que toca: a pie te hace daño y el camión se va dañando
    if (this.cells.size && f) { const c = this.cells.get(Math.floor(f.x / S) + ',' + Math.floor(f.y / S)); if (c) { if (car) { if (car.hp != null) car.hp -= dt * 1.5; } else if (this.hurt) this.hurt(dt * 7); } }
  }
  collect(cx, cy, tall) {
    if (!this.activo && !this.ash.size) return; const S = VR.TILE, W = VR.screen.w, H = VR.screen.h, t = this.t;
    for (const a of this.ash.values()) { const x = Math.round(a.tx * S - cx), y = Math.round(a.ty * S - cy); if (x < -S || y < -S || x > W || y > H) continue;
      tall.push({ sy: -1e6, draw: (g) => { g.fillStyle = a.mojado ? 'rgba(34,30,26,.5)' : 'rgba(22,16,12,.62)'; g.fillRect(x, y, S, S); g.fillStyle = 'rgba(70,62,56,.35)'; g.fillRect(x + 3, y + 5, 3, 2); g.fillRect(x + 10, y + 10, 3, 2); } }); }
    for (const c of this.cells.values()) { const x = Math.round(c.tx * S + S / 2 - cx), y = Math.round(c.ty * S + S - cy); if (x < -20 || y < -30 || x > W + 20 || y > H + 20) continue;
      const k = Math.min(1, c.hp / (c.hp > 1 ? 2 : 1) * 0.5 + 0.5), life = Math.min(1, c.vida / 3);
      tall.push({ sy: c.ty * S + S, draw: (g) => {
        g.fillStyle = 'rgba(255,110,20,.22)'; g.fillRect(x - 9, y - 12, 18, 14);
        for (let i = -1; i <= 1; i++) { const h = (5 + 5 * Math.sin(t * 9 + c.ph + i * 2)) * k * (0.5 + life * 0.5) + 3, fx = x + i * 4;
          g.fillStyle = '#e8421a'; g.fillRect(fx - 2, y - h, 4, h); g.fillStyle = '#ffa52a'; g.fillRect(fx - 1, y - h * 0.7, 3, h * 0.7); g.fillStyle = '#fff1a8'; g.fillRect(fx, y - h * 0.38, 1, h * 0.38); }
        if ((c.ph * 7 | 0) % 3 === 0) { const u = (t * 12 + c.ph * 5) % 16; g.fillStyle = 'rgba(70,70,74,' + (0.3 * (1 - u / 16)) + ')'; g.fillRect(x - 2 + Math.sin(u * 0.5 + c.ph) * 3, y - 12 - u, 5, 4); }
      } }); }
  }
};
