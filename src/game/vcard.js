// Tarjeta del vehículo: al subirte aparece un dibujito de costado con el nombre (inventado) y una línea
// que lo describe. Los dibujos son propios, por categoría, sin marcas ni modelos reales.
'use strict';
VR.drawSide = (kind, pal, t = {}) => {
  const [C, D, L] = pal, c = VR.canvas(64, 36), g = c.getContext('2d'), P = VR.gfx.painter(c);
  const TIRE = '#16161a', CH = '#c8ccd4', SEAT = '#26262a', LL = t.llantas || 'serie', RIM = VR.RIMS ? VR.RIMS[LL] : '#8a8e96';
  const S2 = VR.tunePal ? VR.tunePal(t.color2 ?? 11)[0] : '#f2f0ea', HL = t.faros === 'xenon' ? '#e6f2ff' : '#fff7c8', FR = t.franja && t.franja !== 'no';
  const GLS = t.polarizado == 2 ? '#14181e' : t.polarizado == 1 ? '#27323e' : '#3b4d63';
  const wheel = (cx, cy, r, fat) => {
    const spoke = LL === 'deportivas' || LL === 'doradas' || LL === 'negras';
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y), an = Math.atan2(y, x);
      let col = d > r - (fat ? 2.6 : 1.6) ? TIRE : d < 1.5 ? CH : d < r - (fat ? 3.5 : 2.5) ? '#2c2c32' : RIM;
      if (spoke && d >= 1.5 && d <= r - (fat ? 2.6 : 1.6)) col = Math.cos(5 * an) > 0.15 ? RIM : '#1e1e22';
      if (LL === 'cromadas' && d >= 1.5 && d <= r - (fat ? 2.6 : 1.6)) col = (x + y) % 3 === 0 ? '#ffffff' : RIM;
      if (d <= r + 0.3) P.r(cx + x, cy + y, 1, 1, col);
    }
  };
  if (t.neon && t.neon !== 'no' && VR.NEON) { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 30); gr.addColorStop(0, `rgba(${VR.NEON[t.neon]},.85)`); gr.addColorStop(1, `rgba(${VR.NEON[t.neon]},0)`); g.save(); g.translate(0, 32); g.scale(1, 0.14); g.translate(0, -32); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); g.restore(); }
  const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
  if (kind === 'car') {
    const lo = +t.bajo ? 2 : 0; g.save(); g.translate(0, lo);
    if (t.escape === 'deportivo') { P.r(1, 24, 5, 2, CH); P.r(1, 24, 5, 1, '#ffffff'); }
    poly([[4, 27], [4, 18], [10, 15], [20, 7], [42, 6], [52, 15], [60, 17], [61, 26], [55, 27], [53, 23], [43, 23], [41, 27], [23, 27], [21, 23], [11, 23], [9, 27]], C);
    poly([[21, 9], [32, 8], [32, 15], [14, 15]], GLS); poly([[34, 8], [41, 8], [49, 15], [34, 15]], GLS);
    if (t.polarizado != 2) { P.r(22, 9, 3, 1, '#6f8aa6'); P.r(35, 9, 3, 1, '#6f8aa6'); }
    if (t.techo === 'negro') P.r(20, 6, 22, 2, '#2a2a30');
    if (t.techo === 'parrilla') { P.r(22, 4, 19, 1, '#2a2a30'); P.r(23, 5, 1, 1, '#2a2a30'); P.r(39, 5, 1, 1, '#2a2a30'); }
    P.r(5, 19, 56, 1, L); P.r(33, 8, 1, 18, D); P.r(4, 25, 57, 2, D);
    if (FR && t.franja === 'costado') { P.r(5, 21, 56, 2, S2); }
    else if (FR) { P.r(21, 6, 21, 1, S2); P.r(43, 7, 7, 1, S2); P.r(50, 14, 9, 2, S2); P.r(4, 17, 6, 1, S2); }
    if (t.aleron === 'chico') { P.r(3, 15, 7, 2, D); }
    if (t.aleron === 'grande') { P.r(5, 13, 2, 4, '#2a2a30'); P.r(1, 11, 11, 2, C); P.r(1, 11, 11, 1, L); P.r(1, 13, 11, 1, D); }
    P.r(58, 18, 3, 2, HL); P.r(4, 18, 2, 3, '#e8302a');
    g.restore();
    wheel(16, 28, 5, true); wheel(48, 28, 5, true);
  } else if (kind === 'cub') {
    wheel(12, 28, 6); wheel(50, 28, 6);
    P.r(9, 26, 28, 2, '#2a2a2e');                                            // basculante
    poly([[8, 22], [14, 15], [36, 15], [38, 20], [30, 24], [14, 24]], C);    // carenado trasero
    P.r(14, 12, 22, 3, SEAT); P.r(16, 12, 18, 1, '#3a3a40');                 // asiento largo
    poly([[38, 24], [46, 10], [50, 9], [51, 12], [44, 25]], C);               // escudo delantero
    P.r(36, 22, 9, 3, '#2a2a2e');                                            // piso
    P.r(48, 8, 2, 20, CH); P.r(44, 6, 8, 2, '#2a2a2e'); P.r(45, 2, 1, 4, CH); P.r(45, 1, 2, 2, '#3a3a40'); // horquilla, manubrio, espejo
    P.r(51, 9, 3, 3, HL); P.r(5, 18, 3, 2, '#e8302a');
    P.r(14, 24, 16, 2, CH); P.r(28, 21, 8, 4, '#9a9ea6');                   // escape y motor
    if (t.escape === 'deportivo') { P.r(6, 22, 12, 3, CH); P.r(6, 22, 12, 1, '#ffffff'); }
    P.r(15, 17, 18, 1, FR ? S2 : L); P.r(20, 19, 10, 1, FR ? S2 : '#f2f0ea');                     // franjas
  } else if (kind === 'mini') {
    wheel(13, 27, 7, true); wheel(49, 27, 7, true);
    P.r(13, 24, 20, 3, '#2a2a2e');
    poly([[24, 12], [40, 11], [44, 16], [42, 22], [26, 22]], C);              // tanque gordo
    P.r(26, 21, 14, 5, '#3a3a40'); P.r(28, 22, 10, 3, '#2c2c32');            // motor a la vista
    P.r(8, 12, 22, 4, SEAT); P.r(9, 12, 20, 1, '#3a3a40'); poly([[5, 14], [9, 12], [9, 17], [5, 17]], C); // asiento plano y cola
    P.r(45, 10, 2, 18, '#2a2a2e'); P.r(43, 5, 6, 2, '#2a2a2e'); P.r(44, 2, 1, 3, CH);
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (Math.hypot(x, y) <= 3.2) P.r(50 + x, 11 + y, 1, 1, Math.hypot(x, y) < 1.8 ? HL : C); // faro redondo
    P.r(4, 15, 2, 2, '#e8302a'); P.r(27, 14, 12, 1, FR ? S2 : L); if (FR) P.r(27, 17, 14, 1, S2);
    if (t.escape === 'deportivo') { P.r(6, 21, 18, 3, CH); P.r(6, 21, 18, 1, '#ffffff'); }
  } else if (kind === 'calle') {
    wheel(12, 27, 7); wheel(51, 27, 7);
    P.r(12, 25, 22, 2, '#2a2a2e');
    poly([[28, 9], [44, 8], [46, 14], [30, 16]], C); P.r(31, 10, 12, 1, L); if (FR) { P.r(30, 12, 15, 2, S2); }  // tanque grande
    P.r(31, 16, 12, 8, '#9a9ea6'); P.r(33, 17, 8, 5, '#c8ccd4'); for (let y = 17; y < 23; y += 2) P.r(33, y, 8, 1, '#7a7e86'); // motor con aletas
    P.r(12, 12, 18, 3, SEAT); P.r(13, 12, 16, 1, '#3a3a40'); poly([[4, 14], [12, 12], [14, 17], [6, 17]], C); // asiento y colín
    P.r(4, 10, 10, 2, CH); P.r(4, 10, 1, 4, CH);                             // parrilla
    P.r(8, 22, 26, 3, CH); P.r(8, 22, 26, 1, '#ffffff');                     // escape largo cromado
    P.r(47, 6, 2, 22, CH); P.r(44, 4, 7, 2, '#2a2a2e'); P.r(45, 1, 1, 3, CH);
    poly([[49, 6], [55, 6], [56, 13], [50, 13]], D); P.r(52, 8, 3, 3, HL); // faro con visera
    if (t.escape === 'deportivo') { P.r(4, 19, 22, 2, CH); P.r(4, 19, 22, 1, '#ffffff'); }
    P.r(4, 15, 2, 2, '#e8302a');
  } else if (kind === 'carga') {
    wheel(12, 29, 5, true); wheel(55, 29, 5, true);
    poly([[1, 8], [35, 8], [35, 24], [1, 24]], D); P.r(2, 9, 32, 14, C);      // caja
    for (let x = 4; x < 34; x += 6) P.r(x, 4, 1, 5, D); P.r(1, 3, 34, 2, D); // barandas
    P.r(4, 15, 28, 1, VR.shadeHex(C, 0.75)); P.r(2, 22, 32, 2, VR.shadeHex(C, 0.6)); if (FR) P.r(2, 18, 32, 2, S2);
    P.r(34, 2, 2, 22, D);                                                     // respaldo alto
    P.r(36, 15, 12, 3, SEAT); poly([[40, 14], [50, 12], [50, 18], [42, 18]], C); // asiento y tanque
    P.r(38, 19, 10, 6, '#9a9ea6'); P.r(35, 25, 18, 2, '#2a2a2e');
    P.r(52, 9, 2, 20, CH); P.r(49, 7, 7, 2, '#2a2a2e'); P.r(55, 10, 3, 3, HL);
  } else if (kind === 'pati') {
    wheel(12, 29, 4, true); wheel(50, 29, 4, true);
    P.r(12, 26, 38, 3, '#2a2a30'); P.r(14, 26, 32, 1, C);                   // tabla
    P.r(49, 4, 2, 24, '#3a3a40'); P.r(48, 4, 1, 22, C);                      // columna
    P.r(43, 2, 12, 2, '#2a2a2e'); P.r(43, 2, 2, 2, '#d8dce4'); P.r(53, 2, 2, 2, '#d8dce4');
    P.r(51, 9, 2, 2, HL); P.r(10, 25, 3, 2, '#e8302a');
  }
  return c;
};
VR.showVehicleCard = (v) => {
  const el = document.getElementById('vcard'); if (!el) return;
  const sp = v.spec, pal = v.tune ? VR.tunePal(v.tune.color) : sp.colors[v.color % sp.colors.length];
  const cv = el.querySelector('canvas'), g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height); g.imageSmoothingEnabled = false;
  g.drawImage(VR.drawSide(sp.side || 'cub', pal, v.tune || {}), 0, 0);
  el.querySelector('b').textContent = sp.name || '';
  el.querySelector('span').textContent = sp.desc || '';
  el.classList.add('show'); clearTimeout(el._h); el._h = setTimeout(() => el.classList.remove('show'), 4200);
};
