// Perros callejeros (12/11/2026, pedido de Leandro): andan por veredas, plazas y pasto de los barrios.
// - Trotan, se sientan, se echan, olfatean el piso y a veces ladran. Cada tanto uno se te acerca.
// - Si apretás ACCIÓN al lado de uno, te hace caso y te sigue un rato moviendo la cola.
// - Se apartan solos de los vehículos y de quien corre hacia ellos (con un "¡aú!"); nunca se lastiman.
// Todo es local de cada jugador (no viaja online) y solo existen los que están cerca de la cámara.
'use strict';
(() => {
  const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
  // paletas [cuerpo, sombra, panza/manchas, hocico]: el perro callejero típico (marrón claro, negro, blanco con manchas, amarillo)
  const PALS = [
    ['#b98a52', '#8a6234', '#e2c79a', '#4a3420'], ['#2e2a2a', '#1a1717', '#5a4a40', '#111'],
    ['#e9e2d4', '#bdb4a2', '#ffffff', '#8a6a4a'], ['#d6a23e', '#a87a22', '#f1d48a', '#5a3a1a'],
    ['#8a5a36', '#5e3a20', '#c89a6a', '#2a1a0e'], ['#9a9a96', '#6e6e6a', '#d0d0cc', '#2a2a28'],
  ];
  function make(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const px = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), ww, hh); };
    const ell = (cx, cy, rx, ry, col) => { g.fillStyle = col; for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const dx = (x + 0.5 - cx) / (rx + 0.3), dy = (y + 0.5 - cy) / (ry + 0.3); if (dx * dx + dy * dy <= 1) g.fillRect(x, y, 1, 1); } };
    fn(px, ell);
    const im = g.getImageData(0, 0, w, h), d = im.data, A = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0, out = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!A(x, y) && (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1))) out.push(x, y);
    g.fillStyle = 'rgba(30,20,14,.9)'; for (let i = 0; i < out.length; i += 2) g.fillRect(out[i], out[i + 1], 1, 1);
    return c;
  }
  const flipH = (c) => { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const g = o.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; };
  // poses de costado (mirando a la derecha), 22x14 px: 0/1 = trote, 2 = parado, 3 = sentado, 4 = echado, 5 = olfateando
  function side(pal, pose) {
    const [B, D, L, N] = pal;
    return make(22, 14, (px, ell) => {
      const sit = pose === 3, lie = pose === 4, sn = pose === 5, y0 = lie ? 3 : 0;
      if (sit) { ell(7, 10, 5, 3, B); px(2, 11, 3, 2, D); ell(12.5, 5, 2.6, 3.6, B); px(11, 2, 5, 1, B); }
      else {
        ell(9, 7 + y0, 6.2, 3, B); px(5, 8 + y0, 8, 2, L);                       // cuerpo y panza
        const t = pose === 1 ? 1 : 0;                                              // cola levantada
        px(2, 4 + y0 + t, 3, 1, D); px(1, 3 + y0 + t, 1, 2, D);
        if (lie) { px(6, 10 + y0, 5, 1, D); px(12, 10 + y0, 3, 1, D); }
        else {
          const a = pose === 0 ? 1 : pose === 1 ? -1 : 0;                         // patas: se cruzan al trotar
          px(5 + a, 9, 1, 4, D); px(7 - a, 9, 1, 4, B); px(12 - a, 9, 1, 4, D); px(14 + a, 9, 1, 4, B);
        }
      }
      if (!sit) { const hy = sn ? 8 : lie ? 6 : 3; ell(16.2, hy + (sn ? 1 : 2), 3, 2.6, B); px(17, hy + (sn ? 3 : 3), 4, 2, N); px(20, hy + (sn ? 3 : 3), 1, 1, '#000'); px(15, hy - 1 + (sn ? 1 : 0), 2, 3, D); if (!sn) px(18, hy + 1, 1, 1, '#000'); }
      else { px(14, 4, 4, 2, N); px(17, 4, 1, 1, '#000'); px(11, 2, 2, 3, D); }
    });
  }
  // de frente / de espaldas (para cuando camina hacia arriba o hacia abajo), 12x14 px
  function front(pal, back, step) {
    const [B, D, L, N] = pal;
    return make(12, 14, (px, ell) => {
      ell(6, 8, 3.6, 4.2, B); if (!back) px(4, 9, 4, 3, L);
      const a = step ? 1 : 0;
      px(3, 11 + a, 2, 2, D); px(7, 12 - a, 2, 1, D);
      if (back) { px(5, 3, 2, 2, D); px(5, 1, 2, 2, B); px(3, 1, 1, 3, D); px(8, 1, 1, 3, D); }
      else { ell(6, 4, 2.8, 2.4, B); px(3, 2, 1, 3, D); px(8, 2, 1, 3, D); px(5, 5, 2, 2, N); px(4, 4, 1, 1, '#000'); px(7, 4, 1, 1, '#000'); px(5, 6, 2, 1, '#000'); }
    });
  }
  const sprites = PALS.map((p) => {
    const r = [0, 1, 2, 3, 4, 5].map((i) => side(p, i));
    return { r, l: r.map(flipH), d: [front(p, false, 0), front(p, false, 1)], u: [front(p, true, 0), front(p, true, 1)] };
  });

  VR.Perros = class {
    constructor(world, peds) { this.world = world; this.peds = peds; this.list = []; this.t = 0; this.spawnT = 0; this.max = 4; }
    free(x, y) { return this.peds.walkable(x, y) && !this.world.hits(x - 3, y - 3, x + 3, y); }
    spawn(f) {
      for (let k = 0; k < 14; k++) {
        const a = Math.random() * 6.283, d = rnd(280, 520), x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d;
        if (!this.free(x, y)) continue;
        const b = this.world.barrioName ? this.world.barrioName(x, y) : null; if (b === 'Afueras') continue;
        const dg = { x, y, px: x, py: y, vx: 0, vy: 0, dir: Math.random() < 0.5 ? 'l' : 'r', pal: (Math.random() * sprites.length) | 0, mode: 'idle', pose: 2, t: rnd(1, 4), anim: 0, follow: 0, say: null, bark: rnd(8, 30) };
        this.list.push(dg); return;
      }
    }
    // ACCIÓN al lado de un perro: te hace caso y te sigue un rato
    pet(player) {
      let best = null, bd = 26;
      for (const d of this.list) { const k = Math.hypot(d.x - player.x, d.y - (player.y - 3)); if (k < bd) { bd = k; best = d; } }
      if (!best) return false;
      best.follow = 40; best.mode = 'idle'; best.pose = 2; best.t = 1.2; best.say = { text: pick(['¡Guau!', '¡Guau guau!', '¡Wof!']), t: 1.4 };
      if (VR.audio && VR.audio.bark) VR.audio.bark(best.x, best.y);
      if (VR.toast) VR.toast('🐕 ¡Se hizo tu amigo! Te sigue un rato');
      return true;
    }
    update(dt, focus, car) {
      this.t += dt; this.spawnT -= dt;
      for (let i = this.list.length - 1; i >= 0; i--) if (Math.hypot(this.list[i].x - focus.x, this.list[i].y - focus.y) > 950) this.list.splice(i, 1);
      if (this.spawnT <= 0 && this.list.length < this.max) { this.spawnT = 2.5; this.spawn(focus); }
      const tv = this.world.traffic || null;
      for (const d of this.list) {
        d.px = d.x; d.py = d.y;
        if (d.say) { d.say.t -= dt; if (d.say.t <= 0) d.say = null; }
        d.bark -= dt; if (d.bark <= 0) { d.bark = rnd(12, 40); if (d.mode !== 'run' && Math.hypot(d.x - focus.x, d.y - focus.y) < 400) { d.say = { text: pick(['¡Guau!', '¡Guau guau!', '¡Wof wof!']), t: 1.2 }; if (VR.audio && VR.audio.bark) VR.audio.bark(d.x, d.y); } }
        // ¿viene un vehículo rápido? (el tuyo o cualquier otro): se aparta corriendo
        let danger = null;
        const out = this._q || (this._q = []); out.length = 0;
        if (this.world.carsIn) this.world.carsIn(d.x - 70, d.y - 70, d.x + 70, d.y + 70, out);
        for (const o of out) { const vx = o.vx !== undefined ? o.vx : Math.sin(o.a) * (o.v || 0), vy = o.vy !== undefined ? o.vy : -Math.cos(o.a) * (o.v || 0), sp = Math.hypot(vx, vy); if (sp > 45) { danger = { x: o.x, y: o.y }; break; } }
        if (danger && d.mode !== 'run') { d.mode = 'run'; d.t = 1.6; d.follow = 0; this.away(d, danger); d.say = { text: pick(['¡Aú aú!', '¡Kai kai!']), t: 1.2 }; if (VR.audio && VR.audio.bark) VR.audio.bark(d.x, d.y, true); }
        d.t -= dt;
        if (d.mode === 'idle') {
          d.anim = 0;
          if (d.follow > 0 && !car) { const k = Math.hypot(d.x - focus.x, d.y - focus.y); if (k > 26) { d.mode = 'follow'; } }
          else if (d.t <= 0) {
            const r = Math.random();
            if (r < 0.4) { d.mode = 'trot'; d.t = rnd(2, 6); this.newDir(d); }
            else { d.pose = pick([2, 3, 3, 4, 5]); d.t = rnd(3, 9); if (d.pose === 3 || d.pose === 4) { if (d.dir === 'u' || d.dir === 'd') d.dir = Math.random() < 0.5 ? 'l' : 'r'; } }
          }
          continue;
        }
        if (d.mode === 'follow') {
          d.follow -= dt; const dx = focus.x - d.x, dy = (focus.y - 3) - d.y, k = Math.hypot(dx, dy);
          if (d.follow <= 0 || car || k > 420) { d.mode = 'idle'; d.follow = 0; d.t = 1; continue; }
          if (k < 18) { d.mode = 'idle'; d.pose = 2; d.t = 0.4; continue; }
          d.vx = dx / k; d.vy = dy / k; this.step(d, dt, k > 70 ? 62 : 32);
          continue;
        }
        const sp = d.mode === 'run' ? 78 : 26;
        this.step(d, dt, sp);
        if (d.t <= 0) { if (d.mode === 'run') { d.mode = 'trot'; d.t = rnd(1, 3); this.newDir(d); } else if (Math.random() < 0.5) { d.mode = 'idle'; d.pose = 2; d.t = rnd(2, 6); } else { d.t = rnd(2, 6); this.newDir(d); } }
      }
    }
    step(d, dt, sp) {
      const nx = d.x + d.vx * sp * dt, ny = d.y + d.vy * sp * dt;
      if (this.free(nx, ny) && this.free(d.x + d.vx * 8, d.y + d.vy * 8)) { d.x = nx; d.y = ny; d.anim += dt * (sp > 50 ? 16 : 9); }
      else this.newDir(d, true);
      if (Math.abs(d.vx) > Math.abs(d.vy)) d.dir = d.vx > 0 ? 'r' : 'l'; else if (d.vy) d.dir = d.vy > 0 ? 'd' : 'u';
    }
    newDir(d, avoid) {
      for (let k = 0; k < 8; k++) {
        const a = Math.random() * 6.283, vx = Math.cos(a), vy = Math.sin(a);
        if (this.free(d.x + vx * 14, d.y + vy * 14)) { d.vx = vx; d.vy = vy; return; }
      }
      d.mode = 'idle'; d.pose = 2; d.t = 1;
    }
    away(d, o) {
      const dx = d.x - o.x, dy = d.y - o.y, k = Math.hypot(dx, dy) || 1;
      for (const [sx, sy] of [[dx / k, dy / k], [-dy / k, dx / k], [dy / k, -dx / k], [dx / k, -dy / k]]) if (this.free(d.x + sx * 14, d.y + sy * 14)) { d.vx = sx; d.vy = sy; return; }
      this.newDir(d);
    }
    collect(camX, camY, sw, sh, al, out) {
      for (const d of this.list) {
        const x = Math.round(VR.lerp(d.px, d.x, al) - camX), y = Math.round(VR.lerp(d.py, d.y, al) - camY);
        if (x < -20 || y < -24 || x > sw + 20 || y > sh + 20) continue;
        if (d.say) (VR._late || (VR._late = [])).push({ bubble: d.say, px: x + camX, x: x + camX, py: y + camY - 4, y: y + camY - 4 });
        out.push({ sy: y + camY, draw: (ctx) => {
          const S = sprites[d.pal], moving = d.mode === 'trot' || d.mode === 'run' || (d.mode === 'follow'), fr = Math.floor(d.anim) % 2;
          let img, w, h;
          if (d.dir === 'd' || d.dir === 'u') { img = S[d.dir][moving ? fr : 0]; } else img = S[d.dir][moving ? fr : d.pose];
          w = img.width * 0.62; h = img.height * 0.62;   // sprite de 2 px por unidad, un poco más grande para que se lea
          VR.sun.blob(ctx, x, y, 3, w * 0.3, 1.4, 0.2); VR.sun.cast(ctx, img, x, y + 1, w, h, 0.26, 16);
          const wag = d.follow > 0 && d.mode === 'idle' ? Math.sin(this.t * 22) : 0;
          ctx.drawImage(img, Math.round(x - w / 2 + wag * 0.4), y - h + 1, w, h);
        } });
      }
    }
  };
})();
