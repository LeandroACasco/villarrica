// Vehículos: un compacto de 5 puertas y una moto chica, originales (dibujados por código, sin marcas).
// Física arcade simple: aceleración, freno, marcha atrás, giro según la velocidad, agarre distinto en
// asfalto, empedrado, tierra y pasto, y choques contra edificios, árboles, agua y otros vehículos.
// La misma clase sirve para el que manejás, los estacionados y los del tránsito (ver traffic.js).
'use strict';
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
VR.MOTO_COLORS = [
  ['#c8322a', '#8e1f1a', '#e4685c'], ['#2f5fa8', '#1e3f74', '#5c8ad0'], ['#2c2c32', '#16161a', '#55555e'],
  ['#e8e6e0', '#a9a69e', '#ffffff'], ['#3f8f4a', '#28552f', '#66b872'], ['#d87a1a', '#9c5210', '#f0a04a'],
];
VR.RIDER_SHIRTS = [['#d23c2c', '#9f2a20'], ['#2e6fc8', '#1f4c8c'], ['#f0ece2', '#b8b2a4'], ['#3b9a5a', '#286a3d'], ['#e8b830', '#a8841c'], ['#7a4ab0', '#563480'], ['#30303a', '#18181e']];

// Sprite base del compacto mirando hacia arriba (16×30): capó corto, parabrisas grande, techo, luneta y portón.
VR.drawCarBase = (pal) => {
  const [C, D, L] = pal, c = VR.canvas(16, 30), P = VR.gfx.painter(c);
  const GLASS = '#3b4d63', GLASS_L = '#6f8aa6', TIRE = '#121214';
  P.r(0, 5, 2, 6, TIRE); P.r(14, 5, 2, 6, TIRE); P.r(0, 21, 2, 6, TIRE); P.r(14, 21, 2, 6, TIRE);
  P.r(2, 1, 12, 28, C); P.r(1, 3, 14, 24, C);
  P.r(3, 0, 10, 1, C); P.r(3, 29, 10, 1, D);
  P.r(13, 3, 2, 24, D); P.r(1, 3, 1, 24, L);
  P.r(4, 2, 7, 1, L); P.r(4, 3, 2, 4, L);
  P.r(3, 8, 10, 4, GLASS); P.r(2, 10, 12, 2, GLASS); P.r(4, 8, 3, 1, GLASS_L); P.r(3, 9, 2, 1, GLASS_L);
  P.r(3, 12, 10, 9, C); P.r(12, 12, 1, 9, D); P.r(4, 13, 6, 1, L);
  P.r(1, 12, 1, 9, GLASS); P.r(14, 12, 1, 9, GLASS);
  P.r(3, 21, 10, 4, GLASS); P.r(4, 21, 3, 1, GLASS_L);
  P.r(3, 25, 10, 3, D); P.r(4, 25, 8, 1, C);
  P.r(2, 1, 3, 1, '#fff7c8'); P.r(11, 1, 3, 1, '#fff7c8');
  P.r(2, 28, 2, 1, '#e8302a'); P.r(12, 28, 2, 1, '#e8302a');
  P.r(0, 9, 1, 2, D); P.r(15, 9, 1, 2, D);
  return c;
};
// Moto chica (tipo 110–150 cc) mirando hacia arriba (10×20): rueda, manubrio ancho, tanque, asiento, rueda.
VR.drawMotoBase = (pal) => {
  const [C, D, L] = pal, c = VR.canvas(10, 20), P = VR.gfx.painter(c);
  const TIRE = '#141416', CHROME = '#b8bcc4';
  P.r(4, 0, 2, 5, TIRE); P.r(4, 15, 2, 5, TIRE);          // ruedas
  P.r(4, 1, 2, 1, '#fff7c8');                            // faro
  P.r(0, 4, 10, 1, '#2a2a2e'); P.r(0, 4, 1, 1, CHROME); P.r(9, 4, 1, 1, CHROME); // manubrio
  P.r(3, 5, 4, 4, C); P.r(3, 5, 1, 4, L); P.r(6, 5, 1, 4, D); // tanque / escudo
  P.r(3, 9, 4, 6, '#26262a'); P.r(4, 9, 2, 5, '#3a3a40'); // asiento
  P.r(3, 15, 4, 2, D); P.r(4, 17, 2, 1, '#e8302a');       // guardabarros y luz trasera
  P.r(7, 13, 1, 4, CHROME);                               // escape
  return c;
};
// Conductor de moto visto desde arriba (10×12): cabeza (pelo o casco), hombros y brazos al manubrio.
VR.drawRiderBase = (shirt, head) => {
  const c = VR.canvas(10, 20), P = VR.gfx.painter(c);
  P.r(0, 5, 2, 3, shirt[1]); P.r(8, 5, 2, 3, shirt[1]);  // brazos
  P.r(1, 7, 8, 5, shirt[0]); P.r(7, 7, 2, 5, shirt[1]);  // hombros y espalda
  P.r(3, 5, 4, 4, head); P.r(3, 5, 2, 1, head === '#2a1b12' ? '#3d2a1c' : '#ffffff'); // cabeza
  P.r(3, 12, 4, 2, '#2c3e6b');                           // piernas
  return c;
};

// Rota un sprite a 64 ángulos al pixel (vecino más cercano) y lo contornea después, para que quede nítido.
VR.rotFrames = (base, S, outline = true) => {
  const bw = base.width, bh = base.height, src = base.getContext('2d').getImageData(0, 0, bw, bh).data, N = 64;
  const f = { img: [], shadow: [], S };
  for (let k = 0; k < N; k++) {
    const a = k / N * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    const c = VR.canvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data;
    for (let y = 0; y < S; y++) for (let xx = 0; xx < S; xx++) {
      const dx = xx - S / 2 + 0.5, dy = y - S / 2 + 0.5;
      const sx = Math.round(dx * ca + dy * sa + bw / 2 - 0.5), sy = Math.round(-dx * sa + dy * ca + bh / 2 - 0.5);
      if (sx < 0 || sy < 0 || sx >= bw || sy >= bh) continue;
      const i = (sy * bw + sx) * 4, o = (y * S + xx) * 4;
      if (src[i + 3] < 128) continue;
      d[o] = src[i]; d[o + 1] = src[i + 1]; d[o + 2] = src[i + 2]; d[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    if (outline) VR.gfx.outline(c, '#141216');
    const sh = VR.canvas(S, S), sx = sh.getContext('2d');
    sx.drawImage(c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(0,0,0,.32)'; sx.fillRect(0, 0, S, S);
    f.img.push(c); f.shadow.push(sh);
  }
  return f;
};

// Datos de cada tipo: tamaño, sprites y manejo. max = velocidad tope por piso (px/s; 240 ≈ 108 km/h).
VR.VSPEC = {
  car: { len: 30, wid: 16, S: 36, colors: VR.CAR_COLORS, base: VR.drawCarBase, acc: 175, rev: 75, turn: 2.7, brake: 420,
    max: { road: 240, stone: 205, dirt: 170, side: 150, grass: 115 } },
  moto: { len: 18, wid: 8, S: 24, colors: VR.MOTO_COLORS, base: VR.drawMotoBase, acc: 230, rev: 25, turn: 3.5, brake: 460,
    max: { road: 250, stone: 215, dirt: 205, side: 160, grass: 135 } },
};
VR.vframes = (() => {
  const cache = new Map();
  return (type, color) => {
    const key = type + ':' + color;
    let f = cache.get(key);
    if (!f) { const sp = VR.VSPEC[type]; f = VR.rotFrames(sp.base(sp.colors[color % sp.colors.length]), sp.S); cache.set(key, f); }
    return f;
  };
})();
VR.riderFrames = (() => {
  const cache = new Map();
  return (shirt, head) => {
    const key = shirt.join() + head;
    let f = cache.get(key);
    if (!f) { f = VR.rotFrames(VR.drawRiderBase(shirt, head), 24); cache.set(key, f); }
    return f;
  };
})();

VR.Car = class {
  constructor(world, x, y, angle, color, type = 'car') {
    this.world = world; this.type = type; this.spec = VR.VSPEC[type];
    this.x = this.px = x; this.y = this.py = y; this.a = this.pa = angle;
    this.v = 0; this.color = color; this.driven = false; this.hit = 0;
    this.rider = null; // moto: {shirt, head} cuando alguien la maneja
    this.frames = VR.vframes(type, color);
  }
  get LEN() { return this.spec.len; }
  get WID() { return this.spec.wid; }
  box() {
    const hl = this.spec.len / 2 - 1, hw = this.spec.wid / 2 - 1, c = Math.abs(Math.cos(this.a)), s = Math.abs(Math.sin(this.a));
    const ex = hw * c + hl * s, ey = hw * s + hl * c;
    return { x0: this.x - ex, y0: this.y - ey, x1: this.x + ex, y1: this.y + ey, car: this };
  }
  points(x, y, a) {
    const hl = this.spec.len / 2 - 1, hw = Math.max(2, this.spec.wid / 2 - 2), fx = Math.sin(a), fy = -Math.cos(a), rx = Math.cos(a), ry = Math.sin(a);
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
  topSpeed() {
    const t = this.world.get(Math.floor(this.x / VR.TILE), Math.floor(this.y / VR.TILE)), T = VR.T, m = this.spec.max;
    if (t === T.ROAD) return [m.road, 1];
    if (t === T.STONE) return [m.stone, 0.95];
    if (t === T.DIRTROAD || t === T.DIRT) return [m.dirt, 0.85];
    if (t === T.SIDEWALK || t === T.PAVING) return [m.side, 0.9];
    return [m.grass, 0.7];
  }
  // Teclado y cruceta: arriba acelera, abajo frena/reversa, costados giran.
  // Joystick táctil: el vehículo va hacia donde apuntás, más rápido cuanto más lo empujás.
  update(dt, input) {
    this.px = this.x; this.py = this.y; this.pa = this.a;
    const sp = this.spec, [max, grip] = this.topSpeed();
    let throttle = 0, steer = 0;
    const brake = input.down('run');
    if (input.source === 'touch') {
      const m = Math.min(1, Math.hypot(input.ax, input.ay));
      if (m > 0.1) {
        const want = Math.atan2(input.ax, -input.ay);
        let d = want - this.a; d = Math.atan2(Math.sin(d), Math.cos(d));
        if (Math.abs(d) > 2.2 && this.v < 40) { throttle = -m; steer = VR.clamp(-d * 2, -1, 1); }
        else { throttle = m * (Math.abs(d) > 1.6 ? 0.35 : 1); steer = VR.clamp(d * 2.2, -1, 1); }
      }
    } else { throttle = -input.ay; steer = input.ax; }
    if (brake) this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), sp.brake * dt);
    if (throttle > 0) this.v += (this.v < 0 ? 380 : sp.acc * grip) * throttle * dt;
    else if (throttle < 0) this.v += (this.v > 0 ? 380 : 120) * throttle * dt;
    else this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), 70 * dt);
    if (this.v > max) this.v = Math.max(max, this.v - 260 * dt);
    if (this.v < -sp.rev) this.v = -sp.rev;
    const s = Math.abs(this.v), turn = sp.turn * Math.min(1, s / 55) * (1 - Math.min(0.45, s / 600));
    this.a += steer * turn * Math.sign(this.v || 1) * dt;
    this.advance(this.v * dt);
  }
  // mover en pasos chicos para no atravesar paredes; roza o rebota al chocar
  advance(dist) {
    const n = Math.max(1, Math.ceil(Math.abs(dist) / 4));
    for (let i = 0; i < n; i++) {
      const nx = this.x + Math.sin(this.a) * dist / n, ny = this.y - Math.cos(this.a) * dist / n;
      if (!this.blocked(nx, ny, this.a)) { this.x = nx; this.y = ny; continue; }
      if (!this.blocked(nx, this.y, this.a)) { this.x = nx; this.v *= 0.97; continue; }
      if (!this.blocked(this.x, ny, this.a)) { this.y = ny; this.v *= 0.97; continue; }
      if (Math.abs(this.v) > 60) { this.hit = 0.25; if (this.driven && VR.input.buzz) VR.input.buzz(30); }
      this.v = -this.v * 0.25;
      break;
    }
    if (this.blocked(this.x, this.y, this.a)) this.a = this.pa;
    if (this.hit > 0) this.hit -= VR.loop.STEP;
    this.world.moveBox(this);
  }
  kmh() { return Math.round(Math.abs(this.v) / VR.TILE * 2 * 3.6); } // 1 tile = 2 m
  frame(a) { const N = 64; return ((Math.round(a / (Math.PI * 2) * N) % N) + N) % N; }
  draw(ctx, camX, camY, al) {
    const x = Math.round(VR.lerp(this.px, this.x, al) - camX), y = Math.round(VR.lerp(this.py, this.y, al) - camY);
    const a = this.pa + Math.atan2(Math.sin(this.a - this.pa), Math.cos(this.a - this.pa)) * al;
    const k = this.frame(a), F = this.frames, h = F.S >> 1;
    const shake = this.hit > 0 ? ((this.hit * 60) | 0) % 2 : 0;
    ctx.drawImage(F.shadow[k], x - h + 3, y - h + 3);
    ctx.drawImage(F.img[k], x - h + shake, y - h);
    if (this.rider) {
      const R = VR.riderFrames(this.rider.shirt, this.rider.head), rh = R.S >> 1;
      ctx.drawImage(R.img[k], x - rh + shake, y - rh - 1);
    }
  }
};

// Vehículos estacionados (siempre los mismos: semilla fija).
//  - experimento en Mariscal Estigarribia frente a la Plaza de los Héroes (mano única hacia el este):
//    autos en fila del lado izquierdo (el de la plaza) y motos en batería del lado derecho;
//  - en el resto de la ciudad: autos en paralelo al cordón y algunas motos en batería.
VR.parkCars = (world, n, near) => {
  const T = VR.T, rnd = VR.rng(2006), S = VR.TILE, cars = [];
  const road = (x, y) => { const t = world.get(x, y); return t === T.ROAD || t === T.STONE; };
  const curb = (x, y) => world.get(x, y) === T.SIDEWALK;
  const add = (x, y, a, color, type = 'car') => { const c = new VR.Car(world, x, y, a, color, type); world.addBox(c); cars.push(c); return c; };
  let first = null;

  // --- el experimento: la cuadra al sur de la plaza ---
  if (near) {
    const tx = Math.floor(near.x / S);
    // la calle que pasa entre la plaza y el punto de partida (arriba de la vereda donde arrancás)
    let yb = Math.floor(near.y / S), lim = 12;
    while (lim-- > 0 && !road(tx, yb)) yb--;
    let ty = yb; while (road(tx, ty - 1)) ty--;               // ty: fila junto al cordón norte (la plaza), yb: cordón sur
    if (yb - ty >= 3) {
      // largo de la cuadra: mientras haya vereda del lado de la plaza
      let x0 = tx, x1 = tx;
      while (curb(x0 - 1, ty - 1) && road(x0 - 1, ty)) x0--;
      while (curb(x1 + 1, ty - 1) && road(x1 + 1, ty)) x1++;
      x0 += 2; x1 -= 2;                                       // lejos de las esquinas
      const yl = ty * S + 8, yr = (yb + 1) * S - 6;           // autos a 8 px del cordón norte, motos contra el cordón sur
      const fx = (x0 + 1) * S;
      // autos en fila, mirando hacia el este (el sentido de la calle); el primero, rojo, frente a donde arrancás
      const slots = [];
      for (let px = x0 * S + 16; px <= x1 * S - 16; px += 36) slots.push(px);
      slots.sort((a, b) => Math.abs(a - near.x) - Math.abs(b - near.x));
      first = add(slots[0], yl, Math.PI / 2, 0);
      for (let i = 1; i < slots.length; i++) if (rnd() < 0.85) add(slots[i], yl, Math.PI / 2, 1 + ((rnd() * (VR.CAR_COLORS.length - 1)) | 0));
      // motos en batería, la rueda trasera contra el cordón sur (miran hacia la calle), cada 11 px
      for (let px = fx; px <= x1 * S - 8; px += 11) if (rnd() < 0.8)
        add(px + ((rnd() * 2) | 0), yr - 8, (rnd() < 0.5 ? 0 : 0.12) - 0.06 + (rnd() < 0.15 ? 0.25 : 0), (rnd() * VR.MOTO_COLORS.length) | 0, 'moto');
      world.parkingDemo = { x0: x0 * S, x1: x1 * S, y0: ty * S, y1: (yb + 1) * S };
    }
  }

  const spot = (x, y) => {
    if (!road(x, y)) return null;
    for (const dy of [-1, 1]) {
      let ok = true;
      for (let i = -1; i <= 2 && ok; i++) ok = road(x + i, y) && road(x + i, y - dy) && curb(x + i, y + dy) && !world.line[y * world.w + x + i];
      if (ok) return [x * S + 16, y * S + 8 - dy, rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2, dy, 0];
    }
    for (const dx of [-1, 1]) {
      let ok = true;
      for (let i = -1; i <= 2 && ok; i++) ok = road(x, y + i) && road(x - dx, y + i) && curb(x + dx, y + i) && !world.line[(y + i) * world.w + x];
      if (ok) return [x * S + 8 - dx, y * S + 16, rnd() < 0.5 ? 0 : Math.PI, 0, dx];
    }
    return null;
  };
  const free = (cx, cy, r) => !world.boxOverlap(cx - r, cy - r, cx + r, cy + r);
  const demo = world.parkingDemo;
  const inDemo = (x, y) => demo && x > demo.x0 - 60 && x < demo.x1 + 60 && y > demo.y0 - 20 && y < demo.y1 + 20;
  for (let tries = 0; tries < n * 60 && cars.length < n; tries++) {
    const x = 2 + ((rnd() * (world.w - 4)) | 0), y = 2 + ((rnd() * (world.h - 4)) | 0);
    const s = spot(x, y);
    if (!s || inDemo(s[0], s[1])) continue;
    if (rnd() < 0.22) { // 2 o 3 motos en batería contra el cordón
      const [cx, cy, , dy, dx] = s, k = 2 + ((rnd() * 2) | 0);
      for (let i = 0; i < k; i++) {
        const mx = dy ? cx - 11 + i * 11 : cx + dx * 4, my = dy ? cy + dy * 4 : cy - 11 + i * 11;
        const a = dy ? (dy > 0 ? 0 : Math.PI) : (dx > 0 ? -Math.PI / 2 : Math.PI / 2);
        if (free(mx, my, 6)) add(mx, my, a, (rnd() * VR.MOTO_COLORS.length) | 0, 'moto');
      }
    } else if (free(s[0], s[1], 18)) add(s[0], s[1], s[2], 1 + ((rnd() * (VR.CAR_COLORS.length - 1)) | 0));
  }
  return { cars, first };
};
