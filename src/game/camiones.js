// Camiones (10/11/2026, pedido de Leandro con fotos): la categoría de los que se ven en Villarrica, con diseño propio,
// sin marcas ni logos ni letras (regla del proyecto) y nombres inventados:
//   camchata / camcarpa / camfurgon   camión liviano de cabina adelantada (chata, baranda con carpa negra, furgón)
//   camvolcador                       volcador de tres ejes (amarillo o rojo)
//   camtractor                        tractor con semirremolque granelero de lona (rojo, azul o blanco)
// Desde arriba se ve el techo de la cabina y la carga; el dibujo de costado (tarjeta) está en sidehd.js.
// Los livianos andan por cualquier calle; el volcador (5 baldosas) y el tractor (6) solo por las anchas (big + minW). Giran
// más despacio y no se tunean (como los colectivos).
'use strict';
(() => {
  const WHITE = [['#f2f0ea', '#b9b6ae', '#ffffff']], YELLOW = [['#f2c21a', '#b08a08', '#ffe06a']];
  const RED = ['#c8281e', '#8a1810', '#e85040'], BLUE = ['#2a4fa8', '#1a3274', '#5a82d8'], WHT = ['#f2f0ea', '#b9b6ae', '#ffffff'];
  const GL = ['#1b2634', '#2c3e54', '#8fb0cc'];

  // c: kind (flat, tarp, box, dump, grain), W, L, cab (largo de la cabina), ws (parabrisas), axles
  VR.drawTruck = (c) => (pal, t = {}) => VR.vbase(c.W, c.L, (T) => {
    const [C, D, L] = pal, g = T.g, W = c.W, Ln = c.L, x0 = 0.9, x1 = W - 0.9, bw = x1 - x0, mid = W / 2, cl = c.cab;
    const heavy = c.kind === 'dump' || c.kind === 'grain';
    for (const y of c.axles) { T.tire(-0.1, y - 3.5, 2.5, 7); T.tire(W - 2.4, y - 3.5, 2.5, 7); }              // ruedas
    T.rr(x0 + 2.4, cl - 2, bw - 4.8, Ln - cl + 1.4, 0.8, '#232327');                                              // chasis
    const cy0 = c.kind === 'grain' ? cl + 4 : cl + 0.8, ce = Ln - 0.5, cLen = ce - cy0;
    if (c.kind === 'flat') {                                                                                     // chata: plataforma con bordes bajos
      T.rr(x0, cy0, bw, cLen, 0.8, T.hg(x0, x1, ['#7e828a', '#b4b8c0', '#7e828a']));
      g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = cy0 + 2.4; y < ce - 1.6; y += 2.4) g.fillRect(x0 + 1.4, y, bw - 2.8, 0.3);
      T.rr(x0, cy0, 1.5, cLen, 0.5, WHT[0]); T.rr(x1 - 1.5, cy0, 1.5, cLen, 0.5, WHT[0]); T.rr(x0, ce - 1.5, bw, 1.5, 0.5, WHT[0]); T.rr(x0, cy0, bw, 1.3, 0.5, WHT[1]);
      g.fillStyle = '#2a4fa8'; g.fillRect(x0, cy0 + cLen * 0.5, 1.5, 0.7); g.fillRect(x1 - 1.5, cy0 + cLen * 0.5, 1.5, 0.7);
    } else if (c.kind === 'tarp') {                                                                              // baranda azul y blanca con carpa negra
      T.rr(x0, cy0, bw, cLen, 1, T.hg(x0, x1, [WHT[1], WHT[0], WHT[2], WHT[0], WHT[1]]));
      T.rr(x0, cy0, 0.9, cLen, 0.3, '#2a4fa8'); T.rr(x1 - 0.9, cy0, 0.9, cLen, 0.3, '#2a4fa8');
      T.rr(x0 + 1.2, cy0 + 0.6, bw - 2.4, cLen - 1.4, 2.6, T.hg(x0, x1, ['#08080b', '#2c2c34', '#4a4a56', '#2c2c34', '#08080b']));
      g.strokeStyle = 'rgba(160,160,175,.35)'; g.lineWidth = 0.35; for (let y = cy0 + 5; y < ce - 2; y += 6.4) { g.beginPath(); g.moveTo(x0 + 1.4, y); g.quadraticCurveTo(mid, y - 0.8, x1 - 1.4, y); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(mid - 3.6, cy0 + 1.6, 1.4, cLen - 3.6);
    } else if (c.kind === 'box') {                                                                               // furgón blanco con franja azul
      T.rr(x0 - 0.2, cy0 - 0.4, bw + 0.4, cLen + 0.4, 1.2, T.hg(x0, x1, [WHT[1], WHT[0], WHT[2], WHT[0], WHT[1]]));
      g.fillStyle = '#2a4fa8'; g.fillRect(mid - 1.8, cy0 + 0.8, 3.6, cLen - 1.6);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(mid - 0.3, cy0 + 0.8, 0.6, cLen - 1.6);
      T.rr(x0 + 1.4, cy0 + cLen * 0.55, 3.6, 3.2, 0.5, '#dfe3ea'); T.rr(x1 - 5, cy0 + cLen * 0.25, 3.6, 3.2, 0.5, '#dfe3ea');
      g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(x0 + 0.3, ce - 2); g.lineTo(x1 - 0.3, ce - 2); g.stroke();
    } else if (c.kind === 'dump') {                                                                              // volcador: caja con costillas
      T.rr(x0 - 0.3, cy0, bw + 0.6, cLen, 1, T.hg(x0, x1, [D, C, L, C, D]));
      T.rr(x0 + 1.5, cy0 + 2.4, bw - 3, cLen - 3.6, 0.6, T.hg(x0, x1, ['#2a2418', '#4a4030', '#2a2418']));
      g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = cy0 + 6; y < ce - 3; y += 5) g.fillRect(x0 + 1.5, y, bw - 3, 0.4);
      g.fillStyle = L; for (let y = cy0 + 4; y < ce - 3; y += 5) { g.fillRect(x0 - 0.3, y, 1.1, 1.3); g.fillRect(x1 - 0.8, y, 1.1, 1.3); }
      T.rr(x0 - 0.3, ce - 2, bw + 0.6, 2, 0.5, D);                                                               // compuerta
    } else {                                                                                                     // granelero: semirremolque con lona
      T.rr(x0 + 3, cl - 1, bw - 6, 7, 0.6, '#1c1c20'); T.rr(mid - 2.6, cl + 0.6, 5.2, 3.6, 1.4, '#6a6e76');    // quinta rueda
      T.rr(x0, cy0, bw, cLen, 1.8, T.hg(x0, x1, [D, C, L, C, D]));
      g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 0.45; for (let y = cy0 + 3.6; y < ce - 1.5; y += 4.4) { g.beginPath(); g.moveTo(x0 + 0.6, y); g.quadraticCurveTo(mid, y - 0.6, x1 - 0.6, y); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(mid - 3.4, cy0 + 1.4, 2, cLen - 2.8);
      g.fillStyle = D; g.fillRect(x0, cy0, 1, cLen); g.fillRect(x1 - 1, cy0, 1, cLen);
      T.rr(x0 + 1.4, ce - 1.4, 2.8, 1.2, 0.4, '#d8302a'); T.rr(x1 - 4.2, ce - 1.4, 2.8, 1.2, 0.4, '#d8302a');   // luces
    }
    // cabina adelantada
    const fb = 2.2, yW1 = fb + c.ws;
    T.rr(x0, 0.2, bw, cl, [3.4, 3.4, 1.4, 1.4], T.hg(x0, x1, [D, L, C, C, D]));
    T.rr(x0 + 0.2, 0.2, bw - 0.4, fb, [3.4, 3.4, 0.3, 0.3], T.hg(x0, x1, [D, C, C, D]));
    T.rr(x0 + 0.5, 0, bw - 1, 1, 0.5, '#26262c');                                                                // paragolpes
    T.rr(x0 + 0.8, 0.9, 2.8, 1.5, 0.6, '#fff4c0'); T.rr(x1 - 3.6, 0.9, 2.8, 1.5, 0.6, '#fff4c0'); T.rr(mid - 2.6, 0.9, 5.2, 1.3, 0.4, '#2a2a30'); // faros y parrilla
    T.poly([[x0 + 1.1, fb], [x1 - 1.1, fb], [x1 - 0.5, yW1], [x0 + 0.5, yW1]], T.vg(fb, yW1, GL));             // parabrisas
    T.poly([[x0 + 3, fb + 0.4], [x0 + 5.6, fb + 0.4], [x0 + 3.8, yW1 - 0.4], [x0 + 1.6, yW1 - 0.4]], 'rgba(255,255,255,.28)');
    T.rr(x0 + 1, yW1 + 0.3, bw - 2, cl - yW1 - 1.6, 1.6, T.hg(x0, x1, [D, C, L, C, D]));                         // techo
    if (heavy) { T.rr(x0 + 1.6, yW1 + 1.4, bw - 3.2, 2.4, 0.8, L); T.rr(mid - 3.4, yW1 + 5, 6.8, 2.6, 1, D); }   // deflector y baliza
    else { T.rr(mid - 2.4, yW1 + 2.2, 4.8, 3, 0.8, L); }
    for (const sx of [-0.7, W - 1.7]) { T.rr(sx, 3.2, 2.4, 5, 0.9, '#1e1e22'); T.rr(sx + 0.5, 3.6, 0.8, 3, 0.4, 'rgba(255,255,255,.35)'); } // espejos grandes
    if (c.kind === 'dump') { T.rr(x0 - 0.4, cl - 2.6, bw + 0.8, 4.6, 1.2, T.hg(x0, x1, [D, C, L, C, D])); }       // visera de la caja sobre la cabina
  }, () => VR.OBL.truck(c, pal));

  const L1 = { cab: 17, ws: 4.6, axles: [8, 35], W: 19, L: 48 };
  const FOUR = { max: { road: 175, stone: 155, dirt: 140, side: 100, grass: 105 } };
  Object.assign(VR.CAR_MODELS, {
    camchata: { len: 48, wid: 19, S: 54, acc: 115, rev: 45, turn: 1.7, brake: 340, mass: 2.4, ...FOUR, aiTurn: 0.8, cruiseK: 0.92, colors: WHITE,
      name: 'Kamyõ Mirĩ Chata', desc: 'Camión liviano de plataforma.', side: 'camchata', base: VR.drawTruck({ ...L1, kind: 'flat' }) },
    camcarpa: { len: 48, wid: 19, S: 54, acc: 115, rev: 45, turn: 1.7, brake: 340, mass: 2.5, ...FOUR, aiTurn: 0.8, cruiseK: 0.92, colors: WHITE,
      name: 'Kamyõ Mirĩ Carpa', desc: 'Camión liviano con baranda y carpa.', side: 'camcarpa', base: VR.drawTruck({ ...L1, kind: 'tarp' }) },
    camfurgon: { len: 48, wid: 19, S: 54, acc: 112, rev: 45, turn: 1.7, brake: 340, mass: 2.5, ...FOUR, aiTurn: 0.8, cruiseK: 0.92, colors: WHITE,
      name: 'Kamyõ Mirĩ Furgón', desc: 'Camión liviano de furgón blanco.', side: 'camfurgon', base: VR.drawTruck({ ...L1, kind: 'box' }) },
    camvolcador: { len: 72, wid: 21, S: 78, acc: 95, rev: 40, turn: 1.4, brake: 320, mass: 4, max: { road: 185, stone: 165, dirt: 160, side: 105, grass: 115 }, big: true, minW: 5 * VR.TILE - 1, aiTurn: 0.55, cruiseK: 0.85, colors: [YELLOW[0], [RED[0], RED[1], RED[2]]],
      name: 'Kamyõ Volcador', desc: 'Volcador de tres ejes. Pesadísimo.', side: 'camvolcador', base: VR.drawTruck({ kind: 'dump', W: 21, L: 72, cab: 21, ws: 5, axles: [9, 49, 58] }) },
    camtractor: { len: 100, wid: 21, S: 106, acc: 85, rev: 35, turn: 1.15, brake: 300, mass: 5.4, max: { road: 205, stone: 160, dirt: 130, side: 95, grass: 95 }, big: true, minW: 5 * VR.TILE - 1, aiTurn: 0.4, cruiseK: 0.88, colors: [RED, BLUE, WHT],
      name: 'Kamyõ Guasu Granelero', desc: 'Tractor con semirremolque de lona.', side: 'camtractor', base: VR.drawTruck({ kind: 'grain', W: 21, L: 100, cab: 24, ws: 5.4, axles: [8, 30, 37, 82, 89, 96] }) },
  });

  // sorteo: en el tránsito aparecen camiones además de los autos (según el ancho de la calle en px)
  const pickCar0 = VR.pickCar;
  VR.pickCar = (rnd, parked, roadW = 0) => {
    if (!parked) {
      const r = rnd(), T6 = 6 * VR.TILE - 1, T5 = 5 * VR.TILE - 1;
      if (roadW >= T6 && r < 0.02) return 'camtractor';
      if (roadW >= T5 && r < 0.045) return 'camvolcador';
      if (r < 0.085) { const q = rnd(); return q < 0.4 ? 'camcarpa' : q < 0.72 ? 'camchata' : 'camfurgon'; }
    }
    return pickCar0(rnd, parked, roadW);
  };
})();
