// Catedral de Villarrica (19/11/2026, 10 fotos de Leandro: fachada de frente, lateral con la galería de arcos, vista aérea con dron).
// Diseño propio (no se copia ninguna foto). Planta en cruz que sale de OSM (decal `catedral` de tools/osm_to_map.py, con `cols` = techo y
// piso de cada columna de baldosas): la FACHADA con la torre mira al OESTE (hacia la Plaza Libertad); la nave corre de oeste a este con
// una galería de arcos a cada lado; el crucero (brazos norte y sur con frontón) y un ábside angosto al fondo, al este.
// Desde la cámara se ven el techo y la pared sur: la pared sur es la galería de arcos (como en las fotos laterales) y el brazo sur
// muestra su frontón. El piso, los techos y las paredes van en VR.decorOver (se pintan una vez en el chunk); lo que tiene altura
// (torre con reloj y cúpula, pináculos de la fachada) va en VR.decorTop, así se pasa por delante o por detrás.
// El sol está al noroeste: las pendientes del norte y del oeste son claras y las del sur y del este, más oscuras.
'use strict';
(() => {
  const S = VR.TILE, HH = VR.hash, FH = 40;   // FH = alto de la pared sur que se ve (unidades; 8 = 1 m)
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const poly = (g, c, pts) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  const disc = (g, c, x, y, rx, ry) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  // arco de medio punto: x, y = esquina superior izquierda del recuadro; w de ancho; h de alto total (pie recto + semicírculo)
  const arco = (g, c, x, y, w, h) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fill(); };
  const COL = {
    wall: '#e7d9b1', wallL: '#f3e9c9', wallD: '#cdbd90', trim: '#d6b66e', trimD: '#b0904a', stone: '#b9ad94',
    lit: '#bf7259', litD: '#a95f47', sha: '#9d5642', shaD: '#86453a', ridge: '#d99f86', gal: '#a85c46', galD: '#8e4b38',
    dark: '#3a2c22', back: '#7c6848', glass: '#5a86a8', glassL: '#9cc4dc', wood: '#6b4226', woodL: '#8a5a34', iron: '#34343a',
  };
  // techo de teja: base + hileras (cada 3 unidades) + juntas escalonadas + algunas tejas más claras u oscuras. `vert`: las hileras corren de norte a sur
  const teja = (g, x, y, w, h, base, vert, seed) => {
    if (w <= 0 || h <= 0) return;
    R(g, base, x, y, w, h);
    g.beginPath();
    if (!vert) { for (let yy = y + 3; yy < y + h; yy += 3) { g.moveTo(x, yy - 0.5); g.lineTo(x + w, yy - 0.5); } for (let r = 0, yy = y; yy < y + h; yy += 3, r++) for (let xx = x + ((r & 1) ? 2 : 0); xx < x + w; xx += 4) { g.moveTo(xx + 0.5, yy); g.lineTo(xx + 0.5, Math.min(yy + 3, y + h)); } }
    else { for (let xx = x + 3; xx < x + w; xx += 3) { g.moveTo(xx - 0.5, y); g.lineTo(xx - 0.5, y + h); } for (let r = 0, xx = x; xx < x + w; xx += 3, r++) for (let yy = y + ((r & 1) ? 2 : 0); yy < y + h; yy += 4) { g.moveTo(xx, yy + 0.5); g.lineTo(Math.min(xx + 3, x + w), yy + 0.5); } }
    g.strokeStyle = 'rgba(70,24,12,.2)'; g.lineWidth = 0.8; g.stroke();
    const n = Math.floor(w * h / 70);
    for (let i = 0; i < n; i++) { const a = HH(i, seed, 811), b = HH(i, seed, 823), k = HH(i, seed, 829); R(g, k < 0.5 ? 'rgba(255,225,200,.16)' : 'rgba(60,20,10,.14)', x + a * (w - 3), y + b * (h - 2), 3, 2); }
  };
  const footprint = (d, X0) => { const p = new Path2D(); d.cols.forEach(([t, b], i) => p.rect(X0 + i * S, t * S, S, (b - t) * S)); return p; };

  VR.decorOver.catedral = (g, d) => {
    const X0 = d.x * S, cols = d.cols, n = cols.length;
    if (n < 12) return;
    const T0 = cols[1][0] * S, B0 = cols[1][1] * S;                   // nave: techo y piso (unidades)
    let iT = 1; while (iT < n && cols[iT][0] === cols[1][0] && cols[iT][1] === cols[1][1]) iT++;   // empieza el crucero
    const last = cols[n - 1]; let iA = n - 1; while (iA > iT && cols[iA - 1][0] === last[0] && cols[iA - 1][1] === last[1]) iA--;   // empieza el ábside
    const RB = B0 - FH, XT = X0 + iT * S, XA = X0 + iA * S, XE = X0 + n * S;
    let minT = 1e9, maxB = 0; for (const [t, b] of cols) { minT = Math.min(minT, t * S); maxB = Math.max(maxB, b * S); }
    g.save(); g.clip(footprint(d, X0));
    R(g, COL.wall, X0, minT, n * S, maxB - minT);

    // ---------- NAVE (oeste → este): galería norte, nave con cumbrera, galería sur ----------
    const GW = 22, mid = (T0 + GW + RB - GW) / 2;
    teja(g, X0, T0, XT - X0, GW, COL.gal, false, 1);                                           // techo bajo de la galería norte
    R(g, COL.wallL, X0, T0, XT - X0, 2); R(g, COL.trim, X0, T0 + 2, XT - X0, 1);
    R(g, COL.wallL, X0, T0 + GW, XT - X0, 3); R(g, 'rgba(60,40,10,.35)', X0, T0 + GW + 3, XT - X0, 2);   // muro alto de la nave
    teja(g, X0, T0 + GW + 3, XT - X0, mid - (T0 + GW + 3), COL.lit, false, 2);                 // pendiente norte (clara)
    teja(g, X0, mid, XT - X0, RB - GW - 3 - mid, COL.sha, false, 3);                           // pendiente sur (oscura)
    R(g, COL.ridge, X0, mid - 1.5, XT - X0, 3); R(g, 'rgba(60,20,10,.35)', X0, mid + 1.5, XT - X0, 1);
    R(g, 'rgba(60,40,10,.4)', X0, RB - GW - 3, XT - X0, 1.5); R(g, COL.wallL, X0, RB - GW - 3, XT - X0, 0.8);
    teja(g, X0, RB - GW, XT - X0, GW, COL.galD, false, 4);                                       // techo bajo de la galería sur
    R(g, COL.wallL, X0, RB - 2, XT - X0, 2); R(g, 'rgba(0,0,0,.3)', X0, RB, XT - X0, 2);         // canaleta y sombra del alero
    R(g, COL.wallD, X0, T0, 9, RB - T0); R(g, COL.wallL, X0, T0, 3, RB - T0); R(g, COL.trim, X0 + 9, T0, 1.2, RB - T0);  // borde de la fachada (pretil)
    for (const yy of [T0 + 6, RB - 6]) { R(g, 'rgba(0,0,0,.2)', X0 + 3, yy + 1.5, 8, 8); R(g, COL.wallL, X0 + 2, yy - 3, 8, 8); R(g, COL.trim, X0 + 2, yy - 3, 8, 1.5); }   // base de los pináculos
    // pared sur de la nave: galería de arcos
    const Wt = RB, door = X0 + 17 * S + 8, P = 28;
    R(g, COL.wall, X0, Wt, XT - X0, FH); R(g, COL.wallL, X0, Wt, XT - X0, 5); R(g, COL.trim, X0, Wt + 5, XT - X0, 1.6); R(g, COL.trimD, X0, Wt + 6.6, XT - X0, 0.8);
    R(g, COL.trim, X0, B0 - 5, XT - X0, 5); R(g, COL.trimD, X0, B0 - 5, XT - X0, 1); R(g, COL.wallD, X0, B0 - 14, XT - X0, 9);                  // zócalo
    R(g, 'rgba(70,50,20,.10)', X0, Wt + 8, XT - X0, FH - 8);                                                                                  // la pared sur está a la sombra
    for (let c = door - P * 9; c < XT - 14; c += P) {
      if (c < X0 + 20) continue;
      const aw = 16, ah = 28, ax = c - aw / 2, ay = Wt + 9;
      arco(g, COL.trimD, ax - 1.8, ay - 1.8, aw + 3.6, ah + 1.8); arco(g, COL.trim, ax - 1, ay - 1, aw + 2, ah + 1);                         // marco de arco
      arco(g, COL.dark, ax, ay, aw, ah);
      arco(g, COL.back, ax + 2.5, ay + 3, aw - 5, ah - 6); R(g, COL.dark, ax + aw / 2 - 0.5, ay + 12, 1, ah - 12);                           // fondo de la galería
      R(g, '#a8987a', ax, B0 - 8, aw, 3);                                                                                                   // piso de la galería
      R(g, COL.trim, c - aw / 2 - 5.5, ay + 13, 5.5, 1.2); R(g, COL.trim, c + aw / 2, ay + 13, 5.5, 1.2);                                  // imposta
      R(g, COL.trimD, c - aw / 2 - 5.5, ay + 14.2, 5.5, 0.6); R(g, COL.trimD, c + aw / 2, ay + 14.2, 5.5, 0.6);
    }
    R(g, COL.wallL, X0, Wt + 5, 10, FH - 5); R(g, COL.trimD, X0 + 10, Wt + 5, 0.8, FH - 5);                                                    // pilastra de la esquina de la fachada

    // ---------- CRUCERO (brazos norte y sur con frontón) ----------
    const RX = (XT + XA) / 2;                                                                    // cumbrera norte–sur del crucero
    let cT = 1e9, cB = 0; for (let i = iT; i < iA; i++) { cT = Math.min(cT, cols[i][0] * S); cB = Math.max(cB, cols[i][1] * S); }
    for (let i = iT; i < iA; i++) {
      const x = X0 + i * S, y0 = cols[i][0] * S, y1 = cols[i][1] * S - FH, lit = x + S / 2 < RX;
      teja(g, x, y0, S, y1 - y0, lit ? COL.lit : COL.sha, true, 10 + i);
      R(g, COL.wall, x, y1, S, FH);                                                              // pared sur de cada columna
      R(g, COL.wallL, x, y1, S, 4); R(g, COL.trim, x, y1 + 4, S, 1.4); R(g, COL.trim, x, cols[i][1] * S - 5, S, 5); R(g, COL.wallD, x, cols[i][1] * S - 12, S, 7);
      R(g, 'rgba(0,0,0,.28)', x, y1, S, 2);
    }
    R(g, COL.ridge, RX - 1.5, cT, 3, cB - cT - FH); R(g, 'rgba(60,20,10,.35)', RX + 1.5, cT, 1, cB - cT - FH);
    R(g, COL.wallL, XT, cT, 1.5, cB - cT - FH); R(g, 'rgba(60,40,10,.4)', XT + 1.5, cT, 1, cB - cT - FH);
    // brazo sur: frontón triangular y la pared con rosetón y portón
    let bmax = 0, gi0 = -1, gi1 = -1; for (let i = iT; i < iA; i++) bmax = Math.max(bmax, cols[i][1]);
    for (let i = iT; i < iA; i++) if (cols[i][1] === bmax) { if (gi0 < 0) gi0 = i; gi1 = i + 1; }
    if (gi0 >= 0) {
      const gx0 = X0 + gi0 * S, gx1 = X0 + gi1 * S, gc = (gx0 + gx1) / 2, wt = bmax * S - FH, gh = 26;
      poly(g, 'rgba(0,0,0,.25)', [[gx0 + 2, wt + 2], [gx1 + 2, wt + 2], [gc + 2, wt - gh + 2]]);
      poly(g, COL.trimD, [[gx0 - 2, wt + 0.5], [gx1 + 2, wt + 0.5], [gc, wt - gh - 1.5]]); poly(g, COL.wall, [[gx0, wt], [gx1, wt], [gc, wt - gh + 1]]);
      poly(g, COL.wallD, [[gx0 + 7, wt], [gx1 - 7, wt], [gc, wt - gh + 9]]);
      disc(g, COL.trim, gc, wt - 8, 5, 5); disc(g, COL.glass, gc, wt - 8, 3.6, 3.6); R(g, COL.dark, gc - 0.4, wt - 11.6, 0.8, 7.2); R(g, COL.dark, gc - 3.6, wt - 8.4, 7.2, 0.8);
      R(g, COL.wallL, gx0, wt, gx1 - gx0, 4); R(g, COL.trim, gx0, wt + 4, gx1 - gx0, 1.4);
      const rw = 12, rx = gc - rw / 2, ry = wt + 9;
      arco(g, COL.trimD, rx - 1.6, ry - 1.6, rw + 3.2, 22); arco(g, COL.dark, rx, ry, rw, 20.5); arco(g, COL.wood, rx + 1.4, ry + 2, rw - 2.8, 18.5); arco(g, COL.woodL, rx + 2.4, ry + 3, rw - 4.8, 17); R(g, COL.dark, gc - 0.4, ry + 8, 0.8, 11);
      R(g, COL.trim, gc - 12, bmax * S - 4, 24, 4); R(g, COL.stone, gc - 16, bmax * S - 1.6, 32, 1.6);                                      // escalones
      for (const sx of [gx0 + 5, gx1 - 5 - 6]) { arco(g, COL.trimD, sx - 0.8, wt + 9 - 0.8, 7.6, 15); arco(g, COL.glass, sx, wt + 9, 6, 13.5); R(g, COL.glassL, sx + 1, wt + 11, 1.6, 6); R(g, COL.dark, sx + 2.8, wt + 9, 0.5, 13); }   // vitrales
    }
    for (let i = iT; i < iA; i++) if (i < gi0 || i >= gi1) { const x = X0 + i * S; if (i % 2 === 0) { const wy = cols[i][1] * S - FH + 11; arco(g, COL.trimD, x + 3.2, wy - 0.8, 9.6, 17); arco(g, COL.dark, x + 4, wy, 8, 14.5); arco(g, COL.glass, x + 5, wy + 1.5, 6, 11.5); R(g, COL.glassL, x + 6, wy + 4, 1.4, 5); } }

    // ---------- ÁBSIDE (fondo, al este) ----------
    for (let i = iA; i < n; i++) {
      const x = X0 + i * S, y0 = cols[i][0] * S, y1 = cols[i][1] * S - FH, m = (y0 + y1) / 2;
      teja(g, x, y0, S, m - y0, COL.lit, false, 40 + i); teja(g, x, m, S, y1 - m, COL.sha, false, 50 + i);
      R(g, COL.ridge, x, m - 1.5, S, 3);
      R(g, COL.wall, x, y1, S, FH); R(g, COL.wallL, x, y1, S, 4); R(g, COL.trim, x, y1 + 4, S, 1.4); R(g, COL.trim, x, cols[i][1] * S - 5, S, 5); R(g, COL.wallD, x, cols[i][1] * S - 12, S, 7);
      R(g, 'rgba(0,0,0,.28)', x, y1, S, 2);
    }
    { const ax = XA + (XE - XA) / 2, ay = last[1] * S - FH + 11; arco(g, COL.trimD, ax - 5.4, ay - 0.8, 10.8, 17); arco(g, COL.dark, ax - 4.6, ay, 9.2, 14.5); arco(g, COL.glass, ax - 3.4, ay + 1.5, 6.8, 11.5); R(g, COL.glassL, ax - 2.2, ay + 4, 1.6, 5); }
    R(g, 'rgba(60,40,10,.4)', XA, cols[iA][0] * S, 1.5, (cols[iA][1] - cols[iA][0]) * S - FH);
    R(g, COL.wallL, XE - 2, last[0] * S, 2, (last[1] - last[0]) * S - FH);                       // borde este del techo

    // columna 0: escalón de piedra delante de la fachada
    if (cols[0][1] * S > B0) { R(g, COL.stone, X0, B0, S, cols[0][1] * S - B0); R(g, 'rgba(0,0,0,.18)', X0, B0, S, 1.5); }
    // bordes: luz al norte y al oeste, sombra al sur y al este
    for (let i = 0; i < n; i++) { const x = X0 + i * S, t = cols[i][0] * S; if (!d.cols[i - 1] || cols[i - 1][0] > cols[i][0]) R(g, 'rgba(255,255,255,.28)', x, t, 1, 2); }
    R(g, 'rgba(0,0,0,.3)', X0, maxB - 2, n * S, 2);
    g.restore();
    // atrio de la fachada oeste: escalones de piedra y el portón de madera (se ve desde arriba como una franja oscura entre las gradas)
    { const c2 = cols[2] || cols[1], ym = ((c2[0] + c2[1]) / 2) * S, ph = 44;
      for (let k = 0; k < 3; k++) { const w = 5 - k, x = X0 - 3 - (2 - k) * 5 + 0; R(g, k % 2 ? '#cfc8b4' : '#ded7c2', x, ym - ph / 2 - k * 1.5, w + 5, ph + k * 3); R(g, 'rgba(0,0,0,.2)', x, ym - ph / 2 - k * 1.5, 1, ph + k * 3); }
      R(g, '#5a3a22', X0 - 3, ym - 13, 4, 26); R(g, '#7a5232', X0 - 3, ym - 12, 2, 24); R(g, '#d8b84a', X0 - 2, ym - 1, 1, 2); R(g, 'rgba(255,230,160,.5)', X0 - 8, ym - 16, 3, 32); }
  };

  // ---------------------------------------------------------------- Torre con reloj y cúpula + pináculos (con altura)
  VR.decorTop.catedral = (d) => {
    const X0 = d.x * S, cols = d.cols, T0 = cols[1][0] * S, B0 = cols[1][1] * S, RB = B0 - FH, mid = (T0 + RB) / 2;
    const out = [];
    // pináculos de la fachada: cuerpo cuadrado con cornisa, casquete piramidal y cruz de hierro
    for (const py of [T0 + 6 + 4, RB - 6 + 4]) {
      const bx = X0 + 2, bw = 8, ht = 24;
      out.push({ sy: py + 2, draw(g) {
        poly(g, 'rgba(0,0,0,.22)', [[bx + 2, py], [bx + bw + 5, py - 3], [bx + bw + 5, py - ht - 5], [bx + 3, py - ht]]);
        R(g, COL.wall, bx, py - ht, bw, ht); R(g, COL.wallL, bx, py - ht, 2, ht); R(g, COL.wallD, bx + bw - 2, py - ht, 2, ht);
        R(g, COL.trim, bx - 1, py - ht + 5, bw + 2, 2); R(g, COL.trim, bx - 1, py - 4, bw + 2, 4); R(g, COL.trimD, bx - 1, py - ht + 7, bw + 2, 0.8);
        R(g, COL.wallL, bx - 1.5, py - ht - 2, bw + 3, 3);
        poly(g, COL.wallD, [[bx - 1, py - ht - 2], [bx + bw + 1, py - ht - 2], [bx + bw / 2, py - ht - 8]]); poly(g, COL.wallL, [[bx - 1, py - ht - 2], [bx + bw / 2, py - ht - 8], [bx + bw / 2, py - ht - 2]]);
        R(g, COL.iron, bx + bw / 2 - 0.4, py - ht - 15, 0.8, 8); R(g, COL.iron, bx + bw / 2 - 2.4, py - ht - 12.5, 4.8, 0.8);
      } });
    }
    // torre: base en el centro de la fachada, cara sur con el arco del campanario, cornisa y cúpula blanca con costillas doradas
    const tw = 42, tx = X0 + 8, ty1 = mid + tw / 2, ht = 60, tp = 24, tcx = tx + tw / 2;
    out.push({ sy: ty1 + 1, draw(g) {
      const top = ty1 - ht;                                                                           // borde de arriba de la cara sur
      poly(g, 'rgba(0,0,0,.2)', [[tx + 3, ty1], [tx + tw + 9, ty1 - 5], [tx + tw + 9, top - tp - 6], [tx + 4, top - tp + 6]]);
      R(g, COL.wall, tx, top, tw, ht); R(g, 'rgba(70,50,20,.12)', tx, top, tw, ht);
      R(g, COL.wallL, tx, top, 3.2, ht); R(g, COL.wallD, tx + tw - 3.2, top, 3.2, ht); R(g, COL.trim, tx + 3.2, top, 0.8, ht); R(g, COL.trim, tx + tw - 4, top, 0.8, ht);   // pilastras de la esquina
      R(g, COL.trim, tx - 1, ty1 - 5, tw + 2, 5); R(g, COL.trimD, tx - 1, ty1 - 5, tw + 2, 1);                // base
      R(g, COL.trim, tx - 1.5, top + 22, tw + 3, 2.2); R(g, COL.trimD, tx - 1.5, top + 24.2, tw + 3, 0.8);     // cornisa media
      R(g, COL.trim, tx - 2, top - 0.5, tw + 4, 4); R(g, COL.wallL, tx - 2, top - 0.5, tw + 4, 1.4);         // cornisa alta
      // campanario: arco con la campana y baranda
      const bw = 14, bx = tcx - bw / 2, by = top + 5;
      arco(g, COL.trimD, bx - 1.6, by - 1.6, bw + 3.2, 21); arco(g, COL.dark, bx, by, bw, 18.5);
      disc(g, '#8a6a2c', tcx, by + 11, 3.4, 4.2); R(g, '#8a6a2c', tcx - 3.4, by + 11, 6.8, 3.4); R(g, '#c9a54a', tcx - 2.2, by + 8, 1.4, 5); R(g, COL.dark, tcx - 0.4, by + 4, 0.8, 4);
      R(g, COL.iron, bx, by + 14.5, bw, 0.9); for (let k = 0; k <= 7; k++) R(g, COL.iron, bx + k * (bw - 0.8) / 7, by + 14.5, 0.8, 4.5);           // baranda
      R(g, COL.trim, bx - 3, by + 19.4, bw + 6, 1.4);
      // tablero con el reloj (la esfera mira al oeste: de costado se ve apenas la caja)
      R(g, COL.wallD, tx + 6, top + 28, tw - 12, 22); R(g, COL.wall, tx + 7, top + 29, tw - 14, 20);
      disc(g, COL.trimD, tcx, top + 39, 7.4, 7.4); disc(g, '#f6f1e2', tcx, top + 39, 6.2, 6.2); R(g, COL.dark, tcx - 0.4, top + 34, 0.8, 5.4); R(g, COL.dark, tcx - 0.4, top + 38.6, 3.8, 0.8);
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; R(g, COL.dark, tcx + Math.sin(a) * 5.2 - 0.3, top + 39 - Math.cos(a) * 5.2 - 0.3, 0.6, 0.6); }
      // cara de arriba (la cubierta de la torre) y los cuatro frontones chicos
      const tt = top - tp;
      R(g, COL.wallD, tx - 2, tt, tw + 4, tp); R(g, COL.wallL, tx - 2, tt, tw + 4, 2); R(g, COL.trim, tx - 2, top - 3, tw + 4, 3);
      poly(g, COL.wallL, [[tx - 2, top - 3], [tx + tw + 2, top - 3], [tcx, top - 13]]); poly(g, COL.trim, [[tx + 2, top - 3], [tx + tw - 2, top - 3], [tcx, top - 10]]);      // frontón sur
      // cúpula: círculo blanco con costillas doradas, linterna y cruz
      const cy = tt + tp / 2 + 1, rx = 15, ry = 13;
      disc(g, 'rgba(0,0,0,.2)', tcx + 3, cy + 3, rx + 1, ry + 1);
      disc(g, COL.trimD, tcx, cy, rx + 1.2, ry + 1.2); disc(g, '#ece4cc', tcx, cy, rx, ry); disc(g, '#fbf7ea', tcx - 3.5, cy - 3.5, rx * 0.55, ry * 0.5); disc(g, 'rgba(140,120,90,.32)', tcx + 4.5, cy + 4.5, rx * 0.6, ry * 0.55);
      g.strokeStyle = '#d6b66e'; g.lineWidth = 0.9; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI; g.beginPath(); g.moveTo(tcx, cy - 3); g.quadraticCurveTo(tcx + Math.cos(a) * rx * 0.9, cy - 3 + Math.sin(a) * ry * 0.9 - 2, tcx + Math.cos(a) * rx, cy + Math.sin(a) * ry); g.stroke(); g.beginPath(); g.moveTo(tcx, cy - 3); g.quadraticCurveTo(tcx - Math.cos(a) * rx * 0.9, cy - 3 - Math.sin(a) * ry * 0.9 - 2, tcx - Math.cos(a) * rx, cy - Math.sin(a) * ry); g.stroke(); }
      disc(g, COL.trim, tcx, cy - 4, 4.6, 4); R(g, COL.wallL, tcx - 2.6, cy - 12, 5.2, 8); disc(g, '#f6f1e2', tcx, cy - 12, 2.6, 2.2); disc(g, COL.trim, tcx, cy - 14, 1.2, 1.2);
      R(g, COL.iron, tcx - 0.4, cy - 25, 0.8, 11); R(g, COL.iron, tcx - 3, cy - 22, 6, 0.8);
      if (VR.night) VR.night.add(tcx, cy + 18, 26, '255,236,190', 0.22 * (VR.night.level || 0));
    } });
    // luces de noche (19/11/2026): reflectores en el piso frente a la fachada oeste, farol del portón y faroles de la galería sur
    {
      const c2 = cols[2] || cols[1], ym = ((c2[0] + c2[1]) / 2) * S, lamps = [[X0 - 22, ym - 46], [X0 - 22, ym + 46]], galy = B0 - 2;
      out.push({ sy: ym + 50, draw(g) {
        const lv = VR.night ? (VR.night.level || 0) : 0;
        for (const [lx, ly] of lamps) {                                                                                       // reflector: pie de hierro, cabeza que apunta a la fachada
          R(g, 'rgba(0,0,0,.25)', lx - 3, ly + 1, 8, 2.4); R(g, COL.iron, lx - 0.6, ly - 9, 1.2, 10); R(g, '#3a3a40', lx - 2.6, ly - 12, 5.2, 4); R(g, lv > 0.3 ? '#fff3c4' : '#9a9a90', lx + 0.6, ly - 11.4, 2, 2.8);
          if (VR.night && lv > 0.02) { VR.night.add(lx + 12, ly - 4, 54, '255,226,160', 0.42 * lv); VR.night.add(lx + 24, ly - 8, 40, '255,236,190', 0.26 * lv); }
        }
        R(g, COL.iron, X0 - 7, ym - 17, 1, 5); R(g, lv > 0.3 ? '#ffe9a8' : '#c8b878', X0 - 8, ym - 13, 3, 3);                         // farol del portón
        R(g, COL.iron, X0 - 7, ym + 13, 1, 5); R(g, lv > 0.3 ? '#ffe9a8' : '#c8b878', X0 - 8, ym + 10, 3, 3);
        if (VR.night && lv > 0.02) { VR.night.add(X0 - 6, ym, 46, '255,214,140', 0.4 * lv); VR.night.add(X0 - 8, ym - 14, 16, '255,230,170', 0.3 * lv); VR.night.add(X0 - 8, ym + 12, 16, '255,230,170', 0.3 * lv); }
      } });
      out.push({ sy: galy, draw(g) {
        const lv = VR.night ? (VR.night.level || 0) : 0, XT2 = X0 + (d.w - 14) * S;
        for (let c = X0 + 17 * S + 8 - 28 * 9; c < XT2; c += 56) {
          if (c < X0 + 20) continue; const ly = B0 - FH + 20;
          R(g, COL.iron, c - 0.4, ly - 3, 0.8, 3); R(g, lv > 0.3 ? '#ffe9a8' : '#c8b878', c - 1.4, ly, 2.8, 3.4);
          if (VR.night && lv > 0.02) VR.night.add(c, B0 + 4, 30, '255,226,160', 0.24 * lv);
        }
      } });
    }
    return out;
  };
})();
