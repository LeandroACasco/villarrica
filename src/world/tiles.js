// Tiles generados por código, con 4 variantes cada uno para que el piso no se vea repetido.
'use strict';
VR.T = { GRASS: 0, ROAD: 1, SIDEWALK: 2, BUILDING: 3, PAVING: 4, TREE: 5, MONUMENT: 6, DIRT: 7, WATER: 8, STONE: 9, DIRTROAD: 10, CHECKER: 11, PLAZADIRT: 12, LAGUNA: 13, SENDERO: 14, LADRILLO: 15 }; // 12: tierra de plaza bajo los árboles, con hojas secas (Street View)
// calzadas: asfalto, empedrado y calle de tierra
VR.ROADLIKE = new Uint8Array(16); VR.ROADLIKE[VR.T.ROAD] = 1; VR.ROADLIKE[VR.T.STONE] = 1; VR.ROADLIKE[VR.T.DIRTROAD] = 1;
VR.SOLID = new Uint8Array(16); VR.SOLID[VR.T.BUILDING] = 1; VR.SOLID[VR.T.TREE] = 1; VR.SOLID[VR.T.MONUMENT] = 1; VR.SOLID[VR.T.WATER] = 1; VR.SOLID[VR.T.LAGUNA] = 1;
// tile que se dibuja debajo de cada tipo
VR.GROUND_OF = { [VR.T.TREE]: VR.T.GRASS, [VR.T.BUILDING]: VR.T.SIDEWALK, [VR.T.MONUMENT]: VR.T.PAVING };

// Tileset con detalle (05/11/2026, resolución ×2): cada baldosa del mundo (2 m) se dibuja con Q = 16·R píxeles
// de lado (32 con R = 2: 16 px por metro). Se arma la primera vez que se usa, a la resolución de la pantalla.
// Todo es ruido y formas por código (sin imágenes): pasto con matas y briznas, asfalto con grano, baldosas de
// vereda con junta y bisel, empedrado de piedras irregulares con luz y sombra, tierra colorada con terrones.
// Los patrones se repiten cada 2 m sin costuras (el ruido y las piedras "dan la vuelta" en el borde).
VR.tileset = {
  VARS: 4, TYPES: 16, _c: null, _r: 0,
  build(R) {
    const S = VR.TILE, Q = Math.round(S * R), VARS = this.VARS, TYPES = this.TYPES;
    const c = VR.canvas(Q * VARS, Q * TYPES), ctx = c.getContext('2d');
    const img = ctx.createImageData(c.width, c.height), d = img.data;
    const H = VR.hash, u = 1 / R; // u: tamaño de un píxel en unidades del mundo
    const wrap = (a) => ((a % 16) + 16) % 16;
    // ruido suave que se repite cada 16 unidades (sin costura), con período p de la grilla
    const vnoise = (x, y, p, s) => {
      const n = 16 / p, gx = x / p, gy = y / p, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
      const g = (i, j) => H(((i % n) + n) % n, ((j % n) + n) % n, s);
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      return (g(x0, y0) * (1 - sx) + g(x0 + 1, y0) * sx) * (1 - sy) + (g(x0, y0 + 1) * (1 - sx) + g(x0 + 1, y0 + 1) * sx) * sy;
    };
    // piedras: celdas de Voronoi con centros corridos, que dan la vuelta en el borde
    const stones = (x, y, cs, jit, s) => {
      const n = 16 / cs, cx = Math.floor(x / cs), cy = Math.floor(y / cs);
      let d1 = 1e9, d2 = 1e9, best = null;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const ix = cx + i, iy = cy + j, kx = ((ix % n) + n) % n, ky = ((iy % n) + n) % n;
        const px = (ix + 0.5) * cs + (H(kx, ky, s) - 0.5) * jit, py = (iy + 0.5) * cs + (H(kx, ky, s + 9) - 0.5) * jit;
        const dd = Math.hypot(x - px, y - py);
        if (dd < d1) { d2 = d1; d1 = dd; best = [px, py, kx, ky]; } else if (dd < d2) d2 = dd;
      }
      return { edge: d2 - d1, dx: x - best[0], dy: y - best[1], id: H(best[2], best[3], s + 3) };
    };
    const put = (X, Y, r, g, b) => { const i = (Y * c.width + X) * 4; d[i] = Math.max(0, Math.min(255, r)); d[i + 1] = Math.max(0, Math.min(255, g)); d[i + 2] = Math.max(0, Math.min(255, b)); d[i + 3] = 255; };
    // baldosas cuadradas de lado b (unidades) con junta, bisel claro arriba-izquierda y sombra abajo-derecha
    const tile = (x, y, b, ox = 0) => { const xx = wrap(x + ox), lx = xx % b, ly = y % b; return { lx, ly, i: Math.floor(xx / b), j: Math.floor(y / b), joint: lx < u || ly < u, hi: lx < 2 * u || ly < 2 * u, lo: lx > b - 2 * u || ly > b - 2 * u }; };
    for (let t = 0; t < TYPES; t++) for (let v = 0; v < VARS; v++) for (let py = 0; py < Q; py++) for (let px = 0; px < Q; px++) {
      const x = px * u, y = py * u, X = v * Q + px, Y = t * Q + py;
      const h = H(px + v * 97, py, t * 7 + 1), h2 = H(px + v * 97, py, t * 13 + 5);
      let r, g, b;
      switch (t) {
        case VR.T.GRASS: { // matas de distinto verde, briznas, alguna florcita
          const m = vnoise(x, y, 4, 11 + v), m2 = vnoise(x, y, 2, 31 + v);
          r = 84 + m * 22; g = 146 + m * 26; b = 52 + m * 10;
          if (m2 < 0.3) { r -= 12; g -= 14; b -= 6; }
          if (h < 0.16) { r -= 22; g -= 26; b -= 12; } else if (h > 0.9) { r += 18; g += 20; b += 8; }
          if (H(px + v * 97, py - 1, t * 7 + 1) < 0.1 && h > 0.5) { r -= 16; g -= 18; b -= 8; } // brizna (sombra debajo)
          if (h2 > 0.993) { const f = H(px, py, 70 + v) < 0.5; r = f ? 236 : 246; g = f ? 214 : 240; b = f ? 80 : 228; }
          break;
        }
        case VR.T.ROAD: { // asfalto: grano fino, piedritas claras, manchas de aceite
          const m = vnoise(x, y, 8, 21 + v);
          const k = (h - 0.5) * 14; r = 72 + k + m * 8; g = 72 + k + m * 8; b = 80 + k + m * 8;
          if (h2 > 0.975) { r += 26; g += 26; b += 24; } else if (h2 < 0.012) { r -= 18; g -= 18; b -= 18; }
          break;
        }
        case VR.T.SIDEWALK: { // baldosas de 50 cm con junta y bisel; cada una con su tono; algunas rajadas o manchadas
          const T = tile(x, y, 4), id = H(T.i + v * 5, T.j, 41), k = (id - 0.5) * 12 + (h - 0.5) * 6;
          r = 192 + k; g = 184 + k; b = 168 + k;
          if (v === 1 && id > 0.75) { r -= 8; g -= 6; b -= 2; } // baldosa más vieja
          if (T.joint) { r = 156; g = 150; b = 138; } else if (T.hi) { r += 8; g += 8; b += 8; } else if (T.lo) { r -= 8; g -= 8; b -= 8; }
          if (v === 3 && id > 0.8 && !T.joint && Math.abs(T.lx - T.ly) < u * 0.8) { r -= 34; g -= 34; b -= 32; } // rajadura
          if (v === 2 && id < 0.15 && !T.joint && Math.hypot(T.lx - 2, T.ly - 2) < 1.2) { r -= 14; g -= 14; b -= 10; } // mancha
          break;
        }
        case VR.T.PAVING: { // piedra laja irregular (Street View de la plaza, 05/11/2026): rosada y parda, juntas de tierra
          const st = stones(x, y, 4, 2.6, 200 + v * 3), k = (st.id - 0.5) * 26 + (h - 0.5) * 8, tint = H((st.id * 97) | 0, v, 211);
          r = 184 + k + (tint < 0.3 ? 8 : 0); g = 146 + k - (tint < 0.3 ? 6 : 0); b = 116 + k * 0.9 + (tint > 0.8 ? 10 : 0);
          const sh = st.dx + st.dy;
          if (st.edge < 0.32) { r = 122; g = 98; b = 80; }
          else if (st.edge < 0.62 && sh > 0) { r -= 14; g -= 13; b -= 11; }
          else if (st.edge < 0.8 && sh < 0) { r += 12; g += 11; b += 9; }
          if (h2 > 0.992) { r -= 26; g -= 24; b -= 20; } // manchita
          break;
        }
        case VR.T.DIRT: { // tierra colorada con terrones y piedritas
          const m = vnoise(x, y, 4, 61 + v), st = stones(x, y, 2, 1.6, 90 + v);
          const k = (h - 0.5) * 16 + (m - 0.5) * 20; r = 168 + k; g = 92 + k * 0.8; b = 58 + k * 0.6;
          if (st.edge < 0.35 && st.id > 0.55) { r -= 22; g -= 16; b -= 10; } // grietas entre terrones
          if (h2 > 0.985) { r += 40; g += 36; b += 30; } // piedrita
          break;
        }
        case VR.T.WATER: { // laguna: azul con ondas claras
          const m = vnoise(x, y, 8, 81 + v), k = (h - 0.5) * 6 + (m - 0.5) * 14;
          r = 58 + k; g = 114 + k; b = 182 + k;
          const w = Math.sin((x * 0.9 + vnoise(x, y, 4, 85) * 6 + v * 3) * 1.6) + Math.sin(y * 1.9 + m * 4);
          if (w > 1.55 && Math.floor(y * 2) % 3 === 0) { r += 54; g += 58; b += 44; }
          break;
        }
        case VR.T.STONE: { // empedrado: piedras irregulares (~25 cm) con luz arriba a la izquierda y juntas de tierra
          const st = stones(x, y, 2, 1.1, 120 + v * 3), k = (st.id - 0.5) * 30 + (h - 0.5) * 8;
          r = 128 + k; g = 120 + k; b = 106 + k;
          const sh = (st.dx + st.dy); // − arriba-izquierda (luz), + abajo-derecha (sombra)
          if (st.edge < 0.32) { r = 74; g = 66; b = 56; }
          else if (st.edge < 0.6 && sh > 0) { r -= 22; g -= 22; b -= 20; }
          else if (st.edge < 0.75 && sh < 0) { r += 20; g += 20; b += 18; }
          break;
        }
        case VR.T.DIRTROAD: { // calle de tierra colorada pisada, con piedritas y marcas de ruedas
          const m = vnoise(x, y, 8, 141 + v), k = (h - 0.5) * 10 + (m - 0.5) * 16; r = 204 + k; g = 128 + k * 0.8; b = 84 + k * 0.6;
          if (h2 > 0.95) { r -= 34; g -= 26; b -= 18; } else if (h2 < 0.04) { r += 22; g += 18; b += 14; }
          if ((Math.floor(y * 2) + v * 3) % 9 === 0 && h > 0.55) { r -= 14; g -= 10; b -= 6; }
          break;
        }
        case VR.T.CHECKER: { // baldosas en damero gris y blanco (veredas de la Municipalidad)
          const T = tile(x, y, 4), w = ((T.i + T.j) & 1) === 0, k = (h - 0.5) * 8;
          r = (w ? 224 : 148) + k; g = (w ? 222 : 148) + k; b = (w ? 216 : 154) + k;
          if (T.joint) { r -= 40; g -= 40; b -= 38; } else if (T.hi) { r += 10; g += 10; b += 10; } else if (T.lo) { r -= 12; g -= 12; b -= 12; }
          break;
        }
        case VR.T.PLAZADIRT: { // tierra gris parda pisada, sombra de los árboles, hojas secas y matitas de pasto
          const m = vnoise(x, y, 4, 161 + v), m2 = vnoise(x, y, 8, 171 + v);
          const k = (h - 0.5) * 10 + (m - 0.5) * 18; r = 142 + k; g = 116 + k * 0.9; b = 88 + k * 0.8;
          if (m2 > 0.72) { r -= 14; g -= 12; b -= 8; } // más pisada
          if (h2 > 0.965) { const f = H(px, py, 180 + v); r = f < 0.5 ? 168 : 112; g = f < 0.5 ? 124 : 84; b = f < 0.5 ? 60 : 44; } // hoja seca
          else if (h2 < 0.03 && m < 0.45) { r = 92; g = 132; b = 58; } // matita de pasto
          break;
        }
        case VR.T.LAGUNA: { // laguna Ykua Pytã (10/11/2026): agua verde oliva y turbia, con ondas claras y algo de lama
          const m = vnoise(x, y, 8, 91 + v), m2 = vnoise(x, y, 4, 95 + v), k = (h - 0.5) * 5 + (m - 0.5) * 12;
          r = 74 + k; g = 98 + k; b = 62 + k * 0.8;
          if (m2 > 0.66) { r += 6; g += 10; b -= 4; } // lama
          const w = Math.sin((x * 0.9 + vnoise(x, y, 4, 99) * 6 + v * 3) * 1.6) + Math.sin(y * 1.9 + m * 4);
          if (w > 1.55 && Math.floor(y * 2) % 3 === 0) { r += 40; g += 44; b += 30; }
          break;
        }
        case VR.T.SENDERO: { // tierra clara apisonada, con granos y piedritas blancas
          const m = vnoise(x, y, 4, 191 + v), m2 = vnoise(x, y, 8, 197 + v), k = (h - 0.5) * 12 + (m - 0.5) * 16;
          r = 206 + k; g = 186 + k * 0.95; b = 152 + k * 0.8;
          if (m2 > 0.7) { r -= 12; g -= 12; b -= 10; } // más pisada
          if (h2 > 0.975) { r += 30; g += 30; b += 28; } else if (h2 < 0.02) { r -= 36; g -= 34; b -= 30; }
          break;
        }
        case VR.T.LADRILLO: { // ladrillos de 25 × 12 cm en hiladas corridas, con junta clara
          const rowH = 1, ri = Math.floor(y / rowH), off = (ri % 2) * 1, bw = 2, xx = wrap(x + off), lx = xx % bw, ly = y % rowH;
          const id = H(Math.floor(xx / bw) + ri * 7, ri, 251 + v), k = (id - 0.5) * 26 + (h - 0.5) * 8;
          r = 170 + k; g = 86 + k * 0.7; b = 62 + k * 0.5;
          if (lx < u * 0.9 || ly < u * 0.9) { r = 204; g = 188; b = 168; }  // junta
          else if (ly > rowH - u * 1.1) { r -= 18; g -= 12; b -= 10; }       // sombra del ladrillo
          if (h2 > 0.985) { r -= 30; g -= 20; b -= 16; }
          break;
        }
        default: r = 255; g = 0; b = 255;
      }
      put(X, Y, Math.round(r), Math.round(g), Math.round(b));
    }
    ctx.putImageData(img, 0, 0);
    this._c = c; this._r = R; this.Q = Q;
  },
  get canvas() { if (this._r !== VR.RES) this.build(VR.RES); return this._c; },
  draw(dst, type, v, x, y) {
    if (this._r !== VR.RES) this.build(VR.RES);
    const Q = this.Q; dst.drawImage(this._c, (v % this.VARS) * Q, type * Q, Q, Q, x, y, VR.TILE, VR.TILE);
  },
};

// Copas de árboles (05/11/2026, resolución ×2): se arman con racimos de hojas (celdas de Voronoi), cada racimo con
// luz arriba a la izquierda y sombra abajo a la derecha, y la copa entera más oscura del lado de la sombra. El borde
// sale de los racimos de afuera, así queda irregular. Las palmeras tienen hojas finas con nervadura y folíolos.
VR.canopy = (() => {
  const cache = new Map();
  const PAL = [
    [[40, 90, 36], [60, 124, 46], [88, 156, 60], [128, 190, 84]],
    [[34, 84, 46], [52, 116, 58], [80, 148, 76], [118, 182, 100]],
    [[62, 92, 32], [92, 128, 42], [126, 162, 58], [168, 196, 86]], // lapacho sin flor / más amarillento
    [[136, 44, 110], [184, 72, 148], [222, 116, 186], [246, 170, 220]], // lapacho rosado
    [[60, 110, 40], [80, 140, 50], [110, 170, 60], [140, 196, 80]], // 4 = palmera (se dibuja aparte)
    [[166, 120, 14], [214, 172, 28], [244, 212, 70], [255, 240, 150]], // 5 = tajy amarillo (idea de Deisy)
  ];
  const H = VR.hash;
  return (r, pal) => {
    const R = VR.RES || 1, key = r + ':' + pal + ':' + R;
    let c = cache.get(key);
    if (c) return c;
    const S = r * 2 + 3, SR = Math.round(S * R);
    c = VR.canvas(SR, SR); c.lw = S;
    const x = c.getContext('2d');
    if (pal === 4) { // palmera: hojas largas en estrella, con nervadura y folíolos
      x.scale(R, R);
      const cx = r + 1.5, cy = r + 1.5, seed = r * 13;
      for (let k = 0; k < 10; k++) {
        const a = k / 10 * Math.PI * 2 + 0.3 + (H(k, seed, 3) - 0.5) * 0.3, len = r * (0.82 + 0.18 * H(k, r, 7));
        for (let t = 0.5; t <= len; t += 0.5) {
          const droop = (t / len) ** 2 * 3, px = cx + Math.cos(a) * t, py = cy + Math.sin(a) * t + droop;
          const w = Math.max(0.6, 2.4 * Math.sin(Math.PI * t / len)), nx = -Math.sin(a), ny = Math.cos(a);
          // folíolos a los dos lados (más oscuros abajo a la derecha)
          for (const sd of [-1, 1]) {
            const lx = px + nx * sd * w, ly = py + ny * sd * w + 0.3;
            x.fillStyle = (nx * sd + ny * sd) > 0 ? '#3a6e26' : '#5c9a38';
            x.fillRect(lx - 0.5, ly - 0.5, 1, 1);
            x.fillStyle = (nx * sd + ny * sd) > 0 ? '#2f5c20' : '#4c8a30'; x.fillRect((px + lx) / 2 - 0.5, (py + ly) / 2 - 0.5, 1, 1);
          }
          x.fillStyle = t < len * 0.4 ? '#7aa84a' : '#8cbc58'; x.fillRect(px - 0.25, py - 0.25, 0.5, 0.5); // nervadura
        }
      }
      x.fillStyle = '#6e4a24'; x.fillRect(cx - 1.5, cy - 1.5, 3, 3); x.fillStyle = '#8e6a3a'; x.fillRect(cx - 1.5, cy - 1.5, 1.5, 1.5);
      c = VR.gfx.crisp(c); c.lw = S; VR.gfx.outline(c, '#1d2a14'); cache.set(key, c); return c;
    }
    const P = PAL[pal % PAL.length], img = x.createImageData(SR, SR), d = img.data, cs = 2.6, seed = r * 31 + pal * 7;
    const cell = (ux, uy) => { // racimo más cercano
      const gx = Math.floor(ux / cs), gy = Math.floor(uy / cs); let d1 = 1e9, d2 = 1e9, b = null;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const ix = gx + i, iy = gy + j, px = (ix + 0.5) * cs + (H(ix, iy, seed) - 0.5) * cs * 0.9, py = (iy + 0.5) * cs + (H(ix, iy, seed + 5) - 0.5) * cs * 0.9;
        const dd = Math.hypot(ux - px, uy - py); if (dd < d1) { d2 = d1; d1 = dd; b = [px, py, ix, iy]; } else if (dd < d2) d2 = dd;
      }
      return { d1, d2, cx: b[0], cy: b[1], id: H(b[2], b[3], seed + 9) };
    };
    for (let py = 0; py < SR; py++) for (let px = 0; px < SR; px++) {
      const ux = (px + 0.5) / R - (r + 1.5), uy = (py + 0.5) / R - (r + 1.5);
      const cl = cell(ux, uy), ccx = cl.cx, ccy = cl.cy;
      const rr = Math.hypot(ccx, ccy), q = Math.hypot(ux, uy);
      // el racimo entra en la copa si su centro está adentro; su borde redondeado define el contorno
      if (rr > r * (0.78 + 0.12 * cl.id) || cl.d1 > cs * 0.72 || q > r + 0.6) continue;
      const big = (ccx + ccy) / (r * 1.4), loc = ((ux - ccx) + (uy - ccy)) / cs; // sombra general y dentro del racimo
      let lv = 1.6 - big * 1.1 - loc * 1.3 + (cl.id - 0.5) * 0.6;
      if (cl.d2 - cl.d1 < 0.35 / R + 0.15) lv -= 0.9; // hueco entre racimos
      const k = Math.max(0, Math.min(3, Math.round(lv)));
      const col = P[k], i = (py * SR + px) * 4;
      let f = (H(px, py, seed + 2) - 0.5) * 10;
      if ((pal === 3 || pal === 5) && H(px, py, seed + 4) > 0.93 && k >= 2) f += 30; // flores sueltas
      d[i] = Math.max(0, Math.min(255, col[0] + f)); d[i + 1] = Math.max(0, Math.min(255, col[1] + f)); d[i + 2] = Math.max(0, Math.min(255, col[2] + f)); d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    VR.gfx.outline(c, '#1d2a14');
    cache.set(key, c);
    return c;
  };
})();
