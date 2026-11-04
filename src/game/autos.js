// Más autos (04/11/2026): los tipos más comunes en las calles de Villarrica, con diseño propio por categoría
// (sin marcas ni copias de modelos reales) y nombres inventados: sedán familiar, monovolumen chico, camioneta
// doble cabina, todoterreno grande, mediano y chico, y el karumbe (carro de caballo). Cada uno con su dibujo
// desde arriba (VR.vbase, al cuádruple) y de costado (tarjeta y taller), y su manejo.
'use strict';
(() => {
  const GL = ['#22344a', '#3b5470', '#8fb0cc'], CHR = ['#7a7e86', '#e8ecf2', '#9aa0a8'];
  // Auto genérico desde arriba, mirando hacia arriba. c: L, W (unidades = px del juego), zonas a lo largo:
  // hood (capó), ws (parabrisas), roof (techo), rg (luneta), y lo que queda atrás es baúl, portón o caja.
  VR.drawAuto = (c) => (pal, t = {}) => VR.vbase(c.W, c.L, (T) => {
    const [C, D, L] = pal, g = T.g, W = c.W, Ln = c.L, x0 = 0.8, x1 = W - 0.8, bw = x1 - x0, mid = W / 2;
    const S2 = VR.tunePal ? VR.tunePal(t.color2 ?? 11)[0] : '#f2f0ea';
    const gl = t.polarizado == 2 ? ['#0c1018', '#161e28', '#34404e'] : t.polarizado == 1 ? ['#18222e', '#2c3c50', '#5e7690'] : GL;
    const HL = t.faros === 'xenon' ? '#e6f2ff' : '#fff4c0';
    const yH = c.hood, yW = yH + c.ws, yR = yW + c.roof, yG = yR + c.rg, tail = Ln - 0.4;
    const st = (y0, y1) => { g.fillStyle = S2; if (t.franja === 'carrera') { g.fillRect(mid - 2.3, y0, 1.3, y1 - y0); g.fillRect(mid + 1, y0, 1.3, y1 - y0); } else if (t.franja === 'centro') g.fillRect(mid - 1.4, y0, 2.8, y1 - y0); };
    const tl = c.tireL || 5.4, ta = Ln * (c.fa || 0.2), tb = Ln * (c.ra || 0.78);
    if (t.escape === 'deportivo') { T.rr(x0 + 2.4, Ln - 1.4, 1.3, 1.4, 0.5, CHR[1]); T.rr(x0 + 4, Ln - 1.4, 1.3, 1.4, 0.5, CHR[1]); }
    for (const y of [ta, tb]) { T.tire(-0.1, y - tl / 2, 2.3, tl); T.tire(W - 2.2, y - tl / 2, 2.3, tl); }
    if (t.llantas && t.llantas !== 'serie') for (const y of [ta, tb]) { T.rr(-0.1, y - 1.2, 0.8, 2.4, 0.3, VR.RIMS[t.llantas]); T.rr(W - 0.7, y - 1.2, 0.8, 2.4, 0.3, VR.RIMS[t.llantas]); }
    const rf = c.box ? 2 : 4.2;
    T.rr(x0, 0.3, bw, Ln - 0.6, [rf, rf, c.box ? 1.6 : 3, c.box ? 1.6 : 3], T.hg(x0, x1, [D, L, C, C, D]));     // carrocería
    if (t.franja === 'costado') { g.fillStyle = S2; g.fillRect(x0 + 0.2, 3, 0.7, Ln - 6); g.fillRect(x1 - 0.9, 3, 0.7, Ln - 6); }
    // capó
    T.rr(x0 + 0.9, 1, bw - 1.8, yH - 0.8, [c.box ? 1.4 : 3.4, c.box ? 1.4 : 3.4, 1, 1], T.hg(x0, x1, [C, L, C, D]));
    T.line(mid - 2.6, 1.6, mid - 2.3, yH - 0.4, 0.25, VR.shadeHex(C, 0.82)); T.line(mid + 2.6, 1.6, mid + 2.3, yH - 0.4, 0.25, VR.shadeHex(C, 0.82));
    if (c.scoop) T.rr(mid - 1.6, yH * 0.45, 3.2, 1.6, 0.4, VR.shadeHex(C, 0.6));                            // toma de aire
    st(0.5, yH);
    T.ell(mid - 2.5, yH * 0.4, 1.6, 0.7, 'rgba(255,255,255,.35)');
    const hw = c.box ? 2.6 : 3;
    T.rr(x0 + 0.8, 0.6, hw, 1.4, c.box ? 0.3 : 0.6, HL); T.rr(x1 - 0.8 - hw, 0.6, hw, 1.4, c.box ? 0.3 : 0.6, HL);       // faros
    T.rr(mid - 2.6, 0.35, 5.2, c.box ? 1.3 : 0.9, 0.3, c.grille || '#2a2a30');                            // parrilla
    if (c.box) for (let x = mid - 2.2; x < mid + 2.4; x += 0.9) T.rr(x, 0.5, 0.35, 1, 0, CHR[0]);
    if (c.bull) { T.line(x0 + 1.5, -0.1, x1 - 1.5, -0.1, 0.6, '#2a2a30'); }                              // defensa
    // parabrisas
    T.poly([[x0 + 1.9, yH], [x1 - 1.9, yH], [x1 - 0.9, yW], [x0 + 0.9, yW]], T.vg(yH, yW, gl));
    T.poly([[x0 + 3.3, yH + 0.6], [x0 + 4.9, yH + 0.6], [x0 + 2.9, yW - 0.6], [x0 + 1.7, yW - 0.6]], 'rgba(255,255,255,.35)');
    T.rr(-0.7 + x0, yH + 0.6, 1.4, 1.2, 0.4, D); T.rr(x1 - 0.7, yH + 0.6, 1.4, 1.2, 0.4, D);               // espejos
    // techo y ventanillas
    const R = t.techo === 'negro' ? ['#4a4a52', '#2c2c32', '#2c2c32', '#1a1a1e'] : [L, C, C, D];
    T.rr(x0 + 1.9, yW, bw - 3.8, c.roof, 1.2, T.hg(x0, x1, R));
    if (t.techo !== 'negro') st(yW, yR);
    T.rr(x0 + 3.3, yW + 1, 5, 1, 0.5, 'rgba(255,255,255,.3)');
    const nwin = c.doors3 ? 1 : 2, wl = (c.roof - 0.6) / nwin;
    for (let i = 0; i < nwin; i++) { const y = yW + 0.2 + i * wl; T.rr(x0 + 0.5, y, 1.2, wl - 0.4, 0.4, T.vg(y, y + wl, gl)); T.rr(x1 - 1.7, y, 1.2, wl - 0.4, 0.4, T.vg(y, y + wl, gl)); }
    const rails = c.rails || t.techo === 'parrilla';
    if (rails) { T.line(x0 + 2.9, yW + 0.8, x0 + 2.9, yR - 0.8, 0.45, '#2a2a30'); T.line(x1 - 2.9, yW + 0.8, x1 - 2.9, yR - 0.8, 0.45, '#2a2a30'); if (t.techo === 'parrilla') for (let y = yW + 1.8; y < yR - 1; y += 3) T.line(x0 + 2.9, y, x1 - 2.9, y, 0.35, '#45454c'); }
    // luneta
    if (c.rg > 0) T.poly([[x0 + 1.9, yR], [x1 - 1.9, yR], [x1 - (c.box ? 2.1 : 2.6), yG], [x0 + (c.box ? 2.1 : 2.6), yG]], T.vg(yR, yG, gl));
    // atrás: caja de camioneta, baúl o portón
    if (c.bed) {
      T.rr(x0 + 0.7, yG + 0.3, bw - 1.4, tail - yG - 1.2, 0.5, D);
      T.rr(x0 + 1.4, yG + 1, bw - 2.8, tail - yG - 2.6, 0.3, '#2a2a30');
      for (let x = x0 + 2.2; x < x1 - 1.6; x += 1.5) T.rr(x, yG + 1.2, 0.5, tail - yG - 3, 0.2, '#38383e');
      T.rr(x0 + 0.7, tail - 1.6, bw - 1.4, 1.2, 0.4, T.hg(x0, x1, [C, L, D]));                              // compuerta
      if (c.rollbar) { T.line(x0 + 1.2, yG + 1.4, x1 - 1.2, yG + 1.4, 0.7, CHR[2]); }
    } else {
      T.rr(x0 + 1.6, yG + 0.2, bw - 3.2, tail - yG - 0.6, 1, T.hg(x0, x1, [C, L, D]));
      st(yG + 0.2, tail - 0.6);
    }
    if (c.stripe) { g.fillStyle = c.stripe; g.fillRect(x0 + 0.1, 2.4, 0.8, Ln - 5); g.fillRect(x1 - 0.9, 2.4, 0.8, Ln - 5); }
    if (c.bar) for (const [by, k] of [[yW + 1.4, 0], ...(c.bar2 ? [[yR - 2.6, 1]] : [])]) { // barra de luces (se prende con la sirena)
      T.rr(x0 + 2.4, by, bw - 4.8, 1.7, 0.6, '#26262c'); T.rr(x0 + 2.8, by + 0.25, (bw - 5.6) / 2 - 0.3, 1.2, 0.4, c.bar[0]); T.rr(mid + 0.3, by + 0.25, (bw - 5.6) / 2 - 0.3, 1.2, 0.4, c.bar[1]);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x0 + 3, by + 0.35, bw - 6, 0.3);
    }
    if (c.spare) { T.ell(mid, tail - 0.4, 2.9, 1.3, '#16161a'); T.ell(mid, tail - 0.6, 1.8, 0.7, c.spareC ? C : '#3a3a40'); }  // auxilio
    if (!c.bed) T.rr(mid - 1.6, tail - 1.6, 3.2, 0.9, 0.2, '#f2f0ea');                                   // patente
    T.rr(x0 + 0.4, tail - 2.4, 2.2, 1.8, 0.5, '#d8302a'); T.rr(x1 - 2.6, tail - 2.4, 2.2, 1.8, 0.5, '#d8302a');
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x0 + 0.1, yW + 0.4, 0.5, c.roof); g.fillRect(x1 - 0.6, yW + 0.4, 0.5, c.roof);
    if (t.aleron === 'chico' && !c.bed) { T.rr(x0 + 2.2, yG + 0.4, bw - 4.4, 1, 0.4, D); }
    if (t.aleron === 'grande' && !c.bed) { T.rr(x0, tail - 4, bw, 1.7, 0.5, T.hg(x0, x1, [D, L, C, D])); }
  });

  // Karumbe: caballo adelante, varas, carro de madera con dos ruedas grandes y el carrero sentado
  VR.drawKarumbe = (pal) => VR.vbase(14, 40, (T) => {
    const [C, D, L] = pal, g = T.g, HB = '#7a4a28', HD = '#55321a', HL = '#9a6438', W = '#8a6a44', WD = '#5e4628';
    T.line(4.6, 13, 4.2, 4.5, 0.55, '#5a4430'); T.line(9.4, 13, 9.8, 4.5, 0.55, '#5a4430');                 // varas
    T.ell(7, 2.2, 1.1, 2.2, T.hg(5.9, 8.1, [HL, HB, HD]));                                                 // cabeza
    T.ell(6.2, 0.8, 0.35, 0.5, HD); T.ell(7.8, 0.8, 0.35, 0.5, HD);                                        // orejas
    T.rr(6.4, 3, 1.2, 1.5, 0.5, '#2a1a10');                                                                 // crin
    T.ell(7, 8.4, 2.4, 5, T.hg(4.6, 9.4, [HL, HB, HB, HD]));                                              // lomo
    T.rr(6.5, 3.6, 1, 6, 0.5, '#2a1a10');                                                                   // crin larga
    T.rr(4.6, 7.2, 4.8, 1.2, 0.4, '#3a2a1c'); T.ell(7, 13.6, 0.8, 1.2, '#2a1a10');                         // arnés y cola
    T.rr(-0.1, 21, 1.8, 9, 0.8, '#2a2018'); T.rr(12.3, 21, 1.8, 9, 0.8, '#2a2018');                       // ruedas
    T.rr(0.2, 24.6, 1.2, 1.8, 0.3, '#8a8e96'); T.rr(12.6, 24.6, 1.2, 1.8, 0.3, '#8a8e96');
    T.rr(1.4, 14.6, 11.2, 24.6, 0.6, WD);                                                                   // carro
    T.rr(2, 15.2, 10, 23.4, 0.4, T.hg(2, 12, [W, '#9c7a50', W, WD]));
    for (let y = 17.4; y < 38; y += 2.2) T.rr(2, y, 10, 0.25, 0, WD);
    T.rr(1.4, 14.6, 11.2, 1.2, 0.4, C);                                                                     // banco del carrero (color)
    T.rr(3.2, 26, 3.6, 3.6, 0.6, '#c8b060'); T.rr(7.4, 29, 3.4, 4.4, 0.6, '#b89a50'); T.rr(3.6, 32, 3, 3, 0.5, '#6a8a3a'); // bolsas y verdura
    // carrero: sombrero de paja, hombros, brazos con las riendas
    T.line(4, 17, 5.4, 12.6, 0.9, '#d8d2c0'); T.line(10, 17, 8.6, 12.6, 0.9, '#d8d2c0');
    T.line(5.4, 12.6, 6.6, 9, 0.18, '#3a2a1c'); T.line(8.6, 12.6, 7.4, 9, 0.18, '#3a2a1c');
    T.rr(3.6, 16, 6.8, 3.6, 1.6, T.hg(3.6, 10.4, ['#f0ece2', '#d8d2c0', '#a8a294']));
    T.ell(7, 17.4, 2.6, 2.4, T.hg(4.4, 9.6, ['#f0dca0', '#d8be78', '#a88c50'])); T.ell(7, 17.4, 1.2, 1.1, '#c8ac68');
  });

  // Costado de los autos (64×36, frente a la derecha): perfil por puntos, ventanillas, ruedas y detalles
  VR.drawSideAuto = (m, pal, t = {}, P, g, wheel, HL, S2) => {
    const c = VR.CAR_MODELS[m].sideShape, [C, D, L] = pal, poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
    const GLS = t.polarizado == 2 ? '#14181e' : t.polarizado == 1 ? '#27323e' : '#3b4d63', CH = '#c8ccd4';
    if (m === 'karumbe') {
      const W = '#8a6a44', WD = '#5e4628', HB = '#7a4a28', HD = '#55321a';
      P.r(4, 20, 30, 2, WD); P.r(4, 14, 30, 6, W); for (let x = 6; x < 34; x += 5) P.r(x, 14, 1, 6, WD); P.r(4, 13, 30, 1, WD); // carro
      P.r(9, 10, 6, 4, '#c8b060'); P.r(16, 11, 6, 3, '#6a8a3a');                                               // carga
      P.r(30, 9, 5, 5, '#d8d2c0'); P.r(31, 5, 4, 4, '#c98b5c'); P.r(29, 4, 8, 1, '#d8be78'); P.r(30, 2, 6, 2, '#d8be78'); // carrero
      P.r(34, 17, 12, 1, '#5a4430');                                                                       // vara
      poly([[44, 12], [56, 11], [58, 13], [57, 19], [45, 19], [43, 16]], HB);                              // caballo
      poly([[55, 11], [59, 5], [62, 5], [63, 8], [60, 9], [58, 13]], HB); P.r(57, 5, 2, 5, '#2a1a10'); P.r(61, 4, 1, 2, HD);
      P.r(43, 13, 1, 6, '#2a1a10');
      for (const [x, k] of [[45, 0], [47, 1], [54, 1], [56, 0]]) { P.r(x, 19, 2, 9 - k, k ? HD : HB); P.r(x, 28 - k, 2, 2, '#2a2420'); }
      for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) { const d = Math.hypot(x, y), an = Math.atan2(y, x); if (d <= 8.3) P.r(20 + x, 22 + y, 1, 1, d > 7 ? '#2a2018' : d < 1.6 ? '#8a8e96' : Math.abs(Math.sin(an * 4)) < 0.22 ? '#6a5030' : 'rgba(0,0,0,0)'); }
      return;
    }
    const lo = +t.bajo ? 2 : 0; g.save(); g.translate(0, lo);
    if (t.escape === 'deportivo') { P.r(1, 24, 5, 2, CH); P.r(1, 24, 5, 1, '#ffffff'); }
    poly(c.body, C);                                                                                     // carrocería
    for (const w of c.win) poly(w, GLS);
    if (t.polarizado != 2) for (const w of c.win) P.r(w[0][0] + 1, w[0][1] + 1, 3, 1, '#6f8aa6');
    if (c.bed) { P.r(c.bed[0], c.bed[1], c.bed[2] - c.bed[0], 1, D); P.r(c.bed[0], c.bed[1] + 1, c.bed[2] - c.bed[0], 1, VR.shadeHex(C, 0.8)); if (c.rollbar) { P.r(c.bed[2] - 3, c.bed[1] - 4, 1, 4, CH); P.r(c.bed[2] - 3, c.bed[1] - 4, 3, 1, CH); } }
    for (const x of c.pillars || []) P.r(x, c.yr + 1, 1, c.belt - c.yr - 1, D);
    if (t.techo === 'negro') P.r(c.rx0, c.yr - 1, c.rx1 - c.rx0, 2, '#2a2a30');
    if (c.rails || t.techo === 'parrilla') { P.r(c.rx0 + 1, c.yr - 2, c.rx1 - c.rx0 - 2, 1, '#2a2a30'); P.r(c.rx0 + 2, c.yr - 1, 1, 1, '#2a2a30'); P.r(c.rx1 - 3, c.yr - 1, 1, 1, '#2a2a30'); }
    P.r(c.nose - 56 + 5, c.belt + 2, 56, 1, L);                                                          // línea de cintura
    for (const x of c.doors) P.r(x, c.belt, 1, c.sill - c.belt, D);
    P.r(c.tailx, c.sill - 2, c.nose - c.tailx, 2, D);                                                    // zócalo
    if (t.franja === 'costado') P.r(c.tailx + 1, c.belt + 4, c.nose - c.tailx - 2, 2, S2);
    else if (t.franja && t.franja !== 'no') { P.r(c.rx0, c.yr, c.rx1 - c.rx0, 1, S2); P.r(c.hood[0], c.hood[1], c.nose - c.hood[0] - 1, 1, S2); }
    if (t.aleron === 'chico' && !c.bed) P.r(c.tailx - 1, c.tailTop - 2, 7, 2, D);
    if (t.aleron === 'grande' && !c.bed) { P.r(c.tailx + 1, c.tailTop - 4, 2, 4, '#2a2a30'); P.r(c.tailx - 3, c.tailTop - 6, 11, 2, C); P.r(c.tailx - 3, c.tailTop - 6, 11, 1, L); }
    if (c.spare) { for (let y = -4; y <= 4; y++) for (let x = -2; x <= 0; x++) if (Math.hypot(x * 1.8, y) <= 4.3) P.r(c.tailx - 1 + x, c.spare + y, 1, 1, y * y + x * x < 4 ? '#3a3a40' : '#16161a'); }
    P.r(c.nose - 3, c.hood[1] + 2, 3, 2, HL); P.r(c.tailx, c.tailTop + 1, 2, 3, '#e8302a');
    if (c.bull) { P.r(c.nose, c.hood[1] + 3, 2, 7, '#2a2a30'); }
    g.restore();
    for (const x of c.wheels) wheel(x, 28, c.wr, true);
  };

  // ---- perfiles de costado: puntos del contorno (de atrás a adelante), ventanillas, ruedas ----
  const side = (o) => o;
  VR.CAR_MODELS = {
    mita: { name: 'Mitã 1.3', desc: 'Compacto de 5 puertas: chico, gasolero y fácil de estacionar.', side: 'car', base: VR.drawCarBase,
      sideShape: { body: [[4, 27], [4, 18], [10, 15], [20, 7], [42, 6], [52, 15], [60, 17], [61, 26], [55, 27], [53, 23], [43, 23], [41, 27], [23, 27], [21, 23], [11, 23], [9, 27]],
        win: [[[21, 8.6], [32, 7.8], [32, 15], [14, 15]], [[34, 7.8], [41, 7.8], [49, 15], [34, 15]]], pillars: [33], yr: 6, rx0: 20, rx1: 42, belt: 15, sill: 27, doors: [33, 46], tailx: 4, tailTop: 17, nose: 61, hood: [52, 15], wheels: [16, 48], wr: 5 } },
    sedan: { len: 35, wid: 16, S: 40, acc: 168, turn: 2.5, max: { road: 245, stone: 205, dirt: 160, side: 145, grass: 105 },
      name: 'Porã 1.5', desc: 'Sedán familiar de 4 puertas con baúl grande: el de los remises y las familias.', side: 'sedan',
      base: VR.drawAuto({ L: 35, W: 16, hood: 8.4, ws: 4, roof: 10.4, rg: 3.6, fa: 0.2, ra: 0.74 }),
      sideShape: side({ body: [[3, 27], [3, 18], [12, 16], [21, 8], [38, 7], [47, 15], [60, 17], [61, 26], [55, 27], [53, 23], [43, 23], [41, 27], [22, 27], [20, 23], [10, 23], [8, 27]],
        win: [[[22, 9], [31, 8], [31, 15], [16, 15]], [[33, 8], [38, 8], [45, 15], [33, 15]]], pillars: [32], yr: 7, rx0: 22, rx1: 38, belt: 15, sill: 27, doors: [32, 44], tailx: 3, tailTop: 16, nose: 61, hood: [47, 15], wheels: [15, 48], wr: 5 }) },
    mono: { len: 31, wid: 16, S: 36, acc: 160, turn: 2.8, max: { road: 225, stone: 198, dirt: 165, side: 145, grass: 110 },
      name: "Ka'i 1.3", desc: 'Monovolumen chico de techo alto: entra todo y se estaciona en cualquier lado.', side: 'mono',
      base: VR.drawAuto({ L: 31, W: 16, hood: 5.6, ws: 5.4, roof: 13.4, rg: 2.6, fa: 0.19, ra: 0.79 }),
      sideShape: side({ body: [[4, 27], [4, 9], [8, 5], [36, 4], [48, 13], [59, 16], [60, 26], [54, 27], [52, 23], [42, 23], [40, 27], [21, 27], [19, 23], [9, 23], [7, 27]],
        win: [[[6, 7], [8, 6], [20, 6], [20, 14], [6, 14]], [[22, 6], [32, 6], [32, 14], [22, 14]], [[34, 5], [36, 5], [45, 14], [34, 14]]], pillars: [21, 33], yr: 4, rx0: 8, rx1: 36, belt: 14, sill: 27, doors: [21, 33], tailx: 4, tailTop: 12, nose: 60, hood: [48, 13], wheels: [14, 47], wr: 5 }) },
    pickup: { len: 41, wid: 18, S: 46, acc: 165, rev: 70, turn: 2.2, brake: 380, mass: 1.5, max: { road: 230, stone: 212, dirt: 205, side: 140, grass: 165 },
      name: 'Yvyty Cabina Doble', desc: 'Camioneta doble cabina con caja: anda en el barro, en el campo y en el centro.', side: 'pickup',
      base: VR.drawAuto({ L: 41, W: 18, hood: 9.6, ws: 3.6, roof: 9.6, rg: 1.4, fa: 0.19, ra: 0.77, box: true, bed: true, rollbar: true, tireL: 6.4, grille: '#3a3a40' }),
      sideShape: side({ body: [[2, 27], [2, 15], [27, 15], [27, 6], [42, 5], [47, 13], [61, 14], [62, 26], [56, 27], [54, 22], [43, 22], [41, 27], [20, 27], [18, 22], [7, 22], [5, 27]],
        win: [[[29, 7], [34, 7], [34, 13], [29, 13]], [[36, 6], [41, 6], [45, 13], [36, 13]]], pillars: [35], yr: 5, rx0: 27, rx1: 42, belt: 13, sill: 27, doors: [35, 46], tailx: 2, tailTop: 15, nose: 62, hood: [47, 13], bed: [3, 15, 27], rollbar: true, wheels: [12, 49], wr: 6 }) },
    suv: { len: 37, wid: 18, S: 42, acc: 175, rev: 70, turn: 2.4, brake: 400, mass: 1.4, max: { road: 235, stone: 214, dirt: 205, side: 140, grass: 168 },
      name: 'Jaguarete 3.2', desc: 'Todoterreno grande con rueda de auxilio atrás: no hay calle de tierra que lo pare.', side: 'suv',
      base: VR.drawAuto({ L: 37, W: 18, hood: 8.6, ws: 3.6, roof: 17.4, rg: 1.8, fa: 0.2, ra: 0.76, box: true, rails: true, spare: true, tireL: 6.4, scoop: true }),
      sideShape: side({ body: [[4, 27], [4, 6], [6, 4], [41, 4], [46, 12], [60, 13], [61, 26], [55, 27], [53, 22], [42, 22], [40, 27], [20, 27], [18, 22], [8, 22], [6, 27]],
        win: [[[6, 6], [16, 6], [16, 12], [6, 12]], [[18, 6], [28, 6], [28, 12], [18, 12]], [[30, 6], [40, 6], [44, 12], [30, 12]]], pillars: [17, 29], yr: 4, rx0: 6, rx1: 41, belt: 12, sill: 27, doors: [29, 44], tailx: 4, tailTop: 8, nose: 61, hood: [46, 12], rails: true, spare: 17, bull: true, wheels: [13, 48], wr: 6 }) },
    suvmed: { len: 35, wid: 17, S: 40, acc: 170, rev: 70, turn: 2.5, brake: 400, mass: 1.3, max: { road: 230, stone: 210, dirt: 200, side: 140, grass: 162 },
      name: 'Mborevi 2.7', desc: 'Todoterreno mediano de 5 puertas: firme en la ruta y en la tierra colorada.', side: 'suvmed',
      base: VR.drawAuto({ L: 35, W: 17, hood: 8.8, ws: 3.8, roof: 14.4, rg: 2.4, fa: 0.2, ra: 0.77, box: true, spare: true, spareC: true, tireL: 6 }),
      sideShape: side({ body: [[4, 27], [4, 8], [7, 5], [39, 5], [45, 13], [60, 14], [61, 26], [55, 27], [53, 22], [43, 22], [41, 27], [20, 27], [18, 22], [8, 22], [6, 27]],
        win: [[[7, 7], [18, 7], [18, 13], [6, 13]], [[20, 7], [29, 7], [29, 13], [20, 13]], [[31, 7], [38, 7], [43, 13], [31, 13]]], pillars: [19, 30], yr: 5, rx0: 7, rx1: 39, belt: 13, sill: 27, doors: [30, 43], tailx: 4, tailTop: 9, nose: 61, hood: [45, 13], spare: 18, wheels: [13, 48], wr: 6 }) },
    suvchico: { len: 28, wid: 16, S: 34, acc: 168, rev: 70, turn: 2.9, brake: 420, mass: 1.1, max: { road: 215, stone: 198, dirt: 195, side: 145, grass: 160 },
      name: 'Jaguarete Mirĩ', desc: 'Todoterreno chico de 3 puertas: corto, alto y guapo en la tierra.', side: 'suvchico',
      base: VR.drawAuto({ L: 28, W: 16, hood: 7.2, ws: 3.4, roof: 11.6, rg: 1.6, fa: 0.21, ra: 0.75, box: true, spare: true, doors3: true, tireL: 5.6, rails: true }),
      sideShape: side({ body: [[8, 27], [8, 7], [10, 5], [36, 5], [42, 13], [56, 14], [57, 26], [51, 27], [49, 22], [39, 22], [37, 27], [24, 27], [22, 22], [12, 22], [10, 27]],
        win: [[[10, 7], [20, 7], [20, 13], [10, 13]], [[22, 7], [35, 7], [40, 13], [22, 13]]], pillars: [21], yr: 5, rx0: 10, rx1: 36, belt: 13, sill: 27, doors: [21, 40], tailx: 8, tailTop: 9, nose: 57, hood: [42, 13], rails: true, spare: 18, wheels: [17, 44], wr: 6 }) },
    karumbe: { len: 40, wid: 14, S: 46, acc: 55, rev: 18, turn: 2.0, brake: 220, mass: 1, max: { road: 58, stone: 55, dirt: 55, side: 45, grass: 50 }, noLights: true, noFire: true, colors: [['#c8322a', '#8e1f1a', '#e4685c'], ['#2f5fa8', '#1e3f74', '#5c8ad0'], ['#3f7f4a', '#28552f', '#66a872'], ['#d8a02a', '#9c6f16', '#f0c45a']],
      name: 'Karumbe', desc: 'Carro de caballo: lento, pero llega a todos lados. Ojo con el caballo.', side: 'karumbe', base: VR.drawKarumbe },
  };
  // Camión de bomberos desde arriba: cabina, techo de la caja con escalera, devanadera de manguera y luces
  VR.drawBomba = (pal) => VR.vbase(21, 58, (T) => {
    const [C, D, L] = pal, g = T.g, W = 21, mid = 10.5, AL = ['#e8ecf2', '#9aa0aa', '#c8ccd4'];
    for (const y of [9, 40, 47]) { T.tire(-0.1, y - 3.4, 2.6, 6.8); T.tire(W - 2.5, y - 3.4, 2.6, 6.8); }
    T.rr(0.6, 0.3, W - 1.2, 14.4, [3, 3, 0.6, 0.6], T.hg(0.6, W - 0.6, [D, L, C, C, D]));              // cabina
    T.rr(1.6, 0.6, W - 3.2, 1.4, 0.4, '#2a2a30'); T.rr(1.4, 0.5, 3.4, 1.3, 0.4, '#fff4c0'); T.rr(W - 4.8, 0.5, 3.4, 1.3, 0.4, '#fff4c0');
    T.poly([[2.2, 2.6], [W - 2.2, 2.6], [W - 1.4, 5.6], [1.4, 5.6]], T.vg(2.6, 5.6, GL));                  // parabrisas
    T.rr(-0.6, 3.6, 1.6, 1.4, 0.4, '#1e1e22'); T.rr(W - 1, 3.6, 1.6, 1.4, 0.4, '#1e1e22');                 // espejos
    T.rr(2.2, 5.8, W - 4.4, 8.4, 1, T.hg(2.2, W - 2.2, [L, C, D]));                                         // techo de la cabina
    T.rr(3, 6.4, W - 6, 1.8, 0.6, '#26262c'); T.rr(3.4, 6.7, (W - 7) / 2, 1.2, 0.4, '#e8302a'); T.rr(mid + 0.3, 6.7, (W - 7) / 2, 1.2, 0.4, '#e8302a'); // luces
    T.rr(0.4, 15, W - 0.8, 42.6, 0.8, T.hg(0.4, W - 0.4, [D, C, L, C, D]));                                 // caja
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 18; y < 56; y += 6.5) g.fillRect(0.6, y, W - 1.2, 0.35);
    T.rr(2.4, 16.4, W - 4.8, 38, 0.6, '#5a5e66'); T.rr(3, 17, W - 6, 36.8, 0.4, '#6e727a');                   // techo de la caja
    T.line(5.2, 17.4, 5.2, 53, 0.8, AL[0]); T.line(W - 5.2, 17.4, W - 5.2, 53, 0.8, AL[0]);                 // escalera
    for (let y = 18.6; y < 53; y += 1.8) T.line(5.2, y, W - 5.2, y, 0.35, AL[2]);
    T.ell(mid, 26, 4, 3.2, '#2a2a30'); T.ell(mid, 26, 3.2, 2.5, '#c8322a'); T.ell(mid, 26, 1, 0.8, AL[1]);   // devanadera de manguera
    T.rr(mid - 1, 15.4, 2, 3.4, 0.6, AL[1]); T.ell(mid, 15.6, 1.2, 1.2, AL[0]);                              // monitor (cañón de agua)
    T.rr(1, 56.4, 4, 1.2, 0.4, '#d8302a'); T.rr(W - 5, 56.4, 4, 1.2, 0.4, '#d8302a');
  });

  // Unidades de emergencia: no salen al azar en el tránsito común (las manda la central) salvo alguna patrullera
  const WHITE = [['#f2f0ea', '#b9b6ae', '#ffffff']], ORANGE = [['#f0a018', '#b06e08', '#ffc850']], YELLOW = [['#f2c21a', '#b08a08', '#ffe06a']];
  Object.assign(VR.CAR_MODELS, {
    patrulla: { len: 35, wid: 16, S: 40, acc: 185, turn: 2.6, max: { road: 255, stone: 215, dirt: 175, side: 150, grass: 120 }, colors: WHITE, emer: 'policia', lights: ['255,40,40', '40,90,255'],
      name: 'Patrullera', desc: 'Sedán de la Policía con barra de luces. Robarla te sube dos estrellas.', side: 'patrulla',
      base: VR.drawAuto({ L: 35, W: 16, hood: 8.4, ws: 4, roof: 10.4, rg: 3.6, fa: 0.2, ra: 0.74, bar: ['#d8302a', '#2a5ad8'], stripe: '#1e3a8a' }) },
    policam: { len: 41, wid: 18, S: 46, acc: 175, rev: 70, turn: 2.3, brake: 400, mass: 1.6, max: { road: 240, stone: 220, dirt: 210, side: 145, grass: 170 }, colors: WHITE, emer: 'policia', lights: ['255,40,40', '40,90,255'],
      name: 'Camioneta de la Policía', desc: 'Doble cabina de la Policía: la que más patrulla la ciudad.', side: 'policam',
      base: VR.drawAuto({ L: 41, W: 18, hood: 9.6, ws: 3.6, roof: 9.6, rg: 1.4, fa: 0.19, ra: 0.77, box: true, bed: true, rollbar: true, tireL: 6.4, grille: '#3a3a40', bar: ['#d8302a', '#2a5ad8'], stripe: '#1e3a8a' }) },
    ambulancia: { len: 39, wid: 17, S: 44, acc: 170, rev: 60, turn: 2.4, brake: 400, mass: 1.4, max: { road: 235, stone: 205, dirt: 180, side: 140, grass: 140 }, colors: ORANGE, emer: 'ambulancia', lights: ['60,255,120', '255,40,40'],
      name: 'Ambulancia', desc: 'Furgón de los bomberos voluntarios. Con la sirena te abren paso.', side: 'ambulancia',
      base: VR.drawAuto({ L: 39, W: 17, hood: 5.8, ws: 4.2, roof: 26, rg: 0, fa: 0.17, ra: 0.8, box: true, bar: ['#3ad86a', '#d8302a'], bar2: true, stripe: '#c8241a', tireL: 6 }),
      sideShape: { body: [[3, 27], [3, 6], [5, 4], [44, 4], [52, 12], [60, 15], [61, 26], [55, 27], [53, 22], [43, 22], [41, 27], [20, 27], [18, 22], [8, 22], [6, 27]],
        win: [[[45, 6], [47, 6], [51, 12.5], [45, 12.5]], [[34, 6], [42, 6], [42, 12.5], [34, 12.5]]], pillars: [43], yr: 4, rx0: 5, rx1: 44, belt: 12.5, sill: 27, doors: [43, 33], tailx: 3, tailTop: 7, nose: 61, hood: [52, 12], wheels: [13, 48], wr: 5 } },
    bomba: { len: 58, wid: 21, S: 64, acc: 120, rev: 45, turn: 1.7, brake: 330, mass: 3.2, max: { road: 200, stone: 180, dirt: 165, side: 110, grass: 120 }, colors: YELLOW, emer: 'bomberos', lights: ['255,40,40', '255,255,255'],
      name: 'Camión de bomberos', desc: 'Camión bomba: largo, pesado y con cañón de agua. Mantené ACCIÓN para mojar.', side: 'bomba', base: VR.drawBomba },
  });
  VR.CAR_MODELS.patrulla.sideShape = { ...VR.CAR_MODELS.sedan.sideShape };
  VR.CAR_MODELS.policam.sideShape = { ...VR.CAR_MODELS.pickup.sideShape };
  // sorteo de auto: en el tránsito, a veces un karumbe; estacionados, no
  VR.pickCar = (rnd, parked) => {
    const r = rnd();
    if (!parked && r < 0.025) return 'karumbe';
    if (!parked && r < 0.055) return rnd() < 0.7 ? 'policam' : 'patrulla'; // alguna patrullera recorriendo
    const q = rnd();
    return q < 0.24 ? 'mita' : q < 0.42 ? 'sedan' : q < 0.56 ? 'mono' : q < 0.74 ? 'pickup' : q < 0.84 ? 'suv' : q < 0.93 ? 'suvmed' : 'suvchico';
  };
})();
