// Vehículos: un compacto de 5 puertas y una moto chica, originales (dibujados por código, sin marcas).
// Física arcade simple: aceleración, freno, marcha atrás, giro según la velocidad, agarre distinto en
// asfalto, empedrado, tierra y pasto, y choques contra edificios, árboles, agua y otros vehículos.
// La misma clase sirve para el que manejás, los estacionados y los del tránsito (ver traffic.js).
'use strict';
VR.CAR_COLORS = [
  ['#c8322a', '#8e1f1a', '#e4685c'], // rojo
  ['#c9ccd1', '#8d9198', '#eef0f2'], // plateado
  ['#f2f0ea', '#b9b6ae', '#ffffff'], // blanco
  ['#2f5fa8', '#1e3f74', '#5c8ad0'], // azul
  ['#2c2c32', '#16161a', '#55555e'], // negro
  ['#d8a02a', '#9c6f16', '#f0c45a'], // amarillo
  ['#3f7f4a', '#28552f', '#66a872'], // verde
  ['#7a2a48', '#521a30', '#a44c6c'], // bordó
];
VR.MOTO_COLORS = [
  ['#c8322a', '#8e1f1a', '#e4685c'], ['#2f5fa8', '#1e3f74', '#5c8ad0'], ['#2c2c32', '#16161a', '#55555e'],
  ['#e8e6e0', '#a9a69e', '#ffffff'], ['#3f8f4a', '#28552f', '#66b872'], ['#d87a1a', '#9c5210', '#f0a04a'],
];
VR.RIDER_SHIRTS = [['#d23c2c', '#9f2a20'], ['#2e6fc8', '#1f4c8c'], ['#f0ece2', '#b8b2a4'], ['#3b9a5a', '#286a3d'], ['#e8b830', '#a8841c'], ['#7a4ab0', '#563480'], ['#30303a', '#18181e']];

VR.shadeHex = function (hex, k) { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0'); return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255); };
// Vehículos con más detalle (04/11/2026, segunda versión): se dibujan con formas suaves y degradés al cuádruple
// de su tamaño en pantalla y se achican con suavizado al rotarlos, así se ven brillos del capó, reflejos en los
// vidrios, faros, espejos, llantas y costuras del asiento aunque sean chicos. Se dibujan ×1,3 respecto de la
// ciudad (como en los juegos de la época), para que se vean y se distingan. Diseños propios, sin marcas.
VR.VK = 1.15; VR.VSS = 5; // casi a escala real (×1,15); con ×1,3 las calles quedaban chicas
VR.vbase = (w, h, fn) => {
  const k = VR.VK * VR.VSS, c = VR.canvas(Math.round(w * k), Math.round(h * k)), g = c.getContext('2d');
  g.scale(k, k);
  const T = {
    g,
    rr(x, y, w, h, r, fill) { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); },
    ell(x, y, rx, ry, fill) { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); },
    poly(pts, fill) { g.fillStyle = fill; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); },
    line(x0, y0, x1, y1, w, col) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); },
    hg(x0, x1, stops) { const gr = g.createLinearGradient(x0, 0, x1, 0); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; },
    vg(y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; },
    tire(x, y, w, h) { T.rr(x, y, w, h, Math.min(w, h) * 0.45, '#141416'); g.fillStyle = 'rgba(255,255,255,.12)'; for (let t = y + 0.5; t < y + h - 0.3; t += 0.9) g.fillRect(x + w * 0.2, t, w * 0.6, 0.3); },
  };
  fn(T);
  c.ss = k / VR.VK; // cuánto más grande está dibujado respecto del sprite final
  return c;
};
const GL = ['#22344a', '#3b5470', '#8fb0cc'], CHR = ['#7a7e86', '#e8ecf2', '#9aa0a8'];
// Compacto de 5 puertas mirando hacia arriba (16×30 unidades)
VR.drawCarBase = (pal, t = {}) => VR.vbase(16, 30, (T) => {
  const [C, D, L] = pal, g = T.g, S2 = VR.tunePal ? VR.tunePal(t.color2 ?? 11)[0] : '#f2f0ea';
  const gl = t.polarizado == 2 ? ['#0c1018', '#161e28', '#34404e'] : t.polarizado == 1 ? ['#18222e', '#2c3c50', '#5e7690'] : GL;
  const HL = t.faros === 'xenon' ? '#e6f2ff' : '#fff4c0';
  const st = (y0, y1) => { // franjas sobre la parte que se acaba de dibujar
    g.fillStyle = S2;
    if (t.franja === 'carrera') { g.fillRect(5.7, y0, 1.3, y1 - y0); g.fillRect(9, y0, 1.3, y1 - y0); }
    else if (t.franja === 'centro') g.fillRect(6.6, y0, 2.8, y1 - y0);
  };
  if (t.escape === 'deportivo') { T.rr(3.2, 28.6, 1.3, 1.4, 0.5, CHR[1]); T.rr(4.8, 28.6, 1.3, 1.4, 0.5, CHR[1]); }
  T.tire(-0.1, 5, 2.2, 5.2); T.tire(13.9, 5, 2.2, 5.2); T.tire(-0.1, 20.5, 2.2, 5.2); T.tire(13.9, 20.5, 2.2, 5.2);
  if (t.llantas && t.llantas !== 'serie') { const rc = VR.RIMS[t.llantas]; for (const [x, y] of [[-0.1, 6.4], [15.3, 6.4], [-0.1, 21.9], [15.3, 21.9]]) T.rr(x, y, 0.8, 2.4, 0.3, rc); }
  T.rr(0.7, 0.3, 14.6, 29.4, [4.2, 4.2, 3, 3], T.hg(0.7, 15.3, [D, L, C, C, D]));         // carrocería
  if (t.franja === 'costado') { g.fillStyle = S2; g.fillRect(0.9, 3, 0.7, 24); g.fillRect(14.4, 3, 0.7, 24); }
  T.rr(1.6, 1, 12.8, 6.8, [3.4, 3.4, 1, 1], T.hg(1.6, 14.4, [C, L, C, D]));               // capó
  T.line(5.2, 1.6, 5.6, 7.4, 0.25, VR.shadeHex(C, 0.82)); T.line(10.8, 1.6, 10.4, 7.4, 0.25, VR.shadeHex(C, 0.82));
  st(0.5, 8);
  T.ell(5.5, 3.2, 1.6, 0.7, 'rgba(255,255,255,.35)');                                    // brillo del capó
  T.rr(1.5, 0.7, 3, 1.3, 0.6, HL); T.rr(11.5, 0.7, 3, 1.3, 0.6, HL);                     // faros
  T.rr(2, 0.9, 1.2, 0.8, 0.3, '#ffffff'); T.rr(12.8, 0.9, 1.2, 0.8, 0.3, '#ffffff');
  T.rr(5.6, 0.4, 4.8, 0.9, 0.4, '#2a2a30');                                              // parrilla
  T.poly([[2.6, 8], [13.4, 8], [14.4, 12.2], [1.6, 12.2]], T.vg(8, 12.2, gl));             // parabrisas
  T.poly([[4, 8.6], [5.6, 8.6], [3.6, 11.6], [2.4, 11.6]], 'rgba(255,255,255,.35)');
  T.rr(0, 8.6, 1.4, 1.2, 0.4, D); T.rr(14.6, 8.6, 1.4, 1.2, 0.4, D);                      // espejos
  const R = t.techo === 'negro' ? ['#4a4a52', '#2c2c32', '#2c2c32', '#1a1a1e'] : [L, C, C, D];
  T.rr(2.6, 12.2, 10.8, 9.6, 1.2, T.hg(2.6, 13.4, R));                                   // techo
  if (t.techo !== 'negro') st(12.2, 21.8);
  T.rr(4, 13.2, 5, 1, 0.5, 'rgba(255,255,255,.3)');
  if (t.techo === 'parrilla') { T.line(3.6, 13, 3.6, 21, 0.45, '#2a2a30'); T.line(12.4, 13, 12.4, 21, 0.45, '#2a2a30'); for (const y of [14, 17, 20]) T.line(3.6, y, 12.4, y, 0.35, '#45454c'); }
  T.rr(1.2, 12.4, 1.2, 4.4, 0.4, T.vg(12, 17, gl)); T.rr(13.6, 12.4, 1.2, 4.4, 0.4, T.vg(12, 17, gl)); // ventanillas
  T.rr(1.2, 17.2, 1.2, 4.2, 0.4, T.vg(17, 21, gl)); T.rr(13.6, 17.2, 1.2, 4.2, 0.4, T.vg(17, 21, gl));
  T.poly([[2.8, 21.8], [13.2, 21.8], [12.6, 25], [3.4, 25]], T.vg(21.8, 25, gl));          // luneta
  T.rr(3.4, 25.2, 9.2, 3.6, 1, T.hg(3.4, 12.6, [C, L, D]));                               // portón
  st(25.2, 28.6);
  T.rr(6.4, 28.3, 3.2, 0.9, 0.2, '#f2f0ea');                                             // patente
  T.rr(1.2, 27.6, 2.4, 1.6, 0.6, '#d8302a'); T.rr(12.4, 27.6, 2.4, 1.6, 0.6, '#d8302a'); // luces traseras
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0.8, 12.6, 0.5, 9); g.fillRect(14.7, 12.6, 0.5, 9);
  if (t.aleron === 'chico') { T.rr(3, 25.4, 10, 1, 0.4, D); T.rr(3.2, 25.4, 9.6, 0.4, 0.2, L); }
  if (t.aleron === 'grande') { T.rr(5, 25.6, 0.8, 1.6, 0.2, '#2a2a30'); T.rr(10.2, 25.6, 0.8, 1.6, 0.2, '#2a2a30'); T.rr(0.8, 26.2, 14.4, 1.7, 0.5, T.hg(0.8, 15.2, [D, L, C, D])); T.rr(1, 26.3, 14, 0.5, 0.2, 'rgba(255,255,255,.25)'); }
});
// Motos y vehículos de dos (y tres) ruedas, vistos desde arriba mirando hacia arriba. Diseños propios por
// categoría (sin marcas ni modelos reales): moto "cub", mini moto, moto de calle 150, motocarga y patineta.
VR.drawMotoCub = (pal, t = {}) => VR.vbase(10, 21, (T) => { // escudo delantero ancho, piso bajo, asiento largo
  const [C, D, L] = pal, S2 = VR.tunePal ? VR.tunePal(t.color2 ?? 11)[0] : '#fff', HL = t.faros === 'xenon' ? '#e6f2ff' : '#fff4c0';
  T.tire(4.1, 0.1, 1.8, 5.2); T.tire(4.1, 15.6, 1.8, 5.3);
  T.rr(3.9, 2.6, 2.2, 1.6, 0.6, C);                                                       // guardabarros
  T.rr(3.6, 0.9, 2.8, 1.3, 0.6, HL);                                                    // faro
  T.line(0.7, 4.7, 9.3, 4.7, 0.75, '#2a2a2e'); T.line(0.7, 4.7, 1.8, 4.7, 0.9, '#55555c'); T.line(8.2, 4.7, 9.3, 4.7, 0.9, '#55555c');
  T.line(2.1, 4.5, 1.4, 2.7, 0.3, CHR[0]); T.line(7.9, 4.5, 8.6, 2.7, 0.3, CHR[0]); T.ell(1.4, 2.6, 0.7, 0.5, CHR[1]); T.ell(8.6, 2.6, 0.7, 0.5, CHR[1]); // espejos
  T.poly([[2.6, 5.2], [7.4, 5.2], [8.7, 8.8], [1.3, 8.8]], T.hg(1.3, 8.7, [L, C, C, D]));  // escudo
  T.ell(4, 6.4, 1, 0.5, 'rgba(255,255,255,.35)');
  T.rr(3.2, 8.8, 3.6, 2, 0.4, '#3a3a40'); for (let x = 3.6; x < 6.6; x += 0.7) T.rr(x, 9, 0.3, 1.6, 0, '#2a2a2e'); // piso con estrías
  T.rr(2, 11.2, 6, 5.8, 1.2, T.hg(2, 8, [L, C, D]));                                     // tapas laterales
  if (t.franja && t.franja !== 'no') { T.rr(2.1, 12, 0.6, 4.4, 0.2, S2); T.rr(7.3, 12, 0.6, 4.4, 0.2, S2); T.rr(4.2, 5.4, 1.6, 3.2, 0.3, S2); }
  T.rr(3, 10.6, 4, 6.6, 1.6, T.hg(3, 7, ['#3a3a40', '#26262a', '#1a1a1e']));               // asiento largo
  T.line(5, 11.2, 5, 16.6, 0.15, '#4a4a52');
  T.rr(3.2, 17, 3.6, 1.4, 0.6, C); T.rr(4, 18.1, 2, 0.6, 0.3, '#e8302a');                 // cola y luz
  T.rr(7.6, 12.6, t.escape === 'deportivo' ? 1.4 : 1, t.escape === 'deportivo' ? 7.4 : 5.8, 0.6, T.hg(7.6, 9, CHR));  // escape
});
VR.drawMotoMini = (pal, t = {}) => VR.vbase(10, 17, (T) => { // ruedas gordas, faro redondo, corta y ancha
  const [C, D, L] = pal, S2 = VR.tunePal ? VR.tunePal(t.color2 ?? 11)[0] : '#fff', HL = t.faros === 'xenon' ? '#e6f2ff' : '#fff4c0';
  T.tire(2.9, 0, 4.2, 4.2); T.tire(2.9, 12.8, 4.2, 4.2);
  T.ell(5, 2.6, 1.9, 1.5, C); T.ell(5, 2.4, 1.2, 0.9, HL); T.ell(4.7, 2.2, 0.5, 0.35, '#ffffff'); // faro redondo
  T.line(1.2, 4.4, 8.8, 4.4, 0.8, '#2a2a2e'); T.ell(1.3, 4.4, 0.6, 0.55, '#55555c'); T.ell(8.7, 4.4, 0.6, 0.55, '#55555c');
  T.rr(2, 5, 6, 4.2, 1.8, T.hg(2, 8, [L, C, C, D])); T.ell(3.8, 6, 0.9, 0.6, 'rgba(255,255,255,.4)'); // tanque gordo
  if (t.franja && t.franja !== 'no') { if (t.franja === 'carrera') { T.rr(3.6, 5.2, 0.8, 3.8, 0.3, S2); T.rr(5.6, 5.2, 0.8, 3.8, 0.3, S2); } else T.rr(4.2, 5.1, 1.6, 4, 0.4, S2); }
  if (t.escape === 'deportivo') { T.rr(7.4, 9.4, 1.4, 5, 0.6, T.hg(7.4, 8.8, CHR)); }
  T.rr(2.2, 8.8, 5.6, 4.6, 1.4, T.hg(2.2, 7.8, ['#3a3a40', '#26262a', '#1a1a1e'])); T.line(2.8, 10.2, 7.2, 10.2, 0.15, '#4a4a52'); T.line(2.8, 12, 7.2, 12, 0.15, '#4a4a52');
  T.rr(3.2, 13.2, 3.6, 1, 0.5, C); T.rr(4.2, 13.5, 1.6, 0.5, 0.25, '#e8302a');
});
VR.drawMotoCalle = (pal, t = {}) => VR.vbase(10, 22, (T) => { // visera, tanque grande, parrilla, escape largo cromado
  const [C, D, L] = pal, S2 = VR.tunePal && t.franja && t.franja !== 'no' ? VR.tunePal(t.color2 ?? 11)[0] : L, HL = t.faros === 'xenon' ? '#e6f2ff' : '#fff4c0';
  T.tire(4.15, 0, 1.7, 5.3); T.tire(4.1, 16.7, 1.8, 5.3);
  T.rr(3.4, 1.6, 3.2, 3.2, 1, '#1e1e22'); T.ell(5, 2.6, 1.1, 0.8, HL); T.rr(3.4, 3.8, 3.2, 1, 0.4, C); // faro con visera
  T.line(0.4, 5.4, 9.6, 5.4, 0.7, '#2a2a2e'); T.ell(0.6, 5.4, 0.55, 0.5, '#55555c'); T.ell(9.4, 5.4, 0.55, 0.5, '#55555c');
  T.line(2, 5.2, 1.3, 3.4, 0.28, CHR[0]); T.line(8, 5.2, 8.7, 3.4, 0.28, CHR[0]); T.rr(0.7, 2.7, 1.3, 0.9, 0.3, '#1e1e22'); T.rr(8, 2.7, 1.3, 0.9, 0.3, '#1e1e22');
  T.rr(1.8, 6, 6.4, 5.4, [2.4, 2.4, 1.2, 1.2], T.hg(1.8, 8.2, [D, L, C, D]));              // tanque grande
  if (t.franja === 'carrera') { T.rr(3.6, 6.3, 0.8, 5, 0.3, S2); T.rr(5.6, 6.3, 0.8, 5, 0.3, S2); } else T.rr(t.franja === 'centro' ? 4.1 : 4.5, 6.3, t.franja === 'centro' ? 1.8 : 1, 5, 0.4, S2); T.ell(3.4, 7.4, 0.8, 0.6, 'rgba(255,255,255,.45)'); T.ell(5, 7.6, 0.9, 0.7, '#2a2a2e'); T.ell(5, 7.6, 0.5, 0.4, CHR[1]); // franja y tapa
  T.rr(3, 11.2, 4, 6, 1.2, T.hg(3, 7, ['#3a3a40', '#26262a', '#1a1a1e'])); T.line(5, 11.6, 5, 16.8, 0.15, '#4a4a52');
  T.rr(3, 17, 4, 2.4, 0.4, 'rgba(0,0,0,0)'); for (let y = 17.2; y < 19.4; y += 0.8) T.line(3.2, y, 6.8, y, 0.3, CHR[1]); T.line(3.2, 17, 3.2, 19.4, 0.35, CHR[0]); T.line(6.8, 17, 6.8, 19.4, 0.35, CHR[0]); // parrilla
  T.rr(4, 16.2, 2, 0.7, 0.3, '#e8302a');
  T.rr(7.7, 9, 1.1, 11.4, 0.55, T.hg(7.7, 8.8, CHR)); T.rr(8.4, 12, 1, 6.4, 0.5, T.hg(8.4, 9.4, CHR)); // escape largo
  if (t.escape === 'deportivo') T.rr(0.9, 12, 1.1, 8, 0.55, T.hg(0.9, 2, CHR));
});
VR.drawMotoCarga = (pal, t = {}) => VR.vbase(18, 34, (T) => { // moto adelante y caja de carga atrás con dos ruedas
  const [C, D, L] = pal, g = T.g, S2 = VR.tunePal ? VR.tunePal(t.color2 ?? 11)[0] : '#fff';
  T.tire(8.1, 0, 1.8, 5.2); T.rr(7.6, 0.8, 2.8, 1.3, 0.6, t.faros === 'xenon' ? '#e6f2ff' : '#fff4c0');
  T.line(3.8, 5.3, 14.2, 5.3, 0.8, '#2a2a2e'); T.ell(4, 5.3, 0.6, 0.55, '#55555c'); T.ell(14, 5.3, 0.6, 0.55, '#55555c');
  T.rr(6, 5.8, 6, 3.6, 1.4, T.hg(6, 12, [L, C, D])); T.ell(7.6, 6.6, 0.8, 0.5, 'rgba(255,255,255,.4)');
  T.rr(6.2, 9, 5.6, 4.4, 1.2, T.hg(6.2, 11.8, ['#3a3a40', '#26262a', '#1a1a1e']));
  T.rr(3.6, 13, 10.8, 1, 0.5, T.hg(3.6, 14.4, CHR));                                     // respaldo
  T.tire(-0.1, 23.6, 2.2, 7.4); T.tire(15.9, 23.6, 2.2, 7.4);                            // ruedas traseras
  T.rr(1, 14, 16, 20, 0.8, D); T.rr(1.6, 14.6, 14.8, 18.8, 0.5, T.hg(1.6, 16.4, [L, C, C, D])); // caja
  T.rr(2.6, 15.6, 12.8, 16.8, 0.3, VR.shadeHex(C, 0.68));
  for (let y = 16.8; y < 32; y += 2.4) { g.fillStyle = VR.shadeHex(C, 0.55); g.fillRect(2.6, y, 12.8, 0.3); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(2.6, y + 0.3, 12.8, 0.3); }
  if (t.franja && t.franja !== 'no') { g.fillStyle = S2; g.fillRect(1.1, 14.4, 0.6, 19); g.fillRect(16.3, 14.4, 0.6, 19); g.fillRect(1.6, 32.6, 14.8, 0.6); }
  T.rr(1.4, 33.1, 2.2, 0.8, 0.3, '#e8302a'); T.rr(14.4, 33.1, 2.2, 0.8, 0.3, '#e8302a');
});
VR.drawPati = (pal, t = {}) => VR.vbase(6, 14, (T) => { // manubrio en T, tabla angosta
  const [C, D] = pal;
  T.tire(2, 0, 2, 3); T.tire(2, 11, 2, 3);
  T.line(0.4, 2.4, 5.6, 2.4, 0.7, '#2a2a2e'); T.ell(0.5, 2.4, 0.5, 0.45, '#d8dce4'); T.ell(5.5, 2.4, 0.5, 0.45, '#d8dce4');
  T.ell(3, 3.1, 0.7, 0.6, C); T.ell(3, 2.4, 0.4, 0.3, t.faros === 'xenon' ? '#e6f2ff' : '#fff4c0');
  T.rr(1, 4, 4, 8, 1.2, T.hg(1, 5, [C, '#2a2a30', '#2a2a30', D])); T.rr(1.7, 4.7, 2.6, 6.6, 0.8, '#3c3c44');
  for (let y = 5.2; y < 11; y += 0.9) T.line(2, y, 4, y, 0.2, '#2c2c32');
  T.rr(2.2, 12, 1.6, 0.6, 0.3, '#e8302a');
});
// Conductor visto desde arriba (10×20 unidades): casco o pelo, hombros con sombra, brazos al manubrio, rodillas.
VR.drawRiderBase = (shirt, head) => VR.vbase(10, 20, (T) => {
  const helmet = head !== '#2a1b12';
  T.line(2, 9, 1, 5.4, 1.4, shirt[1]); T.line(8, 9, 9, 5.4, 1.4, shirt[1]);              // brazos
  T.ell(1, 5.1, 0.6, 0.6, '#a76c42'); T.ell(9, 5.1, 0.6, 0.6, '#a76c42');                // manos
  T.ell(2.6, 12.6, 1.1, 1.6, '#2c3e6b'); T.ell(7.4, 12.6, 1.1, 1.6, '#2c3e6b');          // rodillas
  T.rr(1.4, 7.4, 7.2, 5.4, 2.4, T.hg(1.4, 8.6, [VR.shadeHex(shirt[0], 1.2), shirt[0], shirt[1]])); // espalda
  T.ell(5, 7, helmet ? 2.2 : 1.9, helmet ? 2.3 : 2, T.hg(3, 7, [VR.shadeHex(head, 1.4), head, VR.shadeHex(head, 0.7)])); // cabeza
  if (helmet) T.rr(3.6, 5, 2.8, 0.8, 0.4, '#1e2430'); else T.ell(4.4, 6.2, 0.6, 0.4, 'rgba(255,255,255,.18)');
});

// Rota un sprite a 64 ángulos. Los dibujos suaves (VR.vbase) se rotan grandes con suavizado, se contornean y
// se achican: quedan sin escalones. Los de píxel (otros) se rotan al pixel con vecino más cercano.
VR.rotFrames = (base, S, outline = true) => {
  // Cada ángulo se dibuja recién cuando hace falta (y se guarda): antes se armaban los 64 de una vez cada vez
  // que aparecía un vehículo de un color nuevo, y eso trababa el juego (sobre todo en el teléfono).
  const N = 64, f = { img: new Array(N), shadow: new Array(N), S };
  const ss = base.ss || 1, SR = Math.round(S * (VR.RES || 1)); // tamaño en el lienzo (resolución ×2)
  let src = null;
  const make = (k) => {
    const a = k / N * Math.PI * 2;
    let c;
    if (ss > 1) {
      const B = S * ss, big = VR.canvas(B, B), x = big.getContext('2d');
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.translate(B / 2, B / 2); x.rotate(a); x.drawImage(base, -base.width / 2, -base.height / 2);
      c = VR.gfx.crisp(VR.gfx.down(outline ? VR.gfx.softOutline(big, 'rgba(18,16,20,.92)', ss * 0.8) : big, SR, SR));
    } else {
      const bw = base.width, bh = base.height, ca = Math.cos(a), sa = Math.sin(a);
      if (!src) src = base.getContext('2d').getImageData(0, 0, bw, bh).data;
      c = VR.canvas(S, S); const x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data;
      for (let y = 0; y < S; y++) for (let xx = 0; xx < S; xx++) {
        const dx = xx - S / 2 + 0.5, dy = y - S / 2 + 0.5;
        const sx = Math.round(dx * ca + dy * sa + bw / 2 - 0.5), sy = Math.round(-dx * sa + dy * ca + bh / 2 - 0.5);
        if (sx < 0 || sy < 0 || sx >= bw || sy >= bh) continue;
        const i = (sy * bw + sx) * 4, o = (y * S + xx) * 4;
        if (src[i + 3] < 128) continue;
        d[o] = src[i]; d[o + 1] = src[i + 1]; d[o + 2] = src[i + 2]; d[o + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      if (outline) VR.gfx.outline(c, '#141216');
      if (SR !== S) { const up = VR.canvas(SR, SR); up.getContext('2d').drawImage(c, 0, 0, SR, SR); c = up; }
    }
    const sh = VR.canvas(SR, SR), sx = sh.getContext('2d');
    sx.drawImage(c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(0,0,0,.32)'; sx.fillRect(0, 0, SR, SR);
    f.img[k] = c; f.shadow[k] = sh;
  };
  f.get = (k) => { if (!f.img[k]) make(k); return f.img[k]; };
  f.getShadow = (k) => { if (!f.shadow[k]) make(k); return f.shadow[k]; };
  return f;
};

// Datos de cada tipo: tamaño, sprites y manejo. max = velocidad tope por piso (px/s; 240 ≈ 108 km/h).
// name/desc: nombre inventado y descripción para la tarjeta que aparece al subirte.
VR.VSPEC = {
  car: { len: 30, wid: 16, S: 36, colors: VR.CAR_COLORS, base: VR.drawCarBase, acc: 175, rev: 75, turn: 2.7, brake: 420, mass: 1,
    max: { road: 240, stone: 205, dirt: 170, side: 150, grass: 115 },
    name: 'Mitã 1.3', desc: 'Compacto de 5 puertas: chico, gasolero y fácil de estacionar.', side: 'car' },
  moto: { len: 19, wid: 8, S: 24, colors: VR.MOTO_COLORS, base: VR.drawMotoCub, acc: 230, rev: 25, turn: 3.5, brake: 460, mass: 0.3,
    max: { road: 250, stone: 215, dirt: 205, side: 160, grass: 135 } },
};
VR.PATI_COLORS = [['#2c2c32', '#16161a', '#55555e'], ['#e8e6e0', '#a9a69e', '#ffffff'], ['#2f5fa8', '#1e3f74', '#5c8ad0']];
VR.MOTO_MODELS = {
  cub: { name: 'Mbojoaju 125', desc: 'La moto de todos los días: liviana, económica y con lugar para dos.', side: 'cub' },
  mini: { len: 16, wid: 9, S: 22, base: VR.drawMotoMini, acc: 205, turn: 4.1, max: { road: 200, stone: 175, dirt: 170, side: 150, grass: 125 },
    name: 'Tatu 110', desc: 'Mini moto de ruedas gordas: chiquita, divertida y dobla en un pañuelo.', side: 'mini' },
  calle: { len: 21, wid: 8, S: 26, base: VR.drawMotoCalle, acc: 265, turn: 3.2, max: { road: 290, stone: 240, dirt: 215, side: 160, grass: 140 },
    name: 'Yvytu GT 150', desc: 'Moto de calle con tanque grande y escape cromado: la más rápida.', side: 'calle' },
  carga: { len: 32, wid: 16, S: 40, base: VR.drawMotoCarga, acc: 135, rev: 40, turn: 2.3, brake: 380, mass: 0.8,
    max: { road: 185, stone: 165, dirt: 160, side: 120, grass: 105 },
    name: 'Kárga Guasu 200', desc: 'Motocarga de tres ruedas: lenta, pesada y aguanta de todo atrás.', side: 'carga', riderOff: 8 },
  pati: { len: 12, wid: 6, S: 16, base: VR.drawPati, colors: VR.PATI_COLORS, acc: 150, rev: 15, turn: 4.4, brake: 420, mass: 0.15,
    max: { road: 115, stone: 85, dirt: 70, side: 110, grass: 60 },
    name: 'Pati-e', desc: 'Patineta eléctrica: silenciosa y ágil, pero no le pidas mucho en el empedrado.', side: 'pati' },
};
// sorteo de modelo: en el tránsito hay motocargas; estacionadas en batería, no (no entran)
VR.pickMoto = (rnd, parked) => {
  const r = rnd();
  if (parked) return r < 0.55 ? 'cub' : r < 0.78 ? 'calle' : r < 0.95 ? 'mini' : 'pati';
  return r < 0.46 ? 'cub' : r < 0.66 ? 'calle' : r < 0.78 ? 'mini' : r < 0.95 ? 'carga' : 'pati';
};
VR.vspec = (() => {
  const cache = new Map();
  return (type, model) => {
    const key = type + ':' + (model || '');
    let sp = cache.get(key);
    if (!sp) {
      sp = type === 'moto' ? { ...VR.VSPEC.moto, ...VR.MOTO_MODELS[model || 'cub'] } : { ...VR.VSPEC.car, ...(VR.CAR_MODELS ? VR.CAR_MODELS[model || 'mita'] : {}) };
      const k = VR.VK; sp.len = Math.round(sp.len * k); sp.wid = Math.round(sp.wid * k); sp.S = Math.round(sp.S * k) + 2; if (sp.riderOff) sp.riderOff = Math.round(sp.riderOff * k);
      cache.set(key, sp);
    }
    return sp;
  };
})();
VR.vframes = (() => {
  const cache = new Map();
  return (type, color, model, tune) => {
    const key = type + ':' + (model || '') + ':' + (tune ? 't' + VR.tuneKey(tune) : color);
    let f = cache.get(key);
    if (!f) { const sp = VR.vspec(type, model); f = VR.rotFrames(sp.base(tune ? VR.tunePal(tune.color) : sp.colors[color % sp.colors.length], tune || {}), sp.S); cache.set(key, f); }
    return f;
  };
})();
VR.riderFrames = (() => {
  const cache = new Map();
  return (shirt, head) => {
    const key = shirt.join() + head;
    let f = cache.get(key);
    if (!f) { f = VR.rotFrames(VR.drawRiderBase(shirt, head), Math.round(24 * VR.VK) + 2); cache.set(key, f); }
    return f;
  };
})();

VR.Car = class {
  constructor(world, x, y, angle, color, type = 'car', model = null, tune = null) {
    this.world = world; this.type = type; this.model = type === 'moto' ? (model || 'cub') : (model || 'mita'); this.tune = tune;
    this.spec = tune ? VR.tuneSpec(VR.vspec(type, this.model), tune) : VR.vspec(type, this.model);
    this.x = this.px = x; this.y = this.py = y; this.a = this.pa = angle;
    this.v = 0; this.color = color; this.driven = false; this.hit = 0; this.hp = 100;
    this.rider = null; // moto: {shirt, head} cuando alguien la maneja
    this.frames = VR.vframes(type, color, this.model, tune);
  }
  get LEN() { return this.spec.len; }
  get WID() { return this.spec.wid; }
  box() {
    const hl = this.spec.len / 2, hw = this.spec.wid / 2, c = Math.abs(Math.cos(this.a)), s = Math.abs(Math.sin(this.a));
    const ex = hw * c + hl * s, ey = hw * s + hl * c;
    return { x0: this.x - ex, y0: this.y - ey, x1: this.x + ex, y1: this.y + ey, car: this };
  }
  points(x, y, a) {
    const hl = this.spec.len / 2 - 1, hw = Math.max(2, this.spec.wid / 2 - 2), fx = Math.sin(a), fy = -Math.cos(a), rx = Math.cos(a), ry = Math.sin(a);
    const out = [];
    for (const [l, w] of [[hl, -hw], [hl, hw], [-hl, -hw], [-hl, hw], [hl, 0], [-hl, 0], [0, -hw], [0, hw]])
      out.push([x + fx * l + rx * w, y + fy * l + ry * w]);
    return out;
  }
  blocked(x, y, a) {
    const W = this.world, S = VR.TILE;
    for (const [px, py] of this.points(x, y, a)) {
      if (W.solid(Math.floor(px / S), Math.floor(py / S))) return true;
      if (W.boxAt(px, py, this)) return true;
    }
    return false;
  }
  topSpeed() {
    const t = this.world.get(Math.floor(this.x / VR.TILE), Math.floor(this.y / VR.TILE)), T = VR.T, m = this.spec.max;
    if (t === T.ROAD) return [m.road, 1];
    if (t === T.STONE) return [m.stone, 0.95];
    if (t === T.DIRTROAD || t === T.DIRT) return [m.dirt, 0.85];
    if (t === T.SIDEWALK || t === T.PAVING || t === T.CHECKER) return [m.side, 0.9];
    return [m.grass, 0.7];
  }
  // Teclado y cruceta: arriba acelera, abajo frena/reversa, costados giran.
  // Joystick táctil: el vehículo va hacia donde apuntás, más rápido cuanto más lo empujás.
  update(dt, input) {
    let throttle = 0, steer = 0;
    const brake = input.down('run');
    if (input.source === 'touch') {
      const m = Math.min(1, Math.hypot(input.ax, input.ay));
      if (m > 0.1) {
        const want = Math.atan2(input.ax, -input.ay);
        let d = want - this.a; d = Math.atan2(Math.sin(d), Math.cos(d));
        if (Math.abs(d) > 2.2 && this.v < 40) { throttle = -m; steer = VR.clamp(-d * 2, -1, 1); }
        else { throttle = m * (Math.abs(d) > 1.6 ? 0.35 : 1); steer = VR.clamp(d * 2.2, -1, 1); }
      }
    } else { throttle = -input.ay; steer = input.ax; }
    this.physics(dt, throttle, steer, brake);
  }
  get mass() { return this.spec.mass; }
  // Física: velocidad como vector (vx, vy) además del rumbo, así el vehículo puede derrapar;
  // giro con velocidad angular (w) que también cambian los choques.
  physics(dt, throttle, steer, brake, parked = false) {
    this.px = this.x; this.py = this.y; this.pa = this.a;
    if (this.vx === undefined) { this.vx = Math.sin(this.a) * this.v; this.vy = -Math.cos(this.a) * this.v; this.w = 0; }
    const sp = this.spec, [max, gripF] = this.topSpeed();
    let fx = Math.sin(this.a), fy = -Math.cos(this.a), rx = Math.cos(this.a), ry = Math.sin(this.a);
    let vf = this.vx * fx + this.vy * fy, vr = this.vx * rx + this.vy * ry;
    // motor y frenos (sobre la velocidad hacia adelante)
    if (parked) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 260 * dt);
    else {
      if (brake) vf -= Math.sign(vf) * Math.min(Math.abs(vf), sp.brake * dt);
      if (throttle > 0) vf += (vf < 0 ? 380 : sp.acc * gripF) * throttle * dt;
      else if (throttle < 0) vf += (vf > 0 ? 380 : 120) * throttle * dt;
      else vf -= Math.sign(vf) * Math.min(Math.abs(vf), 70 * dt);
      if (vf > max) vf = Math.max(max, vf - 260 * dt);
      if (vf < -sp.rev) vf = Math.max(-sp.rev, vf + 300 * dt);
    }
    // agarre lateral: menos en tierra y pasto, y casi nada si frenás fuerte doblando (derrape)
    const t = this.world.get(Math.floor(this.x / VR.TILE), Math.floor(this.y / VR.TILE)), T = VR.T;
    let grip = t === T.ROAD ? 9 : t === T.STONE ? 7 : t === T.DIRTROAD || t === T.DIRT ? 4.5 : t === T.SIDEWALK || t === T.PAVING || t === T.CHECKER ? 7.5 : 3.5;
    if (this.type === 'moto') grip *= 1.4;
    if (brake && Math.abs(vf) > 70 && Math.abs(steer) > 0.2) grip *= 0.22;
    if (parked) grip = 6;
    vr *= Math.exp(-grip * dt);
    // giro: la velocidad angular busca la del volante (y se recupera de los golpes)
    const s = Math.abs(vf), wt = parked ? 0 : steer * sp.turn * Math.min(1, s / 55) * (1 - Math.min(0.45, s / 600)) * (vf < -2 ? -1 : 1);
    this.w += (wt - this.w) * Math.min(1, (parked ? 2.5 : 7) * dt);
    this.vx = fx * vf + rx * vr; this.vy = fy * vf + ry * vr;
    // marcas de frenada / derrape
    if (Math.abs(vr) > 25 || (brake && s > 90)) this.skid(t === T.DIRTROAD || t === T.DIRT || t === T.GRASS);
    this.move(dt);
    fx = Math.sin(this.a); fy = -Math.cos(this.a);
    this.v = this.vx * fx + this.vy * fy;
    if (this.hit > 0) this.hit -= dt;
    this.world.moveBox(this);
  }
  skid(dirt) {
    const fx = Math.sin(this.a), fy = -Math.cos(this.a), rx = Math.cos(this.a), ry = Math.sin(this.a), l = this.spec.len / 2 - 5, w = this.spec.wid / 2 - 2;
    const col = dirt ? 'rgba(90,45,20,.4)' : 'rgba(18,16,14,.45)';
    const wheels = this.type === 'moto' ? [[this.x - fx * l, this.y - fy * l]]
      : [[this.x - fx * l + rx * w, this.y - fy * l + ry * w], [this.x - fx * l - rx * w, this.y - fy * l - ry * w]];
    const last = this._sk && this._skT > performance.now() - 120 ? this._sk : null;
    wheels.forEach((p, i) => { const q = last ? last[i] : p; this.world.markLine(q[0], q[1], p[0], p[1], col); });
    this._sk = wheels; this._skT = performance.now();
  }
  // ¿qué toca el vehículo en esta posición? Paredes: 8 puntos del contorno. Otros vehículos (04/11/2026):
  // rectángulo contra rectángulo con su tamaño entero (antes eran puntos contra la caja alineada, y una moto
  // podía meterse entre dos puntos del costado de un auto). Devuelve los puntos tocados y el primer vehículo.
  contacts(x, y, a) {
    const W = this.world, S = VR.TILE, pts = [];
    for (const [px, py] of this.points(x, y, a)) if (W.solid(Math.floor(px / S), Math.floor(py / S))) pts.push(px, py);
    let other = null;
    const A = VR.obb(x, y, a, this.spec.len / 2, this.spec.wid / 2), r = A.ex + 2;
    for (const o of W.carsIn(x - r - 30, y - r - 30, x + r + 30, y + r + 30, VR._near || (VR._near = []))) {
      if (o === this) continue;
      const B = VR.obb(o.x, o.y, o.a, o.spec.len / 2, o.spec.wid / 2);
      if (!VR.obbHit(A, B)) continue;
      other = other || o;
      let n = 0;
      for (const [px, py] of VR.obbCorners(A)) if (VR.obbIn(B, px, py)) { pts.push(px, py); n++; }
      for (const [px, py] of VR.obbCorners(B)) if (VR.obbIn(A, px, py)) { pts.push(px, py); n++; }
      if (!n) pts.push((x + o.x) / 2, (y + o.y) / 2);
    }
    VR._near.length = 0;
    return pts.length ? { pts, other } : null;
  }
  // mover en pasos chicos; al chocar: rebote (según el ángulo), roce contra la pared, giro por el golpe
  // y, si es otro vehículo, intercambio de impulso (lo empujás)
  move(dt) {
    const sp = Math.hypot(this.vx, this.vy), n = Math.max(1, Math.ceil(sp * dt / 3) + (Math.abs(this.w) * dt > 0.05 ? 1 : 0));
    const h = dt / n;
    // si arrancó metido en algo (lo empujaron, apareció encima), primero se separa
    const now = this.contacts(this.x, this.y, this.a);
    if (now) {
      let freed = false;
      for (let d = 1; d <= 8 && !freed; d++) for (let k = 0; k < 8 && !freed; k++) {
        const ex = Math.cos(k * Math.PI / 4) * d, ey = Math.sin(k * Math.PI / 4) * d;
        if (!this.contacts(this.x + ex, this.y + ey, this.a)) { this.x += ex; this.y += ey; freed = true; }
      }
      if (!freed) { this.x += this.vx * dt; this.y += this.vy * dt; this.vx *= 0.9; this.vy *= 0.9; return; } // trabado del todo: se escurre
    }
    for (let i = 0; i < n; i++) {
      const nx = this.x + this.vx * h, ny = this.y + this.vy * h, na = this.a + this.w * h;
      const c = this.contacts(nx, ny, na);
      if (!c) { this.x = nx; this.y = ny; this.a = na; continue; }
      // normal del choque: desde los puntos tocados hacia el centro
      let mx = 0, my = 0, k = c.pts.length / 2;
      for (let j = 0; j < c.pts.length; j += 2) { mx += c.pts[j]; my += c.pts[j + 1]; }
      mx /= k; my /= k;
      let nnx = nx - mx, nny = ny - my, nl = Math.hypot(nnx, nny);
      if (nl < 0.01) { nnx = -this.vx; nny = -this.vy; nl = Math.hypot(nnx, nny) || 1; }
      nnx /= nl; nny /= nl;
      const o = c.other;
      let impact = 0;
      if (o) {
        if (o.vx === undefined) { o.vx = Math.sin(o.a) * o.v; o.vy = -Math.cos(o.a) * o.v; o.w = 0; }
        const rvn = (this.vx - o.vx) * nnx + (this.vy - o.vy) * nny;
        if (rvn < 0) {
          const e = 0.35, J = -(1 + e) * rvn / (1 / this.mass + 1 / o.mass);
          this.vx += J / this.mass * nnx; this.vy += J / this.mass * nny;
          o.vx -= J / o.mass * nnx; o.vy -= J / o.mass * nny;
          // giro de los dos según dónde fue el golpe
          const cx = mx - nx, cy = my - ny, ox = mx - o.x, oy = my - o.y;
          this.w += (cx * nny - cy * nnx) * J * 0.0016 / this.mass;
          o.w -= (ox * nny - oy * nnx) * J * 0.0016 / o.mass;
          o.hit = Math.min(0.3, -rvn / 300);
          impact = -rvn;
          this.world.wake(o, impact);
        }
      } else {
        const vn = this.vx * nnx + this.vy * nny;
        if (vn < 0) {
          const e = 0.3;
          this.vx -= (1 + e) * vn * nnx; this.vy -= (1 + e) * vn * nny;
          // roce: pierde algo de la velocidad que va a lo largo de la pared
          const tx = this.vx - (this.vx * nnx + this.vy * nny) * nnx, ty = this.vy - (this.vx * nnx + this.vy * nny) * nny;
          this.vx -= tx * 0.12; this.vy -= ty * 0.12;
          const cx = mx - nx, cy = my - ny;
          this.w += (cx * nny - cy * nnx) * (-vn) * 0.0022;
          impact = -vn;
        }
      }
      this.w = VR.clamp(this.w, -6, 6);
      if (impact > 50) { this.hit = Math.min(0.35, impact / 300); if (this.driven && VR.input.buzz) VR.input.buzz(Math.min(60, impact / 4)); if (this.onImpact) this.onImpact(impact, o); if (VR.onCarHit) VR.onCarHit(this, impact, o); }
      // no se mete en la pared: si el giro solo ya lo traba, no gira; y si quedó pegado, se separa un poco
      if (!this.contacts(this.x, this.y, na)) this.a = na;
      else if (this.contacts(this.x, this.y, this.a)) {
        for (let d = 1; d <= 4; d++) if (!this.contacts(this.x + nnx * d, this.y + nny * d, this.a)) { this.x += nnx * d; this.y += nny * d; break; }
      }
    }
  }
  kmh() { return Math.round(Math.abs(this.v) / VR.TILE * 2 * 3.6); } // 1 tile = 2 m
  frame(a) { const N = 64; return ((Math.round(a / (Math.PI * 2) * N) % N) + N) % N; }
  draw(ctx, camX, camY, al) {
    const x = Math.round(VR.lerp(this.px, this.x, al) - camX), y = Math.round(VR.lerp(this.py, this.y, al) - camY);
    const a = this.pa + Math.atan2(Math.sin(this.a - this.pa), Math.cos(this.a - this.pa)) * al;
    const k = this.frame(a), F = this.frames, h = F.S >> 1;
    const shake = this.hit > 0 ? ((this.hit * 60) | 0) % 2 : 0;
    if (this.tune && this.tune.neon !== 'no' && (this.driven || this.ai)) VR.drawNeon(ctx, x, y, a, this.LEN, this.WID, VR.NEON[this.tune.neon], VR.night ? 0.35 + VR.night.level * 0.65 : 0.4);
    ctx.drawImage(F.getShadow(k), x - h + 3, y - h + 3, F.S, F.S);
    ctx.drawImage(F.get(k), x - h + shake, y - h, F.S, F.S);
    if (this.rider) {
      const R = VR.riderFrames(this.rider.shirt, this.rider.head), rh = R.S >> 1;
      const ro = this.spec.riderOff || 0;
      ctx.drawImage(R.get(k), x - rh + shake + Math.round(Math.sin(a) * ro), y - rh - 1 - Math.round(Math.cos(a) * ro), R.S, R.S);
    }
    if (this.siren && this.spec.lights) { // barra de luces titilando
      const on = ((performance.now() / 130) | 0) % 2, L = this.spec.lights, f = this.model === 'bomba' ? this.LEN * 0.33 : this.model === 'ambulancia' ? this.LEN * 0.22 : this.LEN * 0.1;
      const bx = x + Math.sin(a) * f, by = y - Math.cos(a) * f, rx = Math.cos(a) * 3.5, ry = Math.sin(a) * 3.5;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [s, col] of [[-1, L[on]], [1, L[1 - on]]]) { const gx = bx + rx * s, gy = by + ry * s, gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, 9); gr.addColorStop(0, `rgba(${col},.95)`); gr.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = gr; ctx.fillRect(gx - 9, gy - 9, 18, 18); }
      ctx.restore();
    }
  }
};

// Vehículos estacionados (siempre los mismos: semilla fija).
//  - experimento en Mariscal Estigarribia frente a la Plaza de los Héroes (mano única hacia el este):
//    autos en fila del lado izquierdo (el de la plaza) y motos en batería del lado derecho;
//  - en el resto de la ciudad: autos en paralelo al cordón y algunas motos en batería.
VR.parkCars = (world, n, near) => {
  const T = VR.T, rnd = VR.rng(2006), S = VR.TILE, cars = [];
  const road = (x, y) => { const t = world.get(x, y); return t === T.ROAD || t === T.STONE; };
  const curb = (x, y) => { const t = world.get(x, y); return t === T.SIDEWALK || t === T.CHECKER; };
  const add = (x, y, a, color, type = 'car', model) => { const m = model || (type === 'moto' ? VR.pickMoto(rnd, true) : VR.pickCar(rnd, true)); const c = new VR.Car(world, x, y, a, m === 'pati' ? color % VR.PATI_COLORS.length : color, type, m); world.addBox(c); cars.push(c); return c; };
  let first = null;
  // ¿entran motos en batería (de punta contra el cordón) y además los autos y un carril libre? Si la calle es
  // angosta, las motos van en fila, paralelas al cordón (ocupan 9 px en vez de 24).
  const battery = (tiles) => tiles * S >= 21 + 26 + 28;

  // --- el experimento: la cuadra al sur de la plaza ---
  if (near) {
    const tx = Math.floor(near.x / S);
    // la calle que pasa entre la plaza y el punto de partida (arriba de la vereda donde arrancás)
    let yb = Math.floor(near.y / S), lim = 12;
    while (lim-- > 0 && !road(tx, yb)) yb--;
    let ty = yb; while (road(tx, ty - 1)) ty--;               // ty: fila junto al cordón norte (la plaza), yb: cordón sur
    if (yb - ty >= 3) {
      // largo de la cuadra: mientras haya vereda del lado de la plaza
      let x0 = tx, x1 = tx;
      while (curb(x0 - 1, ty - 1) && road(x0 - 1, ty)) x0--;
      while (curb(x1 + 1, ty - 1) && road(x1 + 1, ty)) x1++;
      x0 += 2; x1 -= 2;                                       // lejos de las esquinas
      const yl = ty * S + 11, yr = (yb + 1) * S - 6;           // autos a 8 px del cordón norte, motos contra el cordón sur
      const fx = (x0 + 1) * S;
      // autos en fila, mirando hacia el este (el sentido de la calle); el primero, rojo, frente a donde arrancás
      const slots = [];
      for (let px = x0 * S + 26; px <= x1 * S - 26; px += 54) slots.push(px);
      slots.sort((a, b) => Math.abs(a - near.x) - Math.abs(b - near.x));
      first = add(slots[0], yl, Math.PI / 2, 0, 'car', 'mita');
      for (let i = 1; i < slots.length; i++) if (rnd() < 0.6) add(slots[i], yl, Math.PI / 2, 1 + ((rnd() * (VR.CAR_COLORS.length - 1)) | 0));
      // motos en batería, la rueda trasera contra el cordón sur (miran hacia la calle), cada 11 px
      if (battery(yb - ty + 1)) { for (let px = fx; px <= x1 * S - 10; px += 14) if (rnd() < 0.5)
        add(px + ((rnd() * 2) | 0), yr - 11, (rnd() < 0.5 ? 0 : 0.12) - 0.06 + (rnd() < 0.15 ? 0.25 : 0), (rnd() * VR.MOTO_COLORS.length) | 0, 'moto'); }
      else for (let px = fx + 14; px <= x1 * S - 16; px += 32) if (rnd() < 0.55) add(px, (yb + 1) * S - 7, Math.PI / 2, (rnd() * VR.MOTO_COLORS.length) | 0, 'moto');
      world.parkingDemo = [{ x0: x0 * S, x1: x1 * S, y0: ty * S, y1: (yb + 1) * S }];
    }
    // --- y en General Díaz, del lado este de la plaza (mano única hacia el norte): autos a la izquierda
    //     (oeste, el lado de la plaza, como en la foto satelital) y motos a la derecha ---
    const ai = world.areas.indexOf('Plaza de los Héroes') + 1;
    if (ai) {
      let bx0 = 1e9, bx1 = -1, by0 = 1e9, by1 = -1;
      const cx0 = Math.max(0, tx - 90), cy0 = Math.max(0, Math.floor(near.y / S) - 90);
      for (let y = cy0; y < Math.min(world.h, cy0 + 180); y++) for (let x = cx0; x < Math.min(world.w, cx0 + 180); x++)
        if (world.area[y * world.w + x] === ai) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
      if (bx1 > 0) {
        const my = (by0 + by1) >> 1;
        let xa = bx1 + 1, lim2 = 10; while (lim2-- > 0 && !road(xa, my)) xa++;
        let xb = xa; while (road(xb + 1, my)) xb++;
        if (xb - xa >= 3) {
          const ya = by0 + 3, yz = by1 - 3, xl = xa * S + 11, xr = (xb + 1) * S - 6;
          for (let py = ya * S + 26; py <= yz * S - 26; py += 54) if (rnd() < 0.6) add(xl, py, 0, 1 + ((rnd() * (VR.CAR_COLORS.length - 1)) | 0));
          if (battery(xb - xa + 1)) { for (let py = (ya + 1) * S; py <= yz * S - 10; py += 14) if (rnd() < 0.5)
            add(xr - 11, py + ((rnd() * 2) | 0), -Math.PI / 2 - 0.06 + (rnd() < 0.5 ? 0 : 0.12) + (rnd() < 0.15 ? 0.25 : 0), (rnd() * VR.MOTO_COLORS.length) | 0, 'moto'); }
          else for (let py = (ya + 1) * S + 14; py <= yz * S - 16; py += 32) if (rnd() < 0.55) add((xb + 1) * S - 7, py, 0, (rnd() * VR.MOTO_COLORS.length) | 0, 'moto');
          (world.parkingDemo = world.parkingDemo || []).push({ x0: xa * S, x1: (xb + 1) * S, y0: ya * S, y1: yz * S });
        }
        // Coronel Bogado, del lado oeste de la plaza (mano única hacia el sur): autos a la izquierda (este,
        // el lado de la plaza) y motos a la derecha (oeste, frente a los negocios), como en el video de Leandro
        let wb = bx0 - 1, lim3 = 10; while (lim3-- > 0 && !road(wb, my)) wb--;
        let wa = wb; while (road(wa - 1, my)) wa--;
        if (wb - wa >= 3) {
          const ya = by0 + 3, yz = by1 - 3, xl = (wb + 1) * S - 11, xr = wa * S + 6;
          for (let py = ya * S + 26; py <= yz * S - 26; py += 54) if (rnd() < 0.6) add(xl, py, Math.PI, 1 + ((rnd() * (VR.CAR_COLORS.length - 1)) | 0));
          if (battery(wb - wa + 1)) { for (let py = (ya + 1) * S; py <= yz * S - 10; py += 14) if (rnd() < 0.5)
            add(xr + 11, py + ((rnd() * 2) | 0), Math.PI / 2 - 0.06 + (rnd() < 0.5 ? 0 : 0.12) + (rnd() < 0.15 ? -0.25 : 0), (rnd() * VR.MOTO_COLORS.length) | 0, 'moto'); }
          else for (let py = (ya + 1) * S + 14; py <= yz * S - 16; py += 32) if (rnd() < 0.55) add(wa * S + 7, py, Math.PI, (rnd() * VR.MOTO_COLORS.length) | 0, 'moto');
          world.parkingDemo.push({ x0: wa * S, x1: (wb + 1) * S, y0: ya * S, y1: yz * S });
        }
      }
    }
  }

  // Lugar para estacionar (04/11/2026, menos y mejor repartidos): solo en calles de 5 baldosas (10 m) o más,
  // con cordón a lo largo de ~8 baldosas (lejos de las esquinas) y sin otro vehículo enfrente, así siempre
  // queda lugar para que pasen dos autos.
  const across = (x, y, dx, dy) => { let n = 0; while (n < 14 && road(x + dx * n, y + dy * n)) n++; return n; };
  const spot = (x, y) => {
    if (!road(x, y)) return null;
    for (const dy of [-1, 1]) {
      if (!curb(x, y + dy) || across(x, y, 0, -dy) < 5) continue;
      let ok = true;
      for (let i = -3; i <= 4 && ok; i++) ok = road(x + i, y) && road(x + i, y - dy) && curb(x + i, y + dy) && !world.line[y * world.w + x + i];
      if (ok) { const w = across(x, y, 0, -dy); return [x * S + 16, y * S + 8 - dy, rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2, dy, 0, [x * S - 24, Math.min(y, y - dy * (w - 1)) * S, x * S + 56, (Math.max(y, y - dy * (w - 1)) + 1) * S]]; }
    }
    for (const dx of [-1, 1]) {
      if (!curb(x + dx, y) || across(x, y, -dx, 0) < 5) continue;
      let ok = true;
      for (let i = -3; i <= 4 && ok; i++) ok = road(x, y + i) && road(x - dx, y + i) && curb(x + dx, y + i) && !world.line[(y + i) * world.w + x];
      if (ok) { const w = across(x, y, -dx, 0); return [x * S + 8 - dx, y * S + 16, rnd() < 0.5 ? 0 : Math.PI, 0, dx, [Math.min(x, x - dx * (w - 1)) * S, y * S - 24, (Math.max(x, x - dx * (w - 1)) + 1) * S, y * S + 56]]; }
    }
    return null;
  };
  const free = (cx, cy, r) => !world.boxOverlap(cx - r, cy - r, cx + r, cy + r);
  const demo = world.parkingDemo;
  const inDemo = (x, y) => demo && demo.some((d) => x > d.x0 - 60 && x < d.x1 + 60 && y > d.y0 - 60 && y < d.y1 + 60);
  for (let tries = 0; tries < n * 60 && cars.length < n; tries++) {
    const x = 2 + ((rnd() * (world.w - 4)) | 0), y = 2 + ((rnd() * (world.h - 4)) | 0);
    const s = spot(x, y);
    if (!s || inDemo(s[0], s[1])) continue;
    const band = s[5]; if (world.boxOverlap(band[0], band[1], band[2], band[3])) continue; // nada enfrente ni pegado
    if (rnd() < 0.25) { // 2 o 3 motos en batería contra el cordón
      const [cx, cy, , dy, dx] = s, k = 2 + ((rnd() * 2) | 0);
      for (let i = 0; i < k; i++) {
        const mx = dy ? cx - 14 + i * 14 : cx + dx * 5, my = dy ? cy + dy * 5 : cy - 14 + i * 14;
        const a = dy ? (dy > 0 ? 0 : Math.PI) : (dx > 0 ? -Math.PI / 2 : Math.PI / 2);
        if (free(mx, my, 8)) add(mx, my, a, (rnd() * VR.MOTO_COLORS.length) | 0, 'moto');
      }
    } else if (free(s[0], s[1], 24)) add(s[0], s[1], s[2], 1 + ((rnd() * (VR.CAR_COLORS.length - 1)) | 0));
  }
  return { cars, first };
};

// rectángulos girados (vehículos): separación por ejes
VR.obb = (x, y, a, hl, hw) => { const fx = Math.sin(a), fy = -Math.cos(a); return { x, y, fx, fy, rx: -fy, ry: fx, hl, hw, ex: Math.hypot(hl, hw) }; };
VR.obbHit = (A, B) => {
  const dx = B.x - A.x, dy = B.y - A.y;
  if (Math.hypot(dx, dy) > A.ex + B.ex) return false;
  for (const [ax, ay] of [[A.fx, A.fy], [A.rx, A.ry], [B.fx, B.fy], [B.rx, B.ry]]) {
    const ra = A.hl * Math.abs(A.fx * ax + A.fy * ay) + A.hw * Math.abs(A.rx * ax + A.ry * ay);
    const rb = B.hl * Math.abs(B.fx * ax + B.fy * ay) + B.hw * Math.abs(B.rx * ax + B.ry * ay);
    if (Math.abs(dx * ax + dy * ay) > ra + rb) return false;
  }
  return true;
};
VR.obbIn = (A, px, py) => { const dx = px - A.x, dy = py - A.y; return Math.abs(dx * A.fx + dy * A.fy) <= A.hl && Math.abs(dx * A.rx + dy * A.ry) <= A.hw; };
VR.obbCorners = (A) => [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([l, w]) => [A.x + A.fx * A.hl * l + A.rx * A.hw * w, A.y + A.fy * A.hl * l + A.ry * A.hw * w]);
