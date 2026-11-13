// Estaciones de servicio (13/11/2026, pedido de Leandro con fotos de Street View de las estaciones reales de Villarrica).
// Todo original: solo se toman las proporciones y los colores (no hay logos, marcas ni nombres reales). Las posiciones y
// el pavimento salen de tools/osm_to_map.py (decal `estacion`: x, y, w, h en baldosas, o = lado de la calle 's'|'n'|'e'|'w',
// st = estilo 0-6, name). Cada una tiene: techo grande y plano con borde de colores (se vuelve translúcido cuando estás
// abajo), cuatro columnas, dos islas de seis baldosas con dos surtidores cada una, tótem de precios en la esquina y una
// minitienda. El piso va en VR.decor (se pinta una vez); lo que tiene altura, en VR.decorTop (se ordena con la gente).
// `VR.Estaciones.lay(d)` da las posiciones en píxeles (las usa también el tablero para cargar nafta).
'use strict';
(() => {
  const S = VR.TILE, H = VR.hash;
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const poly = (g, c, pts) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  const HC = 20;                       // altura del techo (px sobre el piso)
  // colores por estilo: fas = borde del techo, e1/e2 = franjas, col = columnas, kw = pared de la minitienda, kr = techo, aw = toldo,
  // pb = cuerpo de surtidor, pa = acento, ta/tb = tótem (panel y cabecera), curva = puntas redondeadas
  const ST = [
    { n: 'tapé', fas: '#f4f1ea', e1: '#2f9e8f', e2: '#d8322b', col: '#e9e6df', kw: '#ece7dc', kr: '#b9b4aa', aw: '#2f9e8f', pb: '#f4f1ea', pa: '#d8322b', ta: '#f4f1ea', tb: '#d8322b' },
    { n: 'aravo', fas: '#d6ecd0', e1: '#5aa845', e2: '#f08a24', col: '#f1f3ee', kw: '#f4f4ee', kr: '#c9cec4', aw: '#8fcf7a', pb: '#f1f3ee', pa: '#5aa845', ta: '#f6f8f2', tb: '#5aa845', curva: true },
    { n: 'pytã', fas: '#d9532c', e1: '#f4f1ea', e2: '#a8341a', col: '#efe9e0', kw: '#e59a80', kr: '#b97a64', aw: '#d9532c', pb: '#f0e8de', pa: '#d9532c', ta: '#f4efe6', tb: '#d9532c' },
    { n: 'yvyra', fas: '#f4f1ea', e1: '#1f8f4a', e2: '#f2c230', col: '#ecebe4', kw: '#2f5f9f', kr: '#9aa3ae', aw: '#1f8f4a', pb: '#f2efe6', pa: '#1f8f4a', ta: '#f2efe6', tb: '#1f8f4a', diag: true },
    { n: 'ypaĩ', fas: '#f4f1ea', e1: '#e07a5a', e2: '#c85a3c', col: '#ece7de', kw: '#e8dcc4', kr: '#bcae98', aw: '#e07a5a', pb: '#f2ece2', pa: '#e07a5a', ta: '#f6efe4', tb: '#e07a5a' },
    { n: 'hovy', fas: '#2057a8', e1: '#f4f1ea', e2: '#163f7e', col: '#e6e9ee', kw: '#eef1f5', kr: '#aeb6c2', aw: '#2057a8', pb: '#eef1f5', pa: '#2057a8', ta: '#f4f6fa', tb: '#2057a8' },
    { n: 'tuja', fas: '#f4f1ea', e1: '#1e2f5a', e2: '#1e2f5a', col: '#dcd9d2', kw: '#e9e6e0', kr: '#a9a8a2', aw: '#1e2f5a', pb: '#ece9e2', pa: '#1e2f5a', ta: '#f4f1ea', tb: '#1e2f5a', vidrio: true },
  ];
  const lay = (d) => {
    if (d._l) return d._l;
    const o = d.o, X = d.x * S, Y = d.y * S; let L;
    if (o === 's' || o === 'n') {   // canopy 10×8 al este, minitienda 5×4 al oeste, tótem en la esquina de la calle
      const cy0 = o === 's' ? 3 : 1;
      L = { canopy: [X + 5 * S, Y + cy0 * S, 10 * S, 8 * S], kiosk: [X, Y + (cy0 + 2) * S, 5 * S, 4 * S],
        isl: [[X + 7 * S, Y + (cy0 + 2) * S, 6 * S, S], [X + 7 * S, Y + (cy0 + 5) * S, 6 * S, S]], totem: [X + 15.4 * S, o === 's' ? Y + 11.3 * S : Y + 1.3 * S] };
    } else {                        // canopy 8×10 abajo, minitienda 6×3 atrás (norte)
      const cx0 = o === 'e' ? 3 : 1;
      L = { canopy: [X + cx0 * S, Y + 4 * S, 8 * S, 10 * S], kiosk: [X + 3 * S, Y, 6 * S, 3 * S],
        isl: [[X + (cx0 + 2) * S, Y + 6 * S, S, 6 * S], [X + (cx0 + 5) * S, Y + 6 * S, S, 6 * S]], totem: [o === 'e' ? X + 11.4 * S : X + 0.6 * S, Y + 15.2 * S] };
    }
    // surtidores: dos por isla (a un tercio y a dos tercios); columnas en las puntas de las islas
    L.pumps = []; L.cols = [];
    for (const [ix, iy, iw, ih] of L.isl) {
      const h = iw >= ih;
      L.pumps.push(h ? [ix + iw * 0.33, iy + ih / 2] : [ix + iw / 2, iy + ih * 0.33], h ? [ix + iw * 0.67, iy + ih / 2] : [ix + iw / 2, iy + ih * 0.67]);
      L.cols.push(h ? [ix + 3, iy + ih / 2] : [ix + iw / 2, iy + 3], h ? [ix + iw - 3, iy + ih / 2] : [ix + iw / 2, iy + ih - 3]);
    }
    return (d._l = L);
  };
  VR.Estaciones = { lay, ST, HC, list: (w) => (w.decals || []).filter((d) => d.kind === 'estacion') };

  // ---------------------------------------------------------------- piso
  VR.decor.estacion = (g, d) => {
    const L = lay(d), st = ST[d.st % ST.length], [cx, cy, cw, ch] = L.canopy;
    // losa de hormigón bajo el techo, con juntas y manchas de aceite
    R(g, '#8c8a84', cx - 2, cy - 2, cw + 4, ch + 4); R(g, '#a5a39b', cx, cy, cw, ch);
    for (let x = cx; x < cx + cw; x += S * 2) R(g, 'rgba(0,0,0,.16)', x, cy, 1, ch);
    for (let y = cy; y < cy + ch; y += S * 2) R(g, 'rgba(0,0,0,.16)', cx, y, cw, 1);
    for (let i = 0; i < 26; i++) { const x = cx + H(i, d.x, 811) * cw, y = cy + H(i, d.y, 813) * ch, r = 1 + H(i, d.x, 815) * 3; R(g, 'rgba(30,26,24,' + (0.1 + H(i, d.y, 817) * 0.16) + ')', x, y, r * 1.6, r); }
    // islas: cordón claro con puntas amarillas y base de surtidores
    for (const [ix, iy, iw, ih] of L.isl) {
      R(g, '#55534e', ix - 1, iy - 1, iw + 2, ih + 2); R(g, '#cfcbc0', ix, iy, iw, ih); R(g, '#e5e1d6', ix, iy, iw, 2);
      for (const [px, py, w, h] of iw >= ih ? [[ix, iy, 3, ih], [ix + iw - 3, iy, 3, ih]] : [[ix, iy, iw, 3], [ix, iy + ih - 3, iw, 3]]) { R(g, '#e8c53a', px, py, w, h); for (let k = 0; k < Math.max(w, h); k += 4) R(g, '#1c1c1e', w >= h ? px + k : px, w >= h ? py : py + k, w >= h ? 2 : w, w >= h ? h : 2); }
    }
    // línea amarilla del borde del predio y de las bocas (queda al lado de la calle) y flechas de entrada
    const X = d.x * S, Y = d.y * S, LW = d.w * S, LH = d.h * S, o = d.o;
    const edge = { s: [X + 2 * S, Y + LH - 1, LW - 4 * S, 2], n: [X + 2 * S, Y - 1, LW - 4 * S, 2], e: [X + LW - 1, Y + 2 * S, 2, LH - 4 * S], w: [X - 1, Y + 2 * S, 2, LH - 4 * S] }[o];
    R(g, 'rgba(240,206,70,.55)', ...edge);
    // piso de la minitienda (vereda de baldosa) y sombra del techo hacia el sudeste
    const [kx, ky, kw, kh] = L.kiosk; R(g, '#b9b2a2', kx - 4, ky - 2, kw + 8, kh + 8);
    R(g, 'rgba(0,0,0,.14)', cx + 8, cy + ch, cw, 10); R(g, 'rgba(0,0,0,.14)', cx + cw, cy + 8, 9, ch + 2);
    // rayas amarillas y blancas del cordón
    if (o === 's' || o === 'n') for (let x = X + 3 * S; x < X + 13 * S; x += 12) R(g, 'rgba(235,235,225,.5)', x, o === 's' ? Y + LH - 8 : Y + 6, 6, 1);
  };

  // ---------------------------------------------------------------- partes con altura
  const pump = (g, st, x, y) => { // surtidor visto de frente (sur): cuerpo, pantalla, manguera y sombra
    R(g, 'rgba(0,0,0,.22)', x - 3, y - 1, 9, 3);
    R(g, '#2a2a2e', x - 4, y - 15, 8, 16); R(g, st.pb, x - 3.4, y - 14.6, 6.8, 15.2); R(g, st.pa, x - 3.4, y - 14.6, 6.8, 3);
    R(g, '#1f3a2a', x - 2.4, y - 10.4, 4.8, 3); R(g, '#8fe8a8', x - 2, y - 10, 4, 1.4); R(g, 'rgba(0,0,0,.18)', x + 1.4, y - 14.6, 2, 15.2);
    R(g, '#2c2c30', x + 4, y - 9, 1.2, 8); R(g, '#c43030', x + 3.6, y - 3, 2, 2.4);           // manguera con la pistola
  };
  VR.decorTop.estacion = (d) => {
    const L = lay(d), st = ST[d.st % ST.length], out = [];
    const [cx, cy, cw, ch] = L.canopy;
    // surtidores y columnas, ordenados por su base
    for (const [px, py] of L.pumps) out.push({ sy: py + 6, draw(g) { pump(g, st, px, py + 6); } });
    for (const [px, py] of L.cols) out.push({ sy: py + 6, draw(g) {
      R(g, 'rgba(0,0,0,.22)', px - 3, py + 5, 8, 3); R(g, '#6a6862', px - 3.2, py + 6 - HC - 2, 6.4, HC + 2); R(g, st.col, px - 2.6, py + 6 - HC - 2, 5.2, HC + 2); R(g, '#fff', px - 2.6, py + 6 - HC - 2, 1.2, HC + 2); R(g, 'rgba(0,0,0,.18)', px + 1.2, py + 6 - HC - 2, 1.4, HC + 2);
      R(g, st.e1, px - 2.6, py + 6 - 5, 5.2, 2);
    } });
    // techo (translúcido si el jugador o su vehículo está abajo)
    out.push({ sy: cy + ch + 1, draw(g) {
      const rv = VR.reveal, under = rv && rv.x > cx - 6 && rv.x < cx + cw + 6 && rv.y > cy - 4 && rv.y < cy + ch + 14;
      const a0 = d._a === undefined ? 0.58 : d._a; d._a = a0 + ((under ? 0.22 : 0.72) - a0) * 0.18;
      const y0 = cy - HC, y1 = cy + ch - HC, fh = 7;
      g.save();
      g.globalAlpha = d._a; R(g, st.curva ? 'rgba(0,0,0,0)' : '#e4e3dd', cx, y0, cw, ch);                  // cara superior
      if (st.curva) { g.fillStyle = '#e4e3dd'; g.beginPath(); if (g.roundRect) g.roundRect(cx, y0, cw, ch, 12); else g.rect(cx, y0, cw, ch); g.fill(); }
      for (let x = cx + 8; x < cx + cw; x += 14) R(g, 'rgba(0,0,0,.07)', x, y0, 1, ch);                    // juntas de la chapa
      for (let y = y0 + 10; y < y1; y += 18) R(g, 'rgba(255,255,255,.22)', cx, y, cw, 1);
      g.globalAlpha = 1;
      // borde sur: franja de color (opaca) con las rayas del estilo; las puntas este y oeste, finitas
      R(g, 'rgba(0,0,0,.28)', cx - 1, y1 + 1, cw + 2, fh + 1);
      R(g, st.fas, cx - 1, y1 - 1, cw + 2, fh);
      if (st.diag) { for (let x = cx - 1; x < cx + cw + 1; x += 9) poly(g, st.e2, [[x, y1 - 1], [x + 4, y1 - 1], [x + 1, y1 + fh - 1], [x - 3, y1 + fh - 1]]); R(g, st.e1, cx - 1, y1 + fh - 3, cw + 2, 2); }
      else if (d.st === 6) { R(g, st.e1, cx - 1, y1, cw + 2, 1.6); R(g, st.e1, cx - 1, y1 + 3.4, cw + 2, 1.6); }
      else { R(g, st.e1, cx - 1, y1 + fh - 3, cw + 2, 2); if (st.e2 !== st.e1) R(g, st.e2, cx - 1, y1 + fh - 1, cw + 2, 1); }
      R(g, 'rgba(255,255,255,.55)', cx - 1, y1 - 1, cw + 2, 1);
      R(g, st.e1, cx - 1, y0 - 1, 1.5, ch + 1); R(g, st.e1, cx + cw - 0.5, y0 - 1, 1.5, ch + 1);
      R(g, st.e1, cx - 1, y0 - 1, cw + 2, 1.5);
      g.restore();
    } });
    // minitienda: pared sur con vidriera y puerta, techo plano con pretil, toldo del color del estilo
    const [kx, ky, kw, kh] = L.kiosk, Hk = 20, ky1 = ky + kh;
    out.push({ sy: ky1 + 2, draw(g) {
      R(g, 'rgba(0,0,0,.2)', kx + 3, ky1 - 1, kw + 5, 7);
      R(g, st.kr, kx - 1, ky - Hk - 1, kw + 2, kh); R(g, 'rgba(255,255,255,.18)', kx - 1, ky - Hk - 1, kw + 2, 2);   // techo
      R(g, '#545048', kx - 1, ky1 - Hk - 2, kw + 2, 1.5);
      R(g, '#4a463e', kx - 1, ky1 - Hk - 1, kw + 2, Hk + 1); R(g, st.kw, kx, ky1 - Hk, kw, Hk);                  // pared
      R(g, st.tb, kx, ky1 - Hk, kw, 4);                                                                         // cartel corrido
      for (let i = 0; i < 6; i++) R(g, 'rgba(255,255,255,.7)', kx + 5 + i * 5, ky1 - Hk + 1.2, 3, 1.6);         // letras (marca de agua sin texto)
      const gw = kw - 18, gx = kx + 4, gy = ky1 - Hk + 7;
      R(g, '#2c3238', gx - 1, gy - 1, gw + 2, 11); R(g, st.vidrio ? '#9ec4d8' : '#7fa8bc', gx, gy, gw, 9);          // vidriera
      R(g, 'rgba(255,255,255,.35)', gx + 2, gy, 3, 9); R(g, 'rgba(255,255,255,.2)', gx + gw * 0.55, gy, 5, 9);
      for (let i = 0; i < 6; i++) R(g, ['#e8493a', '#f0c43a', '#3a8ae8', '#58b04a'][i % 4], gx + 3 + i * (gw - 8) / 6, gy + 6, 3, 3);   // góndolas
      R(g, '#2c3238', kx + kw - 14, ky1 - 13, 9, 13); R(g, '#8ab4c8', kx + kw - 13, ky1 - 12, 7, 11); R(g, 'rgba(255,255,255,.35)', kx + kw - 13, ky1 - 12, 2, 11);   // puerta
      poly(g, st.aw, [[kx - 2, ky1 - 12], [kx + kw + 2, ky1 - 12], [kx + kw + 5, ky1 - 6], [kx - 5, ky1 - 6]]);                     // toldo
      for (let x = kx - 4; x < kx + kw + 2; x += 6) poly(g, '#f4f1ea', [[x, ky1 - 12], [x + 3, ky1 - 12], [x + 4.5, ky1 - 6], [x + 1.5, ky1 - 6]]);
      R(g, 'rgba(0,0,0,.22)', kx - 5, ky1 - 6, kw + 10, 1.6);
      // heladera y garrafas junto a la pared
      R(g, '#e9eef2', kx + 1, ky1 - 8, 5, 8); R(g, '#3a8ae8', kx + 1.6, ky1 - 7, 3.8, 3); R(g, '#b02a2a', kx + kw + 1, ky1 - 6, 3, 6);
      if (st.vidrio) { R(g, '#b8b2a6', kx + kw + 2, ky1 - 3, 8, 3); R(g, '#d8d2c6', kx + kw + 2, ky1 - 5, 6, 2); R(g, '#d8d2c6', kx + kw + 2, ky1 - 7, 4, 2); } // escalinata de cemento
    } });
    // tótem de precios
    const [tx, ty] = L.totem;
    out.push({ sy: ty + 2, draw(g) {
      R(g, 'rgba(0,0,0,.22)', tx - 3, ty - 1, 12, 3);
      R(g, '#6a6862', tx - 1.6, ty - 46, 3.2, 47);                                                                // mástil
      R(g, '#2a2a2e', tx - 10, ty - 66, 20, 34); R(g, st.ta, tx - 9, ty - 65, 18, 32); R(g, st.tb, tx - 9, ty - 65, 18, 9);
      R(g, 'rgba(255,255,255,.75)', tx - 6, ty - 62, 12, 1.6); R(g, 'rgba(255,255,255,.5)', tx - 4, ty - 59.2, 8, 1.4);
      g.font = '700 6px monospace'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      for (const [i, [n, c]] of [['6.990', '#d8e8d0'], ['7.450', '#ffd890'], ['5.980', '#c0d8f0']].entries()) { R(g, '#14181c', tx - 8, ty - 54 + i * 7, 16, 6); g.fillStyle = c; g.fillText(n, tx, ty - 49 + i * 7); }
      R(g, 'rgba(255,255,255,.3)', tx - 9, ty - 65, 3, 32);
      R(g, st.tb, tx - 6, ty - 33, 12, 3);
    } });
    return out;
  };
})();
