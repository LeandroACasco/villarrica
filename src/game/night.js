// Modo noche: la ciudad se oscurece y se prenden las luces. Una capa oscura del tamaño de la pantalla a la
// que se le "recortan" las luces (faroles de las calles, guirnaldas, vidrieras, faros de los vehículos) y
// después un brillo suave encima. Las luces fijas se calculan una vez al cargar y se guardan por bloques.
'use strict';
VR.Night = class {
  constructor(world) {
    this.world = world; this.dyn = []; this.level = 0;
    this.mask = document.createElement('canvas'); this.mctx = this.mask.getContext('2d');
    this.spr = new Map();
    this.B = 512; this.bw = Math.ceil(world.w * VR.TILE / this.B); this.bh = Math.ceil(world.h * VR.TILE / this.B);
    this.buckets = new Map();
    this.cone = this.makeCone();
    this.buildStatic();
  }
  // sprite redondo con caída suave (blanco para recortar, de color para el brillo)
  sprite(col) {
    let c = this.spr.get(col);
    if (!c) {
      c = VR.canvas(64, 64); const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `rgba(${col},1)`); gr.addColorStop(0.35, `rgba(${col},.55)`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64); this.spr.set(col, c);
    }
    return c;
  }
  makeCone() { // haz de los faros, apuntando hacia arriba (-y), con el origen abajo al medio
    const c = VR.canvas(64, 96), g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 96, 4, 32, 96, 96);
    gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.6, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(32, 96); g.lineTo(-6, 0); g.lineTo(70, 0); g.closePath(); g.fill();
    return c;
  }
  put(x, y, r, col, k = 1) {
    const key = Math.floor(y / this.B) * this.bw + Math.floor(x / this.B);
    let b = this.buckets.get(key); if (!b) this.buckets.set(key, b = []);
    b.push([x, y, r, col, k]);
  }
  buildStatic() {
    const W = this.world, R = W.roads, S = VR.TILE;
    const SODIO = '255,196,120', LED = '236,240,255', CALIDO = '255,214,150';
    if (R) {
      // faroles cada ~32 m a lo largo de las calles, alternando de vereda
      const E = R.edges, N = R.nodes;
      for (let i = 0; i < E.length; i += 4) {
        const kind = R.kinds[E[i + 2] & 15];
        if (kind === 'service' || kind === 'footway' || kind === 'path') continue;
        const ax = N[E[i] * 2], ay = N[E[i] * 2 + 1], bx = N[E[i + 1] * 2], by = N[E[i + 1] * 2 + 1];
        const L = Math.hypot(bx - ax, by - ay); if (L < 40) continue;
        const ux = (bx - ax) / L, uy = (by - ay) / L, off = R.widths[E[i + 2] & 15] * S / 2 + 4;
        const centro = W.barrioName(ax, ay) === 'Centro', col = centro ? LED : SODIO;
        for (let s = 40, n = (i / 4) & 1; s < L - 20; s += 256, n++) {
          const sd = n & 1 ? 1 : -1;
          this.put(ax + ux * s - uy * off * sd, ay + uy * s + ux * off * sd, 70, col, 0.85);
        }
      }
    }
    // lugares dibujados a mano
    for (const d of W.decals) {
      const X = d.x * S, Y = d.y * S, w = d.w * S, h = d.h * S;
      if (d.kind === 'frente') {
        const col = { credito: '120,255,170', lila: '230,120,255', banco: '170,190,255', universitaria: LED }[d.style] || CALIDO;
        for (let y = Y + 8; y < Y + h; y += 28) this.put(X + 8, y, 44, col, d.style === 'marimer' ? 1 : 0.8);
      }
      else if (d.kind === 'cartel') for (let x = X + 12; x < X + w; x += 32) this.put(x, Y + S - 14, 40, d.style === 'banco' ? '170,190,255' : CALIDO, 0.9);
      else if (d.kind === 'mesas') this.put(X + w / 2, Y + 8, 50, CALIDO, 0.7);
      else if (d.kind === 'terraza') this.put(X + 16, Y + h / 2, 60, CALIDO, 0.8);
      else if (d.kind === 'monumento') this.put(X + 16, Y + 16, 56, LED, 0.9);
      else if (d.kind === 'monumento_bajo') this.put(X + 16, Y + 16, 30, '120,190,255', 0.9);
      else if (d.kind === 'anfiteatro') { this.put(X + w - 24, Y + h / 2, 64, LED, 0.7); }
      else if (d.kind === 'muni') { // reflectores sobre la fachada oeste y el teatro al sur
        const fx = d.bx * S, py = (d.y + d.p1) * S;
        this.put(fx, py - 60, 70, LED, 0.9); this.put(fx, py, 80, LED, 1); this.put(fx, py + 60, 70, LED, 0.9);
        this.put((d.bx + d.tx) * S, (d.y + d.bh) * S, 80, LED, 0.9);
      }
    }
  }
  // luces que se agregan en cada cuadro (guirnaldas, faros); en px del mapa
  add(x, y, r, col, k = 1) { if (this.level > 0) this.dyn.push([x, y, r, col, k]); }
  // 0 = día, 1 = noche cerrada; mode: 'dia' | 'noche' | 'real'
  target(mode) {
    if (mode === 'noche') return 1;
    if (mode === 'dia') return 0;
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (h >= 20 || h < 5) return 1;
    if (h >= 18.5) return (h - 18.5) / 1.5;
    if (h < 6.5) return 1 - (h - 5) / 1.5;
    return 0;
  }
  update(dt, mode) {
    const t = this.target(mode);
    this.level += VR.clamp(t - this.level, -dt * 0.8, dt * 0.8);
  }
  render(ctx, cx, cy, sw, sh, vehicles) {
    const lv = this.level;
    if (lv <= 0.01) { this.dyn.length = 0; return; }
    const m = this.mask, g = this.mctx;
    if (m.width !== sw || m.height !== sh) { m.width = sw; m.height = sh; }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.clearRect(0, 0, sw, sh);
    g.fillStyle = `rgba(10,14,38,${0.74 * lv})`; g.fillRect(0, 0, sw, sh);
    // juntar las luces visibles
    const vis = [], B = this.B;
    for (let by = Math.floor((cy - 100) / B); by <= Math.floor((cy + sh + 100) / B); by++)
      for (let bx = Math.floor((cx - 100) / B); bx <= Math.floor((cx + sw + 100) / B); bx++) {
        const b = this.buckets.get(by * this.bw + bx); if (b) for (const l of b) vis.push(l);
      }
    for (const l of this.dyn) vis.push(l);
    const cones = [];
    for (const v of vehicles) {
      if (!(v.driven || v.ai) || v.spec.noLights) continue;
      const fx = Math.sin(v.a), fy = -Math.cos(v.a);
      cones.push(v);
      vis.push([v.x - fx * v.LEN / 2, v.y - fy * v.LEN / 2, 10, '255,40,30', 0.9]); // luz trasera
      if (v.siren && v.spec.lights) { const on = ((performance.now() / 130) | 0) % 2; vis.push([v.x, v.y, 34, v.spec.lights[on], 0.9]); }
      if (v.tune && v.tune.neon !== 'no') vis.push([v.x, v.y, Math.max(v.LEN, v.WID) * 0.9, VR.NEON[v.tune.neon], 0.6]); // neón
    }
    // 1) recortar la oscuridad
    g.globalCompositeOperation = 'destination-out';
    const W = this.sprite('255,255,255');
    for (const [x, y, r, , k] of vis) {
      const px = x - cx, py = y - cy; if (px < -r || py < -r || px > sw + r || py > sh + r) continue;
      g.globalAlpha = k; g.drawImage(W, px - r, py - r, r * 2, r * 2);
    }
    for (const v of cones) {
      const L = v.type === 'moto' ? 70 : 90;
      g.save(); g.translate(v.x - cx + Math.sin(v.a) * v.LEN / 2, v.y - cy - Math.cos(v.a) * v.LEN / 2); g.rotate(v.a);
      g.globalAlpha = 0.9; g.drawImage(this.cone, -L * 0.33, -L, L * 0.66, L); g.restore();
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    ctx.drawImage(m, 0, 0);
    // 2) brillo de color encima (suave, aditivo)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r, col, k] of vis) {
      const px = x - cx, py = y - cy; if (px < -r || py < -r || px > sw + r || py > sh + r) continue;
      ctx.globalAlpha = 0.22 * k * lv; const rr = r * 0.8; ctx.drawImage(this.sprite(col), px - rr, py - rr, rr * 2, rr * 2);
    }
    ctx.restore();
    this.dyn.length = 0;
  }
};
