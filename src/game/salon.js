// Interiores caminables (11/11/2026): motor chico (VR.Salon) y la tienda de ropa Ao Porã por dentro (VR.crearTienda).
// Igual que la pieza: el juego queda en pausa, la escena se pinta vectorial a la resolución de la pantalla, el fondo fijo se
// guarda en un canvas aparte y cada cuadro se dibuja solo lo que se mueve (la gente, el cuadro de diálogo).
(function () {
  const H = VR.hash;
  VR.Salon = class {
    // cfg: { W, H, start:{x,y,dir}, objs(): [{id,x,y,w,h,ax,ay,r,h2,ghost}], bg(g, s, self), items(self): [{sy, f(g)}], act(o, self), tick(dt, self), bounds:[x0,y0,x1,y1], key(): string }
    constructor(cfg, o) {
      Object.assign(this, o); this.cfg = cfg; this.on = false; this.t = 0; this.say = null; this.W = cfg.W; this.H = cfg.H;
      const d = this.el = document.createElement('div'); d.id = 'salonView'; d.hidden = true; d.innerHTML = '<canvas></canvas><div id="svHint"></div><button id="svOut">🚪 Salir</button>'; document.body.append(d);
      this.cv = d.querySelector('canvas'); this.g = this.cv.getContext('2d'); this.hint = d.querySelector('#svHint'); d.querySelector('#svOut').onclick = () => this.salir(); addEventListener('resize', () => this.fit());
    }
    fit() { const W = this.W, H_ = this.H, u = Math.max(1, Math.min(innerWidth / W, (innerHeight - 52) / H_) * 0.96), dpr = Math.min(2, window.devicePixelRatio || 1); this.u = u; this.s = u * dpr; this.cv.width = Math.round(W * u * dpr); this.cv.height = Math.round(H_ * u * dpr); this.cv.style.width = Math.round(W * u) + 'px'; this.cv.style.height = Math.round(H_ * u) + 'px'; this.bgKey = null; }
    entrar() {
      if (this.on) return; this.on = true; this.el.hidden = false; document.body.classList.add('adentro'); this.fit(); VR.input.releaseAll(); VR.input.enabled = true; VR.loop.paused = true;
      const st = this.cfg.start; this.px = st.x; this.py = st.y; this.dir = st.dir || 'up'; this.anim = 0; this.moving = false; this.last = performance.now(); if (this.cfg.enter) this.cfg.enter(this); requestAnimationFrame((t) => this.loop(t));
    }
    salir() { if (!this.on) return; this.on = false; this.el.hidden = true; document.body.classList.remove('adentro'); VR.input.releaseAll(); VR.input.enabled = true; VR.loop.paused = false; if (this.cfg.exit) this.cfg.exit(this); }
    decir(t, s = 3.4) { this.say = { t, s }; }
    blocked(x, y) {
      const b = this.cfg.bounds; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) return true;
      for (const o of this.cfg.objs(this)) if (!o.ghost && x > o.x - 4 && x < o.x + o.w + 4 && y > o.y + o.h * 0.3 - 2 && y < o.y + o.h + 4) return true; return false;
    }
    loop(t) {
      if (!this.on) return; const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t; this.t += dt; VR.loop.paused = true;
      VR.input.poll(); const busy = VR.Dialogo.abierto || (this.busy && this.busy()); if (!busy) this.update(dt); else this.moving = false;
      this.draw(); VR.input.consume(); requestAnimationFrame((tt) => this.loop(tt));
    }
    update(dt) {
      const ax = VR.input.ax, ay = VR.input.ay, sp = 58, run = VR.input.down('run') ? 1.5 : 1; this.moving = false;
      if (ax || ay) { const nx = this.px + ax * sp * run * dt, ny = this.py + ay * sp * run * dt; if (!this.blocked(nx, this.py)) this.px = nx; if (!this.blocked(this.px, ny)) this.py = ny; this.moving = true; this.anim += dt * 9 * run; this.dir = Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'right' : 'left') : (ay > 0 ? 'down' : 'up'); }
      let best = null, bd = 1e9; for (const o of this.cfg.objs(this)) { const d = Math.hypot(o.ax - this.px, o.ay - this.py); if (d < o.r && d < bd) { best = o; bd = d; } }
      this.near = best; this.hint.textContent = best ? best.h2 : ''; this.hint.classList.toggle('on', !!best);
      if (best && VR.input.pressed('action')) this.cfg.act(best, this);
      if (this.say && (this.say.s -= dt) <= 0) this.say = null; if (this.cfg.tick) this.cfg.tick(dt, this);
    }
    draw() {
      const c = this.g, s = this.s, cfg = this.cfg; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.cv.width, this.cv.height);
      const key = s + '|' + (cfg.key ? cfg.key(this) : ''); if (key !== this.bgKey || !this.bg) { this.bgKey = key; const cv = this.bg || (this.bg = document.createElement('canvas')); cv.width = this.cv.width; cv.height = this.cv.height; const g = cv.getContext('2d'); g.setTransform(s, 0, 0, s, 0, 0); g.lineJoin = 'round'; cfg.bg(g, s, this); }
      c.drawImage(this.bg, 0, 0); c.save(); c.scale(s, s); c.imageSmoothingEnabled = true;
      const items = cfg.items(this); items.push({ sy: this.py, f: (g) => this.drawPlayer(g) }); items.sort((a, b) => a.sy - b.sy).forEach((i) => i.f(c)); if (cfg.over) cfg.over(c, this); c.restore();
      if (this.say) { c.setTransform(1, 0, 0, 1, 0, 0); const kk = s / this.u, w = Math.min(this.cv.width - 20, 520 * kk), x = (this.cv.width - w) / 2, y = 10 * kk; c.font = '700 ' + Math.max(12 * kk, 5.5 * s) + 'px system-ui'; const words = this.say.t.split(' '); let lines = [], ln = ''; for (const wd of words) { if (c.measureText(ln + wd).width > w - 24 * kk) { lines.push(ln); ln = ''; } ln += wd + ' '; } lines.push(ln); const lh = Math.max(15 * kk, 7 * s);
        c.fillStyle = 'rgba(14,16,24,.92)'; c.strokeStyle = '#ffd84a'; c.lineWidth = 2 * kk; c.beginPath(); c.roundRect(x, y, w, lines.length * lh + 14 * kk, 10 * kk); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.textBaseline = 'top'; lines.forEach((l, i) => c.fillText(l, x + 12 * kk, y + 8 * kk + i * lh)); }
    }
    sprite(look) { const k = JSON.stringify(look); this._sp = this._sp || new Map(); let q = this._sp.get(k); if (!q) { q = VR.av2Lazy(look, 7); this._sp.set(k, q); } return q; }
    figura(g, look, x, y, dir, moving, anim, sc = 1.62) {
      const sp = this.sprite(look), img = moving ? sp.get(dir, 'walk', Math.floor(anim) % 8) : sp.get(dir, 'idle', 0); if (!img) return;
      const gr = g.createRadialGradient(x, y + 1, 1, x, y + 1, 11); gr.addColorStop(0, 'rgba(0,0,0,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y + 1, 11, 4.2, 0, 0, 7); g.fill(); g.drawImage(img, x - 8 * sc, y - 31.5 * sc, 16 * sc, 32 * sc);
    }
    drawPlayer(g) { if (this.hqLook !== this.player.lookData) this.hqLook = this.player.lookData; this.figura(g, this.player.lookData, this.px, this.py, this.dir, this.moving, this.anim); }
  };

  // ---------------------------------------------------------------- tienda de ropa Ao Porã
  const FRASES = {
    perchero: ['👕 Remeras, camisas, camperas. Todo con etiqueta de «oferta» que dice lo mismo que la de ayer.', '👗 Una pollera te guiña el ojo. Es la percha, pero igual.', '🧥 Una campera pesa como un ñandutí mojado.'],
    mesa: ['👚 Remeras dobladas con precisión de cirujano. No las toques o te mira la dueña.', '🏷 «2x1» en letra grande. Abajo, en letra chiquita: «en la segunda, ni a palos».', '👕 Una pila perfecta. Tocás la de abajo y se viene el mundo.'],
    mani: ['🗿 El maniquí te mira con juicio. Tiene mejor ropa que vos y lo sabe.', '🗿 Le hablás. No contesta. Qué educado.', '🗿 Tiene la misma postura que tu tío en las fotos de casamiento.'],
    mostrador: ['🧾 «¿Te lo envuelvo?» «No, me lo llevo puesto.» «Pagame primero, che.»', '🛍 La dependienta suspira: «Hoy no vendí ni un calcetín».', '💳 Cartelito: «Solo efectivo». Otro: «Hay Pix». Los dos son ciertos según el humor del día.'],
    estante: ['📦 Cajas de zapatos hasta el techo. Ninguna tiene tu número.', '🧢 Gorras apiladas como platos. La de arriba te mira.'],
  };
  const pick = (a) => a[(Math.random() * a.length) | 0];
  VR.crearTienda = function (o) {
    const W = 288, HH = 224; let rnd = 7; const rd = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647, seeded = () => VR.av2Random(rd);
    const dep = seeded(), mani = [seeded(), seeded(), seeded()], gente = [{ look: seeded(), x: 120, y: 190, tx: 120, ty: 190, w: 1, anim: 0, mv: false, dir: 'down' }, { look: seeded(), x: 60, y: 120, tx: 60, ty: 120, w: 2, anim: 0, mv: false, dir: 'down' }];
    const objs = (S) => [
      { id: 'puerta', x: 118, y: 212, w: 52, h: 12, ax: 144, ay: 204, r: 24, h2: '🚪 ACCIÓN: salir', ghost: true },
      { id: 'estante', x: 10, y: 8, w: 196, h: 32, ax: 100, ay: 68, r: 40, h2: '📦 ACCIÓN: mirar los estantes', ghost: true },
      { id: 'perchero', x: 16, y: 86, w: 66, h: 14, ax: 48, ay: 112, r: 24, h2: '👕 ACCIÓN: mirar la ropa' },
      { id: 'perchero2', x: 16, y: 136, w: 66, h: 14, ax: 48, ay: 162, r: 24, h2: '👗 ACCIÓN: mirar la ropa' },
      { id: 'mesa', x: 104, y: 108, w: 76, h: 30, ax: 142, ay: 148, r: 28, h2: '👚 ACCIÓN: mirar las remeras' },
      { id: 'mani', x: 92, y: 164, w: 18, h: 10, ax: 101, ay: 184, r: 20, h2: '🗿 ACCIÓN: mirar al maniquí' }, { id: 'mani', x: 178, y: 164, w: 18, h: 10, ax: 187, ay: 184, r: 20, h2: '🗿 ACCIÓN: mirar al maniquí' }, { id: 'mani', x: 187, y: 68, w: 18, h: 10, ax: 196, ay: 92, r: 18, h2: '🗿 ACCIÓN: mirar al maniquí' },
      { id: 'mostrador', x: 204, y: 118, w: 72, h: 32, ax: 240, ay: 160, r: 26, h2: '🧾 ACCIÓN: charlar con la dependienta' },
      { id: 'probador', x: 212, y: 18, w: 66, h: 56, ax: 245, ay: 92, r: 30, h2: '👗 ACCIÓN: probador (comprar y probarte ropa)' },
      { id: 'peluqueria', x: 22, y: 178, w: 32, h: 26, ax: 74, ay: 196, r: 28, h2: '✂️ ACCIÓN: peluquería' },
    ];
    const PAL = ['#d8402e', '#f0c030', '#2e6fc8', '#3a9a5a', '#e86aa0', '#8a4aa8', '#f2f0e8', '#2a2a32', '#e8802e', '#58b8d8'];
    function bg(g, s, S) {
      const lin = (x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); st.forEach((c, i) => q.addColorStop(i / (st.length - 1), c)); return q; };
      const box = (x, y, w, h, st, r = 0, hor = false) => { g.fillStyle = Array.isArray(st) ? (hor ? lin(x, 0, x + w, 0, st) : lin(0, y, 0, y + h, st)) : st; g.beginPath(); if (r) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); };
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      const drop = (x, y, w, h, blur = 4, a = 0.4, ox = 2.5, oy = 3.5) => { g.save(); g.shadowColor = 'rgba(30,10,20,' + a + ')'; g.shadowBlur = blur * s; g.shadowOffsetX = (ox + 5000) * s; g.shadowOffsetY = oy * s; g.fillStyle = '#000'; g.fillRect(x - 5000, y, w, h); g.restore(); };
      R(0, 0, W, HH, '#2a1c24');
      box(8, 0, W - 16, 58, ['#f6ecdf', '#eadccb']); for (let i = 0; i < 200; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.25)' : 'rgba(150,100,100,.07)'; g.fillRect(10 + H(i, 1, 3) * 268, 3 + H(i, 2, 3) * 50, 1 + H(i, 3, 3) * 2, 0.7); }
      box(8, 36, W - 16, 22, ['#f0a8c4', '#e286aa']); R(8, 36, W - 16, 0.8, '#fbd0e0'); R(8, 57, W - 16, 1.2, '#b8567c'); box(8, 0, W - 16, 4, ['#d8c8b4', '#f6ecdf']);
      box(0, 58, 8, HH - 58, ['#cdb9a6', '#a08e7e'], 0, true); box(W - 8, 58, 8, HH - 58, ['#a08e7e', '#cdb9a6'], 0, true);
      // piso: damero rosa y blanco con brillo
      for (let y = 58, j = 0; y < HH - 10; y += 16, j++) for (let x = 8, i = 0; x < W - 8; x += 16, i++) { const pk = (i + j) % 2; g.fillStyle = lin(x, y, x + 16, y + 16, pk ? ['#f4c6d6', '#e8a8c0'] : ['#fcf6f0', '#eadccf']); g.fillRect(x, y, Math.min(16, W - 8 - x), Math.min(16, HH - 10 - y)); if (H(i, j, 11) < 0.3) { g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(x + 2, y + 15); g.lineTo(x + 9, y + 1); g.lineTo(x + 12, y + 1); g.lineTo(x + 5, y + 15); g.fill(); } }
      g.fillStyle = 'rgba(120,60,80,.35)'; for (let y = 58; y <= HH - 10; y += 16) g.fillRect(8, y - 0.3, W - 16, 0.6); for (let x = 8; x <= W - 8; x += 16) g.fillRect(x - 0.3, 58, 0.6, HH - 68);
      { const sd = lin(0, 58, 0, 74, ['rgba(60,20,40,.4)', 'rgba(60,20,40,0)']); g.fillStyle = sd; g.fillRect(8, 58, W - 16, 16); }
      // cartel de neón y reflectores
      g.font = '700 22px Caveat, cursive'; g.textAlign = 'center'; g.shadowColor = '#ff5a9a'; g.shadowBlur = 10 * s; g.fillStyle = '#fff0f6'; g.fillText('Ao Porã', 108, 53); g.shadowBlur = 0; g.fillStyle = '#ffd0e2'; g.font = '700 4.6px system-ui'; g.fillText('ROPA LINDA · PELUQUERÍA', 108, 56.4); g.textAlign = 'left';
      // estantes del fondo con ropa doblada, cajas y gorras
      for (let r = 0; r < 2; r++) { const y = 12 + r * 14; drop(12, y + 11, 192, 3, 2, 0.35, 0, 1.5); for (let k = 0; k < 16; k++) { const x = 14 + k * 11.8, h = 5 + H(r, k, 21) * 5, c = PAL[(H(r, k, 22) * 10) | 0]; if (H(r, k, 23) < 0.18) { box(x, y + 11 - 9, 10, 9, ['#c8a674', '#a8844a'], 0.6); R(x + 3, y + 11 - 9, 4, 9, 'rgba(120,80,30,.6)'); } else for (let q = 0; q < 3; q++) { box(x, y + 11 - (q + 1) * (h / 3 + 0.4), 10, h / 3, [c, 'rgba(0,0,0,.25)'], 0.6); R(x, y + 11 - (q + 1) * (h / 3 + 0.4), 10, 0.6, 'rgba(255,255,255,.45)'); } } box(10, y + 11, 196, 3, ['#9a6a38', '#6a4220']); R(10, y + 11, 196, 0.7, '#d8a468'); }
      // percheros con ropa colgada
      for (const [px, py] of [[16, 86], [16, 136]]) { drop(px + 2, py + 12, 62, 2, 3, 0.4, 0, 2); R(px + 2, py + 2, 1.4, 14, '#aab0b8'); R(px + 62, py + 2, 1.4, 14, '#aab0b8'); box(px, py + 2, 66, 1.8, ['#e8ecf0', '#8a929a']); for (let k = 0; k < 11; k++) { const x = px + 4 + k * 5.4, c = PAL[(H(px + k, py, 31) * 10) | 0], dd = H(k, py, 32); g.fillStyle = c; g.beginPath(); g.moveTo(x, py + 4); g.lineTo(x + 4.4, py + 4); g.lineTo(x + 5.6, py + 7); g.lineTo(x + 4.4, py + 7.4); g.lineTo(x + 4.2, py + 14 + dd * 2); g.lineTo(x + 0.2, py + 14 + dd * 2); g.lineTo(x + 0, py + 7.4); g.lineTo(x - 1.2, py + 7); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x + 2.4, py + 4, 2, 11); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, py + 4, 4.4, 0.6); } }
      // mesa central con remeras dobladas
      drop(104, 108, 76, 30, 4, 0.45, 2, 3); box(104, 108, 76, 26, ['#d8b684', '#b8905c']); R(104, 108, 76, 0.8, '#f0d4a4'); box(104, 134, 76, 5, ['#8a6034', '#5a3c1c']); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const x = 108 + i * 18, y = 111 + j * 11, c = PAL[((i * 3 + j * 5 + 1) % 10)]; for (let q = 0; q < 4; q++) { box(x, y - q * 0.9, 14, 8, [q % 2 ? c : 'rgba(255,255,255,.25)', c], 0.8); } R(x + 5, y - 3.6, 4, 2, 'rgba(0,0,0,.25)'); }
      g.fillStyle = '#fff'; g.fillRect(160, 124, 12, 6); g.fillStyle = '#d8402e'; g.font = '700 3.6px system-ui'; g.fillText('2x1', 162.6, 128.4);
      // mostrador con caja registradora
      drop(204, 118, 72, 34, 4, 0.5, 2, 3); box(204, 118, 72, 32, ['#fdfaf6', '#e4dcd0'], 1.5); box(204, 118, 72, 8, ['#f0a8c4', '#d8789c'], 1.5); R(204, 118, 72, 0.8, '#fdd8e6'); box(206, 138, 68, 10, ['#e8c0d0', '#c898ac'], 1); R(204, 150, 72, 2, '#a8909c');
      drop(246, 106, 22, 14, 2, 0.4, 1.5, 2); box(246, 108, 22, 12, ['#6a6e76', '#3e4148'], 1.5); box(248, 100, 12, 9, ['#aac8e0', '#5a88b0'], 1); R(248, 100, 12, 0.8, '#d8ecf8'); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) R(250 + i * 4, 112 + j * 3, 3, 2, '#c8ccd2'); box(262, 100, 8, 5, ['#f2f2f6', '#c0c4cc'], 0.8);
      for (let i = 0; i < 4; i++) { box(212 + i * 0.6, 112 - i * 1.4, 14, 9, ['#f6b8d0', '#e0709c'], 0.8); } g.fillStyle = '#fff'; g.font = '700 3.4px Caveat, cursive'; g.fillText('Ao Porã', 214, 119); box(230, 108, 6, 10, ['#e8f4f0', '#b8d4cc'], 1.4); g.fillStyle = '#e8486a'; g.beginPath(); g.arc(233, 106, 2.2, 0, 7); g.arc(235, 108, 1.8, 0, 7); g.fill(); g.strokeStyle = '#3a8a3a'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(233, 108); g.lineTo(233, 112); g.stroke();
      // probador: dos cabinas con cortina
      for (const px of [214, 247]) { drop(px, 20, 30, 54, 3, 0.35, 1.5, 2); box(px, 18, 30, 56, ['#c8a674', '#9a7646']); box(px + 2, 22, 26, 48, ['#eadfd0', '#d8c8b4']); if (px === 214) { box(px + 4, 30, 8, 22, ['#c8e0ee', '#8fb4cc', '#c8e0ee']); R(px + 4, 30, 8, 0.6, '#d8b060'); } box(px + 2, 20, 26, 5, ['#8a6034', '#5a3c1c']); const half = px === 214 ? 0 : 1; for (let k = 0; k < 6; k++) { const cx = px + 2 + (half ? 14 : 0) + k * (13 / 6); g.fillStyle = k % 2 ? '#e86aa0' : '#f08ab8'; g.fillRect(cx, 25, 13 / 6 + 0.3, 44); } g.strokeStyle = 'rgba(100,20,60,.35)'; g.lineWidth = 0.4; for (let k = 0; k < 7; k++) { const cx = px + 2 + (half ? 14 : 0) + k * (13 / 6); g.beginPath(); g.moveTo(cx, 25); g.lineTo(cx, 69); g.stroke(); } R(px, 74, 30, 1.6, '#4a3018'); }
      g.fillStyle = '#fff6fa'; g.font = '700 5px system-ui'; g.fillText('PROBADOR', 227, 15);
      // silla de peluquería y espejo con luces
      drop(22, 178, 32, 28, 4, 0.45, 2, 3); g.fillStyle = '#5a5e66'; g.beginPath(); g.ellipse(36, 203, 13, 4.5, 0, 0, 7); g.fill(); box(33, 196, 6, 7, ['#d8dce2', '#7e848e'], 0, true); box(24, 178, 28, 20, ['#c0302e', '#8a1c1c'], 5); R(26, 180, 24, 1, 'rgba(255,200,200,.4)'); box(22, 184, 6, 14, ['#6a6e76', '#3e4148'], 2); box(48, 184, 6, 14, ['#6a6e76', '#3e4148'], 2); box(28, 190, 20, 8, ['#d8403e', '#a02424'], 3); box(30, 202, 12, 3, ['#b8bcc4', '#7a7e88'], 1);
      drop(10, 152, 44, 24, 3, 0.3, 1.5, 2); box(12, 150, 40, 24, ['#e8d4a8', '#c8a874'], 2); box(14, 152, 36, 20, ['#d8ecf6', '#9ac0d8', '#d8ecf6']); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(18, 172); g.lineTo(30, 152); g.lineTo(34, 152); g.lineTo(22, 172); g.fill(); for (let k = 0; k < 8; k++) { g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(14 + k * 5.2, 150.6, 1.1, 0, 7); g.fill(); }
      // puerta y vidrieras (pared de abajo)
      box(8, HH - 12, W - 16, 12, ['#d8c8b4', '#8a7660']); R(8, HH - 12, W - 16, 0.8, '#fff'); for (const [vx, vw] of [[12, 100], [176, 100]]) { box(vx, HH - 11, vw, 10, ['#cfe9f6', '#9ac4dc']); g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(vx + 10, HH - 1); g.lineTo(vx + 30, HH - 11); g.lineTo(vx + 40, HH - 11); g.lineTo(vx + 20, HH - 1); g.fill(); R(vx + vw / 2 - 0.6, HH - 11, 1.2, 10, '#b8a890'); }
      drop(118, 210, 52, 14, 3, 0.35, 0, -2); box(118, 208, 52, 16, '#6a4824', 1); box(121, 210, 22, 14, ['#d8eef8', '#9acce4']); box(145, 210, 22, 14, ['#d8eef8', '#9acce4']); R(143, 210, 2, 14, '#6a4824'); g.fillStyle = '#d8b84a'; g.fillRect(141, 215, 1.2, 5); g.fillRect(146, 215, 1.2, 5); g.fillStyle = '#4ad86a'; g.fillRect(130, 207, 28, 3); g.fillStyle = '#0a3a18'; g.font = '700 2.6px system-ui'; g.fillText('ABIERTO', 135, 209.4);
      // plantas
      for (const [px, py] of [[14, 62], [196, 196], [262, 196]]) { drop(px, py + 8, 12, 8, 2, 0.35, 1, 1.5); for (let k = 0; k < 6; k++) { const a = -1.2 + k * 0.5; g.fillStyle = k % 2 ? '#3a8a3a' : '#5ab850'; g.beginPath(); g.ellipse(px + 6 + Math.cos(a) * 3, py + 4 - Math.abs(Math.sin(a)) * 3, 1.6, 6, a * 0.4, 0, 7); g.fill(); } box(px + 1, py + 7, 10, 9, ['#e8e0d2', '#b8aa94'], 1.4, true); }
      // luces del techo sobre las mesas y los maniquíes
      for (const [lx, ly, lr] of [[142, 124, 70], [101, 176, 40], [187, 176, 40], [60, 118, 44], [240, 130, 54], [196, 80, 46]]) { const gl = g.createRadialGradient(lx, ly, 2, lx, ly, lr); gl.addColorStop(0, 'rgba(255,240,210,.32)'); gl.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = gl; g.fillRect(8, 58, W - 16, HH - 68); }
      const vg = g.createRadialGradient(W / 2, HH / 2, 70, W / 2, HH / 2, 190); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(30,8,20,.45)'); g.fillStyle = vg; g.fillRect(0, 0, W, HH);
    }
    const S = new VR.Salon({
      W, H: HH, start: { x: 144, y: 198, dir: 'up' }, bounds: [20, 82, 268, 206], objs, bg, key: () => '',
      items: (me) => { const it = [];
        const mp = [[101, 172, 0], [187, 172, 1], [196, 76, 2]]; for (const [x, y, k] of mp) it.push({ sy: y + 2, f: (g) => { g.save(); if (g.filter !== undefined) g.filter = 'grayscale(.9) brightness(1.15)'; me.figura(g, mani[k], x, y, 'down', false, 0); g.restore(); g.fillStyle = '#c8ccd2'; g.beginPath(); g.ellipse(x, y + 1, 7, 2.6, 0, 0, 7); g.fill(); } });
        it.push({ sy: 118, f: (g) => me.figura(g, dep, 241, 118, 'down', false, 0) });
        for (const p of gente) it.push({ sy: p.y, f: (g) => me.figura(g, p.look, p.x, p.y, p.dir, p.mv, p.anim) });
        return it; },
      tick: (dt, me) => { for (const p of gente) { p.w -= dt; if (p.w <= 0 && !p.mv) { p.w = 2 + Math.random() * 5; for (let k = 0; k < 8; k++) { const tx = 30 + Math.random() * 230, ty = 90 + Math.random() * 110; if (!me.blocked(tx, ty) && Math.hypot(tx - me.px, ty - me.py) > 18) { p.tx = tx; p.ty = ty; p.mv = true; break; } } }
        if (p.mv) { const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy); if (d < 2) { p.mv = false; p.dir = 'down'; } else { const nx = p.x + dx / d * 22 * dt, ny = p.y + dy / d * 22 * dt; if (!me.blocked(nx, ny)) { p.x = nx; p.y = ny; p.anim += dt * 7; p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); } else p.mv = false; } } } },
      act: (ob, me) => { const k = ob.id;
        if (k === 'puerta') me.salir();
        else if (k === 'probador') { if (o.abrir) o.abrir('top'); }
        else if (k === 'peluqueria') { if (o.abrir) o.abrir('hair'); }
        else if (k === 'perchero' || k === 'perchero2') me.decir(pick(FRASES.perchero)); else if (FRASES[k]) me.decir(pick(FRASES[k])); },
    }, { player: o.player, busy: o.busy });
    return S;
  };
})();
