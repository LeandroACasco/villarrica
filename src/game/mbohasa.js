// Mbohasa de verdad (12/11/2026, pedido de Leandro): al pedirlo viene un conductor real (en moto o en auto) por las calles, se
// para a tu lado, te subís atrás (moto) o adentro (auto) y te lleva por el camino del GPS hasta el destino, donde te bajás.
// Antes era un teletransporte con precio. Conduce solo, siguiendo la ruta de VR.GPS (persecución pura + freno en curvas y ante
// obstáculos); si se tranca mucho tiempo, hace el viaje igual con un fundido (llevar). Todo original.
// 12/11/2026 (tarde): se elige moto / auto tranquilo / auto / auto rápido (cada uno con su velocidad y su precio), el conductor tiene
// nombre, placa y casco (o no), y ante un vehículo parado o lento ESQUIVA DE VERDAD por el costado (entra al otro carril si hay lugar).
'use strict';
VR.MBH_NOMBRES = {
  m: ['Néstor', 'Derlis', 'Aldo', 'Ramón', 'Fabio', 'Cristian', 'Lucas', 'Hugo', 'Rubén', 'Edgar', 'Osvaldo', 'Tito'],
  f: ['Gladys', 'Marlene', 'Liz', 'Noelia', 'Fátima', 'Rocío', 'Analía', 'Dahiana', 'Mirta', 'Belén'],
};
VR.Mbohasa = class {
  // o: { world, gps, player, toast, dialogo(lineas), pagar(precio, txt) → bool, bajar(v) → bool (deja al jugador al lado),
  //      yo(casco) → pasajero (cómo se ve el jugador arriba de la moto, con casco o sin), tengoCasco() → bool, llevar(dest) (teletransporte
  //      de emergencia), manejando() → bool, fin(r) }
  constructor(o) { Object.assign(this, o); this.r = null; this.v = null; this.riding = false; }
  static vial(t) { const T = VR.T; return t === T.ROAD || t === T.STONE || t === T.DIRTROAD; }
  get activo() { return !!this.r; }
  nombre(tipo) { return tipo === 'moto' ? 'moto' : 'auto'; }
  // segundos que faltan para llegar (aproximado)
  eta() {
    const r = this.r, v = this.v; if (!r || !v) return 0;
    const vest = Math.max(40, Math.min(v.topSpeed()[0] * 0.9, (v.type === 'moto' ? 180 : 165) * (r.kv || 1)) * 0.78);
    return Math.max(1, Math.ceil(VR.polyLen(r.P, VR.polyNear(r.P, v.x, v.y)[1]) / vest));
  }
  static fmt(s) { return s < 90 ? '~' + s + ' s' : '~' + Math.round(s / 60) + ' min'; }
  // texto del estado para el celular
  texto() {
    const r = this.r; if (!r) return '';
    const N = this.nombre(r.tipo), c = r.cond ? r.cond.n : 'Tu conductor';
    if (r.st === 'viene') return c + ' viene en camino: ' + VR.Mbohasa.fmt(this.eta()) + '. Esperalo en la vereda, cerca de la calle.';
    if (r.st === 'espera') return c + ' ya llegó con la ' + N + ': acercate.';
    if (r.st === 'viaje') return 'Viaje a ' + (r.dest.name || 'tu destino') + ' en curso: faltan ' + VR.Mbohasa.fmt(this.eta()) + '.';
    return 'Viaje terminado.';
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
  // op: { modelo, conCasco }
  crear(tipo, x, y, a, op = {}) {
    const w = this.world; let v;
    if (tipo === 'moto') v = new VR.Car(w, x, y, a, (Math.random() * 6) | 0, 'moto', op.modelo || 'cub');
    else { const m = op.modelo || 'sedan'; v = new VR.Car(w, x, y, a, 3, 'car', m, { ...VR.tuneDefault(m), color: 3 }); }
    if (v.contacts(x, y, a)) return null;
    v.mbh = true; v.v = 0; v.ghost = 0;
    if (tipo === 'moto') {
      const L = VR.av2Random(); L.mochila = false;
      if (op.conCasco) { L.hat = 'casco'; L.hatColor = (Math.random() * VR.AV2_CAT.cloth.length) | 0; } else if (L.hat === 'casco') L.hat = 'ninguno';
      v.rider = Object.assign(VR.av2Rider(L), { L });
    } else v.taxi = true; // el auto lleva el cartelito amarillo
    w.addBox(v); return v;
  }
  quitar() { if (this.v) { this.world.removeBox(this.v); this.v = null; } this.riding = false; this.r = null; }
  // pedir: busca una esquina de calle a 330–700 px (fuera de pantalla) con camino hasta vos y hace aparecer al conductor ahí.
  // op: { kv (ritmo: 1 = normal), modelo, key }
  pedir(tipo, precio, dest, op = {}) {
    if (this.r || !this.gps || !this.gps.ok) return false;
    const f = this.player, G = this.gps, conCasco = tipo === 'moto' && Math.random() < 0.65;
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
        const v = this.crear(tipo, x, y, Math.atan2(Q[k] - x, -(Q[k + 1] - y)), { modelo: op.modelo, conCasco }); if (!v) continue;
        const gen = (v.rider && v.rider.L.gender) || (Math.random() < 0.75 ? 'm' : 'f'), N = VR.MBH_NOMBRES[gen === 'f' ? 'f' : 'm'], A = 'ABCDEFGHJKLMNPRSTUVXYZ', ch = () => A[(Math.random() * A.length) | 0];
        const cond = { n: N[(Math.random() * N.length) | 0], placa: ch() + ch() + ch() + ch() + ' ' + (100 + ((Math.random() * 900) | 0)), nota: (4.5 + Math.random() * 0.5).toFixed(1).replace('.', ',') };
        this.v = v; this.r = { tipo, precio, dest, st: 'viene', P: Q, t: 0, rec: 2.5, fx: f.x, fy: f.y, wait: 0, blk: 0, atras: 0, kv: op.kv || 1, key: op.key || tipo, cond, casco: conCasco, cascoP: false };
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
  // cuánto está el punto (x, y) corrido del carril de la ruta P (+ = a la derecha), medido contra la ruta (no contra el rumbo de un vehículo, que va girando)
  latRuta(P, x, y) {
    const [, k] = VR.polyNear(P, x, y), [qx, qy] = this.adelante(P, k, x, y, 0), [q2x, q2y] = this.adelante(P, k, x, y, 6), dx = q2x - qx, dy = q2y - qy, m = Math.hypot(dx, dy) || 1;
    return (x - qx) * (-dy / m) + (y - qy) * (dx / m);
  }
  // ¿qué hay en el punto (lat, f) de la vista del vehículo v? lat: + a la derecha, f: + adelante. Un vehículo, 'pared' (muro o algo que no es calle) o null
  ocupa(v, lat, f) {
    const w = this.world, px = v.x + Math.sin(v.a) * f + Math.cos(v.a) * lat, py = v.y - Math.cos(v.a) * f + Math.sin(v.a) * lat;
    const o = w.boxAt(px, py, v); if (o) return o;
    const tx = Math.floor(px / 16), ty = Math.floor(py / 16);
    return w.solid(tx, ty) || !VR.Mbohasa.vial(w.get(tx, ty)) ? 'pared' : null;
  }
  // Esquivar de verdad (12/11/2026): corre la trayectoria al costado (primero por la izquierda, o sea por el otro carril; si no, por la derecha)
  // lo justo para pasar al vehículo o, parado o lento, y solo si el lugar está libre. Devuelve true si empezó a esquivar.
  esquiva(v, o) {
    const r = this.r, sp = v.spec, os = o.spec || { wid: 18, len: 30 }, need = (sp.wid + os.wid) / 2 + 8 + (r.reint || 0);
    const lo = this.latRuta(r.P, o.x, o.y);  // dónde está el otro respecto del carril de la ruta
    const largo = sp.len / 2 + os.len / 2 + 30 + Math.abs(o.v || 0) * 0.3;
    for (const lado of [-1, 1]) {
      const tgt = VR.clamp(lo + lado * need, -40, 40), lat = tgt - (r.dev || 0); let ok = Math.abs(tgt - lo) >= need - 3;
      for (let f = -4; f <= largo + (lado < 0 ? 40 : 0) && ok; f += 8) for (const dl of [-sp.wid * 0.5, 0, sp.wid * 0.5]) { const b = this.ocupa(v, lat + dl, f); if (b && b !== o) { ok = false; break; } }
      if (ok) { r.lado = lado; r.offT = tgt; r.esq = 1; r.dur = 0; r.paso = o; r.need = need; r.loF = lo; return true; }
    }
    return false;
  }
  // maneja el vehículo v siguiendo la ruta P un cuadro; devuelve true cuando llegó al final y ya casi frenó
  seguir(dt, P, v, kv) {
    const w = this.world, sp = v.spec, moto = v.type === 'moto', r = this.r;
    const [, i] = VR.polyNear(P, v.x, v.y), rest = VR.polyLen(P, i), ex = P[P.length - 2], ey = P[P.length - 1];
    const fx = Math.sin(v.a), fy = -Math.cos(v.a), rx = Math.cos(v.a), ry = Math.sin(v.a);
    if (r.off === undefined) { r.off = 0; r.offT = 0; r.esq = 0; r.nodo = 0; r.dur = 0; }
    r.off += VR.clamp(r.offT - r.off, -48 * dt, 48 * dt); // el corrimiento lateral va llegando de a poco
    r.dev = this.latRuta(P, v.x, v.y); // cuánto está el vehículo corrido (a la derecha +) del carril de la ruta, medido de verdad (no el ideal r.off: el vehículo tarda en llegar)
    if (r.nodo > 0) r.nodo -= dt;
    const L = 22 + Math.max(0, v.v) * 0.3; // mirada: más larga a alta velocidad (si no, zigzaguea)
    const adel = (len) => { const [x0, y0] = this.adelante(P, i, v.x, v.y, len), [x1, y1] = this.adelante(P, i, v.x, v.y, len + 5); const dx = x1 - x0, dy = y1 - y0, m = Math.hypot(dx, dy) || 1; return [x0 - dy / m * r.off, y0 + dx / m * r.off]; };
    const [tx, ty] = adel(L), [t2x, t2y] = adel(L * 2.6);
    const ang = (x, y) => Math.atan2(x - v.x, -(y - v.y)), wrap = (d) => Math.atan2(Math.sin(d), Math.cos(d));
    const d1 = wrap(ang(tx, ty) - v.a), d2 = Math.abs(wrap(ang(t2x, t2y) - v.a));
    const fin = rest < 12 || Math.hypot(ex - v.x, ey - v.y) < 16;
    let vt = (moto ? 180 : 165) * kv * (1 - Math.min(0.6, d2 * 0.5)); vt = Math.min(vt, v.topSpeed()[0] * 0.9);
    vt *= 1 - VR.clamp((Math.abs(r.dev) - 6) / 40, 0, 0.55); // muy corrido de la ruta: primero se acomoda y después acelera
    if (rest < 80) vt = Math.min(vt, 18 + rest * 1.6);
    if (rest < 55) { r.esq = 0; r.offT = 0; r.paso = null; } // cerca del destino no esquiva: se vuelve al carril
    // obstáculos: cerca (frena) y un poco más lejos (para esquivar con tiempo)
    const dist = sp.len / 2 + 8 + Math.max(0, v.v) * 0.4, dist2 = sp.len / 2 + 34 + Math.max(0, v.v) * 0.6;
    let bloq = false, pared = false, otro = null, lejos = null;
    for (const s of [0, -sp.wid * 0.4, sp.wid * 0.4]) {
      const px = v.x + fx * dist + rx * s, py = v.y + fy * dist + ry * s, o = w.boxAt(px, py, v);
      if (o) { bloq = true; otro = otro || o; } else if (w.solid(Math.floor(px / 16), Math.floor(py / 16))) { bloq = true; pared = true; }
      if (!lejos) lejos = w.boxAt(v.x + fx * dist2 + rx * s, v.y + fy * dist2 + ry * s, v);
    }
    if (!lejos && r.esq <= 0) { // también sobre la ruta misma (el vehículo puede ir zigzagueando: lo que está en el carril de la ruta es lo que va a encontrar)
      for (let d = sp.len / 2 + 16; d <= dist2 + 40 && !lejos; d += 12) { const [qx, qy] = adel(d); for (const s of [0, -sp.wid * 0.35, sp.wid * 0.35]) { const o = w.boxAt(qx + (-(adel(d + 4)[1] - qy)) / 4 * s, qy + (adel(d + 4)[0] - qx) / 4 * s, v); if (o) { lejos = o; break; } } }
    }
    // atrás de un auto que anda: lo sigue a su velocidad en vez de clavar el freno; si es lento más de 1,2 s, lo esquiva
    let sigue = false; const vt0 = vt;
    if (bloq && !pared && otro && otro.ai && otro.v > 25) { sigue = true; vt = Math.min(vt, Math.max(30, otro.v * 0.95)); if (Math.hypot(otro.x - v.x, otro.y - v.y) > sp.len / 2 + otro.spec.len / 2 + 10) bloq = false; }
    r.lento = sigue && otro.v < vt0 * 0.7 ? (r.lento || 0) + dt : 0;
    if (r.esq > 0) { // esquivando: mientras haya un vehículo en el carril de la ruta (al lado o un poco adelante) se sigue por afuera
      r.esq -= dt; r.dur += dt;
      const adL = sp.len * 0.5 + 18 + Math.max(0, v.v) * 0.25;
      for (let f = -sp.len * 0.8; f <= adL; f += 8) { const b = this.ocupa(v, -r.dev, f); if (b && b !== 'pared') { r.esq = Math.max(r.esq, 0.3); r.paso = b; break; } }
      if (r.esq > 0 && r.paso && r.paso.spec) { // el margen se recalcula cada cuadro contra el que está pasando (si se mueve, se adapta)
        const o = r.paso, lo = this.latRuta(P, o.x, o.y);
        r.loF = (r.loF === undefined ? lo : r.loF + (lo - r.loF) * Math.min(1, dt * 5));  // filtrado: no se mueve con cada cabeceo
        r.offT = VR.clamp(r.loF + r.lado * ((sp.wid + o.spec.wid) / 2 + 8 + (r.reint || 0)), -40, 40);
      }
      if (r.esq <= 0 || r.dur > 7) { r.esq = 0; r.offT = 0; r.paso = null; r.dur = 0; }
    } else if (!pared && r.nodo <= 0 && r.atras <= 0) {
      const o = otro || lejos;
      if (o && (!(Math.abs(o.v || 0) > 25) || r.lento > 1.2 || r.blk > 0.9) && this.esquiva(v, o)) r.lento = 0;
    }
    if (r.esq > 0 && !pared && (!otro || otro === r.paso)) { // al que está pasando no le clava el freno: la velocidad sale del espacio libre que queda y de si ya está al costado de verdad
      bloq = false;
      const o = r.paso, os = o && o.spec;
      if (o && os) {
        const fo = (o.x - v.x) * fx + (o.y - v.y) * fy, lo = (o.x - v.x) * rx + (o.y - v.y) * ry, medio = (sp.len + os.len) / 2, gap = fo - medio;
        const medioW = (sp.wid + os.wid) / 2;
        if (Math.abs(lo) < medioW + 2 && fo > -medio) { // todavía en su carril (o rozándolo): freno según el espacio que queda; si de verdad se superponen y no hay lugar, frena del todo
          vt = Math.min(vt, 14 + Math.max(0, gap) * 1.7); if (gap < 3 && Math.abs(lo) < medioW - 1) bloq = true;
        } else vt = Math.min(vt, 90); // ya está al costado: lo pasa a velocidad moderada
      } else vt = Math.min(vt, 60);
    }
    r.blk = bloq ? r.blk + dt : 0;
    if (r.blk > 1.6 && r.esq > 0) { r.esq = 0; r.offT = 0; r.paso = null; r.nodo = 3; } // esquivando y trancado por otro (de frente, por ejemplo): vuelve al carril y espera
    if (r.blk > 3) { r.atras = 0.9; r.blk = 0; if (!pared) r.reint = Math.min(8, (r.reint || 0) + 3); } // sigue trancado: marcha atrás un poco y vuelve a probar, con más margen
    if (r.atras > 0) { r.atras -= dt; v.st = 0; v.physics(dt, -1, 0, false); return false; }
    let th = 0, st = 0, br = false;
    if (Math.abs(d1) > 2.2 && v.v < 40) { th = -0.9; st = VR.clamp(-d1 * 2, -1, 1); } // hay que dar la vuelta: marcha atrás girando
    else { st = VR.clamp(d1 * 3, -1, 1); th = v.v < vt ? VR.clamp((vt - v.v) / 35, 0.25, 1) * (Math.abs(d1) > 0.5 ? 0.7 : 1) : 0; br = v.v > vt + 12; }
    if (bloq) { th = 0; br = true; }
    if (fin) { th = 0; br = true; }
    // quiere avanzar y no se mueve (pegado a algo que no vio, o un vehículo que quedó de costado): marcha atrás y reintenta con más margen
    r.parado = !fin && th > 0.15 && !br && Math.abs(v.v) < 12 ? (r.parado || 0) + dt : 0;
    if (r.parado > 1.6) { r.parado = 0; r.atras = 0.8; r.esq = 0; r.offT = 0; r.paso = null; r.nodo = 0; r.reint = Math.min(12, (r.reint || 0) + 3); }
    v.st = (v.st || 0) + (st - (v.st || 0)) * Math.min(1, dt * 11);
    v.physics(dt, th, v.st * (1 - Math.min(0.2, Math.abs(v.v) / 1000)), br);
    return fin && Math.abs(v.v) < 22;
  }
  // casco: true = el pasajero va con casco (el suyo, o el de repuesto del conductor)
  subir(casco) {
    const r = this.r, v = this.v; if (!r || !v || r.st !== 'espera') return;
    const P = this.ruta(v.x, v.y, r.dest.x, r.dest.y);
    if (!P || P.length < 6) { this.toast('No hay camino hasta ' + (r.dest.name || 'ahí')); this.cancelar(); return; }
    if (!this.pagar(r.precio, 'Mbohasa (' + this.nombre(r.tipo) + ')')) { this.cancelar(); return; }
    r.P = P; r.st = 'viaje'; r.t = 0; r.blk = 0; r.atras = 0; r.off = 0; r.offT = 0; r.esq = 0; r.paso = null; r.reint = 0; r.lim = VR.polyLen(r.P) / 50 + 45;
    this.riding = true; if (v.type === 'moto') { r.cascoP = !!casco; v.pasajero = this.yo(!!casco); }
    this.toast((r.tipo === 'moto' ? (casco ? '🏍🪖 ' : '🏍 ') + '¡Agarrate bien! ' : '🚗 ') + 'Vamos a ' + (r.dest.name || 'tu destino'));
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
    r.st = 'sale'; r.t = 0; r.P = far.length ? far[0] : [v.x, v.y, v.x, v.y - 1]; r.blk = 0; r.atras = 0; r.off = 0; r.offT = 0; r.esq = 0; r.paso = null;
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
    const kv = r.kv || 1;
    if (r.st === 'viene') {
      r.rec -= dt;
      if (r.rec <= 0) { // si te moviste, se vuelve a calcular el camino hasta donde estás ahora
        r.rec = 2.5; const f = this.player;
        if (Math.hypot(f.x - r.fx, f.y - r.fy) > 50) { const Q = this.ruta(v.x, v.y, f.x, f.y); if (Q && Q.length >= 6) { r.P = Q; r.fx = f.x; r.fy = f.y; } }
      }
      if (this.seguir(dt, r.P, v, kv)) { r.st = 'espera'; r.wait = 0; r.dlg = false; this.toast('🛵 ¡Llegó tu Mbohasa!'); }
      else if (r.t > 90) { this.quitar(); this.toast('Tu Mbohasa no pudo llegar. No se te cobró nada.'); }
    } else if (r.st === 'espera') {
      v.physics(dt, 0, 0, true, true); r.wait += dt;
      const f = this.player, d = Math.hypot(f.x - v.x, f.y - v.y);
      if (d < 110 && !r.dlg && !VR.Dialogo.abierto) {
        r.dlg = true;
        const moto = r.tipo === 'moto', propio = !!(this.tengoCasco && this.tengoCasco()), prest = moto && r.casco, c = r.cond || { n: 'Conductor', placa: '' };
        const op = [];
        if (moto && (propio || prest)) op.push([propio ? '🪖 Subir con mi casco' : '🪖 Subir con el casco del conductor', () => { this.subir(true); return true; }], ['Subir sin casco', () => { this.subir(false); return true; }]);
        else op.push([moto ? 'Subir (sin casco)' : 'Subir', () => { this.subir(false); return true; }]);
        op.push(['Cancelar', () => { this.cancelar(); return false; }]);
        this.dialogo([{ quien: 'sis', titulo: '🛵 Mbohasa · ' + c.n, txt: (moto ? '🏍' : '🚗') + ' ' + c.n + ' (' + c.placa + ') está acá' + (moto ? (r.casco ? ', con casco' : ', sin casco') : '') + '. Viaje a ' + (r.dest.name || 'tu destino') + ' por ' + VR.fmtGs(r.precio) + '.', op }]);
      } else if (d > 140 && r.dlg && !VR.Dialogo.abierto) r.dlg = false; // te alejaste: avisa de nuevo al volver
      if (r.wait > 100) { this.quitar(); this.toast('Tu Mbohasa se cansó de esperar y se fue.'); }
    } else if (r.st === 'viaje') {
      if (this.seguir(dt, r.P, v, kv)) { if (!this.bajarYSalir(true) && (r.wait = (r.wait || 0) + dt) > 3) { this.quitar(); this.llevar(r.dest); } }
      else if (r.t > r.lim) { const d = r.dest; this.quitar(); this.llevar(d); } // trancado: el viaje se hace igual, con fundido
    } else if (r.st === 'sale') {
      this.seguir(dt, r.P, v, 0.9);
      if (r.t > 9 || Math.hypot(this.player.x - v.x, this.player.y - v.y) > 700) this.quitar();
    }
  }
};
