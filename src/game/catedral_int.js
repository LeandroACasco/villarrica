// Catedral de Villarrica por dentro (19/11/2026, pedido de Leandro con fotos del interior). Motor VR.Salon (como la despensa y el mercado):
// el juego queda en pausa y se camina por la nave. Nave de arcos altos con lámparas de araña de hierro, ventiladores verdes, alfombra roja
// hasta el altar, bancos de madera con gente sentada, retablo dorado con tres hornacinas azules, pila de agua bendita, velas, confesionario
// y la imagen de la Virgen. Todo dibujado por código (sin copiar las fotos). Se entra por el portón de la galería sur (main.js).
'use strict';
(function () {
  const H = VR.hash, pick = (a) => a[(Math.random() * a.length) | 0];
  const FRASES = {
    altar: ['⛪ El altar, con mantel blanco y velas. Acá se hace silencio sin que nadie lo pida.', '✝️ Un crucifijo sobre el altar. Te sacás la gorra por costumbre.', '🕯 El retablo dorado con sus tres nichos azules brilla como si lo hubieran lustrado ayer.'],
    pila: ['💧 Agua bendita. Te persignás: «En el nombre del Padre, del Hijo…» y se te va la mano al lado equivocado.', '💧 Una gotita fría en la frente. Vale más que el termo helado.'],
    velas: ['🕯 Prendés una velita y pedís algo. No decís qué, porque si no, no se cumple.', '🕯 Hay cientos de velas. Algunas llevan pedidos de aprobar el examen; otras, de ganar la rifa.'],
    confesionario: ['🚪 El confesionario, de madera oscura y cortinita. Mejor no entrar: tu lista es larga.', '🤫 Del otro lado se oye un murmullo. Alguien lleva rato confesándose.'],
    virgen: ['🙏 La Virgen de manto celeste, con flores frescas. Alguien le dejó un rosario.', '🌹 Flores blancas y una vela chica. Se nota que la quieren mucho.'],
    banco: ['🪑 Banco de madera pulida por años de rezos y de siestas disimuladas.', '🪑 Hay un cartelito: «Se ruega silencio». Un abuelo ronca bajito en la punta.'],
  };
  VR.crearCatedral = function (o) {
    const W = 288, HH = 256; let rnd = 19; const rd = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647, seeded = () => VR.av2Random(rd);
    const cura = Object.assign(seeded(), { gender: 'm', build: 'normal', hair: 'corto', hairColor: 5, beard: 'no', top: 'camisa', topColor: 1, bottom: 'vestir', bottomColor: 3, shoes: 'zapatos', shoesColor: 1, hat: 'ninguno' });
    // gente sentada en los bancos (fila y lugar al azar, de espaldas al fondo: miran al altar) y dos que caminan por la nave
    const PX = [[32, 120], [168, 258]], ROWS = 7, RY = (i) => 118 + i * 16, sentados = [];
    for (let i = 0; i < ROWS; i++) PX.forEach(([a, b], bl) => { for (let k = 0; k < 4; k++) if (rd() < (i < 5 ? 0.42 : 0.2)) sentados.push({ look: seeded(), x: a + 8 + ((k * 22 + rd() * 8) | 0), y: RY(i) + 7, bl }); });
    const gente = [{ look: seeded(), x: 144, y: 190, tx: 144, ty: 190, w: 1, anim: 0, mv: false, dir: 'up' }, { look: seeded(), x: 130, y: 140, tx: 130, ty: 140, w: 3, anim: 0, mv: false, dir: 'up' }];
    const objs = () => {
      const a = [
        { id: 'puerta', x: 122, y: 244, w: 44, h: 12, ax: 144, ay: 236, r: 24, h2: '🚪 ACCIÓN: salir', ghost: true },
        { id: 'altar', x: 124, y: 80, w: 40, h: 12, ax: 144, ay: 108, r: 34, h2: '⛪ ACCIÓN: mirar el altar' },
        { id: 'pila', x: 100, y: 224, w: 12, h: 10, ax: 106, ay: 240, r: 16, h2: '💧 ACCIÓN: agua bendita' },
        { id: 'velas', x: 28, y: 198, w: 20, h: 24, ax: 54, ay: 216, r: 24, h2: '🕯 ACCIÓN: prender una vela' },
        { id: 'confesionario', x: 5, y: 138, w: 22, h: 46, ax: 42, ay: 164, r: 24, h2: '🚪 ACCIÓN: mirar el confesionario' },
        { id: 'virgen', x: 258, y: 114, w: 22, h: 44, ax: 242, ay: 138, r: 26, h2: '🙏 ACCIÓN: mirar la imagen' },
      ];
      for (let i = 0; i < ROWS; i++) for (const [x0, x1] of PX) a.push({ id: 'banco', x: x0, y: RY(i), w: x1 - x0, h: 9, ax: x0 < 100 ? x1 + 6 : x0 - 6, ay: RY(i) + 14, r: 12, h2: '🪑 ACCIÓN: mirar el banco' });
      return a;
    };
    function bg(g, s) {
      const lin = (x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); st.forEach((c, i) => q.addColorStop(i / (st.length - 1), c)); return q; };
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      const box = (x, y, w, h, st, r = 0, hor = false) => { g.fillStyle = Array.isArray(st) ? (hor ? lin(x, 0, x + w, 0, st) : lin(0, y, 0, y + h, st)) : st; g.beginPath(); if (r) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); };
      const drop = (x, y, w, h, blur = 4, a = 0.4, ox = 2.5, oy = 3.5) => { g.save(); g.shadowColor = 'rgba(30,16,6,' + a + ')'; g.shadowBlur = blur * s; g.shadowOffsetX = (ox + 5000) * s; g.shadowOffsetY = oy * s; g.fillStyle = '#000'; g.beginPath(); g.rect(x - 5000, y, w, h); g.fill(); g.restore(); };
      const arco = (x, y, w, h, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fill(); };
      R(0, 0, W, HH, '#2a2016');
      // pared del fondo (presbiterio): crema con molduras y bóveda de cañón
      box(0, 0, W, 76, ['#f2e8cc', '#e4d4aa']); for (let i = 0; i < 160; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.22)' : 'rgba(140,110,50,.07)'; g.fillRect(H(i, 1, 5) * W, H(i, 2, 5) * 72, 1 + H(i, 3, 5) * 2, 1); }
      for (let i = 0; i < 6; i++) { R(0, 4 + i * 2, W, 0.6, 'rgba(255,255,255,' + (0.35 - i * 0.04) + ')'); }
      R(0, 66, W, 4, '#d6b66e'); R(0, 70, W, 1.2, '#a8884a'); R(0, 0, W, 2, '#fff8e0');
      for (const x of [12, 70, 200, 258]) { box(x, 8, 16, 58, ['#fbf3d8', '#e2d2a6'], 0, true); R(x - 2, 6, 20, 4, '#d6b66e'); R(x - 2, 62, 20, 5, '#c8a458'); R(x + 15, 8, 1, 58, 'rgba(100,70,20,.25)'); }   // pilastras
      // retablo dorado con tres hornacinas azules
      drop(96, 8, 96, 62, 5, 0.5, 2, 3); box(96, 6, 96, 64, ['#e6c46a', '#a8803a']); R(96, 6, 96, 1.6, '#fff0b0');
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,240,170,' + (0.12 + H(i, 4, 6) * 0.2) + ')'; g.fillRect(98 + H(i, 5, 6) * 92, 8 + H(i, 6, 6) * 60, 2, 1.4); }
      const nich = (x, y, w, h, tall) => {
        arco(x - 2, y - 2, w + 4, h + 2, '#7a5a22'); arco(x - 1, y - 1, w + 2, h + 1, '#f0d078');
        g.save(); g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.clip();
        g.fillStyle = lin(x, y, x, y + h, ['#7fb4f0', '#2a5fb8', '#183c88']); g.fillRect(x, y, w, h);
        const gl = g.createRadialGradient(x + w / 2, y + h * 0.4, 1, x + w / 2, y + h * 0.4, w * 0.8); gl.addColorStop(0, 'rgba(220,240,255,.6)'); gl.addColorStop(1, 'rgba(220,240,255,0)'); g.fillStyle = gl; g.fillRect(x, y, w, h);
        // imagen: manto y túnica blancas, cara y aureola
        const cx = x + w / 2, by = y + h;
        g.fillStyle = tall ? '#f4f0e6' : '#e8e4d8'; g.beginPath(); g.moveTo(cx - w * 0.26, by); g.lineTo(cx - w * 0.14, by - h * 0.5); g.lineTo(cx + w * 0.14, by - h * 0.5); g.lineTo(cx + w * 0.26, by); g.closePath(); g.fill();
        g.fillStyle = tall ? '#c8322a' : '#2e6fc8'; g.fillRect(cx - w * 0.2, by - h * 0.48, w * 0.4, h * 0.14);
        g.fillStyle = '#e6c49a'; g.beginPath(); g.arc(cx, by - h * 0.58, w * 0.1, 0, 7); g.fill(); g.strokeStyle = '#f6d86a'; g.lineWidth = 0.8; g.beginPath(); g.arc(cx, by - h * 0.58, w * 0.17, 0, 7); g.stroke();
        g.restore();
      };
      nich(106, 16, 22, 40); nich(160, 16, 22, 40); nich(129, 10, 30, 50, true);
      R(96, 60, 96, 6, '#c8a458'); R(96, 60, 96, 1, '#fff0b0'); for (let x = 100; x < 190; x += 7) R(x, 62, 3, 3, '#f0d078');
      box(138, 0, 12, 7, ['#f0d078', '#b88a38'], 1); R(143, 0, 2, 12, '#fff0b0'); R(140, 4, 8, 2, '#fff0b0');                                                    // cruz sobre el retablo
      // suelo: damero de cerámica beige y ocre
      for (let y = 76, j = 0; y < HH; y += 16, j++) for (let x = 0, i = 0; x < W; x += 16, i++) { g.fillStyle = lin(x, y, x + 16, y + 16, (i + j) % 2 ? ['#efe0bc', '#e2cf9c'] : ['#d8be88', '#c8aa72']); g.fillRect(x, y, 16, 16); }
      g.fillStyle = 'rgba(100,70,30,.28)'; for (let y = 76; y <= HH; y += 16) g.fillRect(0, y - 0.3, W, 0.6); for (let x = 0; x <= W; x += 16) g.fillRect(x - 0.3, 76, 0.6, HH - 76);
      // presbiterio: tarima con escalones, altar con mantel, velas, crucifijo, ambón y sedes
      box(70, 70, 148, 34, ['#8a5a30', '#5a3a1c']); box(70, 70, 148, 3, '#b8844c'); box(78, 76, 132, 24, ['#a8743c', '#7a4e28']); box(86, 82, 116, 16, ['#c08a50', '#98602e']);
      for (const yy of [84, 94, 104]) { R(70, yy, 148, 0.8, 'rgba(255,230,180,.35)'); R(70, yy + 1, 148, 1, 'rgba(0,0,0,.25)'); }
      drop(124, 80, 40, 14, 3, 0.5, 2, 3); box(124, 80, 40, 12, ['#fdfcf8', '#e4dfd2'], 1); box(124, 80, 40, 3, ['#ffffff', '#f2eee2']); R(124, 91, 40, 1, '#c8a84a'); R(138, 80, 12, 12, 'rgba(210,60,50,.55)');
      for (const x of [128, 156]) { box(x, 70, 3, 11, ['#fff6d8', '#e0c890'], 0.6); R(x + 1, 67, 1, 4, '#f6c84a'); const f = g.createRadialGradient(x + 1.5, 67, 0.5, x + 1.5, 67, 7); f.addColorStop(0, 'rgba(255,220,120,.7)'); f.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = f; g.fillRect(x - 6, 60, 15, 14); }
      R(143, 70, 2, 10, '#c8a84a'); R(140, 73, 8, 2, '#c8a84a');
      drop(78, 92, 14, 12, 2, 0.4, 1.5, 2); box(78, 90, 14, 12, ['#c8a060', '#88602a'], 1); box(80, 86, 10, 6, ['#d8b878', '#a8803c'], 1);                                    // ambón
      for (const x of [98, 180]) { drop(x, 88, 12, 12, 2, 0.35, 1.5, 2); box(x, 86, 12, 12, ['#a02828', '#601414'], 2); box(x + 1, 82, 10, 6, ['#c04040', '#801c1c'], 2); }  // sedes con tapizado rojo
      // paredes laterales: arcos altos con luz, columnas y base
      for (const side of [0, 1]) {
        const x0 = side ? W - 24 : 0;
        box(x0, 76, 24, HH - 76, side ? ['#d8c898', '#f2e8cc'] : ['#f2e8cc', '#d8c898'], 0, true);
        for (let y = 90, k = 0; y < HH - 20; y += 42, k++) {
          const ax = x0 + 4, aw = 16, ah = 32;
          arco(ax - 1.4, y - 1.4, aw + 2.8, ah + 1.4, '#d6b66e'); arco(ax, y, aw, ah, '#f6f2e0');
          const gl = lin(ax, y, ax + aw, y, ['#eaf4fb', '#bfdcee', '#eaf4fb']); g.fillStyle = gl; g.beginPath(); g.moveTo(ax + 2, y + ah); g.lineTo(ax + 2, y + aw / 2); g.arc(ax + aw / 2, y + aw / 2, aw / 2 - 2, Math.PI, 0); g.lineTo(ax + aw - 2, y + ah); g.closePath(); g.fill();
          R(ax + aw / 2 - 0.3, y + 6, 0.6, ah - 6, 'rgba(120,150,170,.5)'); R(ax + 2, y + 18, aw - 4, 0.6, 'rgba(120,150,170,.5)');
          R(x0 + (side ? 0 : 20), y - 4, 4, 46, '#f6ecce'); R(x0 + (side ? 0 : 20), y - 4, 4, 2, '#d6b66e');                                                              // columna
          const lg = g.createRadialGradient(side ? x0 - 6 : x0 + 30, y + 18, 2, side ? x0 - 6 : x0 + 30, y + 18, 44); lg.addColorStop(0, 'rgba(235,245,255,.2)'); lg.addColorStop(1, 'rgba(235,245,255,0)'); g.fillStyle = lg; g.fillRect(side ? x0 - 50 : x0, y - 20, 74, 80);   // luz de la ventana sobre el piso
        }
        R(side ? x0 : x0 + 22, 76, 2, HH - 76, 'rgba(90,60,20,.3)'); box(x0, HH - 22, 24, 22, ['#c8aa72', '#8e7440']);
      }
      // alfombra roja hasta el altar
      drop(128, 100, 32, HH - 100, 3, 0.3, 0, 1.5); box(128, 100, 32, HH - 100, ['#b8201c', '#8a1410'], 0, true); R(128, 100, 2, HH - 100, '#d8a838'); R(158, 100, 2, HH - 100, '#d8a838'); R(131, 100, 0.8, HH - 100, '#e8c868'); R(156, 100, 0.8, HH - 100, '#e8c868');
      for (let y = 106; y < HH - 8; y += 10) { g.fillStyle = 'rgba(255,200,120,.22)'; g.fillRect(138, y, 12, 1.2); }
      // bancos de madera: respaldo oscuro, asiento claro y reclinatorio
      for (let i = 0; i < ROWS; i++) for (const [x0, x1] of PX) { const y = RY(i), w = x1 - x0; drop(x0, y, w, 9, 2, 0.45, 1, 2); box(x0, y, w, 4, ['#6a4020', '#4a2a12']); R(x0, y, w, 0.8, '#a8743c'); box(x0, y + 4, w, 5, ['#b88450', '#8a5c30']); R(x0, y + 4, w, 0.7, '#dca878'); R(x0 - 1, y, 2, 9, '#3e2410'); R(x1 - 1, y, 2, 9, '#3e2410'); R(x0, y + 11, w, 1.4, 'rgba(60,30,10,.5)'); }
      // pila de agua bendita (junto a la puerta), velas, confesionario, imagen de la Virgen
      drop(100, 224, 12, 12, 2, 0.4, 1, 2); box(102, 230, 8, 8, ['#e8e2d2', '#a8a090']); g.fillStyle = '#f0ece0'; g.beginPath(); g.ellipse(106, 228, 7, 3.4, 0, 0, 7); g.fill(); g.fillStyle = '#7fb4e0'; g.beginPath(); g.ellipse(106, 228, 5, 2, 0, 0, 7); g.fill();
      drop(28, 198, 20, 24, 3, 0.4, 1.5, 2); box(28, 206, 20, 14, ['#6a4020', '#3e2410']); for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) { const x = 30 + k * 3, y = 200 + r * 4; R(x, y, 1.6, 4, '#fff6d8'); R(x + 0.5, y - 1.6, 0.8, 1.6, '#f6c84a'); }
      { const f = g.createRadialGradient(38, 204, 1, 38, 204, 26); f.addColorStop(0, 'rgba(255,200,100,.35)'); f.addColorStop(1, 'rgba(255,200,100,0)'); g.fillStyle = f; g.fillRect(8, 180, 60, 50); }
      drop(5, 138, 22, 46, 3, 0.45, 1.5, 2); box(5, 138, 22, 46, ['#6a4020', '#3a2010']); box(8, 144, 16, 32, ['#4a2a14', '#2a160a']); box(8, 144, 7, 32, ['#7a1c1c', '#4a0e0e']); R(5, 138, 22, 2, '#a8743c'); R(14, 141, 4, 8, '#c8a84a'); R(15.4, 139, 1.2, 12, '#c8a84a');
      drop(258, 114, 22, 44, 3, 0.4, 1.5, 2); box(258, 140, 22, 18, ['#e8e2d2', '#a8a090']); box(262, 114, 14, 28, ['#f4f6fa', '#8fb4e0'], 3); g.fillStyle = '#e6c49a'; g.beginPath(); g.arc(269, 118, 3.4, 0, 7); g.fill(); g.strokeStyle = '#f6d86a'; g.lineWidth = 0.7; g.beginPath(); g.arc(269, 118, 5.4, 0, 7); g.stroke(); R(262, 126, 14, 12, '#4a82d0'); R(266, 128, 6, 8, 'rgba(255,255,255,.3)');
      for (let k = 0; k < 5; k++) { g.fillStyle = ['#ffffff', '#f6e8f0', '#fff6c8'][k % 3]; g.beginPath(); g.arc(262 + k * 3.6, 144, 1.8, 0, 7); g.fill(); }
      // puerta grande (pared de abajo)
      box(0, HH - 14, W, 14, ['#d8c8a0', '#7e6a44']); drop(122, 238, 44, 18, 3, 0.4, 0, -2); arco(122, 232, 44, 24, '#4a2a14'); arco(124, 234, 40, 22, '#7a5232'); R(143, 240, 2, 16, '#3e2410'); R(124, 246, 40, 0.8, 'rgba(0,0,0,.3)'); g.fillStyle = '#d8b84a'; g.fillRect(138, 248, 2, 2); g.fillRect(148, 248, 2, 2);
      { const f = g.createRadialGradient(144, HH, 4, 144, HH, 60); f.addColorStop(0, 'rgba(255,250,220,.4)'); f.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = f; g.fillRect(70, HH - 70, 150, 70); }
      // brillo de las lámparas y viñeta tenue
      for (const ly of [118, 170, 222]) { const l = g.createRadialGradient(144, ly, 2, 144, ly, 64); l.addColorStop(0, 'rgba(255,230,170,.3)'); l.addColorStop(1, 'rgba(255,230,170,0)'); g.fillStyle = l; g.fillRect(70, ly - 64, 150, 128); }
      const vg = g.createRadialGradient(W / 2, HH / 2, 90, W / 2, HH / 2, 200); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(30,16,0,.4)'); g.fillStyle = vg; g.fillRect(0, 0, W, HH);
    }
    const sentado = (me, g, p) => { const sp = me.sprite(p.look), img = sp.get('up', 'sit', 0) || sp.get('up', 'idle', 0); if (!img) return; const sc = 1.62; g.drawImage(img, p.x - 8 * sc, p.y - 31 * sc + 5, 16 * sc, 32 * sc); };
    const S = new VR.Salon({
      W, H: HH, start: { x: 144, y: 228, dir: 'up' }, bounds: [26, 100, 262, 238], objs, bg, key: () => '',
      items: (me) => { const it = [{ sy: 92, f: (g) => me.figura(g, cura, 144, 96, 'down', false, 0) }];
        for (const p of sentados) it.push({ sy: p.y + 1, f: (g) => sentado(me, g, p) });
        for (const p of gente) it.push({ sy: p.y, f: (g) => me.figura(g, p.look, p.x, p.y, p.dir, p.mv, p.anim) });
        return it; },
      over: (g, me) => { // lámparas de araña de hierro y ventiladores verdes (se ven desde abajo, por eso van encima de la gente)
        for (const ly of [118, 170, 222]) { g.strokeStyle = 'rgba(30,24,20,.6)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(144, ly - 30); g.lineTo(144, ly - 9); g.stroke();
          g.strokeStyle = '#2a2420'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(144, ly, 16, 6, 0, 0, 7); g.stroke(); g.lineWidth = 0.8; g.beginPath(); g.ellipse(144, ly, 10, 3.6, 0, 0, 7); g.stroke();
          for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + 0.3, bx = 144 + Math.cos(a) * 16, by = ly + Math.sin(a) * 6; g.fillStyle = '#2a2420'; g.fillRect(bx - 0.6, by - 3, 1.2, 3); g.fillStyle = '#fff6d0'; g.beginPath(); g.ellipse(bx, by - 4, 1.2, 1.7, 0, 0, 7); g.fill(); const f = g.createRadialGradient(bx, by - 4, 0.5, bx, by - 4, 5); f.addColorStop(0, 'rgba(255,230,150,.6)'); f.addColorStop(1, 'rgba(255,230,150,0)'); g.fillStyle = f; g.fillRect(bx - 5, by - 9, 10, 10); } }
        for (const [fx, fy] of [[76, 140], [212, 140], [76, 200], [212, 200]]) { g.strokeStyle = 'rgba(30,24,20,.5)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(fx, fy - 28); g.lineTo(fx, fy - 5); g.stroke();
          const a0 = me.t * 5 + fx; g.fillStyle = 'rgba(40,120,70,.75)'; for (let k = 0; k < 3; k++) { const a = a0 + k * 2.094; g.beginPath(); g.ellipse(fx + Math.cos(a) * 8, fy + Math.sin(a) * 3.2, 8, 1.8, a * 0.25, 0, 7); g.fill(); } g.fillStyle = '#1e5a38'; g.beginPath(); g.ellipse(fx, fy, 2.4, 1.6, 0, 0, 7); g.fill(); }
      },
      tick: (dt, me) => { for (const p of gente) { p.w -= dt; if (p.w <= 0 && !p.mv) { p.w = 3 + Math.random() * 6; for (let k = 0; k < 8; k++) { const tx = 132 + Math.random() * 24, ty = 112 + Math.random() * 120; if (!me.blocked(tx, ty)) { p.tx = tx; p.ty = ty; p.mv = true; break; } } }
        if (p.mv) { const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy); if (d < 2) { p.mv = false; p.dir = 'up'; } else { const nx = p.x + dx / d * 16 * dt, ny = p.y + dy / d * 16 * dt; if (!me.blocked(nx, ny)) { p.x = nx; p.y = ny; p.anim += dt * 7; p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); } else p.mv = false; } } } },
      act: (ob, me) => { const k = ob.id; if (k === 'puerta') me.salir(); else if (FRASES[k]) me.decir(pick(FRASES[k])); },
    }, { player: o.player, busy: o.busy });
    return S;
  };
})();
