// Mbohasa de verdad (12/11/2026, pedido de Leandro): al pedirlo viene un conductor real (en moto o en auto) por las calles, se
// para a tu lado, te subís atrás (moto) o adentro (auto) y te lleva por el camino del GPS hasta el destino, donde te bajás.
// Antes era un teletransporte con precio. Conduce solo, siguiendo la ruta de VR.GPS (persecución pura + freno en curvas y ante
// obstáculos); si se tranca mucho tiempo, hace el viaje igual con un fundido (llevar). Todo original.
'use strict';
VR.Mbohasa = class {
  // o: { world, gps, player, toast, dialogo(lineas), pagar(precio, txt) → bool, bajar(v) → bool (deja al jugador al lado),
  //      yo() → pasajero (cómo se ve el jugador arriba de la moto), llevar(dest) (teletransporte de emergencia), manejando() → bool, fin(r) }
  constructor(o) { Object.assign(this, o); this.r = null; this.v = null; this.riding = false; }
  static vial(t) { const T = VR.T; return t === T.ROAD || t === T.STONE || t === T.DIRTROAD; }
  get activo() { return !!this.r; }
  nombre(tipo) { return tipo === 'moto' ? 'moto' : 'auto'; }
  // cuánto falta para llegar (s, aproximado) o texto del estado para el celular
  texto() {
    const r = this.r; if (!r) return '';
    const N = this.nombre(r.tipo), seg = Math.max(1, Math.ceil(VR.polyLen(r.P, VR.polyNear(r.P, this.v.x, this.v.y)[1]) / 100));
    if (r.st === 'viene') return 'Tu ' + N + ' viene en camino: ~' + seg + ' s. Esperalo en la vereda, cerca de la calle.';
    if (r.st === 'espera') return 'Tu ' + N + ' ya llegó: acercate.';
    return 'Viaje a ' + (r.dest.name || 'tu destino') + ' en curso.';
  }
  // camino de vehículo desde (fx, fy) hasta el punto de calle más cercano a (tx, ty): por el nodo de cualquiera de las dos puntas del tramo, el más corto
  ruta(fx, fy, tx, ty) {
    const G = this.gps, e = G.nearEdge(tx, ty, 500); if (!e) return null;
    let best = null, bl = Infinity;
    for (const n of [e.a, e.b]) { const P = G.route(fx, fy, G.nx[n], G.ny[n], true); if (!P || P.length < 4) continue; const Q = P.concat([e.px, e.py]), l = VR.polyLen(Q); if (l < bl) { bl = l; best = Q; } }
    return best && this.carril(best, 8);
  }
  // corre la ruta unos px hacia la derecha (mano derecha, como el tránsito) para no chocar de frente con los que vienen; en las puntas vuelve al eje
  carril(P, off) {
    const n = P.length / 2; if (n < 3) return P;
    const L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(P[i * 2] - P[i * 2 - 2], P[i * 2 + 1] - P[i * 2 - 1]));
    const tot = L[n - 1], Q = [];
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1); let dx = P[b * 2] - P[a * 2], dy = P[b * 2 + 1] - P[a * 2 + 1]; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
      const k = off * VR.clamp(Math.min(L[i], tot - L[i]) / 40, 0, 1);
      Q.push(P[i * 2] - dy * k, P[i * 2 + 1] + dx * k);
    }
    return Q;
  }
  crear(tipo, x, y, a) {
    const w = this.world; let v;
    if (tipo === 'moto') v = new VR.Car(w, x, y, a, (Math.random() * 6) | 0, 'moto', 'cub');
    else v = new VR.Car(w, x, y, a, 3, 'car', 'sedan', { ...VR.tuneDefault('sedan'), color: 3 });
    if (v.contacts(x, y, a)) return null;
    v.mbh = true; v.v = 0; v.ghost = 0;
    if (tipo === 'moto') { const L = VR.av2Random(); v.rider = Object.assign(VR.av2Rider(L), { L }); } else v.taxi = true; // el auto lleva el cartelito amarillo
    w.addBox(v); return v;
  }
  quitar() { if (this.v) { this.world.removeBox(this.v); this.v = null; } this.riding = false; this.r = null; }
  // pedir: busca una esquina de calle a 330–700 px (fuera de pantalla) con camino hasta vos y hace aparecer al conductor ahí
  pedir(tipo, precio, dest) {
    if (this.r || !this.gps || !this.gps.ok) return false;
    const f = this.player, G = this.gps;
    for (const [d0, d1] of [[330, 700], [250, 1000]]) { // esquinas de calle en el anillo (primero fuera de pantalla; si no hay, más cerca)
      const cand = [];
      for (let i = 0; i < G.N; i++) {
        if (!G.adj[i].length) continue;
        const d = Math.hypot(G.nx[i] - f.x, G.ny[i] - f.y); if (d < d0 || d > d1 || !VR.Mbohasa.vial(this.world.get(Math.floor(G.nx[i] / 16), Math.floor(G.ny[i] / 16)))) continue;
        cand.push(i);
      }
      for (let n = cand.length - 1; n > 0; n--) { const m = (Math.random() * (n + 1)) | 0; [cand[n], cand[m]] = [cand[m], cand[n]]; }
      for (const i of cand.slice(0, 25)) {
        const x = G.nx[i], y = G.ny[i], Q = this.ruta(x, y, f.x, f.y); if (!Q || Q.length < 6 || VR.polyLen(Q) > 1400) continue;
        let k = 2; while (k + 1 < Q.length && Math.hypot(Q[k] - x, Q[k + 1] - y) < 2) k += 2;
        const v = this.crear(tipo, x, y, Math.atan2(Q[k] - x, -(Q[k + 1] - y))); if (!v) continue;
        this.v = v; this.r = { tipo, precio, dest, st: 'viene', P: Q, t: 0, rec: 2.5, fx: f.x, fy: f.y, wait: 0, blk: 0, atras: 0 };
        return true;
      }
    }
    this.toast('🛵 No hay conductores cerca ahora: probá en un ratito'); return false;
  }
  cancelar() { const r = this.r; if (!r || r.st === 'viaje' || r.st === 'sale') return false; this.quitar(); this.toast('Cancelaste el Mbohasa'); return true; }
  // punto de la ruta P a L px adelante de la proyección de (x, y) sobre el segmento i
  adelante(P, i, x, y, L) {
    let k = i * 2; if (k + 3 >= P.length) return [P[P.length - 2], P[P.length - 1]];
    const ax = P[k], ay = P[k + 1], dx = P[k + 2] - ax, dy = P[k + 3] - ay, L2 = dx * dx + dy * dy || 1, t = VR.clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1);
    let cx = ax + dx * t, cy = ay + dy * t, rem = L;
    for (; k + 3 < P.length; k += 2) { const nx = P[k + 2], ny = P[k + 3], s = Math.hypot(nx - cx, ny - cy); if (s >= rem) { const q = rem / (s || 1); return [cx + (nx - cx) * q, cy + (ny - cy) * q]; } rem -= s; cx = nx; cy = ny; }
    return [cx, cy];
  }
  // maneja el vehículo v siguiendo la ruta P un cuadro; devuelve true cuando llegó al final y ya casi frenó
  seguir(dt, P, v, kv) {
    const w = this.world, sp = v.spec, moto = v.type === 'moto', r = this.r;
    const [, i] = VR.polyNear(P, v.x, v.y), rest = VR.polyLen(P, i), ex = P[P.length - 2], ey = P[P.length - 1];
    const L = 22 + Math.max(0, v.v) * 0.22, [tx, ty] = this.adelante(P, i, v.x, v.y, L), [t2x, t2y] = this.adelante(P, i, v.x, v.y, L * 2.6);
    const ang = (x, y) => Math.atan2(x - v.x, -(y - v.y)), wrap = (d) => Math.atan2(Math.sin(d), Math.cos(d));
    const d1 = wrap(ang(tx, ty) - v.a), d2 = Math.abs(wrap(ang(t2x, t2y) - v.a));
    const fin = rest < 12 || Math.hypot(ex - v.x, ey - v.y) < 16;
    let vt = (moto ? 180 : 165) * kv * (1 - Math.min(0.6, d2 * 0.5)); vt = Math.min(vt, v.topSpeed()[0] * 0.9);
    if (rest < 80) vt = Math.min(vt, 18 + rest * 1.6);
    if (v.ghost > 0) v.ghost -= dt;
    // obstáculos adelante (otros vehículos o paredes): frena; si lleva mucho trabado, retrocede un poquito
    const fx = Math.sin(v.a), fy = -Math.cos(v.a), rx = Math.cos(v.a), ry = Math.sin(v.a), dist = sp.len / 2 + 8 + Math.max(0, v.v) * 0.4;
    let bloq = false, pared = false, otro = null;
    for (const s of [0, -sp.wid * 0.4, sp.wid * 0.4]) {
      const px = v.x + fx * dist + rx * s, py = v.y + fy * dist + ry * s, o = w.boxAt(px, py, v);
      if (o && !(o.ghost > 0)) { bloq = true; otro = o; } else if (w.solid(Math.floor(px / 16), Math.floor(py / 16))) { bloq = true; pared = true; }
    }
    // atrás de un auto que anda: lo sigue a su velocidad en vez de clavar el freno; si queda frenado, lo pasa por encima un ratito (adelanta)
    let sigue = false; const vt0 = vt;
    if (bloq && !pared && otro && otro.ai && otro.v > 25 && v.ghost <= 0) { sigue = true; vt = Math.min(vt, Math.max(30, otro.v * 0.95)); if (Math.hypot(otro.x - v.x, otro.y - v.y) > sp.len / 2 + otro.spec.len / 2 + 10) bloq = false; }
    // detrás de uno lento más de 1,5 s: lo pasa (por encima, un ratito) en vez de arrastrarse atrás
    r.lento = sigue && otro.v < vt0 * 0.7 ? (r.lento || 0) + dt : 0;
    if (r.lento > 1.5) { v.ghost = 2.6; r.lento = 0; }
    r.blk = bloq ? r.blk + dt : 0;
    if (bloq && !pared && v.ghost <= 0 && r.blk > 1.1) { v.ghost = 1.8; r.blk = 0; }
    if (r.blk > 3 && pared) { r.atras = 0.9; r.blk = 0; }
    if (v.ghost > 0) bloq = pared;
    if (r.atras > 0) { r.atras -= dt; v.st = 0; v.physics(dt, -1, 0, false); return false; }
    let th = 0, st = 0, br = false;
    if (Math.abs(d1) > 2.2 && v.v < 40) { th = -0.9; st = VR.clamp(-d1 * 2, -1, 1); } // hay que dar la vuelta: marcha atrás girando
    else { st = VR.clamp(d1 * 3, -1, 1); th = v.v < vt ? VR.clamp((vt - v.v) / 35, 0.25, 1) * (Math.abs(d1) > 0.5 ? 0.7 : 1) : 0; br = v.v > vt + 12; }
    if (bloq) { th = 0; br = true; }
    if (fin) { th = 0; br = true; }
    v.st = (v.st || 0) + (st - (v.st || 0)) * Math.min(1, dt * 11);
    v.physics(dt, th, v.st * (1 - Math.min(0.2, Math.abs(v.v) / 1000)), br);
    return fin && Math.abs(v.v) < 22;
  }
  subir() {
    const r = this.r, v = this.v; if (!r || !v || r.st !== 'espera') return;
    const P = this.ruta(v.x, v.y, r.dest.x, r.dest.y);
    if (!P || P.length < 6) { this.toast('No hay camino hasta ' + (r.dest.name || 'ahí')); this.cancelar(); return; }
    if (!this.pagar(r.precio, 'Mbohasa (' + this.nombre(r.tipo) + ')')) { this.cancelar(); return; }
    r.P = P; r.st = 'viaje'; r.t = 0; r.blk = 0; r.atras = 0; r.lim = VR.polyLen(r.P) / 50 + 45;
    this.riding = true; if (v.type === 'moto') v.pasajero = this.yo();
    this.toast((r.tipo === 'moto' ? '🏍 ¡Agarrate bien! ' : '🚗 ') + 'Vamos a ' + (r.dest.name || 'tu destino'));
  }
  // el jugador baja (en el destino, o antes si el vehículo está casi parado) y el conductor se va
  bajarYSalir(llegada) {
    const r = this.r, v = this.v; if (!r || !v) return false;
    if (!this.bajar(v)) return false;
    this.riding = false; v.pasajero = null;
    if (llegada && this.fin) this.fin(r);
    const f = v, far = [];
    for (let n = 0; n < 40 && !far.length; n++) {
      const i = (Math.random() * this.gps.N) | 0; if (!this.gps.adj[i].length) continue;
      const d = Math.hypot(this.gps.nx[i] - f.x, this.gps.ny[i] - f.y); if (d < 300 || d > 650) continue;
      const P = this.gps.route(f.x, f.y, this.gps.nx[i], this.gps.ny[i], true); if (P && P.length >= 6) far.push(P);
    }
    r.st = 'sale'; r.t = 0; r.P = far.length ? far[0] : [v.x, v.y, v.x, v.y - 1]; r.blk = 0; r.atras = 0;
    this.toast(llegada ? '🏁 ¡Llegamos! Aguyje, buen viaje.' : 'Bajaste del Mbohasa');
    return true;
  }
  // botón "saltear viaje": fundido y listo, en el destino
  saltear() {
    const r = this.r; if (!r || r.st !== 'viaje' || !this.riding) return false;
    const d = r.dest; this.v.pasajero = null; this.quitar(); this.llevar(d); return true;
  }
  rideTick() { // el jugador toca "bajar" mientras anda
    const v = this.v; if (!this.riding || !v) return;
    if (Math.abs(v.v) < 45) this.bajarYSalir(false); else this.toast('Esperá que frene para bajarte');
  }
  update(dt) {
    const r = this.r, v = this.v; if (!r) return;
    if (!v) { this.r = null; this.riding = false; return; }
    r.t += dt;
    if ((r.st === 'viene' || r.st === 'espera') && this.manejando()) { this.quitar(); this.toast('Tu Mbohasa se fue: te subiste a otro vehículo'); return; }
    if (r.st === 'viene') {
      r.rec -= dt;
      if (r.rec <= 0) { // si te moviste, se vuelve a calcular el camino hasta donde estás ahora
        r.rec = 2.5; const f = this.player;
        if (Math.hypot(f.x - r.fx, f.y - r.fy) > 50) { const Q = this.ruta(v.x, v.y, f.x, f.y); if (Q && Q.length >= 6) { r.P = Q; r.fx = f.x; r.fy = f.y; } }
      }
      if (this.seguir(dt, r.P, v, 1)) { r.st = 'espera'; r.wait = 0; r.dlg = false; this.toast('🛵 ¡Llegó tu Mbohasa!'); }
      else if (r.t > 90) { this.quitar(); this.toast('Tu Mbohasa no pudo llegar. No se te cobró nada.'); }
    } else if (r.st === 'espera') {
      v.physics(dt, 0, 0, true, true); r.wait += dt;
      const f = this.player, d = Math.hypot(f.x - v.x, f.y - v.y);
      if (d < 110 && !r.dlg && !VR.Dialogo.abierto) {
        r.dlg = true;
        this.dialogo([{ quien: 'sis', titulo: '🛵 Mbohasa', txt: (r.tipo === 'moto' ? '🏍' : '🚗') + ' Tu ' + this.nombre(r.tipo) + ' está acá. Viaje a ' + (r.dest.name || 'tu destino') + ' por ' + VR.fmtGs(r.precio) + '.',
          op: [['Subir', () => { this.subir(); return true; }], ['Cancelar', () => { this.cancelar(); return false; }]] }]);
      } else if (d > 140 && r.dlg && !VR.Dialogo.abierto) r.dlg = false; // te alejaste: avisa de nuevo al volver
      if (r.wait > 100) { this.quitar(); this.toast('Tu Mbohasa se cansó de esperar y se fue.'); }
    } else if (r.st === 'viaje') {
      if (this.seguir(dt, r.P, v, 1)) { if (!this.bajarYSalir(true) && (r.wait = (r.wait || 0) + dt) > 3) { this.quitar(); this.llevar(r.dest); } }
      else if (r.t > r.lim) { const d = r.dest; this.quitar(); this.llevar(d); } // trancado: el viaje se hace igual, con fundido
    } else if (r.st === 'sale') {
      this.seguir(dt, r.P, v, 0.9);
      if (r.t > 9 || Math.hypot(this.player.x - v.x, this.player.y - v.y) > 700) this.quitar();
    }
  }
};
