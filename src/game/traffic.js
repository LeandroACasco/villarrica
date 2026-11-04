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
  lane(e, from, s) {
    const to = from === e.a ? e.b : e.a;
    const dx = (this.nx[to] - this.nx[from]) / e.len, dy = (this.ny[to] - this.ny[from]) / e.len;
    // mano única: por el medio (deja lugar a los estacionados de los dos lados); doble mano: carril derecho,
    // pero sin pegarse al cordón, donde hay autos estacionados
    const off = e.ow ? 0 : e.w * 0.17;
    return [this.nx[from] + dx * s - dy * off, this.ny[from] + dy * s + dx * off, dx, dy];
  }
  pickNext(e, to) {
    const outs = this.out[to].filter(([id]) => id !== e.id);
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
    const p = this.lane(e, from, Math.min(s, e.len));
    if (ai.off) { p[0] -= p[3] * ai.off; p[1] += p[2] * ai.off; } // corrido hacia el cordón (+) o para pasar (−)
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
      const moto = this.rnd() < this.motoShare, type = moto ? 'moto' : 'car', model = moto ? VR.pickMoto(this.rnd, false) : VR.pickCar(this.rnd, false);
      const pal = model === 'pati' ? VR.PATI_COLORS : moto ? VR.MOTO_COLORS : VR.CAR_COLORS, color = (this.rnd() * pal.length) | 0;
      if (W.boxOverlap(lx - 30, ly - 30, lx + 30, ly + 30) && model === 'carga') continue;
      const tune = this.rnd() < 0.1 && VR.TUNE_MODELS[model] ? VR.tuneRandom(model, this.rnd) : null; // algunos vienen tuneados
      const v = new VR.Car(W, lx, ly, Math.atan2(dx, -dy), color, type, model, tune);
      if (moto) v.rider = { shirt: VR.RIDER_SHIRTS[(this.rnd() * VR.RIDER_SHIRTS.length) | 0], head: this.rnd() < 0.45 ? '#2a1b12' : ['#1a1a1e', '#c8322a', '#f2f0ea', '#2f5fa8'][(this.rnd() * 4) | 0] };
      v.ai = { e, from: n, s: s0, next: null, cruise: Math.min(v.spec.max.road * 0.6, moto ? 125 : 110) * (0.8 + this.rnd() * 0.4), wait: 0, honk: 0 };
      v.ai.next = this.pickNext(e, to);
      v.v = v.ai.cruise * 0.6;
      W.addBox(v); this.list.push(v);
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
    if (this.list.length < this.max) this.spawn(focus.x, focus.y, view);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const v = this.list[i];
      if (Math.hypot(v.x - focus.x, v.y - focus.y) > 1300) this.remove(v);
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
        ai.next = this.pickNext(ai.e, ai.next[1]);
      }
      [cx, cy] = this.carrot(ai, L);
      // abrir paso / esquivar: el carril se corre de a poco hacia el lado que corresponde
      const offT = ai.yield > 0 ? Math.min(10, ai.e.w * 0.3) : ai.dodge > 0 ? -Math.min(11, ai.e.w * 0.32) : 0;
      ai.off = (ai.off || 0) + VR.clamp(offT - (ai.off || 0), -18 * dt, 18 * dt);
      if (ai.yield > 0) ai.yield -= dt;
      if (ai.dodge > 0) ai.dodge -= dt;
      // girar hacia la zanahoria
      const want = Math.atan2(cx - v.x, -(cy - v.y));
      let d = want - v.a; d = Math.atan2(Math.sin(d), Math.cos(d));
      const tr = (v.type === 'moto' ? 4.2 : 3.4) * dt;
      v.a += VR.clamp(d, -tr, tr);
      // velocidad deseada: crucero, menos en curvas y antes de doblar en la esquina
      let target = ai.cruise * (ai.e.surf === VR.T.DIRTROAD ? 0.75 : ai.e.surf === VR.T.STONE ? 0.9 : 1);
      target *= Math.max(0.3, Math.cos(Math.min(1.5, Math.abs(d))));
      if (ai.next && ai.e.len - ai.s < 45) {
        const ne = this.edges[ai.next[0]], to = ai.from === ai.e.a ? ai.e.b : ai.e.a;
        const ax = this.nx[to] - this.nx[ai.from], ay = this.ny[to] - this.ny[ai.from], bx = this.nx[ai.next[1]] - this.nx[to], by = this.ny[ai.next[1]] - this.ny[to];
        const cos = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1);
        if (cos < 0.7) target = Math.min(target, v.type === 'moto' ? 70 : 55);
        void ne;
      }
      // ¿algo adelante? mirar unos puntos sobre el rumbo
      const fx = Math.sin(v.a), fy = -Math.cos(v.a), look = v.LEN / 2 + 8 + Math.max(0, v.v) * 0.45;
      let blockedBy = null;
      for (let k = v.LEN / 2 + 4; k <= look && !blockedBy; k += 6) {
        const qx = v.x + fx * k, qy = v.y + fy * k;
        const o = W.boxAt(qx, qy, v);
        if (o) blockedBy = o;
        else if (playerBody && Math.abs(qx - playerBody.x) < 9 && Math.abs(qy - playerBody.y) < 9) blockedBy = playerBody;
      }
      if (ai.yield > 0) target = Math.min(target, 18);
      if (ai.back > 0) { ai.back -= dt; v.v = -28; v.x += fx * v.v * dt; v.y += fy * v.v * dt; v.vx = fx * v.v; v.vy = fy * v.v; W.moveBox(v); continue; }
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
      v.x += fx * v.v * dt; v.y += fy * v.v * dt;
      v.vx = fx * v.v; v.vy = fy * v.v; v.w = 0;
      W.moveBox(v);
    }
  }
};
