// Autos: un compacto original de 5 puertas (dibujado por código, sin marcas), estacionado por la ciudad,
// que se puede manejar. Física arcade simple: aceleración, freno, marcha atrás, giro según la velocidad,
// agarre distinto en asfalto, empedrado, tierra y pasto, y choques contra edificios, árboles, agua y otros autos.
'use strict';
VR.CAR = { LEN: 30, WID: 16, FRAMES: 64 };
VR.CAR_COLORS = [
  ['#c8322a', '#8e1f1a', '#e4685c'], // rojo
  ['#c9ccd1', '#8d9198', '#eef0f2'], // plateado
  ['#f2f0ea', '#b9b6ae', '#ffffff'], // blanco
  ['#2f5fa8', '#1e3f74', '#5c8ad0'], // azul
  ['#2c2c32', '#16161a', '#55555e'], // negro
  ['#d8a02a', '#9c6f16', '#f0c45a'], // amarillo
  ['#3f7f4a', '#28552f', '#66a872'], // verde
  ['#7a2a48', '#521a30', '#a44c6c'], // bordó
];

// Sprite base mirando hacia arriba (16×30): capó corto, parabrisas grande, techo, luneta y portón trasero.
VR.drawCarBase = (pal) => {
  const [C, D, L] = pal, c = VR.canvas(16, 30), P = VR.gfx.painter(c);
  const GLASS = '#3b4d63', GLASS_L = '#6f8aa6', TIRE = '#121214';
  // ruedas (asoman a los costados)
  P.r(0, 5, 2, 6, TIRE); P.r(14, 5, 2, 6, TIRE); P.r(0, 21, 2, 6, TIRE); P.r(14, 21, 2, 6, TIRE);
  // carrocería redondeada
  P.r(2, 1, 12, 28, C); P.r(1, 3, 14, 24, C);
  P.r(3, 0, 10, 1, C); P.r(3, 29, 10, 1, D);
  // sombreado lateral (luz del noroeste)
  P.r(13, 3, 2, 24, D); P.r(1, 3, 1, 24, L);
  // capó con brillo
  P.r(4, 2, 7, 1, L); P.r(4, 3, 2, 4, L);
  // parabrisas (trapecio)
  P.r(3, 8, 10, 4, GLASS); P.r(2, 10, 12, 2, GLASS); P.r(4, 8, 3, 1, GLASS_L); P.r(3, 9, 2, 1, GLASS_L);
  // techo
  P.r(3, 12, 10, 9, C); P.r(12, 12, 1, 9, D); P.r(4, 13, 6, 1, L);
  // ventanillas laterales
  P.r(1, 12, 1, 9, GLASS); P.r(14, 12, 1, 9, GLASS);
  // luneta trasera
  P.r(3, 21, 10, 4, GLASS); P.r(4, 21, 3, 1, GLASS_L);
  // portón trasero
  P.r(3, 25, 10, 3, D); P.r(4, 25, 8, 1, C);
  // faros y luces traseras
  P.r(2, 1, 3, 1, '#fff7c8'); P.r(11, 1, 3, 1, '#fff7c8');
  P.r(2, 28, 2, 1, '#e8302a'); P.r(12, 28, 2, 1, '#e8302a');
  // espejos
  P.r(0, 9, 1, 2, D); P.r(15, 9, 1, 2, D);
  return c;
};

// 64 ángulos rotados al pixel (vecino más cercano) y contorneados después, para que queden nítidos.
VR.carFrames = (() => {
  const cache = new Map();
  return (colorIdx) => {
    let f = cache.get(colorIdx);
    if (f) return f;
    const base = VR.drawCarBase(VR.CAR_COLORS[colorIdx % VR.CAR_COLORS.length]);
    const bw = base.width, bh = base.height, src = base.getContext('2d').getImageData(0, 0, bw, bh).data;
    const S = 36, N = VR.CAR.FRAMES;
    f = { img: [], shadow: [], S };
    for (let k = 0; k < N; k++) {
      const a = k / N * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const c = VR.canvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data;
      for (let y = 0; y < S; y++) for (let xx = 0; xx < S; xx++) {
        const dx = xx - S / 2 + 0.5, dy = y - S / 2 + 0.5;
        // rotación inversa: ángulo 0 = mirando arriba, sentido horario
        const sx = Math.round(dx * ca + dy * sa + bw / 2 - 0.5), sy = Math.round(-dx * sa + dy * ca + bh / 2 - 0.5);
        if (sx < 0 || sy < 0 || sx >= bw || sy >= bh) continue;
        const i = (sy * bw + sx) * 4, o = (y * S + xx) * 4;
        if (src[i + 3] < 128) continue;
        d[o] = src[i]; d[o + 1] = src[i + 1]; d[o + 2] = src[i + 2]; d[o + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      VR.gfx.outline(c, '#141216');
      const sh = VR.canvas(S, S), sx = sh.getContext('2d');
      sx.drawImage(c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(0,0,0,.32)'; sx.fillRect(0, 0, S, S);
      f.img.push(c); f.shadow.push(sh);
    }
    cache.set(colorIdx, f);
    return f;
  };
})();

VR.Car = class {
  constructor(world, x, y, angle, color) {
    this.world = world; this.x = this.px = x; this.y = this.py = y; this.a = this.pa = angle;
    this.v = 0; this.color = color; this.driven = false; this.hit = 0;
    this.frames = VR.carFrames(color);
  }
  // caja que ocupa (para chocar y para caminar alrededor), aproximada por su rectángulo girado
  box() {
    const hl = VR.CAR.LEN / 2 - 1, hw = VR.CAR.WID / 2 - 1, c = Math.abs(Math.cos(this.a)), s = Math.abs(Math.sin(this.a));
    const ex = hw * c + hl * s, ey = hw * s + hl * c;
    return { x0: this.x - ex, y0: this.y - ey, x1: this.x + ex, y1: this.y + ey, car: this };
  }
  // puntos del contorno del auto (para chocar)
  points(x, y, a) {
    const hl = VR.CAR.LEN / 2 - 1, hw = VR.CAR.WID / 2 - 2, fx = Math.sin(a), fy = -Math.cos(a), rx = Math.cos(a), ry = Math.sin(a);
    const out = [];
    for (const [l, w] of [[hl, -hw], [hl, hw], [-hl, -hw], [-hl, hw], [hl, 0], [-hl, 0], [0, -hw], [0, hw]])
      out.push([x + fx * l + rx * w, y + fy * l + ry * w]);
    return out;
  }
  blocked(x, y, a) {
    const W = this.world, S = VR.TILE;
    for (const [px, py] of this.points(x, y, a)) {
      if (W.solid(Math.floor(px / S), Math.floor(py / S))) return true;
      if (W.boxAt(px, py, this)) return true;
    }
    return false;
  }
  surfaceGrip() {
    const t = this.world.get(Math.floor(this.x / VR.TILE), Math.floor(this.y / VR.TILE)), T = VR.T;
    if (t === T.ROAD) return { max: 240, acc: 1 };
    if (t === T.STONE) return { max: 205, acc: 0.95 };
    if (t === T.DIRTROAD || t === T.DIRT) return { max: 170, acc: 0.85 };
    if (t === T.SIDEWALK || t === T.PAVING) return { max: 150, acc: 0.9 };
    return { max: 115, acc: 0.7 }; // pasto
  }
  // input: ejes y botones. Teclado y cruceta: arriba acelera, abajo frena/reversa, costados giran.
  // Joystick táctil o analógico: el auto va hacia donde apuntás, más rápido cuanto más lo empujás.
  update(dt, input) {
    this.px = this.x; this.py = this.y; this.pa = this.a;
    const g = this.surfaceGrip();
    let throttle = 0, steer = 0;
    const brake = input.down('run');
    const analog = input.source === 'touch';
    if (this.driven) {
      if (analog) {
        const m = Math.min(1, Math.hypot(input.ax, input.ay));
        if (m > 0.1) {
          const want = Math.atan2(input.ax, -input.ay);
          let d = want - this.a; d = Math.atan2(Math.sin(d), Math.cos(d));
          if (Math.abs(d) > 2.2 && this.v < 40) { throttle = -m; steer = VR.clamp(-d * 2, -1, 1); } // marcha atrás
          else { throttle = m * (Math.abs(d) > 1.6 ? 0.35 : 1); steer = VR.clamp(d * 2.2, -1, 1); }
        }
      } else {
        throttle = -input.ay; steer = input.ax;
      }
    }
    // velocidad
    if (brake) this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), 420 * dt);
    if (throttle > 0) this.v += (this.v < 0 ? 380 : 175 * g.acc) * throttle * dt;
    else if (throttle < 0) this.v += (this.v > 0 ? 380 : 120) * throttle * dt;
    else this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), 70 * dt); // rodar libre
    const max = g.max;
    if (this.v > max) this.v = Math.max(max, this.v - 260 * dt);
    if (this.v < -75) this.v = -75;
    // giro: depende de la velocidad (parado no gira), en reversa al revés
    const sp = Math.abs(this.v), turn = 2.7 * Math.min(1, sp / 55) * (1 - Math.min(0.45, sp / 600));
    this.a += steer * turn * Math.sign(this.v || 1) * dt;
    // mover en pasos chicos para no atravesar paredes
    const dist = this.v * dt, n = Math.max(1, Math.ceil(Math.abs(dist) / 4));
    for (let i = 0; i < n; i++) {
      const nx = this.x + Math.sin(this.a) * dist / n, ny = this.y - Math.cos(this.a) * dist / n;
      if (!this.blocked(nx, ny, this.a)) { this.x = nx; this.y = ny; continue; }
      // rozar: probar cada eje por separado
      if (!this.blocked(nx, this.y, this.a)) { this.x = nx; this.v *= 0.97; continue; }
      if (!this.blocked(this.x, ny, this.a)) { this.y = ny; this.v *= 0.97; continue; }
      if (Math.abs(this.v) > 60) { this.hit = 0.25; VR.input.buzz && VR.input.buzz(30); }
      this.v = -this.v * 0.25;
      break;
    }
    if (this.blocked(this.x, this.y, this.a)) this.a = this.pa; // el giro no puede meterlo en una pared
    if (this.hit > 0) this.hit -= dt;
    this.world.moveBox(this);
  }
  kmh() { return Math.round(Math.abs(this.v) / VR.TILE * 2 * 3.6); } // 1 tile = 2 m
  frame(a) {
    const N = VR.CAR.FRAMES;
    return ((Math.round(a / (Math.PI * 2) * N) % N) + N) % N;
  }
  draw(ctx, camX, camY, al) {
    const x = Math.round(VR.lerp(this.px, this.x, al) - camX), y = Math.round(VR.lerp(this.py, this.y, al) - camY);
    let a = this.pa + Math.atan2(Math.sin(this.a - this.pa), Math.cos(this.a - this.pa)) * al;
    const k = this.frame(a), F = this.frames, h = F.S >> 1;
    const shake = this.hit > 0 ? ((this.hit * 60) | 0) % 2 : 0;
    ctx.drawImage(F.shadow[k], x - h + 3, y - h + 3);
    ctx.drawImage(F.img[k], x - h + shake, y - h);
  }
};

// Autos estacionados junto al cordón, por toda la ciudad (siempre los mismos: semilla fija).
VR.parkCars = (world, n, near) => {
  const T = VR.T, rnd = VR.rng(2006), S = VR.TILE, cars = [];
  const road = (x, y) => { const t = world.get(x, y); return t === T.ROAD || t === T.STONE; };
  const curb = (x, y) => world.get(x, y) === T.SIDEWALK;
  // ¿hay lugar para estacionar en (x, y)? devuelve [cx, cy, ángulo] o null
  const spot = (x, y) => {
    if (!road(x, y)) return null;
    // cordón al norte o al sur: auto horizontal
    for (const dy of [-1, 1]) {
      let ok = true;
      for (let i = -1; i <= 2 && ok; i++) ok = road(x + i, y) && road(x + i, y - dy) && curb(x + i, y + dy) && !world.line[(y) * world.w + x + i];
      if (ok) return [x * S + 16, y * S + 8 - dy * 1, rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2];
    }
    for (const dx of [-1, 1]) {
      let ok = true;
      for (let i = -1; i <= 2 && ok; i++) ok = road(x, y + i) && road(x - dx, y + i) && curb(x + dx, y + i) && !world.line[(y + i) * world.w + x];
      if (ok) return [x * S + 8 - dx * 1, y * S + 16, rnd() < 0.5 ? 0 : Math.PI];
    }
    return null;
  };
  const free = (cx, cy) => !world.boxAt(cx, cy) && !world.boxAt(cx + 18, cy) && !world.boxAt(cx - 18, cy) && !world.boxAt(cx, cy + 18) && !world.boxAt(cx, cy - 18);
  const add = (s, color) => { const c = new VR.Car(world, s[0], s[1], s[2], color); world.addBox(c); cars.push(c); return c; };
  // el primero: bien cerca del punto de partida
  let first = null;
  if (near) {
    const tx = Math.floor(near.x / S), ty = Math.floor(near.y / S);
    let best = null;
    for (let r = 0; r < 14 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const s = spot(tx + dx, ty + dy);
      if (s && (!best || Math.hypot(s[0] - near.x, s[1] - near.y) < Math.hypot(best[0] - near.x, best[1] - near.y))) best = s;
    }
    if (best) { best[2] = Math.PI / 2; first = add(best, 0); }
  }
  for (let tries = 0; tries < n * 60 && cars.length < n; tries++) {
    const x = 2 + ((rnd() * (world.w - 4)) | 0), y = 2 + ((rnd() * (world.h - 4)) | 0);
    const s = spot(x, y);
    if (s && free(s[0], s[1])) add(s, 1 + ((rnd() * (VR.CAR_COLORS.length - 1)) | 0));
  }
  return { cars, first };
};
