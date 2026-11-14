// Taller y cine (05/11/2026, pedidos de Leandro).
// Taller "Pyahu" en una calle del Centro: entrás con el vehículo, ACCIÓN, elegís piezas (catálogo de tune.js),
// ves el costado en alta y pagás con la billetera. El tuneo se guarda con el vehículo y se ve online.
// Cine en el Teatro Municipal: en la entrada sur, ACCIÓN; pegás un enlace de YouTube y, online, todos ven el
// mismo video en el mismo momento (VR.cineNow = { v, t0 }).
'use strict';
VR.dlg = (id, html) => { const d = document.createElement('dialog'); d.id = id; d.className = 'vrdlg'; d.innerHTML = html; document.body.append(d); return d; };
// ---------------------------------------------------------------- Taller inmersivo (13/11/2026, pedido de Leandro)
// Pantalla completa: arriba el taller por dentro (pared, tablero de herramientas, portón, lámparas, piso con manchas) con el
// vehículo grande y quieto (vista oblicua en alta calidad, sin girar); abajo categorías con iconos dibujados y las opciones
// como tarjetas. Cada cambio se ve en vivo con un destello y chispas / pintura.
(function () {
  const CSS = `#garView{position:fixed;inset:0;z-index:5;background:#14100c;display:flex;flex-direction:column;color:#eee;font:13px system-ui,sans-serif;user-select:none}
#garView[hidden]{display:none}
#garScene{flex:1 1 52%;min-height:0;position:relative;overflow:hidden}
#garScene>canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#garTop{position:absolute;left:8px;top:calc(env(safe-area-inset-top) + 6px);right:8px;display:flex;justify-content:space-between;pointer-events:none;gap:8px}
#garStats{position:absolute;left:8px;top:calc(env(safe-area-inset-top) + 40px);display:flex;gap:5px;flex-wrap:wrap;pointer-events:none;font:700 10px system-ui}
#garStats span{background:rgba(10,10,14,.72);border:1px solid #444;border-radius:7px;padding:2px 6px}#garStats em{font-style:normal;color:#9fd69a}
#garChat{position:absolute;right:8px;bottom:8px;width:min(430px,calc(100% - 16px));display:flex;gap:9px;align-items:flex-start;background:rgba(18,18,24,.94);border:2px solid #ece9e2;border-radius:12px;padding:7px 10px;box-shadow:0 4px 18px #000a;transition:opacity .35s;pointer-events:none}
@media (max-width:600px){#garChat{bottom:auto;top:calc(env(safe-area-inset-top) + 68px)}#garHint{display:none}}
#garChat[hidden]{display:none}#garChat.off{opacity:0}
#garChat canvas{width:62px;height:62px;flex:0 0 auto;border-radius:9px;border:2px solid #e6b422;background:#222}
#garChat b{display:block;color:#e6b422;font-size:12px;margin-bottom:2px}#garChat p{margin:0;font-size:13px;line-height:1.3;min-height:34px}
#garTop span{white-space:nowrap;background:rgba(10,10,14,.72);border:1px solid #444;border-radius:8px;padding:4px 9px;font-weight:700}
#garPanel{flex:0 0 auto;background:linear-gradient(#22201c,#171512);border-top:3px solid #e6b422;padding:6px 8px calc(env(safe-area-inset-bottom) + 6px);max-height:46%;display:flex;flex-direction:column;gap:5px}
#garTabs{display:flex;gap:5px;overflow-x:auto;padding-bottom:2px;scrollbar-width:thin}
#garTabs button{flex:0 0 auto;width:58px;background:#2a2823;border:2px solid #3b3830;border-radius:9px;color:#ddd;padding:3px 0 2px;font:700 10px system-ui;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:1px}
#garTabs button.on{border-color:#e6b422;background:#3a3320;color:#fff}
#garTabs canvas,#garOpts canvas{width:40px;height:40px;display:block}
#garOpts{overflow:auto;display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start;min-height:78px}
#garOpts .card{width:76px;background:#2a2823;border:2px solid #3b3830;border-radius:9px;color:#ddd;padding:3px 2px;font:600 10px/1.15 system-ui;cursor:pointer;text-align:center;position:relative}
#garOpts .card canvas{margin:0 auto 1px;width:46px;height:46px}
#garOpts .card.on{border-color:#e6b422;background:#3a3320;color:#fff}
#garOpts .card i{display:block;font-style:normal;color:#9fd69a;font-weight:700}
#garOpts .card.cur::after{content:"✓";position:absolute;right:4px;top:1px;color:#9fd69a;font-weight:900}
#garOpts .sw{width:34px;height:34px;border-radius:50%;border:3px solid #3b3830;cursor:pointer;box-shadow:inset 0 -5px 8px rgba(0,0,0,.35),inset 0 4px 5px rgba(255,255,255,.35)}
#garOpts .sw.on{border-color:#ffd84a;transform:scale(1.12)}
#garOpts h4{flex:0 0 100%;margin:2px 0 0;font:700 11px system-ui;color:#e6b422}
#garBar{display:flex;gap:6px;align-items:center}
#garTot{flex:1;font-size:12px;line-height:1.25}
#garBar button{background:#3a3626;border:2px solid #e6b422;color:#fff;border-radius:9px;padding:7px 11px;font:700 13px system-ui;cursor:pointer}
#garBar button#garBuy{background:#e6b422;color:#1a1608}`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const colHex = (i) => typeof i === 'string' ? i : VR.TUNE_COLORS[i % 16][1], colName = (i) => typeof i === 'string' ? 'Original' : VR.TUNE_COLORS[i % 16][0];
  const ELEV = 30 * Math.PI / 180, ELEV_KZ = Math.cos(ELEV) / Math.sin(ELEV), ELEV_S = Math.sin(ELEV); // cámara a 30° sobre el piso
  const NAMES = { color: 'Pintura', franja: 'Franjas', llantas: 'Llantas', polarizado: 'Vidrios', aleron: 'Alerón', techo: 'Techo', escape: 'Escape', faros: 'Faros', bajo: 'Suspensión', neon: 'Neón' };
  // ------------------------------------------------------------ iconos (se dibujan en 48×48 y se guardan a 96×96)
  const ICON = new Map();
  const carTop = (g, col, x = 5, y = 14, w = 38, h = 20) => { g.fillStyle = col; rr(g, x, y, w, h, 8); g.fill(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.4; g.stroke(); g.fillStyle = '#1d2630'; rr(g, x + w * 0.62, y + 3, w * 0.2, h - 6, 2); g.fill(); rr(g, x + w * 0.16, y + 3, w * 0.13, h - 6, 2); g.fill(); };
  const carSide = (g, col, lift = 0, spoil = 0) => {
    g.fillStyle = col; rr(g, 5, 22 - lift * 0 + lift, 38, 10, 3); g.fill(); g.beginPath(); g.moveTo(13, 22 + lift); g.lineTo(18, 14 + lift); g.lineTo(33, 14 + lift); g.lineTo(38, 22 + lift); g.closePath(); g.fill();
    g.fillStyle = '#1d2630'; g.beginPath(); g.moveTo(17, 21 + lift); g.lineTo(20, 16 + lift); g.lineTo(31, 16 + lift); g.lineTo(34, 21 + lift); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.2; rr(g, 5, 22 + lift, 38, 10, 3); g.stroke();
    if (spoil) { const h2 = spoil === 2 ? 9 : 5; g.fillStyle = '#222'; g.fillRect(38, 22 + lift - h2, 1.6, h2); g.fillStyle = col; rr(g, 35, 22 + lift - h2 - 2, spoil === 2 ? 11 : 8, 2.6, 1); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.stroke(); }
    for (const wx of [13, 35]) { g.fillStyle = '#18181c'; g.beginPath(); g.arc(wx, 32.5 + lift * 0.3, 5, 0, 7); g.fill(); g.fillStyle = '#aab'; g.beginPath(); g.arc(wx, 32.5 + lift * 0.3, 2.2, 0, 7); g.fill(); }
  };
  const drawIcon = (g, part, key, t) => {
    g.lineJoin = 'round'; g.lineCap = 'round';
    if (part === 'color') {
      const c = colHex(isNaN(+key) ? key : +key); g.fillStyle = c; g.beginPath(); g.moveTo(24, 5); g.bezierCurveTo(33, 16, 38, 22, 38, 29); g.bezierCurveTo(38, 37, 32, 43, 24, 43); g.bezierCurveTo(16, 43, 10, 37, 10, 29); g.bezierCurveTo(10, 22, 15, 16, 24, 5); g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1.6; g.stroke(); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(19, 27, 3, 7, 0.3, 0, 7); g.fill();
    } else if (part === 'franja') {
      carTop(g, '#d9dde4'); const c2 = colHex(t.color2 ?? 11); g.fillStyle = c2; g.save(); rr(g, 5, 14, 38, 20, 8); g.clip();
      if (key === 'carrera') { g.fillRect(3, 21, 42, 2.4); g.fillRect(3, 25.6, 42, 2.4); } else if (key === 'centro') g.fillRect(3, 19.5, 42, 9); else if (key === 'costado') { g.fillRect(3, 15.5, 42, 2.4); g.fillRect(3, 30.2, 42, 2.4); } g.restore();
      g.fillStyle = '#1d2630'; rr(g, 5 + 38 * 0.62, 17, 7.6, 14, 2); g.fill(); rr(g, 5 + 38 * 0.16, 17, 5, 14, 2); g.fill();
      if (key === 'no') { g.strokeStyle = '#c33'; g.lineWidth = 3; g.beginPath(); g.moveTo(10, 38); g.lineTo(38, 10); g.stroke(); }
    } else if (part === 'llantas') {
      g.fillStyle = '#17171b'; g.beginPath(); g.arc(24, 24, 21, 0, 7); g.fill(); g.strokeStyle = '#2b2b31'; g.lineWidth = 2; g.stroke();
      const rc = VR.RIMS[key] || '#888'; g.fillStyle = rc; g.beginPath(); g.arc(24, 24, 14, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.stroke();
      const n = { serie: 4, deportivas: 5, cromadas: 10, negras: 5, doradas: 6 }[key] || 5, dark = key === 'negras' ? '#5a5a64' : '#222';
      if (key === 'serie') { g.fillStyle = dark; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + 0.4; g.beginPath(); g.arc(24 + Math.cos(a) * 8, 24 + Math.sin(a) * 8, 2.6, 0, 7); g.fill(); } } else { g.strokeStyle = key === 'negras' ? '#6a6a74' : (key === 'doradas' ? '#8a6a18' : '#555a64'); g.lineWidth = key === 'cromadas' ? 1.2 : 2.6; for (let i = 0; i < n; i++) { const a = i / n * 6.283; g.beginPath(); g.moveTo(24 + Math.cos(a) * 4, 24 + Math.sin(a) * 4); g.lineTo(24 + Math.cos(a) * 13, 24 + Math.sin(a) * 13); g.stroke(); } if (key === 'cromadas' || key === 'deportivas') { g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(19, 18, 6, 3, -0.6, 0, 7); g.fill(); } }
      g.fillStyle = '#333'; g.beginPath(); g.arc(24, 24, 3, 0, 7); g.fill(); g.fillStyle = key === 'doradas' ? '#f3d878' : '#ccd'; g.beginPath(); g.arc(24, 24, 1.5, 0, 7); g.fill();
    } else if (part === 'polarizado') {
      g.save(); rr(g, 5, 8, 38, 32, 6); g.clip(); const gr = g.createLinearGradient(0, 8, 0, 40); gr.addColorStop(0, '#9fd2f2'); gr.addColorStop(1, '#e9f5ff'); g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
      g.fillStyle = '#6a9a58'; g.beginPath(); g.moveTo(5, 34); g.lineTo(18, 26); g.lineTo(30, 33); g.lineTo(43, 27); g.lineTo(43, 40); g.lineTo(5, 40); g.fill(); g.fillStyle = 'rgba(8,10,14,' + [0, 0.55, 0.92][+key] + ')'; g.fillRect(0, 0, 48, 48);
      g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(10, 8); g.lineTo(20, 8); g.lineTo(9, 40); g.lineTo(5, 40); g.fill(); g.restore(); g.strokeStyle = '#111'; g.lineWidth = 2; rr(g, 5, 8, 38, 32, 6); g.stroke();
    } else if (part === 'aleron') { carSide(g, '#d9dde4', 0, key === 'chico' ? 1 : key === 'grande' ? 2 : 0); if (key === 'no') { g.fillStyle = 'rgba(200,50,50,.9)'; g.font = '700 10px system-ui'; g.fillText('✕', 38, 14); } }
    else if (part === 'techo') {
      g.fillStyle = '#2a2d33'; rr(g, 6, 6, 36, 36, 6); g.fill(); const c = key === 'negro' ? '#141418' : colHex(t.color || 0); g.fillStyle = c; rr(g, 9, 9, 30, 30, 4); g.fill(); g.fillStyle = 'rgba(255,255,255,.22)'; rr(g, 11, 11, 12, 5, 2); g.fill();
      if (key === 'parrilla') { g.strokeStyle = '#b8bcc4'; g.lineWidth = 2; rr(g, 12, 12, 24, 24, 2); g.stroke(); g.lineWidth = 1.6; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(12 + 8 * (i + 1) - 4, 12); g.lineTo(12 + 8 * (i + 1) - 4, 36); g.stroke(); } }
    } else if (part === 'escape') {
      g.fillStyle = '#3a3d44'; rr(g, 3, 8, 42, 18, 4); g.fill(); g.fillStyle = '#16171a'; rr(g, 6, 20, 36, 8, 3); g.fill();
      const pipe = (x, y, r) => { const gr = g.createRadialGradient(x - 1, y - 1, 0.5, x, y, r); gr.addColorStop(0, '#f4f6fa'); gr.addColorStop(0.6, '#8a8e98'); gr.addColorStop(1, '#2a2c32'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(x, y, r * 0.55, 0, 7); g.fill(); };
      if (key === 'deportivo') { pipe(15, 33, 6); pipe(33, 33, 6); g.fillStyle = 'rgba(80,170,255,.7)'; g.beginPath(); g.ellipse(15, 43, 2.2, 3.5, 0, 0, 7); g.ellipse(33, 43, 2.2, 3.5, 0, 0, 7); g.fill(); } else { pipe(30, 33, 5); }
    } else if (part === 'faros') {
      const xe = key === 'xenon'; g.fillStyle = xe ? 'rgba(190,232,255,.28)' : 'rgba(255,230,150,.22)'; g.beginPath(); g.moveTo(22, 24); g.lineTo(xe ? 47 : 41, xe ? 6 : 12); g.lineTo(xe ? 47 : 41, xe ? 42 : 36); g.closePath(); g.fill();
      g.fillStyle = '#2b2e35'; g.beginPath(); g.ellipse(17, 24, 14, 11, 0, 0, 7); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 1.4; g.stroke();
      const gr = g.createRadialGradient(15, 24, 1, 17, 24, 9); gr.addColorStop(0, '#fff'); gr.addColorStop(1, xe ? '#8fd0ff' : '#ffd36a'); g.fillStyle = gr; g.beginPath(); g.ellipse(17, 24, 9, 7.5, 0, 0, 7); g.fill();
    } else if (part === 'bajo') {
      const low = +key === 1; carSide(g, '#d9dde4', low ? 4 : 0); g.fillStyle = '#7a7e88'; g.fillRect(4, 41, 40, 2); g.strokeStyle = low ? '#e6b422' : '#888'; g.lineWidth = 1.6; g.beginPath(); if (low) { g.moveTo(24, 3); g.lineTo(24, 11); g.moveTo(20, 8); g.lineTo(24, 12); g.lineTo(28, 8); } else { g.moveTo(24, 12); g.lineTo(24, 4); g.moveTo(20, 7); g.lineTo(24, 3); g.lineTo(28, 7); } g.stroke();
    } else if (part === 'neon') {
      const rgb = VR.NEON[key]; carTop(g, '#2a2c33'); if (!rgb) { g.strokeStyle = '#c33'; g.lineWidth = 3; g.beginPath(); g.moveTo(10, 38); g.lineTo(38, 10); g.stroke(); return; }
      g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(24, 24, 6, 24, 24, 26); gr.addColorStop(0, 'rgba(' + rgb + ',.15)'); gr.addColorStop(0.55, 'rgba(' + rgb + ',.7)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, 48, 48); g.globalCompositeOperation = 'source-over';
      g.strokeStyle = 'rgb(' + rgb + ')'; g.lineWidth = 1.6; rr(g, 4, 12, 40, 24, 9); g.stroke();
    }
  };
  VR.garageIcon = (part, key, t) => {
    const ck = part + ':' + key + ':' + (part === 'franja' ? t.color2 : part === 'techo' ? t.color : ''); let c = ICON.get(ck); if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'); g.scale(2, 2); try { drawIcon(g, part, key, t); } catch (e) {} ICON.set(ck, c); return c;
  };

  // ------------------------------------------------------------ Don Chicho, el mecánico: charla con cada cosa que elegís
  const CHICHO = { gender: 'm', skin: 2, build: 'panza', hair: 'peinadoAtras', hairColor: 5, beard: 'bigote', top: 'remera', topColor: 13, bottom: 'jean', bottomColor: 3, shoes: 'zapatillas', shoesColor: 3, hat: 'gorra', hatColor: 0 };
  const R = (a) => a[(Math.random() * a.length) | 0];
  const COLOR_L = { Rojo: 'Rojo: dicen que corre más. Mentira, pero se ve lindo.', Bordó: 'Bordó, color de vino de domingo. Elegante, po.', Naranja: 'Naranja: te ven desde la Terminal, no hay forma de perderte.', Amarillo: 'Amarillo... te van a parar pensando que sos taxi. Jaja, pero queda bien.', Lima: 'Verde lima: grita «¡mírenme!» a todo volumen.', Verde: 'Verde, como la yerba. Un clásico bien paraguayo.', Turquesa: 'Turquesa, color de pileta. Me gusta.', Celeste: 'Celeste, tranquilo, como tarde de tereré.', Azul: 'Azul profundo. Serio, de persona que paga a tiempo.', Violeta: 'Violeta, qué atrevido. Me gusta que seas diferente.', Rosa: '¡Rosa! No cualquiera se anima. Te respeto.', Blanco: 'Blanco... ¿lo vas a lavar vos, no? Porque con el barro de acá...', Plateado: 'Plateado, brilla lindo y se le nota poco la tierra.', Gris: 'Gris, discreto. Pasás desapercibido, como ninja.', Negro: 'Negro: elegante, misterioso, y no se le nota la mugre.', Dorado: '¿Dorado? Parecés intendente en campaña.' };
  const LINES = {
    color: (v) => COLOR_L[colName(v)] || 'Ese color le queda joya.',
    color2: () => R(['Buen contraste, tenés ojo.', 'Con ese color de franjas se destaca de lejos.', 'Combina bien, po.']),
    franja: { no: 'Sin franjas, limpio y serio.', carrera: 'Franjas de carrera: ahora sí parece que corre.', centro: 'Una ancha al medio, estilo campeón de domingo.', costado: 'A los costados, finitas, con clase.' },
    llantas: { serie: 'Las de fábrica: aburridas pero honestas.', deportivas: 'Deportivas: lindas de verdad, aunque sigas yendo a 40 por la calle.', cromadas: 'Cromadas: brillan tanto que van a darle señales al avión.', negras: 'Negras, estilo misterioso. Elegante.', doradas: '¿Llantas doradas? Ahora sí sos el patrón del barrio.' },
    polarizado: { 0: 'Vidrios limpios: así saludás a la gente.', 1: 'Medio polarizado: te ven, pero no tanto.', 2: 'Polarizado total... ¿qué escondés, nde? Jajaja, a mí no me contás.' },
    aleron: { no: 'Sin alerón, más aerodinámico. O eso dicen.', chico: 'Alerón chico: discreto, pero se nota.', grande: '¡Ese alerón es enorme! Con eso despegás en la ruta.' },
    techo: { serie: 'Techo del color del auto: prolijo.', negro: 'Techo negro, pinta de auto caro.', parrilla: '¡Parrilla! Ahí cargás de todo... hasta la heladera del vecino.' },
    escape: { serie: 'Escape de serie: silencio de biblioteca.', deportivo: '¡Doble escape! Vas a despertar a todo el barrio... y a la suegra.' },
    faros: { normal: 'Faros normales, los de siempre. Naranjitas y fieles.', xenon: '¡Xenón! Vas a encandilar hasta a los murciélagos.' },
    bajo: { 0: 'Altura normal, para los lomos de burro de Villarrica.', 1: 'Bajito... ojo con los lomos de burro, nde, que raspás.' },
    neon: (k) => k === 'no' ? 'Sin neón: sencillo, como cena de domingo.' : 'Neón ' + (VR.TUNE_PARTS.neon.opts[k] || [''])[0].toLowerCase() + ': de noche vas a parecer una nave espacial.',
  };
  const EXP = { franja: 'feliz', llantas: 'feliz', aleron: 'sorpresa', escape: 'sorpresa', neon: 'sorpresa', faros: 'feliz', polarizado: 'duda', bajo: 'duda', techo: 'feliz', color: 'feliz', color2: 'feliz' };
  const stamp = (cv, src) => { cv.width = cv.height = 96; cv.getContext('2d').drawImage(src, 0, 0); };
  // ------------------------------------------------------------ fondo del taller (vectorial, se guarda en un canvas por tamaño)
  // Vw×Vh: unidades virtuales; el piso siempre queda abajo y el centro (cx) es donde va el vehículo.
  const drawShop = (g, Vw, Vh) => {
    const cx = Vw / 2, fy = Vh - 165; // fy: donde empieza el piso
    // pared: bloques
    let gr = g.createLinearGradient(0, 0, 0, fy); gr.addColorStop(0, '#2a2d33'); gr.addColorStop(1, '#434750'); g.fillStyle = gr; g.fillRect(0, 0, Vw, fy);
    for (let r = 0, y = 0; y < fy; r++, y += 14) for (let x = (r % 2 ? -18 : 0); x < Vw; x += 36) { const v = VR.hash(r * 31 + ((x + 100) / 36 | 0), 77) % 100; g.fillStyle = v < 30 ? 'rgba(255,255,255,.035)' : v < 55 ? 'rgba(0,0,0,.05)' : 'rgba(0,0,0,0)'; g.fillRect(x + 1, y + 1, 34, 12); g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, 36, 14); }
    g.fillStyle = '#23262b'; g.fillRect(0, fy - 52, Vw, 52); // zócalo pintado
    g.fillStyle = '#e6b422'; g.fillRect(0, fy - 54, Vw, 3); g.fillStyle = '#111'; for (let x = -8; x < Vw; x += 18) { g.beginPath(); g.moveTo(x, fy - 54); g.lineTo(x + 9, fy - 54); g.lineTo(x + 5, fy - 51); g.lineTo(x - 4, fy - 51); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, fy + 0.5); g.lineTo(Vw, fy + 0.5); g.stroke();
    // cartel
    const sw = 168, sx = cx - sw / 2, sy = Math.max(8, fy - 250); g.fillStyle = '#16181c'; rr(g, sx, sy, sw, 38, 6); g.fill(); g.strokeStyle = '#e6b422'; g.lineWidth = 2.5; g.stroke();
    g.shadowColor = '#ffcc33'; g.shadowBlur = 10; g.fillStyle = '#ffd84a'; g.font = '900 19px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🔧 TALLER PYAHU', cx, sy + 20); g.shadowBlur = 0;
    g.fillStyle = '#c8c8d0'; g.font = '700 8px system-ui'; g.fillText('PINTURA · LLANTAS · NEÓN · CHAPA', cx, sy + 51); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    for (const x of [sx + 14, sx + sw - 14]) { g.strokeStyle = '#555'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, sy - 6); g.lineTo(x, sy); g.stroke(); }
    // reloj, matafuegos y afiche
    { const ccx = Math.min(cx + 196, Vw - 8 - Math.min(150, Vw - (cx + 175) - 8) - 30), ccy = Math.max(40, fy - 150); if (ccx < Vw - 20) { g.fillStyle = '#111'; g.beginPath(); g.arc(ccx, ccy, 17, 0, 7); g.fill(); g.fillStyle = '#f0ece0'; g.beginPath(); g.arc(ccx, ccy, 14.5, 0, 7); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(ccx, ccy); g.lineTo(ccx + 2, ccy - 9); g.moveTo(ccx, ccy); g.lineTo(ccx + 6, ccy + 3); g.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.fillStyle = '#555'; g.fillRect(ccx + Math.cos(a) * 12 - 0.7, ccy + Math.sin(a) * 12 - 0.7, 1.4, 1.4); } }
      if (Vw >= 560) { const ax = cx - 226, ay = fy - 205; g.fillStyle = '#e8e0c8'; g.fillRect(ax, ay, 40, 54); g.strokeStyle = '#3a2c18'; g.lineWidth = 2; g.strokeRect(ax, ay, 40, 54); g.fillStyle = '#c8322a'; g.fillRect(ax + 4, ay + 4, 32, 26); g.fillStyle = '#f2f0ea'; g.fillRect(ax + 9, ay + 14, 22, 7); g.fillStyle = '#222'; g.fillRect(ax + 12, ay + 21, 5, 4); g.fillRect(ax + 25, ay + 21, 5, 4); g.fillStyle = '#333'; g.font = '700 6px system-ui'; g.textAlign = 'center'; g.fillText('¡OFERTA!', ax + 20, ay + 42); g.fillText('LLANTAS', ax + 20, ay + 49); g.textAlign = 'left'; }
      const mx = cx + 150; g.fillStyle = '#b8322a'; rr(g, mx, fy - 98, 14, 38, 5); g.fill(); g.fillStyle = '#222'; g.fillRect(mx + 4, fy - 105, 6, 8); g.strokeStyle = '#222'; g.lineWidth = 2; g.beginPath(); g.moveTo(mx + 10, fy - 102); g.quadraticCurveTo(mx + 22, fy - 96, mx + 14, fy - 80); g.stroke(); g.fillStyle = '#f2f0ea'; g.fillRect(mx + 2, fy - 86, 10, 10); }
    // tablero de herramientas (izquierda)
    const px = Math.max(8, cx - 300), pw = Math.min(150, cx - 175 - px); if (pw > 60) {
      const py = fy - 195; g.fillStyle = '#7a6444'; rr(g, px, py, pw, 118, 3); g.fill(); g.strokeStyle = '#3a2c18'; g.lineWidth = 3; g.stroke(); g.fillStyle = 'rgba(0,0,0,.28)'; for (let y = py + 8; y < py + 112; y += 9) for (let x = px + 8; x < px + pw - 4; x += 9) { g.beginPath(); g.arc(x, y, 1.1, 0, 7); g.fill(); }
      const sil = (f) => { g.save(); g.fillStyle = 'rgba(20,14,6,.4)'; g.translate(2, 2); f(); g.restore(); g.fillStyle = '#c9ccd2'; g.strokeStyle = '#3b3e46'; g.lineWidth = 1; f(); };
      const t1 = px + pw * 0.14, y0 = py + 12;
      sil(() => { g.beginPath(); g.roundRect(t1, y0 + 8, 5, 72, 2); g.fill(); g.stroke(); g.beginPath(); g.arc(t1 + 2.5, y0 + 8, 8, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#7a6444'; g.fillRect(t1 - 2, y0 - 3, 9, 8); g.fillStyle = '#c9ccd2'; }); // llave
      sil(() => { g.beginPath(); g.roundRect(t1 + 28, y0 + 22, 5, 60, 2); g.fill(); g.stroke(); g.fillStyle = '#b53a2a'; g.beginPath(); g.roundRect(t1 + 22, y0 + 4, 20, 14, 3); g.fill(); g.stroke(); g.fillStyle = '#c9ccd2'; }); // martillo
      sil(() => { g.beginPath(); g.roundRect(t1 + 52, y0 + 30, 5, 52, 2); g.fill(); g.stroke(); g.fillStyle = '#e6b422'; g.beginPath(); g.roundRect(t1 + 49, y0 + 6, 11, 28, 4); g.fill(); g.stroke(); g.fillStyle = '#c9ccd2'; }); // destornillador
      if (pw > 110) sil(() => { g.beginPath(); g.moveTo(t1 + 78, y0 + 4); g.lineTo(t1 + 86, y0 + 4); g.lineTo(t1 + 90, y0 + 34); g.lineTo(t1 + 82, y0 + 34); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#2b5f9a'; g.fillRect(t1 + 80, y0 + 34, 4, 40); g.fillStyle = '#c9ccd2'; }); // pinza
    }
    // estante con latas de pintura (derecha del tablero) y neumáticos
    const ex = cx - 160 - 6; if (ex > (px + pw + 24)) { const ew = 78, ey = fy - 130; g.fillStyle = '#5a3b22'; g.fillRect(ex - ew, ey, ew, 4); g.fillRect(ex - ew, ey - 52, ew, 4); g.fillStyle = '#3a2614'; g.fillRect(ex - ew, ey + 4, ew, 3); g.fillRect(ex - ew, ey - 48, ew, 3); for (const x of [ex - ew + 3, ex - 6]) { g.fillStyle = '#2a1c10'; g.fillRect(x, ey - 52, 3, 80); }
      for (let i = 0; i < 4; i++) { const c = VR.TUNE_COLORS[[0, 8, 3, 6][i]][1]; const x = ex - ew + 8 + i * 17; g.fillStyle = '#aab0b8'; rr(g, x, ey - 16, 13, 16, 2); g.fill(); g.fillStyle = c; g.fillRect(x, ey - 11, 13, 5); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x + 2, ey - 16, 2, 16); }
      for (let i = 0; i < 3; i++) { const c = VR.TUNE_COLORS[[4, 10, 15][i]][1], x = ex - ew + 10 + i * 22; g.fillStyle = '#9aa0a8'; rr(g, x, ey - 62 + 8, 14, 12, 2); g.fill(); g.fillStyle = c; g.fillRect(x, ey - 55, 14, 4); }
      g.fillStyle = '#2a2d33'; rr(g, ex - ew + 8, ey + 10, 22, 14, 3); g.fill(); }
    // portón levadizo (derecha) entreabierto: se ve la calle
    const dw = Math.min(150, Vw - (cx + 175) - 8); if (dw > 70) { const dx = Vw - 8 - dw, dy = fy - 195, dh = 196; g.fillStyle = '#0c0d10'; g.fillRect(dx - 4, dy - 4, dw + 8, dh + 4);
      gr = g.createLinearGradient(0, dy + dh * 0.45, 0, dy + dh); gr.addColorStop(0, '#9fd0f0'); gr.addColorStop(0.55, '#e8f2ff'); gr.addColorStop(1, '#9a9a90'); g.fillStyle = gr; g.fillRect(dx, dy + dh * 0.45, dw, dh * 0.55); g.fillStyle = '#6b7380'; g.fillRect(dx + 8, dy + dh * 0.7, 26, dh * 0.3 - 4); g.fillStyle = '#8a7a64'; g.fillRect(dx + dw - 46, dy + dh * 0.62, 38, dh * 0.38 - 4);
      for (let y = dy; y < dy + dh * 0.45; y += 11) { const v = (y - dy) / (dh * 0.45); g.fillStyle = `rgb(${120 + v * 12},${126 + v * 12},${136 + v * 12})`; g.fillRect(dx, y, dw, 10); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(dx, y + 9, dw, 2); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(dx, y, dw, 1); }
      g.fillStyle = '#d8dadf'; g.fillRect(dx, dy + dh * 0.45 - 3, dw, 4); g.fillStyle = 'rgba(255,230,160,.12)'; g.beginPath(); g.moveTo(dx, dy + dh * 0.45); g.lineTo(dx + dw, dy + dh * 0.45); g.lineTo(dx + dw + 90, fy + 90); g.lineTo(dx - 90, fy + 90); g.closePath(); g.fill(); }
    // piso
    gr = g.createLinearGradient(0, fy, 0, Vh); gr.addColorStop(0, '#4f5258'); gr.addColorStop(0.5, '#43464c'); gr.addColorStop(1, '#2f3237'); g.fillStyle = gr; g.fillRect(0, fy, Vw, Vh - fy);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2; for (let i = 1; i < 6; i++) { const y = fy + (Vh - fy) * Math.pow(i / 6, 1.7); g.beginPath(); g.moveTo(0, y); g.lineTo(Vw, y); g.stroke(); }
    for (let i = -9; i <= 9; i++) { g.beginPath(); g.moveTo(cx + i * 22, fy); g.lineTo(cx + i * 100, Vh); g.stroke(); }
    for (let i = 0; i < 14; i++) { const x = VR.hash(i, 5) % Vw, y = fy + 10 + VR.hash(i, 9) % (Vh - fy - 12), w = 10 + VR.hash(i, 13) % 34; g.fillStyle = 'rgba(8,8,10,' + (0.12 + (VR.hash(i, 17) % 20) / 100) + ')'; g.beginPath(); g.ellipse(x, y, w, w * 0.28, 0, 0, 7); g.fill(); }
    // plataforma del elevador + línea de seguridad
    const py = Vh - 82; g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(cx, py + 4, 196, 98, 0, 0, 7); g.fill(); g.fillStyle = '#34373d'; g.beginPath(); g.ellipse(cx, py, 190, 94, 0, 0, 7); g.fill(); g.strokeStyle = '#e6b422'; g.lineWidth = 3; g.setLineDash([14, 10]); g.beginPath(); g.ellipse(cx, py, 190, 94, 0, 0, 7); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#3f434a'; g.beginPath(); g.ellipse(cx, py, 168, 82, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1; for (let i = -6; i <= 6; i++) { g.beginPath(); const hh = 82 * Math.sqrt(Math.max(0, 1 - Math.pow(i * 26 / 168, 2))); g.moveTo(cx + i * 26, py - hh); g.lineTo(cx + i * 26, py + hh); g.stroke(); }
    // lámparas colgantes y su luz en el piso
    for (const dx of [-120, 120]) { const lx = cx + dx; g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, 26); g.stroke(); g.fillStyle = '#1b1d21'; g.beginPath(); g.moveTo(lx - 22, 38); g.lineTo(lx - 8, 22); g.lineTo(lx + 8, 22); g.lineTo(lx + 22, 38); g.closePath(); g.fill(); g.fillStyle = '#fff6cc'; g.beginPath(); g.ellipse(lx, 38, 18, 4, 0, 0, 7); g.fill();
      g.save(); g.globalCompositeOperation = 'lighter'; gr = g.createLinearGradient(0, 38, 0, fy + 40); gr.addColorStop(0, 'rgba(255,236,170,.30)'); gr.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(lx - 18, 38); g.lineTo(lx + 18, 38); g.lineTo(lx + 120, fy + 40); g.lineTo(lx - 120, fy + 40); g.closePath(); g.fill();
      gr = g.createRadialGradient(lx, Vh - 82, 4, lx, Vh - 82, 150); gr.addColorStop(0, 'rgba(255,240,190,.22)'); gr.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(lx, Vh - 82, 160, 80, 0, 0, 7); g.fill(); g.restore(); }
  };
  const drawFore = (g, Vw, Vh) => { // cosas que quedan delante del vehículo
    const cx = Vw / 2;
    const tire = (x, y, r) => { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, y + 6, r * 1.25, r * 0.3, 0, 0, 7); g.fill(); g.fillStyle = '#15151a'; rr(g, x - r, y - r * 0.62, r * 2, r * 0.8, r * 0.35); g.fill(); g.fillStyle = '#26262c'; g.beginPath(); g.ellipse(x, y - r * 0.62, r, r * 0.3, 0, 0, 7); g.fill(); g.fillStyle = '#0c0c0f'; g.beginPath(); g.ellipse(x, y - r * 0.62, r * 0.55, r * 0.16, 0, 0, 7); g.fill(); };
    const tx = Math.max(34, cx - 262); tire(tx, Vh - 22, 26); tire(tx + 6, Vh - 44, 25);
    // carrito de herramientas rojo
    const kx = Math.max(60, cx - 235) + 26, ky = Vh - 78; if (cx > 280) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(kx + 36, ky + 64, 44, 6, 0, 0, 7); g.fill(); g.fillStyle = '#b8322a'; rr(g, kx, ky, 72, 56, 4); g.fill(); g.strokeStyle = '#4a120e'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = '#d4483c'; g.fillRect(kx + 2, ky + 2, 68, 8);
      for (let i = 0; i < 3; i++) { g.fillStyle = '#9a2820'; g.fillRect(kx + 5, ky + 14 + i * 13, 62, 10); g.fillStyle = '#ddd'; g.fillRect(kx + 28, ky + 17 + i * 13, 16, 3); } g.fillStyle = '#111'; for (const x of [kx + 8, kx + 58]) { g.beginPath(); g.arc(x, ky + 60, 4, 0, 7); g.fill(); } }
    // bidón de aceite a la derecha
    const bx = Math.min(Vw - 36, cx + 250); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(bx, Vh - 10, 24, 5, 0, 0, 7); g.fill(); g.fillStyle = '#2b5f9a'; rr(g, bx - 18, Vh - 58, 36, 50, 5); g.fill(); g.fillStyle = '#e6b422'; g.fillRect(bx - 18, Vh - 40, 36, 10); g.fillStyle = '#1a1a1a'; g.font = '700 8px system-ui'; g.textAlign = 'center'; g.fillText('ACEITE', bx, Vh - 32); g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(bx - 14, Vh - 56, 3, 46);
  };

  VR.Garage = class {
    constructor() {
      const d = this.d = document.createElement('div'); d.id = 'garView'; d.hidden = true;
      d.innerHTML = '<div id="garScene"><canvas></canvas><div id="garTop"><span>🔧 Taller Pyahu</span><span id="garHint" style="font-weight:500;font-size:11px;color:#ccc">↔ Arrastrá para girarlo</span><span id="garMoney"></span></div><div id="garStats"></div><div id="garChat" hidden><canvas width="64" height="64"></canvas><div><b>Don Chicho · mecánico</b><p></p></div></div></div><div id="garPanel"><div id="garTabs"></div><div id="garOpts"></div><div id="garBar"><div id="garTot"></div><button id="garUndo" title="Deshacer cambios">↺</button><button id="garTank" title="Cargar nafta y arreglar llantas">⛽ Nafta</button><button id="garFix">🔧 Reparar</button><button id="garBuy">Comprar</button><button id="garOut">Salir</button></div></div>';
      document.body.append(d); this.cv = d.querySelector('#garScene canvas'); this.g = this.cv.getContext('2d'); this.fr = new Map(); this.ang = 0.9; this.auto = true; this.fx = null; this.parts = []; this.tab = 'color';
      const cv = this.cv; let drag = null; cv.style.touchAction = 'none'; cv.style.cursor = 'grab';
      cv.onpointerdown = (e) => { drag = { x: e.clientX, a: this.ang }; this.auto = false; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; };
      cv.onpointermove = (e) => { if (drag) this.ang = drag.a + (e.clientX - drag.x) * 0.012; };
      cv.onpointerup = cv.onpointercancel = () => { drag = null; cv.style.cursor = 'grab'; clearTimeout(this._at); this._at = setTimeout(() => { if (!drag) this.auto = true; }, 2500); };
      d.querySelector('#garOut').onclick = () => this.close();
      d.querySelector('#garBuy').onclick = () => this.buy();
      d.querySelector('#garUndo').onclick = () => { this.t = { ...this.old }; this.base = null; this.fx = { t: 0, rgb: '255,255,255', kind: 'spark' }; this.build(); this.say(R(['Listo, todo borrado. Como si nada hubiera pasado, jajaja.', '¿Te arrepentiste? Pasa, nde, pasa. Empezamos de nuevo.']), 'feliz', 5); };
      d.querySelector('#garTank').onclick = () => { const r = VR.Tab.servicio(this.car); this.say(r.msg, r.bad ? 'triste' : r.n ? 'feliz' : 'duda', 6); if (r.n) { this.fx = { t: 0, rgb: '120,220,255', kind: 'spark' }; this.d.querySelector('#garMoney').textContent = '💰 ' + VR.fmtGs(VR.Wallet.get()); } };
      d.querySelector('#garFix').onclick = () => { // reparar: 1.500 Gs. por punto de vida
        const c = this.car, hp = c.hp ?? 100; if (hp >= 99 && !c.burning) { this.say('Si está joya, ¿qué querés que le repare? Dejalo así, po.', 'duda', 5); return; }
        const n = Math.round((100 - Math.max(0, hp)) * 1500 / 1000) * 1000; if (n > VR.Wallet.get()) { this.say('Reparar te sale ' + VR.fmtGs(n) + '. Y vos tenés ' + VR.fmtGs(VR.Wallet.get()) + '. Las cuentas no cierran, amigo.', 'triste', 7); return; }
        VR.Wallet.add(-n, 'Taller: reparación'); c.hp = 100; if (c.burning && VR.emer) { c.burning = false; VR.emer.burning && VR.emer.burning.delete(c); } this.say('¡Chapa y pintura! Quedó como recién salido de fábrica. Son ' + VR.fmtGs(n) + ', amigo.', 'feliz', 6); this.fx = { t: 0, rgb: '255,230,120', kind: 'spark' }; this.total(); };
      addEventListener('keydown', (e) => { if (!this.d.hidden && e.key === 'Escape') this.close(); });
      addEventListener('resize', () => { if (!this.d.hidden) this.size(); });
    }
    open(car, toast) {
      this.car = car; this.toast = toast; const m = car.model, M = VR.TUNE_MODELS[m]; this.model = m;
      if (!M) { toast('Este vehículo no se puede tunear'); return; }
      this.old = Object.assign(VR.tuneDefault(m), car.tune || { color: this.realColor(car) }); this.t = { ...this.old }; this.parts = M.parts.filter((p) => p !== 'color2'); this.tab = this.parts[0];
      VR.input.releaseAll(); VR.input.enabled = false; this.fr.clear(); this.base = null; this.fit = null; this.ang = 0.9; this.auto = true; this.fx = { t: 0, rgb: '255,255,255', kind: 'spark' }; this.bg = null;
      this.d.hidden = false; document.body.classList.add('adentro'); this.size(); this.build(); this.t0 = performance.now(); this._idle = this.t0; this.chat = null; this.greet(); this.loop();
    }
    realColor(car) { const sp = VR.vspec(car.type, car.model), pal = sp.colors[(car.color || 0) % sp.colors.length]; return Array.isArray(pal) ? pal[0] : pal; }
    // --------------------------------------------------- Don Chicho
    say(txt, exp = 'feliz', hold = 6) { const c = this.chat || (this.chat = {}); Object.assign(c, { full: txt, n: 0, t0: performance.now(), exp, hold, done: 0, open: false }); const el = this.d.querySelector('#garChat'); el.hidden = false; el.classList.remove('off'); this.d.querySelector('#garChat p').textContent = ''; this.face(false); }
    face(open) { const c = this.chat; if (!c || !VR.retrato) return; try { const g = this.d.querySelector('#garChat canvas').getContext('2d'); g.clearRect(0, 0, 64, 64); g.drawImage(VR.retrato(CHICHO, 'chicho', c.exp, open, '#e6b422'), 0, 0, 64, 64); } catch (e) {} }
    chatTick(now) {
      const c = this.chat; if (!c || !c.full) return; const p = this.d.querySelector('#garChat p'), el = this.d.querySelector('#garChat');
      if (c.n < c.full.length) { c.n = Math.min(c.full.length, Math.floor((now - c.t0) / 1000 * 50) + 1); p.textContent = c.full.slice(0, c.n); const o = Math.floor(now / 110) % 2 === 0 && /[a-záéíóúñü]/i.test(c.full[c.n - 1] || ''); if (o !== c.open) { c.open = o; this.face(o); } if (c.n >= c.full.length) { c.done = now; this.face(false); } }
      else if (now - c.done > c.hold * 1000) el.classList.add('off');
      if (!this._idle || now - this._idle > 22000) { if (this._idle && c.n >= c.full.length && c.done && now - c.done > 4000) this.say(R(['Dale, elegí tranquilo. Yo me tomo un tereré mientras.', 'Esa pintura se ve mejor con sol, po. Pero bueno, acá estamos bajo techo.', 'Mirá que acá no hay apuro... bueno, un poquito, que viene otro cliente.', 'Si querés mi opinión: todo, pero cobrando, jaja.']), 'feliz', 5); this._idle = now; }
    }
    greet() {
      const car = this.car, m = this.model, moto = car.type === 'moto', pati = m === 'pati', hp = car.hp ?? 100;
      if (hp < 50) return this.say('¡Mba\'éichapa quedó ese vehículo! ¿Te chocaste con la Terminal? Primero reparalo con el botón, después lo hacemos lindo.', 'sorpresa', 9);
      this.say(R(pati ? ['¿Una patineta? También la tuneamos, nde. En Taller Pyahu nadie discrimina.'] : moto ? ['¡Una moto! Esto me lo hago entre mate y mate. ¿Qué le ponemos?', '¡Ha upéi! Linda moto. Elegí lo que quieras, que la dejo como nueva.'] : ['¡Ha upéi, nde! Pasá nomás. ¿Qué le hacemos a esta belleza?', 'Uy, mirá qué tenemos acá. Tiene buenos huesos. ¿Qué le ponemos?']), 'feliz', 8);
    }
    react(part, key) {
      const L = LINES[part]; let t = typeof L === 'function' ? L(key) : L && L[key]; if (!t) return;
      const n = this.cost(), m = VR.Wallet.get(); let exp = EXP[part] || 'feliz';
      if (n > m) { t += ' Pero ojo: ya vas por ' + VR.fmtGs(n) + ' y tenés ' + VR.fmtGs(m) + '. ¿Tenés eso en el bolsillo o en la imaginación?'; exp = 'duda'; }
      else if (n > m * 0.7 && n > 0) t += ' Ojo que ya vas por ' + VR.fmtGs(n) + ', se te va casi toda la plata.';
      else if (n === 0 && String(this.t[part]) === String(this.old[part]) && part !== 'color2') t += ' (Como estaba antes.)';
      this.say(t, exp, 7);
    }
    // --------------------------------------------------- panel: categorías con icono y opciones
    build() {
      const tabs = this.d.querySelector('#garTabs'); tabs.innerHTML = '';
      for (const p of this.parts) { const b = document.createElement('button'); b.className = p === this.tab ? 'on' : ''; const cv = document.createElement('canvas'); stamp(cv, VR.garageIcon(p, this.t[p], this.t)); const l = document.createElement('span'); l.textContent = NAMES[p] || VR.TUNE_PARTS[p].name; b.append(cv, l); b.onclick = () => { this.tab = p; this.build(); }; tabs.append(b); }
      const box = this.d.querySelector('#garOpts'); box.innerHTML = ''; const p = this.tab, m = this.model;
      const pick = (part, v) => { const num = part === 'color' || part === 'color2' || part === 'polarizado' || part === 'bajo'; this.t[part] = num && typeof v !== 'string' ? +v : v; this.base = null; this.fx = { t: 0, rgb: this.fxRgb(part), kind: part === 'color' ? 'spray' : 'spark' }; this.build(); this.react(part, this.t[part]); };
      const swatches = (part, title) => { if (title) { const h = document.createElement('h4'); h.textContent = title; box.append(h); } const all = VR.TUNE_COLORS.map((c, i) => [i, c[1], c[0]]); if (typeof this.old[part] === 'string') all.unshift([this.old[part], this.old[part], 'Original']); all.forEach(([i, hx, nm]) => { const s = document.createElement('div'); s.className = 'sw' + (this.t[part] === i ? ' on' : ''); s.style.background = hx; s.title = nm; s.onclick = () => pick(part, i); box.append(s); }); };
      if (p === 'color') { swatches('color'); const pr = VR.tunePartPrice(m, 'color', this.t); const h = document.createElement('h4'); h.textContent = colName(this.t.color) + (pr ? ' · ' + VR.fmtGs(pr) : ' · de serie'); h.style.flexBasis = '100%'; box.append(h); }
      else {
        for (const [k, o] of Object.entries(VR.TUNE_PARTS[p].opts)) {
          const c = document.createElement('div'), sel = String(this.t[p]) === String(k); c.className = 'card' + (sel ? ' on' : '') + (String(this.old[p]) === String(k) ? ' cur' : '');
          const cv = document.createElement('canvas'); stamp(cv, VR.garageIcon(p, k, this.t)); const pr = VR.tunePartPrice(m, p, { ...this.t, [p]: p === 'polarizado' || p === 'bajo' ? +k : k });
          c.append(cv, document.createTextNode(o[0])); const i = document.createElement('i'); i.textContent = pr ? VR.fmtGs(pr) : (String(this.old[p]) === String(k) ? 'puesto' : 'gratis'); c.append(i); c.onclick = () => pick(p, k); box.append(c);
        }
        if (p === 'franja' && this.parts.includes('franja') && VR.TUNE_MODELS[m].parts.includes('color2') && this.t.franja !== 'no') swatches('color2', 'Color de las franjas');
      }
      this.total();
    }
    fxRgb(part) { const c = part === 'color' ? colHex(this.t.color) : null; if (c) { const n = parseInt(c.slice(1), 16); return (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255); } return part === 'neon' && VR.NEON[this.t.neon] ? VR.NEON[this.t.neon] : '255,214,90'; }
    cost() { const m = this.model; return VR.TUNE_MODELS[m].parts.reduce((s, p) => s + (String(this.t[p]) !== String(this.old[p]) ? VR.tunePartPrice(m, p, this.t) : 0), 0); }
    total() {
      this.d.querySelector('#garTot').innerHTML = 'Total: <b>' + VR.fmtGs(this.cost()) + '</b><br>Vida ' + Math.round(Math.max(0, this.car.hp ?? 100)) + '%';
      const sp = VR.vspec(this.car.type, this.model), a = VR.tuneSpec(sp, this.t), pc = (x, y) => Math.round((x / y - 1) * 100), rows = [['⚡', a.acc / sp.acc, pc(a.acc, sp.acc)], ['↻', a.turn / sp.turn, pc(a.turn, sp.turn)], ['🏁', a.max.road / sp.max.road, pc(a.max.road, sp.max.road)], ['🌿', a.max.dirt / sp.max.dirt, pc(a.max.dirt, sp.max.dirt)]];
      this.d.querySelector('#garStats').innerHTML = rows.map(([n, r, d]) => '<span>' + n + ' <em style="' + (d < 0 ? 'color:#e08a7a' : '') + '">' + (d ? (d > 0 ? '+' : '') + d + '%' : '=') + '</em></span>').join('');
      this.d.querySelector('#garMoney').textContent = '💰 ' + VR.fmtGs(VR.Wallet.get());
    }
    // --------------------------------------------------- escena
    size() {
      const sc = this.d.querySelector('#garScene'), dpr = Math.min(2, window.devicePixelRatio || 1), cw = sc.clientWidth, ch = sc.clientHeight; if (!cw || !ch) return;
      this.cv.width = Math.round(cw * dpr); this.cv.height = Math.round(ch * dpr); this.s = Math.min(this.cv.width / 460, this.cv.height / 400); this.Vw = this.cv.width / this.s; this.Vh = this.cv.height / this.s; this.bg = null;
    }
    K() { return ((Math.round(this.ang / (Math.PI * 2) * 64) % 64) + 64) % 64; }
    turnImg() {
      const key = this.model + ':' + VR.tuneKey(this.t) + ':' + this.K(); let c = this.fr.get(key); if (c) return c;
      const car = this.car, sp = VR.vspec(car.type, car.model), OB = VR.OBL;
      if (!this.base) { const v = VR.VSS; VR.VSS = v * 2; try { this.base = sp.base(VR.tunePal(this.t.color), this.t); } finally { VR.VSS = v; } } // dibujo base más grande que en el juego: más nítido
      const base = this.base; if (!base.prof || !OB || !OB.on) return null;
      const kz0 = OB.kz; OB.kz = ELEV_KZ; let S, ss, B, big; // cámara baja (como el fondo): más costado, el techo se aplasta después
      try { S = sp.S + 2 * OB.extra(base); ss = base.ss || 1; B = Math.round(S * ss); big = OB.render(base, this.K() / 64 * Math.PI * 2, B); } finally { OB.kz = kz0; }
      c = VR.gfx.softOutline(big, 'rgba(18,16,20,.92)', ss * 0.8); this.fr.set(key, c);
      if (this.fr.size > 96) this.fr.delete(this.fr.keys().next().value);
      return c;
    }
    paint(now) {
      const g = this.g, s = this.s, Vw = this.Vw, Vh = this.Vh, cx = Vw / 2, t = (now - this.t0) / 1000; if (!s) return;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.cv.width, this.cv.height);
      if (!this.bg || this.bg.width !== this.cv.width || this.bg.height !== this.cv.height) {
        const b = this.bg = document.createElement('canvas'); b.width = this.cv.width; b.height = this.cv.height; const bg = b.getContext('2d'); bg.scale(s, s); drawShop(bg, Vw, Vh);
        const f = this.fore = document.createElement('canvas'); f.width = b.width; f.height = b.height; const fg = f.getContext('2d'); fg.scale(s, s); drawFore(fg, Vw, Vh);
      }
      g.drawImage(this.bg, 0, 0); g.save(); g.scale(s, s); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      const py = Vh - 82, neon = VR.NEON[this.t.neon];
      if (neon) { g.save(); g.globalCompositeOperation = 'lighter'; const k = 0.85 + Math.sin(t * 3) * 0.08; g.translate(cx, py); g.scale(1, 0.52); const gr = g.createRadialGradient(0, 0, 10, 0, 0, 230); gr.addColorStop(0, 'rgba(' + neon + ',' + 0.55 * k + ')'); gr.addColorStop(0.6, 'rgba(' + neon + ',' + 0.22 * k + ')'); gr.addColorStop(1, 'rgba(' + neon + ',0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 230, 0, 7); g.fill(); g.restore(); }
      const img = this.turnImg();
      if (img) {
        if (!this.fit) this.fit = {}; const m = this.model; let f = this.fit[m];
        if (!f) { const side = VR.vspec(this.car.type, m), SS = this.base.ss || 1; f = this.fit[m] = 1 / (Math.max(side.len, side.wid) * (VR.VK || 1) * SS * 0.8); }
        const T = Math.min(300, Vw * 0.55) * (this.model === 'pati' ? 0.62 : 1), hk = Math.min(1, Math.min(Vh * 0.7, 300) / (img.height * f * T * ELEV_S)), w = img.width * f * T * hk, h = img.height * f * T * hk * ELEV_S, X = cx - w / 2, Y = py - h * 0.5 + (+this.t.bajo ? 3 : 0) - 6;
        g.fillStyle = 'rgba(0,0,0,.42)'; g.beginPath(); g.ellipse(cx, py + 2, w * 0.32, h * 0.2, 0, 0, 7); g.fill();
        g.save(); g.globalAlpha = 0.14; g.translate(0, 2 * (py + 4)); g.scale(1, -1); g.drawImage(img, X, Y, w, h); g.restore(); // reflejo en el piso
        if (this.fx && this.fx.t < 0.7 && this.fx.kind) { // destello blanco que recorre el vehículo
          const tmp = this.tmp || (this.tmp = document.createElement('canvas')); tmp.width = Math.ceil(w * s); tmp.height = Math.ceil(h * s); const q = tmp.getContext('2d'); q.clearRect(0, 0, tmp.width, tmp.height); q.imageSmoothingQuality = 'high'; q.drawImage(img, 0, 0, tmp.width, tmp.height);
          q.globalCompositeOperation = 'source-atop'; const p = this.fx.t / 0.7, gr = q.createLinearGradient(tmp.width * (p * 1.6 - 0.5), 0, tmp.width * (p * 1.6 - 0.2), 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = gr; q.fillRect(0, 0, tmp.width, tmp.height);
          g.drawImage(img, X, Y, w, h); g.drawImage(tmp, X, Y, w, h);
        } else g.drawImage(img, X, Y, w, h);
        if (this.fx && this.fx.t < 0.9) this.sparks(g, X, Y, w, h, py);
      } else { g.fillStyle = '#fff'; g.font = '14px system-ui'; g.textAlign = 'center'; g.fillText('Armando el vehículo…', cx, py - 40); g.textAlign = 'left'; }
      g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) { const lx = cx + (i % 2 ? 120 : -120), u = (t * 0.03 + VR.hash(i, 31) % 100 / 100) % 1, x = lx + (VR.hash(i, 7) % 100 / 100 - 0.5) * (30 + u * 150) + Math.sin(t + i) * 4, y = 40 + u * (Vh - 130); g.fillStyle = 'rgba(255,240,200,' + (0.35 * Math.sin(u * 3.14)) + ')'; g.beginPath(); g.arc(x, y, 0.9 + (i % 3) * 0.4, 0, 7); g.fill(); } g.restore();
      g.restore(); g.drawImage(this.fore, 0, 0);
      // viñeta
      g.save(); g.scale(s, s); const vg = g.createRadialGradient(cx, Vh * 0.55, Vh * 0.35, cx, Vh * 0.55, Vw * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = vg; g.fillRect(0, 0, Vw, Vh); g.restore();
    }
    sparks(g, X, Y, w, h, py) {
      const fx = this.fx, n = fx.kind === 'spray' ? 26 : 16; g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) { const r1 = VR.hash(i, 3) / 1e9 % 1 || (i * 0.618 % 1), r2 = (i * 0.381 + 0.17) % 1, life = fx.t * (1 + r2), px = X + w * (0.12 + 0.76 * r1), py0 = Y + h * (0.2 + 0.6 * r2);
        if (fx.kind === 'spray') { const a = Math.max(0, 0.55 - fx.t * 0.7); g.fillStyle = 'rgba(' + fx.rgb + ',' + a + ')'; g.beginPath(); g.arc(px, py0 - life * 10, 6 + life * 14, 0, 7); g.fill(); }
        else { const a = Math.max(0, 1 - fx.t * 1.2); g.fillStyle = 'rgba(255,' + (200 + (i % 3) * 20) + ',90,' + a + ')'; g.beginPath(); g.arc(px + (r2 - 0.5) * life * 70, py0 + life * life * 46 - life * 28, 1.6, 0, 7); g.fill(); } }
      g.restore();
    }
    loop() {
      if (this.d.hidden) return; const now = performance.now(); if (this.auto) this.ang += 0.012; if (this.fx) { this.fx.t += Math.min(0.05, (now - (this._l || now)) / 1000); if (this.fx.t > 1) this.fx = null; } this._l = now; this.paint(now); this.chatTick(now); requestAnimationFrame(() => this.loop());
    }
    buy() {
      const n = this.cost(); if (this.closing) return; if (n > VR.Wallet.get()) { this.say('No te alcanza la plata, po. Sacale algo o volvé con más billete.', 'triste', 7); return; }
      VR.Wallet.add(-n, 'Taller: tuneo'); const c = this.car; c.tune = { ...this.t };
      c.frames = VR.vframes(c.type, c.color, c.model, c.tune); c.spec = VR.tuneSpec(VR.vspec(c.type, c.model), c.tune);
      this.toast(n ? '🔧 ¡Quedó joya! ' + VR.fmtGs(n) : 'Sin cambios'); this.say(n ? R(['¡Listo! Quedó joya. Son ' + VR.fmtGs(n) + '. Llevalo con cuidado, ¿eh?', '¡Terminé! Ahora sí, que se vea quién manda en Villarrica. Son ' + VR.fmtGs(n) + '.']) : 'Nada que cobrar. Fácil, la tuya.', 'feliz', 3); this.closing = true; setTimeout(() => { this.closing = false; this.close(); }, 1900);
    }
    close() { if (this.d.hidden) return; this.d.hidden = true; document.body.classList.remove('adentro'); VR.input.enabled = true; this._l = 0; }
  };
})();
VR.ytId = (s) => { const m = String(s).match(/(?:youtu\.be\/|v=|shorts\/|live\/|embed\/)([\w-]{11})/) || String(s).match(/^([\w-]{11})$/); return m ? m[1] : null; };
VR.Cine = class {
  constructor(online) {
    this.on = online;
    this.d = VR.dlg('cine', '<h2>🎬 Cine en el Teatro Municipal</h2><div id="cnBox"></div><input id="cnUrl" placeholder="Pegá un enlace de YouTube"><div class="seg"><button id="cnPut">Poner</button><button id="cnOut">Salir</button></div><p class="hint">Online: todos los de la sala ven el mismo video.</p>');
    this.d.querySelector('#cnOut').onclick = () => this.close();
    this.d.querySelector('#cnPut').onclick = () => { const v = VR.ytId(this.d.querySelector('#cnUrl').value.trim()); if (!v) return; VR.cineNow = { v, t0: VR.netNow() }; online.ev({ e: 'cine', v, t0: VR.cineNow.t0 }); this.close(); };
    online.onCine = () => { if (this.d.open) this.show(); };
  }
  show() {
    const c = VR.cineNow, box = this.d.querySelector('#cnBox');
    if (!c) { box.innerHTML = '<p class="hint">La pantalla está apagada. Poné un video.</p>'; return; }
    const st = Math.max(0, Math.floor((Date.now() - c.t0) / 1000));
    box.innerHTML = '<p class="hint">En pantalla: youtu.be/' + c.v + '</p>'; void st;
  }
  open() { VR.input.releaseAll(); VR.input.enabled = false; this.d.showModal(); this.show(); }
  close() { this.d.querySelector('#cnBox').innerHTML = ''; this.d.close(); VR.input.enabled = true; }
};
