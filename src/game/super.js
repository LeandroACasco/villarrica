// Supermercados por dentro (14/11/2026, pedido de Leandro): interior grande, detallado y lleno de gente, con varias cajas y filas.
// Usa el motor VR.Salon (igual que el mercado). Un solo interior sirve a los 7 súper del mapa; cambia la marca (colores y cartel).
// Adentro hay niños siempre acompañados por un adulto (ambiente seguro: sin chespis, armas ni violencia). Todo el arte es propio.
(function () {
  const H = VR.hash, pick = (a) => a[(Math.random() * a.length) | 0];
  // marcas (los nombres son los de los súper reales del mapa; colores y cartel inventados, sin logos)
  const BR = {
    express: { id: 'express', n: 'Super Express', c1: '#c8322a', c2: '#8f1e18', ti: 0 },
    estrella: { id: 'estrella', n: 'Super Estrella', c1: '#e8b830', c2: '#a87c10', ti: 5 },
    herrero: { id: 'herrero', n: 'Super Herrero', c1: '#2e6fc8', c2: '#1e4a8a', ti: 2 },
    herreroGroup: { id: 'herreroGroup', n: 'Herrero Group', c1: '#1e3a6a', c2: '#12264a', ti: 13 },
    herreroNorte: { id: 'herreroNorte', n: 'Super Herrero Norte', c1: '#2e6fc8', c2: '#1e4a8a', ti: 2 },
    biggie: { id: 'biggie', n: 'Biggie', c1: '#e87a2a', c2: '#b05410', ti: 8 },
    superseis: { id: 'superseis', n: 'Superseis', c1: '#3b9a5a', c2: '#26703c', ti: 4 },
  };
  VR.SUPERS = BR;
  const W = 512, HH = 352, NL = 5;                        // tamaño de la escena y cantidad de cajas
  const LX = [44, 124, 204, 284, 364], CLOSED = [false, false, false, false, true]; // x de cada caja; la última cerrada
  const DOOR = { x: 452, y: 328 };
  // ---- góndolas (2 filas × 3) y mostradores frescos (pared del fondo). items: [nombre, precio Gs, hambre, cura]
  const G = [
    { id: 'almacen', n: 'Almacén', ico: '🥫', x: 30, y: 100, pal: ['#d8402e', '#e8b830', '#2e8a52', '#f2efe6', '#7a4a28'], items: [['Galletitas dulces', 5000, 12], ['Alfajor', 4500, 10], ['Maní garrapiñado', 4000, 10], ['Chocolate', 7000, 12], ['Pan de molde (rodaja ×4)', 6000, 16]] },
    { id: 'bebidas', n: 'Bebidas', ico: '🥤', x: 190, y: 100, pal: ['#c8322a', '#2e6fc8', '#e87a2a', '#3b9a5a', '#e8b830'], items: [['Gaseosa 500 ml', 6000, 6], ['Agua mineral', 3500, 3], ['Jugo en caja', 5000, 8], ['Isotónico', 8000, 6, 4], ['Mosto (jugo de caña)', 4000, 8]] },
    { id: 'snacks', n: 'Snacks', ico: '🍿', x: 350, y: 100, pal: ['#e8b830', '#c8322a', '#e87a2a', '#a8d0ec', '#7a4ab0'], items: [['Papas fritas', 6000, 12], ['Palitos salados', 4000, 10], ['Maíz pororó', 3500, 10], ['Barra de cereal', 3500, 9]] },
    { id: 'lacteos', n: 'Lácteos', ico: '🥛', x: 30, y: 152, fridge: true, pal: ['#f2efe6', '#a8d0ec', '#e8b830', '#e86aa0', '#f2efe6'], items: [['Yogur bebible', 4500, 10], ['Leche 1 L', 7500, 14], ['Queso Paraguay (porción)', 12000, 25], ['Postre de chocolate', 5000, 12]] },
    { id: 'limpieza', n: 'Limpieza', ico: '🧴', x: 190, y: 152, pal: ['#4aa8b8', '#7a4ab0', '#3b9a5a', '#e8b830', '#2e6fc8'], items: [], frase: ['🧴 Detergente, lavandina, jabón en polvo. Nada para comer; ni tentándote, mitã.', '🧽 Un pasillo entero de limpieza. Tu pieza lo necesita, pero la billetera no.', '🧻 Papel higiénico en pirámides. Arquitectura de supermercado.'] },
    { id: 'congelados', n: 'Congelados', ico: '🧊', x: 350, y: 152, fridge: true, pal: ['#a8d0ec', '#f2efe6', '#e86aa0', '#e8b830', '#2e6fc8'], items: [['Helado palito', 6000, 8], ['Helado 1 L', 22000, 22], ['Pizza congelada', 25000, 50], ['Hamburguesas (×2)', 14000, 36]] },
  ];
  const F = [
    { id: 'carne', n: 'Carnicería', ico: '🥩', x: 16, col: ['#a82820', '#7a1a14'], pal: ['#c8322a', '#e86a5a', '#8f1e18', '#f0d0c0'], quien: 'Don Pedro', hi: ['Asado fresco, cortado hoy.', 'Chorizo, costilla, vacío. Pedí nomás.', 'La mejor carne de Villarrica, ndaje.'], items: [['Chorizo parrillero', 12000, 30], ['Carne asada (porción)', 28000, 60], ['Milanesa lista', 15000, 45]] },
    { id: 'pan', n: 'Panadería', ico: '🥖', x: 136, col: ['#c88a38', '#8a5a1a'], pal: ['#e8b86a', '#d89a48', '#f2d8a0', '#b8742a'], quien: 'Ña Mirtha', hi: ['Pan calentito, recién salido.', 'Chipa, medialuna, torta. Todo del día.', 'Pasá, mitã, que se enfría.'], items: [['Pan francés (4)', 4000, 14], ['Chipa (3)', 5000, 15], ['Medialuna', 3000, 10], ['Torta (porción)', 9000, 28]] },
    { id: 'fiambre', n: 'Rotisería', ico: '🍗', x: 256, col: ['#d8a838', '#9a7418'], pal: ['#e8a838', '#c86a28', '#f2d890', '#8a4a20'], quien: 'Don Cirilo', hi: ['Pollito a la parrilla, calentito.', 'Empanadas, sándwiches, lo que quieras.', 'Hoy hay pollo y mandioca.'], items: [['Pollo a la parrilla', 38000, 70], ['Empanadas (3)', 15000, 40], ['Sándwich de miga', 8000, 24]] },
    { id: 'verdura', n: 'Verdulería', ico: '🥬', x: 376, col: ['#3a9a3a', '#256a25'], pal: ['#c8322a', '#3b9a5a', '#e8b830', '#e87a2a', '#7a4ab0'], quien: 'Ña Cándida', hi: ['Verdura fresquita del día.', 'Tomate, locote, banana. ¿Qué llevás?', 'Todo de la quinta, mitã.'], items: [['Banana', 3000, 8], ['Mamón (porción)', 4000, 10], ['Ensalada lista', 10000, 22, 6], ['Jugo de naranja', 6000, 12]] },
  ];
  const PREGON = ['📢 «Atención clientes: oferta en yerba mate, solo por hoy.»', '📢 «Se solicita a la señora del auto rojo que apague las luces.»', '📢 «Pollo a la parrilla recién salido en la rotisería.»', '📢 «Caja 5 cerrada. Disculpen las molestias.»', '📢 «Promo: 2 gaseosas por el precio de una y media.»'];
  const NINOS = ['👧 «¡Mamá, quiero ese!»', '👦 «¿Podemos llevar galletitas?»', '👧 «¡Quiero ir en el carrito!»', '👦 «¿Falta mucho, mamá?»', '👧 «Papá, mirá, helado.»'];
  const FR_CAJA = ['¡Buenas! ¿Con factura?', '¿Querés bolsa? Son 200 guaraníes, po.', 'Gracias por comprar acá, que le vaya lindo.'];

  VR.crearSuper = function (o) {
    let rnd = 91; const rd = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647, seeded = () => VR.av2Random(rd);
    const adultos = Array.from({ length: 14 }, seeded);
    const kidLook = () => { const L = seeded(); L.beard = 'no'; L.hat = rd() < 0.2 ? 'gorra' : 'ninguno'; L.top = 'remera'; L.build = 'normal'; L.bottom = L.gender === 'f' ? 'pollera' : 'jean'; L.hair = L.gender === 'f' ? ['colita', 'trenza', 'largo'][(rd() * 3) | 0] : 'corto'; for (const k in L) if (L[k] === true) L[k] = false; return L; };
    const ninos = Array.from({ length: 6 }, kidLook);
    const staffLook = (B, g, i) => { const L = seeded(); L.gender = g; L.top = 'camisa'; L.topColor = B.ti; L.bottom = 'vestir'; L.bottomColor = 3; L.shoes = 'zapatos'; L.shoesColor = 3; L.hat = 'ninguno'; L.beard = 'no'; L.build = 'normal'; if (g === 'f') L.hair = ['colita', 'rodete', 'largo'][i % 3]; else L.hair = 'corto'; for (const k in L) if (L[k] === true) L[k] = false; return L; };
    const guardLook = () => { const L = seeded(); L.gender = 'm'; L.top = 'camisa'; L.topColor = 13; L.bottom = 'vestir'; L.bottomColor = 13; L.shoes = 'zapatos'; L.shoesColor = 3; L.hat = 'gorra'; L.hatColor = 13; L.beard = 'no'; L.build = 'normal'; for (const k in L) if (L[k] === true) L[k] = false; return L; };
    const looks = {};                                        // personal de cada marca (cajeras, vendedores, guardia), se arma al entrar
    const staffOf = (B) => looks[B.id] || (looks[B.id] = { caja: Array.from({ length: NL }, (_, i) => staffLook(B, i % 2 ? 'm' : 'f', i)), ven: F.map((_, i) => staffLook(B, i % 2 ? 'f' : 'm', i + 1)), guardia: guardLook() });
    let gente = [], lanes = [], pregon = 7, ninoT = 12;
    const fmt = (n) => VR.fmtGs(n);

    // ------------------------------------------------------------ geometría
    const objs = () => [
      { id: 'puerta', x: 404, y: 338, w: 92, h: 12, ax: 450, ay: 330, r: 30, h2: '🚪 ACCIÓN: salir', ghost: true },
      { id: 'carrito', x: 376, y: 300, w: 22, h: 14, ax: 392, ay: 308, r: 26, h2: '🛒 ACCIÓN: ver el carrito', ghost: true },
      ...F.map((f) => ({ id: 'f:' + f.id, x: f.x, y: 44, w: 112, h: 22, ax: f.x + 56, ay: 80, r: 34, h2: f.ico + ' ACCIÓN: ' + f.n })),
      ...G.map((q) => ({ id: 'g:' + q.id, x: q.x, y: q.y, w: 132, h: 22, ax: q.x + 66, ay: q.y + 11, r: 42, h2: q.ico + ' ACCIÓN: ' + q.n })),
      ...LX.map((cx, i) => ({ id: 'c:' + i, x: cx - 24, y: 236, w: 48, h: 14, ax: cx, ay: 262, r: 24, h2: CLOSED[i] ? '⛔ Caja ' + (i + 1) + ' cerrada' : '🧾 ACCIÓN: pagar en la caja ' + (i + 1) })),
    ];

    // ------------------------------------------------------------ fondo (se pinta una vez por marca)
    function bg(g, s, me) {
      const B = me.marca;
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      const rr = (x, y, w, h, c, r = 1.6) => { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
      const lin = (x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); st.forEach((c, i) => q.addColorStop(i / (st.length - 1), c)); return q; };
      const T = (t, x, y, sz, c, al = 'center', mw) => { g.font = '700 ' + sz + 'px system-ui'; g.textAlign = al; g.fillStyle = c; if (mw) g.fillText(t, x, y, mw); else g.fillText(t, x, y); g.textAlign = 'left'; };
      R(0, 0, W, HH, '#1c1e22');
      // piso de baldosas claras con juntas y reflejos de tubos fluorescentes
      for (let y = 34; y < HH - 12; y += 16) for (let x = 8; x < W - 8; x += 16) R(x, y, 16, 16, ((x + y) / 16) % 2 ? '#e4e7ea' : '#d6dade');
      g.fillStyle = 'rgba(80,90,100,.22)'; for (let y = 34; y <= HH - 12; y += 16) g.fillRect(8, y - 0.3, W - 16, 0.6); for (let x = 8; x <= W - 8; x += 16) g.fillRect(x - 0.3, 34, 0.6, HH - 46);
      for (let y = 78; y < 232; y += 52) { g.fillStyle = lin(0, y, 0, y + 12, ['rgba(255,255,255,0)', 'rgba(255,255,255,.35)', 'rgba(255,255,255,0)']); g.fillRect(8, y, W - 16, 12); }
      for (let i = 0; i < 24; i++) { g.fillStyle = 'rgba(90,80,60,.07)'; g.beginPath(); g.ellipse(24 + H(i, 3, 6) * 460, 80 + H(i, 4, 6) * 240, 3 + H(i, 5, 6) * 7, 2 + H(i, 6, 6) * 3, 0, 0, 7); g.fill(); }
      // pared del fondo con franja de la marca, cartel grande y banderines de ofertas
      R(8, 0, W - 16, 34, '#ece6d8'); R(8, 0, W - 16, 11, lin(0, 0, 0, 11, [B.c1, B.c2]));
      for (let x = 8; x < W - 8; x += 6) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, 0, 1, 11); }
      rr(166, 2, 180, 18, '#fffdf4', 3); rr(168, 4, 176, 14, B.c1, 2.5); T(B.n.toUpperCase(), 256, 14.5, 9.6, '#fff', 'center', 168);
      for (let x = 14; x < W - 14; x += 9) { g.fillStyle = ((x / 9) | 0) % 3 === 0 ? B.c1 : ((x / 9) | 0) % 3 === 1 ? '#fffdf4' : '#e8b830'; g.beginPath(); g.moveTo(x, 11); g.lineTo(x + 8, 11); g.lineTo(x + 4, 17); g.fill(); }
      R(8, 33, W - 16, 1.2, '#9a9484');
      R(0, 12, 8, HH - 12, '#b8b4a6'); R(W - 8, 12, 8, HH - 12, '#a4a092'); R(0, 0, W, 12, '#7a7a82'); R(0, 0, W, 1.2, 'rgba(255,255,255,.25)');
      // carteles de afiches en las paredes laterales
      for (let i = 0; i < 5; i++) { const yy = 60 + i * 52; rr(1, yy, 6, 20, ['#e8b830', '#c8322a', '#2e6fc8', '#3b9a5a', '#e86aa0'][i], 1); }
      // mostradores frescos
      for (const f of F) {
        const x = f.x; rr(x, 22, 112, 10, f.col[0], 2); T(f.ico + ' ' + f.n.toUpperCase(), x + 56, 30, 5.4, '#fff', 'center', 104);
        rr(x, 44, 112, 22, lin(0, 44, 0, 66, [f.col[0], f.col[1]]), 2); R(x, 44, 112, 1.3, 'rgba(255,255,255,.4)');
        rr(x + 2, 38, 108, 12, 'rgba(206,232,242,.75)', 2); R(x + 2, 38, 108, 1, '#fff');
        for (let i = 0; i < 13; i++) { g.fillStyle = f.pal[(i + ((H(i, x, 3) * 4) | 0)) % f.pal.length]; g.beginPath(); g.ellipse(x + 7 + i * 8, 44.5 + (i % 2) * 1.6, 3.2, 2.1, 0, 0, 7); g.fill(); }
        R(x, 66, 112, 3, 'rgba(0,0,0,.16)');
      }
      // góndolas
      for (const q of G) {
        const x = q.x, y = q.y, w = 132, h = 22;
        R(x + 2, y + h, w, 3.5, 'rgba(0,0,0,.18)');
        rr(x - 1, y, w + 2, h, '#6a7078', 1.5);
        rr(x, y, w, 7, q.fridge ? '#cfe3ee' : '#c4c9d0', 1.2); T(q.n.toUpperCase(), x + w / 2, y + 5.3, 4.6, q.fridge ? '#1e5a7a' : '#4a525c', 'center', w - 8);
        rr(x, y + 7, w, 15, q.fridge ? '#dcecf4' : '#8e949c', 1);
        for (let r = 0; r < 2; r++) { const ry = y + 8.5 + r * 6.6; R(x + 1, ry + 5.2, w - 2, 0.9, 'rgba(40,46,54,.6)'); for (let i = 0; i < 21; i++) { g.fillStyle = q.pal[(i + r * 2 + ((H(i, x + r, 2) * 5) | 0)) % q.pal.length]; g.fillRect(x + 2 + i * 6.2, ry + (H(i, r, 9) < 0.3 ? 1 : 0), 5, 5.2 - (H(i, r, 9) < 0.3 ? 1 : 0)); } }
        if (q.fridge) { g.fillStyle = lin(x, y + 7, x + w, y + 22, ['rgba(255,255,255,.5)', 'rgba(255,255,255,0)', 'rgba(255,255,255,.35)']); g.fillRect(x, y + 7, w, 15); for (let i = 1; i < 4; i++) R(x + i * w / 4, y + 7, 0.8, 15, 'rgba(60,100,120,.55)'); }
        R(x + w, y, 1.5, h, '#4a5058');
      }
      // cajas: mostrador con cinta, caja registradora, cartel con el número
      for (let i = 0; i < NL; i++) {
        const cx = LX[i], x = cx - 24, cl = CLOSED[i];
        R(x + 2, 250, 48, 3, 'rgba(0,0,0,.16)');
        rr(x, 236, 48, 14, cl ? '#6a7078' : lin(0, 236, 0, 250, ['#56606c', '#3a4350']), 2);
        R(x + 2, 237.5, 30, 6, cl ? '#3a3d44' : '#23262c'); for (let k = 0; k < 9; k++) R(x + 4 + k * 3.2, 237.5, 0.7, 6, 'rgba(255,255,255,.12)');
        rr(x + 34, 234.5, 12, 9, '#d8dde2', 1.5); R(x + 36, 236, 8, 3.6, cl ? '#3a3d44' : '#6fd88a'); R(x + 36, 240.4, 8, 1.4, '#9aa0a8');
        R(x + 33, 244, 14, 1.2, 'rgba(255,255,255,.3)');
        R(cx - 0.5, 196, 1, 20, '#8a8f98'); rr(cx - 8, 214, 16, 11, cl ? '#8a2a22' : B.c1, 2.4); T(cl ? '✕' : String(i + 1), cx, 223, 9, '#fff');
        if (cl) { rr(cx - 17, 256, 34, 9, '#fffdf4', 2); T('CERRADA', cx, 262.6, 5.4, '#a82820'); }
      }
      // pared frontal con la puerta automática, felpudo y cartel
      R(0, HH - 12, W, 12, '#8a8f98'); R(0, HH - 12, W, 1.4, '#b4b9c2'); R(0, HH - 1, W, 1, '#5a5f68');
      rr(404, HH - 14, 92, 14, 'rgba(160,208,230,.85)', 2); for (let i = 0; i < 3; i++) R(404 + i * 30.6, HH - 14, 1.2, 14, '#e8ecf0'); R(404, HH - 14, 92, 1.2, '#e8ecf0');
      rr(414, HH - 28, 72, 11, '#2a2d34', 3); T('ENTRADA · SALIDA', 450, HH - 20.3, 5.2, '#ffd84a', 'center', 66);
      // carritos apilados al lado de la entrada
      for (let i = 0; i < 3; i++) { rr(378 + i * 4, 300 - i * 1.6, 22, 12, 'rgba(150,160,172,.9)', 1.4); R(378 + i * 4, 303 - i * 1.6, 22, 0.8, '#5a6068'); for (let k = 0; k < 5; k++) R(380 + i * 4 + k * 4, 300 - i * 1.6, 0.7, 12, 'rgba(60,68,76,.6)'); }
      R(396, 292, 2, 12, '#c8322a'); R(374, 313, 3, 1.6, '#333'); R(396, 313, 3, 1.6, '#333');
    }

    // ------------------------------------------------------------ gente
    const band = (y) => (y < 110 ? 0 : y < 165 ? 1 : 2);
    const route = (p, tx, ty) => { const w = []; if (band(p.y) !== band(ty)) { const ax = Math.abs(p.x - 176) < Math.abs(p.x - 336) ? 176 : 336; w.push([ax, p.y], [ax, ty]); } w.push([tx, ty]); return w; };
    const slotY = (k) => 258 + k * 14;
    function walk(p, tx, ty, sp, dt, me) {
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy); if (d < 1.6) return true;
      const k = Math.min(d, sp * dt) / d, nx = p.x + dx * k, ny = p.y + dy * k;
      if (!me.blocked(nx, ny)) { p.x = nx; p.y = ny; p.stuck = 0; } else if (!me.blocked(nx, p.y)) p.x = nx; else if (!me.blocked(p.x, ny)) p.y = ny; else p.stuck = (p.stuck || 0) + dt;
      p.anim += dt * 7; p.mv = true; p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); return false;
    }
    function follow(p, dt, me, sp) {
      if (!p.path.length) return true; const w = p.path[0];
      if (walk(p, w[0], w[1], sp, dt, me) || p.stuck > 1.6) { if (p.stuck > 1.6) { p.x = w[0]; p.y = w[1]; p.stuck = 0; } p.path.shift(); }
      return !p.path.length;
    }
    function nuevoObjetivo(p, me) { for (let k = 0; k < 12; k++) { const b = (Math.random() * 3) | 0, tx = 22 + Math.random() * 466, ty = b === 0 ? 74 + Math.random() * 26 : b === 1 ? 130 + Math.random() * 22 : 182 + Math.random() * 44; if (!me.blocked(tx, ty) && !(tx > 390 && ty > 228)) { p.path = route(p, tx, ty); return true; } } return false; }
    function irACaja(p) {
      let best = -1, bl = 99; for (let i = 0; i < NL; i++) if (!CLOSED[i] && lanes[i].length < 4 && lanes[i].length < bl) { best = i; bl = lanes[i].length; }
      if (best < 0) { p.need++; return; }
      const gx = LX[best] + 40, pa = route(p, gx, 226); pa.push([gx, slotY(lanes[best].length)]); p.path = pa; p.lane = best; p.st = 'queue'; lanes[best].push(p);
    }
    function crear(me, B) {
      gente = []; lanes = Array.from({ length: NL }, () => []);
      const N = 20; let ai = 0;
      for (let i = 0; i < N; i++) {
        const p = { look: adultos[ai++ % adultos.length], x: 0, y: 0, dir: 'down', mv: false, anim: Math.random() * 8, st: 'browse', w: Math.random() * 3, items: 0, need: 1 + ((Math.random() * 3) | 0), path: [], lane: -1, cart: Math.random() < 0.65, hidden: false, kids: [] };
        let ok = false; for (let k = 0; k < 40 && !ok; k++) { const b = (Math.random() * 3) | 0; p.x = 24 + Math.random() * 460; p.y = b === 0 ? 74 + Math.random() * 26 : b === 1 ? 130 + Math.random() * 22 : 182 + Math.random() * 44; ok = !me.blocked(p.x, p.y) && !(p.x > 390 && p.y > 228); }
        if (Math.random() < 0.5) { const ln = (Math.random() * NL) | 0; if (!CLOSED[ln] && lanes[ln].length < 4) { p.st = 'queue'; p.lane = ln; p.x = LX[ln]; p.y = slotY(lanes[ln].length); p.dir = 'up'; p.inq = true; lanes[ln].push(p); p.cart = true; } }
        gente.push(p);
      }
      // familias: 6 adultos con un niño o niña a su lado (siempre acompañados)
      const ids = gente.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 6);
      ids.forEach((gi, kd) => { const p = gente[gi]; const k = { kid: true, parent: p, look: ninos[kd % ninos.length], x: p.x + 10, y: p.y + 1, dir: 'down', mv: false, anim: 0, stuck: 0 }; p.kids.push(k); p.cart = Math.random() < 0.5; gente.push(k); });
            me.staff = staffOf(B);
    }
    const sacar = (p) => { const L = lanes[p.lane]; if (L) { const i = L.indexOf(p); if (i >= 0) L.splice(i, 1); } };

    // ------------------------------------------------------------ menús y compras
    const total = () => S.cart.reduce((a, c) => a + c.p, 0);
    const menuCat = (c, quien, hi) => {
      const op = c.items.map(([n, p, h, cu]) => [n + ' · ' + fmt(p), () => { S.cart.push({ n, p, h, cu: cu || 0 }); return menuCat(c, quien, hi); }]); op.push(['Listo, seguir', () => false]);
      return [{ quien: 'sis', titulo: c.ico + ' ' + c.n + ' · ' + S.marca.n, txt: (quien ? quien + ': «' + hi + '» ' : '') + 'Carrito: ' + S.cart.length + (S.cart.length ? ' · ' + fmt(total()) : '') + ' · Tenés ' + fmt(VR.Wallet.get()), op }];
    };
    const pagar = (i) => {
      if (!S.cart.length) { S.decir('🧾 Cajera: «¿Y qué te cobro, po? Tu carrito está vacío.»'); return; }
      const t = total(), op = [['Pagar ' + fmt(t), () => {
        if (VR.Wallet.get() < t) { S.decir('💸 No te alcanza. Sacá algo del carrito o volvé con más plata.'); return false; }
        const h = S.cart.reduce((a, c) => a + c.h, 0), cu = S.cart.reduce((a, c) => a + c.cu, 0);
        if (o.come) o.come(t, h, 'Compras en ' + S.marca.n, cu); S.cart = []; S.decir('🧾 «' + pick(FR_CAJA) + '»'); return false; }],
        ['Vaciar el carrito', () => { S.cart = []; S.decir('🛒 Dejaste todo en el carrito y se lo llevó un empleado.'); return false; }], ['Seguir comprando', () => false]];
      if (o.menu) o.menu([{ quien: 'sis', titulo: '🧾 Caja ' + (i + 1) + ' · ' + S.marca.n, txt: 'Cajera: «Son ' + fmt(t) + '» (' + S.cart.length + ' cosas). Tenés ' + fmt(VR.Wallet.get()), op }]);
    };

    const S = new VR.Salon({
      W, H: HH, start: { x: 452, y: 318, dir: 'up' }, bounds: [16, 72, 496, 336], objs, bg, key: () => S.marca.id,
      enter: (me) => { me.cart = []; me.esp = null; crear(me, me.marca); pregon = 5; me.decir('🛒 ' + me.marca.n + ' · Bienvenido. Agarrá lo que quieras y pagá en alguna de las cajas.', 4); },
      exit: (me) => { if (me.cart && me.cart.length && o.toast) o.toast('🛒 Te fuiste sin pagar y dejaste el carrito'); me.cart = []; },
      items: (me) => {
        const it = [], st = me.staff; if (!st) return it;
        F.forEach((f, i) => it.push({ sy: 53, f: (g) => me.figura(g, st.ven[i], f.x + 96, 53, 'down', false, 0) }));
        for (let i = 0; i < NL; i++) if (!CLOSED[i]) it.push({ sy: 233, f: (g) => me.figura(g, st.caja[i], LX[i] - 4, 233, 'down', false, 0) });
        it.push({ sy: 322, f: (g) => me.figura(g, st.guardia, 414, 322, 'left', false, 0) });
        for (const p of gente) {
          if (p.hidden || (p.parent && p.parent.hidden)) continue;
          it.push({ sy: p.y, f: (g) => me.figura(g, p.look, p.x, p.y, p.dir, p.mv, p.anim, p.kid ? 1.1 : 1.62) });
          if (!p.kid && p.cart) it.push({ sy: p.y + 0.5, f: (g) => { const cxp = p.x + (p.dir === 'left' ? -11 : 11), cyp = p.y + 1; g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(cxp, cyp + 1, 7, 2.2, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(160,170,182,.95)'; g.beginPath(); g.roundRect(cxp - 6, cyp - 8, 12, 7, 1); g.fill(); g.fillStyle = '#5a6068'; g.fillRect(cxp - 6, cyp - 4, 12, 0.7); g.fillRect(cxp + (p.dir === 'left' ? 5 : -6), cyp - 11, 1.2, 4); for (let k = 0; k < 4; k++) { g.fillStyle = ['#c8322a', '#e8b830', '#3b9a5a', '#2e6fc8'][(k + ((p.x / 20) | 0)) % 4]; g.fillRect(cxp - 5 + k * 3, cyp - 10 + (k % 2), 2.6, 3); } g.fillStyle = '#222'; g.fillRect(cxp - 5, cyp - 1, 2, 1.4); g.fillRect(cxp + 3, cyp - 1, 2, 1.4); } });
        }
        return it;
      },
      tick: (dt, me) => {
        for (const p of gente) {
          if (p.kid) { const f = p.parent; p.mv = false; if (f.hidden) { p.x = f.x + 10; p.y = f.y + 1; continue; } const ox = f.st === 'queue' || f.st === 'pay' ? 11 : (f.dir === 'left' ? 11 : -11), oy = f.dir === 'up' ? 6 : 1; const d = Math.hypot(f.x + ox - p.x, f.y + oy - p.y); if (d > 3) walk(p, f.x + ox, f.y + oy, f.mv ? 36 : 30, dt, me); else p.dir = f.dir === 'up' ? 'up' : 'down'; if (p.stuck > 1.2 || d > 90) { p.x = f.x + ox; p.y = f.y + oy; p.stuck = 0; } continue; }
          p.mv = false;
          if (p.hidden) { if ((p.w -= dt) <= 0) { p.hidden = false; p.x = DOOR.x + (Math.random() * 16 - 8); p.y = DOOR.y - 4; p.st = 'browse'; p.items = 0; p.need = 1 + ((Math.random() * 3) | 0); p.cart = true; p.path = [[452, 226]]; p.lane = -1; p.inq = false; p.w = 0; } continue; }
          if (p.st === 'browse') {
            if (p.path.length) { if (follow(p, dt, me, 25)) { p.dir = 'up'; p.w = 1 + Math.random() * 2.5; p.items++; if (p.items >= p.need) irACaja(p); } }
            else if ((p.w -= dt) <= 0) { if (!nuevoObjetivo(p, me)) p.w = 1; }
          } else if (p.st === 'queue') {
            const L = lanes[p.lane] || [], k = L.indexOf(p);
            if (k < 0) { p.st = 'browse'; p.w = 0; continue; }
            if (p.path.length) { p.path[p.path.length - 1][1] = slotY(k); if (follow(p, dt, me, 26)) p.inq = true; }
            else { p.inq = true; if (walk(p, LX[p.lane], slotY(k), 24, dt, me) || Math.hypot(p.x - LX[p.lane], p.y - slotY(k)) < 2) { p.dir = 'up'; p.mv = false; if (k === 0) { p.st = 'pay'; p.tp = 5 + Math.random() * 5; } } }
          } else if (p.st === 'pay') {
            p.dir = 'up'; if ((p.tp -= dt) <= 0) { const cx = LX[p.lane]; sacar(p); p.st = 'exit'; p.path = [[cx + 40, 258], [cx + 40, 320], [DOOR.x - 6, 324], [DOOR.x, DOOR.y + 6]]; }
          } else if (p.st === 'exit') {
            if (follow(p, dt, me, 28)) { p.hidden = true; p.w = 3 + Math.random() * 10; }
          }
        }
        pregon -= dt; if (pregon <= 0 && !me.say) { pregon = 9 + Math.random() * 8; me.decir(rd() < 0.55 ? pick(PREGON) : pick(NINOS), 3.4); }
        if (me.esp) { const c = me.esp, cx = LX[c.i]; if (Math.hypot(me.px - cx, me.py - 262) > 38) { me.esp = null; me.decir('🧾 Te saliste de la fila.'); } else if ((c.t -= dt) <= 0) { me.esp = null; pagar(c.i); } }
      },
      act: (ob, me) => { const k = ob.id;
        if (k === 'puerta') { me.salir(); return; }
        if (k === 'carrito') { if (!S.cart.length) { me.decir('🛒 Tu carrito está vacío. Pasá por las góndolas y los mostradores.'); return; } o.menu && o.menu([{ quien: 'sis', titulo: '🛒 Tu carrito', txt: S.cart.map((c) => c.n).slice(-8).join(', ') + (S.cart.length > 8 ? '…' : '') + ' · Total ' + fmt(total()), op: [['Vaciar el carrito', () => { S.cart = []; return false; }], ['Seguir', () => false]] }]); return; }
        if (k[0] === 'c') { const i = +k.slice(2); if (CLOSED[i]) { me.decir('⛔ Esa caja está cerrada. Probá en otra.'); return; } const q = lanes[i] ? lanes[i].length : 0; if (q >= 2 && S.cart.length) { me.esp = { i, t: Math.min(5, q * 1.3) }; me.decir('⏳ Hacés la fila en la caja ' + (i + 1) + ' (' + q + ' personas)…', 3); } else pagar(i); return; }
        if (k[0] === 'f') { const f = F.find((x) => 'f:' + x.id === k); if (f && o.menu) o.menu(menuCat(f, f.quien, pick(f.hi))); return; }
        const q = G.find((x) => 'g:' + x.id === k); if (!q) return;
        if (q.items.length && o.menu) o.menu(menuCat(q)); else me.decir(pick(q.frase));
      },
    }, { player: o.player, busy: o.busy });
    S.cart = []; S.marca = BR.express;
    S.abrir = (id) => { S.marca = BR[id] || BR.express; S.entrar(); };
    return S;
  };
})();
