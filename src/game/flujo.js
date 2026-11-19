// Gente entrando y saliendo de iglesias y colegios (18/11/2026, pedido de Leandro).
// - Iglesias: la gente llega, entra a misa o culto y después sale (domingos, y misa de la tarde entre semana en las católicas).
// - Colegios: estudiantes con uniforme (chomba blanca y pantalón o pollera azul, mochila) y padres que los llevan y los buscan,
//   a la entrada y la salida de cada turno (mañana y tarde), de lunes a viernes.
// Usa las puertas de los decals `iglesia` y `colegio` (tools/osm_to_map.py) y las personas de `VR.Peds` (peds.js): los que llegan van
// en modo 'go' hasta la puerta y desaparecen adentro; los que salen aparecen en la puerta y después caminan como cualquier peatón.
// La hora sale del reloj real (Libre) o de la hora de la Historia (VR.vida).
'use strict';
VR.Flujo = class {
  constructor(world, peds) {
    this.world = world; this.peds = peds; this.rnd = VR.rng(4242); this.acc = 0; this.lugares = [];
    // 12 estudiantes con uniforme (sprites que se suman a los de Peds; se dibujan a escala 0,78)
    const R = VR.rng(777), HM = ['corto', 'degrade', 'rapado', 'flequillo'], HF = ['colita', 'trenza', 'largo', 'medio', 'colitaLado'];
    this.kids = [];
    for (let i = 0; i < 12; i++) {
      const L = VR.av2Random(R), f = i % 2 === 1;
      Object.assign(L, { gender: f ? 'f' : 'm', build: 'flaco', beard: 'no', hair: (f ? HF : HM)[(R() * (f ? HF : HM).length) | 0], top: 'polo', topColor: 1, bottom: f ? 'pollera' : 'vestir', bottomColor: 13,
        shoes: 'zapatillas', shoesColor: 1, hat: 'ninguno', mochila: true, packColor: [0, 2, 4, 8][i % 4], makeup: 0 });
      peds.sprites.push(VR.av2Lazy(L)); this.kids.push(peds.sprites.length - 1);
    }
    for (const d of world.decals || []) {
      if (d.kind !== 'iglesia' && d.kind !== 'colegio') continue;
      const door = this.findDoor(d);
      if (door) this.lugares.push({ d, kind: d.kind, name: d.name || '', uni: !!d.uni, door, ph: (this.rnd() - 0.5) * 0.4 });
    }
  }
  // puerta: la baldosa de vereda más cercana a la fachada (y al centro del edificio); si entre la fachada y la vereda hay pasto o patio,
  // los que entran y salen lo cruzan sin chocar. Prueba el frente sur primero y después los otros lados.
  // pasable para este flujo: vereda/plaza, o (en las afueras, sin veredas) pasto, tierra o calle sin obstáculos
  pass(x, y) {
    const P = this.peds, W = this.world;
    if (P.walkable(x, y)) return true;
    const t = W.get(Math.floor(x / VR.TILE), Math.floor(y / VR.TILE)), T = VR.T;
    return (t === T.GRASS || t === T.DIRT || t === T.DIRTROAD) && !W.hits(x - 3, y - 3, x + 3, y);
  }
  findDoor(d) {
    const W = this.world, S = VR.TILE, B = VR.T.BUILDING, P = this.peds, cx = Math.floor(d.x + d.w / 2), cy = Math.floor(d.y + d.h / 2);
    const isB = (x, y) => W.get(x, y) === B;
    let best = null;
    for (const face of ['s', 'n', 'e', 'w']) {
      const horiz = face === 's' || face === 'n', n = horiz ? d.w : d.h, nx = face === 'e' ? 1 : face === 'w' ? -1 : 0, ny = face === 's' ? 1 : face === 'n' ? -1 : 0;
      for (let k = 0; k < n; k++) {
        const off = ((k + 1) >> 1) * (k & 1 ? 1 : -1), c = (horiz ? cx : cy) + off;
        if (c < (horiz ? d.x : d.y) || c >= (horiz ? d.x + d.w : d.y + d.h)) continue;
        // borde del edificio en esta fila o columna (la última baldosa de edificio mirando hacia afuera)
        let bx = horiz ? c : (face === 'e' ? d.x + d.w - 1 : d.x), by = horiz ? (face === 's' ? d.y + d.h - 1 : d.y) : c, t = 0;
        while (!isB(bx, by) && t++ < d.w + d.h) { bx -= nx; by -= ny; }
        if (!isB(bx, by)) continue;
        for (let g = 1; g <= 6; g++) {
          const tx = bx + nx * g, ty = by + ny * g;
          if (g > 1 && isB(tx, ty)) break;
          if (!this.pass(tx * S + 8, ty * S + 8)) continue;
          const score = (face === (d.pref || 's') ? 0 : 30) + (g - 1) * 12 + Math.abs(off);
          if (!best || score < best.score) {
            const ex = bx * S + 8 + nx * 8, ey = by * S + 8 + ny * 8; // punto del borde del edificio hacia la calle
            best = { score, x: tx * S + 8, y: ty * S + 8, ix: ex - nx * 8, iy: ey - ny * 8, face, axis: horiz ? 'x' : 'y', nx, ny };
          }
          break;
        }
        if (best && best.score < 8 && face === 's') break;
      }
      if (best && best.face === face && best.score < 40) break;
    }
    return best;
  }
  now() {
    const v = VR.vida;
    if (v) return { h: v.hora, wd: (v.dia - 1) % 7 };
    const D = new Date(); return { h: D.getHours() + D.getMinutes() / 60, wd: (D.getDay() + 6) % 7 }; // 0 = lunes … 6 = domingo
  }
  // cuánta gente llega ('in') y sale ('out') en este momento (0..1)
  inten(l, T) {
    const h = T.h + l.ph, wd = T.wd, w = (a, b) => (h >= a && h < b ? 1 : 0);
    if (l.kind === 'colegio') {
      if (wd > 4) return { in: 0, out: 0 };
      const dia = w(6, 18.5) * 0.08;
      if (l.uni) return { in: dia + 0.5 * (w(7, 8.2) + w(18, 19.2)), out: dia + 0.5 * (w(12, 13) + w(21.5, 22.5)) };
      return { in: dia + w(6.4, 7.3) + 0.9 * w(12.4, 13.3), out: dia + w(11.4, 12.3) + 0.9 * w(17.1, 18) };
    }
    const cat = /Catedral|Sagrado|Yvaroty/.test(l.name) || !l.name;
    if (wd === 6) return { in: 0.03 + w(6.4, 7.1) + w(8.4, 9.1) + w(17.4, 18.1) + 0.6 * w(18.9, 19.1), out: 0.03 + w(7.8, 8.5) + w(9.8, 10.5) + w(19, 19.7) };
    if (cat) return { in: 0.03 * w(7, 20) + 0.4 * w(17.9, 18.4), out: 0.03 * w(7, 20) + 0.4 * w(18.9, 19.4) };
    return { in: 0.03 * w(7, 20) + ((wd === 2 || wd === 4) ? 0.45 * w(18.7, 19.2) : 0), out: 0.03 * w(7, 20) + ((wd === 2 || wd === 4) ? 0.45 * w(20.3, 20.9) : 0) };
  }
  count() { let n = 0; for (const p of this.peds.list) if (p.flow) n++; return n; }
  update(dt, focus, view) {
    const P = this.peds, L = P.list;
    for (let i = L.length - 1; i >= 0; i--) if (L[i].dead) L.splice(i, 1);
    this.acc += dt; if (this.acc < 0.25) return;
    const step = this.acc; this.acc = 0;
    const F = [focus].concat(VR.extraFoci || []), T = this.now(); let n = this.count();
    for (const l of this.lugares) {
      if (n >= 16) break;
      if (!F.some((f) => Math.hypot(l.door.x - f.x, l.door.y - f.y) < 650)) continue;
      const I = this.inten(l, T);
      for (const ev of ['in', 'out']) {
        if (I[ev] <= 0 || this.rnd() > I[ev] * 0.35 * step) continue;
        n += this.spawn(l, ev);
      }
    }
  }
  // dirección libre a lo largo de la vereda (hacia donde hay lugar para caminar)
  along(l, sign) { return l.door.axis === 'x' ? [sign, 0] : [0, sign]; }
  spawn(l, ev) {
    const P = this.peds, door = l.door, dirs = this.rnd() < 0.5 ? [1, -1] : [-1, 1];
    let made = 0;
    for (const sg of dirs) {
      const [ax, ay] = this.along(l, sg);
      let x = door.x, y = door.y, ok = 0;
      if (ev === 'in') { // buscar un punto a 70–200 px por la vereda
        const want = 70 + this.rnd() * 130;
        for (let d = 8; d <= want; d += 8) { if (!this.pass(door.x + ax * d, door.y + ay * d)) break; ok = d; }
        if (ok < 50) continue;
        x = door.x + ax * ok; y = door.y + ay * ok;
      } else { if (!this.pass(door.x + ax * 10, door.y + ay * 10)) continue; x = door.ix; y = door.iy; }
      const school = l.kind === 'colegio', pair = this.rnd() < (school ? 0.5 : 0.3), grupo = [];
      const mk = (pal, sc, back) => {
        const px = ev === 'in' ? x + ax * back : x - door.nx * back, py = ev === 'in' ? y + ay * back : y - door.ny * back;
        const p = { x: px, y: py, px, py, dir: 'down', vx: 0, vy: 0, anim: this.rnd() * 8, mode: 'walk', t: 0, sp: 24 + this.rnd() * 10, pal, say: null, flow: true, fa: 0 };
        if (sc) p.sc = sc;
        if (ev === 'in') { p.mode = 'go'; p.go = { x: door.x, y: door.y, ix: door.ix, iy: door.iy, axis: door.axis, ph: 0 }; p.dir = ax > 0 ? 'left' : ax < 0 ? 'right' : ay > 0 ? 'up' : 'down'; }
        else { p.mode = 'go'; p.go = { x: door.x, y: door.y, out: true, ax, ay, ph: 1 }; p.dir = door.ny > 0 ? 'down' : door.ny < 0 ? 'up' : door.nx > 0 ? 'right' : 'left'; }
        P.list.push(p); grupo.push(p); made++;
      };
      const kid = this.kids[(this.rnd() * this.kids.length) | 0];
      if (school && (pair || this.rnd() < 0.8)) { mk(kid, 0.78, 0); if (pair) { mk(P.pickPal(x, y), 0, 9); grupo[1].sp = grupo[0].sp; } }
      else { mk(P.pickPal(x, y), 0, 0); if (pair) { mk(P.pickPal(x, y), 0, 9); grupo[1].sp = grupo[0].sp; } }
      return made;
    }
    return made;
  }
  // un actor que llega: camina por la vereda hasta la puerta y entra (se desvanece al cruzar la fachada)
  step(p, dt) {
    const g = p.go; p.fa = Math.min(p.fa === undefined ? 1 : p.fa, 1);
    if (g.out) { // sale del edificio hasta la baldosa de vereda (aparece de a poco) y después camina como cualquier peatón
      const dx = g.x - p.x, dy = g.y - p.y, d = Math.hypot(dx, dy);
      p.fa = Math.min(1, p.fa + dt * 2.5);
      if (d < 2.5) { const j = (this.rnd() - 0.5) * 8; if (g.ax) p.y += j; else p.x += j; p.go = null; p.mode = 'walk'; p.fa = 1; p.vx = g.ax; p.vy = g.ay; p.dir = g.ax > 0 ? 'right' : g.ax < 0 ? 'left' : g.ay > 0 ? 'down' : 'up'; p.t = 3 + this.rnd() * 6; return; }
      p.x += dx / d * p.sp * dt; p.y += dy / d * p.sp * dt; p.anim += dt * 8.5; return;
    }
    let tx, ty;
    if (g.ph === 0) { tx = g.axis === 'x' ? g.x : p.x; ty = g.axis === 'x' ? p.y : g.y; if (Math.hypot(tx - p.x, ty - p.y) < 2) g.ph = 1; }
    if (g.ph === 1) { tx = g.ix; ty = g.iy; }
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
    if (g.ph === 1) { p.fa = Math.max(0, Math.min(p.fa, d / 14)); if (d < 2.5) { p.dead = true; return; } }
    else p.fa = Math.min(1, p.fa + dt * 2.2);
    const vx = dx / d, vy = dy / d, nx = p.x + vx * p.sp * dt, ny = p.y + vy * p.sp * dt;
    if (g.ph === 0 && this.world.hits(nx - 3, ny - 3, nx + 3, ny)) { p.blk = (p.blk || 0) + dt; if (p.blk > 1.5) p.dead = true; return; }
    p.x = nx; p.y = ny; p.anim += dt * 8.5;
    p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }
};
