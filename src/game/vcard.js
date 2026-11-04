// Tarjeta del vehículo: al subirte aparece un dibujito de costado con el nombre (inventado) y una línea
// que lo describe. Los dibujos son propios, por categoría, sin marcas ni modelos reales.
'use strict';
VR.drawSide = (kind, pal) => {
  const [C, D, L] = pal, c = VR.canvas(64, 36), g = c.getContext('2d'), P = VR.gfx.painter(c);
  const TIRE = '#16161a', RIM = '#8a8e96', CH = '#c8ccd4', SEAT = '#26262a';
  const wheel = (cx, cy, r, fat) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y);
      if (d <= r + 0.3) P.r(cx + x, cy + y, 1, 1, d > r - (fat ? 2.6 : 1.6) ? TIRE : d < 1.5 ? CH : d < r - (fat ? 3.5 : 2.5) ? '#2c2c32' : RIM);
    }
  };
  const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
  if (kind === 'car') {
    wheel(16, 28, 5, true); wheel(48, 28, 5, true);
    poly([[4, 27], [4, 18], [10, 15], [20, 7], [42, 6], [52, 15], [60, 17], [61, 26], [55, 27], [53, 23], [43, 23], [41, 27], [23, 27], [21, 23], [11, 23], [9, 27]], C);
    poly([[21, 9], [32, 8], [32, 15], [14, 15]], '#3b4d63'); poly([[34, 8], [41, 8], [49, 15], [34, 15]], '#3b4d63');
    P.r(22, 9, 3, 1, '#6f8aa6'); P.r(35, 9, 3, 1, '#6f8aa6');
    P.r(5, 19, 56, 1, L); P.r(33, 8, 1, 18, D); P.r(4, 25, 57, 2, D);
    P.r(58, 18, 3, 2, '#fff7c8'); P.r(4, 18, 2, 3, '#e8302a');
  } else if (kind === 'cub') {
    wheel(12, 28, 6); wheel(50, 28, 6);
    P.r(9, 26, 28, 2, '#2a2a2e');                                            // basculante
    poly([[8, 22], [14, 15], [36, 15], [38, 20], [30, 24], [14, 24]], C);    // carenado trasero
    P.r(14, 12, 22, 3, SEAT); P.r(16, 12, 18, 1, '#3a3a40');                 // asiento largo
    poly([[38, 24], [46, 10], [50, 9], [51, 12], [44, 25]], C);               // escudo delantero
    P.r(36, 22, 9, 3, '#2a2a2e');                                            // piso
    P.r(48, 8, 2, 20, CH); P.r(44, 6, 8, 2, '#2a2a2e'); P.r(45, 2, 1, 4, CH); P.r(45, 1, 2, 2, '#3a3a40'); // horquilla, manubrio, espejo
    P.r(51, 9, 3, 3, '#fff7c8'); P.r(5, 18, 3, 2, '#e8302a');
    P.r(14, 24, 16, 2, CH); P.r(28, 21, 8, 4, '#9a9ea6');                   // escape y motor
    P.r(15, 17, 18, 1, L); P.r(20, 19, 10, 1, '#f2f0ea');                     // franjas
  } else if (kind === 'mini') {
    wheel(13, 27, 7, true); wheel(49, 27, 7, true);
    P.r(13, 24, 20, 3, '#2a2a2e');
    poly([[24, 12], [40, 11], [44, 16], [42, 22], [26, 22]], C);              // tanque gordo
    P.r(26, 21, 14, 5, '#3a3a40'); P.r(28, 22, 10, 3, '#2c2c32');            // motor a la vista
    P.r(8, 12, 22, 4, SEAT); P.r(9, 12, 20, 1, '#3a3a40'); poly([[5, 14], [9, 12], [9, 17], [5, 17]], C); // asiento plano y cola
    P.r(45, 10, 2, 18, '#2a2a2e'); P.r(43, 5, 6, 2, '#2a2a2e'); P.r(44, 2, 1, 3, CH);
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (Math.hypot(x, y) <= 3.2) P.r(50 + x, 11 + y, 1, 1, Math.hypot(x, y) < 1.8 ? '#fff7c8' : C); // faro redondo
    P.r(4, 15, 2, 2, '#e8302a'); P.r(27, 14, 12, 1, L);
  } else if (kind === 'calle') {
    wheel(12, 27, 7); wheel(51, 27, 7);
    P.r(12, 25, 22, 2, '#2a2a2e');
    poly([[28, 9], [44, 8], [46, 14], [30, 16]], C); P.r(31, 10, 12, 1, L);  // tanque grande
    P.r(31, 16, 12, 8, '#9a9ea6'); P.r(33, 17, 8, 5, '#c8ccd4'); for (let y = 17; y < 23; y += 2) P.r(33, y, 8, 1, '#7a7e86'); // motor con aletas
    P.r(12, 12, 18, 3, SEAT); P.r(13, 12, 16, 1, '#3a3a40'); poly([[4, 14], [12, 12], [14, 17], [6, 17]], C); // asiento y colín
    P.r(4, 10, 10, 2, CH); P.r(4, 10, 1, 4, CH);                             // parrilla
    P.r(8, 22, 26, 3, CH); P.r(8, 22, 26, 1, '#ffffff');                     // escape largo cromado
    P.r(47, 6, 2, 22, CH); P.r(44, 4, 7, 2, '#2a2a2e'); P.r(45, 1, 1, 3, CH);
    poly([[49, 6], [55, 6], [56, 13], [50, 13]], D); P.r(52, 8, 3, 3, '#fff7c8'); // faro con visera
    P.r(4, 15, 2, 2, '#e8302a');
  } else if (kind === 'carga') {
    wheel(12, 29, 5, true); wheel(55, 29, 5, true);
    poly([[1, 8], [35, 8], [35, 24], [1, 24]], D); P.r(2, 9, 32, 14, C);      // caja
    for (let x = 4; x < 34; x += 6) P.r(x, 4, 1, 5, D); P.r(1, 3, 34, 2, D); // barandas
    P.r(4, 15, 28, 1, VR.shadeHex(C, 0.75)); P.r(2, 22, 32, 2, VR.shadeHex(C, 0.6));
    P.r(34, 2, 2, 22, D);                                                     // respaldo alto
    P.r(36, 15, 12, 3, SEAT); poly([[40, 14], [50, 12], [50, 18], [42, 18]], C); // asiento y tanque
    P.r(38, 19, 10, 6, '#9a9ea6'); P.r(35, 25, 18, 2, '#2a2a2e');
    P.r(52, 9, 2, 20, CH); P.r(49, 7, 7, 2, '#2a2a2e'); P.r(55, 10, 3, 3, '#fff7c8');
  } else if (kind === 'pati') {
    wheel(12, 29, 4, true); wheel(50, 29, 4, true);
    P.r(12, 26, 38, 3, '#2a2a30'); P.r(14, 26, 32, 1, C);                   // tabla
    P.r(49, 4, 2, 24, '#3a3a40'); P.r(48, 4, 1, 22, C);                      // columna
    P.r(43, 2, 12, 2, '#2a2a2e'); P.r(43, 2, 2, 2, '#d8dce4'); P.r(53, 2, 2, 2, '#d8dce4');
    P.r(51, 9, 2, 2, '#fff7c8'); P.r(10, 25, 3, 2, '#e8302a');
  }
  return c;
};
VR.showVehicleCard = (v) => {
  const el = document.getElementById('vcard'); if (!el) return;
  const sp = v.spec, pal = sp.colors[v.color % sp.colors.length];
  const cv = el.querySelector('canvas'), g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height); g.imageSmoothingEnabled = false;
  g.drawImage(VR.drawSide(sp.side || 'cub', pal), 0, 0);
  el.querySelector('b').textContent = sp.name || '';
  el.querySelector('span').textContent = sp.desc || '';
  el.classList.add('show'); clearTimeout(el._h); el._h = setTimeout(() => el.classList.remove('show'), 4200);
};
