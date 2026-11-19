// Catedral de Villarrica por dentro (19/11/2026, pedido de Leandro con fotos del interior; ampliada el mismo día). Motor VR.Salon con cámara
// que sigue al jugador (cfg.view): sala de 480×640 con presbiterio y retablo dorado de tres hornacinas azules, crucero con altares laterales,
// nave central con alfombra roja y 14 filas de bancos, naves laterales con columnas, ventanales, confesionarios, Virgen, Sagrado Corazón,
// San Roque, bautisterio, alcancía, velas y el atrio de entrada. Lámparas de araña y ventiladores verdes. Todo dibujado por código.
// Se entra por el portón oeste (la fachada con la torre mira al oeste) o por la galería sur (main.js); acá «abajo» es el oeste y «arriba», el altar.
'use strict';
(function () {
  const H = VR.hash, pick = (a) => a[(Math.random() * a.length) | 0];
  const FRASES = {
    altar: ['⛪ El altar, con mantel blanco y velas. Acá se hace silencio sin que nadie lo pida.', '✝️ Un crucifijo sobre el altar. Te sacás la gorra por costumbre.', '🕯 El retablo dorado con sus tres nichos azules brilla como si lo hubieran lustrado ayer.'],
    ambon: ['📖 El ambón, con la Biblia abierta. Se lee fuerte, como cuando la abuela llama a cenar.'],
    pila: ['💧 Agua bendita. Te persignás: «En el nombre del Padre, del Hijo…» y se te va la mano al lado equivocado.', '💧 Una gotita fría en la frente. Vale más que el termo helado.'],
    velas: ['🕯 Prendés una velita y pedís algo. No decís qué, porque si no, no se cumple.', '🕯 Hay cientos de velas. Algunas llevan pedidos de aprobar el examen; otras, de ganar la rifa.'],
    confesionario: ['🚪 El confesionario, de madera oscura y cortinita. Mejor no entrar: tu lista es larga.', '🤫 Del otro lado se oye un murmullo. Alguien lleva rato confesándose.'],
    virgen: ['🙏 La Virgen de manto celeste, con flores frescas. Alguien le dejó un rosario.', '🌹 Flores blancas y una vela chica. Se nota que la quieren mucho.'],
    sagrado: ['❤️ El Sagrado Corazón de Jesús, con las manos abiertas. Tiene un ventilador de pie al lado, por las dudas del calor.'],
    roque: ['🐕 San Roque con su perrito. En Villarrica hasta los santos tienen mascota.'],
    bautisterio: ['💦 La pila bautismal, de piedra clara. Acá se bautiza a medio pueblo.'],
    alcancia: ['🪙 Una alcancía de limosnas. Le dejás unos guaraníes sueltos y escuchás el tintineo.'],
    avisos: ['📋 Avisos: horario de misas, rifa de la parroquia y «se busca la llave del salón». Nadie la encuentra desde 1998.'],
    sacristia: ['🔒 La puerta de la sacristía. Solo personal autorizado… y el sacristán, que tiene la llave desde antes de que nacieras.'],
    banco: ['🪑 Banco de madera pulida por años de rezos y de siestas disimuladas.', '🪑 Hay un cartelito: «Se ruega silencio». Un abuelo ronca bajito en la punta.'],
    cura: ['👨‍🦳 El padre sonríe: «Buen día, hijo. ¿Viniste a rezar o a escaparte del calor?»', '👨‍🦳 «La misa es a las siete. Y no, no se puede entrar con el termo de tereré.»'],
    sacristan: ['🔔 El sacristán ajusta una vela: «Si tocás la campana sin permiso, la oye todo el barrio».', '🔔 «Hace cuarenta años que acomodo estas sillas. Ninguna está en su lugar».'],
  };
  VR.crearCatedral = function (o) {
    const W = 480, HH = 640; let rnd = 19; const rd = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647, seeded = () => VR.av2Random(rd);
    const cura = Object.assign(seeded(), { gender: 'm', build: 'normal', hair: 'corto', hairColor: 5, beard: 'no', top: 'camisa', topColor: 1, bottom: 'vestir', bottomColor: 3, shoes: 'zapatos', shoesColor: 1, hat: 'ninguno' });
    const sacri = seeded();
    // bancos: 14 filas a cada lado de la alfombra; gente sentada al azar, mirando al altar
    const PX = [[104, 210], [270, 376]], ROWS = 14, RY = (i) => 292 + i * 16, sentados = [];
    for (let i = 0; i < ROWS; i++) PX.forEach(([a, b], bl) => { for (let k = 0; k < 4; k++) if (rd() < (i < 9 ? 0.4 : 0.15)) sentados.push({ look: seeded(), x: a + 9 + ((k * 24 + rd() * 8) | 0), y: RY(i) + 7 }); });
    const gente = []; for (let k = 0; k < 6; k++) { const x = [60, 240, 420, 62, 238, 418][k], y = 220 + k * 62; gente.push({ look: seeded(), x, y, tx: x, ty: y, w: 1 + k, anim: 0, mv: false, dir: 'up', zona: k % 3 }); }
    const COLS = []; for (const x of [92, 388]) for (let y = 300; y <= 560; y += 52) COLS.push([x, y]);
    const objs = () => {
      const a = [
        { id: 'puerta', x: 208, y: 618, w: 64, h: 14, ax: 240, ay: 608, r: 26, h2: '🚪 ACCIÓN: salir', ghost: true },
        { id: 'altar', x: 206, y: 118, w: 68, h: 16, ax: 240, ay: 150, r: 38, h2: '⛪ ACCIÓN: mirar el altar' },
        { id: 'ambon', x: 150, y: 112, w: 20, h: 18, ax: 160, ay: 144, r: 24, h2: '📖 ACCIÓN: leer el ambón' },
        { id: 'cura', x: 226, y: 100, w: 28, h: 14, ax: 240, ay: 142, r: 28, h2: '👨‍🦳 ACCIÓN: hablar con el padre', ghost: true },
        { id: 'sacristia', x: 28, y: 96, w: 30, h: 30, ax: 44, ay: 140, r: 26, h2: '🔒 ACCIÓN: mirar la puerta' },
        { id: 'sacristan', x: 70, y: 150, w: 14, h: 8, ax: 78, ay: 168, r: 22, h2: '🔔 ACCIÓN: hablar con el sacristán', ghost: true },
        { id: 'sagrado', x: 14, y: 208, w: 52, h: 48, ax: 52, ay: 270, r: 30, h2: '❤️ ACCIÓN: mirar la imagen' },
        { id: 'roque', x: 414, y: 208, w: 52, h: 48, ax: 428, ay: 270, r: 30, h2: '🐕 ACCIÓN: mirar la imagen' },
        { id: 'velas', x: 28, y: 292, w: 26, h: 26, ax: 66, ay: 312, r: 26, h2: '🕯 ACCIÓN: prender una vela' },
        { id: 'velas', x: 426, y: 292, w: 26, h: 26, ax: 414, ay: 312, r: 26, h2: '🕯 ACCIÓN: prender una vela' },
        { id: 'confesionario', x: 4, y: 336, w: 22, h: 46, ax: 42, ay: 360, r: 24, h2: '🚪 ACCIÓN: mirar el confesionario' },
        { id: 'confesionario', x: 4, y: 396, w: 22, h: 46, ax: 42, ay: 420, r: 24, h2: '🚪 ACCIÓN: mirar el confesionario' },
        { id: 'virgen', x: 454, y: 336, w: 22, h: 46, ax: 438, ay: 360, r: 26, h2: '🙏 ACCIÓN: mirar la imagen' },
        { id: 'bautisterio', x: 24, y: 500, w: 40, h: 30, ax: 70, ay: 522, r: 28, h2: '💦 ACCIÓN: mirar la pila' },
        { id: 'avisos', x: 6, y: 560, w: 18, h: 36, ax: 40, ay: 580, r: 24, h2: '📋 ACCIÓN: leer los avisos' },
        { id: 'alcancia', x: 440, y: 560, w: 20, h: 22, ax: 428, ay: 580, r: 22, h2: '🪙 ACCIÓN: dejar una limosna' },
        { id: 'pila', x: 180, y: 590, w: 12, h: 10, ax: 186, ay: 606, r: 16, h2: '💧 ACCIÓN: agua bendita' },
        { id: 'pila', x: 288, y: 590, w: 12, h: 10, ax: 294, ay: 606, r: 16, h2: '💧 ACCIÓN: agua bendita' },
      ];
      for (const [x, y] of COLS) a.push({ id: 'columna', x: x - 5, y: y - 4, w: 10, h: 8, ax: x, ay: y + 12, r: 0, h2: '', noact: true });
      for (let i = 0; i < ROWS; i++) for (const [x0, x1] of PX) a.push({ id: 'banco', x: x0, y: RY(i), w: x1 - x0, h: 9, ax: x0 < 200 ? x1 + 8 : x0 - 8, ay: RY(i) + 14, r: 12, h2: '🪑 ACCIÓN: mirar el banco' });
      return a;
    };
    function bg(g, s) {
      const lin = (x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); st.forEach((c, i) => q.addColorStop(i / (st.length - 1), c)); return q; };
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      const box = (x, y, w, h, st, r = 0, hor = false) => { g.fillStyle = Array.isArray(st) ? (hor ? lin(x, 0, x + w, 0, st) : lin(0, y, 0, y + h, st)) : st; g.beginPath(); if (r) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); };
      const drop = (x, y, w, h, blur = 4, a = 0.4, ox = 2.5, oy = 3.5) => { g.save(); g.shadowColor = 'rgba(30,16,6,' + a + ')'; g.shadowBlur = blur * s; g.shadowOffsetX = (ox + 5000) * s; g.shadowOffsetY = oy * s; g.fillStyle = '#000'; g.beginPath(); g.rect(x - 5000, y, w, h); g.fill(); g.restore(); };
      const arco = (x, y, w, h, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fill(); };
      const glow = (x, y, r, c0) => { const q = g.createRadialGradient(x, y, 1, x, y, r); q.addColorStop(0, c0); q.addColorStop(1, c0.replace(/[\d.]+\)$/, '0)')); g.fillStyle = q; g.fillRect(x - r, y - r, 2 * r, 2 * r); };
      R(0, 0, W, HH, '#2a2016');
      // pared del fondo (presbiterio): crema con bóveda de cañón y pilastras
      box(0, 0, W, 96, ['#f2e8cc', '#e4d4aa']); for (let i = 0; i < 320; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.22)' : 'rgba(140,110,50,.07)'; g.fillRect(H(i, 1, 5) * W, H(i, 2, 5) * 92, 1 + H(i, 3, 5) * 2, 1); }
      for (let i = 0; i < 7; i++) R(0, 4 + i * 2.4, W, 0.6, 'rgba(255,255,255,' + (0.35 - i * 0.04) + ')');
      R(0, 84, W, 5, '#d6b66e'); R(0, 89, W, 1.4, '#a8884a'); R(0, 0, W, 2, '#fff8e0');
      for (const x of [20, 78, 146, 322, 390, 446]) { box(x, 10, 18, 76, ['#fbf3d8', '#e2d2a6'], 0, true); R(x - 2, 8, 22, 4, '#d6b66e'); R(x - 2, 80, 22, 5, '#c8a458'); R(x + 17, 10, 1, 76, 'rgba(100,70,20,.25)'); }
      // retablo dorado con tres hornacinas azules
      drop(176, 8, 128, 78, 6, 0.5, 2, 3); box(176, 6, 128, 80, ['#e6c46a', '#a8803a']); R(176, 6, 128, 1.6, '#fff0b0');
      for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(255,240,170,' + (0.12 + H(i, 4, 6) * 0.2) + ')'; g.fillRect(178 + H(i, 5, 6) * 124, 8 + H(i, 6, 6) * 76, 2, 1.4); }
      const nich = (x, y, w, h, tall) => {
        arco(x - 2, y - 2, w + 4, h + 2, '#7a5a22'); arco(x - 1, y - 1, w + 2, h + 1, '#f0d078');
        g.save(); g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.clip();
        g.fillStyle = lin(x, y, x, y + h, ['#7fb4f0', '#2a5fb8', '#183c88']); g.fillRect(x, y, w, h); glow(x + w / 2, y + h * 0.4, w * 0.8, 'rgba(220,240,255,.6)');
        const cx = x + w / 2, by = y + h;
        g.fillStyle = tall ? '#f4f0e6' : '#e8e4d8'; g.beginPath(); g.moveTo(cx - w * 0.26, by); g.lineTo(cx - w * 0.14, by - h * 0.5); g.lineTo(cx + w * 0.14, by - h * 0.5); g.lineTo(cx + w * 0.26, by); g.closePath(); g.fill();
        g.fillStyle = tall ? '#c8322a' : '#2e6fc8'; g.fillRect(cx - w * 0.2, by - h * 0.48, w * 0.4, h * 0.14);
        g.fillStyle = '#e6c49a'; g.beginPath(); g.arc(cx, by - h * 0.58, w * 0.1, 0, 7); g.fill(); g.strokeStyle = '#f6d86a'; g.lineWidth = 0.9; g.beginPath(); g.arc(cx, by - h * 0.58, w * 0.17, 0, 7); g.stroke();
        g.restore();
      };
      nich(186, 18, 30, 54); nich(264, 18, 30, 54); nich(220, 10, 40, 64, true);
      R(176, 74, 128, 7, '#c8a458'); R(176, 74, 128, 1, '#fff0b0'); for (let x = 180; x < 300; x += 8) R(x, 76, 3, 3, '#f0d078');
      box(234, 0, 12, 8, ['#f0d078', '#b88a38'], 1); R(239, 0, 2, 14, '#fff0b0'); R(236, 4, 8, 2, '#fff0b0');
      // suelo: damero de cerámica beige y ocre
      for (let y = 96, j = 0; y < HH; y += 16, j++) for (let x = 0, i = 0; x < W; x += 16, i++) { g.fillStyle = lin(x, y, x + 16, y + 16, (i + j) % 2 ? ['#efe0bc', '#e2cf9c'] : ['#d8be88', '#c8aa72']); g.fillRect(x, y, 16, 16); }
      g.fillStyle = 'rgba(100,70,30,.28)'; for (let y = 96; y <= HH; y += 16) g.fillRect(0, y - 0.3, W, 0.6); for (let x = 0; x <= W; x += 16) g.fillRect(x - 0.3, 96, 0.6, HH - 96);
      // presbiterio: tarima con escalones, altar con mantel, velas, crucifijo, ambón y sedes
      box(110, 90, 260, 66, ['#8a5a30', '#5a3a1c']); box(110, 90, 260, 3, '#b8844c'); box(120, 98, 240, 50, ['#a8743c', '#7a4e28']); box(130, 106, 220, 38, ['#c08a50', '#98602e']);
      for (const yy of [102, 124, 148]) { R(110, yy, 260, 0.8, 'rgba(255,230,180,.35)'); R(110, yy + 1, 260, 1, 'rgba(0,0,0,.25)'); }
      drop(206, 116, 68, 20, 4, 0.5, 2, 3); box(206, 116, 68, 16, ['#fdfcf8', '#e4dfd2'], 1); box(206, 116, 68, 4, ['#ffffff', '#f2eee2']); R(206, 131, 68, 1.4, '#c8a84a'); R(232, 116, 16, 16, 'rgba(210,60,50,.55)');
      for (const x of [214, 260]) { box(x, 98, 4, 18, ['#fff6d8', '#e0c890'], 0.6); R(x + 1.4, 94, 1.2, 5, '#f6c84a'); glow(x + 2, 93, 10, 'rgba(255,220,120,.7)'); }
      R(238, 100, 3, 14, '#c8a84a'); R(233, 104, 13, 3, '#c8a84a');
      drop(150, 112, 20, 18, 3, 0.4, 1.5, 2); box(150, 114, 20, 16, ['#c8a060', '#88602a'], 1); box(152, 108, 16, 8, ['#d8b878', '#a8803c'], 1); R(154, 106, 12, 3, '#f1ead8');   // ambón con la Biblia
      for (const x of [186, 282]) { drop(x, 112, 14, 14, 2, 0.35, 1.5, 2); box(x, 110, 14, 14, ['#a02828', '#601414'], 2); box(x + 1, 105, 12, 7, ['#c04040', '#801c1c'], 2); }   // sedes rojas
      // sacristía (puerta de madera a la izquierda del presbiterio)
      drop(28, 96, 30, 30, 3, 0.4, 1.5, 2); box(28, 96, 30, 30, ['#6a4020', '#3e2410']); arco(32, 98, 22, 28, '#4a2a14'); arco(34, 100, 18, 26, '#7a5232'); R(42.6, 108, 1.4, 18, '#3e2410'); R(38, 114, 1.5, 1.5, '#d8b84a'); R(47, 114, 1.5, 1.5, '#d8b84a');
      // crucero: paredes laterales con altares (Sagrado Corazón a la izquierda, San Roque a la derecha)
      for (const side of [0, 1]) {
        const x0 = side ? W - 14 : 0; box(x0, 190, 14, 100, side ? ['#d8c898', '#f2e8cc'] : ['#f2e8cc', '#d8c898'], 0, true);
        const ax = side ? 414 : 14; drop(ax, 208, 52, 48, 4, 0.45, 2, 3);
        box(ax, 208, 52, 48, ['#e8e2d2', '#a8a090']); box(ax + 4, 212, 44, 14, ['#f6f0e0', '#d8d0bc']);
        arco(ax + 10, 160, 32, 56, '#7a5a22'); arco(ax + 11.5, 161.5, 29, 54, '#2a5fb8'); glow(ax + 26, 190, 22, 'rgba(220,240,255,.55)');
        // imagen
        const cx = ax + 26; g.fillStyle = side ? '#f1ead8' : '#f4f0e6'; g.beginPath(); g.moveTo(cx - 8, 214); g.lineTo(cx - 5, 184); g.lineTo(cx + 5, 184); g.lineTo(cx + 8, 214); g.closePath(); g.fill();
        g.fillStyle = side ? '#7a4e28' : '#c8322a'; g.fillRect(cx - 6, 184, 12, 14); g.fillStyle = '#e6c49a'; g.beginPath(); g.arc(cx, 178, 5, 0, 7); g.fill(); g.strokeStyle = '#f6d86a'; g.lineWidth = 0.9; g.beginPath(); g.arc(cx, 178, 8, 0, 7); g.stroke();
        if (!side) { g.fillStyle = '#e63a3a'; g.beginPath(); g.arc(cx, 192, 2.6, 0, 7); g.fill(); } else { g.fillStyle = '#c8aa7a'; g.beginPath(); g.ellipse(cx + 12, 211, 5, 2.6, 0, 0, 7); g.fill(); g.beginPath(); g.arc(cx + 16, 207, 2.2, 0, 7); g.fill(); }
        for (let k = 0; k < 4; k++) { g.fillStyle = ['#ffffff', '#f6e8f0', '#fff6c8', '#ffd0d8'][k]; g.beginPath(); g.arc(ax + 8 + k * 11, 230, 2.6, 0, 7); g.fill(); }
      }
      // naves laterales: columnas, ventanales con luz y base
      for (const side of [0, 1]) {
        const x0 = side ? W - 22 : 0; box(x0, 290, 22, 330, side ? ['#d8c898', '#f2e8cc'] : ['#f2e8cc', '#d8c898'], 0, true);
        for (let y = 306, k = 0; y < 590; y += 56, k++) {
          const ax = x0 + 3, aw = 16, ah = 36; arco(ax - 1.4, y - 1.4, aw + 2.8, ah + 1.4, '#d6b66e'); arco(ax, y, aw, ah, '#f6f2e0');
          g.fillStyle = lin(ax, y, ax + aw, y, ['#eaf4fb', '#bfdcee', '#eaf4fb']); g.beginPath(); g.moveTo(ax + 2, y + ah); g.lineTo(ax + 2, y + aw / 2); g.arc(ax + aw / 2, y + aw / 2, aw / 2 - 2, Math.PI, 0); g.lineTo(ax + aw - 2, y + ah); g.closePath(); g.fill();
          R(ax + aw / 2 - 0.3, y + 6, 0.6, ah - 6, 'rgba(120,150,170,.5)'); R(ax + 2, y + 20, aw - 4, 0.6, 'rgba(120,150,170,.5)');
          glow(side ? x0 - 12 : x0 + 34, y + 20, 56, 'rgba(235,245,255,.22)');
        }
        R(side ? x0 : x0 + 20, 290, 2, 330, 'rgba(90,60,20,.3)');
      }
      // alfombra roja hasta el altar
      drop(224, 150, 32, 470, 3, 0.3, 0, 1.5); box(224, 150, 32, 470, ['#b8201c', '#8a1410'], 0, true); R(224, 150, 2, 470, '#d8a838'); R(254, 150, 2, 470, '#d8a838'); R(227, 150, 0.8, 470, '#e8c868'); R(252, 150, 0.8, 470, '#e8c868');
      for (let y = 156; y < 610; y += 10) { g.fillStyle = 'rgba(255,200,120,.22)'; g.fillRect(234, y, 12, 1.2); }
      // bancos de madera
      for (let i = 0; i < ROWS; i++) for (const [x0, x1] of PX) { const y = RY(i), w = x1 - x0; drop(x0, y, w, 9, 2, 0.45, 1, 2); box(x0, y, w, 4, ['#6a4020', '#4a2a12']); R(x0, y, w, 0.8, '#a8743c'); box(x0, y + 4, w, 5, ['#b88450', '#8a5c30']); R(x0, y + 4, w, 0.7, '#dca878'); R(x0 - 1, y, 2, 9, '#3e2410'); R(x1 - 1, y, 2, 9, '#3e2410'); R(x0, y + 11, w, 1.4, 'rgba(60,30,10,.5)'); }
      // estantes de velas (crucero), confesionarios, Virgen
      for (const [vx, vy] of [[28, 292], [426, 292]]) { drop(vx, vy, 26, 26, 3, 0.4, 1.5, 2); box(vx, vy + 10, 26, 16, ['#6a4020', '#3e2410']); for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) { const x = vx + 2 + k * 3.4, y = vy + 2 + r * 4; R(x, y, 1.6, 4, '#fff6d8'); R(x + 0.5, y - 1.6, 0.8, 1.6, '#f6c84a'); } glow(vx + 13, vy + 4, 28, 'rgba(255,200,100,.35)'); }
      for (const cy of [336, 396]) { drop(4, cy, 22, 46, 3, 0.45, 1.5, 2); box(4, cy, 22, 46, ['#6a4020', '#3a2010']); box(7, cy + 6, 16, 32, ['#4a2a14', '#2a160a']); box(7, cy + 6, 7, 32, ['#7a1c1c', '#4a0e0e']); R(4, cy, 22, 2, '#a8743c'); R(13, cy + 3, 4, 8, '#c8a84a'); R(14.4, cy + 1, 1.2, 12, '#c8a84a'); }
      drop(454, 336, 22, 46, 3, 0.4, 1.5, 2); box(454, 362, 22, 20, ['#e8e2d2', '#a8a090']); box(458, 336, 14, 28, ['#f4f6fa', '#8fb4e0'], 3); g.fillStyle = '#e6c49a'; g.beginPath(); g.arc(465, 340, 3.4, 0, 7); g.fill(); g.strokeStyle = '#f6d86a'; g.lineWidth = 0.7; g.beginPath(); g.arc(465, 340, 5.4, 0, 7); g.stroke(); R(458, 348, 14, 12, '#4a82d0');
      for (let k = 0; k < 5; k++) { g.fillStyle = ['#ffffff', '#f6e8f0', '#fff6c8'][k % 3]; g.beginPath(); g.arc(458 + k * 3.6, 366, 1.8, 0, 7); g.fill(); }
      // atrio: bautisterio, tablero de avisos, alcancía y pilas de agua bendita
      drop(24, 500, 40, 30, 3, 0.4, 1.5, 2); box(26, 516, 36, 14, ['#e8e2d2', '#a8a090']); g.fillStyle = '#f0ece0'; g.beginPath(); g.ellipse(44, 512, 17, 8, 0, 0, 7); g.fill(); g.fillStyle = '#7fb4e0'; g.beginPath(); g.ellipse(44, 512, 13, 5.4, 0, 0, 7); g.fill(); box(34, 494, 20, 6, ['#d8b878', '#a8803c'], 1);
      drop(6, 560, 18, 36, 2, 0.4, 1.5, 2); box(6, 560, 18, 36, ['#8a5a30', '#5a3a1c']); box(8, 562, 14, 32, '#d8cfae'); for (let k = 0; k < 5; k++) R(10, 565 + k * 5.6, 10, 3.4, ['#f6f2e6', '#e8d8a0', '#cfe0c8'][k % 3]);
      drop(440, 560, 20, 22, 2, 0.4, 1.5, 2); box(442, 570, 16, 12, ['#6a4020', '#3e2410']); box(440, 560, 20, 12, ['#a8743c', '#6a4020'], 2); R(446, 564, 8, 1.4, '#1a0e08'); R(448, 574, 4, 4, '#d8b84a');
      for (const px of [180, 288]) { drop(px, 590, 12, 12, 2, 0.4, 1, 2); box(px + 2, 596, 8, 8, ['#e8e2d2', '#a8a090']); g.fillStyle = '#f0ece0'; g.beginPath(); g.ellipse(px + 6, 594, 7, 3.4, 0, 0, 7); g.fill(); g.fillStyle = '#7fb4e0'; g.beginPath(); g.ellipse(px + 6, 594, 5, 2, 0, 0, 7); g.fill(); }
      // puerta grande (pared de abajo = fachada oeste)
      box(0, HH - 22, W, 22, ['#d8c8a0', '#7e6a44']); drop(200, 598, 80, 42, 4, 0.4, 0, -2); arco(200, 590, 80, 50, '#4a2a14'); arco(204, 594, 72, 46, '#7a5232'); R(239, 612, 2, 28, '#3e2410'); R(204, 626, 72, 0.8, 'rgba(0,0,0,.3)'); g.fillStyle = '#d8b84a'; g.fillRect(232, 624, 3, 3); g.fillRect(245, 624, 3, 3);
      glow(240, HH, 100, 'rgba(255,250,220,.45)');
      // brillo de las lámparas y viñeta tenue
      for (const ly of [220, 310, 400, 490, 580]) glow(240, ly, 90, 'rgba(255,230,170,.3)');
      const vg = g.createRadialGradient(W / 2, HH / 2, 200, W / 2, HH / 2, 420); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(30,16,0,.4)'); g.fillStyle = vg; g.fillRect(0, 0, W, HH);
    }
    const sentado = (me, g, p) => { const sp = me.sprite(p.look), img = sp.get('up', 'sit', 0) || sp.get('up', 'idle', 0); if (!img) return; const sc = 1.62; g.drawImage(img, p.x - 8 * sc, p.y - 31 * sc + 5, 16 * sc, 32 * sc); };
    const columna = (g, x, y) => { g.fillStyle = 'rgba(40,20,5,.3)'; g.beginPath(); g.ellipse(x + 2, y + 4, 8, 3.4, 0, 0, 7); g.fill(); const q = g.createLinearGradient(x - 5, 0, x + 5, 0); q.addColorStop(0, '#fbf3d8'); q.addColorStop(1, '#d4c394'); g.fillStyle = q; g.fillRect(x - 4.5, y - 50, 9, 54); g.fillStyle = '#d6b66e'; g.fillRect(x - 6, y - 52, 12, 4); g.fillRect(x - 6, y + 1, 12, 4); };
    const S = new VR.Salon({
      W, H: HH, view: [340, 290], start: { x: 240, y: 604, dir: 'up' }, bounds: [22, 100, 458, 612], objs, bg, key: () => '',
      items: (me) => { const it = [{ sy: 112, f: (g) => me.figura(g, cura, 240, 114, 'down', false, 0) }, { sy: 166, f: (g) => me.figura(g, sacri, 78, 164, 'right', false, 0) }];
        for (const p of sentados) it.push({ sy: p.y + 1, f: (g) => sentado(me, g, p) });
        for (const p of gente) it.push({ sy: p.y, f: (g) => me.figura(g, p.look, p.x, p.y, p.dir, p.mv, p.anim) });
        for (const [x, y] of COLS) it.push({ sy: y, f: (g) => columna(g, x, y) });
        return it; },
      over: (g, me) => { // lámparas de araña de hierro y ventiladores verdes (se ven desde abajo, por eso van encima de la gente)
        for (const [lx, ly] of [[240, 220], [240, 310], [240, 400], [240, 490], [240, 580], [110, 232], [370, 232]]) { g.strokeStyle = 'rgba(30,24,20,.6)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(lx, ly - 34); g.lineTo(lx, ly - 9); g.stroke();
          g.strokeStyle = '#2a2420'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(lx, ly, 17, 6.4, 0, 0, 7); g.stroke(); g.lineWidth = 0.8; g.beginPath(); g.ellipse(lx, ly, 10.5, 3.8, 0, 0, 7); g.stroke();
          for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + 0.3, bx = lx + Math.cos(a) * 17, by = ly + Math.sin(a) * 6.4; g.fillStyle = '#2a2420'; g.fillRect(bx - 0.6, by - 3, 1.2, 3); g.fillStyle = '#fff6d0'; g.beginPath(); g.ellipse(bx, by - 4, 1.2, 1.7, 0, 0, 7); g.fill(); const f = g.createRadialGradient(bx, by - 4, 0.5, bx, by - 4, 5); f.addColorStop(0, 'rgba(255,230,150,.6)'); f.addColorStop(1, 'rgba(255,230,150,0)'); g.fillStyle = f; g.fillRect(bx - 5, by - 9, 10, 10); } }
        for (const [fx, fy] of [[160, 260], [320, 260], [160, 350], [320, 350], [160, 440], [320, 440], [160, 530], [320, 530], [58, 330], [422, 330], [58, 470], [422, 470], [240, 160]]) { g.strokeStyle = 'rgba(30,24,20,.5)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(fx, fy - 30); g.lineTo(fx, fy - 5); g.stroke();
          const a0 = me.t * 9 + fx; g.save(); g.translate(fx, fy); g.scale(1, 0.42);                               // ventilador de techo: 4 aspas rectas que giran, con el disco borroso del giro
          g.fillStyle = 'rgba(30,110,64,.15)'; g.beginPath(); g.arc(0, 0, 15, 0, 7); g.fill();
          for (let k = 0; k < 4; k++) { g.save(); g.rotate(a0 + k * Math.PI / 2); g.fillStyle = '#1f6a3c'; g.beginPath(); g.roundRect(3, -2.8, 12, 5.6, 1.6); g.fill(); g.fillStyle = '#2f9a58'; g.beginPath(); g.roundRect(3, -2.8, 12, 3.2, 1.4); g.fill(); g.fillStyle = '#8fd8ab'; g.fillRect(4, -2.8, 10, 0.8); g.fillStyle = '#c8c8be'; g.fillRect(3, -0.8, 2.2, 1.6); g.restore(); }
          g.fillStyle = '#d8d8cc'; g.beginPath(); g.arc(0, 0, 3.8, 0, 7); g.fill(); g.fillStyle = '#1a1f1c'; g.beginPath(); g.arc(0, 0, 2.2, 0, 7); g.fill(); g.restore(); }
      },
      tick: (dt, me) => { const ZON = [[36, 86], [226, 254], [394, 444]]; for (const p of gente) { p.w -= dt; if (p.w <= 0 && !p.mv) { p.w = 3 + Math.random() * 6; const [za, zb] = ZON[(p.zona + (Math.random() < 0.3 ? 1 : 0)) % 3]; for (let k = 0; k < 8; k++) { const tx = za + Math.random() * (zb - za), ty = 200 + Math.random() * 390; if (!me.blocked(tx, ty)) { p.tx = tx; p.ty = ty; p.mv = true; break; } } }
        if (p.mv) { const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy); if (d < 2) { p.mv = false; p.dir = 'up'; } else { const nx = p.x + dx / d * 16 * dt, ny = p.y + dy / d * 16 * dt; if (!me.blocked(nx, ny)) { p.x = nx; p.y = ny; p.anim += dt * 7; p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); } else p.mv = false; } } } },
      act: (ob, me) => { const k = ob.id; if (k === 'puerta') me.salir(); else if (FRASES[k]) me.decir(pick(FRASES[k])); },
    }, { player: o.player, busy: o.busy });
    return S;
  };
})();
