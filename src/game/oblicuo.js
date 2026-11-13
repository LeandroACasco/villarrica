// Vehículos en vista oblicua (13/11/2026, pedido de Leandro): como en los juegos de celular de 2006, los autos no
// se ven "planos" desde arriba sino también un poco de costado: se les ve el techo y además la puerta, las
// ventanillas y las ruedas del lado que mira a la cámara (el sur), igual que a las personas y a los edificios.
//
// Cómo se hace: cada vehículo sigue teniendo su dibujo desde arriba (VR.vbase) y ahora, además, un PERFIL:
//   top(y), bot(y)   a qué altura está el techo de cada franja a lo largo del vehículo (capó, parabrisas, techo,
//                    luneta, baúl…) y desde qué altura empieza (0 = llega al piso; el manubrio empieza arriba)
//   side(g)          el costado pintado en coordenadas (y a lo largo, v de altura): chapa, ventanillas, ruedas
//   ins(y, v)        cuánto se angosta a esa altura (la cabina es más angosta que la carrocería)
// Con eso se "apila": para cada altura se dibuja la silueta del vehículo girada y corrida hacia arriba, pintada
// con la fila del costado que le toca, y encima la franja del dibujo de arriba que queda a esa altura. Sale el
// volumen completo en los 64 ángulos sin dibujar cada ángulo a mano. Todo original, por código.
// Alturas en unidades del mundo (8 = 1 m). VR.OBL.kz = cuántos px de pantalla sube cada unidad de altura.
'use strict';
(() => {
  const O = VR.OBL = { on: true, kz: 0.46, step: 2, async: false, budget: 2 };
  try { const q = new URLSearchParams(location.search); if (q.get('kz')) O.kz = +q.get('kz'); if (q.has('plano')) O.on = false; if (q.has('cola')) O.async = true; } catch (e) {} // para comparar: ?kz=0.7 · ?plano (como antes)
  const SH = (c, k) => VR.shadeHex(c, k);
  const GL = ['#1c2c40', '#34506c', '#9fc0dc'], CHR = ['#7a7e86', '#e8ecf2', '#9aa0a8'];
  const interp = (pts, y) => {
    if (typeof pts === 'function') return pts(y);
    if (!pts) return 0;
    if (y <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) { const [y0, h0] = pts[i - 1], [y1, h1] = pts[i]; return y1 - y0 < 1e-6 ? h1 : h0 + (h1 - h0) * (y - y0) / (y1 - y0); }
    return pts[pts.length - 1][1];
  };
  const px = (c) => new Uint32Array(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.buffer); // píxeles (ABGR)
  const darken = (img, a = 0.36) => { const c = VR.canvas(img.width, img.height), g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(8,8,18,${a})`; g.fillRect(0, 0, c.width, c.height); return c; };

  const prep = (base) => {
    if (base._obl) return base._obl;
    const P = base.prof, w = base.width, h = base.height, k = h / P.L, zs = k * O.kz;
    const o = base._obl = { w, h, k, zs };
    o.pix = px(base);
    if (P.layers) { o.layers = P.layers.map((l) => ({ pix: px(l.img), dark: px(darken(l.img)), i0: Math.round(l.z0 * zs), i1: Math.round(l.z1 * zs) })); o.nz = Math.max(...o.layers.map((l) => l.i1)) + 1; return o; }
    const nz = o.nz = Math.ceil(P.H * zs) + 1, top = new Float32Array(h), bot = new Float32Array(h);
    for (let r = 0; r < h; r++) { const y = (r + 0.5) / k; top[r] = interp(P.top, y) * zs; bot[r] = interp(P.bot, y) * zs; }
    const self = P.side === 'self';
    if (self) o.dark = px(darken(base));
    else {
      const tex = o.tex = VR.canvas(nz + 1, h), g = tex.getContext('2d');
      g.setTransform(0, k, zs, 0, 0, 0);
      const H = {
        R(u0, v0, u1, v1, col) { g.fillStyle = col; g.fillRect(u0, v0, u1 - u0, v1 - v0); },
        disc(u, v, r, col) { g.fillStyle = col; g.beginPath(); g.arc(u, v, r, 0, Math.PI * 2); g.fill(); },
        wheel(u, r, rim = '#9aa0a8') { H.disc(u, r, r, '#17171a'); H.disc(u, r, r * 0.58, rim); H.disc(u, r, r * 0.3, SH(rim, 0.6)); H.disc(u, r, r * 0.12, '#d8dce4'); },
      };
      P.side(g, H);
      o.tex = px(tex); o.tw = nz + 1;
    }
    // tramos por altura: [fila0, fila1, angostamiento en px]; side = pared a esa altura, tops = franjas del dibujo de arriba
    const runs = (i, inF, insF) => {
      const out = []; let r0 = -1, cur = 0;
      for (let r = 0; r <= h; r++) {
        const ok = r < h && inF(r), xi = ok ? Math.round((insF ? insF((r + 0.5) / k, i / zs) : 0) * k) : 0;
        if (r0 >= 0 && (!ok || xi !== cur)) { out.push([r0, r, cur]); r0 = -1; }
        if (ok && r0 < 0) { r0 = r; cur = xi; }
      }
      return out;
    };
    o.side = []; o.tops = [];
    for (let i = 0; i <= nz; i += O.step) { // de a O.step px de altura (el dibujo está al quíntuple: no se nota y cuesta la mitad)
      o.side.push(runs(i, (r) => bot[r] <= i && top[r] > i, P.ins));
      o.tops.push(runs(i, (r) => top[r] > 0 && top[r] >= i && top[r] < i + O.step, P.tin));
    }
    // trompa y cola: para esas filas y alturas, el color sale de una fila del dibujo de arriba (faros, parrilla, luces)
    o.caps = (P.caps || []).map((c) => ({ s0: c.src[0] * k, sh: (c.src[1] - c.src[0]) * k, d0: Math.round(c.dst[0] * k), d1: Math.round(c.dst[1] * k), i0: c.v[0] * zs, i1: c.v[1] * zs }));
    return o;
  };

  // Dibuja el vehículo girado a (radianes) y con volumen, en un lienzo de B×B (a la escala grande del dibujo base).
  // Segunda versión (13/11/2026): las capas se apilan en memoria, píxel por píxel y SIN girar (correr una capa hacia
  // arriba en pantalla es correrla en diagonal en el dibujo sin girar), y recién al final se gira todo junto una vez.
  // Así un ángulo cuesta casi lo mismo que girar el dibujo plano y se puede hacer en el momento: el dibujo sigue
  // al vehículo cuando dobla, sin esperar a ninguna cola.
  O.render = (base, a, B) => {
    const o = prep(base), { w, h, pix } = o, pad = o.nz + 2, W = w + 2 * pad, Hh = h + 2 * pad, out = new Uint32Array(W * Hh);
    const sa = Math.sin(a), ca = Math.cos(a), A = 0xff000000, ST = O.step;
    const off = (i) => (pad + Math.round(-i * ca)) * W + pad + Math.round(-i * sa);
    if (o.layers) {
      for (const l of o.layers) for (let i = l.i0; i <= l.i1; i += (i < l.i1 && i + ST > l.i1 ? l.i1 - i : ST)) {
        const src = i >= l.i1 ? l.pix : l.dark, o0 = off(i);
        for (let y = 0; y < h; y++) for (let x = 0, q = y * w; x < w; x++, q++) { const c = src[q]; if ((c >>> 24) > 100) out[o0 + y * W + x] = c | A; }
      }
    } else {
      const tex = o.tex, tw = o.tw, dark = o.dark;
      for (let n = 0; n < o.side.length; n++) {
        const i = n * ST, o0 = off(i), ti = Math.min(i, o.nz);
        for (const [r0, r1, xi] of o.side[n]) {
          const spans = xi < 0 ? [[0, -xi], [w + xi, w]] : [[xi, w - xi]]; // xi < 0: solo los bordes (ruedas a los costados)
          for (let y = r0; y < r1; y++) {
            let tc = 0, cr = -1;
            if (!dark) {
              tc = tex[y * tw + ti]; if ((tc >>> 24) < 128) continue; tc |= A;
              for (const c of o.caps) if (i >= c.i0 && i <= c.i1 && y >= c.d0 && y < c.d1) cr = Math.min(h - 1, Math.round(c.s0 + (y - c.d0) / (c.d1 - c.d0) * c.sh)) * w;
            }
            for (const [xa, xb] of spans) for (let x = xa, q = y * w + xa, d = o0 + y * W + xa; x < xb; x++, q++, d++) {
              if ((pix[q] >>> 24) <= 100) continue;
              if (dark) out[d] = dark[q] | A; else if (cr >= 0 && (pix[cr + x] >>> 24) > 100) out[d] = pix[cr + x] | A; else out[d] = tc;
            }
          }
        }
        for (const [r0, r1, xi] of o.tops[n]) {
          const ya = Math.max(0, r0 - ST), yb = Math.min(h, r1 + ST);
          for (let y = ya; y < yb; y++) for (let x = xi, q = y * w + xi, d = o0 + y * W + xi; x < w - xi; x++, q++, d++) { const c = pix[q]; if ((c >>> 24) > 100) out[d] = c | A; }
        }
      }
    }
    const comp = VR.canvas(W, Hh), cg = comp.getContext('2d'), id = cg.createImageData(W, Hh);
    new Uint32Array(id.data.buffer).set(out); cg.putImageData(id, 0, 0);
    const big = VR.canvas(B, B), x = big.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.translate(B / 2, B / 2); x.rotate(a); x.drawImage(comp, -W / 2, -Hh / 2);
    return big;
  };
  O.renderGen = function* (base, a, B) { return O.render(base, a, B); };

  // Cola de dibujos pendientes (apagada: O.async = false). Era para la primera versión, que tardaba ~10 ms por ángulo:
  // repartía el trabajo entre cuadros y mientras tanto se veía el ángulo de al lado (Leandro notó que el dibujo no
  // seguía al vehículo al doblar). Queda por si algún día hace falta; con ?cola en la dirección se prende.
  const Q = []; let ticking = false;
  const tick = () => {
    const t0 = performance.now();
    // si lo que falta es un vehículo que todavía no tiene ningún ángulo (no se ve), se le da más tiempo
    while (Q.length && performance.now() - t0 < (Q[Q.length - 1].f.n ? O.budget : O.budget * 2.5)) {
      const j = Q[Q.length - 1];
      if (j.f.img[j.k]) { Q.pop(); j.f.pend[j.k] = 0; continue; }
      if (!j.it) j.it = j.gen(j.k);
      if (j.it.next().done) { Q.pop(); j.f.pend[j.k] = 0; }
    }
    if (Q.length) requestAnimationFrame(tick); else ticking = false;
  };
  O.enqueue = (f, k, gen, urgent) => {
    if (f.pend[k]) { if (urgent) { const n = Q.findIndex((j) => j.f === f && j.k === k); if (n >= 0 && n < Q.length - 1) Q.push(Q.splice(n, 1)[0]); } return; }
    f.pend[k] = 1; const job = { f, k, gen, it: null };
    if (urgent) Q.push(job); else Q.unshift(job);
    while (Q.length > 240) { const d = Q.shift(); d.f.pend[d.k] = 0; }
    if (!ticking) { ticking = true; requestAnimationFrame(tick); }
  };
  O.pending = () => Q.length;
  O.extra = (base) => (O.on && base.prof ? Math.ceil(base.prof.H * O.kz) + 1 : 0); // lugar de más arriba (y abajo, para que siga centrado)
  O.lift = (base) => (O.on && base.prof ? base.prof.H * O.kz : 0);

  // ---------- perfiles ----------
  // Autos de VR.drawAuto (c = la misma configuración del dibujo de arriba). hz: [altura del capó, altura del techo]
  O.car = (c, pal, t = {}) => {
    const [C, D, L] = pal, Ln = c.L, hatch = c.box && !c.bed, van = c.rg <= 0.01;
    const [hb, hr] = c.hz || (c.box ? [8.8, 14] : [7.2, 11.4]);
    const sill = c.box ? 2.5 : 1.7, wr = c.wr || (c.box ? 3.4 : 2.9), wt = wr * 2 + 0.2;
    const yH = c.hood, yW = yH + c.ws, yR = yW + c.roof, yG = yR + c.rg, ta = Ln * (c.fa || 0.2), tb = Ln * (c.ra || 0.78), cabEnd = van ? Ln : yG;
    const gl = t.polarizado == 2 ? ['#0a0d14', '#141b24', '#34404e'] : t.polarizado == 1 ? ['#141c26', '#26364a', '#5e7690'] : GL;
    const HL = t.faros === 'xenon' ? '#e6f2ff' : '#fff4c0', S2 = VR.tunePal ? VR.tunePal(t.color2 ?? 11)[0] : '#f2f0ea';
    const rim = t.llantas && t.llantas !== 'serie' && VR.RIMS ? VR.RIMS[t.llantas] : '#9aa0a8';
    const top = [[0, hb * 0.74], [1.6, hb * 0.95], [yH, hb], [yW, hr], [yR, hr]];
    if (van) top.push([Ln - 0.6, hr], [Ln, hr * 0.9]);
    else if (c.bed) top.push([yG, hb + 0.5], [Ln, hb + 0.5]);
    else if (hatch) top.push([yG, hr - (hr - hb) * 0.4], [Ln - 0.8, hb + 0.8], [Ln, hb * 0.8]);
    else top.push([yG, hb], [Ln - 1.4, hb * 0.97], [Ln, hb * 0.76]);
    const lz = [hb * 0.5, hb * 0.86];
    return { L: Ln, H: hr, top, lift: hr,
      ins: (y, v) => (v > hb + 0.2 ? 1.5 : v > wt ? 0.8 : 0), tin: (y, v) => (v > hb + 0.3 ? 1.1 : 0.75),
      caps: [{ src: [0.5, 2.2], dst: [0, 2.4], v: lz }, { src: [Ln - 2.7, Ln - 0.6], dst: [Ln - 2.4, Ln], v: lz }],
      side(g, H) {
        const R = H.R, body = SH(C, 0.84);
        R(0, sill, Ln, hb, body);
        R(0, sill, Ln, sill + 1, SH(D, 0.8));                                       // zócalo
        R(0, hb - 2.9, Ln, hb, SH(C, 0.96)); R(0, hb - 1.7, Ln, hb - 1.2, L);         // hombro con filete de luz
        if (c.box) { R(0, sill, 1.6, sill + 2.2, '#2c2c32'); R(Ln - 1.6, sill, Ln, sill + 2.2, '#2c2c32'); } // paragolpes
        if (c.stripe) R(1.6, hb - 4.6, Ln - 1.6, hb - 3.1, c.stripe);
        if (t.franja === 'costado') R(1.6, hb - 4.2, Ln - 1.6, hb - 3.3, S2);
        for (const u of [ta, tb]) H.disc(u, wr * 0.95, wr + 0.75, '#121214');       // pasarruedas
        for (const u of [ta, tb]) H.wheel(u, wr, rim);
        const dl = c.doors3 ? [yW + 0.7, yR - 0.4] : [yW + 0.7, (yW + yR) / 2 + 0.2, yR - 0.3];
        for (const u of dl) R(u, sill + 1.1, u + 0.3, hb - 0.2, SH(D, 0.72)); // puertas
        for (let i = 0; i + 1 < dl.length; i++) R(dl[i + 1] - 1.9, hb - 2.6, dl[i + 1] - 0.8, hb - 2.2, SH(D, 0.6)); // manijas
        R(0, lz[0], 1.3, lz[1], HL); R(Ln - 1.3, lz[0], Ln, lz[1], '#d8302a');     // luces que doblan al costado
        // cabina: parantes, vidrios y borde del techo
        R(yH, hb, cabEnd, hr, SH(C, 0.8));
        const g0 = hb + 0.5, g1 = hr - 1.1, pane = (u0, u1) => { R(u0, g0, u1, g1, gl[0]); R(u0, g0 + (g1 - g0) * 0.45, u1, g1, gl[1]); R(u0, g1 - 0.45, u1, g1 - 0.15, gl[2]); };
        if (van) { pane(yH + 0.3, yW + 4.6); if (c.roof > 20) pane(yW + 5.6, yW + 10.4); }
        else {
          const n = c.doors3 ? 1 : Math.max(2, Math.round(c.roof / 5.6)), a0 = yH + 0.3, a1 = yR - 0.5, pw = (a1 - a0) / n;
          for (let i = 0; i < n; i++) pane(a0 + i * pw + (i ? 0.35 : 0), a0 + (i + 1) * pw - (i < n - 1 ? 0.35 : 0));
          if (c.rg > 0.8) pane(yR + 0.3, yG + 2);
        }
        R(yH, hr - 1.05, cabEnd, hr, SH(C, 0.68));
        if (van && c.stripe) R(yW + 5, hb + 1.2, Ln - 1, hb + 3, c.stripe);
        if (c.bed) { R(yG, hb, Ln, hb + 0.5, SH(D, 0.75)); }
      } };
  };
  O.MITA = { L: 30, W: 16, hood: 8, ws: 4.2, roof: 9.6, rg: 3.2, fa: 7.6 / 30, ra: 23.1 / 30 };

  // Colectivos (c = configuración de VR.drawBus)
  O.bus = (c, pal) => {
    const [C, D, L] = pal, Ln = c.L, urban = c.kind === 'urban', K = c.liv, Hh = urban ? 23 : 27, wr = 3.9, fb = 2.8, yW1 = fb + c.ws;
    const BG = urban ? ['#141d28', '#2c3e54', '#8fb0cc'] : ['#0a0e16', '#161e28', '#44586e'];
    return { L: Ln, H: Hh, lift: Hh, top: [[0, Hh * 0.42], [fb, Hh * 0.5], [yW1, Hh], [Ln - 0.5, Hh], [Ln, Hh * 0.92]],
      ins: (y, v) => (v > wr * 2 + 0.3 ? 0.9 : 0), tin: () => 0.85,
      side(g, H) {
        const R = H.R, sill = 2.6, w0 = urban ? 11 : 13.5, w1 = Hh - 3;
        R(0, sill, Ln, Hh, SH(C, 0.9)); R(0, sill, Ln, sill + 1.6, '#2a2a30');
        R(0, Hh - 1.2, Ln, Hh, SH(C, 0.74));
        let v = urban ? 5.4 : 5; for (const [, hh, col] of [...K.swoosh].reverse()) { R(1, v, Ln - 1, v + hh * 0.9, col); v += hh * 0.9 + 0.3; }  // franjas de la empresa (solo colores)
        R(0, w0 - 1, Ln, w0 - 0.4, K.edge);
        R(yW1 - 0.5, w0, Ln - (urban ? 2 : 3), w1, BG[0]); R(yW1 - 0.5, w0 + (w1 - w0) * 0.5, Ln - (urban ? 2 : 3), w1, BG[1]);
        R(yW1 - 0.5, w1 - 0.6, Ln - 3, w1 - 0.25, BG[2]);
        for (let u = yW1 + c.pitch; u < Ln - 3; u += c.pitch) R(u - 0.3, w0, u + 0.3, w1, SH(C, 0.8));  // parantes
        if (urban) { for (const u of [yW1 + 0.4, Ln * 0.56]) { R(u, sill + 1.4, u + 5, w1, BG[0]); R(u + 2.3, sill + 1.4, u + 2.7, w1, '#9aa0a8'); R(u, w0 + 4, u + 5, w1, BG[1]); } } // puertas
        else R(yW1 + 0.6, sill + 1.4, yW1 + 4.6, w1, BG[0]);
        R(0, sill + 1.6, 1.4, w0 - 1, K.front[0]); R(0, w0 - 2, 1.5, Hh - 2.4, BG[1]); R(0, 4.4, 1.4, 6.6, '#fff4c0'); // trompa, parabrisas y faros
        R(Ln - 1.4, 4.6, Ln, 7.4, '#d8302a'); if (urban) R(Ln - 1.4, w0 + 1, Ln, w1 - 1, BG[0]);
        for (const u of c.axles) H.disc(u, wr * 0.95, wr + 0.8, '#121214');
        for (const u of c.axles) H.wheel(u, wr, '#8a8e96');
      } };
  };

  // Camiones (c = configuración de VR.drawTruck)
  O.truck = (c, pal) => {
    const [C, D, L] = pal, Ln = c.L, cl = c.cab, heavy = c.kind === 'dump' || c.kind === 'grain', ch = heavy ? 23 : 19, wr = heavy ? 4.1 : 3.4;
    const cy0 = c.kind === 'grain' ? cl + 4 : cl + 0.8, deck = heavy ? 8.5 : 7.5;
    const lh = { flat: deck + 2.4, tarp: 20, box: 23, dump: 21, grain: 27 }[c.kind], Hh = Math.max(ch, lh);
    const BL = '#2a4fa8', TARP = '#1e1e22';
    return { L: Ln, H: Hh, lift: ch, top: [[0, ch * 0.5], [2.2, ch * 0.56], [2.2 + c.ws, ch], [cl - 0.6, ch], [cl - 0.5, deck - 1], [cy0 - 0.05, deck - 1], [cy0, lh], [Ln - 0.4, lh], [Ln, lh]],
      ins: (y, v) => (v > wr * 2 + 0.3 ? 0.9 : 0), tin: () => 0.85,
      side(g, H) {
        const R = H.R, sill = 3;
        R(cl - 1, sill, Ln, deck - 0.6, '#232327'); R(cl + 2, sill + 1, Ln - 1, sill + 2, '#3a3a40');     // chasis
        if (heavy) R(cl + 1.5, sill - 0.4, cl + 7, deck - 2, '#8a8e96');                                    // tanque
        // carga
        if (c.kind === 'flat') { R(cy0, deck - 0.6, Ln, deck + 0.4, '#5a4a36'); R(cy0, deck + 0.4, Ln, lh, '#7a7e86'); for (let u = cy0 + 3; u < Ln; u += 5) R(u, deck + 0.4, u + 0.4, lh, '#55585e'); }
        else if (c.kind === 'tarp') { R(cy0, deck - 0.6, Ln, deck + 6, BL); for (let u = cy0; u < Ln; u += 3) R(u, deck + 0.6, u + 1.5, deck + 5.2, '#f2f0ea'); R(cy0, deck + 6, Ln, lh, TARP); R(cy0, lh - 1.2, Ln, lh, '#2e2e34'); for (let u = cy0 + 4; u < Ln; u += 6) R(u, deck + 6, u + 0.3, lh, '#34343a'); }
        else if (c.kind === 'box') { R(cy0, deck - 0.6, Ln, lh, '#dcdad4'); R(cy0, deck + 4, Ln, deck + 6.4, BL); R(cy0, lh - 1, Ln, lh, '#b9b6ae'); R(cy0, deck - 0.6, Ln, deck + 0.4, '#8d9198'); }
        else if (c.kind === 'dump') { R(cy0 - 3, deck - 0.4, Ln, lh, SH(C, 0.86)); for (let u = cy0 + 1; u < Ln; u += 5.5) R(u, deck, u + 0.9, lh - 0.8, SH(D, 0.85)); R(cy0 - 3, lh - 1.2, Ln, lh, SH(D, 0.8)); }
        else { R(cy0, deck - 0.4, Ln, lh, SH(C, 0.88)); for (let u = cy0 + 2; u < Ln; u += 6) R(u, deck + 0.4, u + 0.5, lh - 1, SH(D, 0.9)); R(cy0, deck - 0.4, Ln, deck + 1.6, '#3a3a40'); R(cy0, lh - 1.4, Ln, lh, SH(D, 0.8)); }
        // cabina
        R(0, sill, cl - 0.6, ch, SH(C, 0.86)); R(0, sill, cl - 0.6, sill + 2, '#2c2c32'); R(0, ch - 1.2, cl - 0.6, ch, SH(C, 0.7));
        const g0 = ch - 8.5, g1 = ch - 2; R(1.6, g0, cl - 4, g1, GL[0]); R(1.6, g0 + 3, cl - 4, g1, GL[1]); R(1.6, g1 - 0.6, cl - 4, g1 - 0.25, GL[2]);
        R(cl - 3.4, sill + 2.4, cl - 3.1, ch - 1.4, SH(D, 0.7)); R(0, g0 - 1.2, cl - 0.6, g0 - 0.7, L);
        R(0, g0 - 0.4, 1.6, ch - 1.6, GL[1]); R(0, 5.4, 1.3, 7.6, '#fff4c0'); R(Ln - 1.2, deck - 2.2, Ln, deck - 0.8, '#d8302a');
        for (const u of c.axles) H.disc(u, wr * 0.95, wr + 0.7, '#121214');
        for (const u of c.axles) H.wheel(u, wr, '#8a8e96');
      } };
  };

  // Camión de bomberos (VR.drawBomba, 21×58)
  O.bomba = (pal) => {
    const [C, D, L] = pal, Ln = 58, ch = 21, bh = 23, wr = 4;
    return { L: Ln, H: bh, lift: ch, top: [[0, ch * 0.5], [2.6, ch * 0.58], [5.6, ch], [14.4, ch], [14.6, bh], [Ln, bh]],
      ins: (y, v) => (v > wr * 2 + 0.3 ? 0.8 : 0), tin: () => 0.7,
      side(g, H) {
        const R = H.R, sill = 3;
        R(0, sill, Ln, bh, SH(C, 0.88)); R(0, sill, Ln, sill + 1.8, '#2c2c32'); R(0, bh - 1.2, Ln, bh, SH(D, 0.85));
        for (let u = 16; u < 56; u += 8) { R(u, 9, u + 6.6, bh - 3, '#c8ccd4'); for (let v = 10; v < bh - 3; v += 1.4) R(u, v, u + 6.6, v + 0.35, '#8d9198'); } // persianas
        R(15, 7.2, Ln - 1, 8, '#d8302a');
        R(1.6, ch - 9, 12, ch - 2.2, GL[0]); R(1.6, ch - 6, 12, ch - 2.2, GL[1]); R(6.6, sill + 2, 6.9, ch - 1, SH(D, 0.7));
        R(0, ch - 9, 1.6, ch - 2, GL[1]); R(0, 5.6, 1.3, 7.8, '#fff4c0'); R(Ln - 1.2, 5.6, Ln, 7.6, '#d8302a');
        for (const u of [9, 40, 47]) H.disc(u, wr * 0.95, wr + 0.7, '#121214');
        for (const u of [9, 40, 47]) H.wheel(u, wr, '#8a8e96');
      } };
  };

  // Karumbe (VR.drawKarumbe, 14×40; foto de Leandro del 13/11/2026): caballo, varas, pescante y coche de pasajeros con
  // caja de madera pintada, ventanas con parantes blancos y techo blanco con borde turquesa; ruedas chicas de goma.
  O.karumbe = (pal) => {
    const [C, D, L] = pal, HB = '#7a4a28', HD = '#55321a', WH = '#f4f2ec', Hh = 15.5, wu = 35, wr = 2.5, X = '#2c2420';
    const leg = (y) => (y > 5 && y < 6.2) || (y > 8 && y < 9.2) || (y > 12.6 && y < 13.8) || (y > 14.2 && y < 15.4);
    return { L: 42, H: Hh, lift: Hh,
      top: (y) => (y < 3.6 ? 12.4 : y < 5.8 ? 13.2 : y < 15.2 ? 11.8 : y < 16.8 ? 10 : y < 20.2 ? 5.7 : Hh),
      bot: (y) => (y < 16.8 ? 0 : y < 20.2 ? 4.6 : Math.abs(y - wu) <= wr ? 0 : 3),
      ins: (y, v) => (y < 16.8 && v < 5.4 ? 5 : y >= 20.2 && v < 3 ? -1.9 : 0),
      side(g, H) {
        const R = H.R;
        R(4.8, 5.4, 15.2, 11.4, HB); R(4.8, 5.4, 15.2, 6.7, HD); R(5.4, 10.6, 14.8, 11.4, '#9a6438');           // caballo: lomo, panza, brillo
        R(2.6, 8.2, 6, 13, HB); R(0, 8, 3.6, 11.4, HB); R(0, 8, 1.2, 9.4, '#3a2418'); R(2.6, 11.4, 3.3, 12.6, HD); R(2.1, 10.2, 2.6, 10.7, '#140c08'); // cuello, cabeza, hocico, oreja, ojo
        R(3.6, 10.6, 6.4, 13.2, '#2a1a10'); R(15, 4.2, 16.4, 10, '#2a1a10');                                    // crin y cola
        for (const [u, c] of [[5, HB], [8, HD], [12.6, HB], [14.2, HD]]) { R(u, 0.7, u + 1.2, 5.6, c); R(u, 0, u + 1.2, 0.7, '#1a1410'); } // patas
        R(4.4, 6.6, 5.6, 11.2, WH); R(8.4, 5.6, 9.2, 11.2, WH);                                                 // arnés blanco
        R(8, 5, 25.5, 5.7, '#3a2a1c');                                                                          // vara
        R(20.2, 3, 42, 4.6, '#2a2a30');                                                                         // chasis
        R(25.5, 4.6, 41.8, 9.6, SH(C, 0.9)); R(25.5, 4.6, 41.8, 5.3, D); for (const v of [6.4, 8.1]) R(25.5, v, 41.8, v + 0.22, SH(D, 0.85)); // caja de madera pintada
        R(25.5, 9.6, 41.8, 14.7, WH);                                                                           // pared blanca
        R(28, 10.4, 34.6, 14.1, X); R(36.2, 10.4, 40.8, 14.1, X);                                               // ventanas abiertas
        R(30, 10.4, 40.4, 11.6, SH(C, 0.8)); R(28, 14.1, 34.6, 14.5, C); R(36.2, 14.1, 40.8, 14.5, C);         // banco de pasajeros y marcos
        H.disc(26.9, 12.2, 0.85, '#2a2a30'); H.disc(26.9, 12.2, 0.55, WH);                                       // número
        R(20.2, 3, 25.5, 14.4, X);                                                                              // hueco del pescante, bajo el techo
        R(21.8, 4.4, 25.2, 5.6, C); R(21.8, 4.4, 25.2, 4.9, D);                                                 // asiento del carrero
        R(20.6, 5.6, 23.6, 6.9, '#3a4a6a'); R(20.4, 3.4, 21.7, 5.8, '#3a4a6a'); R(20.2, 3.1, 22, 3.7, '#2a2420'); // piernas y pie
        R(22.6, 6.9, 24.8, 11.2, '#6a7a8a'); R(22.8, 11.2, 24.4, 13, '#c98b5c'); R(22.6, 12.7, 24.7, 13.5, '#2a3a5a'); // torso, cabeza, gorra
        R(20.2, 3.4, 20.9, 14.6, WH);                                                                           // parante delantero
        R(20.2, 14.7, 42, 15.5, WH); R(20.2, 14.4, 42, 14.8, C);                                                // techo con borde de color
        H.wheel(wu, wr, '#c8ccd4');
      } };
  };

  // Motos: tabla por modelo. w: ruedas [y, radio, medio ancho]; segs: [y0, y1, desde, hasta, color, angostamiento]
  const MOTO = {
    cub: { W: 10, L: 21, w: [[2.7, 2.6, 1.1], [18.3, 2.65, 1.1]], segs: (C) => [[1.4, 4.2, 4.6, 5.6, C, 3.7], [4.3, 5.2, 7.7, 8.6, '#2a2a2e', 0], [5.3, 8.8, 2.6, 8.2, C, 1.2], [8.8, 10.7, 1.6, 3.6, '#3a3a40', 2.8], [9.4, 14, 1.4, 3.3, '#5c6068', 3], [10.7, 17.2, 3.1, 6.2, C, 1.8], [10.7, 17, 6.2, 7.1, '#1e1e22', 2.8], [17.2, 18.4, 5, 6, C, 3], [12.6, 19, 2.3, 3.4, CHR[1], 2.4]] },
    mini: { W: 10, L: 17, w: [[2.1, 2.1, 2.2], [14.9, 2.1, 2.2]], segs: (C) => [[1, 4, 4.4, 6.2, C, 3], [4, 4.9, 6.6, 7.4, '#2a2a2e', 0], [5, 9.2, 2.6, 6.6, C, 1.9], [6, 12, 1.2, 3, '#5c6068', 3], [8.8, 13.4, 3, 5.6, '#1e1e22', 2.1], [13.2, 14.2, 4.2, 5, C, 3]] },
    calle: { W: 10, L: 22, w: [[2.65, 2.65, 1], [19.35, 2.65, 1.05]], segs: (C) => [[1.6, 4.8, 5.4, 7.6, '#1e1e22', 3.3], [5, 5.8, 8, 8.9, '#2a2a2e', 0], [6, 11.4, 3.4, 7.9, C, 1.7], [6.4, 13.4, 1.2, 3.6, '#5c6068', 3], [11.2, 17.2, 3.6, 6.7, '#1e1e22', 2.9], [17, 19.4, 5.6, 6.4, CHR[2], 3], [9, 20.4, 2.2, 3.3, CHR[1], 2.2]] },
    pati: { W: 6, L: 14, w: [[1.5, 1.5, 1.05], [12.5, 1.5, 1.05]], segs: (C) => [[2, 2.8, 8.6, 9.4, '#2a2a2e', 0], [2.6, 3.7, 1, 8.6, C, 2.4], [4, 12, 1, 2, '#3c3c44', 1]] },
    carga: { W: 18, L: 34, w: [[2.6, 2.6, 1.1], [27.3, 3.3, 9.2]], segs: (C) => [[4.9, 5.7, 7.8, 8.7, '#2a2a2e', 3.4], [5.8, 9.4, 3, 7.4, C, 5.8], [6.4, 13, 1.4, 3.4, '#5c6068', 7.4], [9, 13.4, 3.2, 6.6, '#1e1e22', 6], [13, 14, 3.2, 9.4, CHR[1], 3.4], [14, 34, 3.4, 9, C, 0.9], [14, 34, 8.2, 9, VR.shadeHex(C, 0.7), 0.9]] },
  };
  O.moto = (m, pal) => {
    const M = MOTO[m], C = pal[0], segs = M.segs(C), half = M.W / 2;
    const wAt = (y) => M.w.find(([wy, r]) => Math.abs(y - wy) <= r);
    let Hh = 0; for (const s of segs) Hh = Math.max(Hh, s[3]);
    return { L: M.L, H: Hh, lift: Hh,
      top(y) { let h = 0; const w = wAt(y); if (w) h = w[1] + Math.sqrt(Math.max(0, w[1] * w[1] - (y - w[0]) * (y - w[0]))); for (const s of segs) if (y >= s[0] && y < s[1]) h = Math.max(h, s[3]); return h; },
      bot(y) { if (wAt(y)) return 0; let b = 99; for (const s of segs) if (y >= s[0] && y < s[1]) b = Math.min(b, s[2]); return b === 99 ? 0 : b; },
      ins(y, v) { const w = wAt(y); let best = null; for (const s of segs) if (y >= s[0] && y < s[1] && v >= s[2] - 0.2 && v <= s[3] + 0.2) best = best === null ? s[5] : Math.min(best, s[5]); if (best !== null) return best; return w ? half - w[2] : half - 0.6; },
      side(g, H) {
        for (const [wy, r] of M.w) H.wheel(wy, r, '#8a8e96');
        for (const [y0, y1, v0, v1, col] of segs) { H.R(y0, v0, y1, v1, VR.shadeHex(col, 0.86)); H.R(y0, v1 - Math.min(0.5, (v1 - v0) * 0.3), y1, v1, col); }
      } };
  };

  // Conductor (y pasajero) de moto: tres capas del mismo dibujo (piernas, torso con brazos, cabeza), cada una a su altura
  O.parts = (names, geo, mk) => {
    const c = mk(null);
    if (O.on) { const st = !!geo.stand, z = st ? [[1.6, 5.6], [8.6, 12], [12, 14.4]] : [[4.4, 6.4], [8.4, 11], [11, 13.4]]; c.prof = { L: 24, H: z[2][1], lift: z[2][1], layers: names.map((n, i) => ({ img: mk(n), z0: z[i][0], z1: z[i][1] })) }; }
    return c;
  };
})();
