// Colegio Don Bosco con diseño propio (19/11/2026, fotos y video de Leandro). Todo dibujado por código, sin copiar las fotos.
//  - donbosco_iglesia: iglesia de ladrillo con la fachada escalonada (torre central con el vitral del Espíritu Santo y la nicho con
//    la estatua de Don Bosco y un chico), vitrales azules en cada escalón, franjas verdes, banderas y canteros. Campanario verde al costado (decorTop).
//  - donbosco_colegio: edificio de dos plantas crema con franja verde, galería de pilares con zócalo bordó y el cartel.
//  - donbosco_patio: patio rojo con líneas blancas de cancha, el escudo «1950» en el centro y dos aros de básquet (decorTop).
// Decals (tools/osm_to_map.py): { kind, x, y, w, h (baldosas) }; el patio trae 'rows' = [[y, x0, x1], ...] con los tramos libres.
'use strict';
(() => {
  const S = VR.TILE;
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const arco = (g, c, x, y, w, h) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fill(); };
  const ladrillo = (g, x, y, w, h, tone) => {            // pared de ladrillo visto: base, hiladas y algunas piezas más claras u oscuras
    R(g, tone || '#b5502f', x, y, w, h);
    for (let yy = 0; yy < h; yy += 3) { R(g, 'rgba(60,20,10,.28)', x, y + yy, w, 0.5); for (let xx = ((yy / 3) % 2) * 3; xx < w; xx += 6) { R(g, 'rgba(60,20,10,.22)', x + xx, y + yy, 0.5, 3); const r = hash(((x + xx) | 0), ((y + yy) | 0)); if (r < 0.14) R(g, 'rgba(255,170,110,.28)', x + xx + 0.5, y + yy + 0.5, 5, 2.4); else if (r > 0.9) R(g, 'rgba(70,20,10,.22)', x + xx + 0.5, y + yy + 0.5, 5, 2.4); } }
  };
  const VERDE = '#2f8f5b', VERDE_O = '#1f6a40', AZUL = '#2a4f9a';
  const bandera = (g, x, y) => { R(g, '#5a5a60', x, y, 0.8, 10); R(g, VERDE, x + 0.8, y, 6, 3); R(g, '#f4f2ea', x + 0.8, y + 3, 6, 3); R(g, VERDE_O, x + 0.8, y + 5.4, 6, 0.6); };
  const txt = (g, s, cx, cy, maxW, col, size) => {
    let fs = size; g.font = 'bold ' + fs + 'px sans-serif';
    while (fs > 3 && g.measureText(s).width > maxW) { fs -= 0.4; g.font = 'bold ' + fs + 'px sans-serif'; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(s, cx, cy); g.textAlign = 'start'; g.textBaseline = 'alphabetic';
  };

  // ---------------------------------------- iglesia ----------------------------------------
  VR.decorOver.donbosco_iglesia = (g, d) => {
    const X0 = d.x * S, X1 = (d.x + d.w) * S, Yt = d.y * S, Yb = (d.y + d.h) * S, W = X1 - X0, cx = (X0 + X1) / 2, FH = 44, RE = Yb - FH;
    g.save(); g.beginPath(); g.rect(X0, Yt, W, d.h * S); g.clip();
    // techo visto desde arriba: bandas de ladrillo que bajan en escalones hacia los costados (como en la foto aérea)
    R(g, '#a24a30', X0, Yt, W, RE - Yt + 4);
    for (let i = 0, y = Yt; y < RE + 2; i++, y += 7) { R(g, i % 2 ? '#b25a3a' : '#9a4229', X0, y, W, 7); R(g, 'rgba(255,200,150,.25)', X0, y, W, 0.8); }
    R(g, 'rgba(255,225,190,.22)', X0, Yt, W, 2.5); R(g, 'rgba(255,225,190,.18)', X0, Yt, 2.5, RE - Yt); R(g, 'rgba(0,0,0,.25)', X1 - 3, Yt, 3, RE - Yt);
    R(g, '#d8d2c0', cx - 1, Yt + 6, 2, RE - Yt - 14); R(g, '#d8d2c0', cx - 8, Yt + 20, 16, 2);       // cruz de la cumbrera
    // fachada escalonada (mira al sur): torre central alta y cuatro escalones a cada lado
    const cw = 30, sw = (W - cw) / 2 / 4, alt = [30, 33, 36, 39], AC = 58, top = [];
    const xs = [], hs = [];
    for (let k = 0; k < 4; k++) { xs.push(X0 + k * sw); hs.push(alt[k]); }
    xs.push(cx - cw / 2); hs.push(AC);
    for (let k = 3; k >= 0; k--) { xs.push(X1 - (k + 1) * sw); hs.push(alt[k]); }
    const ws = xs.map((x, i) => (i === 4 ? cw : sw));
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i], w = ws[i] + 0.4, h = hs[i], y = Yb - h;
      ladrillo(g, x, y, w, h, i === 4 ? '#b9552f' : '#b04c2c');
      R(g, 'rgba(255,215,170,.45)', x, y, w, 1.6); R(g, 'rgba(0,0,0,.2)', x + w - 1.4, y + 1.6, 1.4, h - 1.6);   // tapa clara y lado sombreado
      if (i !== 4) {                                                                                                // vitral azul alto
        const wx = x + w / 2 - 3, wy = y + 5, wh = Math.min(20, h - 14);
        R(g, '#f1ead8', wx - 0.8, wy - 0.8, 7.6, wh + 1.6); const q = g.createLinearGradient(wx, wy, wx + 6, wy); q.addColorStop(0, '#1d3a80'); q.addColorStop(0.5, '#3a6bc0'); q.addColorStop(1, '#1d3a80'); g.fillStyle = q; g.fillRect(wx, wy, 6, wh);
        R(g, 'rgba(255,255,255,.55)', wx + 2.7, wy, 0.7, wh); R(g, 'rgba(255,255,255,.4)', wx, wy + wh * 0.4, 6, 0.6); R(g, 'rgba(130,190,255,.5)', wx + 1, wy + 1, 1.2, wh - 2);
      }
    }
    // franjas verdes que cruzan la fachada
    for (const yy of [Yb - 22, Yb - 6]) { R(g, VERDE, X0, yy, W, 2.6); R(g, VERDE_O, X0, yy + 2.6, W, 0.8); R(g, 'rgba(255,255,255,.3)', X0, yy, W, 0.6); }
    // torre central: vitral del Espíritu Santo (paloma blanca sobre azul), nicho con la estatua y el portón
    const tx = cx - cw / 2;
    R(g, '#f1ead8', cx - 9.5, Yb - 54, 19, 17); const vg = g.createLinearGradient(0, Yb - 53, 0, Yb - 38); vg.addColorStop(0, '#2d5cb8'); vg.addColorStop(1, '#1b3a86'); g.fillStyle = vg; g.fillRect(cx - 8.5, Yb - 53, 17, 15);
    g.fillStyle = '#eef3fb'; g.beginPath(); g.moveTo(cx, Yb - 51); g.lineTo(cx - 6.5, Yb - 45); g.lineTo(cx - 2, Yb - 46); g.lineTo(cx, Yb - 41); g.lineTo(cx + 2, Yb - 46); g.lineTo(cx + 6.5, Yb - 45); g.closePath(); g.fill();   // paloma
    R(g, '#f6d86a', cx - 1.2, Yb - 49.5, 2.4, 2.4);
    R(g, 'rgba(0,0,0,.35)', cx - 9.5, Yb - 37, 19, 21); R(g, '#7a2e1a', cx - 8, Yb - 36, 16, 20); ladrillo(g, cx - 8, Yb - 36, 16, 20, '#8a3a22'); R(g, 'rgba(0,0,0,.28)', cx - 8, Yb - 36, 16, 3); R(g, 'rgba(0,0,0,.18)', cx - 8, Yb - 36, 2, 20);
    R(g, VERDE, cx - 9, Yb - 38, 18, 1.8);                                                                                                  // alero verde del nicho
    R(g, '#e9e6dc', cx - 2.6, Yb - 33, 2.6, 9); R(g, '#f6f3ea', cx - 3, Yb - 33, 3.2, 3.2); R(g, '#d9d5c8', cx + 1.2, Yb - 29, 2, 5); R(g, '#f6f3ea', cx + 1, Yb - 30, 2.4, 2.4);      // Don Bosco y el chico
    R(g, VERDE, cx - 6, Yb - 23.5, 12, 1.2);                                                                                                 // repisa
    R(g, '#e6e2d6', cx - 1.4, Yb - 22, 2.8, 2.5); R(g, '#e76a8a', cx - 2.4, Yb - 23.2, 1.6, 1.6); R(g, '#f3a3b8', cx + 0.8, Yb - 23.4, 1.6, 1.6);       // florero
    // portón de madera con marco verde y rejas
    R(g, VERDE_O, cx - 8.5, Yb - 15, 17, 15); R(g, '#6b4426', cx - 7, Yb - 14, 14, 14); R(g, '#8a5a34', cx - 7, Yb - 14, 6.6, 14); R(g, '#7a4c2c', cx + 0.4, Yb - 14, 6.6, 14); R(g, 'rgba(0,0,0,.35)', cx - 0.3, Yb - 14, 0.7, 14);
    for (let k = 0; k < 4; k++) R(g, 'rgba(0,0,0,.18)', cx - 6.5, Yb - 12 + k * 3.2, 13, 0.5); R(g, '#d8b84a', cx - 2, Yb - 7, 1.2, 1.2); R(g, '#d8b84a', cx + 0.8, Yb - 7, 1.2, 1.2);
    for (let x = cx - 12; x <= cx + 11; x += 2.4) R(g, VERDE, x, Yb - 4.5, 0.8, 4.5); R(g, VERDE, cx - 12, Yb - 4.5, 24, 0.9);                      // baranda verde al pie
    // banderas verdes y blancas a los lados del nicho
    bandera(g, cx - 14, Yb - 36); bandera(g, cx + 8, Yb - 36);
    // lienzo verde y blanco colgando al pie (como en la foto de la fiesta)
    // canteros con arbustos a los costados
    for (const bx of [X0 + 4, X0 + 21, X0 + 38, X1 - 40, X1 - 23, X1 - 6]) { g.fillStyle = '#2d7a3a'; g.beginPath(); g.ellipse(bx + 4, Yb - 3, 6, 4.4, 0, 0, 7); g.fill(); g.fillStyle = '#3c9a4a'; g.beginPath(); g.ellipse(bx + 3, Yb - 4.4, 4, 2.6, 0, 0, 7); g.fill(); }
    R(g, 'rgba(0,0,0,.3)', X0, Yb, W, 2.2);
    g.restore();
  };
  VR.decorTop.donbosco_iglesia = (d) => {
    const X0 = d.x * S, Yb = (d.y + d.h) * S, tx = X0 - 9, by = Yb - 6;     // campanario verde al costado de la fachada
    return [{ sy: by, draw(g) {
      R(g, 'rgba(0,0,0,.28)', tx - 5, by - 1, 22, 4);
      for (const px of [tx - 4, tx + 8]) { R(g, VERDE_O, px, by - 50, 2.4, 50); R(g, VERDE, px, by - 50, 1.2, 50); }
      for (let k = 0; k < 4; k++) { g.strokeStyle = VERDE; g.lineWidth = 0.9; g.beginPath(); g.moveTo(tx - 2, by - 8 - k * 10); g.lineTo(tx + 9, by - 18 - k * 10); g.moveTo(tx + 9, by - 8 - k * 10); g.lineTo(tx - 2, by - 18 - k * 10); g.stroke(); }
      R(g, VERDE_O, tx - 5, by - 52, 16, 2.4); g.fillStyle = '#c9a24a'; g.beginPath(); g.moveTo(tx + 1.5, by - 44); g.quadraticCurveTo(tx - 1, by - 36, tx - 1.5, by - 34); g.lineTo(tx + 6, by - 34); g.quadraticCurveTo(tx + 4, by - 36, tx + 1.5, by - 44); g.fill(); R(g, '#f1d78a', tx + 0.5, by - 42, 1, 6);
      g.fillStyle = VERDE; g.beginPath(); g.moveTo(tx - 6, by - 52); g.lineTo(tx + 3.5, by - 62); g.lineTo(tx + 13, by - 52); g.closePath(); g.fill(); g.fillStyle = VERDE_O; g.beginPath(); g.moveTo(tx + 3.5, by - 62); g.lineTo(tx + 13, by - 52); g.lineTo(tx + 3.5, by - 52); g.closePath(); g.fill();
      R(g, '#e9e6dc', tx + 3, by - 68, 1, 7); R(g, '#e9e6dc', tx + 1, by - 66, 5, 1);
    } }];
  };

  // ---------------------------------------- colegio ----------------------------------------
  VR.decorOver.donbosco_colegio = (g, d) => {
    const X0 = d.x * S, X1 = (d.x + d.w) * S, Yt = d.y * S, Yb = (d.y + d.h) * S, W = X1 - X0, cx = (X0 + X1) / 2, FH = 34, RE = Yb - FH;
    g.save(); g.beginPath(); g.rect(X0, Yt, W, d.h * S); g.clip();
    // losa con pretil verde, tanque de agua y una franja clara
    R(g, '#c9c4b6', X0, Yt, W, RE - Yt); for (let i = 0; i < 90; i++) R(g, 'rgba(90,80,60,' + (0.05 + hash(i, 7) * 0.08) + ')', X0 + hash(i, 1) * W, Yt + hash(i, 2) * (RE - Yt), 2 + hash(i, 3) * 3, 1);
    R(g, VERDE, X0, Yt, W, 3); R(g, VERDE, X0, Yt, 3, RE - Yt); R(g, VERDE, X1 - 3, Yt, 3, RE - Yt); R(g, VERDE_O, X0 + 3, Yt + 3, W - 6, 1); R(g, 'rgba(255,255,255,.3)', X0, Yt, W, 0.8);
    R(g, 'rgba(0,0,0,.25)', X1 - 28, Yt + 14, 16, 12); R(g, '#e8e6e0', X1 - 30, Yt + 11, 16, 12); R(g, '#8d8a82', X1 - 30, Yt + 11, 16, 2);
    R(g, '#d8d4c8', X0 + 14, RE - 16, W - 28, 1.2);
    // pared del frente: planta alta crema con ventanas y franja verde; planta baja con galería de pilares y zócalo bordó
    R(g, '#efe4c2', X0, RE, W, FH); R(g, VERDE, X0, RE, W, 7); R(g, VERDE_O, X0, RE + 7, W, 1);
    txt(g, 'COLEGIO DON BOSCO', cx, RE + 3.7, W - 22, '#ffffff', 5);
    for (let x = X0 + 6; x < X1 - 12; x += 14) { R(g, '#4a5a52', x - 0.6, RE + 10.4, 9.2, 8.2); R(g, '#9ec6dc', x, RE + 11, 8, 7); R(g, '#4a5a52', x + 3.7, RE + 11, 0.6, 7); R(g, 'rgba(255,255,255,.4)', x + 0.8, RE + 11.6, 2, 5); }
    R(g, VERDE, X0, RE + 19.5, W, 2.4); R(g, 'rgba(0,0,0,.18)', X0, RE + 21.9, W, 1.2);
    const gy = RE + 23, gh = FH - 23;
    R(g, '#4a2a24', X0, gy, W, gh);                                                                      // sombra de la galería
    for (let x = X0 + 1; x < X1 - 4; x += 16) { R(g, '#f3ead0', x, gy, 4, gh); R(g, 'rgba(0,0,0,.18)', x + 3, gy, 1, gh); R(g, '#8b2f2f', x, Yb - 4, 4, 4); }
    R(g, '#8b2f2f', X0, Yb - 3.6, W, 3.6); R(g, 'rgba(255,200,180,.25)', X0, Yb - 3.6, W, 0.6);          // zócalo bordó
    const dw = 12, dx = Math.floor(cx / S) * S + 8 - dw / 2;                                                                    // puertas de vidrio al centro de la galería
    R(g, '#2f3a40', dx - 1, gy - 0.5, dw + 2, gh + 0.5); R(g, '#8fb4cc', dx, gy + 0.5, dw / 2 - 0.4, gh - 0.5); R(g, '#8fb4cc', dx + dw / 2 + 0.4, gy + 0.5, dw / 2 - 0.4, gh - 0.5); R(g, 'rgba(255,255,255,.4)', dx + 1, gy + 1.5, 2, gh - 3);
    bandera(g, X0 + 8, RE - 10);
    R(g, 'rgba(0,0,0,.3)', X0, Yb, W, 2);
    g.restore();
  };

  // ---------------------------------------- patio ----------------------------------------
  const ROJO = '#c8454a', LIN = 'rgba(255,255,255,.92)';
  VR.decorOver.donbosco_patio = (g, d) => {
    const X0 = d.x * S, Y0 = d.y * S, W = d.w * S, H = d.h * S, cx = X0 + W / 2, cy = Y0 + H / 2;
    g.save(); g.beginPath(); for (const [y, a, b] of d.rows) g.rect(a * S, y * S, (b - a + 1) * S, S); g.clip();
    for (const [y, a, b] of d.rows) R(g, ROJO, a * S, y * S, (b - a + 1) * S, S);
    for (let i = 0; i < 420; i++) { const r = hash(i, 11); R(g, r < 0.5 ? 'rgba(255,170,150,.10)' : 'rgba(110,20,30,.10)', X0 - 80 + hash(i, 3) * (W + 80), Y0 + hash(i, 5) * H, 2 + hash(i, 8) * 8, 1 + hash(i, 9) * 3); }
    for (const [y, a, b] of d.rows) { if (hash(y, a) < 0.35) R(g, 'rgba(90,10,20,.12)', a * S, y * S + 15, (b - a + 1) * S, 1); }
    g.strokeStyle = LIN; g.lineWidth = 1.5; g.lineCap = 'butt';
    const ix = X0 + 5, iw = W - 10, iy = Y0 + 5, ih = H - 10;
    g.strokeRect(ix, iy, iw, ih); g.beginPath(); g.moveTo(ix, cy); g.lineTo(ix + iw, cy); g.stroke();                       // cancha principal y línea de medio
    g.beginPath(); g.arc(cx, cy, 34, 0, 7); g.stroke();
    // escudo «Colegio Don Bosco · 1950» en el círculo central
    g.fillStyle = '#f4f1e8'; g.beginPath(); g.arc(cx, cy, 22, 0, 7); g.fill(); g.fillStyle = '#e7e3d6'; g.beginPath(); g.arc(cx, cy, 18.5, 0, 7); g.fill();
    g.fillStyle = '#2a5fb0'; g.beginPath(); g.arc(cx, cy - 1, 12, 0, 7); g.fill(); g.fillStyle = '#f4f1e8'; g.fillRect(cx - 1.2, cy - 10, 2.4, 14); g.fillRect(cx - 5, cy - 5, 10, 2.4); g.fillStyle = VERDE; g.fillRect(cx - 12, cy + 1, 24, 2.2);
    g.fillStyle = '#d33a3a'; g.beginPath(); g.arc(cx, cy - 1, 3.2, 0, 7); g.fill();
    txt(g, '1950', cx, cy + 15, 24, '#27406e', 5.4);
    // áreas pintadas y arcos de básquet en los dos extremos
    for (const dir of [1, -1]) {
      const by = dir > 0 ? iy : iy + ih, ay = by + dir * 64;
      g.strokeStyle = LIN; g.beginPath(); g.moveTo(cx - 26, by); g.lineTo(cx - 26, ay); g.lineTo(cx + 26, ay); g.lineTo(cx + 26, by); g.stroke();
      g.beginPath(); g.arc(cx, ay, 26, dir > 0 ? 0 : Math.PI, dir > 0 ? Math.PI : 0); g.stroke();
      g.beginPath(); g.arc(cx, by + dir * 10, 70, dir > 0 ? 0.25 : Math.PI + 0.25, dir > 0 ? Math.PI - 0.25 : 2 * Math.PI - 0.25); g.stroke();
      R(g, 'rgba(60,10,20,.22)', cx - 26, dir > 0 ? by : ay, 52, 64);
    }
    // franjas verde y azul en el borde de abajo (como la cancha de la foto)
    R(g, '#2e8f64', ix, iy + ih + 1, iw, 3); R(g, '#2a5fb0', ix, Y0 + 1, iw * 0.38, 2.6);
    g.restore();
  };
  VR.decorTop.donbosco_patio = (d) => {
    const X0 = d.x * S, Y0 = d.y * S, W = d.w * S, H = d.h * S, cx = X0 + W / 2;
    const aro = (py, dir) => ({ sy: py + (dir > 0 ? 0 : 4), draw(g) {                // poste con tablero y aro (la red cae hacia la cancha)
      R(g, 'rgba(0,0,0,.25)', cx - 12, py + 3, 26, 3);
      R(g, '#6a6a72', cx - 1, py - 26, 2, 28); R(g, '#8a8a92', cx - 1, py - 26, 0.8, 28);
      R(g, '#f4f4ee', cx - 11, py - 34, 22, 14); R(g, '#c8c8c0', cx - 11, py - 34, 22, 1.2); R(g, '#d33a3a', cx - 4.5, py - 28, 9, 7); R(g, '#f4f4ee', cx - 3.6, py - 27.2, 7.2, 5.4);
      g.strokeStyle = '#e8651f'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, py - 19.5, 5, 2.2, 0, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 0.6; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(cx + k * 1.4, py - 19); g.lineTo(cx + k * 0.9, py - 13.5); g.stroke(); }
    } });
    return [aro(Y0 + 30, 1), aro(Y0 + H - 14, -1)];
  };
})();
