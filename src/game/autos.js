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
    if (c.flares) for (const y of [ta, tb]) { T.rr(x0 - 0.5, y - tl / 2 - 1, 1.4, tl + 2, 0.7, D); T.rr(x1 - 0.9, y - tl / 2 - 1, 1.4, tl + 2, 0.7, D); } // guardabarros anchos
    const pf = c.pinch || 0, pr = (c.pinch || 0) * 0.6;
    const bodyPath = () => { // trompa y cola redondeadas y más angostas (deportivos); si no, la caja de siempre
      g.beginPath(); g.moveTo(mid, 0.2);
      g.bezierCurveTo(x1 - pf, 0.2, x1, yH * 0.25, x1, yH * 0.7); g.lineTo(x1, Ln - 4);
      g.bezierCurveTo(x1, Ln - 0.6, x1 - pr, Ln - 0.3, mid, Ln - 0.3); g.bezierCurveTo(x0 + pr, Ln - 0.3, x0, Ln - 0.6, x0, Ln - 4);
      g.lineTo(x0, yH * 0.7); g.bezierCurveTo(x0, yH * 0.25, x0 + pf, 0.2, mid, 0.2); g.closePath();
    };
    if (pf) { bodyPath(); g.fillStyle = T.hg(x0, x1, [D, L, C, C, D]); g.fill(); g.save(); bodyPath(); g.clip(); }
    else T.rr(x0, 0.3, bw, Ln - 0.6, [rf, rf, c.box ? 1.6 : 3, c.box ? 1.6 : 3], T.hg(x0, x1, [D, L, C, C, D]));     // carrocería
    if (t.franja === 'costado') { g.fillStyle = S2; g.fillRect(x0 + 0.2, 3, 0.7, Ln - 6); g.fillRect(x1 - 0.9, 3, 0.7, Ln - 6); }
    // capó
    T.rr(x0 + 0.9, 1, bw - 1.8, yH - 0.8, [c.box ? 1.4 : 3.4, c.box ? 1.4 : 3.4, 1, 1], T.hg(x0, x1, [C, L, C, D]));
    T.line(mid - 2.6, 1.6, mid - 2.3, yH - 0.4, 0.25, VR.shadeHex(C, 0.82)); T.line(mid + 2.6, 1.6, mid + 2.3, yH - 0.4, 0.25, VR.shadeHex(C, 0.82));
    if (c.scoop === 'rally') { T.rr(mid - 2.4, yH * 0.42, 4.8, 2.6, [0.6, 0.6, 1.2, 1.2], VR.shadeHex(C, 0.75)); T.rr(mid - 1.9, yH * 0.42 + 0.4, 3.8, 1.1, 0.4, '#1a1a1e'); for (let x = mid - 1.5; x < mid + 1.7; x += 0.8) T.rr(x, yH * 0.42 + 0.5, 0.3, 0.9, 0, '#3a3a40'); } // toma de aire grande del rally
    else if (c.scoop) T.rr(mid - 1.6, yH * 0.45, 3.2, 1.6, 0.4, VR.shadeHex(C, 0.6));                            // toma de aire
    st(0.5, yH);
    T.ell(mid - 2.5, yH * 0.4, 1.6, 0.7, 'rgba(255,255,255,.35)');
    const hw = c.box ? 2.6 : 3;
    if (c.hl === 'quad') for (const s of [-1, 1]) { for (const dx of [3.2, 5.2]) { T.ell(mid + s * dx, 1.5 + (dx - 3.2) * 0.35, 0.95, 0.85, '#2a2a30'); T.ell(mid + s * dx, 1.5 + (dx - 3.2) * 0.35, 0.7, 0.62, HL); } } // cuatro faros redondos
    else if (c.hl === 'slant') for (const s of [-1, 1]) T.poly([[mid + s * 1.8, 1.3], [mid + s * 5.6, 0.9], [mid + s * (bw / 2 - 0.4), 2.6], [mid + s * (bw / 2 - 1), 3.3], [mid + s * 3, 2.1]], HL); // faros rasgados
    else if (c.hl === 'round') for (const s of [-1, 1]) { T.ell(mid + s * (bw / 2 - 2.2), 1.3, 1.25, 1.05, '#2a2a30'); T.ell(mid + s * (bw / 2 - 2.2), 1.3, 0.95, 0.8, HL); }
    else { T.rr(x0 + 0.8, 0.6, hw, 1.4, c.box ? 0.3 : 0.6, HL); T.rr(x1 - 0.8 - hw, 0.6, hw, 1.4, c.box ? 0.3 : 0.6, HL); }       // faros
    if (c.hl === 'quad') T.rr(mid - 1.6, 0.4, 3.2, 0.6, 0.3, '#2a2a30'); else if (c.hl === 'slant') { T.poly([[mid - 1.6, 0.6], [mid + 1.6, 0.6], [mid + 1, 1.6], [mid - 1, 1.6]], '#2a2a30'); T.rr(mid - 3.4, 0.25, 6.8, 0.6, 0.3, '#1e1e22'); }
    else T.rr(mid - 2.6, 0.35, 5.2, c.box ? 1.3 : 0.9, 0.3, c.grille || '#2a2a30');                            // parrilla
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
    if (!VR.oblOn()) for (let i = 0; i < nwin; i++) { const y = yW + 0.2 + i * wl; T.rr(x0 + 0.5, y, 1.2, wl - 0.4, 0.4, T.vg(y, y + wl, gl)); T.rr(x1 - 1.7, y, 1.2, wl - 0.4, 0.4, T.vg(y, y + wl, gl)); }
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
    if (c.tl === 'bar') { T.rr(x0 + 0.6, tail - 1.9, bw - 1.2, 1, 0.5, '#d8302a'); T.rr(x0 + 1.4, tail - 1.7, bw - 2.8, 0.3, 0.15, '#ff8a70'); }
    else if (c.tl === 'round') for (const s of [-1, 1]) for (const dx of [bw / 2 - 1.6, bw / 2 - 3.6]) { T.ell(mid + s * dx, tail - 1.6, 0.85, 0.8, '#2a2a30'); T.ell(mid + s * dx, tail - 1.6, 0.65, 0.6, dx > 5 ? '#e8302a' : '#f0a030'); }
    else if (c.tl === 'vertical') { T.rr(x0 + 0.2, tail - 5.6, 1.2, 5, 0.5, '#d8302a'); T.rr(x1 - 1.4, tail - 5.6, 1.2, 5, 0.5, '#d8302a'); }
    else { T.rr(x0 + 0.4, tail - 2.4, 2.2, 1.8, 0.5, '#d8302a'); T.rr(x1 - 2.6, tail - 2.4, 2.2, 1.8, 0.5, '#d8302a'); }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x0 + 0.1, yW + 0.4, 0.5, c.roof); g.fillRect(x1 - 0.6, yW + 0.4, 0.5, c.roof);
    if (t.aleron === 'chico' && !c.bed) { T.rr(x0 + 2.2, yG + 0.4, bw - 4.4, 1, 0.4, D); }
    if (pf) g.restore();
    if (c.lip && t.aleron !== 'grande') T.rr(x0 + 1.2, tail - 2.9, bw - 2.4, 0.9, 0.45, VR.shadeHex(C, 0.7));      // colita de pato integrada
    if ((t.aleron === 'grande' || (c.wing && t.aleron !== 'chico')) && !c.bed) { // alerón alto (de fábrica en el rally)
      T.rr(x0 + 2, tail - 4.4, 0.7, 2.4, 0.2, '#26262c'); T.rr(x1 - 2.7, tail - 4.4, 0.7, 2.4, 0.2, '#26262c');
      T.rr(x0 + 0.4, tail - 2.7, bw - 0.8, 1, 0.4, 'rgba(0,0,0,.4)'); T.rr(x0 - 0.5, tail - 4.9, bw + 1, 2.4, 0.7, VR.shadeHex(D, 0.6));
      T.rr(x0 - 0.2, tail - 4.6, bw + 0.4, 1.8, 0.6, T.hg(x0, x1, [D, L, C, D])); T.rr(x0 + 0.4, tail - 4.2, bw - 0.8, 0.35, 0.2, 'rgba(255,255,255,.35)'); }
    if (pf) { T.rr(-0.7 + x0, yH + 0.6, 1.4, 1.2, 0.4, D); T.rr(x1 - 0.7, yH + 0.6, 1.4, 1.2, 0.4, D); } // espejos (fuera del recorte)
  }, () => VR.OBL.car(c, pal, t), c.sx);

  // Karumbe (13/11/2026, con foto de Leandro de uno de Villarrica): coche de caballo de pasajeros, no una carreta:
  // caballo adelante, varas, pescante, caja de madera pintada, techo blanco sobre parantes y ruedas chicas de goma.
  // Desde arriba se ven el caballo y el techo; el carrero y las ventanas se ven en el costado (oblicuo.js).
  VR.drawKarumbe = (pal) => VR.vbase(13, 42, (T) => {
    const [C, D, L] = pal, HB = '#7a4a28', HD = '#55321a', HL = '#9a6438';
    T.line(4.6, 9, 3.4, 25, 0.5, '#4a3628'); T.line(8.4, 9, 9.6, 25, 0.5, '#4a3628');                       // varas
    T.tire(0, 32.6, 1.9, 4.8); T.tire(11.1, 32.6, 1.9, 4.8);                                               // las dos ruedas chicas de goma (un solo eje)
    T.ell(6.5, 2.4, 1.1, 2.4, T.hg(5.4, 7.6, [HL, HB, HD]));                                               // cabeza
    T.ell(5.7, 0.9, 0.35, 0.5, HD); T.ell(7.3, 0.9, 0.35, 0.5, HD);                                        // orejas
    T.ell(6.5, 9.4, 2.5, 5.6, T.hg(4, 9, [HL, HB, HB, HD]));                                               // lomo
    T.rr(6, 4, 1, 6.6, 0.5, '#2a1a10');                                                                     // crin
    T.rr(4.2, 6.4, 4.6, 0.9, 0.3, '#e8e6de'); T.rr(4.3, 11.6, 4.4, 0.8, 0.3, '#e8e6de');                    // pechera y cincha blancas
    T.ell(6.5, 16.2, 0.8, 1.7, '#2a1a10');                                                                  // cola
    T.line(5.6, 20.4, 5.9, 4.6, 0.16, '#3a2a1c'); T.line(7.4, 20.4, 7.1, 4.6, 0.16, '#3a2a1c');            // riendas
    T.rr(0.9, 20.2, 11.2, 21.8, 1.8, C);                                                                    // borde del techo (color de la caja)
    T.rr(1.3, 20.6, 10.4, 21, 1.4, T.hg(1.3, 11.7, ['#ffffff', '#f6f4ee', '#f6f4ee', '#c8c5bd']));        // techo blanco, con vuelo adelante
    for (const y of [27, 33.5, 39]) T.rr(1.5, y, 10, 0.25, 0, 'rgba(0,0,0,.09)');
    T.rr(2.6, 21.6, 4.2, 0.9, 0.4, 'rgba(255,255,255,.85)');
  }, () => VR.OBL.karumbe(pal));

  // Costado de los autos (64×36, frente a la derecha): perfil por puntos, ventanillas, ruedas y detalles
  VR.drawSideAuto = (m, pal, t = {}, P, g, wheel, HL, S2) => {
    const c = VR.CAR_MODELS[m].sideShape, [C, D, L] = pal, poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
    const GLS = t.polarizado == 2 ? '#14181e' : t.polarizado == 1 ? '#27323e' : '#3b4d63', CH = '#c8ccd4';
    if (m === 'karumbe') {
      const HB = '#7a4a28', HD = '#55321a', WH = '#f2f0ea';
      P.r(4, 15, 22, 8, C); P.r(4, 17, 22, 1, D); P.r(4, 20, 22, 1, D); P.r(4, 22, 22, 1, '#2a2a30');           // caja pintada
      P.r(4, 7, 22, 8, WH); P.r(6, 9, 8, 5, '#2c2420'); P.r(16, 9, 8, 5, '#2c2420'); P.r(7, 13, 16, 1, C);      // pared blanca con ventanas abiertas
      P.r(26, 8, 8, 15, '#2c2420'); P.r(27, 11, 3, 5, '#6a7a8a'); P.r(27, 8, 3, 3, '#c98b5c'); P.r(27, 7, 4, 1, '#2a3a5a'); P.r(28, 17, 6, 2, '#3a4a6a'); P.r(27, 18, 7, 2, C); // carrero en el pescante
      P.r(33, 6, 1, 17, WH); P.r(3, 4, 32, 2, WH); P.r(3, 6, 32, 1, C);                                       // parante y techo blanco con vuelo
      P.r(34, 19, 12, 1, '#5a4430');                                                                       // vara
      poly([[44, 12], [56, 11], [58, 13], [57, 19], [45, 19], [43, 16]], HB);                              // caballo
      poly([[55, 11], [59, 5], [62, 5], [63, 8], [60, 9], [58, 13]], HB); P.r(57, 5, 2, 5, '#2a1a10'); P.r(61, 4, 1, 2, HD);
      P.r(43, 13, 1, 6, '#2a1a10'); P.r(50, 12, 1, 7, WH);
      for (const [x, k] of [[45, 0], [47, 1], [54, 1], [56, 0]]) { P.r(x, 19, 2, 9 - k, k ? HD : HB); P.r(x, 28 - k, 2, 2, '#2a2420'); }
      for (const cx of [11]) for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const d = Math.hypot(x, y); if (d <= 4.3) P.r(cx + x, 26 + y, 1, 1, d > 2.2 ? '#1c1c1e' : d < 1 ? '#5a5e66' : '#b8bcc4'); }
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
    if (c.scoop) P.r(c.hood[0] + 3, c.hood[1] - 1, 5, 1, D);
    if (c.lip && t.aleron !== 'grande') P.r(c.tailx, c.tailTop - 1, 5, 1, D);
    if ((t.aleron === 'grande' || (c.wing && t.aleron !== 'chico')) && !c.bed) { P.r(c.tailx + 1, c.tailTop - 4, 2, 4, '#2a2a30'); P.r(c.tailx - 3, c.tailTop - 6, 11, 2, C); P.r(c.tailx - 3, c.tailTop - 6, 11, 1, L); }
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
      base: VR.drawAuto({ L: 35, W: 16, hood: 8.4, ws: 4, roof: 10.4, rg: 3.6, fa: 0.2, ra: 0.74, hl: 'slant', tl: 'bar', pinch: 1.2 }),
      sideShape: side({ body: [[3, 27], [3, 18], [12, 16], [21, 8], [38, 7], [47, 15], [60, 17], [61, 26], [55, 27], [53, 23], [43, 23], [41, 27], [22, 27], [20, 23], [10, 23], [8, 27]],
        win: [[[22, 9], [31, 8], [31, 15], [16, 15]], [[33, 8], [38, 8], [45, 15], [33, 15]]], pillars: [32], yr: 7, rx0: 22, rx1: 38, belt: 15, sill: 27, doors: [32, 44], tailx: 3, tailTop: 16, nose: 61, hood: [47, 15], wheels: [15, 48], wr: 5 }) },
    mono: { len: 31, wid: 16, S: 36, acc: 160, turn: 2.8, max: { road: 225, stone: 198, dirt: 165, side: 145, grass: 110 },
      name: "Ka'i 1.3", desc: 'Monovolumen chico de techo alto: entra todo y se estaciona en cualquier lado.', side: 'mono',
      base: VR.drawAuto({ hz: [7.8, 12.8], L: 31, W: 16, hood: 5.6, ws: 5.4, roof: 13.4, rg: 2.6, fa: 0.19, ra: 0.79, tl: 'vertical', pinch: 1.6 }),
      sideShape: side({ body: [[4, 27], [4, 9], [8, 5], [36, 4], [48, 13], [59, 16], [60, 26], [54, 27], [52, 23], [42, 23], [40, 27], [21, 27], [19, 23], [9, 23], [7, 27]],
        win: [[[6, 7], [8, 6], [20, 6], [20, 14], [6, 14]], [[22, 6], [32, 6], [32, 14], [22, 14]], [[34, 5], [36, 5], [45, 14], [34, 14]]], pillars: [21, 33], yr: 4, rx0: 8, rx1: 36, belt: 14, sill: 27, doors: [21, 33], tailx: 4, tailTop: 12, nose: 60, hood: [48, 13], wheels: [14, 47], wr: 5 }) },
    pickup: { len: 41, wid: 18, S: 46, acc: 165, rev: 70, turn: 2.2, brake: 380, mass: 1.5, max: { road: 230, stone: 212, dirt: 205, side: 140, grass: 165 },
      name: 'Yvyty Cabina Doble', desc: 'Camioneta doble cabina con caja: anda en el barro, en el campo y en el centro.', side: 'pickup',
      base: VR.drawAuto({ L: 41, W: 18, hood: 9.6, ws: 3.6, roof: 9.6, rg: 1.4, fa: 0.19, ra: 0.77, box: true, bed: true, rollbar: true, tireL: 6.4, grille: '#3a3a40' }),
      sideShape: side({ body: [[2, 27], [2, 15], [27, 15], [27, 6], [42, 5], [47, 13], [61, 14], [62, 26], [56, 27], [54, 22], [43, 22], [41, 27], [20, 27], [18, 22], [7, 22], [5, 27]],
        win: [[[29, 7], [34, 7], [34, 13], [29, 13]], [[36, 6], [41, 6], [45, 13], [36, 13]]], pillars: [35], yr: 5, rx0: 27, rx1: 42, belt: 13, sill: 27, doors: [35, 46], tailx: 2, tailTop: 15, nose: 62, hood: [47, 13], bed: [3, 15, 27], rollbar: true, wheels: [12, 49], wr: 6 }) },
    suv: { len: 37, wid: 18, S: 42, acc: 175, rev: 70, turn: 2.4, brake: 400, mass: 1.4, max: { road: 235, stone: 214, dirt: 205, side: 140, grass: 168 },
      name: 'Jaguarete 3.2', desc: 'Todoterreno grande con rueda de auxilio atrás: no hay calle de tierra que lo pare.', side: 'suv',
      base: VR.drawAuto({ L: 37, W: 18, hood: 8.6, ws: 3.6, roof: 17.4, rg: 1.8, fa: 0.2, ra: 0.76, box: true, rails: true, spare: true, tireL: 6.4, scoop: true, tl: 'vertical', flares: true }),
      sideShape: side({ body: [[4, 27], [4, 6], [6, 4], [41, 4], [46, 12], [60, 13], [61, 26], [55, 27], [53, 22], [42, 22], [40, 27], [20, 27], [18, 22], [8, 22], [6, 27]],
        win: [[[6, 6], [16, 6], [16, 12], [6, 12]], [[18, 6], [28, 6], [28, 12], [18, 12]], [[30, 6], [40, 6], [44, 12], [30, 12]]], pillars: [17, 29], yr: 4, rx0: 6, rx1: 41, belt: 12, sill: 27, doors: [29, 44], tailx: 4, tailTop: 8, nose: 61, hood: [46, 12], rails: true, spare: 17, bull: true, wheels: [13, 48], wr: 6 }) },
    suvmed: { len: 35, wid: 17, S: 40, acc: 170, rev: 70, turn: 2.5, brake: 400, mass: 1.3, max: { road: 230, stone: 210, dirt: 200, side: 140, grass: 162 },
      name: 'Mborevi 2.7', desc: 'Todoterreno mediano de 5 puertas: firme en la ruta y en la tierra colorada.', side: 'suvmed',
      base: VR.drawAuto({ L: 35, W: 17, hood: 8.8, ws: 3.8, roof: 14.4, rg: 2.4, fa: 0.2, ra: 0.77, box: true, spare: true, spareC: true, tireL: 6, tl: 'vertical', hl: 'slant' }),
      sideShape: side({ body: [[4, 27], [4, 8], [7, 5], [39, 5], [45, 13], [60, 14], [61, 26], [55, 27], [53, 22], [43, 22], [41, 27], [20, 27], [18, 22], [8, 22], [6, 27]],
        win: [[[7, 7], [18, 7], [18, 13], [6, 13]], [[20, 7], [29, 7], [29, 13], [20, 13]], [[31, 7], [38, 7], [43, 13], [31, 13]]], pillars: [19, 30], yr: 5, rx0: 7, rx1: 39, belt: 13, sill: 27, doors: [30, 43], tailx: 4, tailTop: 9, nose: 61, hood: [45, 13], spare: 18, wheels: [13, 48], wr: 6 }) },
    suvchico: { len: 28, wid: 16, S: 34, acc: 168, rev: 70, turn: 2.9, brake: 420, mass: 1.1, max: { road: 215, stone: 198, dirt: 195, side: 145, grass: 160 },
      name: 'Jaguarete Mirĩ', desc: 'Todoterreno chico de 3 puertas: corto, alto y guapo en la tierra.', side: 'suvchico',
      base: VR.drawAuto({ hz: [8.4, 13.4], L: 28, W: 16, hood: 7.2, ws: 3.4, roof: 11.6, rg: 1.6, fa: 0.21, ra: 0.75, box: true, spare: true, doors3: true, tireL: 5.6, rails: true, hl: 'round', flares: true }),
      sideShape: side({ body: [[8, 27], [8, 7], [10, 5], [36, 5], [42, 13], [56, 14], [57, 26], [51, 27], [49, 22], [39, 22], [37, 27], [24, 27], [22, 22], [12, 22], [10, 27]],
        win: [[[10, 7], [20, 7], [20, 13], [10, 13]], [[22, 7], [35, 7], [40, 13], [22, 13]]], pillars: [21], yr: 5, rx0: 10, rx1: 36, belt: 13, sill: 27, doors: [21, 40], tailx: 8, tailTop: 9, nose: 57, hood: [42, 13], rails: true, spare: 18, wheels: [17, 44], wr: 6 }) },
    // Deportivos (Leandro, 05/11/2026, pidió un sedán de rally turbo y un coupé deportivo de los 90-2000 que se ven
    // en la calle): como siempre, la categoría con diseño propio y nombre inventado, no la copia del modelo.
    rally: { len: 35, wid: 17, S: 40, acc: 215, rev: 70, turn: 2.8, brake: 440, mass: 1.05, max: { road: 275, stone: 245, dirt: 235, side: 150, grass: 185 },
      colors: [['#1f4fa8', '#13336e', '#4f80d8'], ['#eceae4', '#a8a59e', '#ffffff'], ['#c8322a', '#8e1f1a', '#e4685c'], ['#26262c', '#141418', '#4a4a54'], ['#a8acb4', '#70747c', '#d4d8e0']],
      name: 'Mbarakaja Turbo', desc: 'Sedán de rally con tracción en las cuatro: toma de aire en el capó, alerón alto y guapo en la tierra.', side: 'rally',
      base: VR.drawAuto({ L: 35, W: 17, hood: 9, ws: 4, roof: 10, rg: 3.4, fa: 0.2, ra: 0.75, hl: 'slant', tl: 'round', scoop: 'rally', wing: true, flares: true, pinch: 1.4, tireL: 5.8 }),
      sideShape: side({ body: [[3, 27], [3, 18], [12, 16], [21, 9], [37, 8], [46, 15], [60, 17], [61, 26], [55, 27], [53, 23], [43, 23], [41, 27], [22, 27], [20, 23], [10, 23], [8, 27]],
        win: [[[22, 10], [31, 9], [31, 15], [16, 15]], [[33, 9], [37, 9], [44, 15], [33, 15]]], pillars: [32], yr: 8, rx0: 22, rx1: 37, belt: 15, sill: 27, doors: [32, 44], tailx: 3, tailTop: 16, nose: 61, hood: [46, 15], wheels: [15, 48], wr: 5, wing: true, scoop: true }) },
    coupe: { len: 34, wid: 17, S: 40, acc: 205, rev: 70, turn: 3.0, brake: 440, mass: 0.95, max: { road: 270, stone: 215, dirt: 170, side: 150, grass: 120 },
      colors: [['#d0302a', '#8e1f1a', '#f06a5c'], ['#e8c02a', '#a8820e', '#f8dc6a'], ['#26262c', '#141418', '#4a4a54'], ['#eceae4', '#a8a59e', '#ffffff'], ['#a8acb4', '#70747c', '#d4d8e0']],
      name: 'Panambi GT', desc: 'Coupé deportivo de dos puertas, bajito, con cuatro faros redondos y luneta larga: dobla como pocos.', side: 'coupe',
      base: VR.drawAuto({ hz: [6.6, 10.2], L: 34, W: 17, hood: 10.5, ws: 4.6, roof: 6.4, rg: 7, fa: 0.21, ra: 0.76, hl: 'quad', tl: 'bar', pinch: 2.4, lip: true, doors3: true }),
      sideShape: side({ body: [[3, 26], [3, 19], [8, 17], [14, 15], [27, 9], [37, 8], [46, 15], [60, 18], [61, 25], [55, 26], [53, 22], [43, 22], [41, 26], [22, 26], [20, 22], [10, 22], [8, 26]],
        win: [[[20, 13], [27, 10.5], [33, 10.5], [33, 15], [18, 15]], [[35, 9.5], [37, 9.5], [44, 15], [35, 15]]], pillars: [34], yr: 8, rx0: 27, rx1: 37, belt: 15, sill: 26, doors: [24, 45], tailx: 3, tailTop: 17, nose: 61, hood: [46, 15], wheels: [15, 48], wr: 5, lip: true }) },
    karumbe: { len: 42, wid: 13, S: 48, acc: 55, rev: 18, turn: 2.0, brake: 220, mass: 1, max: { road: 58, stone: 55, dirt: 55, side: 45, grass: 50 }, noLights: true, noFire: true, colors: [['#3a9ad0', '#256a96', '#78c4ec'], ['#e0541c', '#a83a10', '#f08048'], ['#c8322a', '#8e1f1a', '#e4685c'], ['#2f5fa8', '#1e3f74', '#5c8ad0'], ['#3f7f4a', '#28552f', '#66a872'], ['#d8a02a', '#9c6f16', '#f0c45a']],
      name: 'Karumbe', desc: 'Coche de caballo con techo: el taxi de siempre de Villarrica. Lento, pero llega.', side: 'karumbe', base: VR.drawKarumbe },
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
  }, () => VR.OBL.bomba(pal));

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
      base: VR.drawAuto({ hz: [9, 17], L: 39, W: 17, hood: 5.8, ws: 4.2, roof: 26, rg: 0, fa: 0.17, ra: 0.8, box: true, bar: ['#3ad86a', '#d8302a'], bar2: true, stripe: '#c8241a', tireL: 6 }),
      sideShape: { body: [[3, 27], [3, 6], [5, 4], [44, 4], [52, 12], [60, 15], [61, 26], [55, 27], [53, 22], [43, 22], [41, 27], [20, 27], [18, 22], [8, 22], [6, 27]],
        win: [[[45, 6], [47, 6], [51, 12.5], [45, 12.5]], [[34, 6], [42, 6], [42, 12.5], [34, 12.5]]], pillars: [43], yr: 4, rx0: 5, rx1: 44, belt: 12.5, sill: 27, doors: [43, 33], tailx: 3, tailTop: 7, nose: 61, hood: [52, 12], wheels: [13, 48], wr: 5 } },
    bomba: { len: 58, wid: 21, S: 64, acc: 120, rev: 45, turn: 1.7, brake: 330, mass: 3.2, max: { road: 200, stone: 180, dirt: 165, side: 110, grass: 120 }, colors: YELLOW, emer: 'bomberos', lights: ['255,40,40', '255,255,255'],
      name: 'Camión de bomberos', desc: 'Camión bomba: largo, pesado y con cañón de agua. Mantené ACCIÓN para mojar.', side: 'bomba', base: VR.drawBomba },
  });
  VR.CAR_MODELS.patrulla.sideShape = { ...VR.CAR_MODELS.sedan.sideShape };
  VR.CAR_MODELS.policam.sideShape = { ...VR.CAR_MODELS.pickup.sideShape };

  // ---------- Colectivos (10/11/2026, pedido de Leandro con fotos) ----------
  // Dos colectivos con la pintura de dos empresas de la zona, reconocibles por los colores y la silueta; sin logos,
  // letras ni nombres de empresa (regla del proyecto) y con nombres de modelo inventados:
  //   indep    colectivo urbano: blanco con franjas verde, roja y amarilla, trompa verde
  //   guairena micro de larga distancia: blanco con franjas amarilla, naranja y azul, trompa roja, espejos rojos
  // Desde arriba se ve el techo: la pintura va en la trompa, en el borde de los costados y en franjas en diagonal
  // sobre el techo de atrás; el dibujo de costado completo (tarjeta) está en sidehd.js.
  const BUS_GL = ['#1b2634', '#2c3e54', '#8fb0cc'], BUS_DARK = ['#0c1018', '#161e28', '#34404e'];
  VR.drawBus = (c) => (pal, t = {}) => VR.vbase(c.W, c.L, (T) => {
    const [C, D, L] = pal, g = T.g, W = c.W, Ln = c.L, x0 = 0.9, x1 = W - 0.9, bw = x1 - x0, mid = W / 2, urban = c.kind === 'urban', K = c.liv;
    const fb = 2.8, yW0 = fb, yW1 = fb + c.ws, yR0 = yW1 + 0.3, yR1 = Ln - (urban ? 6.6 : 4.2), rl = yR1 - yR0, rf = urban ? 2.4 : 3.8;
    for (const y of c.axles) { T.tire(-0.1, y - 3.7, 2.4, 7.4); T.tire(W - 2.3, y - 3.7, 2.4, 7.4); }       // ruedas
    T.rr(x0, 0.3, bw, Ln - 0.6, [rf, rf, 1.6, 1.6], T.hg(x0, x1, [D, L, C, C, D]));                           // carrocería
    g.fillStyle = K.edge; g.fillRect(x0, yW1, 0.7, Ln - yW1 - 2); g.fillRect(x1 - 0.7, yW1, 0.7, Ln - yW1 - 2); // pintura del borde del costado
    T.rr(x0 + 0.2, 0.3, bw - 0.4, fb - 0.2, [rf, rf, 0.3, 0.3], T.hg(x0, x1, [K.front[1], K.front[0], K.front[0], K.front[1]])); // trompa de color
    if (urban) {                                                                                               // faros y parrilla
      T.rr(x0 + 0.7, 0.7, 2.6, 1.5, 0.6, '#fff4c0'); T.rr(x1 - 3.3, 0.7, 2.6, 1.5, 0.6, '#fff4c0');
      T.rr(mid - 3, 0.5, 6, 1.4, 0.4, '#26262c'); T.rr(mid - 1.6, 0.9, 3.2, 0.9, 0.2, '#f2f0ea');
    } else {
      T.poly([[x0 + 0.8, 1.6], [x0 + 4.4, 0.7], [x0 + 4.4, 2], [x0 + 0.9, 2.5]], '#e6f2ff'); T.poly([[x1 - 0.8, 1.6], [x1 - 4.4, 0.7], [x1 - 4.4, 2], [x1 - 0.9, 2.5]], '#e6f2ff');
      T.rr(mid - 2.8, 0.9, 5.6, 1.2, 0.4, '#2a2a30'); T.rr(mid - 1.5, 1, 3, 0.9, 0.2, '#f2f0ea');
    }
    T.poly([[x0 + 1.1, yW0], [x1 - 1.1, yW0], [x1 - 0.5, yW1], [x0 + 0.5, yW1]], T.vg(yW0, yW1, BUS_GL));     // parabrisas
    T.poly([[x0 + 3, yW0 + 0.5], [x0 + 5.4, yW0 + 0.5], [x0 + 3.6, yW1 - 0.4], [x0 + 1.6, yW1 - 0.4]], 'rgba(255,255,255,.28)');
    if (urban) T.line(mid, yW0, mid, yW1, 0.5, '#e8e6e0');
    T.rr(mid - 3.6, yW0 + 0.35, 7.2, 1.2, 0.3, urban ? '#ffb030' : '#dff0ff');                                 // cartel de destino
    T.rr(x0 + 1.6, yR0, bw - 3.2, rl, 1.6, T.hg(x0, x1, [D, C, L, C, D]));                                     // techo
    if (!VR.oblOn()) for (const sx of [x0 + 0.7, x1 - 1.8]) {                                                  // ventanillas (en la vista oblicua van en el costado)
      T.rr(sx, yR0 + 0.2, 1.1, rl - 0.4, 0.4, T.vg(yR0, yR1, urban ? BUS_GL : BUS_DARK));
      g.fillStyle = C; for (let y = yR0 + c.pitch; y < yR1 - 2; y += c.pitch) g.fillRect(sx - 0.2, y, 1.5, 0.45);
    }
    if (urban) for (const f of [0.3, 0.62]) { T.rr(mid - 2.9, yR0 + rl * f - 0.3, 5.8, 3.8, 0.7, '#9aa0aa'); T.rr(mid - 2.6, yR0 + rl * f, 5.2, 3.2, 0.5, '#dfe3ea'); } // ventilaciones
    else { // aire acondicionado del micro
      const ay = yR0 + rl * 0.34; T.rr(mid - 3.6, ay, 7.2, 12.6, 2, '#8a909a'); T.rr(mid - 3.2, ay + 0.4, 6.4, 11.8, 1.6, T.hg(mid - 3.2, mid + 3.2, ['#aab0ba', '#e6eaf0', '#c4c9d2']));
      g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = ay + 2; y < ay + 11; y += 1.6) g.fillRect(mid - 2.6, y, 5.2, 0.35);
    }
    g.save(); g.beginPath(); g.roundRect(x0 + 1.6, yR0, bw - 3.2, rl, 1.6); g.clip();                          // franjas en diagonal sobre el techo
    for (const [dy, h, col] of K.swoosh) T.poly([[x0 + 1.6, yR0 + rl * 0.7 + dy + 4.4], [x1 - 1.6, yR0 + rl * 0.7 + dy], [x1 - 1.6, yR0 + rl * 0.7 + dy + h], [x0 + 1.6, yR0 + rl * 0.7 + dy + 4.4 + h]], col);
    g.restore();
    if (urban) {                                                                                               // motor atrás, paragolpes, luces
      T.rr(x0 + 2, yR1 + 0.5, bw - 4, 4.2, 0.6, '#c8ccd4'); g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = yR1 + 1.2; y < yR1 + 4.4; y += 0.9) g.fillRect(x0 + 2.4, y, bw - 4.8, 0.3);
      T.rr(x0 + 0.2, Ln - 2.4, bw - 0.4, 2, [0.3, 0.3, 1.6, 1.6], '#2a2a2e'); T.rr(x0 + 0.5, Ln - 5.8, 1.3, 3.6, 0.5, '#d8302a'); T.rr(x1 - 1.8, Ln - 5.8, 1.3, 3.6, 0.5, '#d8302a'); T.rr(mid - 1.8, Ln - 2, 3.6, 1, 0.2, '#f2f0ea');
    } else {
      T.rr(x0 + 1.8, yR1 + 0.4, bw - 3.6, 2.2, 0.6, '#10161e'); T.rr(x0 + 0.2, Ln - 2.8, bw - 0.4, 2.4, [0.3, 0.3, 1.6, 1.6], '#2a2f8c');
      T.rr(x0 + 0.6, Ln - 2.6, 3.4, 1.2, 0.5, '#d8302a'); T.rr(x1 - 4, Ln - 2.6, 3.4, 1.2, 0.5, '#d8302a'); T.rr(mid - 1.6, Ln - 2.2, 3.2, 0.9, 0.2, '#f2f0ea');
    }
    for (const sx of urban ? [-0.1, W - 2.1] : [-0.1, W - 2.9]) {                                              // espejos grandes
      if (urban) T.rr(sx, 3.4, 2.2, 3.8, 0.8, K.mirror); else { T.rr(sx, 2.6, 3, 4.2, 1.3, K.mirror); T.rr(sx + 0.4, 3, 1, 2.4, 0.5, 'rgba(255,255,255,.35)'); }
    }
  }, () => VR.OBL.bus(c, pal));
  const BUS_INDEP = { kind: 'urban', L: 66, W: 19, ws: 4.2, axles: [14, 50], pitch: 5.6,
    liv: { edge: '#1f8a3c', front: ['#1f8a3c', '#14662a'], swoosh: [[0, 2.6, '#1f8a3c'], [3.4, 1.8, '#d02a26'], [5.8, 1.3, '#f0c828']], mirror: '#1e1e22' } };
  const BUS_GUAI = { kind: 'coach', L: 76, W: 20, ws: 5.4, axles: [17, 58], pitch: 6.2,
    liv: { edge: '#f4b81c', front: ['#c4262e', '#8e1a20'], swoosh: [[0, 2.4, '#2a2f8c'], [3.2, 1.8, '#ee7a14'], [5.4, 2.6, '#f4b81c']], mirror: '#c4262e' } };
  Object.assign(VR.CAR_MODELS, {
    // bus: true → el tránsito los usa solo en calles anchas, giran más despacio, van un poco más lento y vienen con bocina grave
    indep: { len: 66, wid: 19, S: 72, acc: 105, rev: 40, turn: 1.45, brake: 320, mass: 3.6, max: { road: 185, stone: 165, dirt: 150, side: 105, grass: 110 }, bus: true, aiTurn: 0.6, cruiseK: 0.85, colors: WHITE,
      name: 'Colectivo Tape Rupi', desc: 'Colectivo urbano de franjas verde, roja y amarilla. Largo y pesado.', side: 'busindep', base: VR.drawBus(BUS_INDEP) },
    guairena: { len: 76, wid: 20, S: 82, acc: 95, rev: 38, turn: 1.3, brake: 300, mass: 4.2, max: { road: 215, stone: 170, dirt: 140, side: 100, grass: 100 }, bus: true, aiTurn: 0.55, cruiseK: 0.9, colors: WHITE,
      name: 'Micro Tape Guasu', desc: 'Micro de larga distancia a Asunción. Enorme, pesado y de trompa roja.', side: 'busguai', base: VR.drawBus(BUS_GUAI) },
  });

  // sorteo de auto: en el tránsito, a veces un karumbe; estacionados, no. roadW = ancho de la calle en px
  // (los colectivos solo salen en calles de 5 baldosas o más: avenidas y calles principales)
  VR.pickCar = (rnd, parked, roadW = 0) => {
    if (!parked && roadW >= 4 * VR.TILE - 1) { const b = rnd(); if (b < (roadW >= 5 * VR.TILE - 1 ? 0.07 : 0.03)) return rnd() < (roadW >= 6 * VR.TILE - 1 ? 0.55 : 0.3) ? 'guairena' : 'indep'; }
    const r = rnd();
    if (!parked && r < 0.025) return 'karumbe';
    if (!parked && r < 0.055) return rnd() < 0.7 ? 'policam' : 'patrulla'; // alguna patrullera recorriendo
    const sp = rnd(); if (sp < 0.06) return sp < 0.03 ? 'rally' : 'coupe'; // deportivos: pocos
    const q = rnd();
    return q < 0.24 ? 'mita' : q < 0.42 ? 'sedan' : q < 0.56 ? 'mono' : q < 0.74 ? 'pickup' : q < 0.84 ? 'suv' : q < 0.93 ? 'suvmed' : 'suvchico';
  };
})();
