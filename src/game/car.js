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
    if (t === T.SIDEWALK || t === T.PAVING || t === T.CHECKER) return [m.side, 0.9];
    return [m.grass, 0.7];
  }
  // Teclado y cruceta: arriba acelera, abajo frena/reversa, costados giran.
  // Joystick táctil: el vehículo va hacia donde apuntás, más rápido cuanto más lo empujás.
  update(dt, input) {
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
    this.physics(dt, throttle, steer, brake);
  }
  get mass() { return this.type === 'moto' ? 0.3 : 1; }
  // Física: velocidad como vector (vx, vy) además del rumbo, así el vehículo puede derrapar;
  // giro con velocidad angular (w) que también cambian los choques.
  physics(dt, throttle, steer, brake, parked = false) {
    this.px = this.x; this.py = this.y; this.pa = this.a;
    if (this.vx === undefined) { this.vx = Math.sin(this.a) * this.v; this.vy = -Math.cos(this.a) * this.v; this.w = 0; }
    const sp = this.spec, [max, gripF] = this.topSpeed();
    let fx = Math.sin(this.a), fy = -Math.cos(this.a), rx = Math.cos(this.a), ry = Math.sin(this.a);
    let vf = this.vx * fx + this.vy * fy, vr = this.vx * rx + this.vy * ry;
    // motor y frenos (sobre la velocidad hacia adelante)
    if (parked) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 260 * dt);
    else {
      if (brake) vf -= Math.sign(vf) * Math.min(Math.abs(vf), sp.brake * dt);
      if (throttle > 0) vf += (vf < 0 ? 380 : sp.acc * gripF) * throttle * dt;
      else if (throttle < 0) vf += (vf > 0 ? 380 : 120) * throttle * dt;
      else vf -= Math.sign(vf) * Math.min(Math.abs(vf), 70 * dt);
      if (vf > max) vf = Math.max(max, vf - 260 * dt);
      if (vf < -sp.rev) vf = Math.max(-sp.rev, vf + 300 * dt);
    }
    // agarre lateral: menos en tierra y pasto, y casi nada si frenás fuerte doblando (derrape)
    const t = this.world.get(Math.floor(this.x / VR.TILE), Math.floor(this.y / VR.TILE)), T = VR.T;
    let grip = t === T.ROAD ? 9 : t === T.STONE ? 7 : t === T.DIRTROAD || t === T.DIRT ? 4.5 : t === T.SIDEWALK || t === T.PAVING || t === T.CHECKER ? 7.5 : 3.5;
    if (this.type === 'moto') grip *= 1.4;
    if (brake && Math.abs(vf) > 70 && Math.abs(steer) > 0.2) grip *= 0.22;
    if (parked) grip = 6;
    vr *= Math.exp(-grip * dt);
    // giro: la velocidad angular busca la del volante (y se recupera de los golpes)
    const s = Math.abs(vf), wt = parked ? 0 : steer * sp.turn * Math.min(1, s / 55) * (1 - Math.min(0.45, s / 600)) * (vf < -2 ? -1 : 1);
    this.w += (wt - this.w) * Math.min(1, (parked ? 2.5 : 7) * dt);
    this.vx = fx * vf + rx * vr; this.vy = fy * vf + ry * vr;
    // marcas de frenada / derrape
    if (Math.abs(vr) > 25 || (brake && s > 90)) this.skid(t === T.DIRTROAD || t === T.DIRT || t === T.GRASS);
    this.move(dt);
    fx = Math.sin(this.a); fy = -Math.cos(this.a);
    this.v = this.vx * fx + this.vy * fy;
    if (this.hit > 0) this.hit -= dt;
    this.world.moveBox(this);
  }
  skid(dirt) {
    const fx = Math.sin(this.a), fy = -Math.cos(this.a), rx = Math.cos(this.a), ry = Math.sin(this.a), l = this.spec.len / 2 - 5, w = this.spec.wid / 2 - 2;
    const col = dirt ? 'rgba(90,45,20,.4)' : 'rgba(18,16,14,.45)';
    const wheels = this.type === 'moto' ? [[this.x - fx * l, this.y - fy * l]]
      : [[this.x - fx * l + rx * w, this.y - fy * l + ry * w], [this.x - fx * l - rx * w, this.y - fy * l - ry * w]];
    const last = this._sk && this._skT > performance.now() - 120 ? this._sk : null;
    wheels.forEach((p, i) => { const q = last ? last[i] : p; this.world.markLine(q[0], q[1], p[0], p[1], col); });
    this._sk = wheels; this._skT = performance.now();
  }
  // ¿qué toca el vehículo en esta posición? puntos bloqueados y el primer vehículo tocado
  contacts(x, y, a) {
    const W = this.world, S = VR.TILE, pts = [];
    let other = null;
    for (const [px, py] of this.points(x, y, a)) {
      if (W.solid(Math.floor(px / S), Math.floor(py / S))) { pts.push(px, py); continue; }
      const o = W.boxAt(px, py, this);
      if (o) { pts.push(px, py); other = other || o; }
    }
    return pts.length ? { pts, other } : null;
  }
  // mover en pasos chicos; al chocar: rebote (según el ángulo), roce contra la pared, giro por el golpe
  // y, si es otro vehículo, intercambio de impulso (lo empujás)
  move(dt) {
    const sp = Math.hypot(this.vx, this.vy), n = Math.max(1, Math.ceil(sp * dt / 3) + (Math.abs(this.w) * dt > 0.05 ? 1 : 0));
    const h = dt / n;
    // si arrancó metido en algo (lo empujaron, apareció encima), primero se separa
    const now = this.contacts(this.x, this.y, this.a);
    if (now) {
      let freed = false;
      for (let d = 1; d <= 8 && !freed; d++) for (let k = 0; k < 8 && !freed; k++) {
        const ex = Math.cos(k * Math.PI / 4) * d, ey = Math.sin(k * Math.PI / 4) * d;
        if (!this.contacts(this.x + ex, this.y + ey, this.a)) { this.x += ex; this.y += ey; freed = true; }
      }
      if (!freed) { this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= 0.9; this.vy *= 0.9; return; } // trabado del todo: se escurre
    }
    for (let i = 0; i < n; i++) {
      const nx = this.x + this.vx * h, ny = this.y + this.vy * h, na = this.a + this.w * h;
      const c = this.contacts(nx, ny, na);
      if (!c) { this.x = nx; this.y = ny; this.a = na; continue; }
      // normal del choque: desde los puntos tocados hacia el centro
      let mx = 0, my = 0, k = c.pts.length / 2;
      for (let j = 0; j < c.pts.length; j += 2) { mx += c.pts[j]; my += c.pts[j + 1]; }
      mx /= k; my /= k;
      let nnx = nx - mx, nny = ny - my, nl = Math.hypot(nnx, nny);
      if (nl < 0.01) { nnx = -this.vx; nny = -this.vy; nl = Math.hypot(nnx, nny) || 1; }
      nnx /= nl; nny /= nl;
      const o = c.other;
      let impact = 0;
      if (o) {
        if (o.vx === undefined) { o.vx = Math.sin(o.a) * o.v; o.vy = -Math.cos(o.a) * o.v; o.w = 0; }
        const rvn = (this.vx - o.vx) * nnx + (this.vy - o.vy) * nny;
        if (rvn < 0) {
          const e = 0.35, J = -(1 + e) * rvn / (1 / this.mass + 1 / o.mass);
          this.vx += J / this.mass * nnx; this.vy += J / this.mass * nny;
          o.vx -= J / o.mass * nnx; o.vy -= J / o.mass * nny;
          // giro de los dos según dónde fue el golpe
          const cx = mx - nx, cy = my - ny, ox = mx - o.x, oy = my - o.y;
          this.w += (cx * nny - cy * nnx) * J * 0.0016 / this.mass;
          o.w -= (ox * nny - oy * nnx) * J * 0.0016 / o.mass;
          o.hit = Math.min(0.3, -rvn / 300);
          impact = -rvn;
          this.world.wake(o, impact);
        }
      } else {
        const vn = this.vx * nnx + this.vy * nny;
        if (vn < 0) {
          const e = 0.3;
          this.vx -= (1 + e) * vn * nnx; this.vy -= (1 + e) * vn * nny;
          // roce: pierde algo de la velocidad que va a lo largo de la pared
          const tx = this.vx - (this.vx * nnx + this.vy * nny) * nnx, ty = this.vy - (this.vx * nnx + this.vy * nny) * nny;
          this.vx -= tx * 0.12; this.vy -= ty * 0.12;
          const cx = mx - nx, cy = my - ny;
          this.w += (cx * nny - cy * nnx) * (-vn) * 0.0022;
          impact = -vn;
        }
      }
      this.w = VR.clamp(this.w, -6, 6);
      if (impact > 50) { this.hit = Math.min(0.35, impact / 300); if (this.driven && VR.input.buzz) VR.input.buzz(Math.min(60, impact / 4)); if (this.onImpact) this.onImpact(impact, o); }
      // no se mete en la pared: si el giro solo ya lo traba, no gira; y si quedó pegado, se separa un poco
      if (!this.contacts(this.x, this.y, na)) this.a = na;
      else if (this.contacts(this.x, this.y, this.a)) {
        for (let d = 1; d <= 4; d++) if (!this.contacts(this.x + nnx * d, this.y + nny * d, this.a)) { this.x += nnx * d; this.y += nny * d; break; }
      }
    }
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
  const curb = (x, y) => { const t = world.get(x, y); return t === T.SIDEWALK || t === T.CHECKER; };
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
      world.parkingDemo = [{ x0: x0 * S, x1: x1 * S, y0: ty * S, y1: (yb + 1) * S }];
    }
    // --- y en General Díaz, del lado este de la plaza (mano única hacia el norte): autos a la izquierda
    //     (oeste, el lado de la plaza, como en la foto satelital) y motos a la derecha ---
    const ai = world.areas.indexOf('Plaza de los Héroes') + 1;
    if (ai) {
      let bx0 = 1e9, bx1 = -1, by0 = 1e9, by1 = -1;
      const cx0 = Math.max(0, tx - 90), cy0 = Math.max(0, Math.floor(near.y / S) - 90);
      for (let y = cy0; y < Math.min(world.h, cy0 + 180); y++) for (let x = cx0; x < Math.min(world.w, cx0 + 180); x++)
        if (world.area[y * world.w + x] === ai) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
      if (bx1 > 0) {
        const my = (by0 + by1) >> 1;
        let xa = bx1 + 1, lim2 = 10; while (lim2-- > 0 && !road(xa, my)) xa++;
        let xb = xa; while (road(xb + 1, my)) xb++;
        if (xb - xa >= 3) {
          const ya = by0 + 3, yz = by1 - 3, xl = xa * S + 8, xr = (xb + 1) * S - 6;
          for (let py = ya * S + 16; py <= yz * S - 16; py += 36) if (rnd() < 0.85) add(xl, py, 0, 1 + ((rnd() * (VR.CAR_COLORS.length - 1)) | 0));
          for (let py = (ya + 1) * S; py <= yz * S - 8; py += 11) if (rnd() < 0.8)
            add(xr - 8, py + ((rnd() * 2) | 0), -Math.PI / 2 - 0.06 + (rnd() < 0.5 ? 0 : 0.12) + (rnd() < 0.15 ? 0.25 : 0), (rnd() * VR.MOTO_COLORS.length) | 0, 'moto');
          (world.parkingDemo = world.parkingDemo || []).push({ x0: xa * S, x1: (xb + 1) * S, y0: ya * S, y1: yz * S });
        }
      }
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
  const inDemo = (x, y) => demo && demo.some((d) => x > d.x0 - 60 && x < d.x1 + 60 && y > d.y0 - 60 && y < d.y1 + 60);
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
