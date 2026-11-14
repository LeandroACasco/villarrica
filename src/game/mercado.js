// Mercado Municipal por dentro (13/11/2026): interior caminable con 7 puestos (Leandro: «falta agregar el mercado»).
// Usa el motor VR.Salon (igual que la tienda y la despensa). Todo el arte es propio y se pinta con código.
// Los dos Mercados del mapa (Mercado 1 y Mercado 2, de OpenStreetMap) tienen puerta y llevan al mismo interior.
(function () {
  const H = VR.hash, pick = (a) => a[(Math.random() * a.length) | 0];
  // puestos: fila 0 (arriba, 4 puestos de 64) y fila 1 (abajo, 3 puestos de 84). b = [precio (Gs), hambre, nombre, cura]
  const ST = [
    { id: 'chipa', row: 0, x: 16, w: 64, nombre: 'Chipería Doña Pora', ico: '🥖', col: ['#d8402e', '#f6e8c8'], quien: 'Doña Pora',
      hi: ['¡Chipa calentita, recién salida del tatakua!', 'Pasá, pasá. Todo hecho esta mañana.', 'Ndaje, la chipa no espera a nadie.'],
      b: [['Chipa (3)', 5000, 15], ['Mbejú', 7000, 25], ['Chipa guasu (porción)', 8000, 32], ['Sopa paraguaya (porción)', 8000, 32]] },
    { id: 'karu', row: 0, x: 91, w: 64, nombre: 'Comedor Karu Rogá', ico: '🍲', col: ['#2e8a52', '#f2f0e8'], quien: 'Don Ramón',
      hi: ['Hoy hay bori bori. Y mañana también, nomás.', '¿Con hambre? Acá te llenamos hasta el domingo.', 'Karu porã, mitã. Sentate.'],
      b: [['Bori bori', 18000, 60], ['So\'o josopy', 15000, 55], ['Milanesa con arroz y ensalada', 20000, 66], ['Locro', 14000, 50]] },
    { id: 'frutas', row: 0, x: 166, w: 64, nombre: 'Frutas y jugos Ña Lidia', ico: '🍊', col: ['#e8802e', '#fff2d8'], quien: 'Ña Lidia',
      hi: ['¡Naranja dulce, mamón maduro!', 'Un jugo bien frío, que hoy pega el sol.', 'Banana, mandarina, lo que quieras, mitã.'],
      b: [['Jugo de naranja', 5000, 12], ['Mamón (porción)', 4000, 10], ['Ensalada de frutas', 9000, 22], ['Mosto (jugo de caña) frío', 4000, 8]] },
    { id: 'carne', row: 0, x: 241, w: 64, nombre: 'Carnicería Don Tito', ico: '🥩', col: ['#a82820', '#f0e0d0'], quien: 'Don Tito',
      hi: ['Asadito de domingo, todos los días.', 'Chorizo, costilla, vacío. Pedí nomás.', '¡Carne fresca, la mejor de Villarrica!'],
      b: [['Chorizo al pan', 12000, 36], ['Asado (porción)', 25000, 66], ['Costilla a la parrilla', 22000, 60]] },
    { id: 'verdura', row: 1, x: 16, w: 84, nombre: 'Verduras y mandioca Ña Cándida', ico: '🥬', col: ['#3a9a3a', '#f0f4d8'], quien: 'Ña Cándida',
      hi: ['La mandioca más tierna de Villarrica.', 'Tomate, locote, cebollita. ¿Qué llevás?', 'Verdura fresquita del día, mitã.'],
      b: [['Mandioca hervida', 3000, 15], ['Choclo asado', 4000, 14], ['Ensalada de tomate y cebolla', 5000, 10]] },
    { id: 'yuyos', row: 1, x: 118, w: 84, nombre: 'Pohã ñana · Yuyos y tereré', ico: '🌿', col: ['#5a8a3a', '#e8f0d0'], quien: 'Doña Cristina',
      hi: ['Yuyo para todo: panza, tos, nervios y suegra.', 'Un tereré con burrito, kokú y menta, ¡de maravilla!', 'Pohã ñana de verdad, nada de farmacia.'],
      b: [['Tereré con yuyos (vaso)', 4000, 6], ['Yuyo para la panza (tecito)', 6000, 0, 15], ['Mate cocido con leche', 3500, 8]] },
    { id: 'ao', row: 1, x: 220, w: 84, nombre: 'Ñandutí y ao po\'i Ña Marta', ico: '🧵', col: ['#e8a0c0', '#fff6fa'], quien: 'Ña Marta',
      hi: ['Ñandutí hecho a mano, puntada por puntada.', 'El ao po\'i es de la tierra, mirá qué finura.', 'Pasá, mirá. Mirar no cobra nadie.'], b: [] },
  ];
  const PREGON = ['🥖 «¡Chipa calentita, jaha!»', '🍊 «¡Naranja dulce, naranja!»', '🌿 «Pohã ñana, yuyo fresco, ko\'ápe.»', '🥩 «¡Asadito, pasá, pasá!»', '🥬 «¡Mandi\'o, mandi\'o tierna!»', '🍲 «Hoy hay bori bori, ndaje.»', '🗣 «¡Epa, mitã! ¿Qué estás buscando?»', '🧵 «Ñandutí legítimo, de Itauguá… bueno, de acá.»'];
  const FRASES = {
    chipa: ['🥖 Un tatakua humeando. Se te hace agua la boca y a la billetera también.'],
    karu: ['🍲 Las ollas hierven desde las cinco de la mañana. Nadie se queja.'],
    frutas: ['🍊 Una pirámide de naranjas. Si sacás la de abajo, se cae el mundo.'],
    carne: ['🥩 Los ganchos con carne se mecen. Un gato los mira con respeto y hambre.'],
    verdura: ['🥬 Mandioca, tomate, locote. Todo con tierra colorada, como debe ser.'],
    yuyos: ['🌿 Frascos de yuyos con etiquetas en guaraní. Tu abuela reconocería cada uno.'],
    ao: ['🧵 Ñandutí de mil puntos. Cuesta lo que vale el tiempo de quien lo hizo.'],
    cartel: ['🏛 «Mercado Municipal de Villarrica». Abierto desde antes que tus abuelos supieran caminar.'],
  };
  const AWN = 16;     // alto del toldo
  VR.crearMercado = function (o) {
    const W = 320, HH = 248; let rnd = 23; const rd = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647, seeded = () => VR.av2Random(rd);
    const venT = ST.map(() => seeded()), gente = [0, 1, 2, 3].map((i) => ({ look: seeded(), x: 70 + i * 60, y: 212 - (i % 2) * 12, tx: 0, ty: 0, w: 1 + i, anim: 0, mv: false, dir: 'down' }));
    const rect = (s) => s.row === 0 ? { y: 62, h: 34 } : { y: 108, h: 74 };      // zona que no se puede pisar (puesto + mostrador)
    const cy = (s) => s.row === 0 ? 76 : 158;                                       // y de los pies del vendedor (borde del mostrador)
    const objs = () => [
      { id: 'puerta', x: 136, y: 232, w: 48, h: 12, ax: 160, ay: 226, r: 26, h2: '🚪 ACCIÓN: salir', ghost: true },
      ...ST.map((s) => { const r = rect(s); return { id: s.id, x: s.x, y: r.y, w: s.w, h: r.h, ax: s.x + s.w / 2, ay: s.row === 0 ? 108 : 190, r: 32, h2: s.ico + ' ACCIÓN: ' + (s.b.length ? 'comprar en ' : 'ver ') + s.nombre.split(' · ')[0] }; }),
    ];
    function bg(g, s) {
      const lin = (x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); st.forEach((c, i) => q.addColorStop(i / (st.length - 1), c)); return q; };
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      const box = (x, y, w, h, st, r = 0) => { g.fillStyle = Array.isArray(st) ? lin(0, y, 0, y + h, st) : st; g.beginPath(); if (r) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); };
      const drop = (x, y, w, h, blur = 4, a = 0.4, ox = 2.5, oy = 3.5) => { g.save(); g.shadowColor = 'rgba(30,16,6,' + a + ')'; g.shadowBlur = blur * s; g.shadowOffsetX = (ox + 5000) * s; g.shadowOffsetY = oy * s; g.fillStyle = '#000'; g.fillRect(x - 5000, y, w, h); g.restore(); };
      const el = (x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
      R(0, 0, W, HH, '#2a2216');
      // pared del fondo (ladrillo claro) y techo de chapa con vigas
      box(8, 0, W - 16, 32, ['#d9c9a4', '#c0ac80']); for (let i = 0; i < 260; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.14)' : 'rgba(110,80,40,.09)'; g.fillRect(10 + H(i, 1, 4) * 300, 12 + H(i, 2, 4) * 20, 3 + H(i, 3, 4) * 4, 1.2); }
      box(8, 0, W - 16, 12, ['#8a929a', '#aeb6be']); for (let x = 10; x < W - 8; x += 6) { R(x, 0, 1, 12, 'rgba(255,255,255,.28)'); R(x + 3, 0, 1, 12, 'rgba(40,50,60,.25)'); } R(8, 11, W - 16, 1.4, '#5a626a');
      for (let x = 40; x < W - 8; x += 80) { box(x, 0, 5, 34, ['#7a5a38', '#5a3e22']); }
      box(0, 12, 8, HH - 12, ['#b9a47a', '#8a7650']); box(W - 8, 12, 8, HH - 12, ['#8a7650', '#b9a47a']);
      // piso de cemento alisado con juntas y manchas húmedas
      for (let y = 34; y < HH - 12; y += 16) for (let x = 8; x < W - 8; x += 16) { const k = (H(x, y, 5) * 3) | 0; g.fillStyle = ['#b9b2a2', '#c4bdac', '#aea796'][k]; g.fillRect(x, y, Math.min(16, W - 8 - x), Math.min(16, HH - 12 - y)); }
      g.fillStyle = 'rgba(70,60,40,.3)'; for (let y = 34; y <= HH - 12; y += 16) g.fillRect(8, y - 0.3, W - 16, 0.6); for (let x = 8; x <= W - 8; x += 16) g.fillRect(x - 0.3, 34, 0.6, HH - 46);
      for (let i = 0; i < 9; i++) { const px = 30 + H(i, 7, 6) * 260, py = 104 + H(i, 8, 6) * 110; g.fillStyle = 'rgba(60,80,100,.16)'; g.beginPath(); g.ellipse(px, py, 10 + H(i, 9, 6) * 10, 3 + H(i, 10, 6) * 3, 0, 0, 7); g.fill(); }
      g.fillStyle = lin(0, 34, 0, 50, ['rgba(40,24,6,.35)', 'rgba(40,24,6,0)']); g.fillRect(8, 34, W - 16, 16);
      // cartel del mercado
      drop(96, 3, 128, 18, 3, 0.4, 1.5, 2); box(96, 2, 128, 18, ['#f2e6c4', '#d6c48e'], 2); R(98, 4, 124, 0.8, '#fff'); g.textAlign = 'center'; g.font = '700 12px Caveat, cursive'; g.fillStyle = '#7a2a1a'; g.fillText('Mercado Municipal', 160, 13.4); g.font = '700 4px system-ui'; g.fillStyle = '#4a3a1a'; g.fillText('VILLARRICA · DESDE SIEMPRE', 160, 18); g.textAlign = 'left';
      // puestos
      for (const sd of ST) stall(g, sd, { R, box, drop, el, lin });
      // puerta grande (abajo) y vidrieras
      box(8, HH - 12, W - 16, 12, ['#c2ad82', '#6e5a3c']); R(8, HH - 12, W - 16, 0.8, '#fff');
      for (const [vx, vw] of [[14, 100], [206, 100]]) { box(vx, HH - 11, vw, 10, ['#cfe9f6', '#9ac4dc']); g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(vx + 10, HH - 1); g.lineTo(vx + 30, HH - 11); g.lineTo(vx + 38, HH - 11); g.lineTo(vx + 18, HH - 1); g.fill(); }
      drop(136, HH - 14, 48, 14, 3, 0.35, 0, -2); box(136, HH - 16, 48, 16, '#5a3c1c', 1); box(139, HH - 14, 19, 14, ['#d8eef8', '#9acce4']); box(162, HH - 14, 19, 14, ['#d8eef8', '#9acce4']); R(158, HH - 14, 4, 14, '#5a3c1c');
      // sacos de arpillera y cajones junto a las paredes
      for (const [px, py] of [[16, 198], [30, 206], [284, 200], [270, 210]]) { drop(px, py, 14, 12, 2, 0.35, 1, 1.5); box(px, py, 13, 11, ['#d6b87a', '#a8884a'], 3); R(px + 2, py + 2, 9, 0.8, 'rgba(255,255,255,.35)'); R(px + 4, py + 4, 1, 5, 'rgba(90,60,20,.4)'); R(px + 8, py + 4, 1, 5, 'rgba(90,60,20,.4)'); }
      for (const [lx, ly, lr] of [[48, 120, 70], [160, 110, 80], [270, 120, 70], [90, 190, 70], [230, 190, 70]]) { const l = g.createRadialGradient(lx, ly, 2, lx, ly, lr); l.addColorStop(0, 'rgba(255,240,200,.26)'); l.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = l; g.fillRect(lx - lr, ly - lr, lr * 2, lr * 2); }
      const vg = g.createRadialGradient(W / 2, HH / 2, 80, W / 2, HH / 2, 210); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(30,16,0,.45)'); g.fillStyle = vg; g.fillRect(0, 0, W, HH);
    }
    // dibuja un puesto entero: toldo a rayas, mostrador de madera y la mercadería según el rubro
    function stall(g, sd, T) {
      const { R, box, drop, el } = T, x = sd.x, w = sd.w, top = sd.row === 0 ? 76 : 158, ay = top - 54;     // ay = arriba del toldo
      drop(x, top + 2, w, 20, 4, 0.45, 2, 3);
      // fondo del puesto (lona/estante)
      box(x, ay + AWN, w, top - ay - AWN, ['#e8dcc0', '#cdbd98']);
      // mostrador: tapa clara y frente de madera con tablas
      box(x, top, w, 8, ['#d8b684', '#b8905c']); R(x, top, w, 0.8, '#f0d4a4'); box(x, top + 8, w, 12, ['#8a6034', '#5a3c1c']); g.strokeStyle = 'rgba(30,16,4,.35)'; g.lineWidth = 0.5; for (let i = 6; i < w; i += 10) { g.beginPath(); g.moveTo(x + i, top + 8); g.lineTo(x + i, top + 20); g.stroke(); }
      // mercadería sobre el mostrador
      const gx = x + 5, gy = top + 3, n = Math.floor((w - 10) / 9);
      if (sd.id === 'chipa') { box(x + 6, gy - 4, w - 12, 8, ['#f6f0e0', '#d8ccb0'], 3); for (let i = 0; i < n + 1; i++) { el(gx + 4 + i * 8, gy - 1 + (i % 2), 3.4, 2.4, ['#e8b84a', '#d89a30'][i % 2]); R(gx + 3 + i * 8, gy - 2, 2, 0.7, 'rgba(255,240,180,.7)'); } el(x + w - 10, gy - 6, 4, 4.5, '#c8ccd2'); R(x + w - 12, gy - 12, 4, 3, '#2a2a2e'); }
      else if (sd.id === 'karu') { for (let i = 0; i < 3; i++) { const px = x + 10 + i * 18; el(px, gy, 7, 4.5, '#6a6e76'); el(px, gy - 1, 6, 3.4, ['#a8381c', '#3a8a3a', '#d8b838'][i]); g.fillStyle = 'rgba(255,255,255,.5)'; for (let k = 0; k < 2; k++) { g.beginPath(); g.moveTo(px - 2 + k * 4, gy - 6); g.quadraticCurveTo(px - 4 + k * 4, gy - 10, px - 1 + k * 4, gy - 13); g.lineWidth = 0.9; g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke(); } } }
      else if (sd.id === 'frutas') { for (let i = 0; i < n; i++) { const c = ['#f08a24', '#f4c838', '#e8602a', '#8ac43a'][i % 4]; el(gx + 4 + i * 8.4, gy, 3.6, 3.4, c); R(gx + 2 + i * 8.4, gy - 2, 2, 0.7, 'rgba(255,255,255,.5)'); } box(x + w - 14, top - 12, 10, 12, ['#e8f4f8', '#a8c8d8'], 2); R(x + w - 12, top - 8, 6, 6, '#f08a24'); }
      else if (sd.id === 'carne') { for (let i = 0; i < 5; i++) { const hx = x + 6 + i * 11; R(hx, ay + AWN + 2, 0.8, 8, '#a8aeb6'); box(hx - 2.4, ay + AWN + 9, 5.6, 17, ['#c8342a', '#8a1c14'], 2); R(hx - 1.6, ay + AWN + 10, 1.4, 14, 'rgba(255,200,190,.4)'); } R(x, top - 6, w, 6, '#f0f0ec'); for (let i = 0; i < 4; i++) el(x + 8 + i * 14, top - 3, 5, 2.4, ['#8a4a2a', '#a8381c'][i % 2]); }
      else if (sd.id === 'verdura') { const cs = [['#c8a060', 'm'], ['#d8402e', 't'], ['#4a9a3a', 'l'], ['#f0d838', 'c'], ['#e8802e', 'z']]; for (let i = 0; i < 5; i++) { const cx = x + 5 + i * 16; box(cx, top - 7, 14, 10, ['#b08a50', '#7a5a2e'], 1.5); for (let k = 0; k < 4; k++) el(cx + 3 + k * 3, top - 8, 2.4, 2, cs[i][0]); } }
      else if (sd.id === 'yuyos') { for (let i = 0; i < 6; i++) { const cx = x + 6 + i * 13; box(cx, top - 8, 9, 10, ['rgba(220,240,230,.9)', 'rgba(150,190,170,.9)'], 2); for (let k = 0; k < 5; k++) { g.strokeStyle = ['#4a8a3a', '#6aa84a', '#3a7a3a'][k % 3]; g.lineWidth = 0.9; g.beginPath(); g.moveTo(cx + 2 + k * 1.2, top); g.lineTo(cx + 1 + k * 1.7, top - 9); g.stroke(); } } box(x + w - 12, top - 14, 4.6, 14, ['#c8a060', '#8a6030'], 1.4); }
      else if (sd.id === 'ao') { for (let i = 0; i < 4; i++) { const cx = x + 5 + i * 19; box(cx, ay + AWN + 2, 15, 30, ['#fff8f2', '#e8dccc'], 1); for (let k = 0; k < 5; k++) { R(cx + 2 + k * 2.6, ay + AWN + 5, 1.4, 1.4, ['#e84a8a', '#3a78c8'][k % 2]); R(cx + 2 + k * 2.6, ay + AWN + 25, 1.4, 1.4, ['#3a78c8', '#e84a8a'][k % 2]); } } for (let i = 0; i < 3; i++) { g.strokeStyle = '#fff'; g.lineWidth = 0.7; g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(x + 14 + i * 28, top - 5, 6, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(x + 14 + i * 28, top - 5, 3.4, 0, 7); g.stroke(); } }
      // toldo a rayas con volado y cartelito
      for (let i = 0, k = Math.ceil(w / 8); i < k; i++) { const cx = x + i * (w / k), cw = w / k; g.fillStyle = i % 2 ? sd.col[1] : sd.col[0]; g.fillRect(cx, ay, cw + 0.4, AWN - 3); g.beginPath(); g.moveTo(cx, ay + AWN - 3); g.lineTo(cx + cw + 0.4, ay + AWN - 3); g.arc(cx + cw / 2, ay + AWN - 3, cw / 2 + 0.2, 0, Math.PI); g.fill(); }
      R(x, ay, w, 1.2, 'rgba(255,255,255,.45)'); R(x, ay + AWN - 4, w, 0.7, 'rgba(0,0,0,.18)');
      R(x - 1.4, ay, 1.8, top - ay + 10, '#6a4a28'); R(x + w - 0.4, ay, 1.8, top - ay + 10, '#6a4a28');
      { const nm = sd.nombre.split(' · ')[0].split(' ').slice(0, 3).join(' ').toUpperCase(); box(x + 4, top + 10.5, w - 8, 8, ['#fff6da', '#e0cc94'], 1.6); R(x + 4, top + 10.5, w - 8, 0.6, '#fff');
        g.textAlign = 'center'; g.fillStyle = '#4a2a10'; g.font = '700 4.2px system-ui'; g.fillText(nm, x + w / 2, top + 16.4, w - 12); g.textAlign = 'left'; }
    }
    const menu = (sd) => {
      const op = sd.b.map(([n, p, h, cura]) => [n + ' · ' + VR.fmtGs(p), () => { if (o.come) o.come(p, h, n, cura); return menu(sd); }]); op.push(['Nada, aguyje', () => false]);
      return [{ quien: 'sis', titulo: sd.ico + ' ' + sd.nombre, txt: sd.quien + ': «' + pick(sd.hi) + '» Tenés ' + VR.fmtGs(VR.Wallet.get()) + '.', op }];
    };
    let pregon = 6;
    const S = new VR.Salon({
      W, H: HH, start: { x: 160, y: 222, dir: 'up' }, bounds: [20, 100, 300, 236], objs, bg, key: () => '',
      items: (me) => { const it = ST.map((sd, i) => ({ sy: cy(sd), f: (g) => me.figura(g, venT[i], sd.x + sd.w / 2, cy(sd) + 1, 'down', false, 0) })); for (const p of gente) it.push({ sy: p.y, f: (g) => me.figura(g, p.look, p.x, p.y, p.dir, p.mv, p.anim) }); return it; },
      tick: (dt, me) => {
        for (const p of gente) { p.w -= dt; if (p.w <= 0 && !p.mv) { p.w = 2 + Math.random() * 6; for (let k = 0; k < 10; k++) { const tx = 30 + Math.random() * 260, ty = 106 + Math.random() * 124; if (!me.blocked(tx, ty) && Math.hypot(tx - me.px, ty - me.py) > 18) { p.tx = tx; p.ty = ty; p.mv = true; break; } } }
          if (p.mv) { const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy); if (d < 2) { p.mv = false; p.dir = 'down'; } else { const nx = p.x + dx / d * 22 * dt, ny = p.y + dy / d * 22 * dt; if (!me.blocked(nx, ny)) { p.x = nx; p.y = ny; p.anim += dt * 7; p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); } else p.mv = false; } } }
        pregon -= dt; if (pregon <= 0 && !me.say) { pregon = 9 + Math.random() * 8; me.decir(pick(PREGON), 3.2); }
      },
      act: (ob, me) => { const k = ob.id;
        if (k === 'puerta') me.salir();
        else { const sd = ST.find((s) => s.id === k); if (sd && sd.b.length && o.menu) o.menu(menu(sd)); else if (FRASES[k]) me.decir(sd ? sd.quien + ': «' + pick(sd.hi) + '»' : pick(FRASES[k])); } },
    }, { player: o.player, busy: o.busy });
    return S;
  };
})();
