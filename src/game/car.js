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
VR.VK = 1.0; VR.VSS = 5; // escala real (11/11/2026, pedido de Leandro: más realista); antes ×1,15 y, antes, ×1,3
VR.oblOn = () => !!(VR.OBL && VR.OBL.on);
VR.vbase = (w, h, fn, prof, sx) => {
  const k = VR.VK * VR.VSS; let c = VR.canvas(Math.round(w * k), Math.round(h * k)), g = c.getContext('2d');
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
  if (sx && sx < 1) { const n = VR.canvas(Math.round(w * sx * k), c.height); n.getContext('2d').drawImage(c, 0, 0, n.width, n.height); c = n; } // más angosto (proporción real)
  c.ss = k / VR.VK; // cuánto más grande está dibujado respecto del sprite final
  if (prof && VR.OBL && VR.OBL.on) c.prof = prof(); // perfil para la vista oblicua (oblicuo.js)
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
  if (!VR.oblOn()) { // ventanillas vistas desde arriba: en la vista oblicua van en el costado (si no, salen dos veces)
  T.rr(1.2, 12.4, 1.2, 4.4, 0.4, T.vg(12, 17, gl)); T.rr(13.6, 12.4, 1.2, 4.4, 0.4, T.vg(12, 17, gl)); // ventanillas
  T.rr(1.2, 17.2, 1.2, 4.2, 0.4, T.vg(17, 21, gl)); T.rr(13.6, 17.2, 1.2, 4.2, 0.4, T.vg(17, 21, gl));
  }
  T.poly([[2.8, 21.8], [13.2, 21.8], [12.6, 25], [3.4, 25]], T.vg(21.8, 25, gl));          // luneta
  T.rr(3.4, 25.2, 9.2, 3.6, 1, T.hg(3.4, 12.6, [C, L, D]));                               // portón
  st(25.2, 28.6);
  T.rr(6.4, 28.3, 3.2, 0.9, 0.2, '#f2f0ea');                                             // patente
  T.rr(1.2, 27.6, 2.4, 1.6, 0.6, '#d8302a'); T.rr(12.4, 27.6, 2.4, 1.6, 0.6, '#d8302a'); // luces traseras
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0.8, 12.6, 0.5, 9); g.fillRect(14.7, 12.6, 0.5, 9);
  if (t.aleron === 'chico') { T.rr(3, 25.4, 10, 1, 0.4, D); T.rr(3.2, 25.4, 9.6, 0.4, 0.2, L); }
  if (t.aleron === 'grande') { T.rr(5, 25.6, 0.8, 1.6, 0.2, '#2a2a30'); T.rr(10.2, 25.6, 0.8, 1.6, 0.2, '#2a2a30'); T.rr(0.8, 26.2, 14.4, 1.7, 0.5, T.hg(0.8, 15.2, [D, L, C, D])); T.rr(1, 26.3, 14, 0.5, 0.2, 'rgba(255,255,255,.25)'); }
}, () => VR.OBL.car(VR.OBL.MITA, pal, t));
// Motos y vehículos de dos (y tres) ruedas, vistos desde arriba mirando hacia arriba. Diseños propios por
// categoría (sin marcas ni modelos reales): moto "cub", mini moto, moto de calle 150, motocarga y patineta.
VR.drawMotoCub = (pal, t = {}) => VR.vbase(10, 21, (T) => { // rehecha el 13/11/2026 con fotos de una moto cub: ruedas grandes, escudo delantero, piso bajo, asiento largo
  const [C, D, L] = pal, S2 = VR.tunePal ? VR.tunePal(t.color2 ?? 11)[0] : '#fff', HL = t.faros === 'xenon' ? '#e6f2ff' : '#fff4c0';
  T.tire(4.4, 0.1, 1.2, 6.2); T.tire(4.4, 14.2, 1.2, 6.2);
  T.rr(3.8, 0.9, 2.4, 5, 1, C); T.rr(4.1, 1.2, 0.6, 3.6, 0.3, L);                                    // guardabarros delantero
  T.poly([[3.2, 5.7], [6.8, 5.7], [7.6, 9.4], [6.2, 10.4], [3.8, 10.4], [2.4, 9.4]], T.hg(2.4, 7.6, [L, C, C, D]));  // escudo
  T.rr(3.5, 6.1, 3, 1.5, 0.7, HL); T.ell(5, 6.9, 0.9, 0.4, 'rgba(255,255,255,.4)');                     // faro
  T.ell(3.2, 6.2, 0.35, 0.3, '#f0a020'); T.ell(6.8, 6.2, 0.35, 0.3, '#f0a020');                       // luces de giro
  T.line(0.8, 7.05, 9.2, 7.05, 0.75, '#2a2a2e'); T.line(0.8, 7.05, 1.8, 7.05, 0.9, '#55555c'); T.line(8.2, 7.05, 9.2, 7.05, 0.9, '#55555c'); // manubrio y puños
  T.line(1.8, 6.9, 1.2, 7.7, 0.3, CHR[0]); T.line(8.2, 6.9, 8.8, 7.7, 0.3, CHR[0]); T.ell(1.2, 7.7, 0.55, 0.8, CHR[1]); T.ell(8.8, 7.7, 0.55, 0.8, CHR[1]); // espejos
  T.rr(4.1, 7.8, 1.8, 1.2, 0.4, '#1a2230');                                                          // tablero
  T.rr(3.2, 10.4, 3.6, 1.6, 0.4, '#3a3a40'); for (let x = 3.6; x < 6.6; x += 0.7) T.rr(x, 10.55, 0.3, 1.3, 0, '#2a2a2e'); // piso con estrías
  T.rr(3, 11.8, 4, 7, 1.2, T.hg(3, 7, [L, C, D]));                                                   // tapas laterales
  if (t.franja && t.franja !== 'no') { T.rr(3.1, 12.6, 0.5, 4.6, 0.2, S2); T.rr(6.4, 12.6, 0.5, 4.6, 0.2, S2); T.rr(4.3, 6.8, 1.4, 2.6, 0.3, S2); }
  T.rr(3.1, 10.8, 3.8, 8.5, 1.6, T.hg(3.1, 6.9, ['#3a3a40', '#26262a', '#1a1a1e']));              // asiento largo
  T.line(5, 11.4, 5, 19, 0.15, '#4a4a52');
  T.rr(3.2, 19, 3.6, 1.6, 0.6, C); T.rr(4, 20.2, 2, 0.6, 0.3, '#e8302a');                           // cola y luz
  T.rr(6.9, t.escape === 'deportivo' ? 14 : 14.8, 0.7, t.escape === 'deportivo' ? 6.4 : 5.6, 0.35, T.hg(6.9, 7.6, CHR));  // escape
}, () => VR.OBL.moto('cub', pal, t));
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
}, () => VR.OBL.moto('mini', pal));
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
}, () => VR.OBL.moto('calle', pal));
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
}, () => VR.OBL.moto('carga', pal));
VR.drawPati = (pal, t = {}) => VR.vbase(6, 14, (T) => { // manubrio en T, tabla angosta
  const [C, D] = pal;
  T.tire(2, 0, 2, 3); T.tire(2, 11, 2, 3);
  T.line(0.4, 2.4, 5.6, 2.4, 0.7, '#2a2a2e'); T.ell(0.5, 2.4, 0.5, 0.45, '#d8dce4'); T.ell(5.5, 2.4, 0.5, 0.45, '#d8dce4');
  T.ell(3, 3.1, 0.7, 0.6, C); T.ell(3, 2.4, 0.4, 0.3, t.faros === 'xenon' ? '#e6f2ff' : '#fff4c0');
  T.rr(1, 4, 4, 8, 1.2, T.hg(1, 5, [C, '#2a2a30', '#2a2a30', D])); T.rr(1.7, 4.7, 2.6, 6.6, 0.8, '#3c3c44');
  for (let y = 5.2; y < 11; y += 0.9) T.line(2, y, 4, y, 0.2, '#2c2c32');
  T.rr(2.2, 12, 1.6, 0.6, 0.3, '#e8302a');
}, () => VR.OBL.moto('pati', pal));
VR.BICI_COLORS = [['#2f5fa8', '#1e3f74', '#5c8ad0'], ['#c8322a', '#8e1f1a', '#e4685c'], ['#e8e6e0', '#a9a69e', '#ffffff'], ['#3f8f4a', '#28552f', '#66b872'], ['#e8b830', '#a8841c', '#f4d870'], ['#2c2c32', '#16161a', '#55555e']];
VR.drawBici = (pal, t = {}) => VR.vbase(6, 15, (T) => { // vista desde arriba: dos cubiertas finitas, cuadro al medio, manubrio recto, asiento y parrilla
  const [C, D] = pal;
  T.tire(2.4, 0.2, 1.2, 3.6); T.tire(2.4, 11.2, 1.2, 3.6);
  T.line(3, 2.4, 3, 12.4, 0.5, D); T.line(3, 3.0, 3, 10.2, 0.34, C);
  T.line(0.5, 3.4, 5.5, 3.4, 0.4, '#2a2a2e'); T.ell(0.45, 3.4, 0.5, 0.4, '#16161a'); T.ell(5.55, 3.4, 0.5, 0.4, '#16161a');
  T.ell(3, 2.8, 0.38, 0.3, t.faros === 'xenon' ? '#e6f2ff' : '#fff4c0');
  T.ell(3, 9.6, 0.7, 1.15, '#202126'); T.ell(1.9, 8.0, 0.5, 0.28, '#2a2a30'); T.ell(4.1, 9.0, 0.5, 0.28, '#2a2a30');
  T.rr(2.2, 12.3, 1.6, 2.2, 0.4, '#3a3d44'); T.rr(2.6, 14.3, 0.8, 0.4, 0.2, '#e8302a');
}, () => VR.OBL.moto('bici', pal));
// Conductor visto desde arriba (10×20 unidades): casco o pelo, hombros con sombra, brazos al manubrio, rodillas.
// o (05/11/2026): colores del personaje que maneja (piel, pantalón, pelo o gorra), así el jugador se ve como el
// personaje que eligió o se armó en la tienda.
VR.drawRiderBase = (shirt, head, o = {}) => VR.vbase(10, 20, (T) => {
  const helmet = o.helmet !== undefined ? o.helmet : head !== '#2a1b12', skin = o.skin || '#a76c42', pants = o.pants || '#2c3e6b';
  T.line(2, 9, 1, 5.4, 1.4, o.sleeves === false ? skin : shirt[1]); T.line(8, 9, 9, 5.4, 1.4, o.sleeves === false ? skin : shirt[1]); // brazos
  T.ell(1, 5.1, 0.6, 0.6, skin); T.ell(9, 5.1, 0.6, 0.6, skin);                          // manos
  T.ell(2.6, 12.6, 1.1, 1.6, pants); T.ell(7.4, 12.6, 1.1, 1.6, pants);                  // rodillas
  if (o.long) T.rr(2.2, 6.8, 5.6, 4.6, 1.6, VR.shadeHex(head, 0.85));                    // pelo largo sobre la espalda
  T.rr(1.4, 7.4, 7.2, 5.4, 2.4, T.hg(1.4, 8.6, [VR.shadeHex(shirt[0], 1.2), shirt[0], shirt[1]])); // espalda
  T.ell(5, 7, helmet ? 2.2 : 1.9, helmet ? 2.3 : 2, T.hg(3, 7, [VR.shadeHex(head, 1.4), head, VR.shadeHex(head, 0.7)])); // cabeza
  if (helmet) T.rr(3.6, 5, 2.8, 0.8, 0.4, '#1e2430'); else T.ell(4.4, 6.2, 0.6, 0.4, 'rgba(255,255,255,.18)');
  if (o.cap) T.rr(3.4, 3.6, 3.2, 1.6, 0.6, VR.shadeHex(head, 0.7));                       // visera
});

// Conductor de verdad visto desde arriba (05/11/2026, segunda versión): se arma con el look del avatar 2
// (cuerpo, piel, ropa con sus colores, peinado, gorra, casco, mochila…) y gira junto con la moto en los 64
// ángulos, inclinado hacia el manubrio, con las manos en los puños, las rodillas a los costados del tanque y los
// pies en los posapiés. geo: dónde quedan los puños (gy adelante, gx al costado), la cadera (hip) y si va parado.
VR.drawRiderTop = (L0, geo = {}) => VR.OBL.parts(['legs', 'body', 'head'], geo, (PART) => VR.vbase(14, 24, (T) => {
  const C = VR.AV2_CAT, L = Object.assign({}, VR.AV2_DEFAULT, L0), SH = VR.shadeHex, g = T.g;
  const cx = 7, cy = 12, X = (d) => cx + d, Y = (d) => cy + d;
  // geo.pas (12/11/2026): pasajero de atrás: derecho, con las manos en la cintura del conductor (no en el manubrio) y las rodillas bien abiertas
  const gy = geo.gy ?? -5.8, gx = geo.gx ?? 4.3, stand = !!geo.stand, hip = stand ? 1.2 : (geo.hip ?? 3), pas = !!geo.pas;
  const f = L.gender === 'f', bw = { flaco: 5.2, normal: 5.8, fornido: 6.6, panza: 6.2 }[L.build] || 5.8, sw = bw * (f ? 0.88 : 1);
  const skin = C.skin[L.skin], skD = SH(skin, 0.8), hairC = C.hairColor[L.hairColor];
  const topC = L.top === 'top' ? skin : C.cloth[L.topColor], top2 = C.cloth[L.topColor2 ?? 1];
  const jean = L.bottom === 'jean', pants = jean ? C.denim[L.bottomColor % C.denim.length] : C.cloth[L.bottomColor % C.cloth.length];
  const shoe = C.cloth[L.shoesColor % C.cloth.length], hatC = C.cloth[L.hatColor % C.cloth.length];
  const shortLeg = ['bermuda', 'cargoShort', 'short'].includes(L.bottom), skirt = L.bottom === 'pollera';
  const sleeve = L.top === 'musculosa' || L.top === 'top' ? 0 : ['camisa', 'buzo', 'sueter', 'campera', 'puffer', 'hoodieAbierto'].includes(L.top) ? 1 : 0.45;
  const sh = stand ? -0.6 : gy + 4.3, head = stand ? -0.9 : sh - 1.1; // hombros y cabeza (inclinada hacia adelante)
  const lw = 1.7; // grosor de las piernas
  const seg = (x0, y0, x1, y1, w, col) => T.line(X(x0), Y(y0), X(x1), Y(y1), w, col);
  // piernas
  if (!PART || PART === 'legs') {
  if (stand) {
    for (const [dx, dy] of [[-0.9, 0.6], [0.9, 2.4]]) { T.ell(X(dx), Y(dy), 0.9, 1.5, shoe); T.ell(X(dx), Y(dy - 0.9), 0.5, 0.35, SH(shoe, 1.3)); }
    seg(-0.9, 0.4, -0.7, 0, 1.6, shortLeg || skirt ? skin : pants); seg(0.9, 2, 0.7, 1, 1.6, shortLeg || skirt ? skin : pants);
  } else {
    const kx = geo.kx ?? Math.min(gx * 0.66, 3.2), ky = sh + 0.9, fx = kx + 0.3, fy = ky + 2.2, hx = sw * 0.3;
    for (const s of [-1, 1]) {
      T.ell(X(s * fx), Y(fy), 0.85, 1.35, shoe); T.ell(X(s * fx), Y(fy - 0.8), 0.5, 0.35, SH(shoe, 1.35)); // pie en el posapié
      seg(s * fx, fy - 0.4, s * kx, ky, lw * 0.9, shortLeg || skirt ? skin : SH(pants, 0.85));          // pantorrilla
      seg(s * hx, hip - 0.2, s * kx, ky, lw, skirt ? skin : pants);                                       // muslo
      if (shortLeg) seg(s * hx, hip - 0.2, s * (hx + (kx - hx) * 0.55), hip + (ky - hip) * 0.55, lw + 0.15, pants);
      T.ell(X(s * kx), Y(ky), lw * 0.55, lw * 0.55, shortLeg || skirt ? SH(skin, 1.08) : SH(pants, 1.12)); // rodilla
    }
    if (skirt) T.ell(X(0), Y(hip - 0.6), sw * 0.55, 1.9, T.hg(X(-sw / 2), X(sw / 2), [SH(pants, 1.2), pants, SH(pants, 0.7)]));
    else T.ell(X(0), Y(hip), sw * 0.42, 1.2, T.hg(X(-sw / 2), X(sw / 2), [SH(pants, 1.15), pants, SH(pants, 0.7)])); // cola en el asiento
  }
  }
  if (!PART || PART === 'body') {
  // brazos (hombro → codo → mano en el puño)
  const shx = sw / 2 - 0.5, arm = L.top === 'puffer' ? 1.55 : 1.25;
  for (const s of [-1, 1]) {
    const ex = (shx + gx) / 2 + (pas ? 0.9 : 1.1), ey = (sh + gy) / 2 + 0.3; // codos un poco abiertos: brazos flexionados, no "manos arriba"
    const up = sleeve > 0 ? topC : skin, lo = sleeve >= 1 ? topC : skin;
    seg(s * shx, sh + 0.3, s * ex, ey, arm, SH(up, 0.88)); seg(s * ex, ey, s * gx, gy + 0.2, arm * 0.9, SH(lo, 0.88));
    if (sleeve > 0 && sleeve < 1) seg(s * shx, sh + 0.3, s * (shx + (ex - shx) * 0.6), sh + (ey - sh) * 0.6, arm + 0.2, SH(topC, 0.95));
    if (L.reloj && s < 0) seg(s * (gx - 0.6), gy + 0.9, s * (gx - 0.3), gy + 0.5, arm, '#2a2a30');
    T.ell(X(s * gx), Y(gy), 0.7, 0.75, skin); // mano
  }
  // espalda / torso (luz a la izquierda)
  const ty0 = sh - 0.9, ty1 = stand ? 1.6 : hip + 0.3, tw = sw;
  T.rr(X(-tw / 2), Y(ty0), tw, ty1 - ty0, [2.2, 2.2, 1.6, 1.6], T.hg(X(-tw / 2), X(tw / 2), [SH(topC, 1.18), topC, topC, SH(topC, 0.72)]));
  if (L.top === 'musculosa' || L.top === 'top') { T.ell(X(-tw / 2 + 0.7), Y(ty0 + 0.7), 0.7, 0.6, skin); T.ell(X(tw / 2 - 0.7), Y(ty0 + 0.7), 0.7, 0.6, skD); }
  if (L.top === 'camiseta') { g.save(); g.beginPath(); g.roundRect(X(-tw / 2), Y(ty0), tw, ty1 - ty0, [2.2, 2.2, 1.6, 1.6]); g.clip(); g.fillStyle = top2; for (let y = ty0 + 0.5; y < ty1; y += 1.2) g.fillRect(X(-tw / 2), Y(y), tw, 0.5); g.restore(); }
  if (L.top === 'puffer') for (let y = ty0 + 1; y < ty1 - 0.3; y += 1.1) T.line(X(-tw / 2 + 0.4), Y(y), X(tw / 2 - 0.4), Y(y), 0.18, SH(topC, 0.7));
  if (L.top === 'campera' || L.top === 'hoodieAbierto') T.line(X(0), Y(ty0 + 0.6), X(0), Y(ty1 - 0.2), 0.2, SH(topC, 0.65));
  if (L.top === 'polo' || L.top === 'camisa' || L.top === 'camisaCorta') T.rr(X(-1.3), Y(ty0 + 0.2), 2.6, 0.7, 0.35, SH(topC, 1.25)); // cuello
  if (L.top === 'buzo' || L.top === 'hoodieAbierto') T.ell(X(0), Y(head + 2.2), 1.7, 0.9, SH(topC, 0.82)); // capucha caída en la espalda
  if (L.print && !['camiseta', 'puffer', 'top'].includes(L.top)) T.rr(X(-1), Y((ty0 + ty1) / 2), 2, 1.3, 0.3, top2);
  if (L.mochila) { const pk = C.cloth[L.packColor % C.cloth.length]; T.line(X(-1.4), Y(ty0 + 0.4), X(-1.3), Y(ty0 + 2), 0.35, SH(pk, 0.6)); T.line(X(1.4), Y(ty0 + 0.4), X(1.3), Y(ty0 + 2), 0.35, SH(pk, 0.6)); T.rr(X(-1.9), Y(ty0 + 1.5), 3.8, Math.max(2.6, ty1 - ty0 - 1.8), 1, T.hg(X(-1.9), X(1.9), [SH(pk, 1.2), pk, SH(pk, 0.7)])); T.rr(X(-1.2), Y(ty1 - 1.6), 2.4, 0.9, 0.4, SH(pk, 0.8)); }
  }
  if (PART && PART !== 'head') return;
  // cabeza: pelo, gorra, sombrero o casco
  const hat = L.hat, cap = hat === 'gorra' || hat === 'gorraAtras' || hat === 'gorro', hr = 1.75;
  const longH = ['largo', 'ondulado', 'onduladoFlequillo', 'medio'].includes(L.hair) && hat !== 'casco';
  if (longH) T.rr(X(-1.7), Y(head), 3.4, L.hair === 'medio' ? 2.8 : 4.4, [1.2, 1.2, 1.6, 1.6], T.hg(X(-1.7), X(1.7), [SH(hairC, 1.2), hairC, SH(hairC, 0.75)]));
  if (L.hair === 'trenza' && hat !== 'casco') for (let i = 0; i < 5; i++) T.ell(X(0), Y(head + 1.8 + i * 0.75), 0.55, 0.45, i % 2 ? SH(hairC, 0.8) : hairC);
  if (L.hair === 'colita' && hat !== 'casco') { T.ell(X(0), Y(head + 1.9), 0.5, 0.4, '#d23c6a'); T.ell(X(0), Y(head + 2.9), 0.65, 1, hairC); }
  if (L.hair === 'colitaLado' && hat !== 'casco') T.ell(X(1.9), Y(head + 1.6), 0.7, 1.2, hairC);
  T.ell(X(-hr + 0.1), Y(head + 0.1), 0.45, 0.6, skD); T.ell(X(hr - 0.1), Y(head + 0.1), 0.45, 0.6, skD); // orejas
  T.ell(X(0), Y(head), hr, hr * 1.05, skin);
  if (hat === 'casco') { // casco integral visto desde arriba: sombra sobre los hombros, cáscara con brillo, franja central, visor oscuro con reflejo y tirita
    T.ell(X(0.3), Y(head + 0.5), 2.75, 2.9, 'rgba(0,0,0,.2)');
    T.ell(X(0), Y(head), 2.3, 2.5, T.hg(X(-2.3), X(2.3), [SH(hatC, 1.5), hatC, SH(hatC, 0.62)]));
    T.line(X(0), Y(head - 0.9), X(0), Y(head + 2.3), 0.5, SH(hatC, 0.6)); T.line(X(-0.05), Y(head - 0.9), X(-0.05), Y(head + 2.2), 0.18, 'rgba(255,255,255,.5)'); // franja
    T.rr(X(-1.75), Y(head - 2.5), 3.5, 1.25, [1.1, 1.1, 0.35, 0.35], '#141820'); T.ell(X(-0.7), Y(head - 2.05), 0.75, 0.22, 'rgba(170,200,240,.7)'); T.ell(X(0.9), Y(head - 1.8), 0.3, 0.14, 'rgba(170,200,240,.35)'); // visor
    T.ell(X(-1.0), Y(head + 0.1), 0.85, 0.6, 'rgba(255,255,255,.5)'); T.ell(X(1.4), Y(head + 0.9), 0.5, 0.9, 'rgba(0,0,0,.18)');
  } else if (hat === 'piri') {
    T.ell(X(0), Y(head), 3.3, 3.2, T.hg(X(-3.3), X(3.3), ['#ecd49a', '#d8b870', '#b0904e'])); for (let r = 1.4; r < 3.2; r += 0.6) { g.strokeStyle = 'rgba(120,90,40,.35)'; g.lineWidth = 0.15; g.beginPath(); g.ellipse(X(0), Y(head), r, r, 0, 0, 7); g.stroke(); }
    T.ell(X(0), Y(head), 1.6, 1.6, '#c8a860'); T.ell(X(0), Y(head), 1.65, 1.65, 'rgba(0,0,0,0)'); g.strokeStyle = '#2a1e14'; g.lineWidth = 0.35; g.beginPath(); g.arc(X(0), Y(head), 1.6, 0, 7); g.stroke();
  } else if (cap) {
    T.ell(X(0), Y(head + 0.1), hr + 0.1, hr * 1.05, T.hg(X(-hr), X(hr), [SH(hatC, 1.3), hatC, SH(hatC, 0.7)]));
    if (hat === 'gorra') T.ell(X(0), Y(head - hr - 0.2), 1.5, 1, SH(hatC, 0.8));
    if (hat === 'gorraAtras') T.ell(X(0), Y(head + hr + 0.2), 1.5, 1, SH(hatC, 0.8));
    if (hat === 'gorro') { T.line(X(-hr), Y(head + 0.8), X(hr), Y(head + 0.8), 0.6, SH(hatC, 0.8)); T.ell(X(0), Y(head), 0.6, 0.6, SH(hatC, 1.3)); }
    T.ell(X(0), Y(head - 0.6), 0.4, 0.4, SH(hatC, 0.6));
  } else if (L.hair !== 'pelado') {
    const hc = L.hair === 'rapado' ? SH(hairC, 1.0) : hairC, rr = L.hair === 'rapado' ? hr - 0.1 : hr + 0.05;
    T.ell(X(0), Y(head + 0.15), rr, rr * 1.02, T.hg(X(-rr), X(rr), [SH(hc, 1.35), hc, SH(hc, 0.7)]));
    if (L.hair === 'rapado') T.ell(X(0), Y(head + 0.15), rr, rr, 'rgba(201,139,92,.35)');
    if (L.hair === 'rulos') for (const [a, b] of [[-1, -0.8], [0.9, -0.6], [0, 0.4], [-1.1, 0.9], [1.1, 1], [0, -1.3]]) T.ell(X(a), Y(head + b), 0.65, 0.6, SH(hairC, 1.25));
    if (L.hair === 'rodete') T.ell(X(0), Y(head + 0.5), 0.95, 0.9, SH(hairC, 1.2));
    if (L.hair === 'degrade') T.ell(X(0), Y(head - 0.2), rr - 0.5, rr - 0.6, SH(hairC, 1.15));
    T.ell(X(-0.6), Y(head - 0.5), 0.6, 0.4, 'rgba(255,255,255,.18)');
    if (L.hair !== 'rapado') T.ell(X(0), Y(head - hr + 0.35), 1.1, 0.35, skin); // frente
  } else T.ell(X(-0.5), Y(head - 0.4), 0.7, 0.5, 'rgba(255,255,255,.3)');
}));
// geometría del pasajero según la del conductor de esa moto (cub: puños en gy -5.8): manos a la cintura de quien maneja, rodillas abiertas
VR.pasGeo = (g = {}) => ({ pas: true, gy: -3.7, gx: 3.1, hip: 3.4, kx: 3.6, zoff: g.zoff || 0 });
VR.riderTopFrames = (() => {
  const cache = new Map();
  return (L, geo) => {
    const key = JSON.stringify(L) + JSON.stringify(geo || {});
    let f = cache.get(key);
    if (!f) { f = VR.rotFrames(VR.drawRiderTop(L, geo), Math.round(26 * VR.VK) + 2); cache.set(key, f); }
    return f;
  };
})();

// Rota un sprite a 64 ángulos. Los dibujos suaves (VR.vbase) se rotan grandes con suavizado, se contornean y
// se achican: quedan sin escalones. Los de píxel (otros) se rotan al pixel con vecino más cercano.
// Si el dibujo trae un perfil (base.prof, ver oblicuo.js) sale con volumen, en vista oblicua: el cuadro crece hacia
// arriba y abajo lo mismo (sigue centrado en el vehículo) y la sombra se hace con la silueta apoyada en el piso.
VR.rotBlank = () => VR._blank || (VR._blank = VR.canvas(2, 2));
VR.rotFrames = (base, S, outline = true) => {
  const OB = VR.OBL && VR.OBL.on && base.prof ? VR.OBL : null;
  if (OB) S += 2 * OB.extra(base);
  // Cada ángulo se dibuja recién cuando hace falta (y se guarda): antes se armaban los 64 de una vez cada vez
  // que aparecía un vehículo de un color nuevo, y eso trababa el juego (sobre todo en el teléfono).
  const N = 64, f = { img: new Array(N), shadow: new Array(N), S, lift: OB ? base.prof.lift * OB.kz : 0 };
  const ss = base.ss || 1, SR = Math.round(S * (VR.RES || 1)); // tamaño en el lienzo (resolución ×2)
  let src = null;
  const makeGen = function* (k) {
    const a = k / N * Math.PI * 2;
    let c, flat = null;
    if (ss > 1) {
      const B = S * ss, mk = () => { const big = VR.canvas(B, B), x = big.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.translate(B / 2, B / 2); x.rotate(a); x.drawImage(base, -base.width / 2, -base.height / 2); return big; };
      const big = OB ? yield* OB.renderGen(base, a, B) : mk();
      if (f.img[k]) return;
      if (OB) { flat = VR.gfx.down(mk(), SR, SR); yield; }
      const ol = outline ? VR.gfx.softOutline(big, 'rgba(18,16,20,.92)', ss * 0.8) : big;
      if (OB) yield;
      c = VR.gfx.crisp(VR.gfx.down(ol, SR, SR));
      if (OB) yield;
      if (f.img[k]) return;
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
    sx.drawImage(flat || c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(0,0,0,.32)'; sx.fillRect(0, 0, SR, SR);
    if (flat) { const d = sx.getImageData(0, 0, SR, SR), p = d.data; for (let i = 3; i < p.length; i += 4) p[i] = p[i] > 40 ? 82 : 0; sx.putImageData(d, 0, 0); }
    f.img[k] = c; f.shadow[k] = sh; f.n++;
  };
  const make = (k) => { const it = makeGen(k); while (!it.next().done); };
  // ángulo listo para mostrar: el pedido si ya está; si no (vista oblicua), se encarga a la cola y mientras tanto va el
  // más parecido de los que ya están (el primero de todos se hace en el momento)
  // Un modelo o color que aparece por primera vez tarda unos cuadros en verse (va primero en la cola), en vez de trabar.
  f.pend = new Uint8Array(N); f.n = 0;
  const ready = (k) => {
    if (f.img[k]) return k;
    if (!OB || !OB.async) { make(k); return k; }
    OB.enqueue(f, k, makeGen, true);
    if (!f.n) return -1;
    for (const d of [1, -1, 2, -2]) { const j = (k + d + N) % N; if (!f.img[j]) OB.enqueue(f, j, makeGen, false); } // los de al lado, por si sigue girando
    for (let d = 1; d <= N / 2; d++) { const a = (k + d) % N, b = (k - d + N) % N; if (f.img[a]) return a; if (f.img[b]) return b; }
    return k;
  };
  f.has = (k) => !!f.img[k];
  f.get = (k) => f.img[ready(k)] || VR.rotBlank();
  f.getShadow = (k) => f.shadow[ready(k)] || VR.rotBlank();
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
  cub: { len: 21, wid: 7, S: 26, rider: { gy: -3.5, gx: 4.2, hip: 3.4, zoff: 2.3 }, name: 'Mbojoaju 125', desc: 'La moto de todos los días: liviana, económica y con lugar para dos.', side: 'cub' },
  mini: { rider: { gy: -4.1, gx: 3.8, hip: 2.4 }, len: 17, wid: 7, S: 22, base: VR.drawMotoMini, acc: 205, turn: 4.1, max: { road: 200, stone: 175, dirt: 170, side: 150, grass: 125 },
    name: 'Tatu 110', desc: 'Mini moto de ruedas gordas: chiquita, divertida y dobla en un pañuelo.', side: 'mini' },
  calle: { rider: { gy: -5.6, gx: 4.6, hip: 2.6 }, len: 21, wid: 7, S: 26, base: VR.drawMotoCalle, acc: 265, turn: 3.2, max: { road: 290, stone: 240, dirt: 215, side: 160, grass: 140 },
    name: 'Yvytu GT 150', desc: 'Moto de calle con tanque grande y escape cromado: la más rápida.', side: 'calle' },
  carga: { rider: { gy: -3.7, gx: 5.2, hip: 2.2, zoff: 0.7 }, len: 33, wid: 12, S: 40, base: VR.drawMotoCarga, acc: 135, rev: 40, turn: 2.3, brake: 380, mass: 0.8,
    max: { road: 185, stone: 165, dirt: 160, side: 120, grass: 105 },
    name: 'Kárga Guasu 200', desc: 'Motocarga de tres ruedas: lenta, pesada y aguanta de todo atrás.', side: 'carga', riderOff: 8 },
  bici: { rider: { gy: -4.4, gx: 1.9, hip: 1.9, kx: 1.0, zoff: 2.0 }, len: 14, wid: 5, S: 20, base: VR.drawBici, colors: VR.BICI_COLORS, acc: 95, rev: 8, turn: 4.6, brake: 300, mass: 0.12,
    max: { road: 72, stone: 52, dirt: 54, side: 66, grass: 40 },
    name: 'Bici Karumbé', desc: 'Bicicleta de paseo: sin nafta, pero se te acaba el aliento. Ideal para la costanera.', side: 'bici' },
  pati: { rider: { gy: -4.6, gx: 2.6, stand: true }, len: 12, wid: 6, S: 16, base: VR.drawPati, colors: VR.PATI_COLORS, acc: 150, rev: 15, turn: 4.4, brake: 420, mass: 0.15,
    max: { road: 115, stone: 85, dirt: 70, side: 110, grass: 60 },
    name: 'Pati-e', desc: 'Patineta eléctrica: silenciosa y ágil, pero no le pidas mucho en el empedrado.', side: 'pati' },
};
// sorteo de modelo: en el tránsito hay motocargas; estacionadas en batería, no (no entran)
VR.pickMoto = (rnd, parked) => {
  const r = rnd();
  if (parked) return r < 0.5 ? 'cub' : r < 0.72 ? 'calle' : r < 0.86 ? 'mini' : r < 0.94 ? 'bici' : 'pati';
  return r < 0.43 ? 'cub' : r < 0.62 ? 'calle' : r < 0.73 ? 'mini' : r < 0.82 ? 'bici' : r < 0.95 ? 'carga' : 'pati';
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
  return (shirt, head, o) => {
    const key = shirt.join() + head + (o ? JSON.stringify(o) : '');
    let f = cache.get(key);
    if (!f) { f = VR.rotFrames(VR.drawRiderBase(shirt, head, o), Math.round(24 * VR.VK) + 2); cache.set(key, f); }
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
    if (t === T.DIRTROAD || t === T.DIRT || t === T.PLAZADIRT) return [m.dirt, 0.85];
    if (t === T.SIDEWALK || t === T.PAVING || t === T.CHECKER) return [m.side, 0.9];
    return [m.grass, 0.7];
  }
  // Teclado y cruceta: arriba acelera, abajo frena/reversa, costados giran.
  // Joystick táctil: el vehículo va hacia donde apuntás, más rápido cuanto más lo empujás.
  update(dt, input) {
    let throttle = 0, steer = 0;
    const brake = input.down('run');
    // modos (05/11/2026): 'facil' = apuntás hacia dónde ir (como el táctil); 'clasico' = costados giran;
    // 'manual' = como el clásico pero con cambios (E/RB sube, Q/LB baja; R = reversa)
    const mode = VR.drive || 'facil';
    if (mode === 'manual') {
      this.gear = this.gear ?? 1;
      if (VR.gearReq) { const up = VR.gearReq > 0; VR.gearReq = 0; if (up) this.gear = this.gear < 0 ? 1 : Math.min(5, this.gear + 1); else this.gear = this.gear <= 1 ? (Math.abs(this.v) < 15 ? -1 : 1) : this.gear - 1; } // botones táctiles ▲ ▼
      if (input.pressed('fire')) { this.gear = this.gear < 0 ? 1 : Math.min(5, this.gear + 1); VR.audio.gear && VR.audio.gear(); }
      if (input.pressed('weapon')) this.gear = this.gear <= 1 ? (Math.abs(this.v) < 15 ? -1 : 1) : this.gear - 1;
    } else this.gear = null;
    if (mode === 'facil' || (input.source === 'touch' && mode !== 'manual')) { // en manual, el joystick es volante y pedal
      const m = Math.min(1, Math.hypot(input.ax, input.ay));
      if (m > 0.1) {
        const want = Math.atan2(input.ax, -input.ay);
        let d = want - this.a; d = Math.atan2(Math.sin(d), Math.cos(d));
        const ad = Math.abs(d);
        if (ad > 2.2 && this.v < 40) { throttle = -m; steer = VR.clamp(-d * 2, -1, 1); }
        else {
          // curvas más fáciles (12/11/2026): si hay que doblar mucho y vas rápido, el auto levanta el pie y frena solo
          // hasta una velocidad con la que la curva sale; el volante responde más fuerte cuanto más cerrada es.
          const safe = 250 * (1.1 - Math.min(1, ad) * 0.75);            // velocidad "segura" según el ángulo que falta
          throttle = m * (ad > 1.6 ? 0.35 : ad > 0.5 ? 0.7 : 1);
          if (ad > 0.45 && this.v > safe) throttle = -Math.min(0.5, (this.v - safe) / 160) * m - 0.05;
          steer = VR.clamp(d * 3, -1, 1);
        }
      }
    } else { throttle = -input.ay; steer = input.ax; }
    if (mode === 'manual' && VR.td && VR.td.on) { throttle = VR.td.gas - VR.td.brake; steer = VR.td.steer; } // volante y pedales táctiles
    if (this.gear != null) { // cuentavueltas y caja automática
      const sp = this.spec, mx = (sp.max.road || 240) * (this.gear > 0 ? [0, 0.3, 0.5, 0.68, 0.85, 1][this.gear] : 0.3);
      this.rpm = VR.clamp(900 + Math.abs(this.v) / mx * 6100 + (throttle > 0 && Math.abs(this.v) < 5 ? 1500 : 0), 800, 7200);
      if (VR.autoBox) {
        if (this.gear > 0 && this.gear < 5 && this.rpm > 6200) this.gear++;
        else if (this.gear > 1 && this.rpm < 2600) this.gear--;
        if (throttle < 0 && this.v < 3 && this.gear > 0) this.gear = -1; else if (throttle > 0 && this.gear < 0 && this.v > -3) this.gear = 1;
      }
    }
    if (this.gear < 0) throttle = throttle > 0 ? -throttle : throttle < 0 && this.v <= 0 ? 0 : throttle; // reversa: arriba va para atrás
    else if (this.gear > 0 && throttle < 0 && this.v <= 2) throttle = 0;                          // en marcha, abajo solo frena
    // volante suave: el giro llega de a poco y a alta velocidad gira menos
    this.st = (this.st || 0) + (steer - (this.st || 0)) * Math.min(1, dt * 11);
    this.physics(dt, throttle, this.st * (1 - Math.min(0.2, Math.abs(this.v) / 1000)), brake);
  }
  get mass() { return this.spec.mass; }
  // Física: velocidad como vector (vx, vy) además del rumbo, así el vehículo puede derrapar;
  // giro con velocidad angular (w) que también cambian los choques.
  physics(dt, throttle, steer, brake, parked = false) {
    this.px = this.x; this.py = this.y; this.pa = this.a;
    if (this.bounceT > 0) { this.bounceT -= dt; throttle = 0; }
    if (this.vx === undefined) { this.vx = Math.sin(this.a) * this.v; this.vy = -Math.cos(this.a) * this.v; this.w = 0; }
    const sp = this.spec, [max, gripF] = this.topSpeed();
    let fx = Math.sin(this.a), fy = -Math.cos(this.a), rx = Math.cos(this.a), ry = Math.sin(this.a);
    let vf = this.vx * fx + this.vy * fy, vr = this.vx * rx + this.vy * ry;
    // motor y frenos (sobre la velocidad hacia adelante)
    if (parked) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 260 * dt);
    else {
      if (brake) vf -= Math.sign(vf) * Math.min(Math.abs(vf), sp.brake * dt);
      const G = this.gear > 0 ? [0, 0.3, 0.5, 0.68, 0.85, 1][this.gear] : 1, GA = this.gear > 0 ? [0, 1.35, 1.15, 0.95, 0.78, 0.62][this.gear] : 1;
      if (this.gear > 0 && vf > max * G) vf = Math.max(max * G, vf - 160 * dt);                  // freno motor del cambio
      if (throttle > 0) vf += (vf < 0 ? 380 : sp.acc * gripF * GA) * throttle * (this.gear > 0 && vf > max * G ? 0 : 1) * dt;
      else if (throttle < 0) vf += (vf > 0 ? 380 : 120) * throttle * dt;
      else vf -= Math.sign(vf) * Math.min(Math.abs(vf), 70 * dt);
      if (vf > max) vf = Math.max(max, vf - 260 * dt);
      if (vf < -sp.rev) vf = Math.max(-sp.rev, vf + 300 * dt);
    }
    // agarre lateral: menos en tierra y pasto, y casi nada si frenás fuerte doblando (derrape)
    const t = this.world.get(Math.floor(this.x / VR.TILE), Math.floor(this.y / VR.TILE)), T = VR.T;
    let grip = t === T.ROAD ? 11.5 : t === T.STONE ? 8.5 : t === T.DIRTROAD || t === T.DIRT || t === T.PLAZADIRT ? 4.5 : t === T.SIDEWALK || t === T.PAVING || t === T.CHECKER ? 7.5 : 3.5;
    if (this.type === 'moto') grip *= 1.4;
    if (brake && Math.abs(vf) > 70 && Math.abs(steer) > 0.2) grip *= 0.22;
    if (parked) grip = 6;
    vr *= Math.exp(-grip * dt);
    // giro: la velocidad angular busca la del volante (y se recupera de los golpes)
    const s = Math.abs(vf), wt = parked ? 0 : steer * sp.turn * 1.25 * Math.min(1, (s + 14) / 50) * (1 - Math.min(0.3, s / 900)) * (vf < -2 ? -1 : 1);   // más giro (12/11/2026): ahora también a poca velocidad
    this.w += (wt - this.w) * Math.min(1, (parked ? 2.5 : 7) * dt);
    this.vx = fx * vf + rx * vr; this.vy = fy * vf + ry * vr;
    // marcas de frenada / derrape
    if (Math.abs(vr) > 25 || (brake && s > 90)) this.skid(t === T.DIRTROAD || t === T.DIRT || t === T.PLAZADIRT || t === T.GRASS);
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
    let nx = 0, ny = 0, gx = 0, gy = 0, gl = 0;      // normal del choque (suma ponderada; apunta del obstáculo hacia el vehículo); g*: roce de esquina con otro vehículo (ver move)
    // paredes: puntos del contorno dentro de una baldosa sólida; la normal sale de la cara libre más cercana de esa baldosa
    for (const [px, py] of this.points(x, y, a)) {
      const tx = Math.floor(px / S), ty = Math.floor(py / S);
      if (!W.solid(tx, ty)) continue;
      pts.push(px, py);
      const fx = px - tx * S, fy = py - ty * S;
      let bd = 1e9, bx = 0, by = 0;
      if (fx < bd && !W.solid(tx - 1, ty)) { bd = fx; bx = -1; by = 0; }
      if (S - fx < bd && !W.solid(tx + 1, ty)) { bd = S - fx; bx = 1; by = 0; }
      if (fy < bd && !W.solid(tx, ty - 1)) { bd = fy; bx = 0; by = -1; }
      if (S - fy < bd && !W.solid(tx, ty + 1)) { bd = S - fy; bx = 0; by = 1; }
      if (bd < 1e8) { const w = 1 / (1 + bd); nx += bx * w; ny += by * w; }
    }
    let other = null;
    const A = VR.obb(x, y, a, this.spec.len / 2, this.spec.wid / 2), r = A.ex + 2;
    // postes y bancos (círculos chicos): el punto del rectángulo más cercano al círculo
    if (W.propsNear) {
      const pr = VR._pr || (VR._pr = []); pr.length = 0;
      for (const c of W.propsNear(x - r - 4, y - r - 4, x + r + 4, y + r + 4, pr)) {
        const dx = c.x - x, dy = c.y - y, u = VR.clamp(dx * A.fx + dy * A.fy, -A.hl, A.hl), v = VR.clamp(dx * A.rx + dy * A.ry, -A.hw, A.hw);
        const qx = x + A.fx * u + A.rx * v, qy = y + A.fy * u + A.ry * v, ex = qx - c.x, ey = qy - c.y, d = Math.hypot(ex, ey);
        if (d >= c.r) continue;
        pts.push(qx, qy);
        if (d > 0.01) { nx += ex / d * 1.5; ny += ey / d * 1.5; } else { nx += x - c.x; ny += y - c.y; }
      }
      pr.length = 0;
    }
    if (this.ghost > 0) return pts.length ? { pts, other, nx, ny } : null; // Mbohasa adelantando: pasa por encima de otros vehículos un ratito
    for (const o of W.carsIn(x - r - 30, y - r - 30, x + r + 30, y + r + 30, VR._near || (VR._near = []))) {
      if (o === this || o.ghost > 0) continue;
      const B = VR.obb(o.x, o.y, o.a, o.spec.len / 2, o.spec.wid / 2);
      if (!VR.obbHit(A, B)) continue;
      other = other || o;
      let n = 0;
      for (const [px, py] of VR.obbCorners(A)) if (VR.obbIn(B, px, py)) { pts.push(px, py); n++; }
      for (const [px, py] of VR.obbCorners(B)) if (VR.obbIn(A, px, py)) { pts.push(px, py); n++; }
      if (!n) pts.push((x + o.x) / 2, (y + o.y) / 2);
      // normal: el eje de menor solapamiento (el de la cara que se golpea), orientado de B hacia A
      const dx = x - o.x, dy = y - o.y; let bo = 1e9, bax = 0, bay = 0; const ovs = [];
      for (const [ax, ay] of [[A.fx, A.fy], [A.rx, A.ry], [B.fx, B.fy], [B.rx, B.ry]]) {
        const ra = A.hl * Math.abs(A.fx * ax + A.fy * ay) + A.hw * Math.abs(A.rx * ax + A.ry * ay), rb = B.hl * Math.abs(B.fx * ax + B.fy * ay) + B.hw * Math.abs(B.rx * ax + B.ry * ay);
        const dd = dx * ax + dy * ay, ov = ra + rb - Math.abs(dd), sg = dd >= 0 ? 1 : -1;
        ovs.push([ov, ax * sg, ay * sg]);
        if (ov < bo) { bo = ov; bax = ax * sg; bay = ay * sg; }
      }
      nx += bax * 2; ny += bay * 2;
      // roce de esquina: entre los ejes que no son el del choque, el de menor solapamiento; si es chico (< 8 px) el vehículo puede salirse de costado
      let lo = 1e9, lx = 0, ly = 0;
      for (const [ov, ax, ay] of ovs) if (Math.abs(ax * bax + ay * bay) < 0.7 && ov < lo) { lo = ov; lx = ax; ly = ay; }
      if (lo < 8 && lo > 0 && lo < 1e8) { gx += lx * lo; gy += ly * lo; gl = Math.max(gl, lo); }
    }
    VR._near.length = 0;
    return pts.length ? { pts, other, nx, ny, gx, gy, gl } : null;
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
      let nnx = c.nx, nny = c.ny, nl = Math.hypot(nnx, nny);
      if (nl < 0.05) { nnx = nx - mx; nny = ny - my; nl = Math.hypot(nnx, nny); }   // sin normal clara: desde los puntos tocados hacia el centro
      if (nl < 0.01) { nnx = -this.vx; nny = -this.vy; nl = Math.hypot(nnx, nny) || 1; }
      nnx /= nl; nny /= nl;
      const o = c.other;
      let impact = 0;
      if (o) {
        if (o.vx === undefined) { o.vx = Math.sin(o.a) * o.v; o.vy = -Math.cos(o.a) * o.v; o.w = 0; }
        const rvn = (this.vx - o.vx) * nnx + (this.vy - o.vy) * nny;
        if (rvn < 0) {
          const e = 0.4, J = -(1 + e) * rvn / (1 / this.mass + 1 / o.mass);
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
          const e = 0.35;   // rebote (13/11/2026): antes 0,3 y con la normal torcida: el auto se quedaba pegado a la pared
          this.vx -= (1 + e) * vn * nnx; this.vy -= (1 + e) * vn * nny;
          // roce: pierde algo de la velocidad que va a lo largo de la pared
          const tx = this.vx - (this.vx * nnx + this.vy * nny) * nnx, ty = this.vy - (this.vx * nnx + this.vy * nny) * nny;
          this.vx -= tx * 0.025; this.vy -= ty * 0.025; // resbala a lo largo de la pared (antes frenaba más)
          const cx = mx - nx, cy = my - ny;
          this.w += (cx * nny - cy * nnx) * (-vn) * 0.0022;
          impact = -vn;
        }
      }
      this.w = VR.clamp(this.w, -6, 6);
      // roce de esquina contra otro vehículo (13/11/2026): con poco solapamiento de costado el vehículo se desliza hacia afuera
      // en vez de quedarse pegado (antes la normal de frente lo frenaba y, con el acelerador apretado, no salía más)
      if (o && c.gl > 0) {
        const gl = Math.hypot(c.gx, c.gy) || 1, tx = c.gx / gl, ty = c.gy / gl, st = Math.min(c.gl + 0.8, 6), ox0 = this.x, oy0 = this.y;
        this.x += tx * st; this.y += ty * st;
        const c2 = this.contacts(this.x, this.y, this.a);
        if (c2 && !c2.other) { this.x = ox0; this.y = oy0; }                    // ahí hay una pared: no se corre
        else { const vt = this.vx * tx + this.vy * ty; if (vt < 40) { this.vx += tx * (40 - vt); this.vy += ty * (40 - vt); } }   // y sigue deslizándose hacia afuera
      }
      // en el substep del choque ya no se pierde todo el avance: prueba seguir con la velocidad de después del rebote,
      // y si igual choca, solo con la parte que va a lo largo de lo que tocó (resbala en vez de pegarse)
      { const a0 = this.a, vn2 = this.vx * nnx + this.vy * nny, tvx = this.vx - vn2 * nnx, tvy = this.vy - vn2 * nny;
        const tries = [[this.vx, this.vy, na], [this.vx, this.vy, a0], [tvx, tvy, na], [tvx, tvy, a0]];
        for (const [sx, sy, sa] of tries) { const qx = this.x + sx * h, qy = this.y + sy * h; if (!this.contacts(qx, qy, sa)) { this.x = qx; this.y = qy; this.a = sa; break; } } }
      if (this.driven && impact > 45) this.bounceT = Math.min(0.4, 0.1 + impact / 600);   // tras un golpe fuerte el motor «suelta» un instante: el auto rebota en vez de empujarse contra lo que chocó
      if (impact > 50) { this.hit = Math.min(0.35, impact / 300); if (this.driven && VR.input.buzz) VR.input.buzz(Math.min(60, impact / 4)); if (this.onImpact) this.onImpact(impact, o); if (VR.onCarHit) VR.onCarHit(this, impact, o); if (this.driven && this.type === 'moto' && impact > 140 && VR.onEject) VR.onEject(this, impact); else if (this.ai && this.type === 'moto' && impact > 110 && VR.caidas) VR.caidas.motoDown(this, impact); if (impact > 55 && VR.addDent) { VR.addDent(this, mx, my, impact); if (o) VR.addDent(o, mx, my, impact * 0.8); } }
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
    const ak = this.fallen ? a + this.fallen.side * 1.15 : a;   // moto caída: se ve tirada de costado
    const k = this.frame(ak), F = this.frames, h = F.S >> 1, lift = Math.round(F.lift || 0);
    const shake = this.hit > 0 ? ((this.hit * 60) | 0) % 2 : 0;
    if (this.tune && this.tune.neon !== 'no' && (this.driven || this.ai)) VR.drawNeon(ctx, x, y, a, this.LEN, this.WID, VR.NEON[this.tune.neon], VR.night ? 0.35 + VR.night.level * 0.65 : 0.4);
    { const sn = VR.sun;   // sombra según el sol: se corre hacia donde cae y se alarga con el sol bajo
      if (!sn || !sn.on) ctx.drawImage(F.getShadow(k), x - h + 3, y - h + 3, F.S, F.S);
      else if (sn.str > 0.03) {
        const [ox, oy] = sn.off(7, 22), SH = F.getShadow(k); ctx.globalAlpha = sn.str;
        if (Math.abs(ox) + Math.abs(oy) > 5) ctx.drawImage(SH, Math.round(x - h + ox * 0.5), Math.round(y - h + oy * 0.5), F.S, F.S);
        ctx.drawImage(SH, Math.round(x - h + ox), Math.round(y - h + oy), F.S, F.S); ctx.globalAlpha = 1;
      } }
    ctx.drawImage(F.get(k), x - h + shake, y - h, F.S, F.S);
    if (this.dents && this.dents.length && !this.wreck) VR.drawDents(ctx, this, x + shake, y - Math.round(lift * 0.55), ak);
    if (this.pasajero && this.pasajero.L) { // pasajero atrás del conductor (Mbohasa en moto): se dibuja primero, así el conductor le tapa las manos en su cintura
      const R = VR.riderTopFrames(this.pasajero.L, VR.pasGeo(this.spec.rider)), rh = R.S >> 1, ro = (this.spec.riderOff || 0) - 6;
      ctx.drawImage(R.get(k), x - rh + shake + Math.round(Math.sin(a) * ro), y - rh - Math.round(Math.cos(a) * ro), R.S, R.S);
    }
    if (this.rider && this.rider.L) { // el personaje de verdad (avatar 2) visto desde arriba, girando con la moto
      const R = VR.riderTopFrames(this.rider.L, this.spec.rider), rh = R.S >> 1, ro = (this.spec.riderOff || 0) + (this.pasajero ? 2.5 : 0);
      ctx.drawImage(R.get(k), x - rh + shake + Math.round(Math.sin(a) * ro), y - rh - Math.round(Math.cos(a) * ro), R.S, R.S);
    } else if (this.rider) {
      const R = VR.riderFrames(this.rider.shirt, this.rider.head, this.rider.o), rh = R.S >> 1;
      const ro = this.spec.riderOff || 0;
      ctx.drawImage(R.get(k), x - rh + shake + Math.round(Math.sin(a) * ro), y - rh - 1 - Math.round(Math.cos(a) * ro), R.S, R.S);
    }
    if (this.taxi) { ctx.save(); ctx.translate(x + shake, y - lift); ctx.rotate(a); ctx.fillStyle = '#1a1a1e'; ctx.fillRect(-4, -2.5, 8, 5); ctx.fillStyle = '#ffd23a'; ctx.fillRect(-3.5, -2, 7, 4); ctx.fillStyle = '#1a1a1e'; for (let i = -3; i < 3; i += 2) ctx.fillRect(i, -0.5, 1, 1); ctx.restore(); }
    if (this.siren && this.spec.lights) { // barra de luces titilando
      const on = ((performance.now() / 130) | 0) % 2, L = this.spec.lights, f = this.model === 'bomba' ? this.LEN * 0.33 : this.model === 'ambulancia' ? this.LEN * 0.22 : this.LEN * 0.1;
      const bx = x + Math.sin(a) * f, by = y - Math.cos(a) * f - lift, rx = Math.cos(a) * 3.5, ry = Math.sin(a) * 3.5;
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
  const curb = (x, y) => { const t = world.get(x, y); return t === T.SIDEWALK || t === T.CHECKER || t === T.PAVING; };
  const add = (x, y, a, color, type = 'car', model) => { const m = model || (type === 'moto' ? VR.pickMoto(rnd, true, world.nivelAt(x, y)) : VR.pickCar(rnd, true, 0, world.nivelAt(x, y))); const c = new VR.Car(world, x, y, a, m === 'pati' ? color % VR.PATI_COLORS.length : color, type, m); world.addBox(c); cars.push(c); return c; };
  let first = null;
  // cajones de auto de las cuadras de la plaza (los autos van puestos a mano): marca la fila pegada al cordón y la de al lado
  const CP0 = VR.BAY.carPitch;
  const markCar = (x, y, side) => {
    const dy = side === 0 ? 1 : side === 1 ? -1 : 0, dx = side === 2 ? 1 : side === 3 ? -1 : 0, W = world.w;
    if (!world.line[y * W + x]) world.line[y * W + x] = 9 + side;
    if (!world.line[(y - dy) * W + x - dx]) world.line[(y - dy) * W + x - dx] = 13 + side;
  };
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
      for (let px = Math.ceil((x0 * S + 20) / CP0) * CP0 + CP0 / 2; px <= x1 * S - 20; px += CP0) slots.push(px);
      for (let x = x0; x <= x1; x++) { markCar(x, ty, 1); }                       // esquinas de los cajones (cordón de la plaza, al norte)
      slots.sort((a, b) => Math.abs(a - near.x) - Math.abs(b - near.x));
      first = add(slots[0], yl, Math.PI / 2, 0, 'car', 'mita');
      for (let i = 1; i < slots.length; i++) if (rnd() < 0.6) add(slots[i], yl, Math.PI / 2, 1 + ((rnd() * (VR.CAR_COLORS.length - 1)) | 0));
      // motos en batería, la rueda trasera contra el cordón sur (miran hacia la calle), cada 11 px
      if (battery(yb - ty + 1)) {
        const P0 = VR.BAY.pitch;
        for (let px = Math.ceil(fx / P0) * P0 + P0 / 2; px <= x1 * S - 10; px += P0) if (rnd() < 0.5)
          add(px + ((rnd() * 2) | 0) - 1, (yb + 1) * S - 13, (rnd() < 0.5 ? 0 : 0.1) - 0.05 + (rnd() < 0.15 ? 0.22 : 0), (rnd() * VR.MOTO_COLORS.length) | 0, 'moto');
        for (let x = Math.floor(fx / S); x <= x1; x++) if (!world.line[yb * world.w + x]) world.line[yb * world.w + x] = 5;   // rayitas contra el cordón sur
      }
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
          const ya = by0 + 3, yz = by1 - 3, xl = xa * S + 11;
          for (let py = Math.ceil((ya * S + 20) / CP0) * CP0 + CP0 / 2; py <= yz * S - 20; py += CP0) if (rnd() < 0.6) add(xl, py, 0, 1 + ((rnd() * (VR.CAR_COLORS.length - 1)) | 0));
          for (let y = ya; y <= yz; y++) markCar(xa, y, 3);   // cordón de la plaza, al oeste
          // del lado de la Municipalidad el cordón es amarillo: no se estaciona (Street View, enero 2025)
          (world.parkingDemo = world.parkingDemo || []).push({ x0: xa * S, x1: (xb + 1) * S, y0: ya * S, y1: yz * S });
        }
        // Coronel Bogado, del lado oeste de la plaza (mano única hacia el sur): autos a la izquierda (este,
        // el lado de la plaza) y motos a la derecha (oeste, frente a los negocios), como en el video de Leandro
        let wb = bx0 - 1, lim3 = 10; while (lim3-- > 0 && !road(wb, my)) wb--;
        let wa = wb; while (road(wa - 1, my)) wa--;
        if (wb - wa >= 3) {
          const ya = by0 + 3, yz = by1 - 3, xl = (wb + 1) * S - 11, xr = wa * S + 6;
          for (let py = Math.ceil((ya * S + 20) / CP0) * CP0 + CP0 / 2; py <= yz * S - 20; py += CP0) if (rnd() < 0.6) add(xl, py, Math.PI, 1 + ((rnd() * (VR.CAR_COLORS.length - 1)) | 0));
          for (let y = ya; y <= yz; y++) markCar(wb, y, 2);   // cordón de la plaza, al este
          if (battery(wb - wa + 1)) {
            const P0 = VR.BAY.pitch;
            for (let py = Math.ceil((ya + 1) * S / P0) * P0 + P0 / 2; py <= yz * S - 10; py += P0) if (rnd() < 0.5)
              add(wa * S + 13, py + ((rnd() * 2) | 0) - 1, Math.PI / 2 - 0.05 + (rnd() < 0.5 ? 0 : 0.1) + (rnd() < 0.15 ? -0.22 : 0), (rnd() * VR.MOTO_COLORS.length) | 0, 'moto');
            for (let y = ya + 1; y <= Math.floor(yz); y++) if (!world.line[y * world.w + wa]) world.line[y * world.w + wa] = 8;   // rayitas contra el cordón oeste
          }
          else for (let py = (ya + 1) * S + 14; py <= yz * S - 16; py += 32) if (rnd() < 0.55) add(wa * S + 7, py, Math.PI, (rnd() * VR.MOTO_COLORS.length) | 0, 'moto');
          world.parkingDemo.push({ x0: wa * S, x1: (wb + 1) * S, y0: ya * S, y1: yz * S });
        }
      }
    }
  }

  // camiones en el cuartel de bomberos de la Plaza Pettirossi, mirando a San Roque González
  for (const d of world.decals || []) {
    if (d.kind !== 'cuartel') continue;
    const X = (d.x + 3) * S, Y = d.y * S;
    for (const ox of [26, 70]) { const c = add(X + ox, Y + d.h * S - 34, Math.PI, 0, 'car', 'bomba'); c.firehouse = true; }
    (world.parkingDemo = world.parkingDemo || []).push({ x0: X - 20, x1: (d.x + d.w) * S + 20, y0: Y - 20, y1: (d.ry + 4) * S });
  }

  // Terminal, hospital y comisarías (11/11/2026): micros estacionados en la terminal, ambulancias en el Hospital Regional
  // y una patrullera frente a cada comisaría. También deja en `world.hospital` / `world.comisarias` un punto a pie para reaparecer.
  {
    const P = world.pois || {}, PIE = [0, 2, 4, 7, 11, 12], tl = (world.labels || []).find((l) => /Terminal/.test(l.text));
    const foot = (x, y) => { const ok = (px, py) => !world.hits(px - 16, py - 8, px + 16, py + 4) && PIE.includes(world.get(Math.floor(px / S), Math.floor(py / S))); if (ok(x, y)) return { x, y };
      for (let r = 4; r < 400; r += 4) for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, px = Math.round(x + Math.cos(a) * r), py = Math.round(y + Math.sin(a) * r); if (ok(px, py)) return { x: px, y: py }; } return { x, y }; };
    const spots = (cx, cy, R) => { // lugares contra el cordón, mirando en el sentido de la mano (derecha), de más cerca a más lejos
      const out = [], tx = Math.floor(cx / S), ty = Math.floor(cy / S);
      for (let y = ty - R; y <= ty + R; y++) for (let x = tx - R; x <= tx + R; x++) {
        if (!road(x, y)) continue;
        const hz = road(x - 2, y) && road(x + 2, y), vt = road(x, y - 2) && road(x, y + 2);
        let q = null;
        if (hz && curb(x, y - 1) && !road(x, y - 2) && !road(x, y - 3) && road(x, y + 1) && road(x, y + 2)) q = { x: (x + 0.5) * S, y: y * S + 14, a: -Math.PI / 2 };
        else if (hz && curb(x, y + 1) && !road(x, y + 2) && !road(x, y + 3) && road(x, y - 1) && road(x, y - 2)) q = { x: (x + 0.5) * S, y: (y + 1) * S - 14, a: Math.PI / 2 };
        else if (vt && curb(x + 1, y) && !road(x + 2, y) && !road(x + 3, y) && road(x - 1, y) && road(x - 2, y)) q = { x: (x + 1) * S - 14, y: (y + 0.5) * S, a: 0 };
        else if (vt && curb(x - 1, y) && !road(x - 2, y) && !road(x - 3, y) && road(x + 1, y) && road(x + 2, y)) q = { x: x * S + 14, y: (y + 0.5) * S, a: Math.PI };
        if (q) { q.d = Math.hypot(q.x - cx, q.y - cy); out.push(q); }
      }
      return out.sort((a, b) => a.d - b.d);
    };
    const fill = (cx, cy, R, models, gap) => { const put = []; for (const q of spots(cx, cy, R)) { if (put.length >= models.length) break; if (put.some((o) => Math.hypot(o.x - q.x, o.y - q.y) < gap) || world.boxOverlap(q.x - 40, q.y - 40, q.x + 40, q.y + 40)) continue; put.push(q); add(q.x, q.y, q.a, (rnd() * 4) | 0, 'car', models[put.length - 1]); } return put; };
    if (tl) fill(tl.x, tl.y + 40, 18, ['guairena', 'indep', 'guairena', 'indep', 'guairena'], 88);
    const hs = P['Hospital Regional'];
    if (hs) { const cx = (hs[0] + 0.5) * S, cy = (hs[1] + 0.5) * S, f = foot(cx, cy + 60); world.hospital = { x: f.x, y: f.y, cx, cy }; fill(cx, cy, 40, ['ambulancia', 'ambulancia'], 60); }
    world.comisarias = [];
    for (const k in P) if (/^Comisar|^Jefatura/.test(k)) { const cx = (P[k][0] + 0.5) * S, cy = (P[k][1] + 0.5) * S, f = foot(cx, cy + 40); world.comisarias.push({ name: k, x: f.x, y: f.y, cx, cy }); fill(cx, cy, 14, ['patrulla'], 60); }
  }

  // Filas pedidas por el mapa (05/11/2026): Mcal. López al oeste de Coronel Bogado, autos en fila contra el
  // cordón sur mirando al oeste, como en el video de Leandro
  for (const d of world.decals || []) {
    if (d.kind !== 'fila') continue;
    const y = (d.y + 1) * S - 8, x0 = d.x * S + 30, x1 = (d.x + d.w) * S - 30;
    for (let px = x1; px >= x0; px -= 52) if (rnd() < 0.85) add(px, y, d.dir === 'o' ? -Math.PI / 2 : Math.PI / 2, 1 + ((rnd() * (VR.CAR_COLORS.length - 1)) | 0));
    (world.parkingDemo = world.parkingDemo || []).push({ x0: d.x * S, x1: (d.x + d.w) * S, y0: d.y * S - 40, y1: (d.y + 1) * S });
  }

  // Motos del parque Ortiz Guerrero (10/11/2026): 3 en batería contra la fachada este del estadio, junto a la capillita
  for (const d of world.decals || []) {
    if (d.kind !== 'motosparque') continue;
    for (const [x, y, a] of d.pts) add(x, y, a, (rnd() * VR.MOTO_COLORS.length) | 0, 'moto');
    (world.parkingDemo = world.parkingDemo || []).push({ x0: d.x * S, x1: (d.x + d.w) * S, y0: d.y * S, y1: (d.y + d.h) * S });
  }

  // Lugar para estacionar (04/11/2026, menos y mejor repartidos): solo en calles de 5 baldosas (10 m) o más,
  // con cordón a lo largo de ~8 baldosas (lejos de las esquinas) y sin otro vehículo enfrente, así siempre
  // queda lugar para que pasen dos autos.
  const across = (x, y, dx, dy) => { let n = 0; while (n < 14 && road(x + dx * n, y + dy * n)) n++; return n; };
  // Pintura de estacionamiento del Centro (11/11/2026, ver osm_to_map.py y VR.drawBay): `line` 5-8 rayitas de moto,
  // 9-12 cajón de auto (fila pegada al cordón); en cada grupo 0 cordón al sur, 1 norte, 2 este, 3 oeste. Donde hay
  // rayitas se estacionan motos en batería, entre rayita y rayita; en un cajón de auto, un auto en el centro. Las
  // rayas viales de verdad (amarilla, cebra, pare) son `line` 1-4 y 17-20 y bloquean el lugar.
  const P = VR.BAY.pitch, CP = VR.BAY.carPitch;
  const bayOf = (x, y, side) => { const v = world.line[y * world.w + x]; return v === 5 + side ? 'moto' : v === 9 + side ? 'auto' : null; };
  const lineBlock = (x, y) => { const v = world.line[y * world.w + x]; return v && (v < 5 || v > 16); };
  const snap = (u, pp = P) => Math.round((u - pp / 2) / pp) * pp + pp / 2;   // centro del hueco entre rayas más cercano
  const spot = (x, y) => {
    if (!road(x, y)) return null;
    for (const dy of [-1, 1]) {
      const bay = bayOf(x, y, dy > 0 ? 0 : 1);
      if (!curb(x, y + dy) || across(x, y, 0, -dy) < (bay ? 4 : 5)) continue;
      let ok = true;
      for (let i = -3; i <= 4 && ok; i++) ok = road(x + i, y) && road(x + i, y - dy) && curb(x + i, y + dy) && !lineBlock(x + i, y);
      if (ok) { const w = across(x, y, 0, -dy); const cx = bay ? snap(x * S + 8, bay === 'auto' ? CP : P) : x * S + 16; return [cx, y * S + 8 - dy, rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2, dy, 0, [cx - 40, Math.min(y, y - dy * (w - 1)) * S, cx + 40, (Math.max(y, y - dy * (w - 1)) + 1) * S], bay]; }
    }
    for (const dx of [-1, 1]) {
      const bay = bayOf(x, y, dx > 0 ? 2 : 3);
      if (!curb(x + dx, y) || across(x, y, -dx, 0) < (bay ? 4 : 5)) continue;
      let ok = true;
      for (let i = -3; i <= 4 && ok; i++) ok = road(x, y + i) && road(x - dx, y + i) && curb(x + dx, y + i) && !lineBlock(x, y + i);
      if (ok) { const w = across(x, y, -dx, 0); const cy = bay ? snap(y * S + 8, bay === 'auto' ? CP : P) : y * S + 16; return [x * S + 8 - dx, cy, rnd() < 0.5 ? 0 : Math.PI, 0, dx, [Math.min(x, x - dx * (w - 1)) * S, cy - 40, (Math.max(x, x - dx * (w - 1)) + 1) * S, cy + 40], bay]; }
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
    if (s[6] === 'moto' || (!s[6] && rnd() < 0.25)) { // 2 o 3 motos en batería contra el cordón (en los cajones de moto, siempre motos)
      const [cx, cy, , dy, dx] = s, k = 2 + ((rnd() * 2) | 0), x0b = Math.floor(cx / S), y0b = Math.floor(cy / S);
      // el cordón está a (y0b + 1) * S si queda al sur (dy > 0), a y0b * S si al norte; el centro de la moto, media moto más adentro
      const hb = Math.round(9.5 * VR.VK) + 2;
      const mcy = dy > 0 ? (y0b + 1) * S - hb : y0b * S + hb, mcx = dx > 0 ? (x0b + 1) * S - hb : x0b * S + hb;
      for (let i = 0; i < k; i++) {
        const mx = dy ? cx - P + i * P : mcx, my = dy ? mcy : cy - P + i * P;
        const a = dy ? (dy > 0 ? 0 : Math.PI) : (dx > 0 ? -Math.PI / 2 : Math.PI / 2);
        if (free(mx, my, 8)) add(mx, my, a, (rnd() * VR.MOTO_COLORS.length) | 0, 'moto');
      }
    } else if (free(s[0], s[1], 24)) add(s[0], s[1], s[2], 1 + ((rnd() * (VR.CAR_COLORS.length - 1)) | 0));
  }
  if (world.cache) world.cache.clear();   // se pintaron rayitas en `line` mientras se acomodaban las motos: que los bloques se redibujen
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
