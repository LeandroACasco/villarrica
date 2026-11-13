// Vida en las estaciones de servicio (13/11/2026, pedido de Leandro): playeros con el uniforme de cada estación y
// vehículos que llegan, cargan nafta y se van. Siempre hay uno o dos cargando cerca de donde estés.
//
// Circuito (mano derecha, igual que el resto del tránsito): el vehículo viene por la calle, dobla a la derecha por el
// pasillo de entrada, recorre un carril del techo hasta un surtidor, para, el playero le carga, y sale por el pasillo del
// otro lado, donde dobla a la derecha y se va por la calle. Los vehículos van "sobre rieles" (una curva suavizada) y frenan
// si hay algo adelante; no son del tránsito (no se pueden robar mientras cargan).
// Los playeros se quedan sobre las islas: caminan por la isla hasta el surtidor del cliente (un auto de la gente o el tuyo
// cuando cargás con ACCIÓN), le hablan, y vuelven a su lugar.
'use strict';
(() => {
  const S = VR.TILE, PS = () => VR.PS || 1;
  const PUMP_T = 16.3;                         // distancia (px) de cada surtidor al centro de su isla
  const LANE = [1, 4, 7];                      // profundidad (baldosas desde el borde del techo del lado de la calle) de los tres carriles
  const ISL = [2.5, 5.5];                      // ...y de las dos islas
  const TALK = {
    ask: ['¿Cuánto le pongo?', '¿Lleno, che?', '¿Nafta común?', '¿Cuánto va a ser?', '¿Le miro el aceite?'],
    done: ['¡Listo, vuelva pronto!', 'Ya está, aguyje.', '¡Todo listo, don!', 'Ahí tiene, che.'],
    me: ['¡Ahí le echo, che!', '¿Lleno, nomás?', '¡Ya le cargo!'],
    meDone: ['¡Aguyje, vuelva pronto!', '¡Listo, che!', 'Todo en orden, don.'],
  };
  const pick = (a, r) => a[(r() * a.length) | 0];
  const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  // color de remera más parecido al color de cabecera del estilo
  const nearCloth = (hex) => {
    const C = VR.AV2_CAT.cloth, rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], t = rgb(hex);
    let bi = 0, bd = 1e9;
    C.forEach((c, i) => { const q = rgb(c), d = (q[0] - t[0]) ** 2 + (q[1] - t[1]) ** 2 + (q[2] - t[2]) ** 2; if (d < bd) { bd = d; bi = i; } });
    return bi;
  };

  // curva suavizada (Chaikin) y remuestreada cada 2 px
  const smooth = (pts, it = 3) => {
    for (let k = 0; k < it; k++) {
      const o = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      o.push(pts[pts.length - 1]); pts = o;
    }
    const out = [pts[0]]; let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
      let u = 2 - acc; while (u <= L) { out.push([a[0] + (b[0] - a[0]) * u / L, a[1] + (b[1] - a[1]) * u / L]); u += 2; }
      acc = L - (u - 2);
    }
    out.push(pts[pts.length - 1]);
    return out;
  };

  VR.EstVida = class {
    constructor(world) {
      this.world = world; this.rnd = VR.rng(311); this.vis = []; this.cool = 1; this.sts = [];
      const nrm = { s: [0, -1], n: [0, 1], e: [-1, 0], w: [1, 0] };
      for (const d of VR.Estaciones.list(world)) {
        const L = VR.Estaciones.lay(d), n = nrm[d.o], r = [-n[1], n[0]], hor = d.o === 's' || d.o === 'n';
        const [cx0, cy0, cw, ch] = L.canopy, c = [cx0 + cw / 2, cy0 + ch / 2], Dh = (hor ? ch : cw) / 2, Lh = (hor ? cw : ch) / 2;
        const st = { d, L, c, n, r, Dh, Lh, st: VR.Estaciones.ST[d.st], lane: [null, null, null], pl: [] };
        st.P = (lat, dd) => [c[0] + n[0] * (dd - Dh) + r[0] * lat, c[1] + n[1] * (dd - Dh) + r[1] * lat];   // lat: + a la derecha de quien entra; dd: desde el borde del lado de la calle, hacia adentro
        const cloth = nearCloth(st.st.tb), R = this.rnd;
        for (let k = 0; k < 2; k++) {
          const look = VR.av2Random(R); Object.assign(look, { gender: R() < 0.8 ? 'm' : 'f', top: 'polo', topColor: cloth, bottom: 'vestir', bottomColor: 3, shoes: 'zapatillas', shoesColor: 3, hat: 'gorra', hatColor: cloth, mochila: false, termo: false, lentes: false, anteojos: false, reloj: false, cadenita: false, print: false });
          if (look.gender === 'f') { look.hair = 'colita'; look.beard = 'no'; } else if (['trenza', 'rodete', 'colitaLado', 'ondulado', 'largo', 'medio'].includes(look.hair)) look.hair = 'corto';
          const ctr = st.P(0, ISL[k] * S), home = k ? -30 : 30;
          const p = { st, k, ctr, home, t: home, tgt: home, mode: 'idle', dir: 'down', anim: R() * 8, say: null, cl: null, said: false, look: VR.av2Lazy(look), x: 0, y: 0, px: 0, py: 0 };
          p.x = p.px = ctr[0] + r[0] * home; p.y = p.py = ctr[1] + r[1] * home + 6;
          st.pl.push(p);
        }
        this.sts.push(st);
      }
    }
    // ---------------------------------------------------------------- vehículos que cargan
    roadOk(x, y) { const T = VR.T, t = this.world.get(Math.floor(x / S), Math.floor(y / S)); return t === T.ROAD || t === T.STONE || t === T.DIRTROAD; }
    spawn(st, view) {
      const W = this.world, R = this.rnd, free = [0, 1, 2].filter((k) => !st.lane[k]); if (!free.length) return null;
      const k = free[(R() * free.length) | 0], D = LANE[k] * S, dStreet = -2.5 * S;
      const off = (p, m) => p[0] < view.x0 - m || p[0] > view.x1 + m || p[1] < view.y0 - m || p[1] > view.y1 + m;
      // tramo de calle usable (hacia donde viene y hacia donde se va)
      let Ls = 0; while (Ls < 700 && this.roadOk(...st.P(4 * S + Ls + 12, dStreet))) Ls += 12;
      let Le = 0; while (Le < 700 && this.roadOk(...st.P(-4 * S - Le - 12, dStreet))) Le += 12;
      let start = 0; for (let l = 200; l <= Ls; l += 24) if (off(st.P(4 * S + l, dStreet), 50)) { start = l; break; }
      if (!start) return null;
      const slot = st.P(-PUMP_T, D);
      if (W.boxOverlap(slot[0] - 22, slot[1] - 22, slot[0] + 22, slot[1] + 22)) return null;
      // modelo
      const moto = R() < 0.35, type = moto ? 'moto' : 'car', nv = W.nivelAt ? W.nivelAt(slot[0], slot[1]) : 0;
      let model = null;
      for (let i = 0; i < 8; i++) {
        const m = moto ? VR.pickMoto(R, false, nv) : VR.pickCar(R, false, 4 * S, nv), M = VR.CAR_MODELS[m];
        if (m === 'bici' || m === 'pati' || (M && (M.bus || M.big || M.emer))) continue; model = m; break;
      }
      if (!model) return null;
      const pal = moto ? VR.MOTO_COLORS : VR.CAR_COLORS, color = (R() * pal.length) | 0;
      const tune = !moto && VR.TUNE_MODELS[model] && R() < (VR.tuneChance ? VR.tuneChance(nv) : 0.1) ? VR.tuneRandom(model, R) : null;
      const a0 = st.P(4 * S + start, dStreet);
      const v = new VR.Car(W, a0[0], a0[1], 0, color, type, model, tune);
      if (moto) {
        if (!VR.RIDER_LOOKS) { const r = VR.rng(31); VR.RIDER_LOOKS = Array.from({ length: 12 }, (_, i) => { const L = VR.av2Random(r); L.mochila = false; L.termo = false; if (i % 3 !== 2) { L.hat = 'casco'; L.hatColor = (r() * VR.AV2_CAT.cloth.length) | 0; } return L; }); }
        v.rider = { shirt: VR.RIDER_SHIRTS[0], head: '#2a1b12', L: VR.RIDER_LOOKS[(R() * VR.RIDER_LOOKS.length) | 0] };
      }
      // camino: calle → pasillo de la derecha → carril → surtidor → pasillo de la izquierda → calle
      const pts = [st.P(4 * S + start, dStreet), st.P(4 * S, dStreet), st.P(4 * S, D), st.P(-PUMP_T, D), st.P(-4 * S, D), st.P(-4 * S, dStreet), st.P(-4 * S - Math.max(40, Math.min(Le, 520)), dStreet)];
      const path = smooth(pts, 3); let sl = 0, bd = 1e9;
      path.forEach((p, i) => { const q = Math.hypot(p[0] - slot[0], p[1] - slot[1]); if (q < bd) { bd = q; sl = i; } });
      v.a = Math.atan2(path[3][0] - path[0][0], -(path[3][1] - path[0][1]));
      v.est = { st, k, path, stopI: sl, i: 0, ph: 'in', t: 0, wait: 0, fill: (moto ? 4 : 6) + R() * 5, cruise: 62 + R() * 22, done: false, kind: 'visit' };
      v.px = v.x; v.py = v.y; v.pa = v.a; v.v = 30; st.lane[k] = v;
      W.addBox(v); this.vis.push(v);
      return v;
    }
    kill(v) { this.world.removeBox(v); const i = this.vis.indexOf(v); if (i >= 0) this.vis.splice(i, 1); const e = v.est; if (e && e.st.lane[e.k] === v) e.st.lane[e.k] = null; for (const p of e.st.pl) if (p.cl === v) p.cl = null; }
    drive(v, dt, view, body, car) {
      const e = v.est, W = this.world, path = e.path; v.px = v.x; v.py = v.y; v.pa = v.a;
      e.t += dt;
      if (e.ph === 'fill') {
        v.v = 0; v.vx = v.vy = 0;
        const serv = e.st.pl.some((p) => p.cl === v && p.mode === 'idle' && p.atTgt);
        if (serv || e.t > 3) e.fill -= dt;
        if (e.fill <= 0) { e.ph = 'out'; e.done = true; }
        return;
      }
      const i = Math.min(path.length - 2, e.i), fl = Math.max(2, Math.round((8 + Math.abs(v.v) * 0.12) / 2));
      const A = path[i], Bq = path[Math.min(path.length - 1, i + fl)], dir = Math.atan2(Bq[0] - A[0], -(Bq[1] - A[1]));
      let da = dir - v.a; da = Math.atan2(Math.sin(da), Math.cos(da));
      v.a += VR.clamp(da, -5 * dt, 5 * dt);
      // velocidad deseada: crucero afuera, más despacio entre los surtidores y en las curvas; frena para parar en el surtidor
      const inside = e.st && Math.abs((A[0] - e.st.c[0]) * e.st.r[0] + (A[1] - e.st.c[1]) * e.st.r[1]) < e.st.Lh + 8 && Math.abs((A[0] - e.st.c[0]) * e.st.n[0] + (A[1] - e.st.c[1]) * e.st.n[1]) < e.st.Dh + 4 * S;
      let target = inside ? Math.min(e.cruise, 34) : e.cruise;
      const far = path[Math.min(path.length - 1, i + 18)], dd2 = Math.atan2(far[0] - A[0], -(far[1] - A[1])) - dir, dd = Math.abs(Math.atan2(Math.sin(dd2), Math.cos(dd2)));
      target *= Math.max(0.35, Math.cos(Math.min(1.4, dd)));
      if (e.ph === 'in') { const rest = (e.stopI - e.i) * 2; target = Math.min(target, Math.max(7, rest * 1.3)); if (rest < 1.5 && v.v < 9) { e.i = e.stopI; const P = path[e.stopI]; v.x = P[0]; v.y = P[1]; e.ph = 'fill'; e.t = 0; v.v = 0; return; } }
      // ¿algo adelante?
      const fx = Math.sin(v.a), fy = -Math.cos(v.a), look = v.LEN / 2 + 8 + Math.max(0, v.v) * 0.4;
      let blocked = false;
      for (let q = v.LEN / 2 + 4; q <= look && !blocked; q += 6) {
        const qx = v.x + fx * q, qy = v.y + fy * q, o = W.boxAt(qx, qy, v);
        if (o && !(o.ghost > 0)) blocked = true;
        else if (body && Math.abs(qx - body.x) < 9 && Math.abs(qy - body.y) < 9) blocked = true;
      }
      if (blocked) { target = 0; e.wait += dt; } else e.wait = 0;
      if (e.wait > 14 && (v.x < view.x0 - 40 || v.x > view.x1 + 40 || v.y < view.y0 - 40 || v.y > view.y1 + 40)) { e.dead = true; return; }
      if (v.v < target) v.v = Math.min(target, v.v + (v.type === 'moto' ? 150 : 110) * dt); else v.v = Math.max(target, v.v - 300 * dt);
      const adv = Math.max(0, v.v) * dt / 2; e.f = (e.f || 0) + adv; const k = Math.floor(e.f); e.f -= k; e.i += k;
      if (e.i >= path.length - 2) { e.dead = true; return; }
      const P = path[e.i], Q = path[Math.min(path.length - 1, e.i + 1)];
      v.x = P[0] + (Q[0] - P[0]) * e.f; v.y = P[1] + (Q[1] - P[1]) * e.f;
      v.vx = fx * v.v; v.vy = fy * v.v; v.w = 0;
      W.moveBox(v);
    }
    // ---------------------------------------------------------------- playeros
    clientsOf(st, car) {
      const out = [];
      for (const v of this.vis) if (v.est.st === st && v.est.ph === 'fill') out.push(v);
      if (car && car._carga && VR.Tab && VR.Tab.enSurtidor(car) === st.d) out.push(car);
      return out;
    }
    islandOf(st, c) {   // isla más cercana (por profundidad) al cliente; en empate, la de adentro (a la derecha del que entra)
      const dd = (c.x - st.c[0]) * st.n[0] + (c.y - st.c[1]) * st.n[1] + st.Dh;
      return Math.abs(dd - ISL[0] * S) < Math.abs(dd - ISL[1] * S) - 0.5 ? 0 : 1;
    }
    playeros(dt, car) {
      const R = this.rnd;
      for (const st of this.sts) {
        const cls = this.clientsOf(st, car);
        for (const p of st.pl) {
          p.px = p.x; p.py = p.y;
          if (p.say) { p.say.t -= dt; if (p.say.t <= 0) p.say = null; }
          // ¿cliente nuevo?
          if (p.cl && !cls.includes(p.cl)) { if (p.cl === car || p.said) p.say = { text: pick(p.cl === car ? TALK.meDone : TALK.done, R), t: 2 }; p.cl = null; p.said = false; p.atTgt = false; }
          if (!p.cl) { const c = cls.find((q) => this.islandOf(st, q) === p.k && !st.pl.some((o) => o.cl === q)); if (c) { p.cl = c; p.said = false; p.atTgt = false; } }
          let tgt = p.home;
          if (p.cl) {
            const c = p.cl, tC = (c.x - p.ctr[0]) * st.r[0] + (c.y - p.ctr[1]) * st.r[1];
            tgt = VR.clamp(tC, -34, 34);
            for (const tp of [-PUMP_T, PUMP_T]) if (Math.abs(tgt - tp) < 7) tgt = tp + (tgt >= tp ? 8 : -8);
          }
          const dt2 = tgt - p.t, step = 28 * dt;
          if (Math.abs(dt2) > 0.8) {
            p.t += VR.clamp(dt2, -step, step); p.mode = 'walk'; p.anim += dt * 9; p.atTgt = false;
            const s = Math.sign(dt2), ax = st.r[0] * s, ay = st.r[1] * s; p.dir = Math.abs(ay) > Math.abs(ax) ? (ay > 0 ? 'down' : 'up') : ax > 0 ? 'right' : 'left';
          } else {
            p.mode = 'idle'; p.atTgt = !!p.cl;
            if (p.cl) { const dx = p.cl.x - p.x, dy = p.cl.y - p.y; p.dir = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : dx > 0 ? 'right' : 'left'; if (!p.said) { p.said = true; p.say = { text: pick(p.cl === car ? TALK.me : TALK.ask, R), t: 2.2 }; } }
            else p.dir = 'down';
          }
          p.x = p.ctr[0] + st.r[0] * p.t; p.y = p.ctr[1] + st.r[1] * p.t + 6;
        }
      }
    }
    update(dt, focus, view, body, car) {
      if (!this.sts.length) return;
      dt = Math.min(dt, 0.1);
      const near = this.sts.filter((s) => Math.hypot(s.c[0] - focus.x, s.c[1] - focus.y) < 900);
      // mantener uno o dos cargando en cada estación cercana
      this.cool -= dt;
      if (this.cool <= 0 && this.vis.length < 6 && near.length) {
        near.sort((a, b) => a.lane.filter(Boolean).length - b.lane.filter(Boolean).length || Math.hypot(a.c[0] - focus.x, a.c[1] - focus.y) - Math.hypot(b.c[0] - focus.x, b.c[1] - focus.y));
        const st = near[0], n = st.lane.filter(Boolean).length;
        if (n < 2 && Math.hypot(st.c[0] - focus.x, st.c[1] - focus.y) < 700) { const v = this.spawn(st, view); this.cool = v ? (n === 0 ? 4 + this.rnd() * 4 : 9 + this.rnd() * 8) : 2; }
        else this.cool = 2;
      }
      for (let i = this.vis.length - 1; i >= 0; i--) {
        const v = this.vis[i];
        if (Math.hypot(v.x - focus.x, v.y - focus.y) > 1300) { this.kill(v); continue; }
        this.drive(v, dt, view, body, car);
        if (v.est.dead) this.kill(v);
      }
      this.playeros(dt, car);
    }
    collect(camX, camY, sw, sh, al, out, car) {
      const PSv = PS();
      for (const st of this.sts) {
        for (const p of st.pl) {
          const x = Math.round(VR.lerp(p.px, p.x, al) - camX), y = Math.round(VR.lerp(p.py, p.y, al) - camY);
          if (x < -30 || y < -40 || x > sw + 30 || y > sh + 30) continue;
          out.push({ sy: y + camY, draw: (ctx) => {
            const pim = p.mode === 'walk' ? p.look.get(p.dir, 'walk', Math.floor(p.anim) % 8) : p.look.get(p.dir, 'idle', 0);
            // manguera: del surtidor más cercano al auto, mientras carga
            if (p.cl && p.atTgt) {
              let bp = null, bd = 1e9; for (const q of st.L.pumps) { const d = Math.hypot(q[0] - p.cl.x, q[1] - p.cl.y); if (d < bd) { bd = d; bp = q; } }
              if (bp) { const x0 = bp[0] - camX, y0 = bp[1] + 2 - camY, x1 = p.cl.x - camX, y1 = p.cl.y - 3 - camY; ctx.strokeStyle = '#1b1b20'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + 8, x1, y1); ctx.stroke(); ctx.fillStyle = '#e8b830'; ctx.fillRect(x1 - 1, y1 - 1, 3, 3); }
            }
            VR.sun.blob(ctx, x, y, 3, 3.2 * PSv, 1.5 * PSv, 0.24); VR.sun.cast(ctx, pim, x, y + PSv, 16 * PSv, 32 * PSv, 0.28);
            ctx.drawImage(pim, x - 8 * PSv, y - 31 * PSv, 16 * PSv, 32 * PSv);
            if (p.say) VR.Player.prototype.drawBubble.call({ bubble: p.say, px: x + camX, x: x + camX, py: y + camY + 6, y: y + camY + 6 }, ctx, camX, camY, 1);
          } });
        }
      }
    }
  };
})();
