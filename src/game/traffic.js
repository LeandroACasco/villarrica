// Tránsito: autos y motos que circulan por la red de calles (exportada por tools/osm_to_map.py),
// por el carril derecho, respetando las calles de mano única. Cada vehículo sigue una "zanahoria"
// que avanza por su camino un poco más adelante; frena si tiene algo adelante (otro vehículo, vos)
// y reduce antes de doblar. Aparecen fuera de la pantalla, cerca tuyo, y desaparecen lejos.
'use strict';
VR.Traffic = class {
  constructor(world, opts = {}) {
    this.world = world; this.list = []; this.rnd = VR.rng(7);
    this.max = opts.max || 34; this.motoShare = opts.motoShare ?? 0.45;
    const R = world.roads;
    this.ok = !!R;
    if (!R) return;
    const N = R.nodes.length / 2;
    this.nx = new Float32Array(N); this.ny = new Float32Array(N);
    for (let i = 0; i < N; i++) { this.nx[i] = R.nodes[i * 2]; this.ny[i] = R.nodes[i * 2 + 1]; }
    // salidas de cada nodo: [tramo, nodo destino]
    this.out = Array.from({ length: N }, () => []);
    this.edges = [];
    const E = R.edges;
    for (let i = 0; i < E.length; i += 4) {
      const a = E[i], b = E[i + 1], kind = E[i + 2] & 15, surf = E[i + 2] >> 4, ow = E[i + 3] === 3 ? -1 : E[i + 3];
      const k = R.kinds[kind];
      if (k === 'service' || k === 'living_street') continue; // el tránsito no entra a pasillos ni playas de estacionamiento
      const e = { a, b, w: R.widths[kind] * VR.TILE, kind: k, surf, len: Math.hypot(this.nx[b] - this.nx[a], this.ny[b] - this.ny[a]), ow };
      if (e.len < 0.5) continue;
      const id = this.edges.push(e) - 1; e.id = id;
      if (ow >= 0) this.out[a].push([id, b]);
      if (ow <= 0) this.out[b].push([id, a]);
    }
    this.cand = [];
    for (let i = 0; i < N; i++) if (this.out[i].length) this.cand.push(i);
  }
  // punto del carril derecho, a distancia s desde `from` sobre el tramo e
  lane(e, from, s, raw) {
    const to = from === e.a ? e.b : e.a;
    const dx = (this.nx[to] - this.nx[from]) / e.len, dy = (this.ny[to] - this.ny[from]) / e.len;
    // mano única: por el medio (deja lugar a los estacionados de los dos lados); doble mano: carril derecho,
    // pero sin pegarse al cordón, donde hay autos estacionados
    const off = raw || e.ow ? 0 : Math.min(e.w * 0.17, 11); // a lo sumo 11 px del medio: no pisa a los estacionados
    return [this.nx[from] + dx * s - dy * off, this.ny[from] + dy * s + dx * off, dx, dy];
  }
  // Carril medido (04/11/2026): la línea de OSM no siempre va por el medio de la calle dibujada, y los
  // estacionados ocupan un costado. Mide el lugar libre a cada lado (hasta el cordón o un estacionado) y devuelve
  // el desplazamiento desde la línea: en mano única, el medio del hueco; en doble mano, el medio de la mitad derecha.
  measureLane(v, ai, L) {
    const ai2 = { ...ai, lat: 0, off: 0 }, [qx, qy, dx, dy] = this.carrot(ai2, L), nx = -dy, ny = dx, W = this.world, T = VR.T, S = VR.TILE;
    const free = (x, y) => { const t = W.get(Math.floor(x / S), Math.floor(y / S)); if (t !== T.ROAD && t !== T.STONE && t !== T.DIRTROAD) return false; const o = W.boxAt(x, y, v); return !o || !!o.ai || !!o.unit || o.driven; };
    const scan = (sg) => { let d = 0; while (d < 56 && free(qx + nx * (d + 2) * sg, qy + ny * (d + 2) * sg)) d += 2; return d; };
    const R = scan(1), Lf = scan(-1), hw = v.WID / 2 + 1.5;
    if (R + Lf < 6) return ai.lat || 0; // en un cruce o fuera de la calle: lo que tenía
    let lat;
    if (ai.e.ow) lat = (R - Lf) / 2;
    else { lat = Math.max(hw, R / 2); if (lat > R - hw) lat = Math.max(-Lf + hw, R - hw); lat = Math.min(lat, Math.max(hw, R - hw)); }
    ai.room = { R: R - lat - hw, L: Lf + lat - hw };
    return lat;
  }
  pickNext(e, to, minW = 0) {
    let outs = this.out[to].filter(([id]) => id !== e.id);
    if (minW) { const wide = outs.filter(([id]) => this.edges[id].w >= minW); if (wide.length) outs = wide; } // colectivos: avenidas si hay
    const opts = outs.length ? outs : this.out[to];
    if (!opts.length) return null;
    // preferir seguir derecho
    const from = to === e.b ? e.a : e.b;
    const hx = this.nx[to] - this.nx[from], hy = this.ny[to] - this.ny[from];
    let best = null, bw = -1;
    for (const o of opts) {
      const ne = this.edges[o[0]], nx = this.nx[o[1]] - this.nx[to], ny = this.ny[o[1]] - this.ny[to];
      const cos = (hx * nx + hy * ny) / (Math.hypot(hx, hy) * Math.hypot(nx, ny) || 1);
      let w = (cos > 0.85 ? 2.2 : cos > -0.3 ? 1 : 0.15) * (ne.kind === 'trunk' || ne.kind === 'primary' || ne.kind === 'secondary' ? 1.4 : 1) * (0.5 + this.rnd());
      if (w > bw) { bw = w; best = o; }
    }
    return best;
  }
  // camino de un vehículo: tramo actual + el siguiente ya elegido (para mirar más allá de la esquina)
  carrot(ai, ahead) {
    let s = ai.s + ahead, e = ai.e, from = ai.from;
    if (s > e.len && ai.next) { s -= e.len; const ne = this.edges[ai.next[0]], to = from === e.a ? e.b : e.a; e = ne; from = to; }
    const p = this.lane(e, from, Math.min(s, e.len), ai.lat !== undefined);
    const o = (ai.lat || 0) + (ai.off || 0); // carril medido (lat) + corrido hacia el cordón (+) o para pasar (−)
    if (o) { p[0] -= p[3] * o; p[1] += p[2] * o; }
    return p;
  }
  spawn(px, py, view) {
    const W = this.world;
    for (let t = 0; t < 40; t++) {
      const n = this.cand[(this.rnd() * this.cand.length) | 0];
      const d = Math.hypot(this.nx[n] - px, this.ny[n] - py);
      if (d < 380 || d > 950) continue;
      const x = this.nx[n], y = this.ny[n];
      if (x > view.x0 - 40 && x < view.x1 + 40 && y > view.y0 - 40 && y < view.y1 + 40) continue;
      const [id, to] = this.out[n][(this.rnd() * this.out[n].length) | 0];
      const e = this.edges[id];
      const s0 = Math.min(e.len * 0.5, 20);
      const [lx, ly, dx, dy] = this.lane(e, n, s0);
      if (W.boxOverlap(lx - 24, ly - 24, lx + 24, ly + 24)) continue;
      const moto = this.rnd() < this.motoShare, type = moto ? 'moto' : 'car', model = moto ? VR.pickMoto(this.rnd, false) : VR.pickCar(this.rnd, false, e.w);
      const pal = model === 'pati' ? VR.PATI_COLORS : moto ? VR.MOTO_COLORS : VR.CAR_COLORS, color = (this.rnd() * pal.length) | 0;
      if (W.boxOverlap(lx - 30, ly - 30, lx + 30, ly + 30) && model === 'carga') continue;
      if (VR.CAR_MODELS[model] && VR.CAR_MODELS[model].bus && W.boxOverlap(lx - 52, ly - 52, lx + 52, ly + 52)) continue; // los colectivos necesitan más lugar para aparecer
      const tune = this.rnd() < 0.1 && VR.TUNE_MODELS[model] ? VR.tuneRandom(model, this.rnd) : null; // algunos vienen tuneados
      const v = new VR.Car(W, lx, ly, Math.atan2(dx, -dy), color, type, model, tune);
      { const h = v.contacts(lx, ly, v.a); if (h && h.other) continue; } // no aparecer encima de nadie
      if (moto) { // conductores: personas del avatar 2 (algunas con casco), sentadas en la moto
        if (!VR.RIDER_LOOKS) { const r = VR.rng(31); VR.RIDER_LOOKS = Array.from({ length: 12 }, (_, i) => { const L = VR.av2Random(r); L.mochila = false; L.termo = false; if (i % 3 !== 2) { L.hat = 'casco'; L.hatColor = (r() * VR.AV2_CAT.cloth.length) | 0; } return L; }); }
        v.rider = { shirt: VR.RIDER_SHIRTS[0], head: '#2a1b12', L: VR.RIDER_LOOKS[(this.rnd() * VR.RIDER_LOOKS.length) | 0] };
      }
      v.ai = { e, from: n, s: s0, next: null, cruise: Math.min(v.spec.max.road * 0.6, moto ? 125 : 110) * (v.spec.cruiseK || 1) * (0.8 + this.rnd() * 0.4), wait: 0, honk: 0 };
      v.ai.next = this.pickNext(e, to, v.spec.bus ? 5 * VR.TILE - 1 : 0);
      v.v = v.ai.cruise * 0.6;
      v.tid = ++this.seq || (this.seq = 1); W.addBox(v); this.list.push(v);
      return v;
    }
    return null;
  }
  remove(v) { this.world.removeBox(v); const i = this.list.indexOf(v); if (i >= 0) this.list.splice(i, 1); v.ai = null; }
  // el jugador se lleva este vehículo: deja de ser del tránsito
  release(v) { const i = this.list.indexOf(v); if (i >= 0) this.list.splice(i, 1); v.ai = null; v.rider = null; v.v = 0; }

  update(dt, focus, view, playerBody, onHonk) {
    if (!this.ok) return;
    // aparecer de a uno por cuadro hasta completar; borrar los que quedaron lejos
    // online (anfitrión): también alrededor de los demás jugadores (VR.extraFoci), así ven tránsito donde estén
    const F = [focus].concat(VR.extraFoci || []), max = this.max + 14 * Math.min(F.length - 1, 4);
    // cupo por jugador: aparece donde hay menos (cada uno tiene su parte)
    const near = (f) => this.list.reduce((n, v) => n + (Math.hypot(v.x - f.x, v.y - f.y) < 900 ? 1 : 0), 0);
    if (F.length > 1) { let f = null, bn = 1e9; for (const g of F) { const n = near(g); if (n < this.max && n < bn) { bn = n; f = g; } } if (f) this.spawn(f.x, f.y, f === focus ? view : { x0: f.x - 280, y0: f.y - 200, x1: f.x + 280, y1: f.y + 200 }); }
    else if (this.list.length < max) { const f = F[(this.fi = (this.fi || 0) + 1) % F.length]; this.spawn(f.x, f.y, f === focus ? view : { x0: f.x - 280, y0: f.y - 200, x1: f.x + 280, y1: f.y + 200 }); }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const v = this.list[i];
      if (F.every((f) => Math.hypot(v.x - f.x, v.y - f.y) > 1300)) this.remove(v);
    }
    const W = this.world;
    // vehículos con la sirena prendida (unidades y el tuyo)
    const sirens = [];
    if (VR.emer) for (const u of VR.emer.units) if (u.v.siren && !u.dead) sirens.push(u.v);
    if (playerBody === null && VR.playerCar && VR.playerCar.siren) sirens.push(VR.playerCar);
    for (const v of this.list) {
      const ai = v.ai;
      // ¿viene una sirena? correrse al costado y casi parar hasta que pase
      if (sirens.length && !(ai.yield > 0)) for (const s of sirens) {
        const dx = v.x - s.x, dy = v.y - s.y, d = Math.hypot(dx, dy); if (d > 170 || d < 1) continue;
        const sf = Math.sin(s.a) * dx - Math.cos(s.a) * dy; // ¿estoy adelante de la sirena?
        if (sf > 0 && Math.abs(Math.cos(s.a) * dx + Math.sin(s.a) * dy) < 40) { ai.yield = 2.6; break; }
      }
      if (ai.stun > 0) { // lo chocaron: queda a merced del golpe un rato y después sigue su camino
        ai.stun -= dt; v.physics(dt, 0, 0, false, true);
        if (ai.stun <= 0 && ai.honk <= 0) { ai.honk = 5; onHonk && onHonk(v); }
        continue;
      }
      v.px = v.x; v.py = v.y; v.pa = v.a;
      // avanzar el cursor del camino y pasar al tramo siguiente
      const L = 20 + Math.abs(v.v) * 0.12;
      let [cx, cy] = this.carrot(ai, L);
      if (Math.hypot(cx - v.x, cy - v.y) < L * 1.8) ai.s += Math.max(0, v.v) * dt;
      if (ai.s > ai.e.len) {
        if (!ai.next) { ai.s = ai.e.len; v.v = 0; continue; }
        ai.s -= ai.e.len;
        const to = ai.from === ai.e.a ? ai.e.b : ai.e.a;
        ai.e = this.edges[ai.next[0]]; ai.from = to;
        ai.next = this.pickNext(ai.e, ai.next[1], v.spec.bus ? 5 * VR.TILE - 1 : 0);
      }
      ai.latT = (ai.latT || 0) - dt;
      if (ai.latT <= 0) { ai.latT = 0.12; ai.latW = this.measureLane(v, ai, L + 6); if (ai.lat === undefined) ai.lat = ai.latW; }
      ai.lat += VR.clamp(ai.latW - ai.lat, -26 * dt, 26 * dt);
      [cx, cy] = this.carrot(ai, L);
      // abrir paso / esquivar: el carril se corre de a poco hacia el lado que tenga lugar
      const rm = ai.room || { R: 6, L: 6 };
      const offT = ai.yield > 0 ? Math.max(0, Math.min(10, rm.R)) : ai.dodge > 0 ? (rm.L >= rm.R ? -Math.min(11, Math.max(0, rm.L)) : Math.min(11, Math.max(0, rm.R))) : 0;
      ai.off = (ai.off || 0) + VR.clamp(offT - (ai.off || 0), -18 * dt, 18 * dt);
      if (ai.yield > 0) ai.yield -= dt;
      if (ai.dodge > 0) ai.dodge -= dt;
      // girar hacia la zanahoria
      const want = Math.atan2(cx - v.x, -(cy - v.y));
      let d = want - v.a; d = Math.atan2(Math.sin(d), Math.cos(d));
      const tr = (v.type === 'moto' ? 4.2 : 3.4 * (v.spec.aiTurn || 1)) * dt; // los colectivos giran más despacio
      v.a += VR.clamp(d, -tr, tr);
      // velocidad deseada: crucero, menos en curvas y antes de doblar en la esquina
      let target = ai.cruise * (ai.e.surf === VR.T.DIRTROAD ? 0.75 : ai.e.surf === VR.T.STONE ? 0.9 : 1);
      target *= Math.max(0.3, Math.cos(Math.min(1.5, Math.abs(d))));
      if (ai.next && ai.e.len - ai.s < 45) {
        const ne = this.edges[ai.next[0]], to = ai.from === ai.e.a ? ai.e.b : ai.e.a;
        const ax = this.nx[to] - this.nx[ai.from], ay = this.ny[to] - this.ny[ai.from], bx = this.nx[ai.next[1]] - this.nx[to], by = this.ny[ai.next[1]] - this.ny[to];
        const cos = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1);
        if (cos < 0.7) target = Math.min(target, v.type === 'moto' ? 70 : v.spec.bus ? 36 : 55);
        void ne;
      }
      // ¿algo adelante? mirar unos puntos sobre el rumbo
      const fx = Math.sin(v.a), fy = -Math.cos(v.a), look = v.LEN / 2 + 8 + Math.max(0, v.v) * 0.45;
      let blockedBy = null;
      for (let k = v.LEN / 2 + 4; k <= look && !blockedBy; k += 6) {
        const qx = v.x + fx * k, qy = v.y + fy * k;
        const rx = Math.cos(v.a) * (v.WID / 2 - 1), ry = Math.sin(v.a) * (v.WID / 2 - 1);
        const o = W.boxAt(qx, qy, v) || W.boxAt(qx + rx, qy + ry, v) || W.boxAt(qx - rx, qy - ry, v);
        if (o) blockedBy = o;
        else if (playerBody && Math.abs(qx - playerBody.x) < 9 && Math.abs(qy - playerBody.y) < 9) blockedBy = playerBody;
      }
      if (ai.yield > 0) target = Math.min(target, 18);
      if (ai.back > 0) { ai.back -= dt; v.v = -28; const bx = v.x + fx * v.v * dt, by = v.y + fy * v.v * dt, bh = v.contacts(bx, by, v.a); if (bh && bh.other) { ai.back = 0; v.v = 0; } else { v.x = bx; v.y = by; } v.vx = fx * v.v; v.vy = fy * v.v; W.moveBox(v); continue; }
      if (blockedBy) {
        target = 0; ai.wait += dt;
        if ((blockedBy === playerBody || blockedBy.driven) && ai.wait > 1.2 && ai.honk <= 0) { ai.honk = 4 + this.rnd() * 3; onHonk && onHonk(v); }
      } else ai.wait = 0;
      if (ai.honk > 0) ai.honk -= dt;
      // trabado: primero intenta pasar por el costado, después retrocede un poco, y si sigue trabado fuera de
      // la pantalla, desaparece (para que no se armen tapones eternos)
      if (blockedBy && blockedBy !== playerBody && !blockedBy.driven) {
        const parked = !blockedBy.ai || blockedBy.ai.wait > 1.5;
        if (ai.wait > 1.6 && parked && !(ai.dodge > 0)) ai.dodge = 2.2;
        if (ai.wait > 4.5 && !ai.triedBack) { ai.triedBack = true; ai.back = 0.9; ai.dodge = 2.6; }
        if (ai.wait > 6) target = 30;
        const off = v.x < view.x0 - 50 || v.x > view.x1 + 50 || v.y < view.y0 - 50 || v.y > view.y1 + 50;
        if (ai.wait > 9 && off) { this.remove(v); break; }
      } else if (!blockedBy) ai.triedBack = false;
      if (v.v < target) v.v = Math.min(target, v.v + (v.type === 'moto' ? 160 : 120) * dt);
      else v.v = Math.max(target, v.v - 380 * dt);
      // no atravesar a nadie (04/11/2026): si el paso lo mete en otro vehículo, no avanza ni gira
      const nx = v.x + fx * v.v * dt, ny = v.y + fy * v.v * dt, hit = v.contacts(nx, ny, v.a);
      const o2 = hit && hit.other;
      // dos del tránsito trabados uno contra el otro (en un cruce): pasa primero el que llegó antes
      const yieldsTo = o2 && !(o2.ai && o2.ai.jam > 0.5 && ai.jam > 0.5 && (v.tid || 0) < (o2.tid || 0));
      if (o2 && yieldsTo && !v.contacts(v.x, v.y, v.pa)) {
        v.a = v.pa; v.v = 0; ai.jam = (ai.jam || 0) + dt;
        if (ai.jam > 1.2 && !(ai.dodge > 0)) ai.dodge = 2.2;
        if (ai.jam > 2.5 && !ai.jamBack) { ai.jamBack = true; ai.back = 0.8; ai.dodge = 2.6; } // un poco atrás y probar por el costado
        // una moto o patineta estacionada que quedó en el camino: la corre despacito con el paragolpes
        if (ai.jam > 1.5 && !o2.ai && !o2.unit && !o2.driven && o2.spec.mass < 0.5) { const d = Math.hypot(o2.x - v.x, o2.y - v.y) || 1; if (o2.vx === undefined) { o2.vx = 0; o2.vy = 0; o2.w = 0; } o2.vx += (o2.x - v.x) / d * 30; o2.vy += (o2.y - v.y) / d * 30; W.wake(o2, 20); }
        const off = v.x < view.x0 - 50 || v.x > view.x1 + 50 || v.y < view.y0 - 50 || v.y > view.y1 + 50;
        if (ai.jam > 8 && off) { this.remove(v); break; }
      } else { ai.jam = 0; ai.jamBack = false; v.x = nx; v.y = ny; }
      v.vx = fx * v.v; v.vy = fy * v.v; v.w = 0;
      W.moveBox(v);
    }
  }
};
